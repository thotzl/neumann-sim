const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ticket folders and their role. Status is defined by the folder (see wiki/decisions/0003-ticket-pool-and-epics.md).
// pool/  = undecided ideas (open issue, label status:pool)
// epics/ = roadmaps / whitepapers (open issue, label type:epic, title "[EPIC-xx] ...")
const TICKET_FOLDERS = ['open', 'ongoing', 'pool', 'epics', 'closed'];
const EPIC_FOLDER = 'epics';
const POOL_FOLDER = 'pool';
const EPIC_LABEL = 'type:epic';

const INDEX_BEGIN = '<!-- BEGIN GENERATED TICKET INDEX (node .github/scripts/sync_github.js --index-only) -->';
const INDEX_END = '<!-- END GENERATED TICKET INDEX -->';

// GitHub context (initialized in main(), only required for PUSH / PULL)
let token = null;
let BASE_URL = null;
let HEADERS = null;

// Automatically load local .env variables if running locally (Dependency-Free!)
function loadDotEnv() {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return;
    fs.readFileSync(envPath, 'utf-8').split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const idx = trimmed.indexOf('=');
            if (idx !== -1) {
                const k = trimmed.substring(0, idx).trim();
                let v = trimmed.substring(idx + 1).trim();
                if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
                if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
                if (!process.env[k]) {
                    process.env[k] = v;
                }
            }
        }
    });
}

// 1. Get GitHub credentials & repository info
function initGitHubContext() {
    token = process.env.GITHUB_TOKEN;
    if (!token) {
        console.error("❌ GITHUB_TOKEN environment variable is missing. Synchronization aborted.");
        process.exit(1);
    }

    // Clean up any trailing/leading whitespaces or quote artifacts from the token
    token = token.trim();

    // Log token diagnostic info (secure, only prefix and length)
    const tokenPrefix = token.substring(0, 4);
    console.log(`🔑 Diagnostics: Token prefix="${tokenPrefix}", length=${token.length}`);

    let repository = process.env.GITHUB_REPOSITORY; // Injected automatically by GitHub Actions
    if (!repository) {
        try {
            const remoteUrl = execSync('git config --get remote.origin.url').toString().trim();
            // Match formats: git@github.com:owner/repo.git or https://github.com/owner/repo.git
            const match = remoteUrl.match(/github\.com[:/]([^/]+\/[^.]+)(?:\.git)?$/);
            if (match && match[1]) {
                repository = match[1];
            }
        } catch (e) {
            console.warn("⚠️ Could not extract repository path from local git config. Fallback to manual setup.");
        }
    }

    if (!repository) {
        console.error("❌ Could not identify the GitHub repository path (owner/repo). Please set GITHUB_REPOSITORY.");
        process.exit(1);
    }

    const [owner, repoName] = repository.split('/');
    console.log(`📂 Repository: https://github.com/${owner}/${repoName}`);

    BASE_URL = `https://api.github.com/repos/${owner}/${repoName}`;

    // COMPATIBILITY WORKAROUND: Classic Personal Access Tokens (PATs) starting with ghp_ or older Classic Tokens
    // require 'token <token>' authorization header on classical GitHub APIs to prevent 404 unauthorized errors.
    const authHeader = (token.startsWith('ghp_') || token.startsWith('github_pat_'))
        ? `token ${token}`
        : `Bearer ${token}`;

    HEADERS = {
        'Authorization': authHeader,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Bob-OS-Sync-Script'
    };
}

// Simple, robust YAML Frontmatter parser & serializer (Dependency-Free!)
// Line endings are normalized to LF so CRLF checkouts (Windows) produce identical bodies.
function parseTicketContent(rawContent, filePath = '') {
    const content = rawContent.replace(/\r\n/g, '\n');
    const frontmatterRegex = /^---\n([\s\S]+?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    if (!match) return null;

    const yamlStr = match[1];
    const bodyStr = match[2].trim();
    const metadata = {};

    yamlStr.split('\n').forEach(line => {
        const idx = line.indexOf(':');
        if (idx !== -1) {
            const key = line.substring(0, idx).trim();
            let val = line.substring(idx + 1).trim();
            // Clean up quotes (and undo the \" escaping written by stringifyTicket)
            if (val.length >= 2 && val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1).replace(/\\"/g, '"');
            else if (val.length >= 2 && val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
            // Handle arrays (quoted JSON style or unquoted [A, B])
            if (val.startsWith('[') && val.endsWith(']')) {
                try {
                    val = JSON.parse(val.replace(/'/g, '"'));
                } catch(e) {
                    const inner = val.slice(1, -1).trim();
                    val = inner ? inner.split(',').map(s => s.trim()).filter(Boolean) : [];
                }
            }
            metadata[key] = val;
        }
    });

    return { metadata, body: bodyStr, raw_path: filePath, filename: path.basename(filePath) };
}

function parseTicket(filePath) {
    return parseTicketContent(fs.readFileSync(filePath, 'utf-8'), filePath);
}

function stringifyTicket(metadata, body) {
    let yamlLines = ['---'];
    Object.keys(metadata).forEach(key => {
        if (key === 'folder_status' || key === 'raw_path' || key === 'filename') return; // Skip temporary fields
        let val = metadata[key];
        if (val === undefined || val === null) return;
        if (Array.isArray(val)) {
            yamlLines.push(`${key}: ${JSON.stringify(val)}`);
        } else if (typeof val === 'string' && (val.includes(':') || val.includes('#') || val.includes('"') || val.includes("'"))) {
            yamlLines.push(`${key}: "${val.replace(/"/g, '\\"')}"`);
        } else {
            yamlLines.push(`${key}: ${val}`);
        }
    });
    yamlLines.push('---');
    return yamlLines.join('\n') + '\n\n' + body + '\n';
}

// 2. Scan all local tickets across status directories (open, ongoing, pool, epics, closed)
function getLocalTickets(ticketDir = path.join(process.cwd(), 'tickets')) {
    const tickets = [];

    TICKET_FOLDERS.forEach(status => {
        const dirPath = path.join(ticketDir, status);
        if (!fs.existsSync(dirPath)) return;

        const files = fs.readdirSync(dirPath).filter(file => file.endsWith('.md'));
        files.forEach(file => {
            const parsed = parseTicket(path.join(dirPath, file));
            if (parsed && parsed.metadata.id) {
                parsed.metadata.folder_status = status;
                tickets.push(parsed);
            }
        });
    });

    return tickets;
}

// Helper to sanitize filenames
function sanitizeSlug(title) {
    return title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// GitHub rejects label names longer than 50 characters (HTTP 422)
const GITHUB_LABEL_MAX = 50;

function clampLabel(label) {
    return label.length <= GITHUB_LABEL_MAX ? label : label.slice(0, GITHUB_LABEL_MAX).replace(/-+$/, '');
}

function isEpicId(id) {
    return /^EPIC-\d+$/.test(id || '');
}

// Map a local ticket (folder + frontmatter) to the expected GitHub issue title, state and managed labels
function mapTicketToIssue(meta) {
    const folder = meta.folder_status;
    const isEpic = folder === EPIC_FOLDER;
    const labels = [];

    if (meta.priority || !isEpic) {
        labels.push(`priority:${meta.priority || 'medium'}`);
    }
    if (isEpic) {
        labels.push(EPIC_LABEL);
    } else {
        labels.push(`status:${folder}`);
    }
    if (meta.epic_phase) {
        labels.push(clampLabel(`epic:${sanitizeSlug(meta.epic_phase)}`));
    }
    // Epic reference label (e.g. epic:EPIC-00); epics carry their own ID for grouping
    const epicRef = meta.epic || (isEpic ? meta.id : '');
    if (isEpicId(epicRef) && !labels.includes(`epic:${epicRef}`)) {
        labels.push(`epic:${epicRef}`);
    }

    return {
        title: `[${meta.id}] ${meta.title}`,
        state: folder === 'closed' ? 'closed' : 'open',
        labels
    };
}

// Labels owned by this script (considered by the push label diff check)
function isManagedLabel(label) {
    return label.startsWith('priority:') || label.startsWith('status:') || label.startsWith('epic:') || label === EPIC_LABEL;
}

// Parse issue title "[TCK-101] Title" or "[EPIC-00] Title" (status-neutral)
function parseIssueTitle(title) {
    const titleMatch = title.match(/^\[((?:TCK|EPIC)-\d+)\]\s*(.*)$/);
    if (!titleMatch) return null;
    return { id: titleMatch[1], title: titleMatch[2].trim() };
}

// Map a GitHub issue back to its local folder and metadata hints.
// pool/ and epics/ items stay in their folder; unknown status labels keep the legacy pass-through behavior.
function mapIssueToLocal(issue, localFolder = null) {
    let priority = null;
    let statusLabel = null;
    let epicPhase = '';
    let epic = '';
    let hasEpicLabel = false;

    issue.labels.forEach(labelObj => {
        const label = typeof labelObj === 'string' ? labelObj : labelObj.name;
        if (label === EPIC_LABEL) hasEpicLabel = true;
        else if (label.startsWith('priority:')) priority = label.substring(9);
        else if (label.startsWith('status:')) statusLabel = label.substring(7);
        else if (/^epic:EPIC-\d+$/.test(label)) epic = label.substring(5);
        else if (label.startsWith('epic:')) epicPhase = label.substring(5);
    });

    const parsedTitle = parseIssueTitle(issue.title);
    const isEpic = hasEpicLabel || localFolder === EPIC_FOLDER || (parsedTitle && isEpicId(parsedTitle.id));

    let folderStatus;
    if (isEpic) {
        folderStatus = EPIC_FOLDER;
    } else {
        folderStatus = statusLabel || (issue.state === 'closed' ? 'closed' : 'open');
        // Missing status label: an open issue keeps a pool item in pool/
        if (!statusLabel && issue.state === 'open' && localFolder === POOL_FOLDER) {
            folderStatus = POOL_FOLDER;
        }

        // Double check state alignment
        if (issue.state === 'closed' && folderStatus !== 'closed') {
            folderStatus = 'closed';
        } else if (issue.state === 'open' && folderStatus === 'closed') {
            folderStatus = 'open';
        }
    }

    return { folderStatus, priority, epicPhase, epic, isEpic };
}

// Frontmatter "status" value for a folder (unknown folders fall back to "open" as before)
function statusForFolder(folder) {
    if (folder === 'closed' || folder === 'ongoing' || folder === POOL_FOLDER) return folder;
    return 'open';
}

// 3. Backlog Index Generator (offline, no GitHub token required)
function escapeCell(value) {
    return String(value === undefined || value === null || value === '' ? '-' : value).replace(/\|/g, '\\|');
}

function idNumber(id) {
    const m = String(id || '').match(/\d+/);
    return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
}

function byId(a, b) {
    return idNumber(a.metadata.id) - idNumber(b.metadata.id);
}

// Extract the hand-curated "Verknüpfte Quell-Ressource" cells from an existing index so regeneration keeps them
function extractResourceCells(content) {
    const resources = {};
    (content || '').replace(/\r\n/g, '\n').split('\n').forEach(line => {
        const m = line.match(/^\| \*\*((?:TCK|EPIC)-\d+)\*\* \|/);
        if (!m) return;
        const cells = line.split(' | ');
        if (cells.length !== 7) return;
        const last = cells[6].replace(/\s*\|\s*$/, '').trim();
        if (last && last !== '-') resources[m[1]] = last;
    });
    return resources;
}

function epicColumn(meta) {
    const epic = meta.epic || '';
    const phase = meta.epic_phase || '';
    if (epic && phase && !phase.startsWith(epic)) return `${epic} / ${phase}`;
    return phase || epic || '-';
}

function renderTicketTable(tickets, resources) {
    const rows = [
        '| Ticket-ID | Titel | Epic / Phase | Status | Prio | Ticket-Datei | Verknüpfte Quell-Ressource |',
        '| :--- | :--- | :--- | :--- | :--- | :--- | :--- |'
    ];
    tickets.slice().sort(byId).forEach(t => {
        const m = t.metadata;
        const linkStr = `[Link](${m.folder_status}/${t.filename})`;
        let resourceStr = resources[m.id];
        if (!resourceStr) {
            const deps = Array.isArray(m.dependencies) ? m.dependencies : [];
            resourceStr = deps.length > 0 ? deps.join(', ') : '-';
        }
        rows.push(`| **${m.id}** | ${escapeCell(m.title)} | ${escapeCell(epicColumn(m))} | \`${m.folder_status}\` | \`${m.priority || 'medium'}\` | ${linkStr} | ${resourceStr} |`);
    });
    if (tickets.length === 0) rows.push('| - | - | - | - | - | - | - |');
    return rows.join('\n');
}

function renderEpicTable(epics, tickets) {
    const rows = [
        '| Epic-ID | Titel | Status | Offen | Pool | Closed | Epic-Datei |',
        '| :--- | :--- | :--- | :--- | :--- | :--- | :--- |'
    ];
    epics.slice().sort(byId).forEach(e => {
        const m = e.metadata;
        const children = tickets.filter(t => t.metadata.epic === m.id);
        const count = folders => children.filter(t => folders.includes(t.metadata.folder_status)).length;
        rows.push(`| **${m.id}** | ${escapeCell(m.title)} | \`${m.status || 'open'}\` | ${count(['open', 'ongoing'])} | ${count([POOL_FOLDER])} | ${count(['closed'])} | [Link](${EPIC_FOLDER}/${e.filename}) |`);
    });
    if (epics.length === 0) rows.push('| - | - | - | - | - | - | - |');
    return rows.join('\n');
}

// Build the generated index block (between INDEX_BEGIN and INDEX_END)
function buildIndexBlock(tickets, resources = {}) {
    const inFolders = folders => tickets.filter(t => folders.includes(t.metadata.folder_status));
    const epics = inFolders([EPIC_FOLDER]);
    const others = tickets.filter(t => t.metadata.folder_status !== EPIC_FOLDER);

    return [
        INDEX_BEGIN,
        '',
        '## 🗺️ EPICS (ROADMAPS & WHITEPAPER)',
        '',
        'Status ergibt sich aus dem Ordner: `open/` und `ongoing/` (Backlog), `pool/` (unentschiedene Ideen, GitHub-Label `status:pool`), `epics/` (Roadmaps/Whitepaper, GitHub-Label `type:epic`), `closed/`. Revisit-Audit: [wiki/history/revisit-2026-10.md](../wiki/history/revisit-2026-10.md). Dieser Abschnitt wird generiert, nicht manuell bearbeiten.',
        '',
        renderEpicTable(epics, others),
        '',
        '---',
        '',
        '## 🧭 AKTUELLES TICKET-REGISTER (INDEX)',
        '',
        '### Open / Ongoing',
        '',
        renderTicketTable(inFolders(['open', 'ongoing']), resources),
        '',
        '### Pool (unentschieden)',
        '',
        renderTicketTable(inFolders([POOL_FOLDER]), resources),
        '',
        '### Closed',
        '',
        renderTicketTable(inFolders(['closed']), resources),
        '',
        '---',
        '',
        INDEX_END
    ].join('\n');
}

// Split an existing index into preserved header / footer around the generated block.
// Legacy layout (no markers): the generated region spans from the first section containing a ticket table
// to the next section heading after the last ticket row (keeps intro, directory tree and operating manual).
function splitBacklog(content) {
    const text = content.replace(/\r\n/g, '\n');
    const b = text.indexOf(INDEX_BEGIN);
    const e = text.indexOf(INDEX_END);
    if (b !== -1 && e > b) {
        return { head: text.substring(0, b), tail: text.substring(e + INDEX_END.length) };
    }

    const firstTable = text.indexOf('| Ticket-ID | Titel |');
    if (firstTable === -1) return null;
    const headingIdx = text.lastIndexOf('\n## ', firstTable);
    const start = headingIdx === -1 ? firstTable : headingIdx + 1;
    const lastRow = text.lastIndexOf('\n| **');
    const nextHeading = text.indexOf('\n## ', Math.max(lastRow, firstTable));
    const tail = nextHeading === -1 ? '\n' : '\n\n' + text.substring(nextHeading + 1);
    return { head: text.substring(0, start), tail };
}

function renderBacklog(existingContent, tickets) {
    const resources = extractResourceCells(existingContent);
    const block = buildIndexBlock(tickets, resources);
    const parts = existingContent ? splitBacklog(existingContent) : null;
    if (!parts) {
        return '# 🛸 BOB-OS GIT-BASED TICKETING ENGINE\n\n' + block + '\n';
    }
    return parts.head + block + parts.tail;
}

// Regenerate tickets/BACKLOG.md from the local tickets/ tree (no network)
function generateIndex(rootDir = process.cwd()) {
    const ticketDir = path.join(rootDir, 'tickets');
    const backlogPath = path.join(rootDir, 'tickets', 'BACKLOG.md');
    const tickets = getLocalTickets(ticketDir);
    const existing = fs.existsSync(backlogPath) ? fs.readFileSync(backlogPath, 'utf-8') : '';
    const updated = renderBacklog(existing, tickets);

    if (!fs.existsSync(path.dirname(backlogPath))) fs.mkdirSync(path.dirname(backlogPath), { recursive: true });
    fs.writeFileSync(backlogPath, updated, 'utf-8');
    return { backlogPath, ticketCount: tickets.length };
}

// 4. Make REST API helper calls via native fetch
async function apiRequest(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
        headers: HEADERS,
        ...options
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error on ${url} (${response.status}): ${errText}`);
    }

    if (response.status === 204) return null;
    return await response.json();
}

// GraphQL Helper (Strictly requires Bearer header)
async function graphqlRequest(query, variables = {}) {
    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'User-Agent': 'Bob-OS-Sync-Script'
        },
        body: JSON.stringify({ query, variables })
    });

    const data = await response.json();
    if (!response.ok || data.errors) {
        const errs = data.errors ? data.errors.map(e => e.message).join(', ') : 'HTTP error';
        throw new Error(`GraphQL Error: ${errs}`);
    }
    return data.data;
}

// 5. Main PUSH Loop (Local ──> Remote)
async function runPush(localTickets, githubIssues) {
    console.log(`📦 Starting PUSH Synchronization to GitHub...`);
    // One failing ticket must not block the rest (TCK-172); failures are reported at the end
    const failures = [];
    for (const local of localTickets) {
        try {
            await pushTicket(local, githubIssues);
        } catch (error) {
            console.error(`❌ ${local.metadata.id}: ${error.message}`);
            failures.push({ id: local.metadata.id, message: error.message });
        }
    }
    return failures;
}

async function pushTicket(local, githubIssues) {
    const meta = local.metadata;
    const expectedTitlePrefix = `[${meta.id}]`;

    // Map folder status to GitHub states and labels
    const { title: fullTitle, state: githubState, labels: expectedLabels } = mapTicketToIssue(meta);

    // Look for matching issue on GitHub
    const existingIssue = githubIssues.find(issue => issue.title.startsWith(expectedTitlePrefix));

    if (!existingIssue) {
        console.log(`➕ Creating new Issue on GitHub: "${fullTitle}"...`);
        const payload = {
            title: fullTitle,
            body: local.body,
            labels: expectedLabels
        };
        const newIssue = await apiRequest('/issues', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        console.log(`   └─ Successfully created: Issue #${newIssue.number}`);

        // ATOMIC WORKAROUND: GitHub REST API creates issues as "open" by default on creation.
        // If the ticket is locally closed, we must immediately follow up with a PATCH to close it!
        if (githubState === 'closed') {
            console.log(`   └─ Local ticket is closed. Instantly closing Issue #${newIssue.number} on GitHub...`);
            await apiRequest(`/issues/${newIssue.number}`, {
                method: 'PATCH',
                body: JSON.stringify({ state: 'closed' })
            });
        }
    } else {
        let needsUpdate = false;
        const updatePayload = {};

        if (existingIssue.title !== fullTitle) {
            updatePayload.title = fullTitle;
            needsUpdate = true;
        }

        if (existingIssue.state !== githubState) {
            updatePayload.state = githubState;
            needsUpdate = true;
        }

        if (existingIssue.body !== local.body) {
            updatePayload.body = local.body;
            needsUpdate = true;
        }

        // High-precision semantic label diff check
        const currentLabels = existingIssue.labels.map(l => l.name);
        const managedCurrentLabels = currentLabels.filter(isManagedLabel);

        const labelsChanged = expectedLabels.some(l => !currentLabels.includes(l)) ||
                              managedCurrentLabels.some(l => !expectedLabels.includes(l));
        if (labelsChanged) {
            updatePayload.labels = expectedLabels;
            needsUpdate = true;
        }

        if (needsUpdate) {
            console.log(`🔄 Updating Issue #${existingIssue.number}: "${fullTitle}"...`);
            await apiRequest(`/issues/${existingIssue.number}`, {
                method: 'PATCH',
                body: JSON.stringify(updatePayload)
            });
            console.log(`   └─ Successfully updated.`);
        } else {
            console.log(`🟢 Issue #${existingIssue.number} ("${meta.title}") is already in sync.`);
        }
    }
}

// 6. Main PULL Loop (Remote ──> Local)
async function runPull(localTickets, githubIssues) {
    console.log(`📥 Starting PULL Synchronization to Local Workspace...`);
    const ticketDir = path.join(process.cwd(), 'tickets');

    // Group local tickets by ID for quick lookup
    const localMap = {};
    localTickets.forEach(t => {
        localMap[t.metadata.id] = t;
    });

    for (const issue of githubIssues) {
        // Parse Title: "[TCK-101] Title" / "[EPIC-00] Title" (Now completely status-neutral!)
        const parsedTitle = parseIssueTitle(issue.title);
        if (!parsedTitle) {
            // Ignore non-ticket issues
            continue;
        }

        const ticketId = parsedTitle.id;
        const ticketTitle = parsedTitle.title;
        const localTicket = localMap[ticketId];

        // Extract metadata from labels (pool/ and epics/ items stay in their folder)
        const mapped = mapIssueToLocal(issue, localTicket ? localTicket.metadata.folder_status : null);
        const folderStatus = mapped.folderStatus;

        if (localTicket) {
            // UPDATE LOCAL TICKET
            const meta = localTicket.metadata;
            const priority = mapped.priority || meta.priority || (mapped.isEpic ? undefined : 'medium');
            let needsMove = meta.folder_status !== folderStatus;
            let needsUpdate = needsMove ||
                              meta.title !== ticketTitle ||
                              meta.priority !== priority ||
                              localTicket.body !== issue.body;

            if (needsUpdate) {
                console.log(`🔄 Updating Local Ticket ${ticketId} based on GitHub Issue #${issue.number}...`);

                // Keep existing local metadata that isn't on GitHub
                const updatedMetadata = {
                    ...meta,
                    title: ticketTitle,
                    priority: priority,
                    status: mapped.isEpic ? (meta.status || 'open') : statusForFolder(folderStatus)
                };

                if (folderStatus === 'closed' && !updatedMetadata.completed) {
                    updatedMetadata.completed = new Date().toISOString().split('T')[0];
                }

                const serializedContent = stringifyTicket(updatedMetadata, issue.body);
                let targetPath = localTicket.raw_path;

                if (needsMove) {
                    // Use git mv or standard fs.rename
                    const newDir = path.join(ticketDir, folderStatus);
                    if (!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true });

                    // Clean filename slug if title changed
                    const cleanSlug = sanitizeSlug(ticketTitle);
                    const newFilename = `${ticketId}-${cleanSlug}.md`;
                    const newPath = path.join(newDir, newFilename);

                    console.log(`   └─ Moving file: ${localTicket.filename} ──> ${folderStatus}/${newFilename}`);
                    try {
                        execSync(`git mv "${localTicket.raw_path}" "${newPath}" 2>/dev/null || mv "${localTicket.raw_path}" "${newPath}"`);
                        targetPath = newPath;
                    } catch (e) {
                        fs.renameSync(localTicket.raw_path, newPath);
                        targetPath = newPath;
                    }
                }

                fs.writeFileSync(targetPath, serializedContent, 'utf-8');
                console.log(`   └─ Local file successfully updated and saved.`);
            } else {
                console.log(`🟢 Local Ticket ${ticketId} is already in sync with GitHub.`);
            }
        } else {
            // CREATE NEW LOCAL TICKET (Someone created an Issue directly on GitHub!)
            console.log(`➕ Creating new local Ticket for GitHub Issue #${issue.number} ("${ticketTitle}")...`);

            const today = new Date().toISOString().split('T')[0];
            const newMetadata = mapped.isEpic
                ? { id: ticketId, title: ticketTitle, type: 'epic', status: 'open', priority: mapped.priority || undefined, created: today }
                : {
                    id: ticketId,
                    title: ticketTitle,
                    epic_phase: mapped.epicPhase || "Unassigned",
                    epic: mapped.epic || undefined,
                    status: statusForFolder(folderStatus),
                    priority: mapped.priority || 'medium',
                    created: today
                };

            if (folderStatus === 'closed') {
                newMetadata.completed = today;
            }

            const serializedContent = stringifyTicket(newMetadata, issue.body || "No description provided.");
            const targetDir = path.join(ticketDir, folderStatus);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

            const cleanSlug = sanitizeSlug(ticketTitle);
            const filename = `${ticketId}-${cleanSlug}.md`;
            const targetPath = path.join(targetDir, filename);

            fs.writeFileSync(targetPath, serializedContent, 'utf-8');
            try {
                execSync(`git add "${targetPath}"`);
            } catch (e) {}
            console.log(`   └─ Created local file: tickets/${folderStatus}/${filename}`);
        }
    }
}

function rebuildIndex() {
    console.log("📝 Re-building the central Index Register (tickets/BACKLOG.md)...");
    const { ticketCount } = generateIndex();
    console.log(`   └─ Successfully updated index register (${ticketCount} tickets).`);
}

// 7. Bootstrap Exec
async function main(argv = process.argv) {
    loadDotEnv();

    if (argv.includes('--index-only')) {
        console.log(`🛰️ Mode: INDEX-ONLY (Local tickets/ ──> tickets/BACKLOG.md)`);
        rebuildIndex();
        return;
    }

    const isPullMode = argv.includes('--pull') || argv.includes('-p');
    console.log(`🛰️ Mode: ${isPullMode ? 'PULL (Remote ──> Local)' : 'PUSH (Local ──> Remote)'}`);
    initGitHubContext();

    try {
        console.log("📥 Fetching active and closed issues from GitHub...");
        let githubIssues = [];
        let page = 1;
        while (true) {
            const issues = await apiRequest(`/issues?state=all&per_page=100&page=${page}`);
            if (!issues || issues.length === 0) break;
            githubIssues = githubIssues.concat(issues);
            if (issues.length < 100) break;
            page++;
        }
        console.log(`✅ Loaded ${githubIssues.length} issues from GitHub.`);

        const localTickets = getLocalTickets();
        console.log(`📦 Loaded ${localTickets.length} local tickets from tickets/.`);

        let failures = [];
        if (isPullMode) {
            await runPull(localTickets, githubIssues);
        } else {
            failures = await runPush(localTickets, githubIssues);
        }

        // Re-import local tickets after syncing and update the Index Register
        rebuildIndex();

        if (failures.length > 0) {
            console.error(`❌ Sync finished with ${failures.length} failed ticket(s):`);
            failures.forEach(f => console.error(`   - ${f.id}: ${f.message}`));
            process.exit(1);
        }
        console.log("🎉 Sync finished successfully!");
    } catch (error) {
        console.error("❌ Sync failed with exception:", error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error("❌ Sync failed with exception:", error.message);
        process.exit(1);
    });
}

module.exports = {
    TICKET_FOLDERS,
    INDEX_BEGIN,
    INDEX_END,
    parseTicketContent,
    parseTicket,
    stringifyTicket,
    getLocalTickets,
    sanitizeSlug,
    mapTicketToIssue,
    GITHUB_LABEL_MAX,
    clampLabel,
    runPush,
    isManagedLabel,
    parseIssueTitle,
    mapIssueToLocal,
    statusForFolder,
    extractResourceCells,
    buildIndexBlock,
    splitBacklog,
    renderBacklog,
    generateIndex
};

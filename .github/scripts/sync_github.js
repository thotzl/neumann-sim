const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Get GitHub credentials & repository info
const token = process.env.GITHUB_TOKEN;
if (!token) {
    console.error("❌ GITHUB_TOKEN environment variable is missing. Synchronization aborted.");
    process.exit(1);
}

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
console.log(`🛰️ Synchronizing tickets for repository: https://github.com/${owner}/${repoName}`);

const BASE_URL = `https://api.github.com/repos/${owner}/${repoName}`;
const HEADERS = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Bob-OS-Sync-Script'
};

// Simple, robust YAML Frontmatter parser (Dependency-Free!)
function parseTicket(filePath) {
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const frontmatterRegex = /^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/;
    const match = rawContent.match(frontmatterRegex);
    if (!match) return null;

    const yamlStr = match[1];
    const bodyStr = match[2].trim();
    const metadata = {};

    yamlStr.split('\n').forEach(line => {
        const idx = line.indexOf(':');
        if (idx !== -1) {
            const key = line.substring(0, idx).trim();
            let val = line.substring(idx + 1).trim();
            // Clean up quotes
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
            // Handle arrays (e.g. dependencies: ["TCK-001"])
            if (val.startsWith('[') && val.endsWith(']')) {
                try {
                    val = JSON.parse(val.replace(/'/g, '"'));
                } catch(e) {}
            }
            metadata[key] = val;
        }
    });

    return { metadata, body: bodyStr };
}

// 2. Scan all local tickets across status directories
function getLocalTickets() {
    const ticketDir = path.join(process.cwd(), '.tickets');
    const statuses = ['open', 'ongoing', 'closed'];
    const tickets = [];

    statuses.forEach(status => {
        const dirPath = path.join(ticketDir, status);
        if (!fs.existsSync(dirPath)) return;

        const files = fs.readdirSync(dirPath).filter(file => file.endsWith('.md'));
        files.forEach(file => {
            const parsed = parseTicket(path.join(dirPath, file));
            if (parsed) {
                // Determine folder-based status
                parsed.metadata.folder_status = status;
                tickets.push(parsed);
            }
        });
    });

    return tickets;
}

// 3. Make REST API helper calls via native fetch
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

// 4. Main Sync Loop
async function sync() {
    try {
        console.log("📥 Fetching active and closed issues from GitHub...");
        // Get all issues (including closed ones)
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
        console.log(`📦 Loaded ${localTickets.length} local tickets from .tickets/.`);

        for (const local of localTickets) {
            const meta = local.metadata;
            const expectedTitlePrefix = `[${meta.id}]`;
            const fullTitle = `${expectedTitlePrefix} ${meta.title}`;

            // Map folder status to GitHub states and labels
            const githubState = meta.folder_status === 'closed' ? 'closed' : 'open';
            const expectedLabels = [
                `priority:${meta.priority || 'medium'}`,
                `status:${meta.folder_status}`
            ];
            if (meta.epic_phase) {
                const epicSlug = meta.epic_phase.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                expectedLabels.push(`epic:${epicSlug}`);
            }

            // Look for matching issue on GitHub
            const existingIssue = githubIssues.find(issue => issue.title.startsWith(expectedTitlePrefix));

            if (!existingIssue) {
                // CREATE ISSUE
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
            } else {
                // UPDATE ISSUE IF MODIFIED
                let needsUpdate = false;
                const updatePayload = {};

                // 1. Sync title
                if (existingIssue.title !== fullTitle) {
                    updatePayload.title = fullTitle;
                    needsUpdate = true;
                }

                // 2. Sync state (open / closed)
                if (existingIssue.state !== githubState) {
                    updatePayload.state = githubState;
                    needsUpdate = true;
                }

                // 3. Sync body
                if (existingIssue.body !== local.body) {
                    updatePayload.body = local.body;
                    needsUpdate = true;
                }

                // 4. Sync labels
                const currentLabels = existingIssue.labels.map(l => l.name);
                const labelsChanged = expectedLabels.some(l => !currentLabels.includes(l)) || 
                                      currentLabels.some(l => l.startsWith('priority:') || l.startsWith('status:') || l.startsWith('epic:')) && 
                                      currentLabels.some(l => !expectedLabels.includes(l));
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

        console.log("🎉 Direct Code-to-GitHub Ticket Sync completed successfully!");
    } catch (error) {
        console.error("❌ Sync failed with exception:", error.message);
        process.exit(1);
    }
}

sync();

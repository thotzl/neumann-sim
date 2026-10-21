const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const sync = require('../../.github/scripts/sync_github');

console.log("==================================================");
console.log("🚀 STARTING TICKET SYNC UNIT TESTS (OFFLINE)");
console.log("==================================================");

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neumann-ticket-sync-'));

function writeTicket(folder, filename, lines, eol = '\n') {
    const dir = path.join(testDir, 'tickets', folder);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), lines.join(eol) + eol, 'utf8');
}

try {
    // 1. Frontmatter parsing: quoted, unquoted, arrays, CRLF
    console.log("Test 1: Parsing frontmatter (quoted / unquoted values, arrays)...");
    const lf = sync.parseTicketContent([
        '---',
        'id: "TCK-900"',
        "title: 'Single: quoted'",
        'epic_phase: Unquoted Phase',
        'epic: EPIC-00',
        'priority: high',
        'dependencies: ["TCK-001", "TCK-002"]',
        'loose: [TCK-120, TCK-121]',
        'escaped: "Say \\"hi\\""',
        '---',
        '',
        '# Body',
        'Text'
    ].join('\n'), '/x/open/TCK-900-a.md');
    assert.strictEqual(lf.metadata.id, 'TCK-900');
    assert.strictEqual(lf.metadata.title, 'Single: quoted');
    assert.strictEqual(lf.metadata.epic_phase, 'Unquoted Phase');
    assert.strictEqual(lf.metadata.epic, 'EPIC-00');
    assert.deepStrictEqual(lf.metadata.dependencies, ['TCK-001', 'TCK-002']);
    assert.deepStrictEqual(lf.metadata.loose, ['TCK-120', 'TCK-121']);
    assert.strictEqual(lf.metadata.escaped, 'Say "hi"');
    assert.strictEqual(lf.body, '# Body\nText');
    assert.strictEqual(lf.filename, 'TCK-900-a.md');

    console.log("Test 2: Parsing CRLF files yields LF-normalized metadata and body...");
    const crlf = sync.parseTicketContent('---\r\nid: "TCK-901"\r\ntitle: CRLF Ticket\r\nstatus: "open"\r\n---\r\n\r\nLine A\r\nLine B\r\n', 'TCK-901.md');
    assert.strictEqual(crlf.metadata.id, 'TCK-901');
    assert.strictEqual(crlf.metadata.title, 'CRLF Ticket');
    assert.strictEqual(crlf.metadata.status, 'open');
    assert.strictEqual(crlf.body, 'Line A\nLine B');
    assert.strictEqual(sync.parseTicketContent('no frontmatter here'), null);

    console.log("Test 3: stringifyTicket round-trips through the parser...");
    const roundTrip = sync.parseTicketContent(sync.stringifyTicket(
        { id: 'TCK-902', title: 'A: "quoted" title', dependencies: ['TCK-1'], folder_status: 'open', skipped: undefined }, 'Body'));
    assert.strictEqual(roundTrip.metadata.title, 'A: "quoted" title');
    assert.deepStrictEqual(roundTrip.metadata.dependencies, ['TCK-1']);
    assert.strictEqual(roundTrip.metadata.folder_status, undefined);
    assert.strictEqual('skipped' in roundTrip.metadata, false);

    // 2. PUSH mapping (local folder -> GitHub state / labels)
    console.log("Test 4: Mapping open / ongoing / closed / pool / epics to GitHub issues...");
    const open = sync.mapTicketToIssue({ id: 'TCK-137', title: 'T', priority: 'high', epic_phase: 'EPIC-00 Platform Hardening', epic: 'EPIC-00', folder_status: 'open' });
    assert.strictEqual(open.title, '[TCK-137] T');
    assert.strictEqual(open.state, 'open');
    assert.deepStrictEqual(open.labels, ['priority:high', 'status:open', 'epic:epic-00-platform-hardening', 'epic:EPIC-00']);

    const ongoing = sync.mapTicketToIssue({ id: 'TCK-2', title: 'T', folder_status: 'ongoing' });
    assert.strictEqual(ongoing.state, 'open');
    assert.deepStrictEqual(ongoing.labels, ['priority:medium', 'status:ongoing']);

    const closed = sync.mapTicketToIssue({ id: 'TCK-3', title: 'T', priority: 'low', folder_status: 'closed' });
    assert.strictEqual(closed.state, 'closed');
    assert.deepStrictEqual(closed.labels, ['priority:low', 'status:closed']);

    const pool = sync.mapTicketToIssue({ id: 'TCK-151', title: 'Idea', priority: 'undecided', epic: 'EPIC-01', folder_status: 'pool' });
    assert.strictEqual(pool.state, 'open');
    assert.deepStrictEqual(pool.labels, ['priority:undecided', 'status:pool', 'epic:EPIC-01']);

    const epic = sync.mapTicketToIssue({ id: 'EPIC-00', title: 'Platform Hardening', type: 'epic', status: 'open', folder_status: 'epics' });
    assert.strictEqual(epic.title, '[EPIC-00] Platform Hardening');
    assert.strictEqual(epic.state, 'open');
    assert.deepStrictEqual(epic.labels, ['type:epic', 'epic:EPIC-00']);
    assert.strictEqual(sync.isManagedLabel('type:epic'), true);
    assert.strictEqual(sync.isManagedLabel('bug'), false);

    // 3. PULL mapping (GitHub issue -> local folder)
    console.log("Test 5: Mapping GitHub issues back to local folders (pool / epics stay put)...");
    const issue = (title, state, labels) => ({ title, state, labels: labels.map(name => ({ name })) });
    assert.deepStrictEqual(sync.parseIssueTitle('[EPIC-03] Deeper Verse'), { id: 'EPIC-03', title: 'Deeper Verse' });
    assert.deepStrictEqual(sync.parseIssueTitle('[TCK-101] Upgrades'), { id: 'TCK-101', title: 'Upgrades' });
    assert.strictEqual(sync.parseIssueTitle('Random bug report'), null);

    const pulledPool = sync.mapIssueToLocal(issue('[TCK-151] Idea', 'open', ['status:pool', 'priority:undecided', 'epic:EPIC-01']), 'pool');
    assert.strictEqual(pulledPool.folderStatus, 'pool');
    assert.strictEqual(pulledPool.priority, 'undecided');
    assert.strictEqual(pulledPool.epic, 'EPIC-01');
    assert.strictEqual(sync.mapIssueToLocal(issue('[TCK-151] Idea', 'open', []), 'pool').folderStatus, 'pool');
    assert.strictEqual(sync.mapIssueToLocal(issue('[TCK-151] Idea', 'closed', ['status:pool']), 'pool').folderStatus, 'closed');

    const pulledEpic = sync.mapIssueToLocal(issue('[EPIC-00] Hardening', 'open', ['type:epic', 'epic:EPIC-00']), 'epics');
    assert.strictEqual(pulledEpic.folderStatus, 'epics');
    assert.strictEqual(pulledEpic.isEpic, true);
    assert.strictEqual(sync.mapIssueToLocal(issue('[EPIC-09] New', 'closed', []), null).folderStatus, 'epics');

    const pulledOpen = sync.mapIssueToLocal(issue('[TCK-7] T', 'open', ['status:ongoing', 'epic:some-phase']), 'open');
    assert.strictEqual(pulledOpen.folderStatus, 'ongoing');
    assert.strictEqual(pulledOpen.epicPhase, 'some-phase');
    assert.strictEqual(sync.mapIssueToLocal(issue('[TCK-7] T', 'closed', ['status:open']), 'open').folderStatus, 'closed');
    assert.strictEqual(sync.mapIssueToLocal(issue('[TCK-7] T', 'open', ['status:closed']), 'closed').folderStatus, 'open');
    assert.strictEqual(sync.mapIssueToLocal(issue('[TCK-7] T', 'open', []), null).folderStatus, 'open');
    assert.strictEqual(sync.statusForFolder('pool'), 'pool');
    assert.strictEqual(sync.statusForFolder('unknown'), 'open');

    // 4. Index generation into a temp workspace
    console.log("Test 6: Generating the backlog index offline (all folders, CRLF tickets)...");
    writeTicket('epics', 'EPIC-00-hardening.md', ['---', 'id: "EPIC-00"', 'title: "Hardening"', 'type: "epic"', 'status: "open"', '---', '', '# EPIC-00'], '\r\n');
    writeTicket('open', 'TCK-200-open-item.md', ['---', 'id: "TCK-200"', 'title: "Open Item"', 'epic_phase: "EPIC-00 Hardening"', 'epic: "EPIC-00"', 'priority: "high"', 'dependencies: ["TCK-199"]', '---', '', 'Body'], '\r\n');
    writeTicket('ongoing', 'TCK-201-busy.md', ['---', 'id: TCK-201', 'title: Busy | Piped', 'epic: EPIC-00', '---', '', 'Body']);
    writeTicket('pool', 'TCK-202-idea.md', ['---', 'id: "TCK-202"', 'title: "Idea"', 'epic: "EPIC-00"', 'status: "pool"', 'priority: "undecided"', '---', '', 'Body']);
    writeTicket('closed', 'TCK-100-done.md', ['---', 'id: "TCK-100"', 'title: "Done"', 'epic_phase: "Legacy Phase"', 'priority: "low"', '---', '', 'Body']);
    writeTicket('open', 'README.txt', ['not a ticket']);

    const tickets = sync.getLocalTickets(path.join(testDir, 'tickets'));
    assert.strictEqual(tickets.length, 5);
    assert.deepStrictEqual(tickets.map(t => t.metadata.folder_status).sort(), ['closed', 'epics', 'ongoing', 'open', 'pool']);

    const backlogPath = path.join(testDir, 'tickets', 'BACKLOG.md');
    fs.writeFileSync(backlogPath, [
        '# HEADER TITLE',
        '',
        'Intro text stays.',
        '',
        '---',
        '',
        '## LEGACY REGISTER',
        '',
        '| Ticket-ID | Titel | Epic / Phase | Status | Prio | Ticket-Datei | Verknüpfte Quell-Ressource |',
        '| :--- | :--- | :--- | :--- | :--- | :--- | :--- |',
        '| **TCK-100** | Done | Legacy Phase | `closed` | `low` | [Link](x) | [CURATED](../res.md) |',
        '',
        '---',
        '',
        '## FOOTER MANUAL',
        '',
        'Footer text stays.',
        ''
    ].join('\r\n'), 'utf8');

    const result = sync.generateIndex(testDir);
    assert.strictEqual(result.ticketCount, 5);
    const generated = fs.readFileSync(backlogPath, 'utf8');
    assert.ok(!generated.includes('\r\n'), "Generated index must use LF line endings");
    assert.ok(generated.startsWith('# HEADER TITLE\n\nIntro text stays.'), "Header text was not preserved");
    assert.ok(generated.includes('## FOOTER MANUAL\n\nFooter text stays.'), "Footer text was not preserved");
    assert.ok(!generated.includes('## LEGACY REGISTER'), "Legacy register section was not replaced");
    assert.ok(generated.includes(sync.INDEX_BEGIN) && generated.includes(sync.INDEX_END), "Generated markers missing");

    const order = ['## 🗺️ EPICS', '### Open / Ongoing', '### Pool', '### Closed'].map(h => generated.indexOf(h));
    assert.ok(order.every(i => i !== -1), "Missing index section");
    assert.deepStrictEqual(order.slice().sort((a, b) => a - b), order, "Index sections are out of order");

    assert.ok(generated.includes('| **EPIC-00** | Hardening | `open` | 2 | 1 | 0 | [Link](epics/EPIC-00-hardening.md) |'), "Epic row incorrect");
    assert.ok(generated.includes('| **TCK-200** | Open Item | EPIC-00 Hardening | `open` | `high` | [Link](open/TCK-200-open-item.md) | TCK-199 |'), "Open row incorrect");
    assert.ok(generated.includes('| **TCK-201** | Busy \\| Piped | EPIC-00 | `ongoing` | `medium` | [Link](ongoing/TCK-201-busy.md) | - |'), "Ongoing row incorrect");
    assert.ok(generated.includes('| **TCK-202** | Idea | EPIC-00 | `pool` | `undecided` | [Link](pool/TCK-202-idea.md) | - |'), "Pool row incorrect");
    assert.ok(generated.includes('| **TCK-100** | Done | Legacy Phase | `closed` | `low` | [Link](closed/TCK-100-done.md) | [CURATED](../res.md) |'), "Curated resource cell was not carried over");

    console.log("Test 7: Regenerating is idempotent...");
    sync.generateIndex(testDir);
    assert.strictEqual(fs.readFileSync(backlogPath, 'utf8'), generated, "Second generation changed the index");

    // 8. Label length is clamped to GitHub's 50-character limit (TCK-172)
    console.log("Test 8: Clamping long epic_phase labels to 50 characters...");
    const longPhase = sync.mapTicketToIssue({
        id: 'TCK-134', title: 'Long', folder_status: 'open', priority: 'high',
        epic_phase: 'Epic 2 (V10.0) / Phase 2.6 (Swarm Safety & Cognitive Alignment)'
    });
    longPhase.labels.forEach(l => assert.ok(l.length <= sync.GITHUB_LABEL_MAX, `Label too long: ${l}`));
    const phaseLabel = longPhase.labels.find(l => l.startsWith('epic:epic-2'));
    assert.ok(phaseLabel && !phaseLabel.endsWith('-'), `Unexpected clamped label: ${phaseLabel}`);
    assert.strictEqual(sync.clampLabel('epic:short'), 'epic:short');

    // 9. Every real ticket in the repo stays within GitHub's API limits
    console.log("Test 9: All repository tickets respect GitHub label / title / body limits...");
    const repoTickets = sync.getLocalTickets(path.join(__dirname, '..', '..', 'tickets'));
    assert.ok(repoTickets.length > 0, "No repository tickets found");
    repoTickets.forEach(t => {
        const mapped = sync.mapTicketToIssue(t.metadata);
        mapped.labels.forEach(l => assert.ok(l.length <= sync.GITHUB_LABEL_MAX, `${t.metadata.id}: label too long (${l.length}): ${l}`));
        assert.ok(mapped.title.length <= 256, `${t.metadata.id}: title too long`);
        assert.ok((t.body || '').length <= 65536, `${t.metadata.id}: body too long`);
    });

    // Clean up
    fs.rmSync(testDir, { recursive: true, force: true });
} catch (e) {
    console.error("\n❌ Ticket sync test failed:", e.message);
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
    process.exit(1);
}

// 10. Push continues after a failing ticket and reports it (TCK-172), fetch stubbed (no network)
(async () => {
    console.log("Test 10: PUSH continues after a failing ticket and returns the failures...");
    const calls = [];
    global.fetch = async (url, options = {}) => {
        calls.push({ url, method: options.method || 'GET' });
        if (url.endsWith('/issues/1')) {
            return { ok: false, status: 422, text: async () => 'Validation Failed' };
        }
        return { ok: true, status: 200, json: async () => ({ number: 2 }) };
    };
    const ticket = (id) => ({ metadata: { id, title: id, folder_status: 'open', priority: 'high' }, body: 'new body' });
    const issue = (number, id) => ({ number, title: `[${id}] ${id}`, state: 'open', body: 'old body', labels: [] });
    const failures = await sync.runPush([ticket('TCK-901'), ticket('TCK-902')], [issue(1, 'TCK-901'), issue(2, 'TCK-902')]);

    assert.strictEqual(failures.length, 1, "Exactly one failure expected");
    assert.strictEqual(failures[0].id, 'TCK-901');
    assert.ok(calls.some(c => c.url.endsWith('/issues/2') && c.method === 'PATCH'), "Second ticket was not pushed after the failure");

    console.log("\n🎉 ALL TICKET SYNC UNIT TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
})().catch(e => {
    console.error("\n❌ Ticket sync test failed:", e.message);
    process.exit(1);
});

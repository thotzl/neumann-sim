/**
 * Doc link checker: verifies that every relative Markdown link in the
 * repository's tracked *.md files points to an existing file or directory.
 *
 * - File list: `git ls-files '*.md'` (fallback: tree walk skipping
 *   node_modules, .git, .claude, experiments).
 * - Checked: inline links `[text](target)` and reference definitions
 *   `[id]: target`. Ignored: http(s)/mailto/other URL schemes, anchor-only
 *   links (`#x`); `#anchor` and `?query` suffixes are stripped.
 * - Fenced code blocks and inline code spans are skipped.
 *
 * Exit code 1 lists every broken link as `file:line -> target`.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SKIP_DIRS = new Set(['node_modules', '.git', '.claude', 'experiments']);

function listMarkdownFiles() {
    try {
        const out = execFileSync('git', ['ls-files', '-z', '--', '*.md'], {
            cwd: ROOT,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        const files = out.split('\0').filter(Boolean)
            .filter(f => !f.split('/').includes('node_modules'))
            .filter(f => fs.existsSync(path.join(ROOT, f)));
        if (files.length > 0) return files;
    } catch (_) { /* git unavailable: fall back to tree walk */ }

    const files = [];
    (function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory()) {
                if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
            } else if (entry.name.endsWith('.md')) {
                files.push(path.relative(ROOT, path.join(dir, entry.name)).split(path.sep).join('/'));
            }
        }
    })(ROOT);
    return files;
}

function extractLinks(text) {
    const links = [];
    const lines = text.split(/\r?\n/);
    let inFence = false;
    lines.forEach((rawLine, idx) => {
        if (/^\s*(```|~~~)/.test(rawLine)) { inFence = !inFence; return; }
        if (inFence) return;
        const line = rawLine.replace(/`[^`]*`/g, '');
        const inline = /!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
        let m;
        while ((m = inline.exec(line)) !== null) links.push({ line: idx + 1, target: m[1] });
        const ref = /^\s*\[[^\]]+\]:\s*<?(\S+?)>?(?:\s+.*)?$/.exec(line);
        if (ref) links.push({ line: idx + 1, target: ref[1] });
    });
    return links;
}

function isExternal(target) {
    return /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//');
}

function checkFile(relFile) {
    const abs = path.join(ROOT, relFile);
    const broken = [];
    for (const { line, target } of extractLinks(fs.readFileSync(abs, 'utf8'))) {
        if (isExternal(target) || target.startsWith('#')) continue;
        let clean = target.split('#')[0].split('?')[0];
        if (!clean) continue;
        try { clean = decodeURIComponent(clean); } catch (_) { /* keep raw */ }
        const resolved = clean.startsWith('/')
            ? path.join(ROOT, clean)
            : path.resolve(path.dirname(abs), clean);
        if (!fs.existsSync(resolved)) broken.push(`${relFile}:${line} -> ${target}`);
    }
    return broken;
}

function main() {
    const files = listMarkdownFiles();
    assert.ok(files.length > 0, 'no Markdown files found');
    const broken = files.flatMap(checkFile);
    if (broken.length > 0) {
        console.error(`[test_doc_links] ${broken.length} broken relative link(s) in ${files.length} Markdown files:`);
        for (const b of broken) console.error(`  ${b}`);
        process.exit(1);
    }
    console.log(`[test_doc_links] OK: ${files.length} Markdown files, 0 broken relative links.`);
}

main();

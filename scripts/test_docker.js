#!/usr/bin/env node
// Builds the Linux dev/test image and runs the central test hub inside it.
// The repo is copied into the image at build time; no bind mount is used
// (SQLite WAL hangs on Docker Desktop Windows bind mounts). Shell-agnostic:
// works from Git Bash, PowerShell, cmd and Linux shells.
// Usage: npm run test:docker [-- <command to run instead of the hub>]
const { spawnSync } = require('child_process');
const path = require('path');

const IMAGE = process.env.NEUMANN_TEST_IMAGE || 'neumann-sim:test';
const root = path.resolve(__dirname, '..');

function docker(args) {
    console.log(`> docker ${args.join(' ')}`);
    const res = spawnSync('docker', args, { cwd: root, stdio: 'inherit' });
    if (res.error) {
        console.error(`docker could not be started: ${res.error.message}`);
        process.exit(1);
    }
    if (res.status !== 0) process.exit(res.status === null ? 1 : res.status);
}

const cmd = process.argv.slice(2);
docker(['build', '-t', IMAGE, '.']);
docker(['run', '--rm', IMAGE, ...(cmd.length ? cmd : ['node', 'tests/test_all.js'])]);

#!/usr/bin/env node
// Containerized simulation runtime (TCK-139, ADR 0002). Builds the runtime image
// (`Dockerfile --target runtime`) and runs the engine or the experiment builder in it:
// non-root, read-only root FS, tmpfs /tmp, only experiments/<exp> bind-mounted rw.
// API keys reach the engine only as env vars from an explicit allowlist (host env
// and root .env); the engine strips them again for all Python children.
// Shell-agnostic: works from Git Bash, PowerShell, cmd and Linux shells.
// Usage:
//   npm run build:docker -- <exp> --mission "..." [--rounds N --agent ID --location SYS --force]
//   npm run sim:docker -- <exp>
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const IMAGE = process.env.NEUMANN_SIM_IMAGE || 'neumann-sim:runtime';
const root = path.resolve(__dirname, '..');
const CONTAINER_EXP_ROOT = '/app/experiments';

// Env vars passed into the container (values never appear on the docker command line)
const ENV_ALLOWLIST = [
    // LLM driver keys (src/sim_engine/drivers/ai_drivers/*)
    'API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY', 'GROQ_API_KEY', 'MISTRAL_API_KEY',
    'CEREBRAS_API_KEY', 'SAMBANOVA_API_KEY', 'OPENROUTER_API_KEY',
    'DEEP_INFRA_KEY', 'DEEPINFRA_API_KEY', 'GITHUB_TOKEN', 'GITHUB_API_KEY',
    // Monitor (VoG server) connection and mock mode
    'VOG_TOKEN', 'VOG_HOST', 'C2_PORT', 'E2E_MOCK'
];
// Scripted mock-driver responses (E2E_MOCK_STEP_<round>_<AGENT>, E2E_MOCK_RESPONSE_<AGENT>)
const ENV_PREFIX_ALLOWLIST = ['E2E_MOCK_'];
// Host-local VoG addresses are unreachable from the container; map them to the host gateway
const LOCAL_HOSTS = new Set(['', '127.0.0.1', 'localhost', '0.0.0.0', '::', '::1']);
const HOST_GATEWAY = 'host.docker.internal';
const EXP_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function fail(msg) {
    console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`);
    process.exit(1);
}

// Same parser semantics as the native engine (runner.js): root .env overrides shell exports
function readDotEnv() {
    const envPath = path.join(root, '.env');
    const vars = {};
    if (!fs.existsSync(envPath)) return vars;
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (!match) continue;
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        vars[match[1].trim()] = val;
    }
    return vars;
}

function containerEnv() {
    const merged = { ...process.env, ...readDotEnv() };
    const env = {};
    for (const [name, value] of Object.entries(merged)) {
        const allowed = ENV_ALLOWLIST.includes(name) || ENV_PREFIX_ALLOWLIST.some(p => name.startsWith(p));
        if (allowed && value !== undefined && value !== '') env[name] = value;
    }
    if (LOCAL_HOSTS.has(env.VOG_HOST || '')) env.VOG_HOST = HOST_GATEWAY;
    return env;
}

function docker(args, env = process.env) {
    const res = spawnSync('docker', args, { cwd: root, stdio: 'inherit', env });
    if (res.error) fail(`docker could not be started: ${res.error.message}`);
    return res.status === null ? 1 : res.status;
}

const [mode, exp, ...rest] = process.argv.slice(2);
if (!['run', 'build'].includes(mode) || !exp) {
    fail('Usage: npm run sim:docker -- <exp> | npm run build:docker -- <exp> --mission "..." [build.py options]');
}
if (!EXP_NAME.test(exp)) fail(`Invalid experiment name '${exp}' (allowed: A-Z a-z 0-9 . _ -).`);

const hostExpDir = path.join(root, 'experiments', exp);
if (mode === 'run' && !fs.existsSync(path.join(hostExpDir, 'config.json'))) {
    fail(`Experiment '${exp}' not found. Build it first: npm run build:docker -- ${exp} --mission "..."`);
}
fs.mkdirSync(hostExpDir, { recursive: true });

console.log(`> docker build --target runtime -t ${IMAGE} .`);
if (docker(['build', '-q', '--target', 'runtime', '-t', IMAGE, '.']) !== 0) fail('Image build failed.');

const env = containerEnv();
const runArgs = [
    'run', '--rm', '--init',
    '--read-only', '--tmpfs', '/tmp:rw,noexec,nosuid,nodev,size=256m',
    '--cap-drop=ALL', '--security-opt=no-new-privileges', '--pids-limit=512',
    // Docker Desktop resolves host.docker.internal itself; Linux needs the host-gateway mapping
    `--add-host=${HOST_GATEWAY}:host-gateway`,
    '-v', `${hostExpDir}:${CONTAINER_EXP_ROOT}/${exp}`
];
// Linux/macOS: write with the host user's IDs so the bind-mounted files stay owned by the operator
if (typeof process.getuid === 'function') runArgs.push('--user', `${process.getuid()}:${process.getgid()}`);
if (process.stdin.isTTY && process.stdout.isTTY) runArgs.push('-it');
for (const name of Object.keys(env)) runArgs.push('-e', name);
runArgs.push(IMAGE);

if (mode === 'build') {
    // Pre-build tests need a writable repo; they run separately via `npm run test:docker`
    runArgs.push('python3', 'scripts/build.py', exp, ...rest, '--skip-tests');
} else {
    // The image's engine runs (read-only), not the agent-writable copy in experiments/<exp>/sim_engine
    runArgs.push('node', 'src/sim_engine/core/runner.js', exp);
}

console.log(`> docker ${runArgs.join(' ')}`);
const status = docker(runArgs, { ...process.env, ...env });
if (mode === 'build' && status === 0) console.log(`Start in container: npm run sim:docker -- ${exp}`);
process.exit(status);

const fs = require('fs');
const content = fs.readFileSync('bob_os/test_suite/test_runner_boot.js', 'utf8');
const lines = content.split('\n');
lines.splice(72, 0, "    fs.writeFileSync(path.join(expDir, 'config.json'), JSON.stringify({ rounds: 1, config_override: { max_turns: 10 } }));");
fs.writeFileSync('bob_os/test_suite/test_runner_boot.js', lines.join('\n'));

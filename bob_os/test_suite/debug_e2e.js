const fs = require('fs');
const state = JSON.parse(fs.readFileSync('experiments/e2e_test_run/state.json', 'utf8'));
console.log(JSON.stringify(state.histories['Bob-2'], null, 2));

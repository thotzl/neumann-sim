const fs = require('fs');
const path = require('path');
const expDir = path.resolve('experiments/BOOT_TEST');
const popPath = path.join(expDir, '_verse/population.json');
const pop = JSON.parse(fs.readFileSync(popPath, 'utf8'));
pop.agents.push({
    id: "Instance-2", parent_id: "Instance-1", location: "SYS_X0_Y0", status: "active", system_prompt: "Du bist Klon Instance-2. Sag Hallo!"
});
fs.writeFileSync(popPath, JSON.stringify(pop, null, 2));

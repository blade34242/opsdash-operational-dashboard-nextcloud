const { readFileSync } = require('fs');

const file = '.github/ci-matrix.json';
const entries = JSON.parse(readFileSync(file, 'utf8'));
const enabled = entries.filter((entry) => entry.enabled);
process.stdout.write(JSON.stringify(enabled));

const { readFileSync } = require('fs');

const file = '.github/ci-matrix.json';
const entries = JSON.parse(readFileSync(file, 'utf8'));
const include = entries
  .filter((entry) => entry.enabled)
  .map(({ nextcloud_branch, php_version }) => ({ nextcloud_branch, php_version }));

process.stdout.write(JSON.stringify({ include }));

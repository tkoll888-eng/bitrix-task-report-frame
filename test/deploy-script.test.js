const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('deploy script sends app key env and deploys through VibeCode infra endpoint', () => {
  const script = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'deploy-vibecode.ps1'), 'utf8');

  assert.match(script, /infra\/servers\/\$ServerId\/deploy/);
  assert.match(script, /VIBECODE_APP_KEY\s*=\s*\$ApiKey/);
  assert.match(script, /VIBECODE_API_KEY\s*=\s*\$ApiKey/);
  assert.match(script, /\[System\.Text\.Encoding\]::UTF8\.GetBytes\(\$bodyJson\)/);
  assert.match(script, /-ContentType 'application\/json'/);
  assert.match(script, /node server\.js/);
});

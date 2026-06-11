const test = require('node:test');
const assert = require('node:assert/strict');
const { readConfig } = require('../src/config');

test('readConfig returns defaults and required values', () => {
  const config = readConfig({
    VIBECODE_API_KEY: 'test-key',
    PORT: '4100',
    VIBECODE_API_BASE: 'https://example.test/v1',
  });

  assert.equal(config.port, 4100);
  assert.equal(config.vibecodeApiKey, 'test-key');
  assert.equal(config.vibecodeApiBase, 'https://example.test/v1');
  assert.equal(config.taskPositionFieldName, 'Наименование позиции');
});

test('readConfig fails when VIBECODE_API_KEY is missing', () => {
  assert.throws(() => readConfig({}), /VIBECODE_API_KEY/);
});

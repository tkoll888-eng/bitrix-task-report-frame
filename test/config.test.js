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

test('readConfig prefers embedded VIBECODE_APP_KEY when present', () => {
  const config = readConfig({
    VIBECODE_API_KEY: 'personal-key',
    VIBECODE_APP_KEY: 'app-key',
  });

  assert.equal(config.vibecodeApiKey, 'app-key');
  assert.equal(config.vibecodeAppKey, 'app-key');
  assert.equal(config.vibecodePersonalApiKey, 'personal-key');
});

test('readConfig fails when neither VIBECODE_APP_KEY nor VIBECODE_API_KEY is present', () => {
  assert.throws(() => readConfig({}), /VIBECODE_APP_KEY or VIBECODE_API_KEY/);
});

test('readConfig rejects invalid port values', () => {
  assert.throws(() => readConfig({
    VIBECODE_API_KEY: 'test-key',
    PORT: 'abc',
  }), /PORT must be a positive integer/);
});

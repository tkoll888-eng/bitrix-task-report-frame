const test = require('node:test');
const assert = require('node:assert/strict');
const { readConfig } = require('../src/config');

test('readConfig returns defaults and required values', () => {
  const config = readConfig({
    VIBECODE_APP_KEY: 'app-key',
    PORT: '4100',
    VIBECODE_API_BASE: 'https://example.test/v1',
  });

  assert.equal(config.port, 4100);
  assert.equal(config.vibecodeApiKey, 'app-key');
  assert.equal(config.vibecodeAppKey, 'app-key');
  assert.equal(config.vibecodeApiBase, 'https://example.test/v1');
  assert.equal(config.taskPositionFieldName, 'Наименование позиции');
});

test('readConfig prefers app key when both keys are present', () => {
  const config = readConfig({
    VIBECODE_API_KEY: 'personal-key',
    VIBECODE_APP_KEY: 'app-key',
  });

  assert.equal(config.vibecodeApiKey, 'app-key');
  assert.equal(config.vibecodeAppKey, 'app-key');
  assert.equal(config.vibecodePersonalApiKey, 'personal-key');
  assert.equal(config.allowPersonalApiKey, false);
});

test('readConfig uses personal key only when local diagnostics are explicit', () => {
  const config = readConfig({
    VIBECODE_API_KEY: 'personal-key',
    VIBECODE_ALLOW_PERSONAL_API_KEY: 'true',
  });

  assert.equal(config.vibecodeApiKey, 'personal-key');
  assert.equal(config.vibecodeAppKey, '');
  assert.equal(config.vibecodePersonalApiKey, 'personal-key');
  assert.equal(config.allowPersonalApiKey, true);
});

test('readConfig uses personal key for explicit diagnostics even when app key is present', () => {
  const config = readConfig({
    VIBECODE_API_KEY: 'personal-key',
    VIBECODE_APP_KEY: 'app-key',
    VIBECODE_ALLOW_PERSONAL_API_KEY: 'true',
  });

  assert.equal(config.vibecodeApiKey, 'personal-key');
  assert.equal(config.vibecodeAppKey, 'app-key');
  assert.equal(config.vibecodePersonalApiKey, 'personal-key');
  assert.equal(config.allowPersonalApiKey, true);
});

test('readConfig fails when neither supported runtime key is available', () => {
  assert.throws(() => readConfig({}), /VIBECODE_APP_KEY is required/);
});

test('readConfig rejects personal key without explicit local diagnostics flag', () => {
  assert.throws(() => readConfig({
    VIBECODE_API_KEY: 'personal-key',
  }), /VIBECODE_ALLOW_PERSONAL_API_KEY=true/);
});

test('readConfig rejects invalid port values', () => {
  assert.throws(() => readConfig({
    VIBECODE_APP_KEY: 'app-key',
    PORT: 'abc',
  }), /PORT must be a positive integer/);
});

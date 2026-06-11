const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

function loadAppWithoutApiKey() {
  delete process.env.VIBECODE_API_KEY;
  delete require.cache[require.resolve('../server')];
  return require('../server').app;
}

test('GET /api/health returns service status', async () => {
  const app = loadAppWithoutApiKey();
  const response = await request(app).get('/api/health');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    success: true,
    service: 'task-report-frame',
  });
});

test('GET / returns compact preview report shell', async () => {
  const app = loadAppWithoutApiKey();
  const response = await request(app).get('/');

  assert.equal(response.status, 200);
  assert.match(response.text, /Период/);
  assert.match(response.text, /Теги содержит/);
  assert.match(response.text, /Дата завершения/);
  assert.match(response.text, /Печать/);
  assert.match(response.text, /Плановые трудозатраты/);
  assert.doesNotMatch(response.text, /Отчет по задачам/);
  assert.doesNotMatch(response.text, /Объект/);
  assert.doesNotMatch(response.text, /Компания/);
});

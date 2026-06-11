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
  assert.match(response.text, /Текущий месяц/);
  assert.match(response.text, /Текущая неделя/);
  assert.match(response.text, /Сегодня/);
  assert.match(response.text, /Произвольный период/);
  assert.match(response.text, /type="date"/);
  assert.match(response.text, /data-range-start="period"/);
  assert.match(response.text, /data-range-end="period"/);
  assert.match(response.text, /data-range-start="completion"/);
  assert.match(response.text, /data-range-end="completion"/);
  assert.match(response.text, /data-range-inline="period"/);
  assert.match(response.text, /data-range-inline="completion"/);
  assert.doesNotMatch(response.text, /data-range-summary="period"/);
  assert.doesNotMatch(response.text, /data-range-summary="completion"/);
  assert.match(response.text, /Теги содержит/);
  assert.match(response.text, /Дата завершения/);
  assert.match(response.text, /Печать/);
  assert.match(response.text, /Плановые трудозатраты/);
  assert.match(response.text, /Затраченное время/);
  assert.match(response.text, /Количество задач/);
  assert.doesNotMatch(response.text, /Задач:/);
  assert.doesNotMatch(response.text, /Отчет по задачам/);
  assert.doesNotMatch(response.text, /Объект/);
  assert.doesNotMatch(response.text, /Компания/);
});

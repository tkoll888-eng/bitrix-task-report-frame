const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');

function loadAppWithoutApiKey() {
  delete process.env.VIBECODE_API_KEY;
  delete process.env.VIBECODE_APP_KEY;
  delete require.cache[require.resolve('../server')];
  return require('../server').app;
}

function loadAppWithAppKeyOnly() {
  process.env.VIBECODE_API_KEY = '';
  process.env.VIBECODE_APP_KEY = 'vibe_app_test';
  process.env.VIBECODE_API_BASE = 'https://example.test/v1';
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

test('GET /api/report route is mounted when only VIBECODE_APP_KEY is configured', async () => {
  const app = loadAppWithAppKeyOnly();
  const response = await request(app).get('/api/report');

  assert.equal(response.status, 400);
  assert.match(response.body.message, /entityTypeId/);
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
  assert.match(response.text, />Теги</);
  assert.match(response.text, /id="selectedTags"/);
  assert.match(response.text, /id="tagSearch"/);
  assert.match(response.text, /id="savedTagSetsQuick"/);
  assert.match(response.text, /id="tagSuggestions" class="tag-suggestions" hidden/);
  assert.match(response.text, /id="savedTagSets" class="tag-sets" hidden/);
  assert.match(response.text, /id="printMeta"/);
  assert.match(response.text, /Дата завершения/);
  assert.match(response.text, /Печать/);
  assert.match(response.text, /Плановые трудозатраты/);
  assert.match(response.text, /Затраченное время/);
  assert.match(response.text, /Количество задач/);
  assert.doesNotMatch(response.text, /Наим\./);
  assert.doesNotMatch(response.text, /Наименование позиции/);
  assert.doesNotMatch(response.text, /Задач:/);
  assert.doesNotMatch(response.text, /Отчет по задачам/);
  assert.doesNotMatch(response.text, /Объект/);
  assert.doesNotMatch(response.text, /Компания/);
});

test('GET /print.html returns print shell', async () => {
  const app = loadAppWithoutApiKey();
  const response = await request(app).get('/print.html');

  assert.equal(response.status, 200);
  assert.match(response.text, /Печать/);
  assert.match(response.text, /reportMeta/);
  assert.match(response.text, /tableHost/);
  assert.match(response.text, /print\.js/);
  assert.doesNotMatch(response.text, /Наим\./);
  assert.doesNotMatch(response.text, /Наименование позиции/);
});

test('print button prints inside current frame without opening a new tab', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'public', 'styles.css'), 'utf8');

  assert.match(appJs, /window\.print\(\)/);
  assert.doesNotMatch(appJs, /window\.open\(`\/print\.html/);
  assert.match(styles, /size:\s*A4 portrait/);
});

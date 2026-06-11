const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.VIBECODE_API_KEY = 'test-key';
const { app } = require('../server');

test('GET /api/health returns service status', async () => {
  const response = await request(app).get('/api/health');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    success: true,
    service: 'task-report-frame',
  });
});

test('GET / returns previewable report shell', async () => {
  const response = await request(app).get('/');

  assert.equal(response.status, 200);
  assert.match(response.text, /Отчет по задачам/);
  assert.match(response.text, /Период/);
  assert.match(response.text, /Печать/);
});

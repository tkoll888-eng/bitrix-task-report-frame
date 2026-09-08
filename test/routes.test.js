const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const express = require('express');
const { createReportRouter } = require('../src/routes/reportRoutes');

function createApp(reportService, options = {}) {
  const app = express();
  app.use(express.json());
  app.use('/api/report', createReportRouter({ reportService, ...options }));
  return app;
}

test('GET /api/report validates context', async () => {
  const app = createApp({});

  const response = await request(app)
    .get('/api/report')
    .set('X-Vibe-Authorization', 'Bearer vibe_session_test');
  assert.equal(response.status, 400);
  assert.match(response.body.message, /entityTypeId/);
});

test('GET /api/report requires embedded VibeCode authorization by default', async () => {
  const app = createApp({});

  const response = await request(app).get('/api/report?entityTypeId=184&itemId=123');
  assert.equal(response.status, 401);
  assert.match(response.body.message, /X-Vibe-Authorization/);
});

test('GET /api/report returns report JSON with embedded authorization', async () => {
  const report = { header: {}, rows: [], totals: {} };
  const app = createApp({
    async buildReport(params) {
      assert.equal(params.entityTypeId, '184');
      assert.equal(params.itemId, '123');
      return report;
    },
  });

  const response = await request(app)
    .get('/api/report?entityTypeId=184&itemId=123')
    .set('X-Vibe-Authorization', 'Bearer vibe_session_test');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { success: true, data: report });
});

test('PATCH /api/report/tasks/:taskId/planned-time requires embedded VibeCode authorization', async () => {
  const app = createApp({});

  const response = await request(app)
    .patch('/api/report/tasks/42/planned-time')
    .send({ plannedText: '1:30' });

  assert.equal(response.status, 401);
  assert.match(response.body.message, /X-Vibe-Authorization/);
});

test('PATCH /api/report/tasks/:taskId/planned-time updates task plan as seconds', async () => {
  const app = createApp({
    async updateTaskPlannedTime(params) {
      assert.equal(params.taskId, '42');
      assert.equal(params.plannedSeconds, 5400);
      assert.equal(params.authorization, 'Bearer vibe_session_test');
      return { taskId: 42, plannedSeconds: 5400, plannedText: '1:30' };
    },
  });

  const response = await request(app)
    .patch('/api/report/tasks/42/planned-time')
    .set('X-Vibe-Authorization', 'Bearer vibe_session_test')
    .send({ plannedText: '1:30' });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    success: true,
    data: { taskId: 42, plannedSeconds: 5400, plannedText: '1:30' },
  });
});

test('PATCH /api/report/tasks/:taskId/planned-time rejects invalid time input', async () => {
  const app = createApp({
    async updateTaskPlannedTime() {
      throw new Error('should not be called');
    },
  });

  const response = await request(app)
    .patch('/api/report/tasks/42/planned-time')
    .set('X-Vibe-Authorization', 'Bearer vibe_session_test')
    .send({ plannedText: '1:75' });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /minutes/i);
});

test('GET /api/report allows explicit local diagnostics without embedded authorization', async () => {
  const report = { header: {}, rows: [], totals: {} };
  const app = createApp({
    async buildReport(params) {
      assert.equal(params.authorization, '');
      return report;
    },
  }, { requireAuthorization: false });

  const response = await request(app).get('/api/report?entityTypeId=184&itemId=123');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { success: true, data: report });
});

test('GET /api/report forwards embedded VibeCode authorization header', async () => {
  const app = createApp({
    async buildReport(params) {
      assert.equal(params.authorization, 'Bearer vibe_session_test');
      return { header: {}, rows: [], totals: {} };
    },
  });

  const response = await request(app)
    .get('/api/report?entityTypeId=184&itemId=123')
    .set('X-Vibe-Authorization', 'Bearer vibe_session_test');

  assert.equal(response.status, 200);
});

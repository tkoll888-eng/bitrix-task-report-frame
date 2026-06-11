const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const express = require('express');
const { createReportRouter } = require('../src/routes/reportRoutes');

test('GET /api/report validates context', async () => {
  const app = express();
  app.use('/api/report', createReportRouter({ reportService: {} }));

  const response = await request(app).get('/api/report');
  assert.equal(response.status, 400);
  assert.match(response.body.message, /entityTypeId/);
});

test('GET /api/report returns report JSON', async () => {
  const app = express();
  const report = { header: {}, rows: [], totals: {} };
  app.use('/api/report', createReportRouter({
    reportService: {
      async buildReport(params) {
        assert.equal(params.entityTypeId, '184');
        assert.equal(params.itemId, '123');
        return report;
      },
    },
  }));

  const response = await request(app).get('/api/report?entityTypeId=184&itemId=123');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { success: true, data: report });
});

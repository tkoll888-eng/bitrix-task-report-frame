const test = require('node:test');
const assert = require('node:assert/strict');
const {
  readContextFromSearch,
  buildReportQuery,
  isManualProjectMode,
  resolveReportContext,
  MANUAL_MODE_ENTITY_TYPE_ID,
} = require('../src/frontend/appState');
const { parseReportResponseText, buildPrintDocumentTitle } = require('../src/frontend/printState');

test('readContextFromSearch supports local query parameters', () => {
  assert.deepEqual(
    readContextFromSearch('?entityTypeId=184&itemId=123'),
    { entityTypeId: '184', itemId: '123' },
  );
});

test('readContextFromSearch extracts placement context', () => {
  const placementOptions = encodeURIComponent(JSON.stringify({ ID: 555 }));
  const search = `?PLACEMENT=CRM_DYNAMIC_184_DETAIL_TAB&PLACEMENT_OPTIONS=${placementOptions}`;

  assert.deepEqual(
    readContextFromSearch(search),
    { entityTypeId: '184', itemId: 555 },
  );
});

test('readContextFromSearch extracts VibeCode lowercase placement context', () => {
  const placementOptions = encodeURIComponent(JSON.stringify({ ID: 777 }));
  const search = `?placement=CRM_DYNAMIC_184_DETAIL_TAB&placement_options=${placementOptions}&member_id=portal&__init=jwt`;

  assert.deepEqual(
    readContextFromSearch(search),
    { entityTypeId: '184', itemId: 777 },
  );
});

test('manual mode is active when smart-process item id is missing', () => {
  assert.equal(isManualProjectMode({}), true);
  assert.equal(isManualProjectMode({ entityTypeId: '184' }), true);
  assert.equal(isManualProjectMode({ entityTypeId: '184', itemId: '123' }), false);
});

test('resolveReportContext waits for manual project id before loading report', () => {
  assert.equal(resolveReportContext({ context: {}, manualProjectId: '' }), null);
  assert.equal(resolveReportContext({ context: {}, manualProjectId: '   ' }), null);
});

test('resolveReportContext uses internal smart-process type for manual project id', () => {
  assert.deepEqual(
    resolveReportContext({ context: {}, manualProjectId: '777' }),
    { entityTypeId: MANUAL_MODE_ENTITY_TYPE_ID, itemId: '777' },
  );
});

test('resolveReportContext preserves placement or URL context when item id exists', () => {
  assert.deepEqual(
    resolveReportContext({
      context: { entityTypeId: '184', itemId: '123' },
      manualProjectId: '777',
    }),
    { entityTypeId: '184', itemId: '123' },
  );
});

test('buildReportQuery serializes active filters for report api', () => {
  const params = buildReportQuery({
    context: { entityTypeId: '184', itemId: '123' },
    filters: {
      periodPreset: 'currentMonth',
      periodFrom: '',
      periodTo: '',
      tagContains: 'montazh',
      tags: ['setup', 'dev'],
      completionPreset: 'custom',
      completionFrom: '2026-06-01',
      completionTo: '2026-06-14',
      statuses: ['2', '3'],
    },
  });

  assert.equal(params.get('entityTypeId'), '184');
  assert.equal(params.get('itemId'), '123');
  assert.equal(params.get('periodPreset'), 'currentMonth');
  assert.equal(params.get('tagContains'), 'montazh');
  assert.deepEqual(params.getAll('tags'), ['setup', 'dev']);
  assert.equal(params.get('completionPreset'), 'custom');
  assert.equal(params.get('completionFrom'), '2026-06-01');
  assert.equal(params.get('completionTo'), '2026-06-14');
  assert.equal(params.get('statuses'), '2,3');
});

test('buildReportQuery omits manual dates and tags for presets without manual values', () => {
  const params = buildReportQuery({
    context: { entityTypeId: '184', itemId: '123' },
    filters: {
      periodPreset: 'allTime',
      periodFrom: '',
      periodTo: '',
      tagContains: '',
      tags: [],
      completionPreset: 'previousWeek',
      completionFrom: '',
      completionTo: '',
      statuses: [],
    },
  });

  assert.equal(params.get('periodPreset'), 'allTime');
  assert.equal(params.has('periodFrom'), false);
  assert.equal(params.has('periodTo'), false);
  assert.equal(params.get('completionPreset'), 'previousWeek');
  assert.equal(params.has('completionFrom'), false);
  assert.equal(params.has('completionTo'), false);
  assert.equal(params.has('tags'), false);
});

test('buildReportQuery preserves commas inside selected tag titles', () => {
  const params = buildReportQuery({
    context: { entityTypeId: '184', itemId: '123' },
    filters: {
      tags: ['Setup, phase 1', 'Dev'],
    },
  });

  assert.deepEqual(params.getAll('tags'), ['Setup, phase 1', 'Dev']);
});

test('buildReportQuery defaults period and completion date filters to all time', () => {
  const params = buildReportQuery({
    context: { entityTypeId: '184', itemId: '123' },
    filters: {},
  });

  assert.equal(params.get('periodPreset'), 'allTime');
  assert.equal(params.get('completionPreset'), 'allTime');
});

test('parseReportResponseText returns friendly message for html response', () => {
  const result = parseReportResponseText({
    ok: false,
    status: 404,
    contentType: 'text/html; charset=utf-8',
    text: '<!DOCTYPE html><html><body>Cannot GET /api/report</body></html>',
  });

  assert.deepEqual(result, {
    success: false,
    message: 'Сервис отчета вернул HTML вместо JSON. Проверьте адрес /api/report и параметры печати.',
  });
});

test('parseReportResponseText returns payload data for valid json', () => {
  const result = parseReportResponseText({
    ok: true,
    status: 200,
    contentType: 'application/json; charset=utf-8',
    text: JSON.stringify({ success: true, data: { rows: [] } }),
  });

  assert.deepEqual(result, {
    success: true,
    data: { rows: [] },
  });
});

test('buildPrintDocumentTitle uses company and completion period for pdf filename', () => {
  assert.equal(
    buildPrintDocumentTitle({
      header: {
        companyName: 'ООО "ДОМОФОНЫ ПЛЮС"',
        printCompletionText: 'Июнь 2026',
      },
    }),
    'ООО ДОМОФОНЫ ПЛЮС Июнь 2026',
  );
});

test('buildPrintDocumentTitle falls back to completion text and cleans invalid filename characters', () => {
  assert.equal(
    buildPrintDocumentTitle({
      header: {
        companyName: 'Дом/Сервис: Север',
        completionText: '2026-06-01 - 2026-06-30',
      },
    }),
    'Дом Сервис Север 2026-06-01 - 2026-06-30',
  );
});

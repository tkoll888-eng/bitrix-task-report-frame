const test = require('node:test');
const assert = require('node:assert/strict');
const { readContextFromSearch, buildReportQuery } = require('../src/frontend/appState');

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

test('buildReportQuery serializes active filters for report api', () => {
  const params = buildReportQuery({
    context: { entityTypeId: '184', itemId: '123' },
    filters: {
      periodPreset: 'currentMonth',
      periodFrom: '',
      periodTo: '',
      tagContains: 'монтаж',
      completionPreset: 'custom',
      completionFrom: '2026-06-01',
      completionTo: '2026-06-14',
      status: '3',
    },
  });

  assert.equal(params.get('entityTypeId'), '184');
  assert.equal(params.get('itemId'), '123');
  assert.equal(params.get('periodPreset'), 'currentMonth');
  assert.equal(params.get('tagContains'), 'монтаж');
  assert.equal(params.get('completionPreset'), 'custom');
  assert.equal(params.get('completionFrom'), '2026-06-01');
  assert.equal(params.get('completionTo'), '2026-06-14');
  assert.equal(params.get('statuses'), '3');
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeFilters, applyClientFilters } = require('../src/report/filters');

const rows = [
  {
    id: 1,
    status: 3,
    createdDate: '2026-06-01T10:00:00+02:00',
    changedDate: '2026-06-02T10:00:00+02:00',
    closedDate: '',
    tags: ['99 / Настройка'],
  },
  {
    id: 2,
    status: 5,
    createdDate: '2026-05-01T10:00:00+02:00',
    changedDate: '2026-06-03T10:00:00+02:00',
    closedDate: '2026-06-04T10:00:00+02:00',
    tags: ['91 / Разработка'],
  },
  {
    id: 3,
    status: 6,
    createdDate: '2026-04-01T10:00:00+02:00',
    changedDate: '2026-04-03T10:00:00+02:00',
    closedDate: '2026-04-04T10:00:00+02:00',
    tags: ['Архив'],
  },
];

test('normalizeFilters applies current month default', () => {
  const filters = normalizeFilters({}, new Date('2026-06-04T10:00:00+02:00'));
  assert.equal(filters.periodPreset, 'currentMonth');
  assert.equal(filters.periodFrom, '2026-06-01');
  assert.equal(filters.periodTo, '2026-06-30');
  assert.equal(filters.completionPreset, 'currentMonth');
  assert.equal(filters.completionFrom, '2026-06-01');
  assert.equal(filters.completionTo, '2026-06-30');
  assert.deepEqual(filters.statuses, []);
});

test('normalizeFilters supports current week, today, and custom range presets', () => {
  const currentWeek = normalizeFilters({
    periodPreset: 'currentWeek',
    completionPreset: 'today',
  }, new Date('2026-06-11T10:00:00+02:00'));

  assert.equal(currentWeek.periodFrom, '2026-06-08');
  assert.equal(currentWeek.periodTo, '2026-06-14');
  assert.equal(currentWeek.completionFrom, '2026-06-11');
  assert.equal(currentWeek.completionTo, '2026-06-11');

  const custom = normalizeFilters({
    periodPreset: 'custom',
    periodFrom: '2026-05-01',
    periodTo: '2026-05-15',
    completionPreset: 'custom',
    completionFrom: '2026-04-01',
    completionTo: '2026-04-30',
  }, new Date('2026-06-11T10:00:00+02:00'));

  assert.equal(custom.periodFrom, '2026-05-01');
  assert.equal(custom.periodTo, '2026-05-15');
  assert.equal(custom.completionFrom, '2026-04-01');
  assert.equal(custom.completionTo, '2026-04-30');
});

test('applyClientFilters filters by activity period, tag, completion, and statuses', () => {
  const filters = normalizeFilters({
    periodPreset: 'custom',
    periodFrom: '2026-06-01',
    periodTo: '2026-06-30',
    tagContains: 'разраб',
    completionPreset: 'custom',
    completionFrom: '2026-06-01',
    completionTo: '2026-06-30',
    statuses: '3,5',
  });

  assert.deepEqual(applyClientFilters(rows, filters).map((row) => row.id), [2]);
});

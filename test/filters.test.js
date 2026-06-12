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

test('normalizeFilters supports all time, previous month, and previous week presets', () => {
  const filters = normalizeFilters({
    periodPreset: 'allTime',
    completionPreset: 'previousMonth',
  }, new Date('2026-06-11T10:00:00+02:00'));

  assert.equal(filters.periodFrom, '');
  assert.equal(filters.periodTo, '');
  assert.equal(filters.completionFrom, '2026-05-01');
  assert.equal(filters.completionTo, '2026-05-31');

  const previousWeek = normalizeFilters({
    periodPreset: 'previousWeek',
    completionPreset: 'allTime',
  }, new Date('2026-06-11T10:00:00+02:00'));

  assert.equal(previousWeek.periodFrom, '2026-06-01');
  assert.equal(previousWeek.periodTo, '2026-06-07');
  assert.equal(previousWeek.completionFrom, '');
  assert.equal(previousWeek.completionTo, '');
});

test('applyClientFilters does not restrict rows when period and completion are all time', () => {
  const filters = normalizeFilters({
    periodPreset: 'allTime',
    completionPreset: 'allTime',
  }, new Date('2026-06-11T10:00:00+02:00'));

  assert.deepEqual(applyClientFilters(rows, filters).map((row) => row.id), [1, 2, 3]);
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

test('applyClientFilters matches tags by partial text regardless of tag syntax', () => {
  const filters = normalizeFilters({
    periodPreset: 'allTime',
    completionPreset: 'allTime',
    tagContains: 'строй',
  });

  const tagRows = [
    {
      id: 10,
      status: 5,
      createdDate: '2026-06-01T10:00:00+02:00',
      changedDate: '2026-06-01T10:00:00+02:00',
      closedDate: '2026-06-02T10:00:00+02:00',
      tags: ['Настройка', 'Согласование'],
    },
    {
      id: 11,
      status: 5,
      createdDate: '2026-06-01T10:00:00+02:00',
      changedDate: '2026-06-01T10:00:00+02:00',
      closedDate: '2026-06-02T10:00:00+02:00',
      tags: ['Документы'],
    },
  ];

  assert.deepEqual(applyClientFilters(tagRows, filters).map((row) => row.id), [10]);
});

test('normalizeFilters keeps selected tags list for OR filtering', () => {
  const filters = normalizeFilters({
    periodPreset: 'allTime',
    completionPreset: 'allTime',
    tags: ['setup', 'dev'],
  });

  assert.deepEqual(filters.tags, ['setup', 'dev']);
});

test('applyClientFilters matches any selected tag with OR logic', () => {
  const filters = normalizeFilters({
    periodPreset: 'allTime',
    completionPreset: 'allTime',
    tags: ['setup', 'dev'],
  });

  const tagRows = [
    {
      id: 21,
      status: 5,
      createdDate: '2026-06-01T10:00:00+02:00',
      changedDate: '2026-06-01T10:00:00+02:00',
      closedDate: '2026-06-02T10:00:00+02:00',
      tags: ['Setup'],
    },
    {
      id: 22,
      status: 5,
      createdDate: '2026-06-01T10:00:00+02:00',
      changedDate: '2026-06-01T10:00:00+02:00',
      closedDate: '2026-06-02T10:00:00+02:00',
      tags: ['Docs', 'DevOps'],
    },
    {
      id: 23,
      status: 5,
      createdDate: '2026-06-01T10:00:00+02:00',
      changedDate: '2026-06-01T10:00:00+02:00',
      closedDate: '2026-06-02T10:00:00+02:00',
      tags: ['Archive'],
    },
  ];

  assert.deepEqual(applyClientFilters(tagRows, filters).map((row) => row.id), [21, 22]);
});

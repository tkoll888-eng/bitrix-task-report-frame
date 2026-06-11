const test = require('node:test');
const assert = require('node:assert/strict');
const { TASK_STATUSES, getStatusLabel, parseStatusList } = require('../src/report/statuses');
const { formatSeconds, sumSeconds } = require('../src/report/time');
const { getCurrentMonthRange, getCompletionRange } = require('../src/report/dateRanges');

test('status labels match Bitrix24 interface names', () => {
  assert.equal(getStatusLabel(2), 'Ждет выполнения');
  assert.equal(getStatusLabel(3), 'В работе');
  assert.equal(getStatusLabel(4), 'Ждет контроля');
  assert.equal(getStatusLabel(5), 'Завершена');
  assert.equal(getStatusLabel(6), 'Отложена');
  assert.equal(TASK_STATUSES.length, 5);
});

test('parseStatusList supports multi-select query values', () => {
  assert.deepEqual(parseStatusList('3,4,5'), [3, 4, 5]);
  assert.deepEqual(parseStatusList(['3', '5']), [3, 5]);
  assert.deepEqual(parseStatusList(''), []);
});

test('time helpers format seconds as H:MM', () => {
  assert.equal(formatSeconds(0), '0:00');
  assert.equal(formatSeconds(900), '0:15');
  assert.equal(formatSeconds(5850), '1:37');
  assert.equal(sumSeconds([{ value: 60 }, { value: 120 }], 'value'), 180);
});

test('current month range uses local month boundaries', () => {
  const range = getCurrentMonthRange(new Date('2026-06-04T10:00:00+02:00'));
  assert.equal(range.from, '2026-06-01');
  assert.equal(range.to, '2026-06-30');
});

test('completion quick ranges are stable', () => {
  assert.deepEqual(getCompletionRange('today', new Date('2026-06-04T10:00:00+02:00')), {
    from: '2026-06-04',
    to: '2026-06-04',
  });
  assert.deepEqual(getCompletionRange('week', new Date('2026-06-04T10:00:00+02:00')), {
    from: '2026-06-01',
    to: '2026-06-07',
  });
  assert.deepEqual(getCompletionRange('month', new Date('2026-06-04T10:00:00+02:00')), {
    from: '2026-06-01',
    to: '2026-06-30',
  });
});

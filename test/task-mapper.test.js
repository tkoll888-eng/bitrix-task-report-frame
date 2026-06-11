const test = require('node:test');
const assert = require('node:assert/strict');
const { mapTaskToRow, calculateTotals } = require('../src/report/taskMapper');

test('mapTaskToRow normalizes task fields for table', () => {
  const row = mapTaskToRow({
    id: 99,
    title: 'Настроить отчет',
    status: 3,
    createdDate: '2026-06-03T09:00:00+02:00',
    changedDate: '2026-06-04T09:00:00+02:00',
    closedDate: null,
    deadline: '2026-06-05T18:00:00+02:00',
    timeEstimate: 3600,
    timeSpentInLogs: 1200,
    tags: '99 / Настройка, Срочно',
    ufTaskPosition: 'Настроить автоматический расчет остатка оплаты',
  }, {
    portalHost: 'solution24.bitrix24.ru',
    positionFieldCode: 'ufTaskPosition',
  });

  assert.equal(row.id, 99);
  assert.equal(row.title, 'Настроить отчет');
  assert.equal(row.titleUrl, 'https://solution24.bitrix24.ru/company/personal/user/0/tasks/task/view/99/');
  assert.equal(row.statusLabel, 'В работе');
  assert.equal(row.createdDateText, '03.06.2026');
  assert.equal(row.deadlineText, '05.06.2026');
  assert.equal(row.closedDateText, '');
  assert.equal(row.plannedText, '1:00');
  assert.equal(row.spentText, '0:20');
  assert.deepEqual(row.tags, ['99 / Настройка', 'Срочно']);
  assert.equal(row.positionName, 'Настроить автоматический расчет остатка оплаты');
});

test('calculateTotals sums seconds and formats result', () => {
  const totals = calculateTotals([
    { plannedSeconds: 3600, spentSeconds: 1200 },
    { plannedSeconds: 900, spentSeconds: 300 },
  ]);

  assert.deepEqual(totals, {
    plannedSeconds: 4500,
    spentSeconds: 1500,
    plannedText: '1:15',
    spentText: '0:25',
  });
});

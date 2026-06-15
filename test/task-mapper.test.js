const test = require('node:test');
const assert = require('node:assert/strict');
const { mapTaskToRow, calculateTotals, parseTags } = require('../src/report/taskMapper');

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
  assert.equal(row.titleFrameUrl, 'https://solution24.bitrix24.ru/company/personal/user/0/tasks/task/view/99/?IFRAME=Y&IFRAME_TYPE=SIDE_SLIDER#');
  assert.equal(row.statusLabel, 'Выполняется');
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

test('parseTags extracts readable titles from Bitrix object tags', () => {
  const tags = parseTags({
    31: { id: 31, title: 'Настройка' },
    57: { id: 57, title: 'Срочно' },
  });

  assert.deepEqual(tags, ['Настройка', 'Срочно']);
});

test('parseTags extracts uppercase Bitrix tag title fields', () => {
  const tags = parseTags([
    { ID: 31, TITLE: 'Настройка' },
    { id: 57, NAME: 'Срочно' },
    { value: 'CRM' },
  ]);

  assert.deepEqual(tags, ['Настройка', 'Срочно', 'CRM']);
});

test('mapTaskToRow reads position name from VibeCode auto field key', () => {
  const row = mapTaskToRow({
    id: 101,
    title: 'Тест',
    status: 2,
    createdDate: '2026-06-03T09:00:00+02:00',
    changedDate: '2026-06-03T09:00:00+02:00',
    ufAuto583853685266: 'Позиция из пользовательского поля',
  }, {
    portalHost: 'solution24.bitrix24.ru',
    positionFieldCode: 'UF_AUTO_583853685266',
  });

  assert.equal(row.positionName, 'Позиция из пользовательского поля');
});

test('mapTaskToRow builds task link with responsible user id when available', () => {
  const row = mapTaskToRow({
    id: 1649,
    title: 'Task',
    status: 2,
    responsibleId: 42,
  }, {
    portalHost: 'solution24.bitrix24.ru',
    positionFieldCode: '',
  });

  assert.equal(row.titleUrl, 'https://solution24.bitrix24.ru/company/personal/user/42/tasks/task/view/1649/');
  assert.equal(row.titleFrameUrl, 'https://solution24.bitrix24.ru/company/personal/user/42/tasks/task/view/1649/?IFRAME=Y&IFRAME_TYPE=SIDE_SLIDER#');
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { createReportService, createTaskSearchBody } = require('../src/report/reportService');

test('createTaskSearchBody builds UF_CRM_TASK code for smart-process binding', () => {
  assert.deepEqual(createTaskSearchBody(184, 83), {
    filter: {
      UF_CRM_TASK: 'Tb8_83',
    },
    sort: '-changedDate',
    limit: 500,
  });
});

test('buildReport forwards embedded authorization to every VibeCode request', async () => {
  const seenAuthorizations = [];
  const client = {
    async getItem(entityTypeId, itemId, requestOptions) {
      seenAuthorizations.push(requestOptions?.authorization);
      return { id: itemId, title: 'Object' };
    },
    async getTaskFields(requestOptions) {
      seenAuthorizations.push(requestOptions?.authorization);
      return [];
    },
    async searchTasks(body, requestOptions) {
      seenAuthorizations.push(requestOptions?.authorization);
      return [];
    },
  };

  const service = createReportService({
    client,
    config: {
      taskPositionFieldName: 'Position',
      taskPositionFieldCode: '',
      publicPortalHost: 'solution24.bitrix24.ru',
    },
  });

  await service.buildReport({
    entityTypeId: 184,
    itemId: 123,
    filters: {},
    authorization: 'Bearer vibe_session_test',
  });

  assert.deepEqual(seenAuthorizations, [
    'Bearer vibe_session_test',
    'Bearer vibe_session_test',
    'Bearer vibe_session_test',
  ]);
});

test('buildReport loads item, company, tasks, rows and totals', async () => {
  const client = {
    async getItem(entityTypeId, itemId) {
      assert.equal(entityTypeId, 184);
      assert.equal(itemId, 123);
      return { id: 123, title: 'Объект А', companyId: 77 };
    },
    async getCompany(companyId) {
      assert.equal(companyId, 77);
      return { id: 77, title: 'ООО Ромашка' };
    },
    async getTaskFields() {
      return [{ code: 'UF_TASK_POSITION', title: 'Наименование позиции' }];
    },
    async searchTasks(body) {
      assert.deepEqual(body, {
        filter: {
          UF_CRM_TASK: 'Tb8_123',
        },
        sort: '-changedDate',
        limit: 500,
      });
      return [
        {
          id: 10,
          title: 'Задача',
          status: 3,
          createdDate: '2026-06-03T10:00:00+02:00',
          changedDate: '2026-06-03T10:00:00+02:00',
          closedDate: '2026-06-04T10:00:00+02:00',
          deadline: '2026-06-05T10:00:00+02:00',
          timeEstimate: 3600,
          timeSpentInLogs: 600,
          tags: 'Настройка',
          UF_TASK_POSITION: 'Позиция',
        },
      ];
    },
  };

  const service = createReportService({
    client,
    config: {
      taskPositionFieldName: 'Наименование позиции',
      taskPositionFieldCode: '',
      publicPortalHost: 'solution24.bitrix24.ru',
    },
    now: () => new Date('2026-07-11T10:00:00+02:00'),
  });

  const report = await service.buildReport({
    entityTypeId: 184,
    itemId: 123,
    filters: {
      periodPreset: 'previousMonth',
      periodFrom: '2026-06-01',
      periodTo: '2026-06-30',
    },
  });

  assert.equal(report.header.objectName, 'Объект А');
  assert.equal(report.header.companyName, 'ООО Ромашка');
  assert.equal(report.header.companyReportName, 'Отчет по сопровождению ООО Ромашка');
  assert.equal(report.header.completionText, 'Не учитывать');
  assert.equal(report.header.printCompletionText, 'Не учитывать');
  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].positionName, 'Позиция');
  assert.equal(report.totals.plannedText, '1:00');
});

test('buildReport formats completion month for print period text', async () => {
  const client = {
    async getItem() {
      return { id: 123, title: 'Object' };
    },
    async getTaskFields() {
      return [];
    },
    async searchTasks() {
      return [];
    },
  };

  const service = createReportService({
    client,
    config: {
      taskPositionFieldName: 'Position',
      taskPositionFieldCode: '',
      publicPortalHost: 'solution24.bitrix24.ru',
    },
    now: () => new Date('2026-07-11T10:00:00+02:00'),
  });

  const report = await service.buildReport({
    entityTypeId: 184,
    itemId: 123,
    filters: {
      periodPreset: 'allTime',
      completionPreset: 'previousMonth',
    },
  });

  assert.equal(report.header.printCompletionText, 'Июнь 2026');
});

test('buildReport keeps exact date range in print period text only for custom completion date', async () => {
  const client = {
    async getItem() {
      return { id: 123, title: 'Object' };
    },
    async getTaskFields() {
      return [];
    },
    async searchTasks() {
      return [];
    },
  };

  const service = createReportService({
    client,
    config: {
      taskPositionFieldName: 'Position',
      taskPositionFieldCode: '',
      publicPortalHost: 'solution24.bitrix24.ru',
    },
  });

  const report = await service.buildReport({
    entityTypeId: 184,
    itemId: 123,
    filters: {
      periodPreset: 'allTime',
      completionPreset: 'custom',
      completionFrom: '2026-06-10',
      completionTo: '2026-06-20',
    },
  });

  assert.equal(report.header.printCompletionText, '2026-06-10 - 2026-06-20');
});

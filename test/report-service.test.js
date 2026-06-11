const test = require('node:test');
const assert = require('node:assert/strict');
const { createReportService } = require('../src/report/reportService');

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
    async searchTasks() {
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
  });

  const report = await service.buildReport({
    entityTypeId: 184,
    itemId: 123,
    filters: {
      periodFrom: '2026-06-01',
      periodTo: '2026-06-30',
    },
  });

  assert.equal(report.header.objectName, 'Объект А');
  assert.equal(report.header.companyName, 'ООО Ромашка');
  assert.equal(report.header.companyReportName, 'Отчет по сопровождению ООО Ромашка');
  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].positionName, 'Позиция');
  assert.equal(report.totals.plannedText, '1:00');
});

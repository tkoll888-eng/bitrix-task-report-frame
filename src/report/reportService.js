const { findFieldCodeByTitle } = require('../vibecodeClient');
const { normalizeFilters, applyClientFilters } = require('./filters');
const { mapTaskToRow, calculateTotals } = require('./taskMapper');

function buildCompanyReportName(companyName) {
  return companyName ? `Отчет по сопровождению ${companyName}` : 'Отчет по сопровождению';
}

function createTaskSearchBody(entityTypeId, itemId) {
  return {
    filter: {
      crmBinding: {
        entityTypeId: Number(entityTypeId),
        entityId: Number(itemId),
      },
    },
    sort: '-changedDate',
    limit: 500,
  };
}

function createReportService({ client, config }) {
  async function resolvePositionFieldCode() {
    if (config.taskPositionFieldCode) {
      return config.taskPositionFieldCode;
    }

    const fields = await client.getTaskFields();
    return findFieldCodeByTitle(fields, config.taskPositionFieldName);
  }

  async function buildReport({ entityTypeId, itemId, filters: rawFilters }) {
    const filters = normalizeFilters(rawFilters);
    const [item, positionFieldCode] = await Promise.all([
      client.getItem(Number(entityTypeId), Number(itemId)),
      resolvePositionFieldCode(),
    ]);

    let company = null;
    if (item.companyId) {
      company = await client.getCompany(item.companyId);
    }

    const tasks = await client.searchTasks(createTaskSearchBody(entityTypeId, itemId));
    const rows = tasks.map((task) => mapTaskToRow(task, {
      portalHost: config.publicPortalHost,
      positionFieldCode,
    }));
    const filteredRows = applyClientFilters(rows, filters);

    const companyName = company?.title || company?.name || '';

    return {
      header: {
        entityTypeId: Number(entityTypeId),
        itemId: Number(itemId),
        objectName: item.title || `Элемент ${itemId}`,
        companyName: companyName || 'не указана',
        companyReportName: buildCompanyReportName(companyName),
        periodText: `${filters.periodFrom} - ${filters.periodTo}`,
      },
      filters,
      rows: filteredRows,
      totals: calculateTotals(filteredRows),
      meta: {
        positionFieldCode,
      },
    };
  }

  return { buildReport };
}

module.exports = { createReportService, createTaskSearchBody, buildCompanyReportName };

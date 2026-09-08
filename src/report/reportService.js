const { findFieldCodeByTitle } = require('../vibecodeClient');
const { normalizeFilters, applyClientFilters } = require('./filters');
const { mapTaskToRow, calculateTotals } = require('./taskMapper');
const { formatSeconds } = require('./time');

function buildCompanyReportName(companyName) {
  return companyName ? `Отчет по сопровождению ${companyName}` : 'Отчет по сопровождению';
}

function createTaskSearchBody(entityTypeId, itemId) {
  const crmBindingCode = `T${Number(entityTypeId).toString(16)}_${Number(itemId)}`;

  return {
    filter: {
      UF_CRM_TASK: crmBindingCode,
    },
    sort: '-changedDate',
    limit: 500,
  };
}

function formatCompletionText(filters) {
  if (!filters.completionFrom && !filters.completionTo) {
    return 'Не учитывать';
  }

  return `${filters.completionFrom || '...'} - ${filters.completionTo || '...'}`;
}

function capitalizeFirst(value) {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatMonthYear(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (!match) {
    return value || '';
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  const formatted = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
  }).format(date);

  return capitalizeFirst(formatted.replace(/\s*г\.$/, ''));
}

function formatPrintCompletionText(filters) {
  if (filters.completionPreset === 'allTime') {
    return 'Не учитывать';
  }

  if (filters.completionPreset === 'currentMonth' || filters.completionPreset === 'previousMonth') {
    return formatMonthYear(filters.completionFrom);
  }

  return `${filters.completionFrom || '...'} - ${filters.completionTo || '...'}`;
}

function collectAvailableTags(rows) {
  const firstByKey = new Map();

  rows.forEach((row) => {
    (row.tags || []).forEach((tag) => {
      const trimmed = String(tag || '').trim();
      if (!trimmed) {
        return;
      }

      const key = trimmed.toLowerCase();
      if (!firstByKey.has(key)) {
        firstByKey.set(key, trimmed);
      }
    });
  });

  return Array.from(firstByKey.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map((entry) => entry[1]);
}

function createReportService({ client, config, now = () => new Date() }) {
  async function resolvePositionFieldCode(requestOptions = {}) {
    if (config.taskPositionFieldCode) {
      return config.taskPositionFieldCode;
    }

    const fields = await client.getTaskFields(requestOptions);
    return findFieldCodeByTitle(fields, config.taskPositionFieldName);
  }

  async function buildReport({ entityTypeId, itemId, filters: rawFilters, authorization }) {
    const filters = normalizeFilters(rawFilters, now());
    const requestOptions = authorization ? { authorization } : {};
    const [item, positionFieldCode] = await Promise.all([
      client.getItem(Number(entityTypeId), Number(itemId), requestOptions),
      resolvePositionFieldCode(requestOptions),
    ]);

    let company = null;
    if (item.companyId) {
      company = await client.getCompany(item.companyId, requestOptions);
    }

    const tasks = await client.searchTasks(createTaskSearchBody(entityTypeId, itemId), requestOptions);
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
        printCompletionText: formatPrintCompletionText(filters),
        completionText: formatCompletionText(filters),
      },
      filters,
      rows: filteredRows,
      totals: calculateTotals(filteredRows),
      meta: {
        positionFieldCode,
        availableTags: collectAvailableTags(rows),
      },
    };
  }

  async function updateTaskPlannedTime({ taskId, plannedSeconds, authorization }) {
    await client.updateTask(Number(taskId), { timeEstimate: plannedSeconds }, { authorization });
    return {
      taskId: Number(taskId),
      plannedSeconds,
      plannedText: formatSeconds(plannedSeconds),
    };
  }

  return { buildReport, updateTaskPlannedTime };
}

module.exports = {
  createReportService,
  createTaskSearchBody,
  buildCompanyReportName,
  collectAvailableTags,
};

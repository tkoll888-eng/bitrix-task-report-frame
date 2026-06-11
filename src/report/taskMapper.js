const { getStatusLabel } = require('./statuses');
const { formatSeconds } = require('./time');

function formatDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function parseTags(value) {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  return String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function buildTaskUrl(portalHost, taskId) {
  return `https://${portalHost}/company/personal/user/0/tasks/task/view/${taskId}/`;
}

function mapTaskToRow(task, options) {
  const positionFieldCode = options.positionFieldCode;
  const plannedSeconds = Number(task.timeEstimate || 0);
  const spentSeconds = Number(task.timeSpentInLogs || task.timeSpent || task.durationFact || 0);

  return {
    id: Number(task.id),
    title: task.title || '',
    titleUrl: buildTaskUrl(options.portalHost, task.id),
    status: Number(task.status || 0),
    statusLabel: getStatusLabel(task.status),
    createdDate: task.createdDate || '',
    changedDate: task.changedDate || '',
    closedDate: task.closedDate || '',
    deadline: task.deadline || '',
    createdDateText: formatDate(task.createdDate),
    closedDateText: formatDate(task.closedDate),
    deadlineText: formatDate(task.deadline),
    plannedSeconds,
    spentSeconds,
    plannedText: formatSeconds(plannedSeconds),
    spentText: formatSeconds(spentSeconds),
    positionName: positionFieldCode ? String(task[positionFieldCode] || '') : '',
    tags: parseTags(task.tags),
  };
}

function calculateTotals(rows) {
  const plannedSeconds = rows.reduce((sum, row) => sum + Number(row.plannedSeconds || 0), 0);
  const spentSeconds = rows.reduce((sum, row) => sum + Number(row.spentSeconds || 0), 0);

  return {
    plannedSeconds,
    spentSeconds,
    plannedText: formatSeconds(plannedSeconds),
    spentText: formatSeconds(spentSeconds),
  };
}

module.exports = { mapTaskToRow, calculateTotals, formatDate, parseTags, buildTaskUrl };

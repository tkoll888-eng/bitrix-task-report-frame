const TASK_STATUSES = [
  { value: 2, label: 'Ждет выполнения' },
  { value: 3, label: 'В работе' },
  { value: 4, label: 'Ждет контроля' },
  { value: 5, label: 'Завершена' },
  { value: 6, label: 'Отложена' },
];

function getStatusLabel(value) {
  return TASK_STATUSES.find((status) => status.value === Number(value))?.label || `Статус ${value}`;
}

function parseStatusList(value) {
  const raw = Array.isArray(value) ? value : String(value || '').split(',');
  return raw.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0);
}

module.exports = { TASK_STATUSES, getStatusLabel, parseStatusList };

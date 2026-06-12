const TASK_STATUSES = [
  { value: 2, label: 'Ждёт выполнения' },
  { value: 3, label: 'Выполняется' },
  { value: 4, label: 'Ожидает контроля' },
  { value: 5, label: 'Завершена' },
  { value: 6, label: 'Отложена' },
  { value: 7, label: 'Отклонена' },
];

function getStatusLabel(value) {
  return TASK_STATUSES.find((status) => status.value === Number(value))?.label || `Статус ${value}`;
}

function parseStatusList(value) {
  const raw = Array.isArray(value) ? value : String(value || '').split(',');
  return raw.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0);
}

module.exports = { TASK_STATUSES, getStatusLabel, parseStatusList };

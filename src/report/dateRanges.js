function toDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentMonthRange(now = new Date()) {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toDateOnly(from), to: toDateOnly(to) };
}

function getPreviousMonthRange(now = new Date()) {
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 0);
  return { from: toDateOnly(from), to: toDateOnly(to) };
}

function getWeekRange(offsetWeeks, now = new Date()) {
  const day = now.getDay() || 7;
  const from = new Date(now);
  from.setDate(now.getDate() - day + 1 + (offsetWeeks * 7));
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  return { from: toDateOnly(from), to: toDateOnly(to) };
}

function getCompletionRange(kind, now = new Date()) {
  if (kind === 'allTime') {
    return { from: '', to: '' };
  }

  if (kind === 'today') {
    return { from: toDateOnly(now), to: toDateOnly(now) };
  }

  if (kind === 'week') {
    return getWeekRange(0, now);
  }

  if (kind === 'previousWeek') {
    return getWeekRange(-1, now);
  }

  if (kind === 'month') {
    return getCurrentMonthRange(now);
  }

  if (kind === 'previousMonth') {
    return getPreviousMonthRange(now);
  }

  return { from: '', to: '' };
}

module.exports = {
  toDateOnly,
  getCurrentMonthRange,
  getPreviousMonthRange,
  getWeekRange,
  getCompletionRange,
};

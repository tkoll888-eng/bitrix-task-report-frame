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

function getCompletionRange(kind, now = new Date()) {
  if (kind === 'today') {
    return { from: toDateOnly(now), to: toDateOnly(now) };
  }

  if (kind === 'week') {
    const day = now.getDay() || 7;
    const from = new Date(now);
    from.setDate(now.getDate() - day + 1);
    const to = new Date(from);
    to.setDate(from.getDate() + 6);
    return { from: toDateOnly(from), to: toDateOnly(to) };
  }

  if (kind === 'month') {
    return getCurrentMonthRange(now);
  }

  return { from: '', to: '' };
}

module.exports = { toDateOnly, getCurrentMonthRange, getCompletionRange };

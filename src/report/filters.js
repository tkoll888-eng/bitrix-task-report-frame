const { getCurrentMonthRange, getCompletionRange } = require('./dateRanges');
const { parseStatusList } = require('./statuses');

function dateOnly(value) {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return String(value).slice(0, 10);
}

function inRange(value, from, to) {
  const date = dateOnly(value);
  if (!date) {
    return false;
  }

  if (from && date < from) {
    return false;
  }

  if (to && date > to) {
    return false;
  }

  return true;
}

function normalizeFilters(input = {}, now = new Date()) {
  const periodPreset = input.periodPreset || 'allTime';
  const completionPreset = input.completionPreset || 'allTime';
  const periodRange = getPresetRange(periodPreset, input.periodFrom, input.periodTo, now);
  const completionRange = getPresetRange(
    completionPreset,
    input.completionFrom,
    input.completionTo,
    now,
  );

  return {
    periodPreset,
    periodFrom: periodRange.from,
    periodTo: periodRange.to,
    tagContains: String(input.tagContains || '').trim().toLowerCase(),
    tags: normalizeTagList(input.tags),
    completionPreset,
    completionFrom: completionRange.from,
    completionTo: completionRange.to,
    statuses: parseStatusList(input.statuses),
  };
}

function normalizeTagList(value) {
  const rawValues = Array.isArray(value)
    ? value
    : String(value || '')
      .split(',');

  return rawValues
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean);
}

function getPresetRange(preset, from, to, now) {
  if (preset === 'allTime') {
    return { from: '', to: '' };
  }

  if (preset === 'custom') {
    return {
      from: from || '',
      to: to || '',
    };
  }

  if (preset === 'currentWeek') {
    return getCompletionRange('week', now);
  }

  if (preset === 'previousWeek') {
    return getCompletionRange('previousWeek', now);
  }

  if (preset === 'today') {
    return getCompletionRange('today', now);
  }

  if (preset === 'previousMonth') {
    return getCompletionRange('previousMonth', now);
  }

  const month = getCurrentMonthRange(now);
  return month;
}

function applyClientFilters(rows, filters) {
  return rows.filter((row) => {
    const activeInPeriod =
      inRange(row.createdDate, filters.periodFrom, filters.periodTo) ||
      inRange(row.changedDate, filters.periodFrom, filters.periodTo);

    if (!activeInPeriod) {
      return false;
    }

    if (filters.tagContains) {
      const hasTag = row.tags.some((tag) => tag.toLowerCase().includes(filters.tagContains));
      if (!hasTag) {
        return false;
      }
    }

    if (filters.tags.length > 0) {
      const hasSelectedTag = row.tags.some((tag) => {
        const normalizedTag = tag.toLowerCase();
        return filters.tags.some((selectedTag) => normalizedTag.includes(selectedTag));
      });

      if (!hasSelectedTag) {
        return false;
      }
    }

    if (filters.completionFrom || filters.completionTo) {
      if (!inRange(row.closedDate, filters.completionFrom, filters.completionTo)) {
        return false;
      }
    }

    if (filters.statuses.length > 0 && !filters.statuses.includes(row.status)) {
      return false;
    }

    return true;
  });
}

module.exports = { normalizeFilters, applyClientFilters, inRange, getPresetRange };

function formatSeconds(seconds) {
  const totalMinutes = Math.floor(Number(seconds || 0) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

function parseHoursMinutesToSeconds(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) {
    throw new Error('Time value is required');
  }

  if (raw.includes('-')) {
    throw new Error('Time value must not be negative');
  }

  const normalized = raw
    .replace(/[чh]/g, ':')
    .replace(/[мm]/g, '')
    .replace(/\s+/g, ':')
    .replace(/:+/g, ':')
    .replace(/^:/, '')
    .replace(/:$/, '');
  const parts = normalized.split(':');

  if (parts.length > 2 || parts.some((part) => !/^\d+$/.test(part))) {
    throw new Error('Time value must use hours and minutes');
  }

  const hours = parts.length === 2 ? Number(parts[0]) : 0;
  const minutes = parts.length === 2 ? Number(parts[1]) : Number(parts[0]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    throw new Error('Time value must use hours and minutes');
  }

  if (minutes < 0 || minutes > 59) {
    throw new Error('Time minutes must be from 0 to 59');
  }

  return ((hours * 60) + minutes) * 60;
}

function sumSeconds(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

module.exports = { formatSeconds, parseHoursMinutesToSeconds, sumSeconds };

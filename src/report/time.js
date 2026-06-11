function formatSeconds(seconds) {
  const totalMinutes = Math.floor(Number(seconds || 0) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

function sumSeconds(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

module.exports = { formatSeconds, sumSeconds };

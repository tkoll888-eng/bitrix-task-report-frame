require('dotenv').config();

const express = require('express');
const path = require('node:path');
const { readConfig } = require('./src/config');
const { createVibecodeClient } = require('./src/vibecodeClient');
const { createReportService } = require('./src/report/reportService');
const { createReportRouter } = require('./src/routes/reportRoutes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ success: true, service: 'task-report-frame' });
});

if (process.env.VIBECODE_APP_KEY || process.env.VIBECODE_API_KEY) {
  const config = readConfig();
  const client = createVibecodeClient({
    baseUrl: config.vibecodeApiBase,
    apiKey: config.vibecodeApiKey,
  });
  const reportService = createReportService({ client, config });
  app.use('/api/report', createReportRouter({ reportService }));
}

if (require.main === module) {
  const config = readConfig();
  app.listen(config.port, () => {
    console.log(`Task report frame listening on ${config.port}`);
  });
}

module.exports = { app };

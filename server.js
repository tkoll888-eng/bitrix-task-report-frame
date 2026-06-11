require('dotenv').config();

const express = require('express');
const path = require('node:path');
const { readConfig } = require('./src/config');

const config = readConfig();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ success: true, service: 'task-report-frame' });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Task report frame listening on ${config.port}`);
  });
}

module.exports = { app };

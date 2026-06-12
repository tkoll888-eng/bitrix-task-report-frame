require('dotenv').config();

const { readConfig } = require('../src/config');
const { createVibecodeClient, findFieldCodeByTitle } = require('../src/vibecodeClient');
const { createTaskSearchBody } = require('../src/report/reportService');

async function main() {
  const config = readConfig();
  const entityTypeId = process.argv[2];
  const itemId = process.argv[3];
  const client = createVibecodeClient({
    baseUrl: config.vibecodeApiBase,
    apiKey: config.vibecodeApiKey,
  });

  const fields = await client.getTaskFields();
  const positionCode =
    config.taskPositionFieldCode || findFieldCodeByTitle(fields, config.taskPositionFieldName);

  const result = {
    positionFieldName: config.taskPositionFieldName,
    positionFieldCode: positionCode,
    knownTaskFieldCount: Array.isArray(fields) ? fields.length : Object.keys(fields || {}).length,
  };

  if (entityTypeId && itemId) {
    result.item = await client.getItem(Number(entityTypeId), Number(itemId));
    result.taskSearchBody = createTaskSearchBody(entityTypeId, itemId);
    result.sampleTasks = await client.searchTasks(result.taskSearchBody);
    result.sampleTasks = result.sampleTasks.slice(0, 3);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

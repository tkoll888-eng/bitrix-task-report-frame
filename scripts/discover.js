require('dotenv').config();

const { readConfig } = require('../src/config');
const { createVibecodeClient, findFieldCodeByTitle } = require('../src/vibecodeClient');

async function main() {
  const config = readConfig();
  const client = createVibecodeClient({
    baseUrl: config.vibecodeApiBase,
    apiKey: config.vibecodeApiKey,
  });

  const fields = await client.getTaskFields();
  const positionCode =
    config.taskPositionFieldCode || findFieldCodeByTitle(fields, config.taskPositionFieldName);

  console.log(JSON.stringify({
    positionFieldName: config.taskPositionFieldName,
    positionFieldCode: positionCode,
    knownTaskFieldCount: Array.isArray(fields) ? fields.length : Object.keys(fields || {}).length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

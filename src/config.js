function readConfig(env = process.env) {
  const vibecodeApiKey = env.VIBECODE_API_KEY;
  if (!vibecodeApiKey) {
    throw new Error('VIBECODE_API_KEY is required');
  }

  return {
    port: Number(env.PORT || 3000),
    vibecodeApiKey,
    vibecodeApiBase: env.VIBECODE_API_BASE || 'https://vibecode.bitrix24.tech/v1',
    taskPositionFieldName: env.TASK_POSITION_FIELD_NAME || 'Наименование позиции',
    taskPositionFieldCode: env.TASK_POSITION_FIELD_CODE || '',
    publicPortalHost: env.PUBLIC_PORTAL_HOST || 'solution24.bitrix24.ru',
  };
}

module.exports = { readConfig };

function readPositiveInteger(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('PORT must be a positive integer');
  }

  return parsed;
}

function readConfig(env = process.env) {
  const vibecodeAppKey = String(env.VIBECODE_APP_KEY || '').trim();
  const vibecodePersonalApiKey = String(env.VIBECODE_API_KEY || '').trim();
  const vibecodeApiKey = vibecodePersonalApiKey || vibecodeAppKey;
  if (!vibecodeApiKey) {
    throw new Error('VIBECODE_APP_KEY or VIBECODE_API_KEY is required');
  }

  return {
    port: readPositiveInteger(env.PORT, 3000),
    vibecodeApiKey,
    vibecodeAppKey,
    vibecodePersonalApiKey,
    vibecodeApiBase: String(env.VIBECODE_API_BASE || 'https://vibecode.bitrix24.tech/v1').trim(),
    taskPositionFieldName: String(env.TASK_POSITION_FIELD_NAME || 'Наименование позиции').trim(),
    taskPositionFieldCode: String(env.TASK_POSITION_FIELD_CODE || '').trim(),
    publicPortalHost: String(env.PUBLIC_PORTAL_HOST || 'solution24.bitrix24.ru').trim(),
  };
}

module.exports = { readConfig };

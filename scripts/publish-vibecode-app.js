require('dotenv').config();

function buildPublishRequest({ baseUrl, appId, appUrl, entityTypeId }) {
  const placement = `CRM_DYNAMIC_${entityTypeId}_DETAIL_TAB`;

  return {
    placement,
    url: `${baseUrl}/apps/${appId}/publish`,
    body: {
      catalogTitle: 'Отчет по задачам',
      appUrl,
      placements: [placement],
    },
  };
}

function buildBindRequest({ baseUrl, appId, entityTypeId }) {
  const placement = `CRM_DYNAMIC_${entityTypeId}_DETAIL_TAB`;

  return {
    placement,
    url: `${baseUrl}/placements/bind`,
    body: {
      appId,
      placement,
      handler: `${baseUrl}/bitrix-handler`,
      title: 'Отчет по задачам',
      description: 'Отчет по задачам текущего элемента смарт-процесса',
    },
  };
}

async function requestJson(url, apiKey, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(payload?.error?.message || payload?.message || `VibeCode HTTP ${response.status}`);
  }
  return payload;
}

async function main() {
  const appId = process.env.VIBECODE_APP_ID;
  const apiKey = process.env.VIBECODE_APP_KEY || process.env.VIBECODE_API_KEY;
  const appUrl = process.argv[2];
  const entityTypeId = process.argv[3];

  if (!appId || !apiKey || !appUrl || !entityTypeId) {
    throw new Error('Usage: VIBECODE_APP_ID=... VIBECODE_APP_KEY=... node scripts/publish-vibecode-app.js <appUrl> <entityTypeId>');
  }

  const baseUrl = process.env.VIBECODE_API_BASE || 'https://vibecode.bitrix24.tech/v1';
  const request = buildPublishRequest({ baseUrl, appId, appUrl, entityTypeId });
  let result;

  try {
    result = await requestJson(request.url, apiKey, request.body);
  } catch (error) {
    if (!/already published/i.test(error.message)) {
      throw error;
    }
    const bindRequest = buildBindRequest({ baseUrl, appId, entityTypeId });
    result = await requestJson(bindRequest.url, apiKey, bindRequest.body);
  }

  console.log(JSON.stringify({ placement: request.placement, result }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { buildBindRequest, buildPublishRequest, requestJson };

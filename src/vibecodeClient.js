function unwrapResponse(payload) {
  if (payload && payload.success === false) {
    throw new Error(payload.error?.message || payload.message || 'VibeCode API error');
  }

  return payload?.data ?? payload;
}

function formatErrorPayload(payload) {
  const parts = [
    payload?.message,
    payload?.userMessage,
    payload?.error?.message,
    payload?.error?.userMessage,
    payload?.error?.hint,
  ].filter(Boolean);

  const details = payload?.details || payload?.error?.details;
  if (details) {
    parts.push(typeof details === 'string' ? details : JSON.stringify(details));
  }

  return parts.join(' ');
}

async function requestJson(fetchImpl, baseUrl, apiKey, appKey, path, options = {}) {
  const requestApiKey = options.authorization && appKey ? appKey : apiKey;
  const headers = {
    'Content-Type': 'application/json',
    'X-Api-Key': requestApiKey,
    ...(options.authorization ? { Authorization: options.authorization } : {}),
    ...(options.headers || {}),
  };

  const response = await fetchImpl(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json();
  if (!response.ok) {
    const details = formatErrorPayload(payload);
    throw new Error(details
      ? `VibeCode HTTP ${response.status}: ${details}`
      : `VibeCode HTTP ${response.status}`);
  }

  return unwrapResponse(payload);
}

function findFieldCodeByTitle(fields, title) {
  const normalizedTitle = String(title).trim().toLowerCase();
  const list = Array.isArray(fields)
    ? fields
    : fields && typeof fields === 'object' && fields.fields && typeof fields.fields === 'object'
      ? Object.entries(fields.fields).map(([code, meta]) => ({ code, ...meta }))
      : Object.values(fields || {});
  const match = list.find((field) => {
    const fieldTitle = String(field.title || field.name || field.label || '').trim().toLowerCase();
    return fieldTitle === normalizedTitle;
  });

  return match?.code || match?.fieldName || match?.id || '';
}

function createVibecodeClient({ baseUrl, apiKey, appKey = '', fetchImpl = fetch }) {
  return {
    getTaskFields(requestOptions = {}) {
      return requestJson(fetchImpl, baseUrl, apiKey, appKey, '/tasks/fields', requestOptions);
    },
    searchTasks(body, requestOptions = {}) {
      return requestJson(fetchImpl, baseUrl, apiKey, appKey, '/tasks/search', {
        ...requestOptions,
        method: 'POST',
        body,
      });
    },
    getItem(entityTypeId, itemId, requestOptions = {}) {
      return requestJson(fetchImpl, baseUrl, apiKey, appKey, `/items/${entityTypeId}/${itemId}`, requestOptions);
    },
    getCompany(companyId, requestOptions = {}) {
      return requestJson(fetchImpl, baseUrl, apiKey, appKey, `/companies/${companyId}`, requestOptions);
    },
  };
}

module.exports = { createVibecodeClient, findFieldCodeByTitle };

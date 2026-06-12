function unwrapResponse(payload) {
  if (payload && payload.success === false) {
    throw new Error(payload.error?.message || payload.message || 'VibeCode API error');
  }

  return payload?.data ?? payload;
}

async function requestJson(fetchImpl, baseUrl, apiKey, path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Api-Key': apiKey,
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
    throw new Error(payload?.message || `VibeCode HTTP ${response.status}`);
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

function createVibecodeClient({ baseUrl, apiKey, fetchImpl = fetch }) {
  return {
    getTaskFields(requestOptions = {}) {
      return requestJson(fetchImpl, baseUrl, apiKey, '/tasks/fields', requestOptions);
    },
    searchTasks(body, requestOptions = {}) {
      return requestJson(fetchImpl, baseUrl, apiKey, '/tasks/search', {
        ...requestOptions,
        method: 'POST',
        body,
      });
    },
    getItem(entityTypeId, itemId, requestOptions = {}) {
      return requestJson(fetchImpl, baseUrl, apiKey, `/items/${entityTypeId}/${itemId}`, requestOptions);
    },
    getCompany(companyId, requestOptions = {}) {
      return requestJson(fetchImpl, baseUrl, apiKey, `/companies/${companyId}`, requestOptions);
    },
  };
}

module.exports = { createVibecodeClient, findFieldCodeByTitle };

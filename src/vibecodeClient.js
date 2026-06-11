function unwrapResponse(payload) {
  if (payload && payload.success === false) {
    throw new Error(payload.error?.message || payload.message || 'VibeCode API error');
  }

  return payload?.data ?? payload;
}

async function requestJson(fetchImpl, baseUrl, apiKey, path, options = {}) {
  const response = await fetchImpl(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
      ...(options.headers || {}),
    },
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
  const list = Array.isArray(fields) ? fields : Object.values(fields || {});
  const match = list.find((field) => {
    const fieldTitle = String(field.title || field.name || field.label || '').trim().toLowerCase();
    return fieldTitle === normalizedTitle;
  });

  return match?.code || match?.fieldName || match?.id || '';
}

function createVibecodeClient({ baseUrl, apiKey, fetchImpl = fetch }) {
  return {
    getTaskFields() {
      return requestJson(fetchImpl, baseUrl, apiKey, '/tasks/fields');
    },
    searchTasks(body) {
      return requestJson(fetchImpl, baseUrl, apiKey, '/tasks/search', {
        method: 'POST',
        body,
      });
    },
    getItem(entityTypeId, itemId) {
      return requestJson(fetchImpl, baseUrl, apiKey, `/items/${entityTypeId}/${itemId}`);
    },
    getCompany(companyId) {
      return requestJson(fetchImpl, baseUrl, apiKey, `/companies/${companyId}`);
    },
  };
}

module.exports = { createVibecodeClient, findFieldCodeByTitle };

const test = require('node:test');
const assert = require('node:assert/strict');
const { createVibecodeClient, findFieldCodeByTitle } = require('../src/vibecodeClient');

test('findFieldCodeByTitle finds matching field by title or name', () => {
  const fields = [
    { code: 'UF_TASK_1', title: 'Другое поле' },
    { code: 'UF_TASK_POSITION', title: 'Наименование позиции' },
  ];

  assert.equal(findFieldCodeByTitle(fields, 'Наименование позиции'), 'UF_TASK_POSITION');
});

test('client sends X-Api-Key and parses successful response', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      async json() {
        return { success: true, data: [{ id: 1 }] };
      },
    };
  };

  const client = createVibecodeClient({
    baseUrl: 'https://example.test/v1',
    apiKey: 'secret',
    fetchImpl,
  });

  const result = await client.searchTasks({ filter: { id: 1 } });
  assert.deepEqual(result, [{ id: 1 }]);
  assert.equal(calls[0].url, 'https://example.test/v1/tasks/search');
  assert.equal(calls[0].options.headers['X-Api-Key'], 'secret');
});

test('client forwards embedded VibeCode session as Authorization header', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      async json() {
        return { success: true, data: { id: 123 } };
      },
    };
  };

  const client = createVibecodeClient({
    baseUrl: 'https://example.test/v1',
    apiKey: 'app-key',
    fetchImpl,
  });

  const result = await client.getItem(184, 123, {
    authorization: 'Bearer vibe_session_test',
  });

  assert.deepEqual(result, { id: 123 });
  assert.equal(calls[0].options.headers['X-Api-Key'], 'app-key');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer vibe_session_test');
});

test('findFieldCodeByTitle supports VibeCode fields envelope', () => {
  const payload = {
    fields: {
      UF_AUTO_583853685266: {
        type: 'string',
        readonly: false,
        label: 'Наименование позиции',
      },
    },
  };

  assert.equal(findFieldCodeByTitle(payload, 'Наименование позиции'), 'UF_AUTO_583853685266');
});

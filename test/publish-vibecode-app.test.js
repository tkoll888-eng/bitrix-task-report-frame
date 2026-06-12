const test = require('node:test');
const assert = require('node:assert/strict');
const { buildBindRequest, buildPublishRequest } = require('../scripts/publish-vibecode-app');

test('buildPublishRequest creates VibeCode publish request for smart-process detail tab', () => {
  const request = buildPublishRequest({
    baseUrl: 'https://example.test/v1',
    appId: 'app-123',
    appUrl: 'https://your-vibecode-app-url.example',
    entityTypeId: '184',
  });

  assert.equal(request.url, 'https://example.test/v1/apps/app-123/publish');
  assert.deepEqual(request.body, {
    catalogTitle: 'Отчет по задачам',
    appUrl: 'https://your-vibecode-app-url.example',
    placements: ['CRM_DYNAMIC_184_DETAIL_TAB'],
  });
});

test('buildBindRequest creates VibeCode placement bind request for already published app', () => {
  const request = buildBindRequest({
    baseUrl: 'https://example.test/v1',
    appId: 'app-123',
    entityTypeId: '184',
  });

  assert.equal(request.url, 'https://example.test/v1/placements/bind');
  assert.deepEqual(request.body, {
    appId: 'app-123',
    placement: 'CRM_DYNAMIC_184_DETAIL_TAB',
    handler: 'https://example.test/v1/bitrix-handler',
    title: 'Отчет по задачам',
    description: 'Отчет по задачам текущего элемента смарт-процесса',
  });
});

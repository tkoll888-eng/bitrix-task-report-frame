const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');

function loadAppWithoutApiKey() {
  delete process.env.VIBECODE_API_KEY;
  delete process.env.VIBECODE_APP_KEY;
  delete process.env.VIBECODE_ALLOW_PERSONAL_API_KEY;
  delete require.cache[require.resolve('../server')];
  return require('../server').app;
}

function loadAppWithAppKeyOnly() {
  process.env.VIBECODE_API_KEY = '';
  process.env.VIBECODE_APP_KEY = 'vibe_app_test';
  process.env.VIBECODE_ALLOW_PERSONAL_API_KEY = '';
  process.env.VIBECODE_API_BASE = 'https://example.test/v1';
  delete require.cache[require.resolve('../server')];
  return require('../server').app;
}

test('GET /api/health returns service status', async () => {
  const app = loadAppWithoutApiKey();
  const response = await request(app).get('/api/health');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    success: true,
    service: 'task-report-frame',
  });
});

test('GET /api/report route is mounted when only VIBECODE_APP_KEY is configured', async () => {
  const app = loadAppWithAppKeyOnly();
  const response = await request(app).get('/api/report');

  assert.equal(response.status, 401);
  assert.match(response.body.message, /X-Vibe-Authorization/);
});

test('GET / returns compact preview report shell', async () => {
  const app = loadAppWithoutApiKey();
  const response = await request(app).get('/');

  assert.equal(response.status, 200);
  assert.match(response.text, /Период/);
  assert.match(response.text, /Текущий месяц/);
  assert.match(response.text, /Текущая неделя/);
  assert.match(response.text, /Сегодня/);
  assert.match(response.text, /Произвольный период/);
  assert.match(response.text, /type="date"/);
  assert.match(response.text, /data-range-start="period"/);
  assert.match(response.text, /data-range-end="period"/);
  assert.match(response.text, /data-range-start="completion"/);
  assert.match(response.text, /data-range-end="completion"/);
  assert.match(response.text, /data-range-inline="period"/);
  assert.match(response.text, /data-range-inline="completion"/);
  assert.doesNotMatch(response.text, /data-range-summary="period"/);
  assert.doesNotMatch(response.text, /data-range-summary="completion"/);
  assert.match(response.text, />Теги</);
  assert.match(response.text, /id="selectedTags"/);
  assert.match(response.text, /id="tagSearch"/);
  assert.match(response.text, /id="savedTagSetsQuick"/);
  assert.match(response.text, /id="tagSuggestions" class="tag-suggestions" hidden/);
  assert.match(response.text, /id="savedTagSets" class="tag-sets" hidden/);
  assert.match(response.text, /id="refreshReportButton"/);
  assert.match(response.text, /id="statusPicker"/);
  assert.match(response.text, /id="statusPresets"/);
  assert.match(response.text, /В работе/);
  assert.match(response.text, /Закрытые/);
  assert.doesNotMatch(response.text, /id="selectedStatuses"/);
  assert.match(response.text, /id="printMeta"/);
  assert.match(response.text, /<link rel="stylesheet" href="\/styles\.css\?v=/);
  assert.match(response.text, /<script src="https:\/\/api\.bitrix24\.com\/api\/v1\/" async><\/script>/);
  assert.match(response.text, /<script src="\/app\.js\?v=/);
  assert.match(response.headers['cache-control'] || '', /no-store/);
  assert.match(response.text, /Дата завершения/);
  assert.match(response.text, /Печать/);
  assert.match(response.text, /Плановые трудозатраты/);
  assert.match(response.text, /Затраченное время/);
  assert.match(response.text, /Количество задач/);
  assert.match(response.text, /<option value="allTime" selected>За все время<\/option>/);
  assert.match(response.text, /value="allTime" selected>Не учитывать/);
  assert.match(response.text, /data-sort-key="title"/);
  assert.match(response.text, /data-sort-key="spentSeconds"/);
  assert.match(response.text, /id="pagination"/);
  assert.match(response.text, /id="pageSizeSelect"/);
  assert.match(response.text, /value="20" selected/);
  assert.match(response.text, /value="30"/);
  assert.match(response.text, /value="50"/);
  assert.doesNotMatch(response.text, /Наим\./);
  assert.doesNotMatch(response.text, /Наименование позиции/);
  assert.doesNotMatch(response.text, /Задач:/);
  assert.doesNotMatch(response.text, /Отчет по задачам/);
  assert.doesNotMatch(response.text, /Объект/);
  assert.doesNotMatch(response.text, /Компания/);
});

test('main shell contains hidden manual project id field', async () => {
  const app = loadAppWithoutApiKey();
  const response = await request(app).get('/');

  assert.equal(response.status, 200);
  assert.match(response.text, /id="manualProjectField"/);
  assert.match(response.text, /id="manualProjectId"/);
  assert.match(response.text, /ID проекта/);
  assert.match(response.text, /data-manual-project-field/);
});

test('manual project type id is not exposed as a visible control', async () => {
  const app = loadAppWithoutApiKey();
  const response = await request(app).get('/');

  assert.equal(response.status, 200);
  assert.doesNotMatch(response.text, /entityTypeId[^<]*(input|select)/i);
  assert.doesNotMatch(response.text, /Тип смарт-процесса/);
});

test('browser app supports manual project mode without exposing entity type selector', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

  assert.match(appJs, /MANUAL_MODE_ENTITY_TYPE_ID\s*=\s*'184'/);
  assert.match(appJs, /function isManualProjectMode/);
  assert.match(appJs, /function resolveReportContext/);
  assert.match(appJs, /manualProjectId/);
  assert.match(appJs, /Введите ID проекта, чтобы загрузить отчет по задачам\./);
  assert.doesNotMatch(appJs, /Тип смарт-процесса/);
});

test('browser app no longer uses demo rows as missing-context fallback', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

  assert.doesNotMatch(appJs, /Для локальной проверки добавьте в URL параметры/);
  assert.doesNotMatch(appJs, /filterPreviewReport/);
});

test('status message is rendered below filters to avoid layout jump while filtering', async () => {
  const app = loadAppWithoutApiKey();
  const response = await request(app).get('/');

  assert.equal(response.status, 200);

  const toolbarIndex = response.text.indexOf('<div class="toolbar">');
  const messageIndex = response.text.indexOf('<div id="message" class="message" hidden></div>');
  const tableIndex = response.text.indexOf('<div class="table-wrap">');

  assert.notEqual(toolbarIndex, -1);
  assert.notEqual(messageIndex, -1);
  assert.notEqual(tableIndex, -1);
  assert.ok(messageIndex > toolbarIndex);
  assert.ok(messageIndex < tableIndex);
});

test('GET /print.html returns print shell', async () => {
  const app = loadAppWithoutApiKey();
  const response = await request(app).get('/print.html');

  assert.equal(response.status, 200);
  assert.match(response.text, /Печать/);
  assert.match(response.text, /reportMeta/);
  assert.match(response.text, /tableHost/);
  assert.match(response.text, /print\.js/);
  assert.doesNotMatch(response.text, /Наим\./);
  assert.doesNotMatch(response.text, /Наименование позиции/);
  assert.doesNotMatch(response.text, /Обновить/);
  assert.doesNotMatch(response.text, /id="refreshReportButton"/);
  assert.doesNotMatch(response.text, /class="print-actions"/);
});

test('frame actions keep task links safe and print from generated document', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'public', 'styles.css'), 'utf8');

  assert.match(appJs, /sort:\s*\{\s*key:\s*'closedDate',\s*direction:\s*'desc'\s*\}/);
  assert.match(appJs, /if\s*\(\s*key\s*===\s*'closedDate'\s*\)/);
  assert.match(appJs, /return\s+-1/);
  assert.match(appJs, /function openPrintDocument/);
  assert.match(appJs, /printWindow\.print\(\)/);
  assert.doesNotMatch(appJs, /window\.print\(\)/);
  assert.doesNotMatch(appJs, /window\.open\(`\/print\.html/);
  assert.match(appJs, /window\.BX24/);
  assert.match(appJs, /resizeWindow/);
  assert.match(appJs, /FRAME_RESIZE_RETRY_LIMIT/);
  assert.match(appJs, /FRAME_RESIZE_PADDING/);
  assert.match(appJs, /scheduleFrameResize\(attempt \+ 1\)/);
  assert.match(appJs, /link\.target = '_blank'/);
  assert.match(appJs, /link\.rel = 'noopener noreferrer'/);
  assert.doesNotMatch(appJs, /link\.addEventListener\('click'/);
  assert.doesNotMatch(appJs, /openTask\(row, event\)/);
  assert.doesNotMatch(appJs, /navigateToTask\(row\.titleUrl\)/);
  assert.doesNotMatch(appJs, /bx24\.openPath\(path\)/);
  assert.doesNotMatch(appJs, /Bitrix SDK:/);
  assert.doesNotMatch(appJs, /frameDiagnostics/);
  assert.doesNotMatch(appJs, /showFrameDiagnostics/);
  assert.doesNotMatch(appJs, /Resize:/);
  assert.doesNotMatch(appJs, /fit=/);
  assert.doesNotMatch(appJs, /sent=/);
  assert.doesNotMatch(styles, /\.frame-diagnostics/);
  assert.match(styles, /\.task-link[\s\S]*color:\s*var\(--link\)/);
  assert.match(styles, /\.task-link[\s\S]*cursor:\s*pointer/);
  assert.match(styles, /\.toolbar[\s\S]*align-items:\s*center/);
  assert.match(styles, /\.status-picker[\s\S]*position:\s*relative/);
  assert.match(styles, /\.status-picker-menu[\s\S]*position:\s*absolute/);
  assert.match(styles, /\.print-button[\s\S]*height:\s*44px/);
  assert.match(styles, /size:\s*A4 portrait/);
  assert.match(styles, /min-height:\s*calc\(100vh - 12px\)/);
});

test('main table paginates visible rows without changing full report totals', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'public', 'styles.css'), 'utf8');

  assert.match(appJs, /pagination:\s*\{\s*page:\s*1,\s*pageSize:\s*20\s*\}/);
  assert.match(appJs, /PAGE_SIZE_OPTIONS\s*=\s*\[20,\s*30,\s*50\]/);
  assert.match(appJs, /function getPaginatedRows/);
  assert.match(appJs, /\.slice\(startIndex,\s*endIndex\)/);
  assert.match(appJs, /function renderPagination/);
  assert.match(appJs, /function loadReportFromFirstPage/);
  assert.match(appJs, /state\.pagination\.page\s*=\s*1/);
  assert.match(appJs, /pageSizeSelect/);
  assert.match(appJs, /getPaginatedRows\(getSortedRows\(report\.rows \|\| \[\]\)\)/);
  assert.match(styles, /\.pagination-bar/);
  assert.match(styles, /@media print[\s\S]*\.pagination-bar[\s\S]*display:\s*none/);
});

test('print views omit tags and prioritize task title width', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  const printJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'print.js'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'public', 'styles.css'), 'utf8');

  assert.match(appJs, /printCompletionText/);
  assert.match(appJs, /refreshReportButton/);
  assert.match(appJs, /Обновить/);
  assert.match(appJs, /Обновление\.\.\./);
  assert.match(printJs, /printCompletionText/);
  assert.doesNotMatch(printJs, /refreshReportButton/);
  assert.doesNotMatch(printJs, /Обновить/);
  assert.doesNotMatch(printJs, /Обновление\.\.\./);
  assert.match(indexHtml, /<th class="title-cell"><button type="button" class="sort-button" data-sort-key="title">/);
  assert.match(indexHtml, /<th class="tags-cell"><button type="button" class="sort-button" data-sort-key="tags">/);
  assert.doesNotMatch(printJs, /<th>РўРµРіРё<\/th>/);
  assert.doesNotMatch(printJs, /class="tags-cell"/);
  assert.match(styles, /\.print-actions/);
  assert.match(styles, /@media print[\s\S]*\.tags-cell[\s\S]*display:\s*none/);
  assert.match(styles, /@media print[\s\S]*\.title-cell[\s\S]*width:\s*100%/);
});

test('print views hide fact time and rename planned time labels', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  const printJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'print.js'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'public', 'styles.css'), 'utf8');

  assert.match(appJs, /printCompletionText/);
  assert.match(printJs, /printCompletionText/);
  assert.match(printJs, /<th>Время<\/th>/);
  assert.match(printJs, /<span>Трудозатраты<\/span>/);
  assert.doesNotMatch(printJs, /<th>Факт<\/th>/);
  assert.doesNotMatch(printJs, /row\.spentText/);
  assert.doesNotMatch(printJs, /Затраченное время/);
  assert.match(styles, /@media print[\s\S]*\.spent[\s\S]*display:\s*none/);
  assert.match(styles, /@media print[\s\S]*\.screen-planned-label[\s\S]*display:\s*none/);
  assert.match(styles, /@media print[\s\S]*\.print-planned-label[\s\S]*display:\s*inline/);
});

test('print spent total hide rule has priority over totals layout', () => {
  const styles = fs.readFileSync(path.join(__dirname, '..', 'public', 'styles.css'), 'utf8');
  const printMediaIndex = styles.indexOf('@media print');
  const totalsLayoutIndex = styles.indexOf('.totals-item,', printMediaIndex);
  const spentHideIndex = styles.indexOf('.spent-total-item', printMediaIndex);
  const spentHideRule = styles.slice(spentHideIndex, styles.indexOf('}', spentHideIndex) + 1);

  assert.notEqual(printMediaIndex, -1);
  assert.notEqual(totalsLayoutIndex, -1);
  assert.ok(spentHideIndex > totalsLayoutIndex);
  assert.match(spentHideRule, /display:\s*none\s*!important/);
});

test('print header labels project instead of object', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  const printJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'print.js'), 'utf8');

  assert.match(appJs, /'Проект'/);
  assert.doesNotMatch(appJs, /'Объект'/);
  assert.match(printJs, /Проект:/);
  assert.doesNotMatch(printJs, /Объект:/);
});

test('print actions set pdf filename from report before printing', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  const printJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'print.js'), 'utf8');

  assert.match(appJs, /function buildPrintDocumentTitle/);
  assert.match(appJs, /function buildPrintDocumentHtml/);
  assert.match(appJs, /function openPrintDocument/);
  assert.match(appJs, /window\.open\('', '_blank'\)/);
  assert.match(appJs, /printWindow\.document\.write\(buildPrintDocumentHtml\(state\.report\)\)/);
  assert.match(appJs, /printWindow\.print\(\)/);
  assert.match(appJs, /document\.title\s*=\s*buildPrintDocumentTitle\(report\)/);
  assert.match(appJs, /document\.title\s*=\s*buildPrintDocumentTitle\(state\.report\)/);
  assert.doesNotMatch(appJs, /window\.print\(\)/);
  assert.doesNotMatch(appJs, /document\.title\s*=\s*previousTitle/);
  assert.match(printJs, /function buildPrintDocumentTitle/);
  assert.match(printJs, /document\.title\s*=\s*buildPrintDocumentTitle\(report\)/);
  assert.match(printJs, /document\.title\s*=\s*buildPrintDocumentTitle\(currentReport\)/);
});


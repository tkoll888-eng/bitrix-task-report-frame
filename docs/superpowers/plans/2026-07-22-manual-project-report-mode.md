# Manual Project Report Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual `ID проекта` mode for app openings without smart-process context, while preserving current behavior inside smart-process cards.

**Architecture:** Keep `/api/report` unchanged: it still requires `entityTypeId` and `itemId`. Detect missing `itemId` on the frontend, show a manual project field, and build report queries with internal fixed `entityTypeId=184` plus the user-entered `itemId`. Do not expose `entityTypeId` in the UI.

**Tech Stack:** Node.js 20, Express, static HTML/CSS/JavaScript, `node:test`, `supertest`.

## Global Constraints

- Create commits only when the user explicitly asks for a commit.
- Do not create automatic "checkpoint" or "cleanup" commits.
- If behavior, UX, constraints, errors, fallbacks, or documented limitations change, update the relevant spec in the same work pass.
- `entityTypeId=184` is internal code behavior only; do not show or edit it in the frontend.
- If no `itemId` is available, do not load `/api/report` until the user enters `ID проекта`.
- The manual mode must work locally at `http://localhost:<port>/`.
- The existing contextual mode must keep working at `http://localhost:<port>/?entityTypeId=184&itemId=<id>`.

---

## File Structure

- Modify `src/frontend/appState.js`: add manual-mode helpers used by tests and mirrored in browser code.
- Modify `test/frontend-app.test.js`: cover manual-mode query and no-load decision.
- Modify `public/index.html`: add the hidden manual project filter field.
- Modify `public/styles.css`: make the extra field fit the existing compact toolbar.
- Modify `public/app.js`: implement runtime manual mode, empty state, query construction, refresh/print behavior.
- Modify `test/ui-shell.test.js`: cover shell markup and browser-code strings for manual mode.
- Keep `src/routes/reportRoutes.js` unchanged except tests continue proving `/api/report` requires both IDs.
- Keep `docs/superpowers/specs/2026-07-22-manual-project-report-mode.ru.md` aligned if implementation details change.

---

### Task 1: Add Tested Frontend State Helpers

**Files:**
- Modify: `src/frontend/appState.js`
- Modify: `test/frontend-app.test.js`

**Interfaces:**
- Produces: `MANUAL_MODE_ENTITY_TYPE_ID: '184'`
- Produces: `isManualProjectMode(context: object): boolean`
- Produces: `resolveReportContext({ context, manualProjectId }): { entityTypeId: string, itemId: string } | null`
- Consumes: existing `readContextFromSearch(search)` and `buildReportQuery({ context, filters })`

- [ ] **Step 1: Write failing tests**

Add these tests to `test/frontend-app.test.js` after the context-reading tests:

```js
const {
  readContextFromSearch,
  buildReportQuery,
  isManualProjectMode,
  resolveReportContext,
  MANUAL_MODE_ENTITY_TYPE_ID,
} = require('../src/frontend/appState');

test('manual mode is active when smart-process item id is missing', () => {
  assert.equal(isManualProjectMode({}), true);
  assert.equal(isManualProjectMode({ entityTypeId: '184' }), true);
  assert.equal(isManualProjectMode({ entityTypeId: '184', itemId: '123' }), false);
});

test('resolveReportContext waits for manual project id before loading report', () => {
  assert.equal(resolveReportContext({ context: {}, manualProjectId: '' }), null);
  assert.equal(resolveReportContext({ context: {}, manualProjectId: '   ' }), null);
});

test('resolveReportContext uses internal smart-process type for manual project id', () => {
  assert.deepEqual(
    resolveReportContext({ context: {}, manualProjectId: '777' }),
    { entityTypeId: MANUAL_MODE_ENTITY_TYPE_ID, itemId: '777' },
  );
});

test('resolveReportContext preserves placement or URL context when item id exists', () => {
  assert.deepEqual(
    resolveReportContext({
      context: { entityTypeId: '184', itemId: '123' },
      manualProjectId: '777',
    }),
    { entityTypeId: '184', itemId: '123' },
  );
});
```

Then update the existing import at the top of the file instead of keeping the old destructuring line.

- [ ] **Step 2: Run the focused tests and verify failure**

Run:

```powershell
node --test test/frontend-app.test.js
```

Expected: fails because `isManualProjectMode`, `resolveReportContext`, or `MANUAL_MODE_ENTITY_TYPE_ID` is not exported.

- [ ] **Step 3: Implement minimal helpers**

Update `src/frontend/appState.js`:

```js
const MANUAL_MODE_ENTITY_TYPE_ID = '184';

function isManualProjectMode(context = {}) {
  return !context.itemId;
}

function resolveReportContext({ context = {}, manualProjectId = '' }) {
  if (context.entityTypeId && context.itemId) {
    return {
      entityTypeId: String(context.entityTypeId),
      itemId: String(context.itemId),
    };
  }

  const normalizedManualProjectId = String(manualProjectId || '').trim();
  if (!normalizedManualProjectId) {
    return null;
  }

  return {
    entityTypeId: MANUAL_MODE_ENTITY_TYPE_ID,
    itemId: normalizedManualProjectId,
  };
}
```

Keep the existing `readContextFromSearch` and `buildReportQuery` functions. Update the export:

```js
module.exports = {
  MANUAL_MODE_ENTITY_TYPE_ID,
  readContextFromSearch,
  buildReportQuery,
  isManualProjectMode,
  resolveReportContext,
};
```

- [ ] **Step 4: Run focused tests and verify pass**

Run:

```powershell
node --test test/frontend-app.test.js
```

Expected: all tests in `test/frontend-app.test.js` pass.

- [ ] **Step 5: Check diff**

Run:

```powershell
git diff -- src\frontend\appState.js test\frontend-app.test.js
```

Expected: only helper exports and manual-mode tests changed.

---

### Task 2: Add Manual Project Field to the Shell

**Files:**
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: `test/ui-shell.test.js`

**Interfaces:**
- Consumes: browser code will use `#manualProjectField` and `#manualProjectId`.
- Produces: hidden manual field markup that is shown only by `public/app.js`.

- [ ] **Step 1: Write failing shell tests**

Add tests to `test/ui-shell.test.js`:

```js
test('main shell contains hidden manual project id field', async () => {
  const response = await request(app).get('/');

  assert.equal(response.status, 200);
  assert.match(response.text, /id="manualProjectField"/);
  assert.match(response.text, /id="manualProjectId"/);
  assert.match(response.text, /ID проекта/);
  assert.match(response.text, /data-manual-project-field/);
});

test('manual project type id is not exposed as a visible control', async () => {
  const response = await request(app).get('/');

  assert.equal(response.status, 200);
  assert.doesNotMatch(response.text, /entityTypeId[^<]*(input|select)/i);
  assert.doesNotMatch(response.text, /Тип смарт-процесса/);
});
```

- [ ] **Step 2: Run focused tests and verify failure**

Run:

```powershell
node --test test/ui-shell.test.js
```

Expected: fails because the manual field markup does not exist.

- [ ] **Step 3: Add HTML field**

In `public/index.html`, add this block as the first control inside `<form id="filtersForm" ...>`:

```html
<label id="manualProjectField" class="filter-field filter-field-project" data-manual-project-field hidden>
  <span>ID проекта</span>
  <input id="manualProjectId" type="number" inputmode="numeric" min="1" placeholder="Введите ID">
</label>
```

Do not add any visible `entityTypeId` field.

- [ ] **Step 4: Add compact CSS**

In `public/styles.css`, near the filter-field rules, add:

```css
.filter-field-project {
  min-width: 120px;
}

.filter-field-project input {
  min-width: 120px;
}
```

If the 5-column toolbar becomes too cramped in manual mode, update the grid rule to:

```css
.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 14px;
  align-items: start;
  flex: 1;
}
```

Keep the existing responsive media rules unless visual verification shows overlap.

- [ ] **Step 5: Run focused tests and verify pass**

Run:

```powershell
node --test test/ui-shell.test.js
```

Expected: all tests in `test/ui-shell.test.js` pass.

- [ ] **Step 6: Check diff**

Run:

```powershell
git diff -- public\index.html public\styles.css test\ui-shell.test.js
```

Expected: hidden manual project field, small CSS support, and tests only.

---

### Task 3: Implement Manual Mode in Browser Runtime

**Files:**
- Modify: `public/app.js`
- Modify: `test/ui-shell.test.js`
- Modify: `test/frontend-app.test.js` only if helper interfaces need small alignment

**Interfaces:**
- Consumes: DOM nodes `#manualProjectField`, `#manualProjectId`.
- Produces: `state.isManualMode`, `getEffectiveContext()`, no `/api/report` call until manual ID exists.

- [ ] **Step 1: Write failing runtime-string tests**

Add these assertions to an existing `public/app.js` test in `test/ui-shell.test.js`, or create a new test that reads `public/app.js`:

```js
test('browser app supports manual project mode without exposing entity type selector', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

  assert.match(appJs, /MANUAL_MODE_ENTITY_TYPE_ID\s*=\s*'184'/);
  assert.match(appJs, /function isManualProjectMode/);
  assert.match(appJs, /function resolveReportContext/);
  assert.match(appJs, /manualProjectId/);
  assert.match(appJs, /Введите ID проекта, чтобы загрузить отчет по задачам\./);
  assert.doesNotMatch(appJs, /Тип смарт-процесса/);
});
```

- [ ] **Step 2: Run focused tests and verify failure**

Run:

```powershell
node --test test/ui-shell.test.js
```

Expected: fails because runtime manual-mode functions do not exist.

- [ ] **Step 3: Add runtime state and helpers**

At the top of `public/app.js`, near other constants, add:

```js
const MANUAL_MODE_ENTITY_TYPE_ID = '184';
```

Update `state`:

```js
const state = {
  context: readContext(),
  report: null,
  selectedTags: [],
  availableTags: [],
  savedTagSets: readSavedTagSets(),
  isTagFilterOpen: false,
  isManualMode: false,
  sort: { key: 'closedDate', direction: 'desc' },
  pagination: { page: 1, pageSize: 20 },
};
```

Add helpers after `readContext()`:

```js
function isManualProjectMode(context) {
  return !context.itemId;
}

function readManualProjectId() {
  const input = document.getElementById('manualProjectId');
  return input ? String(input.value || '').trim() : '';
}

function resolveReportContext(context, manualProjectId) {
  if (context.entityTypeId && context.itemId) {
    return {
      entityTypeId: String(context.entityTypeId),
      itemId: String(context.itemId),
    };
  }

  const normalizedManualProjectId = String(manualProjectId || '').trim();
  if (!normalizedManualProjectId) {
    return null;
  }

  return {
    entityTypeId: MANUAL_MODE_ENTITY_TYPE_ID,
    itemId: normalizedManualProjectId,
  };
}
```

- [ ] **Step 4: Make query use effective context**

Update `buildQuery()` so it resolves context first:

```js
function buildQuery() {
  const filters = readFilters();
  const reportContext = resolveReportContext(state.context, readManualProjectId()) || {};
  const params = new URLSearchParams({
    entityTypeId: String(reportContext.entityTypeId || ''),
    itemId: String(reportContext.itemId || ''),
    periodPreset: filters.periodPreset,
    tagContains: filters.tagContains,
    completionPreset: filters.completionPreset,
  });

  // keep the existing tag/date/status serialization below this block
}
```

Keep the rest of the function unchanged.

- [ ] **Step 5: Add empty-report rendering helper**

Add near `renderReport(report)`:

```js
function renderEmptyReport() {
  renderReport({
    header: {},
    filters: readFilters(),
    rows: [],
    totals: {
      plannedText: '0:00',
      spentText: '0:00',
    },
  });
  state.report = null;
  setAvailableTags({ rows: [] });
}
```

This keeps totals/table in a consistent empty state while preventing print from treating the empty state as a loaded report.

- [ ] **Step 6: Update loading behavior**

Replace the initial no-context branch in `loadReport()`:

```js
const reportContext = resolveReportContext(state.context, readManualProjectId());
if (!reportContext) {
  renderEmptyReport();
  renderTagFilter();
  showMessage('Введите ID проекта, чтобы загрузить отчет по задачам.');
  scheduleFrameResize();
  return;
}
```

Remove the old preview fallback branch that used `previewReport` for missing `entityTypeId` or `itemId`.

- [ ] **Step 7: Show manual field only in manual mode**

Add:

```js
function syncManualProjectField() {
  state.isManualMode = isManualProjectMode(state.context);
  const field = document.getElementById('manualProjectField');
  if (field) {
    field.hidden = !state.isManualMode;
  }
}

function bindManualProjectField() {
  const input = document.getElementById('manualProjectId');
  if (!input) {
    return;
  }

  input.addEventListener('change', function () {
    loadReportFromFirstPage();
  });

  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      loadReportFromFirstPage();
    }
  });
}
```

Call both during startup before `loadReport()`:

```js
syncManualProjectField();
bindManualProjectField();
```

- [ ] **Step 8: Keep refresh and print behavior safe**

In `refreshReport()`, keep current disabling logic. Because `loadReport()` returns early in empty manual mode, `Обновить` will show the info message and not call the API.

In `printCurrentReport()`, keep:

```js
if (state.report) {
  document.title = buildPrintDocumentTitle(state.report);
  openPrintDocument();
  return;
}

showMessage('Сначала загрузите отчет, затем повторите печать.', 'error');
```

This makes print unavailable until a real report is loaded.

- [ ] **Step 9: Run focused tests**

Run:

```powershell
node --test test/frontend-app.test.js test/ui-shell.test.js
```

Expected: all focused tests pass.

- [ ] **Step 10: Check for removed preview fallback**

Run:

```powershell
rg -n "Для локальной проверки добавьте|previewReport|filterPreviewReport" public\app.js
```

Expected: no old local-preview fallback message remains. `previewReport` and `filterPreviewReport` should be removed if no longer used.

---

### Task 4: Remove Dead Preview Fallback and Align Specs/Tests

**Files:**
- Modify: `public/app.js`
- Modify: `test/ui-shell.test.js`
- Modify: `docs/superpowers/specs/2026-07-22-manual-project-report-mode.ru.md` only if implementation differed

**Interfaces:**
- Consumes: manual empty state from Task 3.
- Produces: no demo data for missing context.

- [ ] **Step 1: Write or update no-preview test**

In `test/ui-shell.test.js`, add:

```js
test('browser app no longer uses demo rows as missing-context fallback', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

  assert.doesNotMatch(appJs, /Для локальной проверки добавьте в URL параметры/);
  assert.doesNotMatch(appJs, /filterPreviewReport/);
});
```

- [ ] **Step 2: Run focused test and verify failure if dead code remains**

Run:

```powershell
node --test test/ui-shell.test.js
```

Expected: fails if old preview fallback still exists.

- [ ] **Step 3: Remove old fallback code**

From `public/app.js`, remove unused pieces if Task 3 did not already remove them:

```js
const previewReport = { ... };
```

and:

```js
function filterPreviewReport(report, filters) { ... }
```

Do not remove `collectAvailableTags`, tag-set helpers, or print helpers.

- [ ] **Step 4: Run focused tests**

Run:

```powershell
node --test test/ui-shell.test.js
```

Expected: all tests in `test/ui-shell.test.js` pass.

- [ ] **Step 5: Verify spec still matches**

Run:

```powershell
rg -n "demo|entityTypeId|локальн|ID проекта|/api/report" docs\superpowers\specs\2026-07-22-manual-project-report-mode.ru.md
```

Expected: spec says no demo rows in manual mode, `entityTypeId=184` is internal, and local verification is required.

---

### Task 5: Full Verification and Local Manual Check

**Files:**
- No planned source edits.
- May inspect: `public/app.js`, `public/index.html`, `docs/superpowers/specs/2026-07-22-manual-project-report-mode.ru.md`

**Interfaces:**
- Consumes: completed Tasks 1-4.
- Produces: verified implementation ready for deployment step.

- [ ] **Step 1: Run full automated test suite**

Run:

```powershell
npm test
```

Expected: `pass 66` or higher, `fail 0`.

- [ ] **Step 2: Start local server**

Run:

```powershell
$env:PORT='3000'; npm start
```

Expected: server logs `Task report frame listening on 3000`.

If port `3000` is occupied, use:

```powershell
$env:PORT='3001'; npm start
```

- [ ] **Step 3: Verify local manual mode in browser**

Open:

```text
http://localhost:3000/
```

Expected:

- field `ID проекта` is visible;
- no demo task rows appear;
- message says `Введите ID проекта, чтобы загрузить отчет по задачам.`;
- before entering an ID, no `/api/report` request is made;
- after entering a real project ID, `/api/report` is called with `entityTypeId=184` and the entered `itemId`;
- filters, sorting, pagination, refresh, and print work after the report is loaded.

- [ ] **Step 4: Verify local contextual mode in browser**

Open:

```text
http://localhost:3000/?entityTypeId=184&itemId=<real-project-id>
```

Expected:

- field `ID проекта` is hidden;
- report loads automatically;
- behavior matches the previous release.

- [ ] **Step 5: Stop local server**

Stop the `npm start` process with `Ctrl+C`.

- [ ] **Step 6: Inspect working tree**

Run:

```powershell
git status --short
git diff --stat
```

Expected: changes are limited to planned files. Do not commit unless the user explicitly asks.

---

## Self-Review

- Spec coverage: manual mode, hidden `entityTypeId=184`, no API load before `ID проекта`, contextual mode preservation, tests, and local verification are covered.
- Placeholder scan: no `TBD`, `TODO`, or "implement later" instructions.
- Type consistency: `MANUAL_MODE_ENTITY_TYPE_ID`, `isManualProjectMode`, and `resolveReportContext` use the same names in tests and implementation.
- Repo constraint alignment: the plan does not ask for commits because repository instructions allow commits only on explicit user request.

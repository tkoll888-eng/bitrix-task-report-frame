# Task Report Frame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a VibeCode/Bitrix24 app that appears as a smart-process detail tab and shows a filtered task report for the current smart-process item.

**Architecture:** A small Node.js app serves an Express backend and static frontend. The backend talks to VibeCode API, normalizes Bitrix24 task/item data, computes totals, and exposes report JSON plus an HTML print view. The frontend reads Bitrix24 placement context when embedded, falls back to `entityTypeId` and `itemId` query parameters locally, renders filters/table/totals, and opens the print page with the same filters.

**Tech Stack:** Node.js 20, Express, dotenv, native `fetch`, native `node:test`, static HTML/CSS/JavaScript, VibeCode API, VibeCode app publishing, Bitrix24 smart-process placement `CRM_DYNAMIC_XXX_DETAIL_TAB`.

**Execution order adjustment:** Build a previewable embedded frontend shell immediately after scaffolding so the user can see the report UI early. It is acceptable for that early shell to use mocked data or a stub route first, then wire it to the real report service, filters, and print flow in later tasks.

---

## References

- Spec: `docs/superpowers/specs/2026-06-03-task-report-frame-design.ru.md`
- VibeCode OpenAPI snapshot: `openapi.json`
- VibeCode Quickstart: embedded Bitrix24 apps require an authorization key (`vibe_app_...`).
- VibeCode keys/auth docs: embedded Black Hole requests receive `X-Vibe-Authorization: Bearer vibe_session_...`; the backend forwards it to VibeCode API as `Authorization: Bearer ...`.
- VibeCode apps docs: publish an app through `POST /v1/apps/:id/publish`; dynamic smart-process placement codes such as `CRM_DYNAMIC_<entityTypeId>_DETAIL_TAB` are supported.

## File Structure

- Create: `package.json` — scripts, dependencies, test commands.
- Create: `.env.example` — documented environment variables without secrets.
- Create: `.gitignore` — ignore `node_modules`, `.env`, archives, logs.
- Create: `server.js` — Express app bootstrap and static file serving.
- Create: `src/config.js` — environment parsing and defaults.
- Create: `src/vibecodeClient.js` — VibeCode HTTP client.
- Create: `src/report/statuses.js` — Bitrix task status labels and API values.
- Create: `src/report/dateRanges.js` — current month and completion quick ranges.
- Create: `src/report/time.js` — seconds/minutes to `H:MM`, total helpers.
- Create: `src/report/taskMapper.js` — raw task to report row normalization.
- Create: `src/report/filters.js` — filter parsing and in-memory predicates.
- Create: `src/report/reportService.js` — loads item, company, fields, tasks, totals.
- Create: `src/routes/reportRoutes.js` — `/api/report`, `/api/report/print-data`.
- Create: `public/index.html` — embedded app shell.
- Create: `public/print.html` — print shell.
- Create: `public/styles.css` — report/table/print CSS.
- Create: `public/app.js` — frontend state, placement context, report rendering.
- Create: `public/print.js` — print page rendering.
- Create: `scripts/discover.js` — diagnostic script for task fields and task binding format.
- Create: `scripts/deploy-vibecode.ps1` — archive and deploy to VibeCode server.
- Create: `scripts/publish-vibecode-app.js` — publish the VibeCode app with smart-process placements after deploy.
- Create: `test/*.test.js` — unit and route tests.

## External Contracts

- VibeCode API base URL: `https://vibecode.bitrix24.tech/v1`.
- Auth header: `X-Api-Key`.
- Embedded gateway session header: `X-Vibe-Authorization: Bearer vibe_session_...`.
- Forwarded VibeCode app request header: `Authorization: Bearer vibe_session_...`.
- Task search endpoint: `POST /v1/tasks/search`.
- Task fields endpoint: `GET /v1/tasks/fields`.
- Smart-process item endpoint: `GET /v1/items/{entityTypeId}/{id}`.
- Company endpoint: `GET /v1/companies/{id}` when `companyId` exists.
- Deploy endpoint: `POST /v1/infra/servers/{id}/deploy`.
- App publish endpoint: `POST /v1/apps/{id}/publish`.
- Placement code after deploy: `CRM_DYNAMIC_${entityTypeId}_DETAIL_TAB`.
- Direct Bitrix24 incoming webhook `placement.bind` is not the primary installation path for this project.

## Current VibeCode Adjustment

The original plan used direct Bitrix24 `placement.bind`. After checking the VibeCode documentation, the active implementation path is:

1. Use `VIBECODE_API_KEY` (`vibe_api_...`) for local server-to-server checks and discovery.
2. Add `VIBECODE_APP_KEY` (`vibe_app_...`) for embedded Bitrix24 app mode.
3. Let VibeCode Gateway inject `X-Vibe-Authorization` when the app is opened inside Bitrix24.
4. Forward that value to VibeCode API as `Authorization: Bearer ...` together with `X-Api-Key: <VIBECODE_APP_KEY>`.
5. Replace the old placement binding script with a VibeCode app publish script that calls `POST /v1/apps/:id/publish` and sends `placements: ["CRM_DYNAMIC_<entityTypeId>_DETAIL_TAB"]`.

## Task 1: Scaffold Node App

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `server.js`
- Create: `src/config.js`
- Test: `test/config.test.js`

- [x] **Step 1: Write config test**

Create `test/config.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { readConfig } = require('../src/config');

test('readConfig returns defaults and required values', () => {
  const config = readConfig({
    VIBECODE_API_KEY: 'test-key',
    PORT: '4100',
    VIBECODE_API_BASE: 'https://example.test/v1',
  });

  assert.equal(config.port, 4100);
  assert.equal(config.vibecodeApiKey, 'test-key');
  assert.equal(config.vibecodeApiBase, 'https://example.test/v1');
  assert.equal(config.taskPositionFieldName, 'Наименование позиции');
});

test('readConfig fails when VIBECODE_API_KEY is missing', () => {
  assert.throws(() => readConfig({}), /VIBECODE_API_KEY/);
});
```

- [x] **Step 2: Run failing test**

Run: `npm test -- test/config.test.js`

Expected: fails because `package.json` and `src/config.js` do not exist yet.

- [x] **Step 3: Create project scaffold**

Create `package.json`:

```json
{
  "name": "bitrix-task-report-frame",
  "version": "0.1.0",
  "private": true,
  "description": "Bitrix24 smart-process task report frame",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js",
    "test": "node --test",
    "discover": "node scripts/discover.js"
  },
  "dependencies": {
    "dotenv": "^16.4.7",
    "express": "^4.21.2"
  },
  "devDependencies": {
    "supertest": "^7.0.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

Create `.env.example`:

```text
VIBECODE_API_KEY=
VIBECODE_API_BASE=https://vibecode.bitrix24.tech/v1
PORT=3000
TASK_POSITION_FIELD_NAME=Наименование позиции
TASK_POSITION_FIELD_CODE=
PUBLIC_PORTAL_HOST=solution24.bitrix24.ru
```

Create `.gitignore`:

```text
node_modules/
.env
*.log
*.tar.gz
openapi.json
```

Create `src/config.js`:

```js
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
```

Create `server.js`:

```js
require('dotenv').config();

const express = require('express');
const path = require('node:path');
const { readConfig } = require('./src/config');

const config = readConfig();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ success: true, service: 'task-report-frame' });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Task report frame listening on ${config.port}`);
  });
}

module.exports = { app };
```

- [x] **Step 4: Install dependencies and run test**

Run: `npm install`

Expected: `package-lock.json` is created.

Run: `npm test -- test/config.test.js`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example .gitignore server.js src/config.js test/config.test.js
git commit -m "chore: scaffold task report app"
```

## Task 2: Add Date, Time, and Status Utilities

**Files:**
- Create: `src/report/statuses.js`
- Create: `src/report/dateRanges.js`
- Create: `src/report/time.js`
- Test: `test/report-utils.test.js`

- [x] **Step 1: Write utility tests**

Create `test/report-utils.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { TASK_STATUSES, getStatusLabel, parseStatusList } = require('../src/report/statuses');
const { formatSeconds, sumSeconds } = require('../src/report/time');
const { getCurrentMonthRange, getCompletionRange } = require('../src/report/dateRanges');

test('status labels match Bitrix24 interface names', () => {
  assert.equal(getStatusLabel(2), 'Ждет выполнения');
  assert.equal(getStatusLabel(3), 'В работе');
  assert.equal(getStatusLabel(4), 'Ждет контроля');
  assert.equal(getStatusLabel(5), 'Завершена');
  assert.equal(getStatusLabel(6), 'Отложена');
  assert.equal(TASK_STATUSES.length, 5);
});

test('parseStatusList supports multi-select query values', () => {
  assert.deepEqual(parseStatusList('3,4,5'), [3, 4, 5]);
  assert.deepEqual(parseStatusList(['3', '5']), [3, 5]);
  assert.deepEqual(parseStatusList(''), []);
});

test('time helpers format seconds as H:MM', () => {
  assert.equal(formatSeconds(0), '0:00');
  assert.equal(formatSeconds(900), '0:15');
  assert.equal(formatSeconds(5850), '1:37');
  assert.equal(sumSeconds([{ value: 60 }, { value: 120 }], 'value'), 180);
});

test('current month range uses local month boundaries', () => {
  const range = getCurrentMonthRange(new Date('2026-06-04T10:00:00+02:00'));
  assert.equal(range.from, '2026-06-01');
  assert.equal(range.to, '2026-06-30');
});

test('completion quick ranges are stable', () => {
  assert.deepEqual(getCompletionRange('today', new Date('2026-06-04T10:00:00+02:00')), {
    from: '2026-06-04',
    to: '2026-06-04',
  });
  assert.deepEqual(getCompletionRange('week', new Date('2026-06-04T10:00:00+02:00')), {
    from: '2026-06-01',
    to: '2026-06-07',
  });
  assert.deepEqual(getCompletionRange('month', new Date('2026-06-04T10:00:00+02:00')), {
    from: '2026-06-01',
    to: '2026-06-30',
  });
});
```

- [x] **Step 2: Run failing test**

Run: `npm test -- test/report-utils.test.js`

Expected: FAIL because utility modules do not exist.

- [x] **Step 3: Implement utilities**

Create `src/report/statuses.js`:

```js
const TASK_STATUSES = [
  { value: 2, label: 'Ждет выполнения' },
  { value: 3, label: 'В работе' },
  { value: 4, label: 'Ждет контроля' },
  { value: 5, label: 'Завершена' },
  { value: 6, label: 'Отложена' },
];

function getStatusLabel(value) {
  return TASK_STATUSES.find((status) => status.value === Number(value))?.label || `Статус ${value}`;
}

function parseStatusList(value) {
  const raw = Array.isArray(value) ? value : String(value || '').split(',');
  return raw.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0);
}

module.exports = { TASK_STATUSES, getStatusLabel, parseStatusList };
```

Create `src/report/time.js`:

```js
function formatSeconds(seconds) {
  const totalMinutes = Math.floor(Number(seconds || 0) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

function sumSeconds(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

module.exports = { formatSeconds, sumSeconds };
```

Create `src/report/dateRanges.js`:

```js
function toDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentMonthRange(now = new Date()) {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toDateOnly(from), to: toDateOnly(to) };
}

function getCompletionRange(kind, now = new Date()) {
  if (kind === 'today') {
    return { from: toDateOnly(now), to: toDateOnly(now) };
  }

  if (kind === 'week') {
    const day = now.getDay() || 7;
    const from = new Date(now);
    from.setDate(now.getDate() - day + 1);
    const to = new Date(from);
    to.setDate(from.getDate() + 6);
    return { from: toDateOnly(from), to: toDateOnly(to) };
  }

  if (kind === 'month') {
    return getCurrentMonthRange(now);
  }

  return { from: '', to: '' };
}

module.exports = { toDateOnly, getCurrentMonthRange, getCompletionRange };
```

- [x] **Step 4: Run utility tests**

Run: `npm test -- test/report-utils.test.js`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/report/statuses.js src/report/time.js src/report/dateRanges.js test/report-utils.test.js
git commit -m "feat: add report utility functions"
```

## Task 3: Normalize Tasks, Tags, and Totals

**Files:**
- Create: `src/report/taskMapper.js`
- Test: `test/task-mapper.test.js`

- [x] **Step 1: Write mapper tests**

Create `test/task-mapper.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { mapTaskToRow, calculateTotals } = require('../src/report/taskMapper');

test('mapTaskToRow normalizes task fields for table', () => {
  const row = mapTaskToRow({
    id: 99,
    title: 'Настроить отчет',
    status: 3,
    createdDate: '2026-06-03T09:00:00+02:00',
    changedDate: '2026-06-04T09:00:00+02:00',
    closedDate: null,
    deadline: '2026-06-05T18:00:00+02:00',
    timeEstimate: 3600,
    timeSpentInLogs: 1200,
    tags: '99 / Настройка, Срочно',
    ufTaskPosition: 'Настроить автоматический расчет остатка оплаты',
  }, {
    portalHost: 'solution24.bitrix24.ru',
    positionFieldCode: 'ufTaskPosition',
  });

  assert.equal(row.id, 99);
  assert.equal(row.title, 'Настроить отчет');
  assert.equal(row.titleUrl, 'https://solution24.bitrix24.ru/company/personal/user/0/tasks/task/view/99/');
  assert.equal(row.statusLabel, 'В работе');
  assert.equal(row.createdDateText, '03.06.2026');
  assert.equal(row.deadlineText, '05.06.2026');
  assert.equal(row.closedDateText, '');
  assert.equal(row.plannedText, '1:00');
  assert.equal(row.spentText, '0:20');
  assert.deepEqual(row.tags, ['99 / Настройка', 'Срочно']);
  assert.equal(row.positionName, 'Настроить автоматический расчет остатка оплаты');
});

test('calculateTotals sums seconds and formats result', () => {
  const totals = calculateTotals([
    { plannedSeconds: 3600, spentSeconds: 1200 },
    { plannedSeconds: 900, spentSeconds: 300 },
  ]);

  assert.deepEqual(totals, {
    plannedSeconds: 4500,
    spentSeconds: 1500,
    plannedText: '1:15',
    spentText: '0:25',
  });
});
```

- [x] **Step 2: Run failing mapper tests**

Run: `npm test -- test/task-mapper.test.js`

Expected: FAIL because `taskMapper.js` does not exist.

- [x] **Step 3: Implement mapper**

Create `src/report/taskMapper.js`:

```js
const { getStatusLabel } = require('./statuses');
const { formatSeconds } = require('./time');

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function parseTags(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value || '').split(',').map((tag) => tag.trim()).filter(Boolean);
}

function buildTaskUrl(portalHost, taskId) {
  return `https://${portalHost}/company/personal/user/0/tasks/task/view/${taskId}/`;
}

function mapTaskToRow(task, options) {
  const positionFieldCode = options.positionFieldCode;
  const plannedSeconds = Number(task.timeEstimate || 0);
  const spentSeconds = Number(task.timeSpentInLogs || task.timeSpent || task.durationFact || 0);

  return {
    id: Number(task.id),
    title: task.title || '',
    titleUrl: buildTaskUrl(options.portalHost, task.id),
    status: Number(task.status || 0),
    statusLabel: getStatusLabel(task.status),
    createdDate: task.createdDate || '',
    changedDate: task.changedDate || '',
    closedDate: task.closedDate || '',
    deadline: task.deadline || '',
    createdDateText: formatDate(task.createdDate),
    closedDateText: formatDate(task.closedDate),
    deadlineText: formatDate(task.deadline),
    plannedSeconds,
    spentSeconds,
    plannedText: formatSeconds(plannedSeconds),
    spentText: formatSeconds(spentSeconds),
    positionName: positionFieldCode ? String(task[positionFieldCode] || '') : '',
    tags: parseTags(task.tags),
  };
}

function calculateTotals(rows) {
  const plannedSeconds = rows.reduce((sum, row) => sum + Number(row.plannedSeconds || 0), 0);
  const spentSeconds = rows.reduce((sum, row) => sum + Number(row.spentSeconds || 0), 0);

  return {
    plannedSeconds,
    spentSeconds,
    plannedText: formatSeconds(plannedSeconds),
    spentText: formatSeconds(spentSeconds),
  };
}

module.exports = { mapTaskToRow, calculateTotals, formatDate, parseTags, buildTaskUrl };
```

- [x] **Step 4: Run mapper tests**

Run: `npm test -- test/task-mapper.test.js`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/report/taskMapper.js test/task-mapper.test.js
git commit -m "feat: normalize task report rows"
```

## Task 4: Add Filter Parsing and Predicates

**Files:**
- Create: `src/report/filters.js`
- Test: `test/filters.test.js`

- [x] **Step 1: Write filter tests**

Create `test/filters.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeFilters, applyClientFilters } = require('../src/report/filters');

const rows = [
  {
    id: 1,
    status: 3,
    createdDate: '2026-06-01T10:00:00+02:00',
    changedDate: '2026-06-02T10:00:00+02:00',
    closedDate: '',
    tags: ['99 / Настройка'],
  },
  {
    id: 2,
    status: 5,
    createdDate: '2026-05-01T10:00:00+02:00',
    changedDate: '2026-06-03T10:00:00+02:00',
    closedDate: '2026-06-04T10:00:00+02:00',
    tags: ['91 / Разработка'],
  },
  {
    id: 3,
    status: 6,
    createdDate: '2026-04-01T10:00:00+02:00',
    changedDate: '2026-04-03T10:00:00+02:00',
    closedDate: '2026-04-04T10:00:00+02:00',
    tags: ['Архив'],
  },
];

test('normalizeFilters applies current month default', () => {
  const filters = normalizeFilters({}, new Date('2026-06-04T10:00:00+02:00'));
  assert.equal(filters.periodFrom, '2026-06-01');
  assert.equal(filters.periodTo, '2026-06-30');
  assert.deepEqual(filters.statuses, []);
});

test('applyClientFilters filters by activity period, tag, completion, and statuses', () => {
  const filters = normalizeFilters({
    periodFrom: '2026-06-01',
    periodTo: '2026-06-30',
    tagContains: 'разраб',
    completionFrom: '2026-06-01',
    completionTo: '2026-06-30',
    statuses: '3,5',
  });

  assert.deepEqual(applyClientFilters(rows, filters).map((row) => row.id), [2]);
});
```

- [x] **Step 2: Run failing filter tests**

Run: `npm test -- test/filters.test.js`

Expected: FAIL because `filters.js` does not exist.

- [x] **Step 3: Implement filters**

Create `src/report/filters.js`:

```js
const { getCurrentMonthRange } = require('./dateRanges');
const { parseStatusList } = require('./statuses');

function dateOnly(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function inRange(value, from, to) {
  const date = dateOnly(value);
  if (!date) return false;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function normalizeFilters(input = {}, now = new Date()) {
  const currentMonth = getCurrentMonthRange(now);
  return {
    periodFrom: input.periodFrom || currentMonth.from,
    periodTo: input.periodTo || currentMonth.to,
    tagContains: String(input.tagContains || '').trim().toLowerCase(),
    completionFrom: input.completionFrom || '',
    completionTo: input.completionTo || '',
    statuses: parseStatusList(input.statuses),
  };
}

function applyClientFilters(rows, filters) {
  return rows.filter((row) => {
    const activeInPeriod =
      inRange(row.createdDate, filters.periodFrom, filters.periodTo) ||
      inRange(row.changedDate, filters.periodFrom, filters.periodTo);

    if (!activeInPeriod) return false;

    if (filters.tagContains) {
      const hasTag = row.tags.some((tag) => tag.toLowerCase().includes(filters.tagContains));
      if (!hasTag) return false;
    }

    if (filters.completionFrom || filters.completionTo) {
      if (!inRange(row.closedDate, filters.completionFrom, filters.completionTo)) return false;
    }

    if (filters.statuses.length > 0 && !filters.statuses.includes(row.status)) return false;

    return true;
  });
}

module.exports = { normalizeFilters, applyClientFilters, inRange };
```

- [x] **Step 4: Run filter tests**

Run: `npm test -- test/filters.test.js`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/report/filters.js test/filters.test.js
git commit -m "feat: add task report filters"
```

## Task 5: Add VibeCode Client and Field Discovery

**Files:**
- Create: `src/vibecodeClient.js`
- Create: `scripts/discover.js`
- Test: `test/vibecode-client.test.js`

- [x] **Step 1: Write client tests**

Create `test/vibecode-client.test.js`:

```js
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
```

- [x] **Step 2: Run failing client tests**

Run: `npm test -- test/vibecode-client.test.js`

Expected: FAIL because `vibecodeClient.js` does not exist.

- [x] **Step 3: Implement VibeCode client**

Create `src/vibecodeClient.js`:

```js
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
```

Create `scripts/discover.js`:

```js
require('dotenv').config();

const { readConfig } = require('../src/config');
const { createVibecodeClient, findFieldCodeByTitle } = require('../src/vibecodeClient');

async function main() {
  const config = readConfig();
  const client = createVibecodeClient({
    baseUrl: config.vibecodeApiBase,
    apiKey: config.vibecodeApiKey,
  });

  const fields = await client.getTaskFields();
  const positionCode = config.taskPositionFieldCode || findFieldCodeByTitle(fields, config.taskPositionFieldName);

  console.log(JSON.stringify({
    positionFieldName: config.taskPositionFieldName,
    positionFieldCode: positionCode,
    knownTaskFieldCount: Array.isArray(fields) ? fields.length : Object.keys(fields || {}).length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
```

- [x] **Step 4: Run client tests**

Run: `npm test -- test/vibecode-client.test.js`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/vibecodeClient.js scripts/discover.js test/vibecode-client.test.js
git commit -m "feat: add vibecode client"
```

## Task 6: Build Report Service

**Files:**
- Create: `src/report/reportService.js`
- Test: `test/report-service.test.js`

- [x] **Step 1: Write report service test**

Create `test/report-service.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { createReportService } = require('../src/report/reportService');

test('buildReport loads item, company, tasks, rows and totals', async () => {
  const client = {
    async getItem(entityTypeId, itemId) {
      assert.equal(entityTypeId, 184);
      assert.equal(itemId, 123);
      return { id: 123, title: 'Объект А', companyId: 77 };
    },
    async getCompany(companyId) {
      assert.equal(companyId, 77);
      return { id: 77, title: 'ООО Ромашка' };
    },
    async getTaskFields() {
      return [{ code: 'UF_TASK_POSITION', title: 'Наименование позиции' }];
    },
    async searchTasks() {
      return [
        {
          id: 10,
          title: 'Задача',
          status: 3,
          createdDate: '2026-06-03T10:00:00+02:00',
          changedDate: '2026-06-03T10:00:00+02:00',
          deadline: '2026-06-05T10:00:00+02:00',
          timeEstimate: 3600,
          timeSpentInLogs: 600,
          tags: 'Настройка',
          UF_TASK_POSITION: 'Позиция',
        },
      ];
    },
  };

  const service = createReportService({
    client,
    config: {
      taskPositionFieldName: 'Наименование позиции',
      taskPositionFieldCode: '',
      publicPortalHost: 'solution24.bitrix24.ru',
    },
  });

  const report = await service.buildReport({
    entityTypeId: 184,
    itemId: 123,
    filters: {
      periodFrom: '2026-06-01',
      periodTo: '2026-06-30',
    },
  });

  assert.equal(report.header.objectName, 'Объект А');
  assert.equal(report.header.companyName, 'ООО Ромашка');
  assert.equal(report.header.companyReportName, 'Отчет по сопровождению ООО Ромашка');
  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].positionName, 'Позиция');
  assert.equal(report.totals.plannedText, '1:00');
});
```

- [x] **Step 2: Run failing report service test**

Run: `npm test -- test/report-service.test.js`

Expected: FAIL because `reportService.js` does not exist.

- [x] **Step 3: Implement report service**

Create `src/report/reportService.js`:

```js
const { findFieldCodeByTitle } = require('../vibecodeClient');
const { normalizeFilters, applyClientFilters } = require('./filters');
const { mapTaskToRow, calculateTotals } = require('./taskMapper');

function buildCompanyReportName(companyName) {
  return companyName ? `Отчет по сопровождению ${companyName}` : 'Отчет по сопровождению';
}

function createTaskSearchBody(entityTypeId, itemId) {
  return {
    filter: {
      crmBinding: {
        entityTypeId: Number(entityTypeId),
        entityId: Number(itemId),
      },
    },
    sort: '-changedDate',
    limit: 500,
  };
}

function createReportService({ client, config }) {
  async function resolvePositionFieldCode() {
    if (config.taskPositionFieldCode) return config.taskPositionFieldCode;
    const fields = await client.getTaskFields();
    return findFieldCodeByTitle(fields, config.taskPositionFieldName);
  }

  async function buildReport({ entityTypeId, itemId, filters: rawFilters }) {
    const filters = normalizeFilters(rawFilters);
    const [item, positionFieldCode] = await Promise.all([
      client.getItem(Number(entityTypeId), Number(itemId)),
      resolvePositionFieldCode(),
    ]);

    let company = null;
    if (item.companyId) {
      company = await client.getCompany(item.companyId);
    }

    const tasks = await client.searchTasks(createTaskSearchBody(entityTypeId, itemId));
    const rows = tasks.map((task) => mapTaskToRow(task, {
      portalHost: config.publicPortalHost,
      positionFieldCode,
    }));
    const filteredRows = applyClientFilters(rows, filters);

    const companyName = company?.title || company?.name || '';
    return {
      header: {
        entityTypeId: Number(entityTypeId),
        itemId: Number(itemId),
        objectName: item.title || `Элемент ${itemId}`,
        companyName: companyName || 'не указана',
        companyReportName: buildCompanyReportName(companyName),
        periodText: `${filters.periodFrom} - ${filters.periodTo}`,
      },
      filters,
      rows: filteredRows,
      totals: calculateTotals(filteredRows),
      meta: {
        positionFieldCode,
      },
    };
  }

  return { buildReport };
}

module.exports = { createReportService, createTaskSearchBody, buildCompanyReportName };
```

- [x] **Step 4: Run report service test**

Run: `npm test -- test/report-service.test.js`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/report/reportService.js test/report-service.test.js
git commit -m "feat: build task report service"
```

## Task 7: Add Express Report Routes

**Files:**
- Modify: `server.js`
- Create: `src/routes/reportRoutes.js`
- Test: `test/routes.test.js`

- [x] **Step 1: Write route test**

Create `test/routes.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createReportRouter } = require('../src/routes/reportRoutes');
const express = require('express');

test('GET /api/report validates context', async () => {
  const app = express();
  app.use('/api/report', createReportRouter({ reportService: {} }));

  const response = await request(app).get('/api/report');
  assert.equal(response.status, 400);
  assert.match(response.body.message, /entityTypeId/);
});

test('GET /api/report returns report JSON', async () => {
  const app = express();
  const report = { header: {}, rows: [], totals: {} };
  app.use('/api/report', createReportRouter({
    reportService: {
      async buildReport(params) {
        assert.equal(params.entityTypeId, '184');
        assert.equal(params.itemId, '123');
        return report;
      },
    },
  }));

  const response = await request(app).get('/api/report?entityTypeId=184&itemId=123');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { success: true, data: report });
});
```

- [x] **Step 2: Run failing route test**

Run: `npm test -- test/routes.test.js`

Expected: FAIL because `reportRoutes.js` does not exist.

- [x] **Step 3: Implement route module and wire server**

Create `src/routes/reportRoutes.js`:

```js
const express = require('express');

function createReportRouter({ reportService }) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const { entityTypeId, itemId, ...filters } = req.query;
      if (!entityTypeId || !itemId) {
        return res.status(400).json({
          success: false,
          message: 'entityTypeId and itemId are required',
        });
      }

      const report = await reportService.buildReport({ entityTypeId, itemId, filters });
      return res.json({ success: true, data: report });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  return router;
}

module.exports = { createReportRouter };
```

Modify `server.js`:

```js
require('dotenv').config();

const express = require('express');
const path = require('node:path');
const { readConfig } = require('./src/config');
const { createVibecodeClient } = require('./src/vibecodeClient');
const { createReportService } = require('./src/report/reportService');
const { createReportRouter } = require('./src/routes/reportRoutes');

const config = readConfig();
const client = createVibecodeClient({
  baseUrl: config.vibecodeApiBase,
  apiKey: config.vibecodeApiKey,
});
const reportService = createReportService({ client, config });
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/report', createReportRouter({ reportService }));

app.get('/api/health', (req, res) => {
  res.json({ success: true, service: 'task-report-frame' });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Task report frame listening on ${config.port}`);
  });
}

module.exports = { app };
```

- [x] **Step 4: Run route tests**

Run: `npm test -- test/routes.test.js`

Expected: PASS.

- [x] **Step 5: Run all tests**

Run: `npm test`

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add server.js src/routes/reportRoutes.js test/routes.test.js
git commit -m "feat: expose task report api"
```

## Task 8: Build Embedded Frontend

**Files:**
- Create: `public/index.html`
- Create: `public/styles.css`
- Create: `public/app.js`

- [x] **Step 1: Create HTML shell**

Create `public/index.html`:

```html
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Отчет по задачам</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main class="app-shell">
    <header class="report-header">
      <div>
        <h1>Отчет по задачам</h1>
        <div id="reportMeta" class="report-meta"></div>
      </div>
      <button id="printButton" class="button" type="button">Печать</button>
    </header>

    <section class="filters">
      <label>Отчет за период <input id="periodFrom" type="date"></label>
      <label>по <input id="periodTo" type="date"></label>
      <label>Теги содержит <input id="tagContains" type="search"></label>
      <label>Дата завершения <select id="completionQuick">
        <option value="">Не выбрано</option>
        <option value="today">Сегодня</option>
        <option value="week">Неделя</option>
        <option value="month">Месяц</option>
        <option value="manual">Ручной диапазон</option>
      </select></label>
      <label>с <input id="completionFrom" type="date"></label>
      <label>по <input id="completionTo" type="date"></label>
      <fieldset class="status-filter">
        <legend>Статус</legend>
        <label><input type="checkbox" name="status" value="2"> Ждет выполнения</label>
        <label><input type="checkbox" name="status" value="3"> В работе</label>
        <label><input type="checkbox" name="status" value="4"> Ждет контроля</label>
        <label><input type="checkbox" name="status" value="5"> Завершена</label>
        <label><input type="checkbox" name="status" value="6"> Отложена</label>
      </fieldset>
      <button id="applyButton" class="button" type="button">Применить</button>
      <button id="resetButton" class="button secondary" type="button">Сбросить</button>
    </section>

    <div id="message" class="message"></div>
    <section id="tableHost"></section>
  </main>
  <script src="//api.bitrix24.com/api/v1/"></script>
  <script src="/app.js"></script>
</body>
</html>
```

- [x] **Step 2: Create report CSS**

Create `public/styles.css`:

```css
:root {
  --bg: #f5f7fb;
  --panel: #ffffff;
  --line: #d7dde8;
  --header: #eef0d4;
  --text: #172033;
  --link: #0b63c7;
  --button: #2f55b8;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: 14px/1.4 "Segoe UI", Tahoma, sans-serif;
}

.app-shell {
  padding: 16px;
}

.report-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

h1 {
  margin: 0 0 8px;
  font-size: 22px;
}

.report-meta {
  display: grid;
  gap: 2px;
  color: #3c4658;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 10px;
  padding: 12px;
  margin-bottom: 12px;
  background: var(--panel);
  border: 1px solid var(--line);
}

.filters label {
  display: grid;
  gap: 4px;
  font-size: 12px;
}

input,
select {
  min-height: 32px;
  border: 1px solid var(--line);
  padding: 4px 8px;
  font: inherit;
}

.status-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px;
  margin: 0;
  border: 1px solid var(--line);
}

.button {
  min-height: 34px;
  border: 0;
  padding: 0 14px;
  background: var(--button);
  color: white;
  cursor: pointer;
}

.button.secondary {
  background: #6d778a;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--panel);
}

.report-table th,
.report-table td {
  border: 1px solid var(--line);
  padding: 9px 12px;
  vertical-align: top;
}

.report-table th {
  background: var(--header);
  text-align: left;
  font-weight: 500;
}

.report-table a {
  color: var(--link);
  text-decoration: none;
}

.report-table a:hover {
  text-decoration: underline;
}

.number {
  text-align: right;
  white-space: nowrap;
}

.message {
  margin: 12px 0;
}

@media print {
  body {
    background: white;
  }

  .filters,
  .button,
  .message:empty {
    display: none;
  }

  .app-shell {
    padding: 0;
  }
}
```

- [x] **Step 3: Create frontend JavaScript**

Create `public/app.js`:

```js
const state = {
  context: readContext(),
  report: null,
};

function readContext() {
  const params = new URLSearchParams(window.location.search);
  const localEntityTypeId = params.get('entityTypeId');
  const localItemId = params.get('itemId');

  if (localEntityTypeId && localItemId) {
    return { entityTypeId: localEntityTypeId, itemId: localItemId };
  }

  const placementOptions = params.get('PLACEMENT_OPTIONS');
  const placement = params.get('PLACEMENT');
  if (placementOptions && placement) {
    try {
      const parsed = JSON.parse(placementOptions);
      const match = placement.match(/CRM_DYNAMIC_(\d+)_DETAIL_TAB/);
      return { entityTypeId: match?.[1], itemId: parsed.ID };
    } catch (error) {
      return {};
    }
  }

  return {};
}

function selectedStatuses() {
  return [...document.querySelectorAll('input[name="status"]:checked')].map((input) => input.value);
}

function buildQuery() {
  const params = new URLSearchParams({
    entityTypeId: state.context.entityTypeId,
    itemId: state.context.itemId,
    periodFrom: document.querySelector('#periodFrom').value,
    periodTo: document.querySelector('#periodTo').value,
    tagContains: document.querySelector('#tagContains').value,
    completionFrom: document.querySelector('#completionFrom').value,
    completionTo: document.querySelector('#completionTo').value,
  });

  const statuses = selectedStatuses();
  if (statuses.length) params.set('statuses', statuses.join(','));
  return params;
}

async function loadReport() {
  if (!state.context.entityTypeId || !state.context.itemId) {
    showMessage('Для локальной проверки добавьте в URL параметры entityTypeId и itemId, например ?entityTypeId=184&itemId=123.');
    return;
  }

  showMessage('Загрузка...');
  const response = await fetch(`/api/report?${buildQuery().toString()}`);
  const payload = await response.json();
  if (!payload.success) {
    showMessage(payload.message || 'Не удалось загрузить отчет.');
    return;
  }

  state.report = payload.data;
  renderReport(payload.data);
  showMessage(payload.data.rows.length ? '' : 'По выбранным фильтрам задач не найдено.');
}

function showMessage(text) {
  document.querySelector('#message').textContent = text;
}

function renderReport(report) {
  document.querySelector('#reportMeta').innerHTML = `
    <div>${escapeHtml(report.header.companyReportName)}</div>
    <div>Объект: ${escapeHtml(report.header.objectName)}</div>
    <div>Компания: ${escapeHtml(report.header.companyName)}</div>
    <div>Период: ${escapeHtml(report.header.periodText)}</div>
  `;

  document.querySelector('#tableHost').innerHTML = renderTable(report.rows, report.totals);
}

function renderTable(rows, totals) {
  const body = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.createdDateText)}</td>
      <td>${escapeHtml(row.statusLabel)}</td>
      <td><a href="${escapeAttribute(row.titleUrl)}" target="_blank" rel="noopener">${escapeHtml(row.title)}</a></td>
      <td class="number">${escapeHtml(row.plannedText)}</td>
      <td class="number">${escapeHtml(row.spentText)}</td>
      <td>${escapeHtml(row.closedDateText)}</td>
      <td>${escapeHtml(row.deadlineText)}</td>
      <td>${escapeHtml(row.positionName)}</td>
      <td>${escapeHtml(row.tags.join(' / '))}</td>
    </tr>
  `).join('');

  return `
    <table class="report-table">
      <thead><tr>
        <th>Дата создания</th><th>Статус</th><th>Название</th>
        <th>Планируемые трудозатраты</th><th>Затраченное время</th>
        <th>Дата завершения</th><th>Крайний срок</th><th>Наименование позиции</th><th>Теги</th>
      </tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr>
        <td colspan="3">Всего</td><td class="number">${escapeHtml(totals.plannedText)}</td>
        <td class="number">${escapeHtml(totals.spentText)}</td><td colspan="4"></td>
      </tr></tfoot>
    </table>
  `;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

document.querySelector('#applyButton').addEventListener('click', loadReport);
document.querySelector('#resetButton').addEventListener('click', () => window.location.reload());
document.querySelector('#printButton').addEventListener('click', () => {
  window.open(`/print.html?${buildQuery().toString()}`, '_blank', 'noopener');
});

loadReport().catch((error) => showMessage(error.message));
```

- [x] **Step 4: Run local server smoke check**

Run: `npm start`

Open: `http://localhost:3000/?entityTypeId=184&itemId=123`

Expected: page loads and either shows report data or a clear API error.

- [x] **Step 5: Commit**

```bash
git add public/index.html public/styles.css public/app.js
git commit -m "feat: add embedded report frontend"
```

## Task 9: Add HTML Print View

**Files:**
- Create: `public/print.html`
- Create: `public/print.js`
- Modify: `public/styles.css`

- [x] **Step 1: Create print HTML**

Create `public/print.html`:

```html
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Печать отчета</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body class="print-page">
  <main class="app-shell">
    <header class="report-header">
      <div>
        <h1>Отчет по задачам</h1>
        <div id="reportMeta" class="report-meta"></div>
      </div>
      <button id="printNowButton" class="button" type="button">Печать</button>
    </header>
    <section id="tableHost"></section>
  </main>
  <script src="/print.js"></script>
</body>
</html>
```

- [x] **Step 2: Create print JavaScript**

Create `public/print.js`:

```js
async function loadPrintReport() {
  const response = await fetch(`/api/report?${window.location.search.slice(1)}`);
  const payload = await response.json();
  if (!payload.success) {
    document.body.textContent = payload.message || 'Не удалось загрузить печатную форму.';
    return;
  }

  const report = payload.data;
  document.querySelector('#reportMeta').innerHTML = `
    <div>${escapeHtml(report.header.companyReportName)}</div>
    <div>Объект: ${escapeHtml(report.header.objectName)}</div>
    <div>Компания: ${escapeHtml(report.header.companyName)}</div>
    <div>Период: ${escapeHtml(report.header.periodText)}</div>
  `;
  document.querySelector('#tableHost').innerHTML = renderTable(report.rows, report.totals);
}

function renderTable(rows, totals) {
  const body = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.createdDateText)}</td>
      <td>${escapeHtml(row.statusLabel)}</td>
      <td>${escapeHtml(row.title)}</td>
      <td class="number">${escapeHtml(row.plannedText)}</td>
      <td class="number">${escapeHtml(row.spentText)}</td>
      <td>${escapeHtml(row.closedDateText)}</td>
      <td>${escapeHtml(row.deadlineText)}</td>
      <td>${escapeHtml(row.positionName)}</td>
      <td>${escapeHtml(row.tags.join(' / '))}</td>
    </tr>
  `).join('');

  return `
    <table class="report-table">
      <thead><tr>
        <th>Дата создания</th><th>Статус</th><th>Название</th>
        <th>Планируемые трудозатраты</th><th>Затраченное время</th>
        <th>Дата завершения</th><th>Крайний срок</th><th>Наименование позиции</th><th>Теги</th>
      </tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr>
        <td colspan="3">Всего</td><td class="number">${escapeHtml(totals.plannedText)}</td>
        <td class="number">${escapeHtml(totals.spentText)}</td><td colspan="4"></td>
      </tr></tfoot>
    </table>
  `;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

document.querySelector('#printNowButton').addEventListener('click', () => window.print());
loadPrintReport();
```

- [x] **Step 3: Add print CSS refinements**

Append to `public/styles.css`:

```css
.print-page {
  background: white;
}

.print-page .report-table th,
.print-page .report-table td {
  padding: 6px 8px;
  font-size: 12px;
}

@page {
  size: A4 landscape;
  margin: 10mm;
}
```

- [x] **Step 4: Manual print smoke check**

Open: `http://localhost:3000/print.html?entityTypeId=184&itemId=123`

Expected: print page loads same report header/table/totals and `Печать` triggers browser print.

- [x] **Step 5: Commit**

```bash
git add public/print.html public/print.js public/styles.css
git commit -m "feat: add html print view"
```

## Task 10: Discover Live Portal Contract

**Files:**
- Modify: `scripts/discover.js`
- Modify: `.env.example`
- Test: manual API run

- [x] **Step 1: Extend discovery script for item/task sample**

Modify `scripts/discover.js` to accept `entityTypeId` and `itemId`:

```js
require('dotenv').config();

const { readConfig } = require('../src/config');
const { createVibecodeClient, findFieldCodeByTitle } = require('../src/vibecodeClient');
const { createTaskSearchBody } = require('../src/report/reportService');

async function main() {
  const config = readConfig();
  const entityTypeId = process.argv[2];
  const itemId = process.argv[3];
  const client = createVibecodeClient({
    baseUrl: config.vibecodeApiBase,
    apiKey: config.vibecodeApiKey,
  });

  const fields = await client.getTaskFields();
  const positionCode = config.taskPositionFieldCode || findFieldCodeByTitle(fields, config.taskPositionFieldName);
  const result = {
    positionFieldName: config.taskPositionFieldName,
    positionFieldCode: positionCode,
    knownTaskFieldCount: Array.isArray(fields) ? fields.length : Object.keys(fields || {}).length,
  };

  if (entityTypeId && itemId) {
    result.item = await client.getItem(Number(entityTypeId), Number(itemId));
    result.taskSearchBody = createTaskSearchBody(entityTypeId, itemId);
    result.sampleTasks = await client.searchTasks(createTaskSearchBody(entityTypeId, itemId));
    result.sampleTasks = result.sampleTasks.slice(0, 3);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
```

- [x] **Step 2: Run discovery with real IDs**

Create `.env` from `.env.example` and set `VIBECODE_API_KEY`.

Run: `npm run discover -- 184 123`

Expected: JSON output shows `positionFieldCode`, item title/company fields, and up to three tasks. If `sampleTasks` is empty for a known item with tasks, inspect output and adjust `createTaskSearchBody` in Task 6 to the real binding field returned by VibeCode.

- [x] **Step 3: Commit discovery improvement**

```bash
git add scripts/discover.js .env.example
git commit -m "chore: add live portal discovery script"
```

## Task 11: Publish VibeCode App Placement

**Files:**
- Create: `scripts/publish-vibecode-app.js`
- Modify: `.env.example`
- Test: manual VibeCode API call after deployment

> Current correction: do not implement the old direct Bitrix24 `placement.bind` script for this project path. Use VibeCode app publishing with `VIBECODE_APP_KEY`, `VIBECODE_APP_ID`, `appUrl`, and `placements`.

- [x] **Step 1: Create VibeCode app publish script**

Create `scripts/publish-vibecode-app.js`:

```js
require('dotenv').config();

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
  const placement = `CRM_DYNAMIC_${entityTypeId}_DETAIL_TAB`;
  const result = await requestJson(`${baseUrl}/apps/${appId}/publish`, apiKey, {
    catalogTitle: 'Отчет по задачам',
    appUrl,
    placements: [placement],
  });

  console.log(JSON.stringify({ placement, result }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
```

- [x] **Step 2: Publish placement after deploy**

Run after deployment URL is known:

```bash
$env:DEPLOYED_APP_URL = 'https://your-vibecode-app-url.example'
node scripts/publish-vibecode-app.js $env:DEPLOYED_APP_URL 184
```

Expected: VibeCode returns `success: true`, `data.appUrl`, and `data.placements` contains `CRM_DYNAMIC_184_DETAIL_TAB`.

- [ ] **Step 3: Commit VibeCode publish script**

```bash
git add scripts/publish-vibecode-app.js .env.example
git commit -m "chore: add vibecode app publish script"
```

## Task 12: Deploy to VibeCode

**Files:**
- Create: `scripts/deploy-vibecode.ps1`
- Modify: `.env.example`
- Test: live deploy

- [x] **Step 1: Create deploy script**

Create `scripts/deploy-vibecode.ps1`:

```powershell
param(
  [Parameter(Mandatory=$true)][string]$ServerId,
  [Parameter(Mandatory=$true)][string]$ApiKey
)

$ErrorActionPreference = 'Stop'
$archive = 'app.tar.gz'
if (Test-Path $archive) {
  Remove-Item -LiteralPath $archive -Force
}

tar -czf $archive package.json package-lock.json server.js src public .env.example
$content = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path $archive)))
$headers = @{ 'X-Api-Key' = $ApiKey; 'Content-Type' = 'application/json' }
$body = @{
  source = @{ content = $content }
  extractTo = '/opt/app'
  runtime = 'node20'
  install = 'npm ci --omit=dev'
  start = 'node server.js'
  port = 3000
  env = @{
    VIBECODE_API_KEY = $ApiKey
    VIBECODE_API_BASE = 'https://vibecode.bitrix24.tech/v1'
    PORT = '3000'
    TASK_POSITION_FIELD_NAME = 'Наименование позиции'
    PUBLIC_PORTAL_HOST = 'solution24.bitrix24.ru'
  }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "https://vibecode.bitrix24.tech/v1/infra/servers/$ServerId/deploy" -Headers $headers -Method Post -Body $body
```

- [x] **Step 2: Deploy**

Run:

```powershell
$env:VIBECODE_SERVER_ID = 'server-id-from-vibecode'
$env:VIBECODE_API_KEY = 'vibecode-api-key-from-secure-local-env'
.\scripts\deploy-vibecode.ps1 -ServerId $env:VIBECODE_SERVER_ID -ApiKey $env:VIBECODE_API_KEY
```

Expected: VibeCode deploy response returns success and a public app URL or the server status/logs show the tunnel URL.

- [x] **Step 3: Verify deployed health**

Run:

```powershell
$env:DEPLOYED_APP_URL = 'https://your-vibecode-app-url.example'
curl.exe -sS "$env:DEPLOYED_APP_URL/api/health"
```

Expected:

```json
{"success":true,"service":"task-report-frame"}
```

- [x] **Step 4: Commit deploy script**

```bash
git add scripts/deploy-vibecode.ps1 .env.example
git commit -m "chore: add vibecode deploy script"
```

## Task 13: End-to-End Verification

**Files:**
- Modify only if verification reveals a bug.

- [ ] **Step 1: Local verification**

Run:

```bash
npm test
npm start
```

Open:

```text
http://localhost:3000/?entityTypeId=184&itemId=123
```

Expected:

- Report loads for the selected item.
- Header shows generated report name, object, company, period.
- Task title links open Bitrix24 task cards.
- Status filter allows several statuses at once.
- Totals match visible rows.
- Print page opens with the same filters.

- [ ] **Step 2: Deployed frame verification**

Open a smart-process item card in Bitrix24.

Expected:

- The tab `Отчет по задачам` appears.
- The app reads placement context automatically.
- The report shows only tasks linked to the current item.
- The print button opens the HTML print form.

- [ ] **Step 3: Commit verification fixes if needed**

If any verification bug is fixed:

```bash
git add -A
git commit -m "fix: resolve task report verification issues"
```

## Self-Review

- Spec coverage: covered placement, local URL fallback, report header, columns, clickable task title, filters, multi-status selection, totals, print view, error behavior, deployment, and post-deploy verification.
- Placeholder scan: no `TBD` or `TODO` remains in the plan. The unknown task custom field code is handled through discovery/configuration rather than left as an implementation gap.
- Type consistency: `entityTypeId`, `itemId`, `periodFrom`, `periodTo`, `completionFrom`, `completionTo`, `statuses`, `positionFieldCode`, and row fields are used consistently across tasks.

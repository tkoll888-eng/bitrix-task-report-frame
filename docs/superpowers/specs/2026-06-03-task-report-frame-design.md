# Task Report Frame Design

## Goal

Build a VibeCode/Bitrix24 application in `C:\AI\tasks`.
The application appears as an additional smart-process tab/frame and shows a task report for tasks linked to the current smart-process item.

The first release is intentionally focused:

- Show only tasks linked to the current smart-process item.
- Provide report filters.
- Show totals for planned effort and spent time.
- Provide an HTML print view.
- Deploy to VibeCode after implementation.

The first release does not include PDF export, Excel export, or portal-wide task reports.

## Placement

The app is displayed in the card of a smart-process item as an additional frame/tab near the item data.

The app is published through the VibeCode application lifecycle, not through a direct Bitrix24 incoming webhook. For embedded use, the app must use a VibeCode authorization key (`vibe_app_...`) with the `placement` scope. VibeCode publishes the app placement to Bitrix24 using an application record, `appUrl`, and a placement code such as:

```text
CRM_DYNAMIC_<entityTypeId>_DETAIL_TAB
```

The app can still use a personal VibeCode API key (`vibe_api_...`) for local server-to-server checks and discovery scripts, but production embedded requests must support the VibeCode gateway session header described below.

## VibeCode Authorization Modes

The project has two separate access modes, and they must not be mixed:

- **Deployed Bitrix24 frame / server mode** uses `VIBECODE_APP_KEY` (`vibe_app_...`) plus the embedded user session. When the app is opened as a Bitrix24 tab, VibeCode Gateway forwards user session context to backend requests as `X-Vibe-Authorization: Bearer vibe_session_...`. The backend calls VibeCode API with `X-Api-Key: <VIBECODE_APP_KEY>` and `Authorization: Bearer <vibe_session...>`.
- **Local/server-to-server diagnostics mode** uses `VIBECODE_API_KEY` (`vibe_api_...`) without an embedded session. This mode is for local checks, discovery scripts, and direct diagnostic calls.

A direct external request to the deployed Black Hole URL, for example `/api/report?...`, is not equivalent to opening the app inside the Bitrix24 frame. Without `X-Vibe-Authorization`, that request can return `401`; this is expected and does not by itself mean that embedded frame mode is broken.

In Bitrix24 frame mode, the app receives the current smart-process context from the placement:

- `entityTypeId`
- `itemId`

In local development mode, there is no Bitrix24 placement context. For local testing, the user provides the item manually through URL query parameters:

```text
http://localhost:<port>/?entityTypeId=184&itemId=123
```

If local parameters are missing, the app shows a helper message:

```text
Для локальной проверки добавьте в URL параметры entityTypeId и itemId, например ?entityTypeId=184&itemId=123.
```

## Main Frame View

The main embedded frame is intentionally compact and data-first.

The main frame view shows:

- A compact top row with filters.
- A `Печать` button in the same top area.
- The task table as the dominant visual element.
- A compact totals strip below the table.

The frame must use the full available height of the smart-process tab area. The app must request or maintain embedded-frame resizing through the available Bitrix24/VibeCode mechanism so the report fills the visible screen area and does not leave a large empty lower area below the content. When content height changes after loading, filtering, sorting, or expanding UI controls, the frame height should be refreshed.

Because the Bitrix24 SDK is loaded asynchronously, resizing cannot be a one-shot action. If `window.BX24.resizeWindow` is not available on the first attempt, the app retries resizing several times after the report loads. The requested height is based on the document's full `scrollHeight` plus a small padding so the bottom of the table, pagination, and totals are not hidden inside the frame work area.

Visible resize diagnostics, test strings, and the experimental `BX24.fitWindow` call must not appear in the production UI. Testing showed that Bitrix24/VibeCode may still cap the actual tab area height regardless of the requested `resizeWindow`; in that case the app keeps best-effort resizing and does not show a user-facing debug block.

The main frame view does not show:

- A separate page title such as `Отчет по задачам`.
- A separate summary block for `Объект / Компания / Период`.

`Object`, `Company`, and `Period` are shown only in the HTML print view, not in the main embedded frame.

## Columns

The table contains these columns:

- `Дата создания`
- `Статус`
- `Название`
- `Планируемые трудозатраты`
- `Затраченное время`
- `Дата завершения`
- `Крайний срок`
- `Теги`

`Название` is a required clickable link to the task in Bitrix24. The desired product behavior is to open the standard task card inside the current Bitrix24 frame/slider so the user returns to the same smart-process item and report frame after closing it.

The current verified production behavior is a regular task URL `/company/personal/user/{responsibleId}/tasks/task/view/{taskId}/` opened in a new browser tab with `target="_blank"` and `rel="noopener noreferrer"`. Attempts to open task URLs through `window.BX24.openPath`, `IFRAME=Y&IFRAME_TYPE=SIDE_SLIDER#`, and direct iframe navigation were not stable: `openPath` did not open the task card, and direct iframe navigation was blocked by `auth2.bitrix24.net`. Embedded task opening therefore remains a separate unresolved platform issue/bug and is not part of the current deployment behavior.

The table supports sorting by clicking column headers. Each click sorts the current loaded result set by the selected column; repeated clicks on the same column toggle ascending and descending order. Sorting is client-side and does not change the active filters or totals.

The main screen must paginate task rows so the frame does not render a long task list at once. Below the table, show a compact Bitrix24-style pagination bar with the current page, previous/next buttons, and a `Per page` selector with `20`, `30`, and `50`. The default page size is `20`.

Pagination applies only to rows displayed in the main screen after filtering and sorting. Totals and task count are calculated from the full current filtered result set, not from the current page. Changing filters, selected tags, statuses, period, completion date, sorting, or page size resets the main table to page 1. Printing uses the full current filtered report and is not limited to the visible page.

## Filters

The compact top filter row contains:

- `Период`
- `Теги`
- `Дата завершения`
- `Статус`

The first release uses an always-visible compact filter row. Separate `Apply` and `Reset` buttons are not required in the visual layout unless they become necessary later for real interaction behavior.

### Period

`Период` filters by task activity.
A task is included when it was created or changed inside the selected period:

```text
createdDate within period OR changedDate within period
```

The default value is `Текущий месяц`.

`Период` supports these modes:

- `За все время`
- `Текущий месяц`
- `Прошлый месяц`
- `Текущая неделя`
- `Прошлая неделя`
- `Сегодня`
- `Произвольный период`

Range logic is always calculated relative to the user's current local date at the moment of use:

- `За все время` = no activity-date restriction.
- `Текущий месяц` = from the first day of the current month to the last day of the current month.
- `Прошлый месяц` = from the first day of the previous calendar month to the last day of the previous calendar month.
- `Текущая неделя` = from Monday of the current week to Sunday of the current week.
- `Прошлая неделя` = from Monday of the previous calendar week to Sunday of the previous calendar week.
- `Сегодня` = the current date only.

When `Произвольный период` is selected, the UI shows a calendar-based date-range control using native browser date inputs. Visually this is one period-selection block, not part of the quick preset flow.

The UI also shows a compact summary beside the filter:

- for calendar presets, show the resolved date range;
- for `За все время`, show the text `За все время`;
- for `Произвольный период`, show the chosen range or `Выберите даты` if the range is still empty.

### Tags

The `Теги` filter is a combined tag picker that uses `OR` logic.

The user can:

- type plain text without relying on Bitrix tag syntax;
- search by partial tag text;
- choose one or more tags from matched values;
- quickly re-apply previously used tag sets.

Filtering rules:

- if one tag is selected, show tasks containing that tag;
- if several tags are selected, show tasks containing at least one selected tag;
- matching is based on human-readable tag text and partial text search, without requiring separators or exact Bitrix formatting.

Source of selectable values:

- available tags are populated automatically from Bitrix24 tasks included in the current loaded data set;
- the UI shows readable tag titles only, without raw objects or service syntax.

UI behavior:

- the filter keeps a text search field for fast lookup;
- selected tags are rendered as chips inside the filter block;
- recently saved tag sets are shown as quick-pick options near or below the control;
- a full list of saved tag sets is also available.

Saved set behavior:

- the app automatically stores unique sets of selected tags;
- a set is unique regardless of tag order;
- saved sets are shared across all reports in the same browser, not only for one item;
- no separate save button is required: a set is stored after the filter is actually used.

### Completion Date

`Дата завершения` uses the same interaction pattern as `Период`.

The default value is `Не учитывать`.

`Дата завершения` supports:

- `Не учитывать`
- `Текущий месяц`
- `Прошлый месяц`
- `Текущая неделя`
- `Прошлая неделя`
- `Сегодня`
- `Произвольный период`

Range logic is also calculated relative to the user's current local date at the moment of use:

- `Не учитывать` = no completion-date restriction.
- `Текущий месяц` = from the first day of the current month to the last day of the current month.
- `Прошлый месяц` = from the first day of the previous calendar month to the last day of the previous calendar month.
- `Текущая неделя` = from Monday of the current week to Sunday of the current week.
- `Прошлая неделя` = from Monday of the previous calendar week to Sunday of the previous calendar week.
- `Сегодня` = the current date only.

When `Произвольный период` is selected, the UI shows the same calendar-based date-range control using native browser date inputs.

The completion filter also shows a compact summary beside the label:

- for calendar presets, show the resolved date range;
- for `Не учитывать`, show the text `Не учитывать`;
- for `Произвольный период`, show the chosen range or `Выберите даты` if the range is still empty.

### Status

`Статус` is a multi-select filter. The user can select one or more statuses at the same time, like in the Bitrix24 interface.

The filter shows the current Bitrix24 task statuses:

- `Ждёт выполнения`
- `Выполняется`
- `Ожидает контроля`
- `Завершена`
- `Отложена`
- `Отклонена`

The app maps status labels to technical task status values for API requests. When several statuses are selected, the report includes tasks matching any selected status.

Visually, the `Статус` filter is a dropdown checklist rather than a single-select control. The user can mark several statuses at once, for example `Ждёт выполнения` and `Выполняется`.

If no status is selected, the report treats this as `Все статусы`.

## Totals

Below the main table, the app shows a compact totals strip.

The totals are calculated for the current filtered result set:

- Sum of `Планируемые трудозатраты`
- Sum of `Затраченное время`

Time is displayed in `H:MM` format.

## Print View

The `print` button prints from the current authorized Bitrix24/VibeCode frame. It must not open `/print.html` in a new browser tab, because a new Black Hole subdomain tab does not inherit the embedded VibeCode Gateway session and returns `401`.

The print layout includes:

- Automatically generated company report name.
- Object name.
- Company name.
- A `Период` line that shows the current `Дата завершения` filter value in the print view without changing the meaning of the underlying filter.
- Task table.
- Totals for planned effort and spent time.

The print layout is generated from the already loaded report data in the current frame, so it uses the same smart-process item context and the same applied filters as the visible report.

The print view is the only place where the full report context is mandatory: object, company, period, and generated company report name.

The print view uses print-specific CSS:

- Hide buttons and interactive filters.
- Hide the `Теги` column in both print variants: inside the current frame and in legacy `print.html`.
- Keep the table readable on portrait A4 paper.
- Redistribute print column widths in favor of `Название`, giving it as much useful width as possible without harming readability of status, dates, and numeric columns.
- Preserve the report header and totals.
- Use `@page { size: A4 portrait; margin: 10mm; }`.

The first release uses HTML printing only. PDF generation is out of scope.

## Data Flow

1. The frame loads inside a smart-process item card.
2. VibeCode Gateway opens the application iframe and injects the user session into backend requests as `X-Vibe-Authorization: Bearer vibe_session_...`.
3. The frontend reads placement context.
4. If placement context is unavailable, the frontend reads `entityTypeId` and `itemId` from URL query parameters for local development.
5. The frontend sends context and filters to the backend.
6. The backend loads the smart-process item to resolve object name and company.
7. When `X-Vibe-Authorization` is present, the backend forwards it to VibeCode API as `Authorization: Bearer ...` together with `X-Api-Key: <vibe_app_key>`.
8. When no VibeCode gateway session is present, local/discovery mode can use `X-Api-Key: <vibe_api_key>` without a session token.
9. The backend loads tasks linked to the current smart-process item.
10. The backend applies or finalizes filters, normalizes fields, maps statuses, and calculates totals.
11. The frontend renders the report table and totals.
12. The print button calls `window.print()` inside the current frame, using print-only markup and CSS based on the current report data.

## Error Handling

If no tasks are found, show:

```text
По выбранным фильтрам задач не найдено.
```

If the smart-process context cannot be determined inside Bitrix24 frame mode, show:

```text
Не удалось определить текущий элемент смарт-процесса.
```

If the smart-process context cannot be determined in local mode, show the local URL helper message described in the Placement section.

If company is not set on the smart-process item, the report still works and shows that the company is not specified in the print view.

### VibeCode Error Diagnostics

When VibeCode returns an error, the app must show more than the HTTP status. It should surface human-readable details from the API response when present: `message`, `userMessage`, `error.message`, `error.hint`, and `error.details`.

Use these diagnostic rules:

- `401` in local mode means a `VIBECODE_API_KEY` or key-selection problem. Local mode without `X-Vibe-Authorization` must use `VIBECODE_API_KEY`, even when `.env` also contains `VIBECODE_APP_KEY`.
- `401` for a direct external deployed `/api/report` request without the Bitrix24 frame session is expected and is not a frame-mode failure.
- `404` from VibeCode on `GET /items/{entityTypeId}/{itemId}` usually means the passed `itemId` does not exist for the selected `entityTypeId`.
- `422` from VibeCode means the API rejected request parameters or body shape. Do not guess from the status alone: show the VibeCode response details and verify the endpoint, filter fields, and request body format.
- A local URL with placeholder `itemId=123` may point to a missing item. Local verification requires a real smart-process item ID.

## Verification

Before deployment:

- Open the app locally with `entityTypeId` and `itemId` query parameters.
- Verify that only tasks linked to the selected smart-process item are shown.
- Verify default period is the current calendar month.
- Verify combined `Теги` filtering with `OR` logic.
- Verify partial-text tag search.
- Verify live tag suggestions populated from Bitrix24 data.
- Verify unique saved tag sets are stored and available for quick reuse.
- Verify completion date quick filters and manual date range.
- Verify completion date defaults to `Не учитывать`.
- Verify local mode with both `VIBECODE_API_KEY` and `VIBECODE_APP_KEY` in `.env`: without `X-Vibe-Authorization`, the backend must call VibeCode through `VIBECODE_API_KEY`.
- Verify VibeCode `401`, `404`, and `422` errors show details from the API response, not only the raw HTTP status.
- Verify status filter labels map correctly to Bitrix24 statuses.
- Verify several statuses can be selected at the same time.
- Verify table headers sort visible rows and toggle direction on repeated clicks.
- Verify task title links open the regular Bitrix24 task card in a new tab without breaking the current report frame.
- Embedded task opening inside the current Bitrix24 frame/slider remains an unresolved platform issue; do not mark it implemented without a separate confirmed Bitrix24 check.
- Verify the compact totals strip.
- Verify HTML print layout with the same applied filters.
- Verify the main frame view does not show the object/company/period context block.
- Verify the print view does show object, company, and period.
- Verify the `Теги` column is hidden in both print variants.
- Verify the print layout expands the `Название` column using the freed space and other secondary columns without losing readability.
- Verify the `Период` line in the print header shows the current `Дата завершения` filter value.
- Verify the print layout is A4 portrait.

After deployment:

- Verify the app opens as a frame/tab in a smart-process item card.
- Verify placement context is detected automatically.
- Verify the frame uses the full available tab height and does not leave a large empty lower area below the report.
- Verify the backend receives and forwards `X-Vibe-Authorization` for embedded `vibe_app_...` requests.
- Do not treat a direct external `401` from `/api/report` without frame session as a frame-mode failure.
- Verify the print button works inside the frame without opening a new tab or returning `401`.

## Deployment and Publication

The deployment flow is:

1. Verify the VibeCode key with `GET /v1/me`.
2. Deploy the Node app to a VibeCode Black Hole server.
3. Set or confirm the VibeCode app `appUrl`.
4. Publish the app with placements through `POST /v1/apps/:id/publish`.
5. Include `CRM_DYNAMIC_<entityTypeId>_DETAIL_TAB` in the `placements` array.

Direct Bitrix24 `placement.bind` through an incoming webhook is not the primary path for this project.

## Open Implementation Detail

The `Наименование позиции` column is not displayed in the current report UI or print view.

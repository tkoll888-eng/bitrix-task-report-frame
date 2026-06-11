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
- `Наименование позиции`
- `Теги`

`Название` is a required clickable link to the task in Bitrix24. Opening the link should take the user to the task card.

`Наименование позиции` comes from a task custom field with the visible name `Наименование позиции`.
The technical field code is not known yet. During implementation, it must be found through task fields API or provided by the user before final wiring.

## Filters

The compact top filter row contains:

- `Отчет за период`
- `Теги содержит`
- `Дата завершения`
- `Статус`

The first release uses an always-visible compact filter row. Separate `Apply` and `Reset` buttons are not required in the visual layout unless they become necessary later for real interaction behavior.

### Report Period

`Отчет за период` filters by task activity.
A task is included when it was created or changed inside the selected period:

```text
createdDate within period OR changedDate within period
```

The default period is the current calendar month.

### Tags

`Теги содержит` matches tasks where at least one tag contains the entered text.

### Completion Date

`Дата завершения` supports:

- `Сегодня`
- `Неделя`
- `Месяц`
- Manual date range

### Status

`Статус` is a multi-select filter. The user can select one or more statuses at the same time, like in the Bitrix24 interface.

The app maps status labels to technical task status values for API requests. When several statuses are selected, the report includes tasks matching any selected status.

For the main frame view, a designer-friendly label such as `На проверке` may be used instead of the stricter Bitrix24 wording, as long as the underlying mapping to technical task statuses stays correct.

## Totals

Below the main table, the app shows a compact totals strip.

The totals are calculated for the current filtered result set:

- Sum of `Планируемые трудозатраты`
- Sum of `Затраченное время`

Time is displayed in `H:MM` format.

## Print View

The `Печать` button opens an HTML print view with the currently applied filters.

The print view includes:

- Automatically generated company report name.
- Object name.
- Company name.
- Selected report period.
- Task table.
- Totals for planned effort and spent time.

The print view is the only place where the full report context is mandatory: object, company, period, and generated company report name.

The print view uses print-specific CSS:

- Hide buttons and interactive filters.
- Keep the table readable on paper.
- Preserve the report header and totals.

The first release uses HTML printing only. PDF generation is out of scope.

## Data Flow

1. The frame loads inside a smart-process item card.
2. The frontend reads placement context.
3. If placement context is unavailable, the frontend reads `entityTypeId` and `itemId` from URL query parameters for local development.
4. The frontend sends context and filters to the backend.
5. The backend loads the smart-process item to resolve object name and company.
6. The backend loads tasks linked to the current smart-process item.
7. The backend applies or finalizes filters, normalizes fields, maps statuses, and calculates totals.
8. The frontend renders the report table and totals.
9. The print view requests the same filtered data and renders a print-ready HTML page.

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

If the task custom field `Наименование позиции` cannot be found, the report still works. The column is left empty and the backend logs a warning.

If company is not set on the smart-process item, the report still works and shows that the company is not specified in the print view.

## Verification

Before deployment:

- Open the app locally with `entityTypeId` and `itemId` query parameters.
- Verify that only tasks linked to the selected smart-process item are shown.
- Verify default period is the current calendar month.
- Verify `Теги содержит` filtering.
- Verify completion date quick filters and manual date range.
- Verify status filter labels map correctly to Bitrix24 statuses.
- Verify several statuses can be selected at the same time.
- Verify the compact totals strip.
- Verify `Наименование позиции` once the task custom field code is known.
- Verify HTML print view with the same applied filters.
- Verify the main frame view does not show the object/company/period context block.
- Verify the print view does show object, company, and period.

After deployment:

- Verify the app opens as a frame/tab in a smart-process item card.
- Verify placement context is detected automatically.
- Verify the print view opens from the frame.

## Open Implementation Detail

The technical code of the task custom field named `Наименование позиции` is not known yet.
Implementation must either discover it through the task fields API or accept it from configuration once provided by the user.

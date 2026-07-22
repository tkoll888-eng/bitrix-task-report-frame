(function () {
  const STORAGE_KEY = 'taskReportSavedTagSets';
  const QUICK_TAG_SET_LIMIT = 5;
  const SUGGESTION_LIMIT = 8;
  const PAGE_SIZE_OPTIONS = [20, 30, 50];
  const FRAME_RESIZE_RETRY_LIMIT = 20;
  const FRAME_RESIZE_PADDING = 32;
  const MANUAL_MODE_ENTITY_TYPE_ID = '184';

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

  const STATUS_OPTIONS = [
    { value: '2', label: 'Ждёт выполнения' },
    { value: '3', label: 'Выполняется' },
    { value: '4', label: 'Ожидает контроля' },
    { value: '5', label: 'Завершена' },
    { value: '6', label: 'Отложена' },
    { value: '7', label: 'Отклонена' },
  ];

  const STATUS_PRESETS = [
    { key: 'work', label: 'В работе', values: ['2', '3', '4', '6'] },
    { key: 'closed', label: 'Закрытые', values: ['5', '7'] },
  ];

  function readContext() {
    const params = new URLSearchParams(window.location.search);
    const getParam = function (name) {
      return params.get(name) || params.get(name.toLowerCase()) || params.get(name.toUpperCase());
    };
    const localEntityTypeId = getParam('entityTypeId');
    const localItemId = getParam('itemId');

    if (localEntityTypeId && localItemId) {
      return { entityTypeId: localEntityTypeId, itemId: localItemId };
    }

    const placementOptions = getParam('placement_options');
    const placement = getParam('placement');
    if (placementOptions && placement) {
      try {
        const parsed = JSON.parse(placementOptions);
        const match = placement.match(/CRM_DYNAMIC_(\d+)_DETAIL_TAB/);
        return { entityTypeId: match && match[1], itemId: parsed.ID || parsed.id };
      } catch (error) {
        return {};
      }
    }

    return {};
  }

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

  function toDateOnly(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function toDisplayDate(value) {
    if (!value) {
      return '';
    }

    const parts = String(value).split('-');
    if (parts.length !== 3) {
      return value;
    }

    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  function getWeekRange(offsetWeeks, now) {
    const day = now.getDay() || 7;
    const from = new Date(now);
    from.setDate(now.getDate() - day + 1 + (offsetWeeks * 7));
    const to = new Date(from);
    to.setDate(from.getDate() + 6);
    return { from: toDateOnly(from), to: toDateOnly(to) };
  }

  function getPresetRange(preset, now) {
    if (preset === 'allTime') {
      return { from: '', to: '' };
    }

    if (preset === 'today') {
      const today = toDateOnly(now);
      return { from: today, to: today };
    }

    if (preset === 'currentWeek') {
      return getWeekRange(0, now);
    }

    if (preset === 'previousWeek') {
      return getWeekRange(-1, now);
    }

    if (preset === 'previousMonth') {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: toDateOnly(from), to: toDateOnly(to) };
    }

    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toDateOnly(from), to: toDateOnly(to) };
  }

  function formatRangeText(from, to) {
    if (!from || !to) {
      return 'Выберите даты';
    }

    return `${toDisplayDate(from)} - ${toDisplayDate(to)}`;
  }

  function getRangeSummaryText(key, preset, from, to) {
    if (preset === 'allTime') {
      return key === 'completion' ? 'Не учитывать' : 'За все время';
    }

    return formatRangeText(from, to);
  }

  function normalizeTagSet(tags) {
    const firstByKey = new Map();

    (Array.isArray(tags) ? tags : []).forEach(function (tag) {
      const trimmed = String(tag || '').trim();
      if (!trimmed) {
        return;
      }

      const key = trimmed.toLowerCase();
      if (!firstByKey.has(key)) {
        firstByKey.set(key, trimmed);
      }
    });

    return Array.from(firstByKey.entries())
      .sort(function (left, right) {
        return left[0].localeCompare(right[0], 'ru');
      })
      .map(function (entry) {
        return entry[1];
      });
  }

  function cleanTagSet(tags) {
    const seen = new Set();

    return (Array.isArray(tags) ? tags : [])
      .map(function (tag) {
        return String(tag || '').trim();
      })
      .filter(function (tag) {
        if (!tag) {
          return false;
        }

        const key = tag.toLowerCase();
        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });
  }

  function getTagSetKey(tags) {
    return normalizeTagSet(tags)
      .map(function (tag) {
        return tag.toLowerCase();
      })
      .join('|');
  }

  function mergeSavedTagSet(savedSets, nextTags) {
    const normalizedNext = normalizeTagSet(nextTags);
    if (normalizedNext.length === 0) {
      return Array.isArray(savedSets) ? savedSets.slice() : [];
    }

    const nextKey = getTagSetKey(normalizedNext);
    const existingSets = (Array.isArray(savedSets) ? savedSets : [])
      .map(cleanTagSet)
      .filter(function (set) {
        return set.length > 0;
      });

    const existingMatch = existingSets.find(function (set) {
      return getTagSetKey(set) === nextKey;
    });

    if (existingMatch) {
      return existingSets.slice();
    }

    const withoutDuplicate = existingSets.filter(function (set) {
      return getTagSetKey(set) !== nextKey;
    });

    return [normalizedNext].concat(withoutDuplicate);
  }

  function filterAvailableTags(availableTags, selectedTags, query) {
    const selected = new Set(normalizeTagSet(selectedTags).map(function (tag) {
      return tag.toLowerCase();
    }));
    const needle = String(query || '').trim().toLowerCase();

    return normalizeTagSet(availableTags).filter(function (tag) {
      const normalized = tag.toLowerCase();
      if (selected.has(normalized)) {
        return false;
      }

      if (!needle) {
        return true;
      }

      return normalized.includes(needle);
    });
  }

  function readSavedTagSets() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.map(cleanTagSet).filter(function (set) { return set.length > 0; })
        : [];
    } catch (error) {
      return [];
    }
  }

  function writeSavedTagSets(savedSets) {
    state.savedTagSets = Array.isArray(savedSets) ? savedSets.slice(0, 20) : [];
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.savedTagSets));
    } catch (error) {
      // ignore storage write errors in browser preview
    }
  }

  function rememberCurrentTagSet() {
    if (state.selectedTags.length === 0) {
      return;
    }

    writeSavedTagSets(mergeSavedTagSet(state.savedTagSets, state.selectedTags));
  }

  function collectAvailableTags(report) {
    const allTags = [];
    (report.rows || []).forEach(function (row) {
      (row.tags || []).forEach(function (tag) {
        allTags.push(tag);
      });
    });
    return normalizeTagSet(allTags);
  }

  function showMessage(text, tone) {
    const node = document.getElementById('message');
    if (!node) {
      return;
    }

    node.hidden = !text;
    node.textContent = text || '';
    node.className = tone === 'error' ? 'message is-error' : 'message';
  }

  function getFrameResizeMetrics() {
    return {
      bodyHeight: document.body.scrollHeight,
      docHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      bodyWidth: document.body.scrollWidth,
      docWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    };
  }

  function getSelectedStatuses() {
    return Array.from(document.querySelectorAll('input[name="statusFilter"]:checked')).map(
      function (input) {
        return input.value;
      },
    );
  }

  function getStatusLabel(value) {
    const found = STATUS_OPTIONS.find(function (option) {
      return option.value === String(value);
    });

    return found ? found.label : String(value);
  }

  function normalizeStatusValues(values) {
    const selected = new Set((Array.isArray(values) ? values : []).map(function (value) {
      return String(value);
    }));

    return STATUS_OPTIONS
      .map(function (option) {
        return option.value;
      })
      .filter(function (value) {
        return selected.has(value);
      });
  }

  function getStatusPresetForSelection(selectedStatuses) {
    const normalized = normalizeStatusValues(selectedStatuses);
    return STATUS_PRESETS.find(function (preset) {
      if (preset.values.length !== normalized.length) {
        return false;
      }

      return preset.values.every(function (value, index) {
        return value === normalized[index];
      });
    }) || null;
  }

  function setSelectedStatuses(values) {
    const selected = new Set(normalizeStatusValues(values));

    document.querySelectorAll('input[name="statusFilter"]').forEach(function (input) {
      input.checked = selected.has(input.value);
    });

    renderStatusPresets();
    syncStatusSummary();
  }

  function renderStatusPresets() {
    const root = document.getElementById('statusPresets');
    if (!root) {
      return;
    }

    const selected = getSelectedStatuses();
    const activePreset = getStatusPresetForSelection(selected);

    root.querySelectorAll('[data-status-preset]').forEach(function (button) {
      const presetKey = button.getAttribute('data-status-preset');
      const preset = STATUS_PRESETS.find(function (item) {
        return item.key === presetKey;
      });

      button.classList.toggle('is-active', Boolean(activePreset && preset && activePreset.key === preset.key));
      button.setAttribute('aria-pressed', Boolean(activePreset && preset && activePreset.key === preset.key));
    });
  }

  function readFilters() {
    return {
      periodPreset: document.getElementById('periodPreset').value,
      periodFrom: document.querySelector('[data-range-start="period"]').value,
      periodTo: document.querySelector('[data-range-end="period"]').value,
      tagContains: '',
      tags: state.selectedTags.slice(),
      completionPreset: document.getElementById('completionPreset').value,
      completionFrom: document.querySelector('[data-range-start="completion"]').value,
      completionTo: document.querySelector('[data-range-end="completion"]').value,
      statuses: getSelectedStatuses(),
    };
  }

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

    filters.tags.forEach(function (tag) {
      params.append('tags', tag);
    });
    if (filters.periodFrom) {
      params.set('periodFrom', filters.periodFrom);
    }
    if (filters.periodTo) {
      params.set('periodTo', filters.periodTo);
    }
    if (filters.completionFrom) {
      params.set('completionFrom', filters.completionFrom);
    }
    if (filters.completionTo) {
      params.set('completionTo', filters.completionTo);
    }
    if (filters.statuses.length > 0) {
      params.set('statuses', filters.statuses.join(','));
    }

    return params;
  }

  function getSortValue(row, key) {
    if (key === 'tags') {
      return (row.tags || []).join(' / ');
    }

    if (key === 'plannedSeconds' || key === 'spentSeconds') {
      return Number(row[key] || 0);
    }

    return row[key] || '';
  }

  function compareRows(left, right, key, direction) {
    const leftValue = getSortValue(left, key);
    const rightValue = getSortValue(right, key);

    if (key === 'closedDate') {
      if (!leftValue && rightValue) {
        return -1;
      }
      if (leftValue && !rightValue) {
        return 1;
      }
    }

    let result = 0;
    if (typeof leftValue === 'number' || typeof rightValue === 'number') {
      result = Number(leftValue || 0) - Number(rightValue || 0);
    } else {
      result = String(leftValue || '').localeCompare(String(rightValue || ''), 'ru', {
        numeric: true,
        sensitivity: 'base',
      });
    }

    return result * direction;
  }

  function getSortedRows(rows) {
    if (!state.sort.key) {
      return rows.slice();
    }

    const direction = state.sort.direction === 'desc' ? -1 : 1;
    return rows.slice().sort(function (left, right) {
      return compareRows(left, right, state.sort.key, direction);
    });
  }

  function normalizePageSize(value) {
    const pageSize = Number(value);
    return PAGE_SIZE_OPTIONS.includes(pageSize) ? pageSize : 20;
  }

  function getPagination(totalRows) {
    const pageSize = normalizePageSize(state.pagination.pageSize);
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const page = Math.min(Math.max(1, state.pagination.page), totalPages);
    state.pagination.page = page;
    state.pagination.pageSize = pageSize;

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return { page, pageSize, totalPages, startIndex, endIndex };
  }

  function getPaginatedRows(rows) {
    const pagination = getPagination(rows.length);
    const startIndex = pagination.startIndex;
    const endIndex = pagination.endIndex;
    return rows.slice(startIndex, endIndex);
  }

  function syncSortButtons() {
    document.querySelectorAll('[data-sort-key]').forEach(function (button) {
      const isActive = button.getAttribute('data-sort-key') === state.sort.key;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-sort', isActive ? state.sort.direction : 'none');
      button.setAttribute('data-sort-direction', isActive ? state.sort.direction : '');
    });
  }

  function scheduleFrameResize(attempt = 0) {
    const bx24 = window.BX24;
    if (!bx24 || typeof bx24.resizeWindow !== 'function') {
      if (attempt < FRAME_RESIZE_RETRY_LIMIT) {
        window.setTimeout(function () {
          scheduleFrameResize(attempt + 1);
        }, 250);
      }
      return;
    }

    window.setTimeout(function () {
      const metrics = getFrameResizeMetrics();
      const height = Math.max(metrics.bodyHeight, metrics.docHeight, metrics.innerHeight)
        + FRAME_RESIZE_PADDING;
      const width = Math.max(metrics.bodyWidth, metrics.docWidth, metrics.innerWidth);

      try {
        bx24.resizeWindow(width, height);
      } catch (error) {
        // Frame resizing is best-effort; the report should remain usable locally.
      }
    }, 0);
  }

  function getStatusTone(status) {
    return {
      2: 'progress',
      3: 'progress',
      4: 'review',
      5: 'done',
      6: 'paused',
      7: 'cancelled',
    }[Number(status)] || 'progress';
  }

  function createTag(text) {
    const tag = document.createElement('span');
    tag.className = 'tag-chip';
    tag.textContent = text;
    return tag;
  }

  function appendPrintMetaLine(root, label, value) {
    const line = document.createElement('div');
    const name = document.createElement('span');
    const text = document.createElement('strong');

    name.textContent = `${label}: `;
    text.textContent = value || '—';
    line.appendChild(name);
    line.appendChild(text);
    root.appendChild(line);
  }

  function cleanFilenamePart(value) {
    return String(value || '')
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildPrintDocumentTitle(report) {
    const header = (report && report.header) || {};
    const companyName = cleanFilenamePart(header.companyName || 'Контрагент');
    const period = cleanFilenamePart(
      header.printCompletionText || header.completionText || header.periodText || 'Период',
    );

    return cleanFilenamePart(`${companyName} ${period}`) || 'Отчет по задачам';
  }

  function escapePrintHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[char];
    });
  }

  function buildPrintRowsHtml(rows) {
    return (rows || []).map(function (row) {
      return `
        <tr>
          <td>${escapePrintHtml(row.createdDateText)}</td>
          <td>${escapePrintHtml(row.statusLabel)}</td>
          <td class="title-cell">${escapePrintHtml(row.title)}</td>
          <td class="numeric">${escapePrintHtml(row.plannedText || '0:00')}</td>
          <td>${escapePrintHtml(row.closedDateText || '—')}</td>
          <td>${escapePrintHtml(row.deadlineText || '—')}</td>
        </tr>
      `;
    }).join('');
  }

  function buildPrintDocumentHtml(report) {
    const header = (report && report.header) || {};
    const totals = (report && report.totals) || {};
    const rows = (report && report.rows) || [];
    const title = buildPrintDocumentTitle(report);

    return `<!doctype html>
      <html lang="ru">
        <head>
          <meta charset="utf-8">
          <title>${escapePrintHtml(title)}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { margin: 0; color: #111827; font-family: Arial, sans-serif; font-size: 9pt; }
            h1 { margin: 0 0 4mm; font-size: 14pt; line-height: 1.2; }
            .meta { display: grid; gap: 2mm; margin-bottom: 6mm; }
            table { width: 100%; border-collapse: collapse; table-layout: auto; font-size: 8pt; }
            th, td { padding: 2mm 1.5mm; border-bottom: 1px solid #d7dde8; vertical-align: top; }
            th { text-align: left; color: #27415f; font-weight: 600; }
            .title-cell { width: 100%; word-break: break-word; }
            .numeric { white-space: nowrap; text-align: right; }
            .totals-strip { display: grid; gap: 1mm; padding-top: 4mm; font-size: 9pt; }
            .totals-item, .totals-count { display: grid; grid-template-columns: max-content max-content; gap: 3mm; }
            strong { font-weight: 700; }
          </style>
        </head>
        <body>
          <section class="meta">
            <h1>${escapePrintHtml(header.companyReportName || 'Отчет по задачам')}</h1>
            <div>Проект: <strong>${escapePrintHtml(header.objectName || '—')}</strong></div>
            <div>Компания: <strong>${escapePrintHtml(header.companyName || '—')}</strong></div>
            <div>Период: <strong>${escapePrintHtml(header.printCompletionText || header.completionText || '—')}</strong></div>
          </section>
          <table>
            <thead>
              <tr>
                <th>Дата создания</th>
                <th>Статус</th>
                <th>Название</th>
                <th>Время</th>
                <th>Дата завершения</th>
                <th>Крайний срок</th>
              </tr>
            </thead>
            <tbody>${buildPrintRowsHtml(rows)}</tbody>
          </table>
          <section class="totals-strip">
            <div class="totals-item"><span>Трудозатраты</span><strong>${escapePrintHtml(totals.plannedText || '0:00')}</strong></div>
            <div class="totals-count"><span>Количество задач</span><strong>${escapePrintHtml(String(rows.length))}</strong></div>
          </section>
        </body>
      </html>`;
  }

  function openPrintDocument() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showMessage('Браузер заблокировал окно печати. Разрешите всплывающие окна для приложения и повторите печать.', 'error');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintDocumentHtml(state.report));
    printWindow.document.close();
    printWindow.setTimeout(function () {
      printWindow.focus();
      printWindow.print();
    }, 250);
  }

  function printCurrentReport() {
    if (state.report) {
      document.title = buildPrintDocumentTitle(state.report);
      openPrintDocument();
      return;
    }

    showMessage('Сначала загрузите отчет, затем повторите печать.', 'error');
  }

  function renderPrintMeta(report) {
    const root = document.getElementById('printMeta');
    if (!root) {
      return;
    }

    root.innerHTML = '';

    const heading = document.createElement('h1');
    heading.textContent = (report.header && report.header.companyReportName) || 'Отчет по задачам';
    root.appendChild(heading);

    appendPrintMetaLine(root, 'Проект', report.header && report.header.objectName);
    appendPrintMetaLine(root, 'Компания', report.header && report.header.companyName);
    appendPrintMetaLine(root, 'Период', report.header && (
      report.header.printCompletionText || report.header.completionText
    ));
    scheduleFrameResize();
  }

  function createStatus(statusLabel, tone) {
    const wrap = document.createElement('span');
    wrap.className = `status status-${tone}`;

    const dot = document.createElement('span');
    dot.className = 'status-dot';
    wrap.appendChild(dot);

    const label = document.createElement('span');
    label.textContent = statusLabel;
    wrap.appendChild(label);

    return wrap;
  }

  function createActionChip(text, className, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = text;
    button.addEventListener('click', onClick);
    return button;
  }

  function renderSelectedTags() {
    const root = document.getElementById('selectedTags');
    if (!root) {
      return;
    }

    root.innerHTML = '';
    state.selectedTags.forEach(function (tag) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'tag-chip tag-chip-selected';
      chip.title = `Убрать тег ${tag}`;
      chip.addEventListener('click', function () {
        removeSelectedTag(tag);
      });

      const text = document.createElement('span');
      text.textContent = tag;
      chip.appendChild(text);

      const remove = document.createElement('span');
      remove.className = 'tag-chip-remove';
      remove.textContent = '×';
      chip.appendChild(remove);

      root.appendChild(chip);
    });
  }

  function getTagSuggestions() {
    const input = document.getElementById('tagSearch');
    return filterAvailableTags(
      state.availableTags,
      state.selectedTags,
      input ? input.value : '',
    ).slice(0, SUGGESTION_LIMIT);
  }

  function renderTagSuggestions() {
    const root = document.getElementById('tagSuggestions');
    if (!root) {
      return;
    }

    const suggestions = getTagSuggestions();
    root.innerHTML = '';

    if (!state.isTagFilterOpen || suggestions.length === 0) {
      root.hidden = true;
      return;
    }

    suggestions.forEach(function (tag) {
      root.appendChild(createActionChip(tag, 'tag-chip tag-chip-suggestion', function () {
        addSelectedTag(tag);
      }));
    });

    root.hidden = false;
  }

  function formatTagSetLabel(tagSet) {
    return tagSet.join(' / ');
  }

  function renderSavedTagSets() {
    const block = document.getElementById('savedTagSets');
    const quickRoot = document.getElementById('savedTagSetsQuick');
    const picker = document.getElementById('savedTagSetsPicker');
    const menu = document.getElementById('savedTagSetsMenu');

    if (!block || !quickRoot || !picker || !menu) {
      return;
    }

    quickRoot.innerHTML = '';
    menu.innerHTML = '';

    if (!state.isTagFilterOpen || state.savedTagSets.length === 0) {
      block.hidden = true;
      return;
    }

    block.hidden = false;

    state.savedTagSets.slice(0, QUICK_TAG_SET_LIMIT).forEach(function (tagSet) {
      quickRoot.appendChild(createActionChip(
        formatTagSetLabel(tagSet),
        'tag-chip tag-chip-saved',
        function () {
          applySavedTagSet(tagSet);
        },
      ));
    });

    state.savedTagSets.forEach(function (tagSet) {
      menu.appendChild(createActionChip(
        formatTagSetLabel(tagSet),
        'tag-set-option',
        function () {
          picker.open = false;
          applySavedTagSet(tagSet);
        },
      ));
    });
  }

  function renderTagFilter() {
    renderSelectedTags();
    renderTagSuggestions();
    renderSavedTagSets();
  }

  function openTagFilter() {
    state.isTagFilterOpen = true;
    renderTagFilter();
  }

  function closeTagFilter() {
    state.isTagFilterOpen = false;
    renderTagFilter();
  }

  function setAvailableTags(report) {
    state.availableTags = collectAvailableTags(report);
    renderTagFilter();
  }

  function addSelectedTag(tag) {
    const nextSelected = normalizeTagSet(state.selectedTags.concat([tag]));
    if (nextSelected.length === state.selectedTags.length) {
      clearTagSearch();
      renderTagFilter();
      return;
    }

    state.selectedTags = nextSelected;
    clearTagSearch();
    state.isTagFilterOpen = true;
    renderTagFilter();
    loadReportFromFirstPage();
  }

  function removeSelectedTag(tag) {
    state.selectedTags = state.selectedTags.filter(function (selectedTag) {
      return selectedTag.toLowerCase() !== String(tag).toLowerCase();
    });
    renderTagFilter();
    loadReportFromFirstPage();
  }

  function applySavedTagSet(tagSet) {
    state.selectedTags = cleanTagSet(tagSet);
    clearTagSearch();
    state.isTagFilterOpen = false;
    renderTagFilter();
    loadReportFromFirstPage();
  }

  function clearTagSearch() {
    const input = document.getElementById('tagSearch');
    if (input) {
      input.value = '';
    }
  }

  function syncRangeSummary(key, now) {
    const control = document.querySelector(`[data-range-toggle="${key}"]`);
    const inline = document.querySelector(`[data-range-inline="${key}"]`);
    const start = document.querySelector(`[data-range-start="${key}"]`);
    const end = document.querySelector(`[data-range-end="${key}"]`);

    if (!control || !inline) {
      return;
    }

    if (control.value === 'custom') {
      inline.textContent = getRangeSummaryText(
        key,
        control.value,
        start && start.value,
        end && end.value,
      );
      return;
    }

    const range = getPresetRange(control.value, now);
    if (start) {
      start.value = range.from;
    }
    if (end) {
      end.value = range.to;
    }
    inline.textContent = getRangeSummaryText(key, control.value, range.from, range.to);
  }

  function syncStatusSummary() {
    const summary = document.getElementById('statusSummary');
    if (!summary) {
      return;
    }

    const selected = getSelectedStatuses();
    if (selected.length === 0 || selected.length === STATUS_OPTIONS.length) {
      summary.textContent = 'Все статусы';
      return;
    }

    const preset = getStatusPresetForSelection(selected);
    if (preset) {
      summary.textContent = preset.label;
      return;
    }

    if (selected.length === 1) {
      const label = getStatusLabel(selected[0]);
      summary.textContent = label;
      return;
    }

    summary.textContent = `Выбрано: ${selected.length}`;
  }

  function bindRangePickers() {
    const controls = document.querySelectorAll('[data-range-toggle]');
    const now = new Date();

    controls.forEach(function (control) {
      const key = control.getAttribute('data-range-toggle');
      const picker = document.querySelector(`[data-range-picker="${key}"]`);
      const start = document.querySelector(`[data-range-start="${key}"]`);
      const end = document.querySelector(`[data-range-end="${key}"]`);

      const sync = function () {
        if (picker) {
          picker.hidden = control.value !== 'custom';
        }
        syncRangeSummary(key, now);
      };

      control.addEventListener('change', function () {
        sync();
        loadReportFromFirstPage();
      });
      if (start) {
        start.addEventListener('change', function () {
          syncRangeSummary(key, now);
          loadReportFromFirstPage();
        });
      }
      if (end) {
        end.addEventListener('change', function () {
          syncRangeSummary(key, now);
          loadReportFromFirstPage();
        });
      }

      sync();
    });
  }

  function bindStatusPicker() {
    const picker = document.getElementById('statusPicker');
    const inputs = document.querySelectorAll('input[name="statusFilter"]');
    const presetButtons = document.querySelectorAll('[data-status-preset]');

    inputs.forEach(function (input) {
      input.addEventListener('change', function () {
        renderStatusPresets();
        syncStatusSummary();
        loadReportFromFirstPage();
      });
    });

    presetButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        const presetKey = button.getAttribute('data-status-preset');
        const preset = STATUS_PRESETS.find(function (item) {
          return item.key === presetKey;
        });

        if (!preset) {
          return;
        }

        setSelectedStatuses(preset.values);
        loadReportFromFirstPage();
      });
    });

    document.addEventListener('click', function (event) {
      if (picker && picker.open && !picker.contains(event.target)) {
        picker.open = false;
      }
    });

    renderStatusPresets();
    syncStatusSummary();
  }

  function bindTagFilter() {
    const input = document.getElementById('tagSearch');
    const filter = document.getElementById('tagFilter');
    const picker = document.getElementById('savedTagSetsPicker');

    if (!input || !filter) {
      return;
    }

    input.addEventListener('input', function () {
      openTagFilter();
      renderTagSuggestions();
    });

    input.addEventListener('focus', function () {
      openTagFilter();
    });

    filter.addEventListener('click', function () {
      openTagFilter();
    });

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeTagFilter();
        input.blur();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const suggestions = getTagSuggestions();
        const typedValue = String(input.value || '').trim();

        if (suggestions.length > 0) {
          addSelectedTag(suggestions[0]);
          return;
        }

        if (typedValue) {
          addSelectedTag(typedValue);
        }
        return;
      }

      if (event.key === 'Backspace' && !input.value && state.selectedTags.length > 0) {
        removeSelectedTag(state.selectedTags[state.selectedTags.length - 1]);
      }
    });

    document.addEventListener('click', function (event) {
      if (!filter.contains(event.target)) {
        closeTagFilter();
      }

      if (picker && picker.open && !picker.contains(event.target)) {
        picker.open = false;
      }
    });
  }

  function bindFiltersForm() {
    const form = document.getElementById('filtersForm');
    if (!form) {
      return;
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      loadReportFromFirstPage();
    });
  }

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

  function bindSorting() {
    document.querySelectorAll('[data-sort-key]').forEach(function (button) {
      button.addEventListener('click', function () {
        const key = button.getAttribute('data-sort-key');
        if (state.sort.key === key) {
          state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
        } else {
          state.sort = { key, direction: 'asc' };
        }
        state.pagination.page = 1;

        if (state.report) {
          renderReport(state.report);
        } else {
          syncSortButtons();
        }
      });
    });

    syncSortButtons();
    scheduleFrameResize();
  }

  function renderPagination(totalRows) {
    const pagination = getPagination(totalRows);
    const pageInfo = document.getElementById('pageInfo');
    const pageList = document.getElementById('pageList');
    const prevButton = document.getElementById('prevPageButton');
    const nextButton = document.getElementById('nextPageButton');
    const pageSizeSelect = document.getElementById('pageSizeSelect');

    const visibleFrom = totalRows === 0 ? 0 : pagination.startIndex + 1;
    const visibleTo = Math.min(totalRows, pagination.endIndex);

    if (pageInfo) {
      pageInfo.textContent = `Показано ${visibleFrom}-${visibleTo} из ${totalRows}`;
    }

    if (pageList) {
      pageList.textContent = `Страницы: ${pagination.page} / ${pagination.totalPages}`;
    }

    if (prevButton) {
      prevButton.disabled = pagination.page <= 1;
    }

    if (nextButton) {
      nextButton.disabled = pagination.page >= pagination.totalPages;
    }

    if (pageSizeSelect) {
      pageSizeSelect.value = String(pagination.pageSize);
    }
  }

  function bindPagination() {
    const prevButton = document.getElementById('prevPageButton');
    const nextButton = document.getElementById('nextPageButton');
    const pageSizeSelect = document.getElementById('pageSizeSelect');

    if (prevButton) {
      prevButton.addEventListener('click', function () {
        state.pagination.page -= 1;
        if (state.report) {
          renderReport(state.report);
        }
      });
    }

    if (nextButton) {
      nextButton.addEventListener('click', function () {
        state.pagination.page += 1;
        if (state.report) {
          renderReport(state.report);
        }
      });
    }

    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', function () {
        state.pagination.pageSize = normalizePageSize(pageSizeSelect.value);
        state.pagination.page = 1;
        if (state.report) {
          renderReport(state.report);
        }
      });
    }
  }

  function renderReport(report) {
    state.report = report;
    document.title = buildPrintDocumentTitle(report);
    renderPrintMeta(report);
    document.getElementById('planned-total').textContent = report.totals.plannedText || '0:00';
    document.getElementById('spent-total').textContent = report.totals.spentText || '0:00';
    document.getElementById('task-count').textContent = String(report.rows.length);

    const rowsRoot = document.getElementById('report-rows');
    rowsRoot.innerHTML = '';

    const paginatedRows = getPaginatedRows(getSortedRows(report.rows || []));
    paginatedRows.forEach(function (row) {
      const tr = document.createElement('tr');

      const createdAt = document.createElement('td');
      createdAt.textContent = row.createdDateText || '';
      tr.appendChild(createdAt);

      const statusCell = document.createElement('td');
      statusCell.appendChild(createStatus(row.statusLabel || '', getStatusTone(row.status)));
      tr.appendChild(statusCell);

      const titleCell = document.createElement('td');
      titleCell.className = 'title-cell';
      const link = document.createElement('a');
      link.className = 'task-link';
      link.href = row.titleUrl || '#';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = row.title || '';
      titleCell.appendChild(link);
      tr.appendChild(titleCell);

      const planned = document.createElement('td');
      planned.className = 'numeric';
      planned.textContent = row.plannedText || '0:00';
      tr.appendChild(planned);

      const spent = document.createElement('td');
      spent.className = 'numeric spent';
      spent.textContent = row.spentText || '0:00';
      tr.appendChild(spent);

      const completedAt = document.createElement('td');
      completedAt.textContent = row.closedDateText || '—';
      tr.appendChild(completedAt);

      const deadline = document.createElement('td');
      deadline.textContent = row.deadlineText || '—';
      tr.appendChild(deadline);

      const tags = document.createElement('td');
      tags.className = 'tags-cell';
      const tagsList = document.createElement('div');
      tagsList.className = 'tags-list';
      (row.tags || []).forEach(function (tagText) {
        tagsList.appendChild(createTag(tagText));
      });
      tags.appendChild(tagsList);
      tr.appendChild(tags);

      rowsRoot.appendChild(tr);
    });

    syncSortButtons();
    renderPagination((report.rows || []).length);
    scheduleFrameResize();
  }

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

  async function loadReport() {
    const reportContext = resolveReportContext(state.context, readManualProjectId());
    if (!reportContext) {
      renderEmptyReport();
      renderTagFilter();
      showMessage('Введите ID проекта, чтобы загрузить отчет по задачам.');
      scheduleFrameResize();
      return;
    }

    showMessage('Загрузка...');

    try {
      const response = await fetch(`/api/report?${buildQuery().toString()}`);
      let payload;

      try {
        payload = await response.json();
      } catch (error) {
        throw new Error(`Сервис отчета вернул ответ ${response.status}. Проверьте VIBECODE_API_KEY и доступность /api/report.`);
      }

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Не удалось загрузить отчет.');
      }

      renderReport(payload.data);
      setAvailableTags(payload.data);
      rememberCurrentTagSet();
      renderTagFilter();
      showMessage(payload.data.rows.length ? '' : 'По выбранным фильтрам задачи не найдены.');
      scheduleFrameResize();
    } catch (error) {
      showMessage(error.message, 'error');
      scheduleFrameResize();
    }
  }

  function loadReportFromFirstPage() {
    state.pagination.page = 1;
    return loadReport();
  }

  async function refreshReport() {
    const refreshButton = document.getElementById('refreshReportButton');
    const printButton = document.getElementById('printButton');

    if (refreshButton) {
      refreshButton.disabled = true;
      refreshButton.textContent = 'Обновление...';
    }
    if (printButton) {
      printButton.disabled = true;
    }

    try {
      await loadReport();
    } finally {
      if (refreshButton) {
        refreshButton.disabled = false;
        refreshButton.textContent = 'Обновить';
      }
      if (printButton) {
        printButton.disabled = false;
      }
    }
  }

  document.getElementById('refreshReportButton').addEventListener('click', function () {
    refreshReport().catch(function (error) {
      showMessage(error.message, 'error');
    });
  });

  document.getElementById('printButton').addEventListener('click', function () {
    printCurrentReport();
  });

  bindRangePickers();
  bindFiltersForm();
  syncManualProjectField();
  bindManualProjectField();
  bindStatusPicker();
  bindTagFilter();
  bindSorting();
  bindPagination();
  renderTagFilter();
  window.addEventListener('resize', function () {
    scheduleFrameResize();
  });
  loadReport();
})();


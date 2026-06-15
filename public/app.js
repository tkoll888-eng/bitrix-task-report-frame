(function () {
  const STORAGE_KEY = 'taskReportSavedTagSets';
  const QUICK_TAG_SET_LIMIT = 5;
  const SUGGESTION_LIMIT = 8;

  const previewReport = {
    totals: {
      plannedText: '119:00',
      spentText: '84:40',
    },
    rows: [
      {
        createdDateText: '03.03.2024',
        status: 5,
        statusLabel: 'Завершена',
        title: 'Разработка технического задания по модулю складского учета',
        titleUrl: '#task-1',
        plannedText: '16:00',
        spentText: '18:30',
        closedDateText: '15.03.2024',
        deadlineText: '14.03.2024',
        tags: ['ТЗ', 'Склад'],
      },
      {
        createdDateText: '06.03.2024',
        status: 3,
        statusLabel: 'Выполняется',
        title: 'Внедрение CRM-системы в отдел продаж',
        titleUrl: '#task-3',
        plannedText: '40:00',
        spentText: '22:15',
        closedDateText: '',
        deadlineText: '31.03.2024',
        tags: ['CRM', 'IT', 'Продажи'],
      },
    ],
  };

  const state = {
    context: readContext(),
    report: null,
    selectedTags: [],
    availableTags: [],
    savedTagSets: readSavedTagSets(),
    isTagFilterOpen: false,
    sort: { key: '', direction: 'asc' },
    bitrixReadyPromise: null,
  };

  const STATUS_OPTIONS = [
    { value: '2', label: 'Ждёт выполнения' },
    { value: '3', label: 'Выполняется' },
    { value: '4', label: 'Ожидает контроля' },
    { value: '5', label: 'Завершена' },
    { value: '6', label: 'Отложена' },
    { value: '7', label: 'Отклонена' },
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

  function filterPreviewReport(report, filters) {
    const selectedTags = normalizeTagSet(filters.tags || []).map(function (tag) {
      return tag.toLowerCase();
    });

    if (selectedTags.length === 0) {
      return report;
    }

    return {
      totals: report.totals,
      rows: (report.rows || []).filter(function (row) {
        return (row.tags || []).some(function (tag) {
          const normalizedTag = String(tag || '').toLowerCase();
          return selectedTags.some(function (selectedTag) {
            return normalizedTag.includes(selectedTag);
          });
        });
      }),
    };
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

  function getSelectedStatuses() {
    return Array.from(document.querySelectorAll('input[name="statusFilter"]:checked')).map(
      function (input) {
        return input.value;
      },
    );
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
    const params = new URLSearchParams({
      entityTypeId: String(state.context.entityTypeId || ''),
      itemId: String(state.context.itemId || ''),
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

  function compareRows(left, right, key) {
    const leftValue = getSortValue(left, key);
    const rightValue = getSortValue(right, key);

    if (typeof leftValue === 'number' || typeof rightValue === 'number') {
      return Number(leftValue || 0) - Number(rightValue || 0);
    }

    return String(leftValue || '').localeCompare(String(rightValue || ''), 'ru', {
      numeric: true,
      sensitivity: 'base',
    });
  }

  function getSortedRows(rows) {
    if (!state.sort.key) {
      return rows.slice();
    }

    const direction = state.sort.direction === 'desc' ? -1 : 1;
    return rows.slice().sort(function (left, right) {
      return compareRows(left, right, state.sort.key) * direction;
    });
  }

  function syncSortButtons() {
    document.querySelectorAll('[data-sort-key]').forEach(function (button) {
      const isActive = button.getAttribute('data-sort-key') === state.sort.key;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-sort', isActive ? state.sort.direction : 'none');
      button.setAttribute('data-sort-direction', isActive ? state.sort.direction : '');
    });
  }

  function getTaskPath(titleUrl) {
    try {
      return new URL(titleUrl, window.location.origin).pathname;
    } catch (error) {
      return '';
    }
  }

  function navigateToTask(titleUrl) {
    window.location.href = titleUrl;
  }

  function scheduleFrameResize() {
    const bx24 = window.BX24;
    if (!bx24 || typeof bx24.resizeWindow !== 'function') {
      return;
    }

    window.setTimeout(function () {
      const height = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        window.innerHeight,
      );
      const width = Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
        window.innerWidth,
      );

      try {
        bx24.resizeWindow(width, height);
      } catch (error) {
        // Frame resizing is best-effort; the report should remain usable locally.
      }
    }, 0);
  }

  function ensureBitrixReady() {
    const bx24 = window.BX24;
    if (!bx24 || typeof bx24.openPath !== 'function') {
      return Promise.resolve(null);
    }

    if (typeof bx24.isReady === 'function' && bx24.isReady()) {
      return Promise.resolve(bx24);
    }

    if (state.bitrixReadyPromise) {
      return state.bitrixReadyPromise;
    }

    if (typeof bx24.init !== 'function') {
      return Promise.resolve(bx24);
    }

    state.bitrixReadyPromise = new Promise(function (resolve) {
      let resolved = false;
      const finish = function () {
        if (resolved) {
          return;
        }

        resolved = true;
        resolve(bx24);
      };

      try {
        bx24.init(finish);
      } catch (error) {
        resolve(null);
        return;
      }

      window.setTimeout(finish, 1500);
    });

    return state.bitrixReadyPromise;
  }

  function openTask(row, event) {
    if (!row.titleUrl || row.titleUrl === '#') {
      return;
    }

    event.preventDefault();
    const path = getTaskPath(row.titleUrl);
    const hasBitrixSdk = Boolean(window.BX24);

    ensureBitrixReady().then(function (bx24) {
      if (!bx24 || !path || typeof bx24.openPath !== 'function') {
        if (hasBitrixSdk) {
          showMessage('Не удалось открыть задачу через window.BX24.openPath.', 'error');
          return;
        }

        navigateToTask(row.titleUrl);
        return;
      }

      try {
        bx24.openPath(path, function () {
          loadReport();
        });
      } catch (error) {
        showMessage('Не удалось открыть задачу через window.BX24.openPath.', 'error');
      }
    }).catch(function () {
      if (hasBitrixSdk) {
        showMessage('Не удалось открыть задачу через window.BX24.openPath.', 'error');
        return;
      }

      navigateToTask(row.titleUrl);
    });
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

  function renderPrintMeta(report) {
    const root = document.getElementById('printMeta');
    if (!root) {
      return;
    }

    root.innerHTML = '';

    const heading = document.createElement('h1');
    heading.textContent = (report.header && report.header.companyReportName) || 'Отчет по задачам';
    root.appendChild(heading);

    appendPrintMetaLine(root, 'Объект', report.header && report.header.objectName);
    appendPrintMetaLine(root, 'Компания', report.header && report.header.companyName);
    appendPrintMetaLine(root, 'Период', report.header && (report.header.completionText || report.header.periodText));
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
    loadReport();
  }

  function removeSelectedTag(tag) {
    state.selectedTags = state.selectedTags.filter(function (selectedTag) {
      return selectedTag.toLowerCase() !== String(tag).toLowerCase();
    });
    renderTagFilter();
    loadReport();
  }

  function applySavedTagSet(tagSet) {
    state.selectedTags = cleanTagSet(tagSet);
    clearTagSearch();
    state.isTagFilterOpen = false;
    renderTagFilter();
    loadReport();
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

    const selected = Array.from(document.querySelectorAll('input[name="statusFilter"]:checked'));
    if (selected.length === 0 || selected.length === STATUS_OPTIONS.length) {
      summary.textContent = 'Все статусы';
      return;
    }

    if (selected.length === 1) {
      summary.textContent = selected[0].getAttribute('data-label') || selected[0].value;
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
        loadReport();
      });
      if (start) {
        start.addEventListener('change', function () {
          syncRangeSummary(key, now);
          loadReport();
        });
      }
      if (end) {
        end.addEventListener('change', function () {
          syncRangeSummary(key, now);
          loadReport();
        });
      }

      sync();
    });
  }

  function bindStatusPicker() {
    const picker = document.getElementById('statusPicker');
    const inputs = document.querySelectorAll('input[name="statusFilter"]');

    inputs.forEach(function (input) {
      input.addEventListener('change', function () {
        syncStatusSummary();
        loadReport();
      });
    });

    document.addEventListener('click', function (event) {
      if (picker && picker.open && !picker.contains(event.target)) {
        picker.open = false;
      }
    });

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
      loadReport();
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

  function renderReport(report) {
    state.report = report;
    renderPrintMeta(report);
    document.getElementById('planned-total').textContent = report.totals.plannedText || '0:00';
    document.getElementById('spent-total').textContent = report.totals.spentText || '0:00';
    document.getElementById('task-count').textContent = String(report.rows.length);

    const rowsRoot = document.getElementById('report-rows');
    rowsRoot.innerHTML = '';

    getSortedRows(report.rows || []).forEach(function (row) {
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
      link.textContent = row.title || '';
      link.addEventListener('click', function (event) {
        openTask(row, event);
      });
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
  }

  async function loadReport() {
    if (!state.context.entityTypeId || !state.context.itemId) {
      const filteredPreviewReport = filterPreviewReport(previewReport, readFilters());
      renderReport(filteredPreviewReport);
      setAvailableTags(previewReport);
      renderTagFilter();
      showMessage(filteredPreviewReport.rows.length
        ? 'Для локальной проверки добавьте в URL параметры entityTypeId и itemId, например ?entityTypeId=184&itemId=123.'
        : 'По выбранным фильтрам задачи не найдены.');
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

  document.getElementById('printButton').addEventListener('click', function () {
    window.print();
  });

  bindRangePickers();
  bindFiltersForm();
  bindStatusPicker();
  bindTagFilter();
  bindSorting();
  renderTagFilter();
  window.addEventListener('resize', scheduleFrameResize);
  loadReport();
})();

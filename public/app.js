(function () {
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
        positionName: 'Руководитель проекта',
        tags: ['ТЗ', 'Склад'],
      },
      {
        createdDateText: '06.03.2024',
        status: 3,
        statusLabel: 'В работе',
        title: 'Внедрение CRM-системы в отдел продаж',
        titleUrl: '#task-3',
        plannedText: '40:00',
        spentText: '22:15',
        closedDateText: '',
        deadlineText: '31.03.2024',
        positionName: 'IT-специалист',
        tags: ['CRM', 'IT', 'Продажи'],
      },
    ],
  };

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
        return { entityTypeId: match && match[1], itemId: parsed.ID };
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

  function getPresetRange(preset, now) {
    if (preset === 'today') {
      const today = toDateOnly(now);
      return { from: today, to: today };
    }

    if (preset === 'currentWeek') {
      const day = now.getDay() || 7;
      const from = new Date(now);
      from.setDate(now.getDate() - day + 1);
      const to = new Date(from);
      to.setDate(from.getDate() + 6);
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

  function showMessage(text, tone) {
    const node = document.getElementById('message');
    if (!node) {
      return;
    }

    node.hidden = !text;
    node.textContent = text || '';
    node.className = tone === 'error' ? 'message is-error' : 'message';
  }

  function readFilters() {
    return {
      periodPreset: document.getElementById('periodPreset').value,
      periodFrom: document.querySelector('[data-range-start="period"]').value,
      periodTo: document.querySelector('[data-range-end="period"]').value,
      tagContains: document.getElementById('tagContains').value.trim(),
      completionPreset: document.getElementById('completionPreset').value,
      completionFrom: document.querySelector('[data-range-start="completion"]').value,
      completionTo: document.querySelector('[data-range-end="completion"]').value,
      status: document.getElementById('statusFilter').value,
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
    if (filters.status) {
      params.set('statuses', filters.status);
    }

    return params;
  }

  function getStatusTone(status) {
    return {
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

  function syncRangeSummary(key, now) {
    const control = document.querySelector(`[data-range-toggle="${key}"]`);
    const inline = document.querySelector(`[data-range-inline="${key}"]`);
    const start = document.querySelector(`[data-range-start="${key}"]`);
    const end = document.querySelector(`[data-range-end="${key}"]`);

    if (!control || !inline) {
      return;
    }

    if (control.value === 'custom') {
      inline.textContent = formatRangeText(start && start.value, end && end.value);
      return;
    }

    const range = getPresetRange(control.value, now);
    if (start) {
      start.value = range.from;
    }
    if (end) {
      end.value = range.to;
    }
    inline.textContent = formatRangeText(range.from, range.to);
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

  function renderReport(report) {
    state.report = report;
    document.getElementById('planned-total').textContent = report.totals.plannedText || '0:00';
    document.getElementById('spent-total').textContent = report.totals.spentText || '0:00';
    document.getElementById('task-count').textContent = String(report.rows.length);

    const rowsRoot = document.getElementById('report-rows');
    rowsRoot.innerHTML = '';

    report.rows.forEach(function (row) {
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
      link.rel = 'noopener';
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

      const position = document.createElement('td');
      position.textContent = row.positionName || '';
      tr.appendChild(position);

      const tags = document.createElement('td');
      tags.className = 'tags-cell';
      (row.tags || []).forEach(function (tagText) {
        tags.appendChild(createTag(tagText));
      });
      tr.appendChild(tags);

      rowsRoot.appendChild(tr);
    });
  }

  async function loadReport() {
    if (!state.context.entityTypeId || !state.context.itemId) {
      renderReport(previewReport);
      showMessage('Для локальной проверки добавьте в URL параметры entityTypeId и itemId, например ?entityTypeId=184&itemId=123.');
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
      showMessage(payload.data.rows.length ? '' : 'По выбранным фильтрам задачи не найдены.');
    } catch (error) {
      showMessage(error.message, 'error');
    }
  }

  document.getElementById('tagContains').addEventListener('change', loadReport);
  document.getElementById('statusFilter').addEventListener('change', loadReport);
  document.getElementById('printButton').addEventListener('click', function () {
    window.open(`/print.html?${buildQuery().toString()}`, '_blank', 'noopener');
  });

  bindRangePickers();
  loadReport();
})();

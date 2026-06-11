const previewReport = {
  plannedTotal: '119:00',
  spentTotal: '84:40',
  rows: [
    {
      createdAt: '03.03.2024',
      status: 'Завершена',
      statusTone: 'done',
      title: 'Разработка технического задания по модулю складского учета',
      url: '#task-1',
      planned: '16:00',
      spent: '18:30',
      completedAt: '15.03.2024',
      deadline: '14.03.2024',
      positionName: 'Руководитель проекта',
      tags: ['ТЗ', 'Склад'],
    },
    {
      createdAt: '05.03.2024',
      status: 'Завершена',
      statusTone: 'done',
      title: 'Согласование договора с ключевым поставщиком сырья',
      url: '#task-2',
      planned: '4:00',
      spent: '3:45',
      completedAt: '08.03.2024',
      deadline: '10.03.2024',
      positionName: 'Менеджер по закупкам',
      tags: ['Договор'],
    },
    {
      createdAt: '06.03.2024',
      status: 'В работе',
      statusTone: 'progress',
      title: 'Внедрение CRM-системы в отдел продаж',
      url: '#task-3',
      planned: '40:00',
      spent: '22:15',
      completedAt: '—',
      deadline: '31.03.2024',
      deadlineTone: 'warn',
      positionName: 'IT-специалист',
      tags: ['CRM', 'IT', 'Продажи'],
    },
    {
      createdAt: '07.03.2024',
      status: 'На проверке',
      statusTone: 'review',
      title: 'Тестирование интеграции с 1С:Бухгалтерия',
      url: '#task-4',
      planned: '8:00',
      spent: '9:10',
      completedAt: '—',
      deadline: '20.03.2024',
      deadlineTone: 'warn',
      positionName: 'Аналитик',
      tags: ['1С', 'Интеграция'],
    },
    {
      createdAt: '10.03.2024',
      status: 'В работе',
      statusTone: 'progress',
      title: 'Обучение сотрудников работе с новым модулем учета',
      url: '#task-5',
      planned: '12:00',
      spent: '6:00',
      completedAt: '—',
      deadline: '28.03.2024',
      deadlineTone: 'warn',
      positionName: 'Методолог',
      tags: ['Обучение'],
    },
    {
      createdAt: '11.03.2024',
      status: 'Отложена',
      statusTone: 'paused',
      title: 'Подготовка сводной отчетности за первый квартал 2024 года',
      url: '#task-6',
      planned: '6:00',
      spent: '0:00',
      completedAt: '—',
      deadline: '05.04.2024',
      deadlineTone: 'warn',
      positionName: 'Финансовый аналитик',
      tags: ['Отчёт', 'Q1'],
    },
    {
      createdAt: '12.03.2024',
      status: 'Завершена',
      statusTone: 'done',
      title: 'Аудит бизнес-процессов отдела закупок',
      url: '#task-7',
      planned: '20:00',
      spent: '19:30',
      completedAt: '25.03.2024',
      deadline: '25.03.2024',
      positionName: 'Бизнес-аналитик',
      tags: ['Аудит', 'Закупки'],
    },
    {
      createdAt: '13.03.2024',
      status: 'В работе',
      statusTone: 'progress',
      title: 'Разработка регламента взаимодействия между отделами',
      url: '#task-8',
      planned: '10:00',
      spent: '4:30',
      completedAt: '—',
      deadline: '29.03.2024',
      deadlineTone: 'warn',
      positionName: 'Руководитель проекта',
      tags: ['Регламент'],
    },
    {
      createdAt: '14.03.2024',
      status: 'Отменена',
      statusTone: 'cancelled',
      title: 'Настройка автоматической рассылки уведомлений',
      url: '#task-9',
      planned: '3:00',
      spent: '1:00',
      completedAt: '—',
      deadline: '18.03.2024',
      deadlineTone: 'warn',
      positionName: 'IT-специалист',
      tags: ['Автоматизация', 'IT'],
    },
  ],
};

function createTag(text) {
  const tag = document.createElement('span');
  tag.className = 'tag-chip';
  tag.textContent = text;
  return tag;
}

function createStatus(status, tone) {
  const wrap = document.createElement('span');
  wrap.className = `status status-${tone}`;

  const dot = document.createElement('span');
  dot.className = 'status-dot';
  wrap.appendChild(dot);

  const label = document.createElement('span');
  label.textContent = status;
  wrap.appendChild(label);

  return wrap;
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

  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}`;
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

function syncRangeSummary(key, now) {
  const control = document.querySelector(`[data-range-toggle="${key}"]`);
  const summary = document.querySelector(`[data-range-summary="${key}"]`);
  const inline = document.querySelector(`[data-range-inline="${key}"]`);
  const start = document.querySelector(`[data-range-start="${key}"]`);
  const end = document.querySelector(`[data-range-end="${key}"]`);

  if (!control) {
    return;
  }

  const setText = (text) => {
    if (summary) {
      summary.textContent = text;
    }
    if (inline) {
      inline.textContent = text;
    }
  };

  if (control.value === 'custom') {
    setText(formatRangeText(start?.value, end?.value));
    return;
  }

  const range = getPresetRange(control.value, now);
  setText(formatRangeText(range.from, range.to));
}

function renderPreview(report) {
  document.getElementById('planned-total').textContent = report.plannedTotal;
  document.getElementById('spent-total').textContent = report.spentTotal;
  document.getElementById('task-count').textContent = String(report.rows.length);

  const rowsRoot = document.getElementById('report-rows');
  rowsRoot.innerHTML = '';

  for (const row of report.rows) {
    const tr = document.createElement('tr');

    const createdAt = document.createElement('td');
    createdAt.textContent = row.createdAt;
    tr.appendChild(createdAt);

    const statusCell = document.createElement('td');
    statusCell.appendChild(createStatus(row.status, row.statusTone));
    tr.appendChild(statusCell);

    const titleCell = document.createElement('td');
    titleCell.className = 'title-cell';
    const link = document.createElement('a');
    link.className = 'task-link';
    link.href = row.url;
    link.textContent = row.title;
    titleCell.appendChild(link);
    tr.appendChild(titleCell);

    const planned = document.createElement('td');
    planned.className = 'numeric';
    planned.textContent = row.planned;
    tr.appendChild(planned);

    const spent = document.createElement('td');
    spent.className = 'numeric spent';
    spent.textContent = row.spent;
    tr.appendChild(spent);

    const completedAt = document.createElement('td');
    completedAt.textContent = row.completedAt;
    tr.appendChild(completedAt);

    const deadline = document.createElement('td');
    deadline.className = row.deadlineTone === 'warn' ? 'deadline-warn' : '';
    deadline.textContent = row.deadline;
    tr.appendChild(deadline);

    const position = document.createElement('td');
    position.textContent = row.positionName;
    tr.appendChild(position);

    const tags = document.createElement('td');
    tags.className = 'tags-cell';
    for (const tagText of row.tags) {
      tags.appendChild(createTag(tagText));
    }
    tr.appendChild(tags);

    rowsRoot.appendChild(tr);
  }
}

function bindRangePickers() {
  const controls = document.querySelectorAll('[data-range-toggle]');
  const now = new Date();

  for (const control of controls) {
    const key = control.getAttribute('data-range-toggle');
    const picker = document.querySelector(`[data-range-picker="${key}"]`);
    const start = document.querySelector(`[data-range-start="${key}"]`);
    const end = document.querySelector(`[data-range-end="${key}"]`);
    if (!picker) {
      continue;
    }

    const sync = () => {
      picker.hidden = control.value !== 'custom';
      syncRangeSummary(key, now);
    };

    control.addEventListener('change', sync);
    start?.addEventListener('input', () => syncRangeSummary(key, now));
    end?.addEventListener('input', () => syncRangeSummary(key, now));
    sync();
  }
}

renderPreview(previewReport);
bindRangePickers();

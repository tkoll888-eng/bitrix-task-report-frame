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

renderPreview(previewReport);

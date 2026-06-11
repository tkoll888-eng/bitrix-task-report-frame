const previewReport = {
  objectName: 'Монтаж системы вентиляции',
  companyName: 'ООО Альфа Инжиниринг',
  periodLabel: 'Июнь 2026',
  plannedTotal: '24:00',
  spentTotal: '17:35',
  rows: [
    {
      createdAt: '2026-06-02',
      status: 'В работе',
      title: 'Подготовить спецификацию материалов',
      url: '#task-1',
      planned: '8:00',
      spent: '5:10',
      completedAt: '2026-06-05',
      deadline: '2026-06-06 18:00',
      positionName: 'Воздуховоды',
      tags: 'монтаж, смета',
    },
    {
      createdAt: '2026-06-04',
      status: 'Ждет контроля',
      title: 'Согласовать монтажную бригаду',
      url: '#task-2',
      planned: '6:00',
      spent: '4:25',
      completedAt: '2026-06-07',
      deadline: '2026-06-07 12:00',
      positionName: 'Пусконаладка',
      tags: 'согласование',
    },
    {
      createdAt: '2026-06-06',
      status: 'Завершена',
      title: 'Проверить итоговый акт выполненных работ',
      url: '#task-3',
      planned: '10:00',
      spent: '8:00',
      completedAt: '2026-06-08',
      deadline: '2026-06-08 17:00',
      positionName: 'Акт',
      tags: 'документы',
    },
  ],
};

function renderPreview(report) {
  document.getElementById('object-name').textContent = report.objectName;
  document.getElementById('company-name').textContent = report.companyName;
  document.getElementById('period-name').textContent = report.periodLabel;
  document.getElementById('planned-total').textContent = report.plannedTotal;
  document.getElementById('spent-total').textContent = report.spentTotal;

  const rowsRoot = document.getElementById('report-rows');
  rowsRoot.innerHTML = '';

  for (const row of report.rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.createdAt}</td>
      <td><span class="status-pill">${row.status}</span></td>
      <td><a class="task-link" href="${row.url}">${row.title}</a></td>
      <td>${row.planned}</td>
      <td>${row.spent}</td>
      <td>${row.completedAt}</td>
      <td>${row.deadline}</td>
      <td>${row.positionName}</td>
      <td>${row.tags}</td>
    `;
    rowsRoot.appendChild(tr);
  }
}

renderPreview(previewReport);

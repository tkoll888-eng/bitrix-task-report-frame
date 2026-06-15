(function () {
  function parseReportResponseText(responseMeta) {
    const normalizedType = String(responseMeta.contentType || '').toLowerCase();

    if (normalizedType.includes('json')) {
      let payload = null;
      try {
        payload = JSON.parse(responseMeta.text);
      } catch (error) {
        return {
          success: false,
          message: 'Сервис отчета вернул поврежденный JSON. Проверьте ответ /api/report.',
        };
      }

      if (!responseMeta.ok || !payload.success) {
        return {
          success: false,
          message: payload.message || `Ошибка сервиса отчета (${responseMeta.status}).`,
        };
      }

      return {
        success: true,
        data: payload.data,
      };
    }

    if (String(responseMeta.text || '').trim().startsWith('<')) {
      return {
        success: false,
        message: 'Сервис отчета вернул HTML вместо JSON. Проверьте адрес /api/report и параметры печати.',
      };
    }

    return {
      success: false,
      message: `Сервис отчета вернул неожиданный ответ (${responseMeta.status}).`,
    };
  }

  function escapeHtml(value) {
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

  function renderTable(rows, totals) {
    const body = rows.map(function (row) {
      return `
        <tr>
          <td>${escapeHtml(row.createdDateText)}</td>
          <td>${escapeHtml(row.statusLabel)}</td>
          <td class="title-cell">${escapeHtml(row.title)}</td>
          <td class="numeric">${escapeHtml(row.plannedText)}</td>
          <td class="numeric spent">${escapeHtml(row.spentText)}</td>
          <td>${escapeHtml(row.closedDateText || '—')}</td>
          <td>${escapeHtml(row.deadlineText || '—')}</td>
        </tr>
      `;
    }).join('');

    return `
      <table>
        <thead>
          <tr>
            <th>Дата создания</th>
            <th>Статус</th>
            <th>Название</th>
            <th>План</th>
            <th>Факт</th>
            <th>Дата завершения</th>
            <th>Крайний срок</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
      <section class="totals-strip">
        <div class="totals-item">
          <span>Плановые трудозатраты</span>
          <strong>${escapeHtml(totals.plannedText || '0:00')}</strong>
        </div>
        <div class="totals-item">
          <span>Затраченное время</span>
          <strong>${escapeHtml(totals.spentText || '0:00')}</strong>
        </div>
        <div class="totals-count">
          <span>Количество задач</span>
          <strong>${escapeHtml(String(rows.length))}</strong>
        </div>
      </section>
    `;
  }

  async function loadPrintReport() {
    const response = await fetch(`/api/report?${window.location.search.slice(1)}`);
    const text = await response.text();
    const payload = parseReportResponseText({
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type'),
      text,
    });

    if (!payload.success) {
      document.body.textContent = payload.message || 'Не удалось загрузить печатную форму.';
      return;
    }

    const report = payload.data;
    document.querySelector('#reportMeta').innerHTML = `
      <div>${escapeHtml(report.header.companyReportName)}</div>
      <div>Объект: ${escapeHtml(report.header.objectName)}</div>
      <div>Компания: ${escapeHtml(report.header.companyName)}</div>
      <div>Период: ${escapeHtml(report.header.completionText || report.header.periodText)}</div>
    `;
    document.querySelector('#tableHost').innerHTML = renderTable(report.rows, report.totals);
  }

  document.querySelector('#printNowButton').addEventListener('click', function () {
    window.print();
  });

  loadPrintReport().catch(function (error) {
    document.body.textContent = error.message;
  });
})();

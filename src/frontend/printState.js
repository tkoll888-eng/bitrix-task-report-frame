function parseReportResponseText({ ok, status, contentType, text }) {
  const normalizedType = String(contentType || '').toLowerCase();

  if (normalizedType.includes('json')) {
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch (error) {
      return {
        success: false,
        message: 'Сервис отчета вернул поврежденный JSON. Проверьте ответ /api/report.',
      };
    }

    if (!ok || !payload.success) {
      return {
        success: false,
        message: payload.message || `Ошибка сервиса отчета (${status}).`,
      };
    }

    return {
      success: true,
      data: payload.data,
    };
  }

  if (String(text || '').trim().startsWith('<')) {
    return {
      success: false,
      message: 'Сервис отчета вернул HTML вместо JSON. Проверьте адрес /api/report и параметры печати.',
    };
  }

  return {
    success: false,
    message: `Сервис отчета вернул неожиданный ответ (${status}).`,
  };
}

function cleanFilenamePart(value) {
  return String(value || '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildPrintDocumentTitle(report) {
  const header = report?.header || {};
  const companyName = cleanFilenamePart(header.companyName || 'Контрагент');
  const period = cleanFilenamePart(
    header.printCompletionText || header.completionText || header.periodText || 'Период',
  );

  return cleanFilenamePart(`${companyName} ${period}`) || 'Отчет по задачам';
}

module.exports = { parseReportResponseText, buildPrintDocumentTitle };

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

module.exports = { parseReportResponseText };

function readContextFromSearch(search) {
  const params = new URLSearchParams(search);
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
      return { entityTypeId: match?.[1], itemId: parsed.ID };
    } catch (error) {
      return {};
    }
  }

  return {};
}

function buildReportQuery({ context, filters }) {
  const params = new URLSearchParams({
    entityTypeId: String(context.entityTypeId || ''),
    itemId: String(context.itemId || ''),
    periodPreset: filters.periodPreset || 'currentMonth',
    tagContains: filters.tagContains || '',
    completionPreset: filters.completionPreset || 'currentMonth',
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

module.exports = { readContextFromSearch, buildReportQuery };

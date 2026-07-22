const MANUAL_MODE_ENTITY_TYPE_ID = '184';

function readContextFromSearch(search) {
  const params = new URLSearchParams(search);
  const getParam = (name) => params.get(name) || params.get(name.toLowerCase()) || params.get(name.toUpperCase());
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
      return { entityTypeId: match?.[1], itemId: parsed.ID || parsed.id };
    } catch (error) {
      return {};
    }
  }

  return {};
}

function isManualProjectMode(context = {}) {
  return !context.itemId;
}

function resolveReportContext({ context = {}, manualProjectId = '' }) {
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

function buildReportQuery({ context, filters }) {
  const tags = Array.isArray(filters.tags)
    ? filters.tags.map((value) => String(value || '').trim()).filter(Boolean)
    : String(filters.tags || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

  const params = new URLSearchParams({
    entityTypeId: String(context.entityTypeId || ''),
    itemId: String(context.itemId || ''),
    periodPreset: filters.periodPreset || 'allTime',
    tagContains: filters.tagContains || '',
    completionPreset: filters.completionPreset || 'allTime',
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

  tags.forEach((tag) => {
    params.append('tags', tag);
  });

  const statuses = Array.isArray(filters.statuses)
    ? filters.statuses.filter(Boolean)
    : String(filters.statuses || filters.status || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

  if (statuses.length > 0) {
    params.set('statuses', statuses.join(','));
  }

  return params;
}

module.exports = {
  MANUAL_MODE_ENTITY_TYPE_ID,
  readContextFromSearch,
  buildReportQuery,
  isManualProjectMode,
  resolveReportContext,
};

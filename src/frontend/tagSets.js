function normalizeTagSet(tags) {
  const firstByKey = new Map();

  (Array.isArray(tags) ? tags : []).forEach((tag) => {
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
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map((entry) => entry[1]);
}

function getTagSetKey(tags) {
  return normalizeTagSet(tags)
    .map((tag) => tag.toLowerCase())
    .join('|');
}

function cleanTagSet(tags) {
  const seen = new Set();

  return (Array.isArray(tags) ? tags : [])
    .map((tag) => String(tag || '').trim())
    .filter((tag) => {
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

function mergeSavedTagSet(savedSets, nextTags) {
  const normalizedNext = normalizeTagSet(nextTags);
  if (normalizedNext.length === 0) {
    return Array.isArray(savedSets) ? savedSets.slice() : [];
  }

  const nextKey = getTagSetKey(normalizedNext);
  const normalizedExisting = (Array.isArray(savedSets) ? savedSets : [])
    .map((set) => cleanTagSet(set))
    .filter((set) => set.length > 0);

  const existingMatch = normalizedExisting.find((set) => getTagSetKey(set) === nextKey);
  if (existingMatch) {
    return normalizedExisting.slice();
  }

  const withoutDuplicate = normalizedExisting.filter((set) => getTagSetKey(set) !== nextKey);
  return [normalizedNext, ...withoutDuplicate];
}

function filterAvailableTags(availableTags, selectedTags, query) {
  const selected = new Set(normalizeTagSet(selectedTags).map((tag) => tag.toLowerCase()));
  const needle = String(query || '').trim().toLowerCase();

  return normalizeTagSet(availableTags).filter((tag) => {
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

module.exports = {
  normalizeTagSet,
  mergeSavedTagSet,
  filterAvailableTags,
};

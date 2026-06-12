const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeTagSet,
  mergeSavedTagSet,
  filterAvailableTags,
} = require('../src/frontend/tagSets');

test('normalizeTagSet removes duplicates, trims values, and ignores order', () => {
  assert.deepEqual(
    normalizeTagSet([' Setup ', 'dev', 'setup', '', 'Dev ']),
    ['dev', 'Setup'],
  );
});

test('mergeSavedTagSet stores only unique sets regardless of tag order', () => {
  const savedSets = [
    ['Setup', 'Dev'],
  ];

  assert.deepEqual(
    mergeSavedTagSet(savedSets, ['dev', 'setup']),
    [['Setup', 'Dev']],
  );

  assert.deepEqual(
    mergeSavedTagSet(savedSets, ['Archive']),
    [['Archive'], ['Setup', 'Dev']],
  );
});

test('filterAvailableTags finds tags by partial text and excludes already selected tags', () => {
  assert.deepEqual(
    filterAvailableTags(
      ['Setup', 'DevOps', 'Archive'],
      ['setup'],
      'dev',
    ),
    ['DevOps'],
  );
});

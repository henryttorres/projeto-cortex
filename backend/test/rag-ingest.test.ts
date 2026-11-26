import assert from 'node:assert/strict';
import test from 'node:test';
import { splitRagContent } from '../src/rag-ingest';

test('splits source text into bounded overlapping chunks without losing tokens', () => {
  const words = Array.from({ length: 900 }, (_, index) => `conceito${index}`);
  const chunks = splitRagContent(words.join(' '));
  const preservedWords = new Set(chunks.join(' ').split(/\s+/));

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(chunk => chunk.length > 0 && chunk.length <= 1200));
  assert.ok(words.every(word => preservedWords.has(word)));
});

test('splits content with no whitespace and normalizes line endings', () => {
  const longWord = 'x'.repeat(2600);
  const chunks = splitRagContent(`${longWord}\r\n`);

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(chunk => chunk.length <= 1200));
  assert.ok(chunks.some(chunk => chunk.includes('x')));
});

test('returns no chunks for whitespace-only input', () => {
  assert.deepEqual(splitRagContent(' \r\n\t '), []);
});

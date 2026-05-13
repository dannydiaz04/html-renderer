import assert from 'node:assert/strict';
import test from 'node:test';

import { validateHtmlContent } from '../lib/validateHtml.js';

test('accepts HTML that starts with a doctype', () => {
  assert.deepEqual(validateHtmlContent('<!DOCTYPE html><html><body>ok</body></html>'), { ok: true });
  assert.deepEqual(validateHtmlContent('<!doctype html><h1>ok</h1>'), { ok: true });
});

test('rejects empty content', () => {
  const result = validateHtmlContent('   ');

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'empty');
});

test('rejects markdown fences', () => {
  const result = validateHtmlContent('```html\n<!DOCTYPE html>\n<h1>Oops</h1>\n```');

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'markdown-fence');
});

test('rejects preamble before doctype', () => {
  const result = validateHtmlContent('Here is the file:\n<!DOCTYPE html><h1>Oops</h1>');

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'missing-doctype');
});

test('allows a leading UTF-8 BOM before doctype', () => {
  assert.deepEqual(validateHtmlContent('\uFEFF<!DOCTYPE html><h1>ok</h1>'), { ok: true });
});

import test from 'node:test';
import assert from 'node:assert/strict';

test('node:test and c8 compatibility smoke test', () => {
  assert.equal(2 + 2, 4);
});

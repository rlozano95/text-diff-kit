import assert from 'node:assert/strict';
import { test } from 'node:test';
import { diffLines, type DiffOp } from './diff.js';

function types(ops: DiffOp[]): string[] {
  return ops.map((op) => op.type);
}

test('two empty texts are equal and unchanged', () => {
  const { ops, changed } = diffLines('', '');
  assert.deepEqual(ops, []);
  assert.equal(changed, false);
});

test('old text empty, new text has content: everything is an insert', () => {
  const { ops, changed } = diffLines('', 'one\ntwo\n');
  assert.equal(changed, true);
  assert.deepEqual(types(ops), ['insert', 'insert']);
  assert.deepEqual(
    ops.map((op) => [op.line, op.oldLine, op.newLine]),
    [
      ['one', null, 1],
      ['two', null, 2],
    ],
  );
});

test('new text empty, old text has content: everything is a delete', () => {
  const { ops, changed } = diffLines('one\ntwo\n', '');
  assert.equal(changed, true);
  assert.deepEqual(types(ops), ['delete', 'delete']);
  assert.deepEqual(
    ops.map((op) => [op.line, op.oldLine, op.newLine]),
    [
      ['one', 1, null],
      ['two', 2, null],
    ],
  );
});

test('identical texts produce only equal ops and changed is false', () => {
  const text = 'one\ntwo\nthree\n';
  const { ops, changed } = diffLines(text, text);
  assert.equal(changed, false);
  assert.deepEqual(types(ops), ['equal', 'equal', 'equal']);
});

test('identical texts without a trailing newline are still equal', () => {
  const text = 'one\ntwo\nthree';
  const { ops, changed } = diffLines(text, text);
  assert.equal(changed, false);
  assert.deepEqual(types(ops), ['equal', 'equal', 'equal']);
});

test('a trailing newline is not treated as an extra blank line', () => {
  const withNewline = diffLines('one\ntwo\n', 'one\ntwo\n');
  const withoutNewline = diffLines('one\ntwo', 'one\ntwo');
  assert.equal(withNewline.ops.length, 2);
  assert.equal(withoutNewline.ops.length, 2);
});

test('a missing trailing newline alone is not treated as a change', () => {
  // splitLines() only strips a single trailing "\n" as an EOF marker, so
  // 'one\ntwo' and 'one\ntwo\n' both become ['one', 'two'] and compare equal.
  const { ops, changed } = diffLines('one\ntwo', 'one\ntwo\n');
  assert.equal(changed, false);
  assert.deepEqual(types(ops), ['equal', 'equal']);
});

test('a lone newline is one blank line, not two', () => {
  const { ops, changed } = diffLines('\n', '\n');
  assert.equal(changed, false);
  assert.deepEqual(ops, [{ type: 'equal', line: '', oldLine: 1, newLine: 1 }]);
});

test('a single inserted line in the middle keeps surrounding lines as equal', () => {
  const { ops, changed } = diffLines('one\ntwo\nthree\n', 'one\ntwo\ntwo and a half\nthree\n');
  assert.equal(changed, true);
  assert.deepEqual(types(ops), ['equal', 'equal', 'insert', 'equal']);
  assert.equal(ops[2]?.line, 'two and a half');
});

test('a single deleted line in the middle keeps surrounding lines as equal', () => {
  const { ops, changed } = diffLines('one\ntwo\nthree\n', 'one\nthree\n');
  assert.equal(changed, true);
  assert.deepEqual(types(ops), ['equal', 'delete', 'equal']);
  assert.equal(ops[1]?.line, 'two');
});

test('every line replaced still produces a matched pair of ops, not a wipe and rebuild', () => {
  const { ops, changed } = diffLines('a\nb\n', 'x\ny\n');
  assert.equal(changed, true);
  assert.equal(ops.length, 4);
  assert.deepEqual(types(ops).sort(), ['delete', 'delete', 'insert', 'insert']);
});

test('line numbers only advance for the side a line actually belongs to', () => {
  const { ops } = diffLines('one\ntwo\nthree\n', 'one\ntwo and a half\nthree\n');
  const delOp = ops.find((op) => op.type === 'delete');
  const insOp = ops.find((op) => op.type === 'insert');
  assert.deepEqual([delOp?.oldLine, delOp?.newLine], [2, null]);
  assert.deepEqual([insOp?.oldLine, insOp?.newLine], [null, 2]);
});

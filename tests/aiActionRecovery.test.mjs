import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

const source = readFileSync(new URL('../src/utils/aiActionRecovery.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const {hasUnverifiedAiAction, markUnverifiedAiAction, clearUnverifiedAiAction} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const memory = () => {
  const map = new Map();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k,v) => map.set(k,v), removeItem: (k) => map.delete(k) };
};

test('a failed confirmation leaves a warning across dialog recreation', () => {
  const storage = memory();
  markUnverifiedAiAction('employee-a', storage);
  assert.equal(hasUnverifiedAiAction('employee-a', storage), true);
  assert.equal(storage.map.size, 1);
  assert.equal([...storage.map.values()][0], '1');
});
test('a second account never inherits the first account warning', () => {
  const storage = memory();
  markUnverifiedAiAction('employee-a', storage);
  assert.equal(hasUnverifiedAiAction('employee-b', storage), false);
  markUnverifiedAiAction('employee-b', storage);
  clearUnverifiedAiAction('employee-a', storage);
  assert.equal(hasUnverifiedAiAction('employee-b', storage), true);
});
test('user reconciliation removes only that account warning', () => {
  const storage = memory();
  markUnverifiedAiAction('employee-a', storage);
  clearUnverifiedAiAction('employee-a', storage);
  assert.equal(hasUnverifiedAiAction('employee-a', storage), false);
});
test('empty/missing identity never writes a recovery marker', () => {
  const storage = memory();
  markUnverifiedAiAction('', storage);
  markUnverifiedAiAction(null, storage);
  assert.equal(storage.map.size, 0);
  assert.equal(hasUnverifiedAiAction(undefined, storage), false);
});
test('storage failures do not crash action recovery UI', () => {
  const denied = {getItem() {throw new Error('denied')},setItem() {throw new Error('denied')},removeItem() {throw new Error('denied')}};
  assert.doesNotThrow(() => markUnverifiedAiAction('employee-a', denied));
  assert.equal(hasUnverifiedAiAction('employee-a', denied), false);
  assert.doesNotThrow(() => clearUnverifiedAiAction('employee-a', denied));
});
test('no raw token or request payload is persisted', () => {
  const storage = memory();
  markUnverifiedAiAction('employee-a', storage);
  const serialized = JSON.stringify([...storage.map.entries()]);
  assert.ok(!serialized.includes('token'));
  assert.ok(!serialized.includes('payload'));
  assert.ok(!serialized.includes('confirmed'));
});

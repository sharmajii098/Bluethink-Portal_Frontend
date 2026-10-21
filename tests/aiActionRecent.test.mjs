import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui = readFileSync(new URL('../src/components/AiActionLauncher.tsx', import.meta.url), 'utf8');

test('an uncertain submission can show recent outcomes after the original token is lost', () => {
  assert.match(ui, /View recent action outcomes/);
  assert.match(ui, /api\.get<RecentAction\[]>\("\/ai\/actions\/recent"\)/);
  assert.match(ui, /recentActions\.map\(/);
});
test('recent outcome fetching does not silently acknowledge or retry an action', () => {
  const query = ui.slice(ui.indexOf('  const loadRecentActions ='), ui.indexOf('  const loadMonitor ='));
  assert.doesNotMatch(query, /clearUnverifiedAiAction|setRecoveryRequired\(false\)|\/ai\/actions\/confirm/);
  assert.match(ui, /Verify the actual portal record before acknowledging/);
});
test('recent outcome state is dropped upon account switch', () => {
  const reset = ui.slice(ui.indexOf('  useEffect(() => {'), ui.indexOf('  useEffect(() => {', ui.indexOf('  useEffect(() => {') + 1));
  assert.match(reset, /setRecentActions\(null\)/);
  assert.match(reset, /setRecentLoading\(false\)/);
  assert.match(reset, /session\?\.userId/);
});

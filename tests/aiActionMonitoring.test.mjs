import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const ui = readFileSync(new URL('../src/components/AiActionLauncher.tsx', import.meta.url),'utf8');
const service = readFileSync(new URL('../../bt-emp-portal/src/main/java/EmployeeManagementSystem/service/AiActionService.java', import.meta.url),'utf8');
const security = readFileSync(new URL('../../bt-emp-portal/src/main/java/EmployeeManagementSystem/config/SecurityConfig.java', import.meta.url),'utf8');
test('an uncertain confirmation does not get automatically replayed', () => {
  assert.match(ui, /setRecoveryToken\(preview\.token\)/);
  assert.match(ui, /disabled=\{busy \|\| recoveryRequired\}/);
  assert.match(ui, /markUnverifiedAiAction\(session\?\.userId\)/);
  assert.match(ui, /\/ai\/actions\/status/);
  assert.doesNotMatch(ui, /await api\.post<Result>\("\/ai\/actions\/confirm"[\s\S]*?catch \([^)]*\) \{[\s\S]*?await api\.post<Result>\("\/ai\/actions\/confirm"/);
});
test('monitoring is admin-only on UI, HTTP route and service layer', () => {
  assert.match(ui, /role === "ADMIN" && <Box/);
  assert.match(security, /"\/api\/ai\/actions\/monitor", "\/api\/ai\/actions\/diagnostics"(?:, "\/api\/ai\/model-health")?\)\.hasRole\("ADMIN"\)/);
  assert.match(service, /if \(!"ROLE_ADMIN"\.equals\(me\.role\(\)\)\)/);
});
test('status never equates a consumed token with committed business success', () => {
  assert.match(service, /"CONSUMED" -> "A submission was attempted/);
  assert.match(service, /case "COMMITTED" -> "The server recorded a receipt/);
  assert.match(ui, /Do not submit another draft until you inspect the originating module/);
});

test('only atomic in-transaction receipts can show committed state', () => {
  const store = readFileSync(new URL('../../bt-emp-portal/src/main/java/EmployeeManagementSystem/service/AiActionTokenStore.java', import.meta.url), 'utf8');
  const repo = readFileSync(new URL('../../bt-emp-portal/src/main/java/EmployeeManagementSystem/repository/AiActionPreviewRepository.java', import.meta.url), 'utf8');
  assert.match(service, /tokenStore\.recordCommit\(token, me\.username\(\), me\.role\(\), result\.reference\(\)\)/);
  assert.match(service, /@Override public void afterCommit\(\) \{ audit\.record\(event, "SUCCESS"\); \}/);
  assert.match(store, /@Transactional\(propagation = Propagation\.MANDATORY\)/);
  assert.match(store, /"CONSUMED"\.equals\(state\) && row\.getCommittedAt\(\) != null/);
  assert.match(repo, /p\.state = 'CONSUMED' and p\.committedAt is null/);
  assert.match(ui, /recoveryStatus\?\.state === "COMMITTED"/);
  assert.match(ui, /Recorded commit receipts/);
});

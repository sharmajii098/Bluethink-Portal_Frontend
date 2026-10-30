import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const main = read('src/main.tsx');
const layout = read('src/pages/RoleDashboard.tsx');
const login = read('src/pages/auth/LoginPage.tsx');
const signature = read('src/pages/auth/LoginSignature.css');
const roles = read('src/styles/v28_5-signature-workspaces.css');
const ai = read('src/components/AiChatWidget.tsx');
const theme = read('src/theme.ts');

test('signature four-role stylesheet loads after legacy style layers', () => {
  assert.ok(main.lastIndexOf('v28_5-signature-workspaces.css') > main.lastIndexOf('workspace-premium.css'));
  for (const r of ['admin','hr','manager','employee']) assert.match(roles, new RegExp(`\\.th-app\\.bt-studio\\.bt-studio-${r}`));
});
test('each role has its own primary palette and materially different sidebar', () => {
  for (const hex of ['#1e344b','#737d69','#9b5645','#285b60']) {
    assert.ok(roles.toLowerCase().includes(hex), hex);
    assert.ok(roles.toLowerCase().includes(hex), hex);
  }
  for (const r of ['admin','hr','manager','employee']) assert.match(roles, new RegExp(`bt-studio-${r} \\.th-sidebar`));
});
test('full-height login preserves BlueThink identity and V28.5 layer compatibility', () => {
  assert.match(login, /<BlueThinkWordmark \/>/);
  assert.match(login, /LoginSignature\.css/);
  assert.match(login, /bt-login-role-(?:admin|hr)/);
  assert.match(signature, /min-height:\s*100dvh/);
  assert.match(signature, /max-width:\s*none\s*!important/);
  for (const hex of ['#1e344b','#737d69','#9b5645','#285b60']) assert.ok(signature.toLowerCase().includes(hex));
});
test('removed Insight/Activity first controls without touching dashboard data actions', () => {
  assert.doesNotMatch(layout, /Insight(?:s)? first|Activity first|bt-dashboard-view/);
  assert.match(layout, /DashboardToolbar role={role}/);
  assert.match(layout, /dashboard\.errors\.length/);
  assert.match(layout, /<AdminDashboard/);
});
test('Ask BlueThink is a circular B, preserves existing dialog lifecycle', () => {
  assert.match(ai, /bt-ai-launcher-round/);
  assert.match(ai, /bt-ai-monogram/);
  assert.match(ai, /aria-label="Open Ask BlueThink AI chat"/);
  assert.doesNotMatch(ai, /variant="extended"/);
  assert.match(ai, /aria-expanded={open}/);
  assert.match(ai, /setOpen\(true\)/);
  assert.match(ai, /toggleSize/);
  assert.match(ai, /minimize/);
  assert.match(ai, /sendMessage/);
  assert.match(roles, /border-radius:50%\s*!important/);
});
test('edited TS and TSX source parses cleanly', () => {
  for (const [path, src, kind] of [['role',layout,ts.ScriptKind.TSX],['login',login,ts.ScriptKind.TSX],['ai',ai,ts.ScriptKind.TSX],['theme',theme,ts.ScriptKind.TS]]) {
    const file=ts.createSourceFile(path,src,ts.ScriptTarget.Latest,true,kind);
    assert.equal(file.parseDiagnostics.length,0,`${path} syntax errors`);
  }
});

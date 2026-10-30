import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const get = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const css = get('src/styles/ui-v26-1.css');
const main = get('src/main.tsx');
const layout = get('src/components/AppLayout.tsx');
const settings = get('src/pages/SettingsPage.tsx');
const pref = get('src/utils/uiPreferences.ts');
const login = get('src/pages/auth/LoginPage.tsx');

test('v26.1 UI layer is loaded last to resolve historical conflicts', () => {
  assert.match(main, /styles\/enterprise-v26\.css/);
  assert.ok(main.lastIndexOf('styles/ui-v26-1.css') > main.lastIndexOf('styles/enterprise-v26.css'));
  assert.match(css, /max-width:\s*var\(--bt27-max-content\)\s*!important/);
  assert.match(css, /@media\s*\(max-width:\s*1100px\)/);
});

test('responsive layouts provide safe scrolling without altering app actions', () => {
  assert.match(css, /\.MuiTableContainer-root/);
  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /\.bt-auth\.bt26-auth\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.bt26-auth\s+\.bt-auth-hero\s*\{[^}]*min-height:\s*0\s*!important/s);
  assert.match(layout, /aria-label="Open navigation"/);
  assert.match(layout, /<AiChatWidget\s*\/>/);
});

test('all role classes use shared sizing preferences and BlueThink wordmark', () => {
  assert.match(layout, /bt-studio-\$\{role\.toLowerCase\(\)\}/);
  assert.match(layout, /bt27-width-\$\{uiPreferences\.contentWidth\}/);
  assert.match(layout, /bt27-density-\$\{uiPreferences\.density\}/);
  assert.match(layout, /bt27-text-\$\{uiPreferences\.textSize\}/);
  assert.match(layout, /bt27-sidebar-slim/);
  assert.match(layout, /<BlueThinkWordmark compact \/>/);
  assert.match(login, /<BlueThinkWordmark \/>/);
  for (const role of ['admin','hr','manager','employee']) assert.match(css, new RegExp(`bt-studio-${role}`));
});

test('UI preferences validate corrupted/unknown local storage', async () => {
  const result = ts.transpileModule(pref, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const utils = await import(`data:text/javascript;base64,${Buffer.from(result).toString('base64')}`);
  globalThis.localStorage = {getItem: () => '{broken'};
  assert.deepEqual(utils.readUiSettings(), utils.defaultUiSettings);
  globalThis.localStorage = {getItem: () => JSON.stringify({contentWidth:'400vw', density:'bad',textSize:'giant',sidebarCompact:'yes',notificationPolling:false,pollingSeconds:999})};
  const prefs = utils.readUiSettings();
  assert.equal(prefs.contentWidth, 'standard');
  assert.equal(prefs.density, 'comfortable');
  assert.equal(prefs.textSize, 'normal');
  assert.equal(prefs.sidebarCompact, false);
  assert.equal(prefs.notificationPolling, false);
  assert.equal(prefs.pollingSeconds, 30);
  let persisted, eventType;
  globalThis.localStorage = {setItem: (_k, v) => {persisted = JSON.parse(v)}};
  globalThis.window = {dispatchEvent: e => { eventType = e.type; }};
  utils.saveUiSettings({...utils.defaultUiSettings,contentWidth:'wide'});
  assert.equal(persisted.contentWidth,'wide');
  assert.equal(eventType,'hrms-settings-changed');
  delete globalThis.localStorage;
  delete globalThis.window;
});

test('display settings expose working save/reset and layout options', () => {
  assert.match(settings, /saveUiSettings\(settings\)/);
  assert.match(settings, /saveUiSettings\(defaultUiSettings\)/);
  for (const f of ['density','contentWidth','textSize','sidebarCompact']) assert.ok(settings.includes(f), f);
  assert.match(css,/bt27-settings-grid/);
});

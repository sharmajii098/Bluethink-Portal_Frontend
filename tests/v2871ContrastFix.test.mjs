import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css = readFileSync(new URL('../src/styles/v28_7_1-contrast-fix.css', import.meta.url),'utf8');
const main = readFileSync(new URL('../src/main.tsx', import.meta.url),'utf8');
const legacy = readFileSync(new URL('../src/styles/v28_7-material-workspaces.css', import.meta.url),'utf8');

test('contrast repair stylesheet loads after legacy role theme',()=>{
  assert.ok(main.includes('v28_7-material-workspaces.css'));
  assert.ok(main.includes('v28_7_1-contrast-fix.css'));
  assert.ok(main.indexOf('v28_7-material-workspaces.css') < main.indexOf('v28_7_1-contrast-fix.css'));
});

test('all four role themes remain unchanged while nav contrast overrides target real button spans',()=>{
  for (const role of ['admin','hr','manager','employee']) {
    assert.match(legacy,new RegExp(`bt-studio-${role}`));
  }
  assert.match(css,/nav\.th-menu button\.th-nav-button:not\(\.active\) \.th-nav-left > span/);
  assert.match(css,/nav\.th-menu button\.th-nav-button\.active :is\(span,svg\)/);
  assert.match(css,/--bt-side-text/);
  assert.match(css,/--bt-ink/);
});

test('dark dashboard banners have explicit white headings and status, including inherited text-fill',()=>{
  assert.match(css,/header\.bt-compact-dashboard-top \.bt-compact-dashboard-heading h1/);
  assert.match(css,/\.bt-compact-dashboard-kicker/);
  assert.match(css,/\.bt19-refresh-status/);
  assert.match(css,/color:#FFFFFF !important/);
  assert.match(css,/-webkit-text-fill-color:#FFFFFF !important/);
});

test('light profile text receives dark foreground and mobile navigation remains legible',()=>{
  assert.match(css,/\.th-profile\.th-profile-v6 \.th-profile-info strong/);
  assert.match(css,/\.th-profile-designation/);
  assert.match(css,/background:#FFFFFFF0 !important/);
  assert.match(css,/@media \(max-width:760px\)/);
});

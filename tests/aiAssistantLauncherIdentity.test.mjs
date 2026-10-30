import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const widget = read('src/components/AiChatWidget.tsx');
const css = read('src/styles/ai-assistant-button.css');
const main = read('src/main.tsx');

test('premium B and robot images alternate every four seconds without changing the chat', () => {
  assert.ok(statSync(new URL('../public/bluethink-ai-b-pro.webp', import.meta.url)).size > 10000);
  assert.ok(statSync(new URL('../public/bluethink-ai-robot-pro.webp', import.meta.url)).size > 10000);
  assert.match(widget, /src="\/bluethink-ai-b-pro\.webp"/);
  assert.match(widget, /src="\/bluethink-ai-robot-pro\.webp"/);
  assert.match(css, /bt-ai-brand-visible 8s/);
  assert.match(css, /bt-ai-robot-visible 8s/);
  assert.match(css, /bt-ai-ring-cycle 4s/);
  assert.match(widget, /setOpen\(true\)/);
  assert.match(widget, /<Dialog open=\{open\}/);
});

test('first-login label appears once per browser account, then on hover and focus', () => {
  assert.match(widget, /bt-ai-launcher-hint-v1:\$\{account\}/);
  assert.match(widget, /localStorage\.setItem\(key, "seen"\)/);
  assert.match(widget, /window\.setTimeout\(\(\) => setShowFirstLoginHint\(false\), 6500\)/);
  assert.match(widget, /BlueThink AI Assistant<\/span>/);
  assert.match(css, /:hover, :focus-within, \.bt-ai-intro-visible/);
  assert.match(widget, /aria-label="Open Ask BlueThink AI chat"/);
});

test('dock overrides legacy fixed Fab and respects reduced motion', () => {
  assert.ok(main.lastIndexOf('ai-assistant-button.css') > main.lastIndexOf('production.css'));
  assert.match(css, /position: relative !important;/);
  assert.match(css, /right: auto !important;/);
  assert.match(css, /bottom: auto !important;/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /conic-gradient/);
});

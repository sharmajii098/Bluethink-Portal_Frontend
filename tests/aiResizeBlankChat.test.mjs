import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
const widget = read('components/AiChatWidget.tsx');
const page = read('pages/BlueThinkChatPage.tsx');
const context = read('contexts/AiChatContext.tsx');
const routes = read('App.tsx');

test('resize toggles the existing popup instead of opening a separate route or blank screen', () => {
  assert.match(widget, /const \[maximized, setMaximized\] = useState\(false\)/);
  assert.match(widget, /function toggleSize\(\) \{[\s\S]*?setMaximized\(current => !current\)/);
  assert.match(widget, /<Dialog open=\{open\} onClose=\{minimize\} fullScreen=\{maximized\}/);
  assert.match(widget, /onClick=\{toggleSize\}/);
  assert.match(widget, /aria-label=\{maximized \? "Restore AI chat size" : "Maximize AI chat"\}/);
  assert.doesNotMatch(widget, /useNavigate|navigate\(/);
});

test('maximize, minimize and restore retain the shared prompt and conversation', () => {
  assert.match(widget, /const \{ messages, prompt, setPrompt, busy, error/);
  assert.match(widget, /function minimize\(\) \{[\s\S]*?setOpen\(false\);[\s\S]*?setMaximized\(false\);/);
  assert.doesNotMatch(widget, /function toggleSize\(\)[\s\S]*?resetChat\(\)/);
  assert.match(context, /<AiChatContext\.Provider value=\{\{ messages, setMessages, prompt, setPrompt, busy/);
  assert.match(context, /function resetChat\(\) \{[\s\S]*?setMessages\(\[\]\); setPrompt\(""\)/);
});

test('new AI conversations have empty message areas and empty composer drafts', () => {
  assert.doesNotMatch(widget, /How can I help\?|Show my support tickets|Show my expense claims|Show my training enrollments/);
  assert.doesNotMatch(page, /How can I help you today\?|Suggested for your role|bt-ai-topic-grid|portalTopics|showAllTopics/);
  assert.match(widget, /\{messages\.map\(message =>/);
  assert.match(page, /\{messages\.map\(\(message\) =>/);
  assert.match(context, /const \[messages, setMessages\] = useState<AiMessage\[]>\(\[\]\)/);
  assert.match(context, /const \[prompt, setPrompt\] = useState\(""\)/);
});

test('full-page assistant can render the Stop button during a pending request', () => {
  assert.match(page, /import \{[^}]*\bButton\b[^}]*\} from "@mui\/material"/);
  assert.match(page, /\{busy && <Button[^>]*onClick=\{cancelMessage\}/);
  assert.match(routes, /path=\{`\$\{b\}\/ai-assistant`\}[\s\S]*?element=\{<BlueThinkChatPage \/>\}/);
});

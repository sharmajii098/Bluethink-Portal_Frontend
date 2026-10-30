import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import ts from 'typescript';
const read = path => readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const ui = read('src/styles/v28_7-material-workspaces.css');
const loginCss = read('src/pages/auth/LoginMaterialsV287.css');
const entry = read('src/main.tsx');
const theme = read('src/theme.ts');
const ai = read('src/components/AiChatWidget.tsx');
const wordmark = read('src/components/BlueThinkWordmark.tsx');
const auth = read('src/pages/auth/LoginPage.tsx');

const roles = {
  admin: ['#194C7A','#C95C50','#F3F4F6'],
  hr: ['#245740','#987743','#F5F0E6'],
  manager: ['#523760','#906AA6','#F6F3F8'],
  employee: ['#416A90','#C86B61','#F3F5F8'],
};
const luminance = hex => {
  const channels=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16)/255)
    .map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
};
const ratio = (a,b) => {
  const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
};

test('V28.7 final role CSS follows all inherited design layers',()=>{
 assert.ok(entry.lastIndexOf('v28_7-material-workspaces.css')>entry.lastIndexOf('v28_6-wordmark.css'));
 assert.match(auth,/LoginMaterialsV287\.css/);
 assert.ok(auth.indexOf('LoginMaterialsV287.css')>auth.indexOf('LoginPaletteV286.css'));
});
test('four distinct palettes apply to all inner pages including AI and charts',()=>{
 for(const [role,[primary,accent,bg]] of Object.entries(roles)){
  const match=ui.match(new RegExp(`\\.th-app\\.bt-studio\\.bt-studio-${role} \\{([\\s\\S]*?)\\}`));
  assert.ok(match,`${role} missing`);
  for(const c of [primary,accent,bg])assert.ok(match[1].includes(c),`${role}: ${c}`);
  assert.ok(theme.includes(primary),`${role} missing in MUI palette`);
  assert.ok(ui.includes(`.bt-ai-role-${role} {`),`${role} no popup role`);
 }
 for(const selector of ['.th-content','.th-page-shell','.MuiTableCell-head','.MuiCard-root','.bt9-stat','.bt-ai-page','.bt-ai-dialog'])
   assert.ok(ui.includes(selector),`${selector} not styled`);
});
test('high contrast on dark sidebar and light active items',()=>{
 for(const [role,[primary,,bg]] of Object.entries(roles)){
  assert.ok(ratio(primary,'#FFFFFF')>=4.5,`${role}: primary contrast too low`);
  assert.ok(ratio(primary,bg)>=4.5,`${role}: paper contrast too low`);
 }
 assert.match(ui,/\.th-subnav\.active/);
 assert.match(ui,/font-weight:740!important/);
 assert.match(ui,/:is\(\.th-nav-button,\.th-subnav,\.th-brand\):focus-visible/);
 assert.match(ui,/overflow-wrap:break-word!important/);
});
test('original official logo is visible and protected on login, sidebar, reset and exports',()=>{
 assert.match(wordmark,/bluethink-inc-official-master\.png/);
 assert.match(wordmark,/<img className="bt-official-logo-image"/);
 assert.match(ui,/\.th-brand\.bt-official-brand\.bt-wordmark-brand/);
 assert.match(ui,/background:#FFFFFF!important/);
 assert.match(read('src/components/AppLayout.tsx'), /<BlueThinkWordmark compact \/>/);
 assert.match(auth,/<BlueThinkWordmark \/>/);
 assert.match(read('src/pages/auth/ResetPasswordPage.tsx'), /<BlueThinkWordmark \/>/);
 assert.match(read('src/components/PayslipDocument.tsx'),/ps-official-logo/);
 assert.match(read('src/utils/brandedExport.ts'),/import officialLogo/);
 assert.ok(statSync(new URL('../src/branding/bluethink-inc-official-master.png',import.meta.url)).size>100000);
});
test('full-screen branded login is responsive and uses all four colors',()=>{
 assert.match(loginCss,/min-height:100dvh/);
 assert.match(loginCss,/@media\(max-width:780px\)/);
 for(const [role,[primary]] of Object.entries(roles))assert.ok(loginCss.includes(primary),`${role} absent from login`);
 assert.match(loginCss,/bt-auth-input-wrap:focus-within/);
 assert.match(loginCss,/focus-visible/);
});
test('round B assistant remains functional and its popup receives the role',()=>{
 assert.match(ai,/bt-ai-launcher-round bt-ai-role-\$\{role\.toLowerCase\(\)\}/);
 assert.match(ai,/bt-ai-dialog bt-ai-role-\$\{role\.toLowerCase\(\)\}/);
 assert.match(ai,/bt-ai-dialog-header/);
 assert.match(ai,/bt-ai-dialog-conversation/);
 for(const s of ['setOpen(true)','toggleSize()','minimize()','sendMessage()'])assert.ok(ai.includes(s));
 assert.match(ui,/border-radius:50%!important/);
});
test('edited TypeScript parses without errors',()=>{
 for(const file of ['src/theme.ts','src/components/BlueThinkWordmark.tsx','src/components/AiChatWidget.tsx',
 'src/pages/BlueThinkChatPage.tsx','src/components/PayslipDocument.tsx','src/utils/brandedExport.ts']){
  const parsed=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length,0,file);
 }
});

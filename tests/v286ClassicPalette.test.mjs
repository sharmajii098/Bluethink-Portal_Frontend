import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read = relative => readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8');
const main=read('src/main.tsx'), css=read('src/styles/v28_6-palette-workspaces.css');
const auth=read('src/pages/auth/LoginPage.tsx'), authCss=read('src/pages/auth/LoginPaletteV286.css');
const layout=read('src/components/AppLayout.tsx'), wordmark=read('src/components/BlueThinkWordmark.tsx');
const ai=read('src/components/AiChatWidget.tsx'), theme=read('src/theme.ts');

test('new palette CSS follows legacy styles and defines four distinct combinations',()=>{
 assert.ok(main.indexOf('v28_6-palette-workspaces.css')>main.indexOf('v28_5-signature-workspaces.css'));
 const roles = [
  ['admin','#624231','#f1e5d6'],['hr','#505b3b','#e8d9c4'],
  ['manager','#a95337','#fbf8f2'],['employee','#42617e','#f0f1f3']
 ];
 for(const [role,primary,background] of roles){
  const block = css.split(`.th-app.bt-studio.bt-studio-${role} {`)[1]?.split('}')[0];
  assert.ok(block,`missing ${role} palette`);
  assert.ok(block.includes(primary),`${role} primary`);assert.ok(block.includes(background),`${role} background`);
  assert.ok(read("src/styles/v28_7-material-workspaces.css").includes(`bt-studio-${role}`),`${role} latest palette`);
  assert.match(css,new RegExp(`\.th-app\.bt-studio-${role} \.th-sidebar`));
 }
});
test('inherited full-screen login layer remains and V28.7 restores the official image',()=>{
 assert.match(auth,/LoginPaletteV286\.css/);
 assert.match(auth,/<BlueThinkWordmark \/>/);
 assert.match(read('src/components/BlueThinkWordmark.tsx'),/bluethink-inc-official-master\.png/);
 for(const swatch of ['#624231','#505b3b','#b05d40','#7896b3'])assert.ok(authCss.includes(swatch));
 assert.match(authCss,/min-height:100dvh/);
 assert.match(authCss,/@media\(max-width:780px\)/);
});
test('official company logo is restored to all entry and export surfaces',()=>{
 const files=['src/pages/auth/LoginPage.tsx','src/components/AppLayout.tsx',
 'src/pages/auth/ForgotPasswordPage.tsx','src/pages/auth/ResetPasswordPage.tsx',
 'src/pages/auth/ActivateAccountPage.tsx','src/components/PayslipDocument.tsx','src/utils/brandedExport.ts'];
 for(const name of files)assert.match(read(name),/BlueThinkWordmark|officialLogo|bluethink-inc-official-master\.png/,name);
 assert.match(layout,/<BlueThinkWordmark compact \/>/);
 assert.match(read('src/components/PayslipDocument.tsx'),/ps-official-logo/);
 assert.match(wordmark,/BlueThink Inc/);
});
test('round B AI launcher keeps its lifecycle and confirmation behavior',()=>{
 assert.match(ai,/bt-ai-launcher-round/);assert.match(ai,/bluethink-ai-b-pro\.webp/);assert.match(ai,/bluethink-ai-robot-pro\.webp/);
 for(const method of ['setOpen(true)','minimize()','toggleSize()','sendMessage()'])assert.ok(ai.includes(method),method);
 assert.match(css,/border-radius:50%!important/);
});
test('TypeScript edits parse cleanly',()=>{
 for(const file of ['src/components/BlueThinkWordmark.tsx','src/components/AppLayout.tsx',
  'src/pages/auth/LoginPage.tsx','src/pages/auth/ForgotPasswordPage.tsx',
  'src/pages/auth/ActivateAccountPage.tsx','src/pages/auth/ResetPasswordPage.tsx',
  'src/components/PayslipDocument.tsx','src/utils/brandedExport.ts','src/theme.ts']){
   const source=read(file);const kind=file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS;
   const parsed=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,kind);
   assert.equal(parsed.parseDiagnostics.length,0,`${file} syntax invalid`);
  }
});

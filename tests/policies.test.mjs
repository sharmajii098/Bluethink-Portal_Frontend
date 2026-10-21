import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
async function loadUtility(path) {
  const source=readFileSync(new URL(path,import.meta.url),'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}
const {validPassword}=await loadUtility('../src/utils/passwordPolicy.ts');
const {localDate,recentReportStart}=await loadUtility('../src/utils/reportDates.ts');
test('reject short passwords',()=>assert.equal(validPassword('short123'),false));
test('require letters and numbers',()=>{
  assert.equal(validPassword('abcdefghijkl'),false);
  assert.equal(validPassword('123456789012'),false);
});
test('accept a valid password',()=>assert.equal(validPassword('abcdefghijkl1'),true));
test('BCrypt limit is 72 UTF-8 bytes',()=>{
  assert.equal(validPassword('a'.repeat(71)+'1'),true);
  assert.equal(validPassword('a'.repeat(72)+'1'),false);
  assert.equal(validPassword('é'.repeat(35)+'a1'),true);
  assert.equal(validPassword('é'.repeat(36)+'a1'),false);
});
test('report date uses the local calendar day at midnight',()=>{
  assert.equal(localDate(new Date(2026,9,18,0,5)),'2026-10-18');
});
test('report date pads single digit months and days',()=>assert.equal(localDate(new Date(2026,0,2,12)),'2026-01-02'));
test('report date keeps local day near midnight',()=>assert.equal(localDate(new Date(2026,9,18,23,55)),'2026-10-18'));
test('default report start is six calendar days before today',()=>{
  const expected=new Date();expected.setDate(expected.getDate()-6);
  assert.equal(recentReportStart(),localDate(expected));
});

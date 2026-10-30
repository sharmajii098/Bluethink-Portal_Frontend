import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync(new URL('../src/utils/loginLocations.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {summarizeLocations,mapLinks}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const record=(id,employeeId,time,mode='WFO')=>({id,employeeId,employeeName:employeeId,loginTime:`2026-10-22T${time}`,workMode:mode,latitude:28.6,longitude:77.2});
test('repeat logins collapse per person and preserve first and latest snapshots',()=>{
 const rows=[record(2,'A','12:00:00','WFH'),record(1,'A','09:00:00'),record(3,'B','10:00:00')];
 const groups=summarizeLocations(rows,'2026-10-22');assert.equal(groups.length,2);assert.equal(groups[0].count,2);assert.equal(groups[0].first.id,1);assert.equal(groups[0].latest.id,2);assert.equal(rows[0].id,2);
 assert.equal(summarizeLocations(rows,'2026-10-21').length,0);assert.equal(summarizeLocations(rows,'2026-10-22','B').length,1);assert.equal(summarizeLocations(rows,'2026-10-22','','WFH')[0].latest.employeeId,'A');
});
test('map links reject missing, non-finite and out-of-range coordinates, accepting equator',()=>{
 for(const latitude of [null,undefined,NaN,Infinity,91,'28.6'])assert.equal(mapLinks({latitude,longitude:77}),null);
 assert.equal(mapLinks({latitude:1,longitude:-181}),null);
 const result=mapLinks({latitude:0,longitude:0});assert.match(result.embed,/^https:\/\/www.openstreetmap.org\/export\/embed.html/);assert.match(result.full,/mlat=0/);
});

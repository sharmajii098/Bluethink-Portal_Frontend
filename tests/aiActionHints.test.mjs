import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const code=readFileSync(new URL('../src/utils/aiActionHints.ts',import.meta.url),'utf8');
const transformed=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const { suggestActionFields }=await import(`data:text/javascript;base64,${Buffer.from(transformed).toString('base64')}`);
test('support note is suggested but cannot trigger an action',()=>{
  const hint=suggestActionFields('Subject: Laptop will not start\nDescription: The display stays dark when turning on\nPriority: HIGH','SUPPORT_TICKET');
  assert.equal(hint.subject,'Laptop will not start');
  assert.equal(hint.priority,'HIGH');
  assert.match(hint.description,/display stays dark/);
  assert.equal(hint.userId,undefined);
});
test('expense extraction only uses explicit INR amount and date',()=>{
  const hint=suggestActionFields('Category: Travel\nAmount: 2,500.50\nExpense date: 2026-10-18\nDescription: Taxi from office to client','EXPENSE_CLAIM');
  assert.deepEqual([hint.category,hint.amount,hint.expenseDate],['Travel','2500.50','2026-10-18']);
  assert.equal(hint.description,'Taxi from office to client');
});
test('leave dates and reason can be extracted without inventing a leave type',()=>{
  const hint=suggestActionFields('Please apply from 2026-11-02 to 2026-11-05\nReason: Visiting my family','LEAVE_REQUEST');
  assert.equal(hint.startDate,'2026-11-02');
  assert.equal(hint.endDate,'2026-11-05');
  assert.equal(hint.reason,'Visiting my family');
  assert.equal(hint.leaveType,undefined);
});
test('timesheet extraction handles a straightforward hours request',()=>{
  const hint=suggestActionFields('Worked 7.5 hours on 2026-10-19\nTask: Client onboarding reports\nMode: WFH','TIMESHEET_ENTRY');
  assert.equal(hint.date,'2026-10-19'); assert.equal(hint.hoursWorked,'7.5');
  assert.equal(hint.taskDescription,'Client onboarding reports'); assert.equal(hint.workMode,'WFH');
});
test('reviews never prefill target, decision or rationale from chat text',()=>{
  assert.deepEqual(suggestActionFields('Approve leave #19 for an employee','REVIEW_LEAVE'),{});
  assert.deepEqual(suggestActionFields('Reject this timesheet','REVIEW_TIMESHEET'),{});
});
test('hostile field names are not treated as action permissions',()=>{
  const hint=suggestActionFields('Subject: Cannot connect\nuserId: admin\nrole: ADMIN\nDecision: APPROVED','SUPPORT_TICKET');
  for(const key of ['userId','role','decision','recordId','status']) assert.equal(hint[key],undefined);
});
test('HR request prefill only suggests editable fields',()=>{
  const h=suggestActionFields('Subject: Updated employment letter\nDescription: Need corrected role title\nCategory: DOCUMENTS\nPriority: HIGH\nuserId: other','HR_SERVICE_REQUEST');
  assert.equal(h.subject,'Updated employment letter');
  assert.equal(h.category,'DOCUMENTS');
  assert.equal(h.priority,'HIGH');
  for(const key of ['userId','role','recordId','status']) assert.equal(h[key],undefined);
});
test('overtime prefill uses explicit date and hours without approving request',()=>{
  const h=suggestActionFields('Work date: 2026-10-20\nHours: 2.5\nProject: Web portal\nReason: After hours release work\nCompensation: PAYMENT','OVERTIME_REQUEST');
  assert.equal(h.workDate,'2026-10-20');
  assert.equal(h.hours,'2.5');
  assert.equal(h.compensationMode,'PAYMENT');
  assert.equal(h.reason,'After hours release work');
  assert.equal(h.decision,undefined);
});

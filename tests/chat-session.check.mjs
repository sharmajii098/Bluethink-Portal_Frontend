// Development check: install matching react-test-renderer without saving it before running.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const requests=[];
globalThis.__chatTestApi={post(url,body,config){
  return new Promise((resolve,reject)=>{
    requests.push({url,body,config,resolve,reject});
    config.signal.addEventListener('abort',()=>reject({code:'ERR_CANCELED'}),{once:true});
  });
}};
const file=new URL('./.chat-context-check.mjs',import.meta.url);
const source=readFileSync(new URL('../src/contexts/AiChatContext.tsx',import.meta.url),'utf8')
  .replace('import { api } from "../services/api";', 'const api = globalThis.__chatTestApi;');
writeFileSync(file,ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText);
let root;
try {
  const {AiChatProvider,useAiChat}=await import(file.href);
  const store=configureStore({reducer:{auth:()=>({session:{userId:'EMP1',role:'EMPLOYEE',token:'test-token'}})}});
  let chat;
  function Probe({view}){chat=useAiChat();return React.createElement('div',null,view);}
  const tree=view=>React.createElement(Provider,{store},React.createElement(AiChatProvider,null,React.createElement(Probe,{view})));
  await act(async()=>{root=create(tree('popup'));});
  await act(async()=>{await chat.sendMessage('   ');});
  assert.equal(requests.length,0,'blank messages are ignored');
  let pending;
  await act(async()=>{pending=chat.sendMessage('Show my attendance');await chat.sendMessage('duplicate');});
  assert.equal(requests.length,1,'rapid duplicate send is blocked');
  assert.equal(chat.busy,true);assert.equal(chat.messages.length,1);
  assert.equal(requests[0].url,'/ai/chat');
  assert.equal(requests[0].config.headers.Authorization,'Bearer test-token');
  await act(async()=>{root.update(tree('full page'));});
  assert.equal(chat.messages[0].text,'Show my attendance','expanding retains conversation');
  assert.equal(chat.busy,true,'expanding retains pending status');
  await act(async()=>{requests[0].resolve({data:{answer:'Four records'}});await pending;});
  assert.equal(chat.messages[1].text,'Four records');assert.equal(chat.busy,false);
  await act(async()=>{root.update(tree('popup'));});
  assert.equal(chat.messages.length,2,'minimizing/returning retains both messages');
  await act(async()=>{pending=chat.sendMessage('Other employee records');});
  await act(async()=>{requests[1].reject({response:{status:403,data:{}}});await pending;});
  assert.match(chat.error,/Access denied/,'denial is visible');assert.equal(chat.busy,false);
  await act(async()=>{chat.resetChat();});
  assert.equal(chat.messages.length,0);assert.equal(chat.error,'');
  await act(async()=>{pending=chat.sendMessage('Pending request');chat.resetChat();});
  assert.equal(chat.messages.length,1,'New Chat cannot erase a pending conversation');
  await act(async()=>{root.unmount();});root=null;await pending;
  assert.equal(requests[2].config.signal.aborted,true,'logout/unmount aborts pending request');
  const secondStore=configureStore({reducer:{auth:()=>({session:{userId:'EMP2',role:'MANAGER',token:'second-token'}})}});
  await act(async()=>{root=create(React.createElement(Provider,{store:secondStore},React.createElement(AiChatProvider,null,React.createElement(Probe,{view:'new account'}))));});
  assert.equal(chat.messages.length,0,'a new signed-in session starts with no previous messages');
  assert.equal(chat.prompt,'');assert.equal(chat.error,'');
  console.log('PASS: shared chat state, duplicate-send guard, expansion, error handling, reset and cancellation');
} finally {if(root)await act(async()=>root.unmount());unlinkSync(file);delete globalThis.__chatTestApi;}

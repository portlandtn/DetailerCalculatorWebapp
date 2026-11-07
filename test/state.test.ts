import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_STATE,restoreState,persistState,validateState} from '../lib/state.ts';
test('migrates valid unversioned state and round trips a versioned record',()=>{
 const input={...DEFAULT_STATE,stack:[1,-2.5,0],rounding:6};
 const old=restoreState(()=>JSON.stringify(input));assert.deepEqual(old.state,input);assert.equal(old.allowSave,true);
 let written='';assert.equal(persistState(v=>written=v,old.state),'');assert.equal(JSON.parse(written).schemaVersion,2);
 assert.deepEqual(restoreState(()=>written).state,input);
});
test('bad JSON, future versions and unavailable storage preserve stored data',()=>{
 for(const read of [()=>'{',()=>JSON.stringify({schemaVersion:999,state:DEFAULT_STATE}),()=>{throw Error('disabled');},()=> 'x'.repeat(131073)]) {
  const result=restoreState(read);assert.equal(result.allowSave,false);assert.deepEqual(result.state,DEFAULT_STATE);assert.ok(result.notice);
 }
});
test('rejects nonfinite values, oversized stacks, invalid precision and fields',()=>{
 for(const patch of [{stack:[NaN]},{stack:[Infinity]},{stack:Array(1001).fill(0)},{angles:[1,2,null,4]},{rounding:101},{rounding:0.5},{activeAngle:4},{mode:'unknown'},{entry:{}},{entry:'x'},{lengthUnit:'yards'}]) {
  assert.throws(()=>validateState({...DEFAULT_STATE,...patch}));
 }
});
test('storage quota failure does not mutate state or throw',()=>{
 const state=structuredClone(DEFAULT_STATE);assert.ok(persistState(()=>{throw Error('quota');},state));assert.deepEqual(state,DEFAULT_STATE);
});
test('unknown fields never reach restored state',()=>{
 const result=restoreState(()=>JSON.stringify({...DEFAULT_STATE,untrusted:'ignored'}));assert.deepEqual(result.state,DEFAULT_STATE);
});

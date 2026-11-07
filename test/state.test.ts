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
test('fills missing legacy fields with defaults while preserving supplied settings',()=>{
 const partial={stack:[42,-3.25],entry:'7',mode:'standard',rounding:6};
 const restored=restoreState(()=>JSON.stringify(partial));
 assert.equal(restored.allowSave,true);
 assert.deepEqual(restored.state,{...DEFAULT_STATE,...partial});
 let written='';assert.equal(persistState(value=>written=value,restored.state),'');
 assert.deepEqual(JSON.parse(written),{schemaVersion:2,state:restored.state});
 restored.state.angles[0]=99;
 assert.notEqual(DEFAULT_STATE.angles[0],99);
});
test('legacy defaults do not hide invalid supplied fields or incomplete v2 records',()=>{
 for(const value of [{stack:'invalid'},{rounding:null},{angles:[1,2]},{entry:{}},{schemaVersion:2,state:{stack:[42],entry:'7',mode:'standard'}}]) {
  const restored=restoreState(()=>JSON.stringify(value));
  assert.equal(restored.allowSave,false);assert.deepEqual(restored.state,DEFAULT_STATE);assert.ok(restored.notice);
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

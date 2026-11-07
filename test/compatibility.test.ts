import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as calc from '../lib/calculator.ts';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/numeric-compatibility.v1.json',import.meta.url),'utf8'));
for(const row of fixture.cases) test(`shared numeric fixture: ${row.id}`,()=>{
 const [a,b]=row.args;
 const conversions:Record<string,(a:number,b:number)=>number>={footToDecimalInch:calc.footToDecimalInch,footToDecimalFoot:calc.footToDecimalFoot,decimalInchToFoot:calc.decimalInchToFoot,decimalFootToFoot:calc.decimalFootToFoot,baseRiseToSlope:calc.baseRiseToSlope};
 const actual=conversions[row.operation]?conversions[row.operation](a,b):['s2r','b2r'].includes(row.operation)?calc.trig(row.operation,a,b,'standard'):calc.calculate(row.operation,a,b,'standard');
 assert.ok(Math.abs(actual-row.expected)<=row.tolerance,`${row.id}: ${actual} vs ${row.expected}; ${row.basis}`);
});

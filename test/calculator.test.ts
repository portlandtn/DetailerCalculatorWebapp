import assert from 'node:assert/strict';
import test from 'node:test';
import {
  baseRiseToAngle,
  baseRiseToSlope,
  calculate,
  calculateWeight,
  decimalFootToFoot,
  decimalInchToFoot,
  determineDimensionForWeight,
  footToDecimalFoot,
  footToDecimalInch,
  trig,
} from '../lib/calculator.ts';

const rounded = (value: number, places = 4) => Number(value.toFixed(places));

test('matches the desktop feet-to-decimal-foot cases', () => {
  assert.deepEqual(
    [4.06, 4.0608, 144.0802, -118.02].map((value) => rounded(footToDecimalFoot(value))),
    [4.5, 4.5417, 144.6771, -118.1667],
  );
});

test('matches the desktop decimal-foot-to-feet cases', () => {
  assert.deepEqual(
    [4.5, 4.5417, 144.6771, -118.1667].map((value) => rounded(decimalFootToFoot(value))),
    [4.06, 4.0608, 144.0802, -118.02],
  );
});

test('matches the desktop decimal-inch conversions', () => {
  assert.deepEqual(
    [4.06, 4.0608, 144.0802, -118.02].map((value) => rounded(footToDecimalInch(value))),
    [54, 54.5, 1736.125, -1418],
  );
  assert.deepEqual(
    [54, 54.5, 1736.125, -1418].map((value) => rounded(decimalInchToFoot(value))),
    [4.06, 4.0608, 144.0802, -118.02],
  );
});

test('preserves RPN operand order and detailing arithmetic', () => {
  assert.equal(rounded(calculate('subtract', 16.0208, 11.0515, 'detailing')), 4.0809);
  assert.equal(rounded(calculate('add', 2.0408, 6.0208, 'detailing')), 8.07);
  assert.equal(rounded(calculate('multiply', 16.0205, 11.05, 'detailing')), 184.1006);
  assert.equal(rounded(calculate('divide', 2.0408, 6.0208, 'detailing')), 0.0409);
  assert.equal(calculate('subtract', 6, 3, 'standard'), 3);
});

test('matches the original triangle operations', () => {
  assert.equal(rounded(baseRiseToAngle(12, 1)), 4.7636);
  assert.equal(baseRiseToSlope(3, 4), 5);
  assert.equal(rounded(trig('b2s', 12, 26.5651, 'standard')), 13.4164);
  assert.equal(rounded(trig('b2r', 4.21, 26.5651, 'standard')), 2.105);
  assert.equal(rounded(trig('s2b', 5.418, 26.5651, 'standard')), 4.846);
  assert.equal(rounded(trig('s2r', 9.615, 26.5651, 'standard')), 4.3);
  assert.equal(rounded(trig('r2s', 1.5, 26.5651, 'standard')), 3.3541);
  assert.equal(rounded(trig('r2b', 1.21, 26.5651, 'standard')), 2.42);
});

test('matches the original detailing triangle cases', () => {
  const angle = 14.036243;
  assert.equal(rounded(trig('b2s', 1.0204, angle, 'detailing')), 1.0211);
  assert.equal(rounded(trig('b2r', 1.0204, angle, 'detailing')), 0.0309);
  assert.equal(rounded(trig('s2b', 1.0204, angle, 'detailing')), 1.0113);
  assert.equal(rounded(trig('s2r', 1.0204, angle, 'detailing')), 0.0307);
  assert.equal(rounded(trig('r2b', 1.0204, angle, 'detailing')), 4.09);
  assert.equal(rounded(trig('r2s', 1.0204, angle, 'detailing')), 4.1012);
});

test('matches the steel weight calculation and unit handling', () => {
  assert.equal(rounded(calculateWeight(8, 210, 0.125)), 60.984);
  assert.equal(rounded(determineDimensionForWeight(12.06, 'detailing', 'feet')), 150);
  assert.equal(rounded(determineDimensionForWeight(12.5, 'standard', 'feet')), 150);
  assert.equal(determineDimensionForWeight(150, 'standard', 'inches'), 150);
});

test('rejects division by zero', () => {
  assert.throws(() => calculate('divide', 4, 0, 'standard'), /divide by zero/i);
});

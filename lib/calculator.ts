export type MathMode = 'detailing' | 'standard';
export type Operator = 'add' | 'subtract' | 'multiply' | 'divide';
export type TrigOperation = 'b2s' | 'b2r' | 's2b' | 's2r' | 'r2b' | 'r2s';

export const DEFAULT_ANGLE = 4.7636;

/** Convert the original feet.inchesSixteenths notation to decimal feet. */
export function footToDecimalFoot(userEntry: number) {
  const feet = Math.trunc(userEntry);
  const fractional = userEntry - feet;
  const inchValue = Math.trunc(roundNearInteger(fractional * 100));
  const inches = inchValue / 12;
  const sixteenths = (userEntry - feet - inchValue / 100) * 10000 / 16 / 12;
  return feet + inches + sixteenths;
}

/** Convert feet.inchesSixteenths notation to decimal inches. */
export function footToDecimalInch(userEntry: number) {
  const truncated = Math.trunc(userEntry);
  const feet = truncated * 12;
  const fractional = userEntry - truncated;
  const inchValue = Math.trunc(roundNearInteger(fractional * 100));
  let sixteenths = fractional * 100 - Math.trunc(roundNearInteger(fractional * 100));
  if (sixteenths !== 0) sixteenths = sixteenths * 100 / 16;
  return feet + inchValue + sixteenths;
}

/** Convert decimal inches to the original feet.inchesSixteenths notation. */
export function decimalInchToFoot(userEntry: number) {
  const wholeInches = Math.trunc(userEntry);
  const feet = Math.trunc(wholeInches / 12);
  const inches = ((wholeInches / 12) - Math.trunc(wholeInches / 12)) * 12 / 100;
  let sixteenths = userEntry - wholeInches;
  if (sixteenths !== 0) sixteenths = sixteenths * 16 / 10000;
  return feet + inches + sixteenths;
}

/** Convert decimal feet to the original feet.inchesSixteenths notation. */
export function decimalFootToFoot(userEntry: number) {
  let feet = Math.trunc(userEntry);
  let inches = Math.trunc(roundNearInteger((userEntry - feet) * 12)) / 100;
  let sixteenths = (userEntry - feet) * 12;
  const tempInches = Math.trunc(roundNearInteger(sixteenths));
  sixteenths = (sixteenths - tempInches) * 16 / 10000;

  if (sixteenths >= 0.00155) {
    inches += 0.01;
    sixteenths = 0;
  }
  if (inches >= 0.1155) {
    feet += 1;
    inches = 0;
  }
  return cleanNumber(feet + inches + sixteenths);
}

function roundNearInteger(value: number) {
  const nearest = Math.round(value);
  return Math.abs(value - nearest) < 1e-10 ? nearest : value;
}

export function cleanNumber(value: number) {
  return Math.abs(value) < 1e-12 ? 0 : Number(value.toPrecision(15));
}

export function calculate(operator: Operator, left: number, right: number, mode: MathMode) {
  const a = mode === 'detailing' ? footToDecimalFoot(left) : left;
  const b = mode === 'detailing' ? footToDecimalFoot(right) : right;
  if (operator === 'divide' && b === 0) throw new Error('Cannot divide by zero.');

  const result = operator === 'add' ? a + b
    : operator === 'subtract' ? a - b
      : operator === 'multiply' ? a * b
        : a / b;

  return cleanNumber(mode === 'detailing' ? decimalFootToFoot(result) : result);
}

export function angleToRadians(angle: number) {
  return angle * Math.PI / 180;
}

export function radiansToAngle(radians: number) {
  return radians * 180 / Math.PI;
}

export function baseRiseToAngle(base: number, rise: number) {
  return radiansToAngle(Math.atan(rise / base));
}

export function baseRiseToSlope(base: number, rise: number) {
  return Math.sqrt(base * base + rise * rise);
}

export function trig(operation: TrigOperation, value: number, angle: number, mode: MathMode) {
  const input = mode === 'detailing' ? footToDecimalFoot(value) : value;
  const radians = angleToRadians(angle);
  const result = operation === 'b2s' ? input / Math.cos(radians)
    : operation === 'b2r' ? input * Math.tan(radians)
      : operation === 's2b' ? Math.cos(radians) * input
        : operation === 's2r' ? Math.sin(radians) * input
          : operation === 'r2b' ? input / Math.tan(radians)
            : input / Math.sin(radians);
  return cleanNumber(mode === 'detailing' ? decimalFootToFoot(result) : result);
}

export function determineDimensionForWeight(dimension: number, mode: MathMode, unit: 'feet' | 'inches') {
  if (unit === 'inches') return dimension;
  return mode === 'detailing' ? footToDecimalFoot(dimension) * 12 : dimension * 12;
}

export function calculateWeight(width: number, length: number, thickness: number) {
  return cleanNumber(length * width * thickness * 0.2904);
}

export function formatValue(value: number, decimals: number) {
  if (!Number.isFinite(value)) return 'Error';
  return value.toFixed(decimals);
}

function greatestCommonDivisor(a: number, b: number) {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return Math.abs(a);
}

export function detailingLabel(value: number) {
  const feet = Math.trunc(value);
  const fractional = Math.abs(value - feet);
  const inches = Math.trunc(roundNearInteger(fractional * 100));
  const sixteenths = Math.round((fractional * 100 - inches) * 100);
  const divisor = sixteenths ? greatestCommonDivisor(Math.abs(sixteenths), 16) : 1;
  const fraction = sixteenths ? ` ${Math.abs(sixteenths) / divisor}/${16 / divisor}` : '';
  const sign = value < 0 ? '−' : '';
  return `${sign}${Math.abs(feet)}′–${Math.abs(inches)}${fraction}″`;
}

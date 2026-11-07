import { DEFAULT_ANGLE, type MathMode } from './calculator.ts';

export type ToolTab = 'triangle' | 'convert' | 'weight' | 'guide';
export type Unit = 'feet' | 'inches';

export interface CalculatorState {
  stack: number[];
  entry: string;
  mode: MathMode;
  rounding: number;
  angles: number[];
  activeAngle: number;
  toolTab: ToolTab;
  slopeInput: string;
  manualAngle: string;
  baseInput: string;
  riseInput: string;
  lengthInput: string;
  widthInput: string;
  thicknessInput: string;
  lengthUnit: Unit;
  widthUnit: Unit;
}

export const STORAGE_KEY = 'detailer-calculator-state-v1';
export const DEFAULT_STATE: CalculatorState = {
  stack: [0],
  entry: '',
  mode: 'detailing',
  rounding: 4,
  angles: [DEFAULT_ANGLE, DEFAULT_ANGLE, DEFAULT_ANGLE, DEFAULT_ANGLE],
  activeAngle: 0,
  toolTab: 'triangle',
  slopeInput: '1',
  manualAngle: '',
  baseInput: '',
  riseInput: '',
  lengthInput: '',
  widthInput: '',
  thicknessInput: '',
  lengthUnit: 'feet',
  widthUnit: 'inches',
};


const MAX_BYTES = 128 * 1024;
const MAX_STACK = 1000;
const TEXT_FIELDS = ['entry','slopeInput','manualAngle','baseInput','riseInput','lengthInput','widthInput','thicknessInput'] as const;
function record(value: unknown): value is Record<string, unknown> {
 return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function validateState(value: unknown): CalculatorState {
 if (!record(value)) throw new Error('Saved state must be an object.');
 const result = structuredClone(DEFAULT_STATE);
 for (const key of Object.keys(DEFAULT_STATE) as (keyof CalculatorState)[]) {
  if (!(key in value)) throw new Error('Saved state is incomplete.');
 }
 if (!Array.isArray(value.stack) || value.stack.length > MAX_STACK || !value.stack.every(x=>typeof x==='number' && Number.isFinite(x))) throw new Error('Invalid saved stack.');
 if (!Array.isArray(value.angles) || value.angles.length!==4 || !value.angles.every(x=>typeof x==='number' && Number.isFinite(x))) throw new Error('Invalid saved angles.');
 if (!Number.isInteger(value.rounding) || (value.rounding as number)<0 || (value.rounding as number)>6) throw new Error('Invalid saved precision.');
 if (!Number.isInteger(value.activeAngle) || (value.activeAngle as number)<0 || (value.activeAngle as number)>3) throw new Error('Invalid active angle.');
 if (!['detailing','standard'].includes(value.mode as string) || !['triangle','convert','weight','guide'].includes(value.toolTab as string)) throw new Error('Invalid saved mode.');
 if (!['feet','inches'].includes(value.lengthUnit as string) || !['feet','inches'].includes(value.widthUnit as string)) throw new Error('Invalid saved units.');
 for (const key of TEXT_FIELDS) {
  const text=value[key];
  if (typeof text!=='string' || text.length>128 || !/^-?\d*(\.\d*)?$/.test(text)) throw new Error('Invalid saved input.');
  result[key]=text;
 }
 result.stack=[...value.stack]; result.angles=[...value.angles]; result.rounding=value.rounding as number; result.activeAngle=value.activeAngle as number;
 result.mode=value.mode as MathMode;result.toolTab=value.toolTab as ToolTab;result.lengthUnit=value.lengthUnit as Unit;result.widthUnit=value.widthUnit as Unit;
 return result;
}
export function restoreState(read: ()=>string|null): {state:CalculatorState;notice:string;allowSave:boolean} {
 try {
  const raw=read();
  if(raw===null) return {state:structuredClone(DEFAULT_STATE),notice:'',allowSave:true};
  if(raw.length>MAX_BYTES) throw new Error('Too large');
  const parsed:unknown=JSON.parse(raw);
  if(!record(parsed)) throw new Error('Invalid record');
  const value='schemaVersion' in parsed ? (parsed.schemaVersion===2 ? parsed.state : null) : parsed;
  return {state:validateState(value),notice:'',allowSave:true};
 } catch {
  return {state:structuredClone(DEFAULT_STATE),allowSave:false,notice:'Saved state could not be restored. Using defaults without overwriting saved data. Browser saving is paused.'};
 }
}
export function persistState(write:(value:string)=>void,state:CalculatorState): string {
 try {
  const raw=JSON.stringify({schemaVersion:2,state:validateState(state)});
  if(raw.length>MAX_BYTES) throw new Error('Too large');
  write(raw);return '';
 } catch { return 'Browser saving failed. Your current calculation remains available in this tab.'; }
}

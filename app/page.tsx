'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_ANGLE,
  baseRiseToAngle,
  calculate,
  calculateWeight,
  decimalFootToFoot,
  decimalInchToFoot,
  detailingLabel,
  determineDimensionForWeight,
  footToDecimalFoot,
  footToDecimalInch,
  formatValue,
  trig,
  type MathMode,
  type Operator,
  type TrigOperation,
} from '../lib/calculator';

type ToolTab = 'triangle' | 'convert' | 'weight' | 'guide';
type Unit = 'feet' | 'inches';

interface CalculatorState {
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

const STORAGE_KEY = 'detailer-calculator-state-v1';
const DEFAULT_STATE: CalculatorState = {
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

const OPERATOR_KEYS: Record<string, Operator> = {
  '+': 'add',
  '-': 'subtract',
  '*': 'multiply',
  '/': 'divide',
};

const TRIG_BUTTONS: { operation: TrigOperation; short: string; label: string }[] = [
  { operation: 'b2r', short: 'B → R', label: 'Base to rise' },
  { operation: 'b2s', short: 'B → S', label: 'Base to slope' },
  { operation: 's2b', short: 'S → B', label: 'Slope to base' },
  { operation: 's2r', short: 'S → R', label: 'Slope to rise' },
  { operation: 'r2s', short: 'R → S', label: 'Rise to slope' },
  { operation: 'r2b', short: 'R → B', label: 'Rise to base' },
];

function numberFromInput(value: string) {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sanitizeEntry(value: string) {
  const cleaned = value.replace(/[^0-9.\-]/g, '');
  const negative = cleaned.startsWith('-');
  const unsigned = cleaned.replace(/-/g, '');
  const [whole, ...decimals] = unsigned.split('.');
  return `${negative ? '-' : ''}${whole}${decimals.length ? `.${decimals.join('')}` : ''}`;
}

export default function Home() {
  const [state, setState] = useState<CalculatorState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [isMobileInput, setIsMobileInput] = useState(true);
  const [past, setPast] = useState<number[][]>([]);
  const [future, setFuture] = useState<number[][]>([]);
  const [notice, setNotice] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const mobileInputQuery = window.matchMedia('(hover: none) and (pointer: coarse)');

    function updateMobileInput() {
      setIsMobileInput(mobileInputQuery.matches);
    }

    updateMobileInput();
    mobileInputQuery.addEventListener('change', updateMobileInput);

    const restoreTimer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<CalculatorState>;
          setState({
            ...DEFAULT_STATE,
            ...parsed,
            stack: Array.isArray(parsed.stack) ? parsed.stack.filter(Number.isFinite) : DEFAULT_STATE.stack,
            angles: Array.isArray(parsed.angles) && parsed.angles.length === 4 ? parsed.angles : DEFAULT_STATE.angles,
          });
        }
      } catch {
        // A malformed local value should never prevent the calculator from opening.
      }
      setHydrated(true);
      if (!mobileInputQuery.matches) inputRef.current?.focus({ preventScroll: true });
    }, 0);
    return () => {
      window.clearTimeout(restoreTimer);
      mobileInputQuery.removeEventListener('change', updateMobileInput);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  function patchState(patch: Partial<CalculatorState>) {
    setState((current) => ({ ...current, ...patch }));
  }

  function focusEntry() {
    if (!isMobileInput) inputRef.current?.focus({ preventScroll: true });
  }

  function showNotice(message: string) {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 2600);
  }

  function commitStack(next: number[]) {
    if (next.some((value) => !Number.isFinite(value))) {
      showNotice('That calculation did not produce a valid number.');
      return;
    }
    setPast((items) => [...items, [...state.stack]].slice(-50));
    setFuture([]);
    patchState({ stack: next });
  }

  function pushEntry() {
    const value = state.entry.trim() === '' ? state.stack.at(-1) : numberFromInput(state.entry);
    if (value === undefined) {
      showNotice(state.stack.length ? 'Enter a valid number.' : 'The stack is empty.');
      return;
    }
    commitStack([...state.stack, value]);
    patchState({ entry: '' });
    focusEntry();
  }

  function runOperator(operator: Operator) {
    if (state.stack.length < 2) {
      showNotice('Two stack values are required.');
      return;
    }
    const left = state.stack.at(-2)!;
    const right = state.stack.at(-1)!;
    try {
      commitStack([...state.stack.slice(0, -2), calculate(operator, left, right, state.mode)]);
      patchState({ entry: '' });
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Unable to calculate.');
    }
    focusEntry();
  }

  function appendKey(value: string) {
    patchState({ entry: sanitizeEntry(`${state.entry}${value}`) });
    focusEntry();
  }

  function drop(clearEntry = false) {
    if (!state.stack.length) return showNotice('The stack is already empty.');
    commitStack(state.stack.slice(0, -1));
    if (clearEntry) patchState({ entry: '' });
  }

  function swap() {
    if (state.stack.length < 2) return showNotice('Two stack values are required.');
    commitStack([...state.stack.slice(0, -2), state.stack.at(-1)!, state.stack.at(-2)!]);
  }

  function toggleSign() {
    if (!state.stack.length) return showNotice('The stack is empty.');
    commitStack([...state.stack.slice(0, -1), -state.stack.at(-1)!]);
  }

  function undo() {
    const previous = past.at(-1);
    if (!previous) return;
    setFuture((items) => [[...state.stack], ...items].slice(0, 50));
    setPast((items) => items.slice(0, -1));
    patchState({ stack: previous });
  }

  function redo() {
    const next = future.at(0);
    if (!next) return;
    setPast((items) => [...items, [...state.stack]].slice(-50));
    setFuture((items) => items.slice(1));
    patchState({ stack: next });
  }

  function runConversion(converter: (value: number) => number) {
    const value = state.stack.at(-1);
    if (value === undefined) return showNotice('Add a value to the stack first.');
    commitStack([...state.stack.slice(0, -1), converter(value)]);
  }

  function runTrig(operation: TrigOperation) {
    const value = state.stack.at(-1);
    if (value === undefined) return showNotice('Add a side dimension to the stack first.');
    const angle = state.angles[state.activeAngle];
    if (!Number.isFinite(angle) || angle <= 0 || angle >= 90) return showNotice('Choose an angle between 0° and 90°.');
    commitStack([...state.stack.slice(0, -1), trig(operation, value, angle, state.mode)]);
  }

  function storeAngle(value: number | undefined) {
    if (value === undefined || value <= 0 || value >= 90) {
      showNotice('Enter an angle between 0° and 90°.');
      return;
    }
    const angles = [...state.angles];
    angles[state.activeAngle] = value;
    patchState({ angles, manualAngle: '' });
    showNotice(`Angle ${state.activeAngle + 1} updated.`);
  }

  const slopeAngle = useMemo(() => {
    const slope = numberFromInput(state.slopeInput);
    return slope === undefined ? undefined : baseRiseToAngle(12, slope);
  }, [state.slopeInput]);

  const sidesAngle = useMemo(() => {
    let base = numberFromInput(state.baseInput);
    let rise = numberFromInput(state.riseInput);
    if (base === undefined || rise === undefined || base === 0) return undefined;
    if (state.mode === 'detailing') {
      base = footToDecimalFoot(base);
      rise = footToDecimalFoot(rise);
    }
    return baseRiseToAngle(base, rise);
  }, [state.baseInput, state.riseInput, state.mode]);

  const weight = useMemo(() => {
    const length = numberFromInput(state.lengthInput);
    const width = numberFromInput(state.widthInput);
    const thickness = numberFromInput(state.thicknessInput);
    if (length === undefined || width === undefined || thickness === undefined || thickness === 0) return 0;
    return calculateWeight(
      determineDimensionForWeight(width, state.mode, state.widthUnit),
      determineDimensionForWeight(length, state.mode, state.lengthUnit),
      thickness,
    );
  }, [state.lengthInput, state.widthInput, state.thicknessInput, state.lengthUnit, state.widthUnit, state.mode]);

  const visibleStack = state.stack.slice(-16);
  const activeValue = state.stack.at(-1);
  const activeAngle = state.angles[state.activeAngle];

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">DC</span>
          <div>
            <p className="eyebrow">Field tools · RPN</p>
            <h1>Detailer Calculator</h1>
          </div>
        </div>
        <span className="save-status" title="Calculator state is stored in this browser">
          <i /> {hydrated ? 'Saved on this device' : 'Restoring…'}
        </span>
      </header>

      <div className="workspace">
        <section className="calculator-card" aria-label="RPN calculator">
          <div className="mode-row">
            <div className="segmented" aria-label="Math method">
              <button className={state.mode === 'detailing' ? 'active' : ''} onClick={() => patchState({ mode: 'detailing' })}>Detailing</button>
              <button className={state.mode === 'standard' ? 'active' : ''} onClick={() => patchState({ mode: 'standard' })}>Standard</button>
            </div>
            <div className="display-controls">
              <button className="icon-button" disabled={!past.length} onClick={undo} aria-label="Undo" title="Undo">↶</button>
              <button className="icon-button" disabled={!future.length} onClick={redo} aria-label="Redo" title="Redo">↷</button>
              <label className="rounding-control">
                <span>Decimals</span>
                <select value={state.rounding} onChange={(event) => patchState({ rounding: Number(event.target.value) })}>
                  {[0, 1, 2, 3, 4, 5, 6].map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
            </div>
          </div>

          <button
            className="stack-display"
            onClick={() => {
              void navigator.clipboard?.writeText(state.stack.map((value) => formatValue(value, state.rounding)).join('\n'));
              showNotice('Stack copied.');
            }}
            title="Copy the displayed stack"
          >
            <span className="display-heading">
              <span>Stack · tap to copy</span>
              <span>{state.stack.length} {state.stack.length === 1 ? 'value' : 'values'}</span>
            </span>
            <ol aria-live="polite">
              {!visibleStack.length && <li className="empty-stack">Stack empty</li>}
              {visibleStack.map((value, index) => (
                <li key={`${state.stack.length - visibleStack.length + index}-${value}`} className={index === visibleStack.length - 1 ? 'current' : ''}>
                  <span>{visibleStack.length - index}</span>
                  <output>{formatValue(value, state.rounding)}</output>
                </li>
              ))}
            </ol>
            {state.mode === 'detailing' && activeValue !== undefined && <span className="dimension-caption">{detailingLabel(activeValue)}</span>}
          </button>

          <div className="entry-row">
            <label>
              <span>Entry</span>
              <input
                ref={inputRef}
                aria-label="Calculator entry"
                autoComplete="off"
                value={state.entry}
                inputMode={isMobileInput ? 'none' : 'decimal'}
                readOnly={isMobileInput}
                placeholder={state.mode === 'detailing' ? 'feet.inches16  ·  12.0608' : '0.0000'}
                onFocus={(event) => {
                  if (isMobileInput) event.currentTarget.blur();
                }}
                onChange={(event) => patchState({ entry: sanitizeEntry(event.target.value) })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') { event.preventDefault(); pushEntry(); return; }
                  if (event.key === 'Escape') { event.preventDefault(); patchState({ entry: '' }); return; }
                  if (event.key === 'Delete') { event.preventDefault(); drop(true); return; }
                  if (OPERATOR_KEYS[event.key]) { event.preventDefault(); runOperator(OPERATOR_KEYS[event.key]); }
                }}
              />
            </label>
            <button className="enter-key" onClick={pushEntry}>Enter <span>↵</span></button>
          </div>

          <div className="keypad" aria-label="Calculator keypad">
            {['7', '8', '9'].map((key) => <button key={key} onClick={() => appendKey(key)}>{key}</button>)}
            <button className="operator" aria-label="Divide" onClick={() => runOperator('divide')}>÷</button>
            {['4', '5', '6'].map((key) => <button key={key} onClick={() => appendKey(key)}>{key}</button>)}
            <button className="operator" aria-label="Multiply" onClick={() => runOperator('multiply')}>×</button>
            {['1', '2', '3'].map((key) => <button key={key} onClick={() => appendKey(key)}>{key}</button>)}
            <button className="operator" aria-label="Subtract" onClick={() => runOperator('subtract')}>−</button>
            <button onClick={toggleSign}>+/−</button>
            <button onClick={() => appendKey('0')}>0</button>
            <button onClick={() => appendKey('.')}>.</button>
            <button className="operator accent" aria-label="Add" onClick={() => runOperator('add')}>+</button>
          </div>

          <div className="stack-actions">
            <button onClick={() => drop()}>Drop <kbd>Del</kbd></button>
            <button onClick={swap}>Swap</button>
            <button className="danger" onClick={() => { if (state.stack.length) commitStack([]); }}>Clear stack</button>
          </div>
        </section>

        <aside className="tools-card">
          <div className="angle-strip">
            <div>
              <p className="eyebrow">Active angle {state.activeAngle + 1}</p>
              <strong>{formatValue(activeAngle, 4)}°</strong>
            </div>
            <span>{formatValue(Math.tan(activeAngle * Math.PI / 180) * 12, 3)} on 12</span>
          </div>

          <nav className="tool-tabs" aria-label="Detailer tools">
            {([
              ['triangle', 'Triangle'],
              ['convert', 'Convert'],
              ['weight', 'Weight'],
              ['guide', 'Guide'],
            ] as [ToolTab, string][]).map(([tab, label]) => (
              <button key={tab} className={state.toolTab === tab ? 'active' : ''} onClick={() => patchState({ toolTab: tab })}>{label}</button>
            ))}
          </nav>

          {state.toolTab === 'triangle' && (
            <div className="tool-panel">
              <section>
                <div className="section-heading"><div><p className="eyebrow">Stored angles</p><h2>Choose the working angle</h2></div></div>
                <div className="angle-options">
                  {state.angles.map((angle, index) => (
                    <button key={index} className={state.activeAngle === index ? 'active' : ''} onClick={() => patchState({ activeAngle: index })}>
                      <span>A{index + 1}</span><strong>{formatValue(angle, 4)}°</strong>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <p className="eyebrow">Side conversions</p>
                <div className="trig-grid">
                  {TRIG_BUTTONS.map((button) => <button key={button.operation} title={button.label} onClick={() => runTrig(button.operation)}>{button.short}</button>)}
                </div>
                <p className="tool-hint">Replaces the top stack value using angle {state.activeAngle + 1}.</p>
              </section>

              <section className="angle-builders">
                <div className="builder-card">
                  <label><span>Roof slope</span><div><input inputMode="decimal" value={state.slopeInput} onChange={(event) => patchState({ slopeInput: sanitizeEntry(event.target.value) })} /><b>: 12</b></div></label>
                  <output>{slopeAngle === undefined ? '—' : `${formatValue(slopeAngle, 4)}°`}</output>
                  <button onClick={() => storeAngle(slopeAngle)}>Store as A{state.activeAngle + 1}</button>
                </div>
                <div className="builder-card two-inputs">
                  <label><span>Base</span><input inputMode="decimal" value={state.baseInput} onChange={(event) => patchState({ baseInput: sanitizeEntry(event.target.value) })} /></label>
                  <label><span>Rise</span><input inputMode="decimal" value={state.riseInput} onChange={(event) => patchState({ riseInput: sanitizeEntry(event.target.value) })} /></label>
                  <output>{sidesAngle === undefined ? '—' : `${formatValue(sidesAngle, 4)}°`}</output>
                  <button onClick={() => storeAngle(sidesAngle)}>Store as A{state.activeAngle + 1}</button>
                </div>
                <div className="builder-card manual-angle">
                  <label><span>Manual angle</span><input inputMode="decimal" placeholder="Degrees" value={state.manualAngle} onChange={(event) => patchState({ manualAngle: sanitizeEntry(event.target.value) })} /></label>
                  <button onClick={() => storeAngle(numberFromInput(state.manualAngle))}>Store as A{state.activeAngle + 1}</button>
                </div>
              </section>
            </div>
          )}

          {state.toolTab === 'convert' && (
            <div className="tool-panel">
              <div className="section-heading"><div><p className="eyebrow">Stack conversion</p><h2>Convert the top value</h2></div></div>
              <div className="conversion-grid">
                <button onClick={() => runConversion(footToDecimalFoot)}><strong>F → D</strong><span>Feet to decimal feet</span></button>
                <button onClick={() => runConversion(decimalFootToFoot)}><strong>D → F</strong><span>Decimal feet to feet</span></button>
                <button onClick={() => runConversion(footToDecimalInch)}><strong>F → IN</strong><span>Feet to decimal inches</span></button>
                <button onClick={() => runConversion(decimalInchToFoot)}><strong>IN → F</strong><span>Decimal inches to feet</span></button>
              </div>
              <div className="format-note">
                <div><strong>Detailing format</strong><span>feet . inches . sixteenths</span></div>
                <code>12.0608</code>
                <small>12′–6 8/16″</small>
              </div>
            </div>
          )}

          {state.toolTab === 'weight' && (
            <div className="tool-panel">
              <div className="section-heading"><div><p className="eyebrow">Steel plate</p><h2>Calculate weight</h2></div></div>
              <div className="weight-form">
                <MeasureInput label="Length" value={state.lengthInput} unit={state.lengthUnit} onValue={(value) => patchState({ lengthInput: value })} onUnit={(unit) => patchState({ lengthUnit: unit })} />
                <MeasureInput label="Width" value={state.widthInput} unit={state.widthUnit} onValue={(value) => patchState({ widthInput: value })} onUnit={(unit) => patchState({ widthUnit: unit })} />
                <label className="thickness-field"><span>Thickness · inches</span><input inputMode="decimal" placeholder="0.125" value={state.thicknessInput} onChange={(event) => patchState({ thicknessInput: sanitizeEntry(event.target.value) })} /></label>
              </div>
              <div className="weight-result"><span>Estimated weight</span><strong>{formatValue(weight, 6)} <small>lb</small></strong></div>
              <button
                className="primary-tool-button"
                disabled={!weight}
                onClick={() => {
                  commitStack([...state.stack, weight]);
                  patchState({ lengthInput: '', widthInput: '', thicknessInput: '' });
                }}
              >
                Push weight to stack
              </button>
              <p className="tool-hint">Uses 0.2904 lb per cubic inch, matching the desktop calculator.</p>
            </div>
          )}

          {state.toolTab === 'guide' && (
            <div className="tool-panel guide-panel">
              <div className="section-heading"><div><p className="eyebrow">Quick guide</p><h2>Reverse Polish Notation</h2></div></div>
              <p>Enter the first number, press <b>Enter</b>, then enter the second. An operator replaces those two stack values with the result.</p>
              <ol>
                <li><span>1</span><div>Type <code>6</code>, then press Enter.</div></li>
                <li><span>2</span><div>Type <code>3</code>, then press Enter.</div></li>
                <li><span>3</span><div>Press − to leave <code>3</code> on the stack.</div></li>
              </ol>
              <div className="shortcut-list">
                <div><kbd>Enter</kbd><span>Push or duplicate top value</span></div>
                <div><kbd>+ − * /</kbd><span>Calculate the top two values</span></div>
                <div><kbd>Esc</kbd><span>Clear the entry field</span></div>
                <div><kbd>Delete</kbd><span>Drop the top stack value</span></div>
              </div>
              <p className="privacy-note"><i /> Your stack, angles, inputs, and settings stay in this browser. No account or server database is needed.</p>
            </div>
          )}
        </aside>
      </div>

      <div className={`toast ${notice ? 'visible' : ''}`} role="status" aria-live="polite">{notice}</div>
    </main>
  );
}

function MeasureInput({ label, value, unit, onValue, onUnit }: {
  label: string;
  value: string;
  unit: Unit;
  onValue: (value: string) => void;
  onUnit: (unit: Unit) => void;
}) {
  return (
    <div className="measure-field">
      <label><span>{label}</span><input inputMode="decimal" value={value} onChange={(event) => onValue(sanitizeEntry(event.target.value))} /></label>
      <div className="unit-switch">
        <button className={unit === 'inches' ? 'active' : ''} onClick={() => onUnit('inches')}>in</button>
        <button className={unit === 'feet' ? 'active' : ''} onClick={() => onUnit('feet')}>ft</button>
      </div>
    </div>
  );
}

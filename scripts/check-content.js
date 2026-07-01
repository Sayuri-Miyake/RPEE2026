#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');

const htmlPath = new URL('../index.html', `file://${__filename}`).pathname;
const claudePath = new URL('../CLAUDE.md', `file://${__filename}`).pathname;
const html = fs.readFileSync(htmlPath, 'utf8');
const claude = fs.readFileSync(claudePath, 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function loadProblems() {
  const start = html.indexOf('const THERMO =');
  const end = html.indexOf('let db = null;', start);
  assert(start >= 0 && end > start, 'Could not find problem data arrays');

  const context = {};
  vm.createContext(context);
  vm.runInContext(`${html.slice(start, end)}\nthis.TH=THERMO; this.QU=QUANTUM;`, context);
  return { thermo: context.TH, quantum: context.QU };
}

const { thermo, quantum } = loadProblems();
const byId = new Map([...thermo, ...quantum].map(problem => [problem.id, problem]));

for (const problem of [...thermo, ...quantum]) {
  for (const field of ['text', 'hint']) {
    const dollarCount = (problem[field].match(/(?<!\\)\$/g) || []).length;
    assert(dollarCount % 2 === 0, `${problem.id}.${field} has an unmatched inline math delimiter`);
  }
}

assert(thermo.length === 50, `Expected 50 thermo problems, got ${thermo.length}`);
assert(quantum.length === 92, `Expected 92 quantum problems, got ${quantum.length}`);
assert(claude.includes('熱・統計力学50問、量子力学92問（計142問）'), 'CLAUDE.md problem count is stale');

const forbidden = [
  ['index.html', html, 'クラックス'],
  ['index.html', html, 'PV/NkT = 1 + B(T)/V'],
  ['index.html', html, 'ラッシュブルックの不等式'],
  ['index.html', html, '経典的経路'],
  ['index.html', html, '枯渇のない超流動'],
  ['index.html', html, 'これらで万能量子計算'],
  ['index.html', html, '[\\\\hat{H},\\\\hat{x}_H]=\\\\frac{i\\\\hbar'],
  ['index.html', html, '長時間では $\\\\propto t$'],
];

for (const [file, content, needle] of forbidden) {
  assert(!content.includes(needle), `${file} still contains forbidden text: ${needle}`);
}

assert(byId.get('Q20').hint.includes('|E_n - E_m|^2/\\hbar'), 'Q20 adiabatic condition is missing squared energy gap');
assert(byId.get('Q77').hint.includes('|E_n-E_m|^2/\\hbar'), 'Q77 adiabatic condition is missing squared energy gap');
assert(byId.get('Q62').hint.includes('[\\hat{H},\\hat{x}_H]=-\\frac{i\\hbar\\hat{p}_H}{m}'), 'Q62 commutator sign is wrong');
assert(byId.get('Q70').text.includes('\\hat{H}=g\\mu_B\\hat{S}_z B/\\hbar'), 'Q70 electron spin Hamiltonian sign is wrong');
assert(byId.get('Q70').hint.includes('$|{\\downarrow}\\rangle$ が低エネルギー'), 'Q70 electron spin level ordering is wrong');
assert(byId.get('Q78').text.includes('(\\hat{a}^\\dagger)^n'), 'Q78 creation operator lost its LaTeX backslash');
assert(byId.get('Q84').hint.includes('$x$ 方向の調和振動子'), 'Q84 Landau gauge oscillator direction is wrong');
assert(byId.get('Q87').hint.includes('時間反転対称なトポロジカル絶縁体'), 'Q87 should distinguish Z2 topological insulators from Chern insulators');

console.log(`content checks passed: thermo=${thermo.length}, quantum=${quantum.length}`);

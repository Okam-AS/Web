// Probe priceLabel behaviour without a bundler: slice the pure-formatting block out of the TS and
// strip the type annotations (this block is plain JS plus annotations, nothing more).
const fs = require('fs');
const file = process.argv[2];
const raw = fs.readFileSync(file, 'utf8');
const start = raw.indexOf('const currencyInfoTool');
const endMarker = raw.indexOf('const orderStatusLabelTool');
let block = raw.slice(start, endMarker);
block = block.replace(/:\s*Number/g, '').replace(/:\s*Boolean/g, '')
             .replace(/:\s*string\s*=/g, ' =').replace(/\):\s*string/g, ')');
const src = 'let _currencyFormatOverride = null;\n' + block +
  '\nmodule.exports = { priceLabelTool, setCurrencyFormat: (o) => { _currencyFormatOverride = o; } };';
const m = { exports: {} };
new Function('module', 'exports', src)(m, m.exports);
const { priceLabelTool, setCurrencyFormat } = m.exports;

const cases = [
  ['206,80 — a total WITH øre, hideFractionIfZero=true', 20680, true],
  ['206,80 — a total WITH øre, hideFractionIfZero=false', 20680, false],
  ['188 — whole krone, hideFractionIfZero=true', 18800, true],
  ['188 — whole krone, hideFractionIfZero=false', 18800, false],
  ['0 — zero, hide=true', 0, true],
  ['0 — zero, hide=false', 0, false],
  ['-2000 — negative whole krone', -2000, true],
  ['-50 — negative under one krone', -50, true],
  ['20680.000000000004 — float minor', 20680.000000000004, true],
  ['6.98 — a major-unit float', 6.98, true],
  ['1234567 — thousands with øre', 1234567, true],
  ['1 — one øre', 1, true],
  ['50 — fifty øre', 50, true]
];
const run = (label, fmt) => {
  setCurrencyFormat(fmt);
  console.log('--- ' + label + ' ---');
  for (const [name, v, hide] of cases) {
    console.log('  ' + JSON.stringify(priceLabelTool(v, hide)).padEnd(30) + name);
  }
};
run('NOK default (core default == ConsumerWeb/ConsumerApp NORWEGIAN_FORMAT)', { prefix: '', suffix: ',–', decimalSeparator: ',', thousandSeparator: ' ', symbol: 'kr' });
run('admin override (Web-modules plugins/global-mixin.js)', { prefix: 'kr ', suffix: '' });
run('Swiss override', { symbol: 'CHF', prefix: 'CHF ', suffix: '', decimalSeparator: '.', thousandSeparator: "'" });

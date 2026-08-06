// Which value shapes pass the `v-if="…discountAmount > 0"` guard on the three residual sites while
// `isAmountStated` — the absence rule the whole of `utils/price.js` is built on — refuses them?
//
// This is the question the lane turns on. The review that approved the X/Z fix read the three guards
// and concluded `−—` was unreachable; a relational test and an absence rule are not the same
// predicate, and the answer had to be measured rather than reasoned about.
//
// Run:  node lanes/L-XZ-RESIDUAL-SITES/guard-vs-rule-probe.js
//
// Also confirms, against core's real formatter arithmetic, that `priceLabel` mangles negatives —
// which is why `negatedAmountLabel` hands it a magnitude and prepends the sign itself.

// Verbatim from utils/price.js.
const isAmountStated = (a) => {
  if (a === null || a === undefined) { return false }
  if (typeof a === 'number') { return Number.isFinite(a) }
  if (typeof a === 'string') { return a.trim() !== '' && Number.isFinite(Number(a)) }
  return false
}

// Verbatim from core/helpers/tools.ts (priceLabelTool with the admin's "kr " prefix).
const whole = a => (!a ? '0' : (a.toString().slice(0, -2) || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' '))
const fraction = a => (!a ? '00' : a.toString().slice(-2).padStart(2, '0'))
const priceLabel = a => 'kr ' + whole(a) + ',' + fraction(a)

const SHAPES = [
  ['null', null], ['undefined', undefined], ["''", ''], ["'   '", '   '], ['NaN', NaN],
  ['0', 0], ['-0', -0], ['-1', -1], ['-5000', -5000], ['5000', 5000], ["'50'", '50'],
  ['Infinity', Infinity], ['-Infinity', -Infinity], ["'Infinity'", 'Infinity'],
  ['true', true], ['false', false], ['{}', {}], ['{valueOf:()=>5000}', { valueOf: () => 5000 }],
  ['[]', []]
]

const rows = SHAPES.map(([name, v]) => ({
  name,
  guard: v > 0,
  stated: isAmountStated(v),
  renders: v > 0 ? (isAmountStated(v) ? 'a figure' : 'THE UNKNOWN MARK') : '(row hidden)'
}))

console.log('shape                   guard `> 0`   isAmountStated   the label prints')
for (const r of rows) {
  const flag = r.guard && !r.stated ? '   <-- REACHES THE LABEL UNSTATED' : ''
  console.log(
    r.name.padEnd(22),
    String(r.guard).padEnd(13),
    String(r.stated).padEnd(16),
    r.renders + flag)
}

const gap = rows.filter(r => r.guard && !r.stated).map(r => r.name)
console.log('\nshapes the guard admits and the absence rule refuses:', gap.join(', '))
console.log('before this lane every one of them rendered `−—` at PosReceiptView.vue:57.')

console.log('\nJSON.parse(\'{"a":1e400}\').a =', JSON.parse('{"a":1e400}').a,
  '-- Infinity has a wire provenance; a well-formed .NET long does not reach it.')

console.log('\ncore priceLabel on negatives (why the label takes a magnitude):')
for (const n of [-4, -50, -5000]) { console.log('  ' + String(n).padStart(6) + ' -> ' + priceLabel(n)) }

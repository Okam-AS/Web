// CARRIED FORWARD from `lanes/L-XZ-RESIDUAL-SITES/guard-vs-rule-probe.js` by way of
// `lanes/L-CHECK-DISCOUNT-SUM-COUPLED/sum-vs-guard-probe.js`, and extended a third time rather than
// rewritten: part 1 is that probe's column verbatim, and it is the control this lane's claim is
// measured against. The siblings' files are left untouched so their own mutation-logs still
// describe what they point at.
//
// THE QUESTION THE SIBLINGS ASKED (part 1). Which value shapes pass a `> 0` guard while
// `isAmountStated` — the absence rule the whole of `utils/price.js` is built on — refuses them?
// Nine do. Every one of them is unstated, and no stated shape moves. That column is this lane's
// FALSIFICATION TARGET: this lane changes the predicate's NAME (`isAmountInPlay`, with
// `isDeductionInPlay` delegating to it) and must not change a single answer in it. A run in which a
// stated shape moves means the fix is wrong.
//
// THE QUESTION THIS LANE ASKS (parts 2-4). Two sums on the check panel had no absence gate at all:
//
//     g.lineAmount    += line.netLineAmount;          // no gate whatsoever
//     g.depositAmount += line.depositAmount || 0;     // the same `|| 0` family
//
// `line` is the WIRE object. `0 + null` is `0`, so both sums manufactured a genuine-looking zero out
// of an absence one screen before any gate was in a position to refuse it.
//
// AND THE HARM IS NOT A ROW THIS TIME — IT IS A REFUND (part 3). `SellScreen.onNegativeSale` reads
// `g.lineAmount` as the `unitAmount` of the return line whenever a discount is in play. So the
// manufactured zero is not merely printed, it is HANDED BACK. Part 3 is the assertion that matters:
// under the old sum the ABSENT world and the GENUINELY-ZERO world produce the SAME refund, which is
// why a test that only checks the sum would pass on a fix that still builds the wrong return.
//
// Run:  node lanes/L-CHECK-LINEAMOUNT-UNGATED-SUM/refund-vs-sum-probe.js

// ---------------------------------------------------------------------------------------------
// Verbatim from utils/price.js.
// ---------------------------------------------------------------------------------------------
const isAmountStated = (a) => {
  if (a === null || a === undefined) { return false }
  if (typeof a === 'number') { return Number.isFinite(a) }
  if (typeof a === 'string') { return a.trim() !== '' && Number.isFinite(Number(a)) }
  return false
}

const statedSum = (...amounts) => {
  let total = 0
  for (const amount of amounts) {
    if (!isAmountStated(amount)) { return null }
    total += Number(amount)
  }
  return total
}

// The one implementation, after this lane. `isDeductionInPlay` now delegates to it unchanged.
const isAmountInPlay = (a) => {
  if (!isAmountStated(a)) { return true }
  return Number(a) > 0
}

// Verbatim from core/helpers/tools.ts (priceLabelTool with the admin's "kr " prefix), behind the
// gate `plugins/global-mixin.js` puts in front of it.
const whole = a => (!a ? '0' : (a.toString().slice(0, -2) || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' '))
const fraction = a => (!a ? '00' : a.toString().slice(-2).padStart(2, '0'))
const priceLabel = a => (!isAmountStated(a) ? '—' : 'kr ' + whole(a) + ',' + fraction(a))

// ---------------------------------------------------------------------------------------------
// PART 1 — the control. Carried forward verbatim; it must not move.
// ---------------------------------------------------------------------------------------------
const SHAPES = [
  ['null', null], ['undefined', undefined], ["''", ''], ["'   '", '   '], ['NaN', NaN],
  ['0', 0], ['-0', -0], ['-1', -1], ['-5000', -5000], ['5000', 5000], ["'50'", '50'],
  ['Infinity', Infinity], ['-Infinity', -Infinity], ["'Infinity'", 'Infinity'],
  ['true', true], ['false', false], ['{}', {}], ['{valueOf:()=>5000}', { valueOf: () => 5000 }],
  ['[]', []]
]

console.log('PART 1 — the predicate column, carried forward. It is the control, not the finding.\n')
console.log('shape                   `> 0`         isAmountInPlay    stated?')
const moved = []
for (const [name, v] of SHAPES) {
  const guard = v > 0
  const rule = isAmountInPlay(v)
  const stated = isAmountStated(v)
  if (guard !== rule) { moved.push([name, stated]) }
  console.log(
    name.padEnd(22), String(guard).padEnd(13), String(rule).padEnd(17), String(stated) +
    (guard !== rule ? '   <-- MOVES' : ''))
}
const movedStated = moved.filter(([, stated]) => stated)
console.log('\nshapes whose answer moves:', moved.length, '->', moved.map(([n]) => n).join(', '))
console.log('of those, STATED (must be zero):', movedStated.length,
  movedStated.length ? '<-- FALSIFIED: ' + movedStated.map(([n]) => n).join(', ') : '(none)')
console.log(moved.length === 9 && movedStated.length === 0
  ? 'UNCHANGED from both siblings: nine shapes, every one unstated. The rename moved nothing.'
  : '*** THE COLUMN MOVED. The rename is not behaviour-preserving; the fix is wrong. ***')

// ---------------------------------------------------------------------------------------------
// PART 2 — the two sums, over the three worlds.
//
// The backend's arithmetic is fixed and checkable, so the worlds are judged against it rather than
// against the panel:
//     OpenCheckModels.cs:145   NetLineAmount = LineAmount - DiscountAmount
//     OpenCheckService.cs:764  LineGross(item) = GrossLineAmount() - DiscountAmount
//     OpenCheckService.cs:644  order.FinalAmount = order.Items.Sum(LineGross)
// In every world below the money that moved is IDENTICAL and the till took the same amount; only
// which fields describe it on the wire differs. That is the whole point of an absent world.
// ---------------------------------------------------------------------------------------------
const line = (gross, trueDiscount, statedNet, statedDeposit) => ({
  lineAmount: gross,
  // Stated in every world: a discount IS in play throughout, which is what keeps
  // `onNegativeSale` on the branch that reads the sum.
  discountAmount: trueDiscount,
  netLineAmount: statedNet,
  depositAmount: statedDeposit,
  trueNet: gross - trueDiscount
})

// Two identical coffees, 50,00 gross each, 50,00 comped across the pair (30,00 / 20,00 — an uneven
// split on purpose, so a wrong sum cannot still look like half of something). Pant 5,00 a cup.
const WORLDS = {
  // Both member lines state their net and their pant.
  present: [line(5000, 3000, 2000, 500), line(5000, 2000, 3000, 500)],
  // Nothing was charged at all: both lines fully comped, and both SAY so. A stated zero is a
  // reading, not an absence — the customer paid nothing and is owed nothing back.
  zero: [line(5000, 5000, 0, 0), line(5000, 5000, 0, 0)],
  // 50,00 was taken and neither line's `netLineAmount` arrived. This is the world that collapses.
  absent: [line(5000, 3000, null, null), line(5000, 2000, null, null)],
  // One silent member: the sum understates rather than collapsing, which is the plausible shape.
  partial: [line(5000, 3000, 2000, 500), line(5000, 2000, null, null)]
}

const oldLineSum = ls => ls.reduce((s, l) => s + l.netLineAmount, 0)
const oldDepositSum = ls => ls.reduce((s, l) => s + (l.depositAmount || 0), 0)
const newLineSum = ls => ls.reduce((s, l) => statedSum(s, l.netLineAmount), 0)
const newDepositSum = ls => ls.reduce((s, l) => statedSum(s, l.depositAmount), 0)
// What the till actually took for the row, from fields the panel does not build the row out of.
const tillTook = ls => ls.reduce((s, l) => s + l.trueNet, 0)

console.log('\n\nPART 2 — the two sums.\n')
console.log('world      till took   OLD lineAmount   NEW lineAmount   OLD deposit   NEW deposit')
for (const [name, ls] of Object.entries(WORLDS)) {
  console.log(
    name.padEnd(10),
    String(tillTook(ls)).padEnd(11),
    String(oldLineSum(ls)).padEnd(16),
    String(newLineSum(ls)).padEnd(16),
    String(oldDepositSum(ls)).padEnd(13),
    String(newDepositSum(ls)))
}
console.log('\nOLD `absent` reports', oldLineSum(WORLDS.absent), 'for a row the till took',
  tillTook(WORLDS.absent), '-- and it is INDISTINGUISHABLE from `zero`.')
console.log('OLD `partial` reports', oldLineSum(WORLDS.partial), 'for a row the till took',
  tillTook(WORLDS.partial), '-- short by', tillTook(WORLDS.partial) - oldLineSum(WORLDS.partial),
  'and perfectly plausible on screen.')

// ---------------------------------------------------------------------------------------------
// PART 3 — THE FINDING. The refund, not the sum.
//
// `SellScreen.onNegativeSale` (before this lane):
//     if (isDeductionInPlay(g.discountAmount)) {
//       return { quantity: 1, unitAmount: g.lineAmount, ... };   <-- the sum, handed back as money
//     }
//     return { quantity: g.quantity, unitAmount: g.unitAmount, ... };
//
// A discount is in play in every world here, so the first branch is the one taken throughout and
// `unitAmount` IS the sum from part 2.
// ---------------------------------------------------------------------------------------------
const oldRefund = ls => ({ refunds: true, unitAmount: oldLineSum(ls), quantity: 1 })
const newRefund = (ls) => {
  const sum = newLineSum(ls)
  // After this lane: a row whose net nobody stated is refused outright rather than settled from a
  // figure the arithmetic invented.
  if (!isAmountStated(sum)) { return { refunds: false, reason: 'refused: the amount is missing' } }
  return { refunds: true, unitAmount: sum, quantity: 1 }
}
const money = r => (r.refunds ? priceLabel(r.unitAmount * r.quantity) : r.reason)

console.log('\n\nPART 3 — the refund the operator hands back.\n')
console.log('world      till took    OLD refund                        NEW refund')
for (const [name, ls] of Object.entries(WORLDS)) {
  console.log(
    name.padEnd(10),
    priceLabel(tillTook(ls)).padEnd(12),
    money(oldRefund(ls)).padEnd(33),
    money(newRefund(ls)))
}

const oldAbsent = money(oldRefund(WORLDS.absent))
const oldZero = money(oldRefund(WORLDS.zero))
const newAbsent = money(newRefund(WORLDS.absent))
const newZero = money(newRefund(WORLDS.zero))

console.log('\nTHE ASSERTION THIS LANE TURNS ON:')
console.log('  OLD   absent =', oldAbsent, '   zero =', oldZero,
  oldAbsent === oldZero ? '  <-- THE SAME. The absence is invisible in the money.' : '  (differ)')
console.log('  NEW   absent =', newAbsent, '   zero =', newZero,
  newAbsent !== newZero ? '  <-- THEY DIFFER. The absence is refused instead of refunded.' : '  *** STILL THE SAME: NOT FIXED ***')
console.log('\n  A test asserting only the SUM would pass on a fix that still built the wrong return;')
console.log('  a test asserting only that a refund EXISTS would pass on the old code. The falsifying')
console.log('  assertion is that these two worlds stop agreeing about money.')

// ---------------------------------------------------------------------------------------------
// PART 4 — the tag the sum would have switched off behind our backs.
//
// `CheckLine` guarded the pant tag on `group.depositAmount > 0`. Gating the sum makes the row `null`,
// and `null > 0` is FALSE — so fixing the sum alone would have deleted the tag from exactly the rows
// that used to show it. That is the sum's defect moved one screen down, not removed, and it is the
// same coupling the discount lane found between its sum and its row.
// ---------------------------------------------------------------------------------------------
console.log('\n\nPART 4 — the deposit tag, and why it could not stay on `> 0`.\n')
console.log('world      OLD sum  tag(`>0`)   NEW sum  tag(`>0`)          tag(isAmountInPlay)')
for (const [name, ls] of Object.entries(WORLDS)) {
  const o = oldDepositSum(ls)
  const n = newDepositSum(ls)
  const naive = n > 0
  console.log(
    name.padEnd(10),
    String(o).padEnd(8),
    String(o > 0).padEnd(11),
    String(n).padEnd(8),
    (String(naive) + (o > 0 && !naive ? '  <-- SILENTLY OFF' : '')).padEnd(19),
    isAmountInPlay(n))
}
console.log('\n`present` and `partial` both show the tag today. On `> 0` alone, `partial` loses it the')
console.log('moment the sum is gated -- a row that HAS pant quietly stops saying so. `isAmountInPlay`')
console.log('keeps the stated zero silent and gives the unstated row its tag, carrying the unknown mark.')

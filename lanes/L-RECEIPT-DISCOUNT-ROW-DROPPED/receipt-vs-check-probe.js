// CARRIED FORWARD TWICE, not rewritten. `lanes/L-XZ-RESIDUAL-SITES/guard-vs-rule-probe.js` asked
// part 1; `lanes/L-CHECK-DISCOUNT-SUM-COUPLED/sum-vs-guard-probe.js` added parts 2-4 for the open
// check. Both files are left untouched so their own mutation-logs still describe what they point
// at. Parts 1, 3 and 5 are unchanged here, and part 3 is the FALSIFICATION TARGET this lane was
// pointed at: the claim that swapping `> 0` for the absence rule is one column wide.
//
// THE QUESTION THIS LANE ASKS (part 6). The check-panel lane corrected its own brief on the way
// past: "the check shows a total that does not match its own lines" DOES NOT HOLD, because
// `CheckLine` renders `netLineAmount`, which is already net of the discount, so the rows add up to
// `finalAmount` whether the deduction row is shown or not. The brief for this lane says: check
// whether the RECEIPT shares that property before repeating the stronger claim.
//
// It does not, and the difference is the whole reason this surface is not cosmetic. A receipt line
// renders `lineAmount`, which is GROSS of the discount, while the printed grand total is the
// discounted figure. The deduction rows are the only thing on the page that closes the gap between
// the two. Part 6 measures it on the estate's own numbers.
//
// Run:  node lanes/L-RECEIPT-DISCOUNT-ROW-DROPPED/receipt-vs-check-probe.js

// Verbatim from utils/price.js.
const isAmountStated = (a) => {
  if (a === null || a === undefined) { return false }
  if (typeof a === 'number') { return Number.isFinite(a) }
  if (typeof a === 'string') { return a.trim() !== '' && Number.isFinite(Number(a)) }
  return false
}

// Verbatim from utils/price.js.
const statedSum = (...amounts) => {
  let total = 0
  for (const amount of amounts) {
    if (!isAmountStated(amount)) { return null }
    total += Number(amount)
  }
  return total
}

// Verbatim from core/helpers/tools.ts (priceLabelTool with the admin's "kr " prefix).
const whole = a => (!a ? '0' : (a.toString().slice(0, -2) || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' '))
const fraction = a => (!a ? '00' : a.toString().slice(-2).padStart(2, '0'))
const priceLabel = a => 'kr ' + whole(a) + ',' + fraction(a)
const UNKNOWN_AMOUNT = '—'
const MINUS_SIGN = '−'
const negatedAmountLabel = (a) => {
  if (!isAmountStated(a)) { return UNKNOWN_AMOUNT }
  const negated = -Number(a)
  return (negated < 0 ? MINUS_SIGN : '') + priceLabel(Math.abs(negated))
}

// The predicate this lane puts on the row. It differs from `> 0` in exactly one place and nowhere
// else: an amount NOBODY STATED now renders a row (which then prints the unknown mark) instead of
// vanishing. Every stated shape — including a genuine zero and a negative — keeps the answer it
// has today. Part 3 is what proves that claim rather than asserting it.
const showsDeductionRow = (a) => {
  if (!isAmountStated(a)) { return true }
  return Number(a) > 0
}

const SHAPES = [
  ['null', null], ['undefined', undefined], ["''", ''], ["'   '", '   '], ['NaN', NaN],
  ['0', 0], ['-0', -0], ['-1', -1], ['-5000', -5000], ['5000', 5000], ["'50'", '50'],
  ['Infinity', Infinity], ['-Infinity', -Infinity], ["'Infinity'", 'Infinity'],
  ['true', true], ['false', false], ['{}', {}], ['{valueOf:()=>5000}', { valueOf: () => 5000 }],
  ['[]', []]
]

// ---------------------------------------------------------------------------------------------
// 1. THE SIBLING'S TABLE, unchanged. `> 0` is a relational test, `isAmountStated` is the absence
//    rule, and they do not agree.
// ---------------------------------------------------------------------------------------------

const rows = SHAPES.map(([name, v]) => ({
  name,
  guard: v > 0,
  stated: isAmountStated(v),
  renders: v > 0 ? (isAmountStated(v) ? 'a figure' : 'THE UNKNOWN MARK') : '(row hidden)'
}))

console.log('1. THE ROW GUARD AGAINST THE ABSENCE RULE\n')
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

// ---------------------------------------------------------------------------------------------
// 2. THE REDUCER. One member line, one shape, through `CheckPanel.groups`. The seed is a real 0,
//    so `+= (x || 0)` cannot tell a line that said nothing from a line that said zero.
// ---------------------------------------------------------------------------------------------

console.log('\n\n2. WHAT ONE MEMBER LINE BECOMES IN THE GROUP TOTAL\n')
console.log('line.discountAmount     `0 + (x || 0)`       statedSum(0, x)')
for (const [name, v] of SHAPES) {
  const coerced = 0 + (v || 0)
  const stated = statedSum(0, v)
  const flag = !isAmountStated(v) && isAmountStated(coerced)
    ? '   <-- AN ABSENCE BECAME A FIGURE'
    : ''
  console.log(
    name.padEnd(22),
    String(coerced).padEnd(20),
    String(stated) + flag)
}

// ---------------------------------------------------------------------------------------------
// 3. THE GUARD THIS LANE PUTS ON THE ROW, against the one that is there now. The only column that
//    may change is the one where the amount is UNSTATED; if any stated shape changes answer, the
//    fix is doing something it did not advertise.
// ---------------------------------------------------------------------------------------------

console.log('\n\n3. THE ROW GUARD BEFORE AND AFTER\n')
console.log('shape                   `> 0` shows   showsDeductionRow   what changes')
const changed = []
for (const [name, v] of SHAPES) {
  const before = v > 0
  const after = showsDeductionRow(v)
  let note = '(same)'
  if (before !== after) {
    note = 'ROW NOW RENDERS -> "' + negatedAmountLabel(v) + '"'
    changed.push(name)
  }
  console.log(name.padEnd(22), String(before).padEnd(13), String(after).padEnd(19), note)
}
console.log('\nshapes whose row changes:', changed.join(', '))
console.log('every one is unstated; no stated shape (0, -5000, 5000, \'50\') changes answer.')
const brokePromise = SHAPES.filter(([, v]) => isAmountStated(v) && ((v > 0) !== showsDeductionRow(v)))
console.log('stated shapes that changed answer:', brokePromise.length === 0 ? 'none' : brokePromise.map(s => s[0]).join(', '))

// ---------------------------------------------------------------------------------------------
// 4. THE MONEY WORLD. Two member lines of ONE grouped row — which is the shape the grouping key
//    is built for: `CheckPanel.groups` folds on `discountReason` and deliberately NOT on the
//    amount, because a fixed discount is split proportionally across the member lines. So a row
//    whose second member's discount never arrived is the ordinary case, not a contrived one.
//
//    The backend is the authority, and its arithmetic is not a guess:
//      OpenCheckModels.cs:145   NetLineAmount = LineAmount - DiscountAmount
//      OpenCheckService.cs:764  LineGross(item) = GrossLineAmount() - DiscountAmount
//      OpenCheckService.cs:644  order.FinalAmount = order.Items.Sum(LineGross)
//    so  finalAmount == SUM(netLineAmount)  and  SUM(lineAmount) - SUM(discountAmount) == finalAmount.
// ---------------------------------------------------------------------------------------------

console.log('\n\n4. A GROUPED ROW WHOSE SECOND MEMBER SAID NOTHING\n')

// Two coffees, 50,00 each gross, 50,00 comped across the pair (30,00 / 20,00 in ore).
const wire = [
  { lineAmount: 5000, discountAmount: 3000, netLineAmount: 2000 },
  { lineAmount: 5000, discountAmount: 2000, netLineAmount: 3000 }
]
const finalAmount = wire.reduce((s, l) => s + l.netLineAmount, 0)
const trueDiscount = wire.reduce((s, l) => s + l.lineAmount, 0) - finalAmount

const worlds = [
  ['present', wire.map(l => l.discountAmount)],
  ['genuinely zero', [0, 0]],
  ['absent', [3000, null]]
]

console.log('backend finalAmount            =', finalAmount, '(' + priceLabel(finalAmount) + ')')
console.log('backend discount it implies    =', trueDiscount, '(SUM lineAmount - finalAmount)\n')
console.log('world             `+= (x||0)`   renders        statedSum   renders   agrees with backend?')
for (const [label, amounts] of worlds) {
  const coerced = amounts.reduce((s, a) => s + (a || 0), 0)
  const stated = statedSum(...amounts)
  // A rendered figure "agrees with the backend" only if it is the discount the backend's own
  // numbers imply. The unknown mark makes no claim, so it cannot disagree.
  const expected = label === 'genuinely zero' ? 0 : trueDiscount
  const coercedOk = coerced === expected ? 'yes' : 'NO -- ' + coerced + ' != ' + expected
  const statedOk = stated === null ? 'makes no claim' : (stated === expected ? 'yes' : 'NO')
  console.log(
    label.padEnd(17),
    String(coerced).padEnd(14),
    negatedAmountLabel(coerced).padEnd(14),
    String(stated).padEnd(11),
    negatedAmountLabel(stated).padEnd(9),
    coercedOk + '  |  ' + statedOk)
}

console.log('\nthe row itself, in the absent world:')
console.log('  today          sum = 3000, `3000 > 0` is true  -> the row prints ' + negatedAmountLabel(3000)
  + ', a real figure that is WRONG')
console.log('  sum fixed only sum = null, `null > 0` is false -> NO ROW AT ALL, which reads as "no discount"')
console.log('  both fixed     sum = null, showsDeductionRow    -> the row prints ' + negatedAmountLabel(null)
  + ', which is the only true reading')

// The claim inherited from the sibling's comment, MEASURED. It does not hold for this backend.
const renderedLineSum = wire.reduce((s, l) => s + l.netLineAmount, 0)
console.log('\nINHERITED PREMISE, CHECKED: "the check shows a total that does not match its own lines".')
console.log('  the rows render netLineAmount, and SUM(netLineAmount) =', renderedLineSum,
  renderedLineSum === finalAmount ? '== finalAmount' : '!= finalAmount')
console.log('  so the lines DO add up to the total whether the discount row is shown or not.')
console.log('  the harm is not a visible mismatch; it is a discount figure that is quietly too small,')
console.log('  and then a row that disappears. That is what the tests assert.')

// ---------------------------------------------------------------------------------------------
// 6. THE SAME THREE WORLDS ON A PRINTED RECEIPT, where the arithmetic is NOT the check's.
//
//    A receipt line and a check line are built from different fields, and that is the whole of it:
//
//      JournalLineFactory.cs:95-105   lineAmount = unitGross * quantity
//                                     LineAmount  = lineAmount            <-- GROSS of the discount
//                                     DiscountAmount journalled BESIDE it
//                                     netLineAmount = lineAmount - discountAmount, never journalled
//      FinalizeService.cs:150-160     netLineTotal = SUM(LineAmount) - SUM(DiscountAmount)
//                                     grossAmount  = netLineTotal + roundingAmount
//      FinalizeService.cs:169         netLineTotal == order.FinalAmount, ENFORCED
//      PosReceiptService.cs:161       receipt.GrossAmount = entry.GrossAmount
//
//    `PosReceiptView` renders `line.lineAmount` per row and `receipt.grossAmount` as the grand
//    total. So the printed rows are gross, the printed total is net, and the DEDUCTION ROWS ARE THE
//    ONLY THING ON THE PAPER THAT BRIDGES THEM. Drop one and the page does not add up, with nothing
//    on it to say why.
//
//    The numbers below are not invented. They are asserted, in this exact combination, by the
//    backend's own end-to-end test `WebApi.Tests/Kassa/Cov_FinalizeVatTests.cs`
//    (`FinalizeMixedVatDiscountedCheck_SplitsVatPerRateOnDiscountedNet`): a 25 % drink at 20000 and
//    a 15 % food at 10000, a whole-order 20 % discount distributed proportionally to 4000 and 2000,
//    `check.FinalAmount == 24000` and `receipt.GrossAmount == 24000`. A whole-order discount SPLIT
//    ACROSS LINES is the ordinary case, which is why one silent line is the ordinary shape of this
//    bug rather than a contrived one.
// ---------------------------------------------------------------------------------------------

console.log('\n\n6. THE RECEIPT: WHAT THE PRINTED PAGE ADDS UP TO\n')

// Cov_FinalizeVatTests.cs, verbatim.
const receiptLines = [
  { name: 'Brus', lineAmount: 20000, discountAmount: 4000 },
  { name: 'Bolle', lineAmount: 10000, discountAmount: 2000 }
]
const backendFinalAmount = 24000 // check.FinalAmount, == receipt.GrossAmount with no rounding
const printedLineSum = receiptLines.reduce((s, l) => s + l.lineAmount, 0)
const backendDeduction = printedLineSum - backendFinalAmount

console.log('printed line amounts sum to     ', printedLineSum, '(' + priceLabel(printedLineSum) + ')')
console.log('printed grand total (grossAmount)', backendFinalAmount, '(' + priceLabel(backendFinalAmount) + ')')
console.log('the gap the deduction rows must carry', backendDeduction, '(' + priceLabel(backendDeduction) + ')\n')

// The three worlds, applied to the SECOND line only — one line states its deduction, the other does
// not. That is the shape a proportional split produces when one member goes silent.
const receiptWorlds = [
  ['present', [4000, 2000]],
  ['genuinely zero', [0, 0]],
  ['absent', [4000, null]]
]

console.log('world           guard `>0` rows   printed deductions   page adds up?        rule rows  page adds up?')
for (const [label, amounts] of receiptWorlds) {
  const total = label === 'genuinely zero' ? printedLineSum : backendFinalAmount
  const gap = printedLineSum - total

  const guardRows = amounts.filter(a => a > 0)
  const guardStated = guardRows.reduce((s, a) => s + Number(a), 0)
  const guardUnknown = guardRows.filter(a => !isAmountStated(a)).length
  const guardResidual = gap - guardStated
  const guardVerdict = guardResidual === 0
    ? 'yes'
    : (guardUnknown > 0 ? 'residual ' + guardResidual + ' marked' : 'NO -- ' + guardResidual + ' UNACCOUNTED')

  const ruleRows = amounts.filter(a => showsDeductionRow(a))
  const ruleStated = ruleRows.filter(a => isAmountStated(a)).reduce((s, a) => s + Number(a), 0)
  const ruleUnknown = ruleRows.filter(a => !isAmountStated(a)).length
  const ruleResidual = gap - ruleStated
  const ruleVerdict = ruleResidual === 0
    ? 'yes'
    : (ruleUnknown > 0 ? 'residual ' + ruleResidual + ' MARKED "' + UNKNOWN_AMOUNT + '"' : 'NO -- ' + ruleResidual + ' unaccounted')

  console.log(
    label.padEnd(15),
    String(guardRows.length).padEnd(17),
    String(guardStated).padEnd(20),
    guardVerdict.padEnd(20),
    String(ruleRows.length).padEnd(10),
    ruleVerdict)
}

console.log('\nthe absent world is the whole finding, and it is arithmetic rather than layout:')
console.log('  today   the page prints 200,00 + 100,00, one deduction of 40,00, total 240,00.')
console.log('          20,00 is missing from a document that is supposed to reconcile, and there is')
console.log('          no row on it that says so.')
console.log('  fixed   the second deduction row renders "' + negatedAmountLabel(null)
  + '", so the page states that a deduction was taken')
console.log('          on that line whose amount it does not have. The total is unchanged and still')
console.log('          agrees with the backend; what changes is that the page stops implying zero.')

console.log('\nAND THE CHECK, FOR CONTRAST — the property the sibling lane measured and this one inherited:')
const checkNetRows = receiptLines.map(l => l.lineAmount - l.discountAmount)
console.log('  CheckLine renders netLineAmount:', checkNetRows.join(' + '), '=',
  checkNetRows.reduce((s, n) => s + n, 0),
  checkNetRows.reduce((s, n) => s + n, 0) === backendFinalAmount ? '== finalAmount' : '!= finalAmount')
console.log('  so the CHECK adds up in all three worlds and only the deduction figure is wrong.')
console.log('  the RECEIPT does not add up at all. Same predicate, different harm, and the stronger')
console.log('  claim is true HERE and only here.')

// ---------------------------------------------------------------------------------------------
// 5. THE SIBLING'S CLOSING FACTS, unchanged.
// ---------------------------------------------------------------------------------------------

console.log('\n\n5. WHY THE LABEL TAKES A MAGNITUDE, AND WHERE Infinity COMES FROM\n')
console.log('JSON.parse(\'{"a":1e400}\').a =', JSON.parse('{"a":1e400}').a,
  '-- Infinity has a wire provenance; a well-formed .NET long does not reach it.')
console.log('\ncore priceLabel on negatives:')
for (const n of [-4, -50, -5000]) { console.log('  ' + String(n).padStart(6) + ' -> ' + priceLabel(n)) }

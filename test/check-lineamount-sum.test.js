import { mount } from '@vue/test-utils'
import '~/plugins/global-mixin'
import { UNKNOWN_AMOUNT, isAmountStated, isAmountInPlay, isDeductionInPlay } from '~/utils/price'
import CheckLine from '~/components/admin/pos/CheckLine.vue'
import CheckPanel from '~/components/admin/pos/CheckPanel.vue'
import SellScreen from '~/components/admin/pos/SellScreen.vue'

// Two sums on the check panel that had no absence gate at all, and a REFUND built out of one of them.
//
// THE SUMS. `CheckPanel.groups` folds the check's wire lines into the rows the operator sees:
//
//     g.lineAmount    += line.netLineAmount;        // no gate whatsoever
//     g.depositAmount += line.depositAmount || 0;   // the same `|| 0` family
//
// `line` is the WIRE object. `0 + null` is `0`, so a member line whose net never arrived was folded
// in as a zero — a hole filled by the arithmetic one screen before any gate was in a position to
// refuse it. The sibling lanes gated the DISCOUNT beside these two and left these; both routed here
// saying so.
//
// WHY THIS IS NOT A ROW. `g.lineAmount` is read by `SellScreen.onNegativeSale` as the `unitAmount`
// of a return line whenever a discount is in play, so the manufactured zero is not merely printed —
// it is HANDED BACK. The sibling that fixed the discount found the same path the hard way: it built
// a return from the listed price when the discount was unstated, refunding money the shop never took.
// This is the same path reached through the other field, and it fails in the opposite direction.
//
// WHAT IS PROVED AGAINST WHAT. Not the panel against itself. The backend's arithmetic is fixed and
// checkable —
//     OpenCheckModels.cs:145   NetLineAmount = LineAmount - DiscountAmount
//     OpenCheckService.cs:764  LineGross(item) = GrossLineAmount() - DiscountAmount
//     OpenCheckService.cs:644  order.FinalAmount = order.Items.Sum(LineGross)
// — so `finalAmount` is what the till took, computed by the server from fields the panel does not
// build the row out of. Every refund below is asserted against THAT.
//
// THE FALSIFYING ASSERTION, AND WHY THE OBVIOUS ONE IS NOT IT. A test that only checks the SUM
// passes on a fix that still builds the wrong return, and a test that only checks a refund EXISTS
// passes on the old code. The assertion this lane turns on is that the ABSENT world and the
// GENUINELY-ZERO world stop agreeing about money: under the old sum both refunded kr 0,00 — one
// because nothing was ever charged, the other because a field went missing on a bill the till took
// 50,00 for — and nothing on screen or in the journal told them apart.
// `lanes/L-CHECK-LINEAMOUNT-UNGATED-SUM/refund-vs-sum-probe.js` prints that collapse.

const posMocks = () => ({
  $i: (key, args) => (args ? key + ':' + JSON.stringify(args) : key),
  $store: { dispatch: () => {}, subscribe: () => {} }
})

// One grouped row, two member lines: two coffees at 50,00 gross each, discounted, 5,00 pant a cup.
// The grouping key folds on the discount REASON and deliberately not on the amount, so "one row,
// several members, one of them silent" is the ordinary shape of the bug rather than a contrived one.
const COFFEE = {
  productId: 7,
  name: 'Kaffe',
  isOpenPrice: false,
  options: [],
  notes: '',
  courseSequence: null,
  seatNumber: null,
  status: 'Pending',
  unitAmount: 5000,
  tax: 25,
  quantity: 1,
  goodsGroupId: 3,
  discountReason: 'Personalrabatt'
}

// `trueNet` is the test's own bookkeeping and is never read by the panel: it is what the server
// charged for the line, which is how `finalAmount` below is built. `netLineAmount` is what the WIRE
// says about it, and the two part company in exactly the worlds this lane is about.
const lineWith = (id, gross, trueDiscount, statedNet, statedDeposit) => ({
  ...COFFEE,
  orderLineItemId: id,
  lineAmount: gross,
  discountAmount: trueDiscount,
  netLineAmount: statedNet,
  depositAmount: statedDeposit,
  trueNet: gross - trueDiscount
})

const checkOf = lines => ({
  tableId: null,
  tableName: null,
  couverts: 2,
  deliveryType: 'TableDelivery',
  // Always from the TRUE nets. That is the whole point of an absent world: the money left the till,
  // and only the field describing it went missing.
  finalAmount: lines.reduce((sum, l) => sum + l.trueNet, 0),
  items: lines
})

const WORLDS = {
  // Both member lines state their net and their pant. 50,00 comped across the pair (30,00 / 20,00 —
  // uneven on purpose, so a wrong sum cannot still look like half of something).
  present: checkOf([
    lineWith(1, 5000, 3000, 2000, 500),
    lineWith(2, 5000, 2000, 3000, 500)
  ]),
  // Fully comped, and both lines SAY so. A stated zero is a reading, not an absence: the customer
  // paid nothing and is owed nothing back, and that answer must survive the fix.
  zero: checkOf([
    lineWith(1, 5000, 5000, 0, 0),
    lineWith(2, 5000, 5000, 0, 0)
  ]),
  // 50,00 was taken — `finalAmount` carries it — and NEITHER line's net arrived. This is the world
  // that collapsed onto `zero`.
  absent: checkOf([
    lineWith(1, 5000, 3000, null, null),
    lineWith(2, 5000, 2000, null, null)
  ]),
  // One silent member. The old sum understates rather than collapsing, which is the more plausible
  // shape on screen and the one that keeps the deposit tag honest below.
  partial: checkOf([
    lineWith(1, 5000, 3000, 2000, 500),
    lineWith(2, 5000, 2000, null, null)
  ])
}

// TWO rows, and it is the SECOND one whose net never arrived. Kept out of WORLDS above because it
// deliberately folds to two groups rather than one.
//
// WHY IT EXISTS. The mutation proof caught this hole rather than an argument doing it: with a
// single-row bill in every world, a refusal written `groups.slice(0, 1).filter(...)` — inspecting
// only the row it happens to reach first — passed the entire suite. A real bill is many rows and a
// dropped field lands on whichever one the serializer lost, so a check that stops at the first row
// would settle this bill: one row honestly, the other from a figure nobody stated.
const SECOND_ROW_SILENT = checkOf([
  lineWith(1, 5000, 3000, 2000, 500),
  { ...lineWith(2, 8000, 3000, null, null), productId: 9, name: 'Bolle', unitAmount: 8000 }
])

const mountPanel = check => mount(CheckPanel, { propsData: { check }, mocks: posMocks() })

describe('the worlds differ only in what the LINES state, never in what the server charged', () => {
  test('every discounted world took the same money off the same customer', () => {
    expect(WORLDS.absent.finalAmount).toBe(WORLDS.present.finalAmount)
    expect(WORLDS.partial.finalAmount).toBe(WORLDS.present.finalAmount)
    expect(WORLDS.present.finalAmount).toBe(5000)
    // The comped bill really did take nothing, and that is a different fact from a missing field.
    expect(WORLDS.zero.finalAmount).toBe(0)
  })

  test('a discount is in play in every world, so the refund branch under test is the one taken', () => {
    for (const world of Object.keys(WORLDS)) {
      for (const item of WORLDS[world].items) {
        expect(isDeductionInPlay(item.discountAmount)).toBe(true)
      }
    }
  })

  test('all four worlds fold to exactly one row', () => {
    for (const world of Object.keys(WORLDS)) {
      const wrapper = mountPanel(WORLDS[world])
      expect(wrapper.vm.groups).toHaveLength(1)
      wrapper.destroy()
    }
  })
})

// ---------------------------------------------------------------------------------------------
// The sums themselves.
// ---------------------------------------------------------------------------------------------

describe('the line sum distinguishes an absent amount from a zero', () => {
  const lineAmountOf = (world) => {
    const wrapper = mountPanel(WORLDS[world])
    const value = wrapper.vm.groups[0].lineAmount
    wrapper.destroy()
    return value
  }

  test('a stated net sums to what the server charged', () => {
    expect(lineAmountOf('present')).toBe(WORLDS.present.finalAmount)
  })

  test('a genuinely zero net survives as a zero and is not withheld', () => {
    expect(lineAmountOf('zero')).toBe(0)
    expect(isAmountStated(lineAmountOf('zero'))).toBe(true)
  })

  test('an absent net is withheld rather than folded in as a zero', () => {
    expect(isAmountStated(lineAmountOf('absent'))).toBe(false)
    // The coercion this replaces: `0 + null` is `0`, so the row reported nothing charged on a bill
    // the till took 50,00 for.
    expect(lineAmountOf('absent')).not.toBe(0)
  })

  test('one silent member is enough — a sum missing a term is not a total', () => {
    expect(isAmountStated(lineAmountOf('partial'))).toBe(false)
    // and never the surviving member's share dressed up as the row's total
    expect(lineAmountOf('partial')).not.toBe(2000)
  })

  // The three worlds are three different readings and none of them may render alike.
  test('the row prints a figure, a zero and the unknown mark, never the same thing twice', () => {
    const rendered = {}
    for (const world of ['present', 'zero', 'absent']) {
      const wrapper = mountPanel(WORLDS[world])
      rendered[world] = wrapper.find('.check-line__amount').text()
      wrapper.destroy()
    }
    expect(rendered.present).toContain('kr 50,00')
    expect(rendered.zero).toContain('kr 0,00')
    expect(rendered.absent).toBe(UNKNOWN_AMOUNT)
    expect(new Set(Object.values(rendered)).size).toBe(3)
  })
})

describe('the deposit sum distinguishes an absent amount from a zero', () => {
  const depositOf = (world) => {
    const wrapper = mountPanel(WORLDS[world])
    const value = wrapper.vm.groups[0].depositAmount
    wrapper.destroy()
    return value
  }

  test('stated pant sums across the members', () => {
    expect(depositOf('present')).toBe(1000)
  })

  test('a stated zero means no pant and stays a zero', () => {
    expect(depositOf('zero')).toBe(0)
    expect(isAmountStated(depositOf('zero'))).toBe(true)
  })

  test('an absent deposit is withheld rather than coerced by `|| 0`', () => {
    expect(isAmountStated(depositOf('absent'))).toBe(false)
    expect(depositOf('absent')).not.toBe(0)
  })

  test('one silent member withholds the row total instead of understating it', () => {
    expect(isAmountStated(depositOf('partial'))).toBe(false)
    // `500` is what `|| 0` produced: a full row's pant, short by one bottle, and unreadable as such.
    expect(depositOf('partial')).not.toBe(500)
  })
})

// ---------------------------------------------------------------------------------------------
// THE DELIVERABLE. The refund, not the sum.
//
// `onNegativeSale` is called off the component's own options with the groups a real mounted panel
// produced, so the two halves are proved composed rather than separately. Mounting SellScreen would
// additionally stand up a POS service, a catalog and eleven child components to reach these lines.
// ---------------------------------------------------------------------------------------------

describe('turning a bill whose row total nobody stated into a return', () => {
  // vue-jest hands back the component options object; a `Vue.extend`ed constructor would put them
  // behind `.options`. Resolve both rather than pin the loader's shape.
  const posMethods = () => (SellScreen.options || SellScreen).methods

  test('the method under test is the one the sell screen actually wires up', () => {
    expect(typeof posMethods().onNegativeSale).toBe('function')
  })

  const attemptReturnOn = (check) => {
    const wrapper = mountPanel(check)
    const groups = wrapper.vm.groups
    const vm = {
      negativeSalePrefill: null,
      showNegativeSale: false,
      notified: [],
      $i: (key, args) => (args ? key + ':' + JSON.stringify(args) : key),
      notify (message, type) { this.notified.push({ message, type }) }
    }
    posMethods().onNegativeSale.call(vm, groups)
    wrapper.destroy()
    return vm
  }

  const attemptReturn = world => attemptReturnOn(WORLDS[world])

  // The money a run of this flow actually hands the customer: `null` when it refuses to build one.
  const refundOf = (world) => {
    const vm = attemptReturn(world)
    if (!vm.negativeSalePrefill) { return null }
    return vm.negativeSalePrefill.reduce((sum, l) => sum + l.unitAmount * l.quantity, 0)
  }

  test('a stated bill refunds exactly what the till took', () => {
    expect(refundOf('present')).toBe(WORLDS.present.finalAmount)
    expect(refundOf('present')).toBe(5000)
  })

  test('a comped bill refunds nothing, because nothing was taken', () => {
    expect(refundOf('zero')).toBe(WORLDS.zero.finalAmount)
    expect(refundOf('zero')).toBe(0)
  })

  test('a bill whose row total nobody stated builds no return at all', () => {
    const vm = attemptReturn('absent')
    expect(vm.negativeSalePrefill).toBeNull()
    expect(vm.showNegativeSale).toBe(false)
  })

  // ============================================================================================
  // THE ASSERTION THIS LANE TURNS ON. Under the old sum both worlds refunded kr 0,00 — the comped
  // bill because nothing was charged, the absent bill because `0 + null + null` is `0` on a bill
  // the till took 50,00 for. Same prefill, same journal, same money, two entirely different facts.
  // A fix that gates the sum but still builds a return from it leaves them agreeing again, at
  // `null * 1`; this is the assertion that refuses that fix.
  // ============================================================================================
  test('THE FALSIFIER: the absent world and the zero world stop agreeing about money', () => {
    const absent = refundOf('absent')
    const zero = refundOf('zero')

    expect(zero).toBe(0)
    expect(absent).not.toBe(zero)
    expect(absent).toBeNull()
  })

  test('and the operator is told which row, rather than handed a silent zero', () => {
    const vm = attemptReturn('absent')
    expect(vm.notified).toHaveLength(1)
    expect(vm.notified[0].type).toBe('error')
    expect(vm.notified[0].message).toContain('pos_negative_sale_unpriceable')
    // Named, because a bill can carry rows the operator must go and look at.
    expect(vm.notified[0].message).toContain('Kaffe')
  })

  // The plausible shape, and the one a sum-only fix would still get wrong in the other direction.
  test('one silent member refuses too, rather than under-refunding the customer', () => {
    const vm = attemptReturn('partial')
    expect(vm.negativeSalePrefill).toBeNull()
    // `2000` is what `+= line.netLineAmount` produced here: a perfectly plausible kr 20,00 handed
    // back on a bill the till took kr 50,00 for, and nothing on the receipt says which term is missing.
    expect(refundOf('partial')).not.toBe(2000)
  })

  // The hole the mutation proof found. A refusal that stops at the first row leaves this bill
  // settling one honest row beside one built from a figure nobody stated.
  test('every row is inspected, not just the first one', () => {
    const wrapper = mountPanel(SECOND_ROW_SILENT)
    expect(wrapper.vm.groups).toHaveLength(2)
    expect(isAmountStated(wrapper.vm.groups[0].lineAmount)).toBe(true)
    expect(isAmountStated(wrapper.vm.groups[1].lineAmount)).toBe(false)
    wrapper.destroy()

    const vm = attemptReturnOn(SECOND_ROW_SILENT)
    expect(vm.negativeSalePrefill).toBeNull()
    expect(vm.showNegativeSale).toBe(false)
    // and it names the row that is actually missing, not the one that is fine
    expect(vm.notified[0].message).toContain('Bolle')
    expect(vm.notified[0].message).not.toContain('Kaffe')
  })

  test('a refused return never reaches the settle screen', () => {
    for (const world of ['absent', 'partial']) {
      expect(attemptReturn(world).showNegativeSale).toBe(false)
    }
    for (const world of ['present', 'zero']) {
      expect(attemptReturn(world).showNegativeSale).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------------------------
// The tag the sum would otherwise have switched off behind our backs — the same coupling the
// discount lane found between its sum and its row, one field over.
// ---------------------------------------------------------------------------------------------

describe('the deposit tag survives the sum being gated', () => {
  const tagOf = (world) => {
    const wrapper = mountPanel(WORLDS[world])
    const tag = wrapper.find('.check-line__tag--deposit')
    const result = { exists: tag.exists(), text: tag.exists() ? tag.text() : null }
    wrapper.destroy()
    return result
  }

  test('stated pant shows the tag', () => {
    expect(tagOf('present').exists).toBe(true)
  })

  test('a stated zero shows no tag, because there is no pant on this row', () => {
    expect(tagOf('zero').exists).toBe(false)
  })

  test('an unstated deposit still shows the tag, carrying the unknown mark', () => {
    const tag = tagOf('absent')
    expect(tag.exists).toBe(true)
    expect(tag.text).toContain(UNKNOWN_AMOUNT)
  })

  // THE NON-REGRESSION. This row shows the tag today, on the strength of a manufactured `500`.
  // Gating the sum makes it `null`, and `null > 0` is false — so leaving the guard on `> 0` would
  // have deleted the tag from a row that genuinely has pant. Fixing the sum alone moves the defect
  // one screen down rather than removing it.
  test('a row with one silent member keeps its tag instead of quietly losing it', () => {
    expect(tagOf('partial').exists).toBe(true)
    expect(tagOf('partial').text).toContain(UNKNOWN_AMOUNT)
  })

  test('the row still renders as a CheckLine child, not a hand-built prop', () => {
    const wrapper = mountPanel(WORLDS.partial)
    expect(wrapper.findAllComponents(CheckLine)).toHaveLength(1)
    wrapper.destroy()
  })
})

// ---------------------------------------------------------------------------------------------
// The predicate this lane renamed. `isDeductionInPlay` now delegates to `isAmountInPlay` so a
// deposit — an addition to the bill — is not gated by a function that calls itself a deduction.
// The rename must not move a single answer; the table is produced by
// `lanes/L-CHECK-LINEAMOUNT-UNGATED-SUM/refund-vs-sum-probe.js`.
// ---------------------------------------------------------------------------------------------

describe('isAmountInPlay is the same rule under a general name', () => {
  const SHAPES = [
    ['null', null], ['undefined', undefined], ["''", ''], ["'   '", '   '], ['NaN', NaN],
    ['0', 0], ['-0', -0], ['-1', -1], ['-5000', -5000], ['5000', 5000], ["'50'", '50'],
    ['Infinity', Infinity], ['-Infinity', -Infinity], ["'Infinity'", 'Infinity'],
    ['true', true], ['false', false], ['{}', {}], ['{valueOf:()=>5000}', { valueOf: () => 5000 }],
    ['[]', []]
  ]

  test('the deduction name answers identically on every shape', () => {
    for (const [, v] of SHAPES) {
      expect(isDeductionInPlay(v)).toBe(isAmountInPlay(v))
    }
  })

  // The column both siblings measured, asserted here so a third extension cannot widen it. If a
  // STATED shape ever moves, the predicate has stopped being one column wide and the fix is wrong.
  test('the change against `> 0` is exactly nine shapes, every one of them unstated', () => {
    const moved = SHAPES.filter(([, v]) => (v > 0) !== isAmountInPlay(v))

    expect(moved).toHaveLength(9)
    expect(moved.filter(([, v]) => isAmountStated(v))).toEqual([])
    expect(moved.map(([name]) => name)).toEqual(
      ['null', 'undefined', "''", "'   '", 'NaN', '-Infinity', 'false', '{}', '[]'])
  })

  test('a stated zero still positively says there is nothing here', () => {
    expect(isAmountInPlay(0)).toBe(false)
    expect(isAmountInPlay(-0)).toBe(false)
  })
})

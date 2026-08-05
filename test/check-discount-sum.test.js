import { mount } from '@vue/test-utils'
import '~/plugins/global-mixin'
import { MINUS_SIGN, UNKNOWN_AMOUNT, isAmountStated, isDeductionInPlay } from '~/utils/price'
import CheckLine from '~/components/admin/pos/CheckLine.vue'
import CheckPanel from '~/components/admin/pos/CheckPanel.vue'
import SellScreen from '~/components/admin/pos/SellScreen.vue'

// A sum that manufactured a zero, and a guard that then hid the row it should have produced.
//
// THE SUM. `CheckPanel.groups` folded the check's wire lines into the rows the operator sees with
// `g.discountAmount += line.discountAmount || 0`. `line` is the WIRE object, so a member line whose
// discount never arrived was added as a zero — a hole filled in by the arithmetic, one screen before
// any gate was in a position to refuse it. The grouping key folds on the discount REASON and
// deliberately not on the amount, precisely because a fixed discount is split proportionally across
// the member lines; so "one row, several members, one of them silent" is the ordinary shape of this
// bug rather than a contrived one. The row then printed a real-looking figure that was too small.
//
// THE GUARD, AND WHY ONE CHANGE COULD NOT SHIP WITHOUT THE OTHER. Refusing the absence makes the
// group's discount `null`, `null > 0` is false, and the `v-if` on the row DELETED the discount
// entirely — while the server's `finalAmount` still carried it. Fixing the sum alone moves the error
// rather than removing it: a wrong figure becomes a missing row, and a missing discount row on a
// till reads as "no discount was given". That is why one lane owns both.
//
// WHAT IS PROVED AGAINST WHAT. Not the panel against itself. The backend's arithmetic is fixed and
// checkable —
//     OpenCheckModels.cs:145   NetLineAmount = LineAmount - DiscountAmount
//     OpenCheckService.cs:764  LineGross(item) = GrossLineAmount() - DiscountAmount
//     OpenCheckService.cs:644  order.FinalAmount = order.Items.Sum(LineGross)
// — so `SUM(lineAmount) - finalAmount` is the discount the server itself says came off this bill,
// computed from two numbers the panel does not use to build the row. Every world below asserts the
// rendered discount against THAT, and the absent world is the one where the old code renders a
// figure which disagrees with it. A test that only checked the row was present would pass on a sum
// that is still wrong.
//
// THE INHERITED PREMISE, CORRECTED. The comment this lane replaces said the dropped row left "a bill
// whose total is lower than its lines". Measured against the backend above, that is not so: the rows
// render `netLineAmount`, which is already net of the discount, so they add to `finalAmount` whether
// the discount row is shown or not. `sums to the rendered grand total` below asserts that in all
// three worlds. The harm is real but it is not a visible mismatch — it is a deduction understated,
// and then erased, on the document an operator answers for.

const posMocks = () => ({
  $i: (key, args) => (args ? key + ':' + JSON.stringify(args) : key),
  $store: { dispatch: () => {}, subscribe: () => {} }
})

// One grouped row, two member lines: two coffees at 50,00 gross, 50,00 comped across the pair. The
// split is uneven on purpose (30,00 / 20,00), because an even one would let a wrong sum still look
// like half of something.
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
  depositAmount: 0,
  discountReason: 'Personalrabatt'
}

// `lineAmount` is the wire model's GROSS line amount (`CheckLineModel.LineAmount`). `CheckPanel`
// never reads it; the test does, so the number the render is judged against comes from the server
// rather than from the same field the render was built out of.
const lineWith = (id, grossAmount, trueDiscount, statedDiscount) => ({
  ...COFFEE,
  orderLineItemId: id,
  lineAmount: grossAmount,
  netLineAmount: grossAmount - trueDiscount,
  discountAmount: statedDiscount
})

// The server's totals are always built from the TRUE discounts. That is the whole point of the
// absent world: the money left the till, and only the field describing it went missing.
const checkOf = lines => ({
  tableId: null,
  tableName: null,
  couverts: 2,
  deliveryType: 'TableDelivery',
  finalAmount: lines.reduce((sum, l) => sum + l.netLineAmount, 0),
  items: lines
})

// What the server says came off this bill: gross minus what it charged.
const backendDiscountOf = check =>
  check.items.reduce((sum, l) => sum + l.lineAmount, 0) - check.finalAmount

const WORLDS = {
  // Both member lines state their share of the 50,00.
  present: checkOf([
    lineWith(1, 5000, 3000, 3000),
    lineWith(2, 5000, 2000, 2000)
  ]),
  // Nothing was taken off, and both lines say so. A stated zero is a reading, not an absence.
  zero: checkOf([
    lineWith(1, 5000, 0, 0),
    lineWith(2, 5000, 0, 0)
  ]),
  // 50,00 came off — `finalAmount` and both `netLineAmount`s carry it — and the second line's
  // `discountAmount` never arrived.
  absent: checkOf([
    lineWith(1, 5000, 3000, 3000),
    lineWith(2, 5000, 2000, null)
  ])
}

const mountPanel = check => mount(CheckPanel, { propsData: { check }, mocks: posMocks() })

describe('the check the server discounted and the wire only half described', () => {
  test('the three worlds differ only in what the LINES state, never in what the server charged', () => {
    // If a later edit makes the absent world cheaper or dearer than the present one, the comparison
    // below stops being about absence and starts being about two different bills.
    expect(WORLDS.absent.finalAmount).toBe(WORLDS.present.finalAmount)
    expect(backendDiscountOf(WORLDS.absent)).toBe(backendDiscountOf(WORLDS.present))
    expect(backendDiscountOf(WORLDS.present)).toBe(5000)
    expect(backendDiscountOf(WORLDS.zero)).toBe(0)
  })

  test('a stated discount prints the figure the server implies', () => {
    const wrapper = mountPanel(WORLDS.present)
    const cell = wrapper.find('.check-panel__discount')

    expect(cell.exists()).toBe(true)
    expect(cell.text()).toBe(MINUS_SIGN + 'kr 50,00')
    // Against the server's own arithmetic, not against the sum that produced the text.
    expect(cell.text()).toBe(MINUS_SIGN + wrapper.vm.priceLabel(backendDiscountOf(WORLDS.present)))
    expect(wrapper.vm.totalDiscount).toBe(backendDiscountOf(WORLDS.present))
    wrapper.destroy()
  })

  test('a genuinely zero discount renders no row, and the server agrees nothing came off', () => {
    const wrapper = mountPanel(WORLDS.zero)

    expect(backendDiscountOf(WORLDS.zero)).toBe(0)
    expect(wrapper.vm.totalDiscount).toBe(0)
    expect(wrapper.find('.check-panel__discount').exists()).toBe(false)
    wrapper.destroy()
  })

  test('an absent line discount renders the row rather than dropping it', () => {
    const wrapper = mountPanel(WORLDS.absent)
    const cell = wrapper.find('.check-panel__discount')

    // The row is the whole point: without it the bill says no discount was given, and 50,00 was.
    expect(cell.exists()).toBe(true)
    expect(cell.text()).toBe(UNKNOWN_AMOUNT)
    expect(cell.text()).not.toContain(MINUS_SIGN)
    wrapper.destroy()
  })

  test('the absent world states no discount figure that disagrees with the server', () => {
    const wrapper = mountPanel(WORLDS.absent)
    const rendered = wrapper.find('.check-panel__discount').text()
    const stated = backendDiscountOf(WORLDS.absent)
    const manufactured = 3000 // what `+= (x || 0)` produces: the one member that spoke

    // The failure this test exists for. `−kr 30,00` renders, the row is present, and the figure
    // disagrees with the 50,00 the server took — an assertion that only checked `exists()` passes
    // on it.
    expect(manufactured).not.toBe(stated)
    expect(rendered).not.toContain('kr 30,00')
    expect(rendered).not.toContain(wrapper.vm.priceLabel(manufactured))
    // Nor may it claim the right figure: the panel cannot know the split, and guessing it right by
    // arithmetic it does not have would be luck presented as fact.
    expect(rendered).toBe(UNKNOWN_AMOUNT)
    expect(wrapper.vm.totalDiscount).toBeNull()
    wrapper.destroy()
  })

  // The `statedSum` in `totalDiscount` itself, which the reducer's own fix does not reach. With one
  // group absent and another stated, a `sum + (g.discountAmount || 0)` would coerce the null back to
  // zero and present the surviving group's discount as the bill's total.
  test('one absent group does not let another group be printed as the whole discount', () => {
    const check = checkOf([
      lineWith(1, 5000, 2000, null),
      { ...lineWith(2, 9000, 3000, 3000), productId: 9, name: 'Vaffel' }
    ])
    const wrapper = mountPanel(check)

    expect(wrapper.vm.groups).toHaveLength(2)
    expect(backendDiscountOf(check)).toBe(5000)
    expect(wrapper.vm.totalDiscount).toBeNull()
    // `sum + (g.discountAmount || 0)` gives 3000 here — the waffle's discount, printed as the whole
    // bill's. The FOOTER must say it does not know; the waffle's own ROW may still state its 30,00,
    // because that line did state it and a per-line figure is not a claim about the bill.
    expect(wrapper.find('.check-panel__discount').text()).toBe(UNKNOWN_AMOUNT)
    const rows = wrapper.findAll('.check-line__discount')
    expect(rows).toHaveLength(2)
    expect(rows.at(0).text()).toContain(UNKNOWN_AMOUNT)
    expect(rows.at(1).text()).toContain(MINUS_SIGN + 'kr 30,00')
    wrapper.destroy()
  })

  // The premise inherited from the comment this lane replaces, measured rather than repeated. The
  // rows show `netLineAmount`; the server's `finalAmount` is the sum of exactly those; so the lines
  // add up to the total in every world, including the one where the discount row is missing.
  test.each(Object.keys(WORLDS))(
    'the rendered lines sum to the rendered grand total — %s world',
    (world) => {
      const check = WORLDS[world]
      const wrapper = mountPanel(check)

      const lineTotal = wrapper.vm.groups.reduce((sum, g) => sum + g.lineAmount, 0)
      expect(lineTotal).toBe(check.finalAmount)
      expect(wrapper.find('.check-panel__total-row--grand').text())
        .toContain(wrapper.vm.priceLabel(check.finalAmount))
      wrapper.destroy()
    })

  test('the pay button asks for the server total in every world, discount row or not', () => {
    for (const world of Object.keys(WORLDS)) {
      const wrapper = mountPanel(WORLDS[world])
      expect(wrapper.find('.check-panel__pay-amount').text())
        .toBe(wrapper.vm.priceLabel(WORLDS[world].finalAmount))
      wrapper.destroy()
    }
  })
})

// ---------------------------------------------------------------------------------------------
// The per-line row, mounted as the panel's real child rather than on a hand-built prop — the group
// object it receives is the one `groups` actually produced.
// ---------------------------------------------------------------------------------------------

describe('the grouped row inside the mounted panel', () => {
  test('a stated discount keeps its figure and its sign on the row', () => {
    const wrapper = mountPanel(WORLDS.present)
    const row = wrapper.find('.check-line__discount')

    expect(wrapper.findAllComponents(CheckLine)).toHaveLength(1)
    expect(row.text()).toContain(MINUS_SIGN + 'kr 50,00')
    wrapper.destroy()
  })

  test('a genuinely zero discount leaves the row off', () => {
    const wrapper = mountPanel(WORLDS.zero)
    expect(wrapper.find('.check-line__discount').exists()).toBe(false)
    wrapper.destroy()
  })

  test('an absent member discount gives the row the bare mark, unsigned', () => {
    const wrapper = mountPanel(WORLDS.absent)
    const row = wrapper.find('.check-line__discount')

    expect(row.exists()).toBe(true)
    expect(row.text()).toContain(UNKNOWN_AMOUNT)
    expect(row.text()).not.toContain(MINUS_SIGN)
    // and never the surviving member's share dressed up as the row's discount
    expect(row.text()).not.toContain('kr 30,00')
    wrapper.destroy()
  })

  // One question, one answer. A row reading "Rabatt: —" beside a discount button styled as though
  // nothing were set is two claims about one line.
  test('the discount button and the row agree in all three worlds', () => {
    const expected = { present: true, zero: false, absent: true }
    for (const world of Object.keys(WORLDS)) {
      const wrapper = mountPanel(WORLDS[world])
      expect(wrapper.find('.check-line__disc-btn').classes())
        .toEqual(expected[world]
          ? expect.arrayContaining(['check-line__disc-btn--set'])
          : expect.not.arrayContaining(['check-line__disc-btn--set']))
      expect(wrapper.find('.check-line__discount').exists()).toBe(expected[world])
      wrapper.destroy()
    }
  })
})

// ---------------------------------------------------------------------------------------------
// The money branch downstream of the value this lane changed. `onNegativeSale` turns the visible
// bill rows into a return, and it chose its branch on the same `> 0` — so an unstated discount sent
// it down the path that refunds the LISTED price. The groups fed in are the ones a real mounted
// panel produced, so the two halves are proved composed rather than separately.
// ---------------------------------------------------------------------------------------------

describe('turning a bill with an unstated discount into a return', () => {
  // vue-jest hands back the component options object; a `Vue.extend`ed constructor would put them
  // behind `.options`. Resolve both rather than pin the loader's shape.
  const posMethods = () => (SellScreen.options || SellScreen).methods

  test('the method under test is the one the sell screen actually wires up', () => {
    expect(typeof posMethods().onNegativeSale).toBe('function')
  })

  const prefillFor = (world) => {
    const wrapper = mountPanel(WORLDS[world])
    const groups = wrapper.vm.groups
    const vm = { negativeSalePrefill: null, showNegativeSale: false }
    // The shipped function body, not a copy of it. `onNegativeSale` reads only the groups it is
    // handed and writes only these two fields, so calling it off the component's own options is the
    // whole of it — mounting SellScreen would additionally stand up a POS service, a catalog and
    // eleven child components to reach the same eight lines.
    posMethods().onNegativeSale.call(vm, groups)
    wrapper.destroy()
    return { prefill: vm.negativeSalePrefill, groups }
  }

  test('a stated discount refunds what was charged, not what was listed', () => {
    const { prefill } = prefillFor('present')
    expect(prefill).toHaveLength(1)
    expect(prefill[0].quantity * prefill[0].unitAmount).toBe(WORLDS.present.finalAmount)
  })

  test('an undiscounted bill refunds unit price times quantity', () => {
    const { prefill } = prefillFor('zero')
    expect(prefill[0].quantity).toBe(2)
    expect(prefill[0].unitAmount).toBe(5000)
    expect(prefill[0].quantity * prefill[0].unitAmount).toBe(WORLDS.zero.finalAmount)
  })

  test('an unstated discount refunds the till total and never the listed price', () => {
    const { prefill } = prefillFor('absent')
    const listed = 2 * 5000

    expect(prefill[0].quantity * prefill[0].unitAmount).toBe(WORLDS.absent.finalAmount)
    // The branch this replaces: `null > 0` is false, so the return was built at 100,00 on a bill the
    // till took 50,00 for — the customer is handed back money the shop never received.
    expect(prefill[0].quantity * prefill[0].unitAmount).not.toBe(listed)
    expect(prefill[0].sourceLineIds).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------------------------
// The predicate itself, over the shapes rather than over an argument about them. The table is
// produced by `lanes/L-CHECK-DISCOUNT-SUM-COUPLED/sum-vs-guard-probe.js`.
// ---------------------------------------------------------------------------------------------

describe('isDeductionInPlay against the guard it replaces', () => {
  const SHAPES = [
    ['null', null], ['undefined', undefined], ["''", ''], ["'   '", '   '], ['NaN', NaN],
    ['0', 0], ['-0', -0], ['-1', -1], ['-5000', -5000], ['5000', 5000], ["'50'", '50'],
    ['Infinity', Infinity], ['-Infinity', -Infinity], ["'Infinity'", 'Infinity'],
    ['true', true], ['false', false], ['{}', {}],
    ['{valueOf:()=>5000}', { valueOf: () => 5000 }], ['[]', []]
  ]

  // The change is exactly one column wide. Anything stated keeps the answer it had, which is what
  // stops "distinguish absent from zero" from turning into "put a discount row on every bill".
  test('no amount anybody stated changes answer', () => {
    const moved = SHAPES
      .filter(([, v]) => isAmountStated(v))
      .filter(([, v]) => (v > 0) !== isDeductionInPlay(v))

    expect(moved.map(([name]) => name)).toEqual([])
  })

  // The other half of the same claim: every shape whose answer DID move is one nobody stated. Without
  // this the test above passes on a predicate that changed nothing at all.
  test('every shape whose answer moved is one nobody stated', () => {
    const moved = SHAPES.filter(([, v]) => (v > 0) !== isDeductionInPlay(v))

    expect(moved.length).toBeGreaterThan(0)
    expect(moved.filter(([, v]) => isAmountStated(v))).toEqual([])
  })

  test('a stated deduction is in play', () => {
    expect(isDeductionInPlay(5000)).toBe(true)
    expect(isDeductionInPlay('50')).toBe(true)
  })

  test('a stated zero says there was none', () => {
    expect(isDeductionInPlay(0)).toBe(false)
    expect(isDeductionInPlay(-0)).toBe(false)
  })

  test('a stated negative says there was none either — the row is not the place to argue that', () => {
    expect(isDeductionInPlay(-1)).toBe(false)
    expect(isDeductionInPlay(-5000)).toBe(false)
  })

  test('every amount nobody stated is in play, including the four the old guard let through', () => {
    for (const absent of [null, undefined, '', '   ', NaN, Infinity, -Infinity, 'Infinity', true, false, {}, [], { valueOf: () => 5000 }]) {
      expect(isDeductionInPlay(absent)).toBe(true)
    }
  })
})

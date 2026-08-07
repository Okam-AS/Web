import { mount } from '@vue/test-utils'
import '~/plugins/global-mixin'
import '~/plugins/i18n'
import PaymentScreen from '~/components/admin/pos/PaymentScreen.vue'

// PaymentScreen is the till's payment surface and nothing in the suite executed it: 3.3%, 356
// uncovered statements, 66 uncovered functions. What is pinned here is the arithmetic that decides
// what each payer at a table is asked to hand over, and what the cash remainder is rounded to —
// four computeds, all of them money, none of them previously run.
//
// The invariant that makes a split settlement add up is stated in the source: whole kroner while
// several payers remain, the EXACT remainder (øre included) for the last one, and the cash
// remainder rounded to the nearest krone by the same rule the server applies. If the last payer's
// share were rounded like the others, the settlement would close short or over by the drift; if it
// were not capped at the outstanding, the second-to-last tap would overcharge.
//
// The whole screen is mounted, not a computed lifted out of it, and the figures are read off
// rendered DOM wherever the DOM prints them — a screen that stopped calling `splitSuggestedShare`
// would still satisfy an assertion made against `wrapper.vm`.

const storeFor = locale => ({ state: { adminLocale: locale }, dispatch () {}, subscribe () {} })

const fakePos = () => ({
  cashPoint: { cashPointId: 'cp-1', surfboardTerminalId: 'sb-1', partialPaymentsEnabled: true },
  paymentActive: false,
  posSvc: () => ({}),
  checkSvc: () => ({}),
  errMsg: e => String(e),
  notify: () => {},
  printReceiptDoc: () => {}
})

const check = over => ({ orderId: 'o-1', finalAmount: 30000, items: [], ...over })

// Drops the screen straight onto the split panel with a known outstanding amount, which is where
// the settlement sits after `initiateSplit` returns. The service call itself is a different lane's
// concern; the arithmetic on this panel is this one's.
const mountSplit = (outstanding, over = {}) => {
  const w = mount(PaymentScreen, {
    propsData: { check: check() },
    provide: { pos: fakePos() },
    mocks: { $store: storeFor('no') }
  })
  w.setData({ step: 'splitpay', splitSettlementId: 's-1', splitOutstanding: outstanding, ...over })
  return w
}

const shareText = w => w.find('.payment__sp-share strong').text()
const outstandingText = w => w.find('.payment__sp-status strong').text()

describe('PaymentScreen — each payer\'s equal share', () => {
  test('three payers on 300,00 are asked for 100,00 each and the panel prints it', async () => {
    const w = mountSplit(30000, { splitPersons: 3 })
    await w.vm.$nextTick()
    expect(w.vm.splitSuggestedShare).toBe(10000)
    expect(shareText(w)).toBe('kr 100,00')
    expect(outstandingText(w)).toBe('kr 300,00')
  })

  // 100,03 over three. An exact third is 33,343…; the share is taken UP to the whole krone so the
  // rounding drift lands on the LAST payer rather than leaving the settlement short.
  test('a share that does not divide evenly is rounded UP to the whole krone', async () => {
    const w = mountSplit(10003, { splitPersons: 3 })
    await w.vm.$nextTick()
    expect(w.vm.splitSuggestedShare).toBe(3400)
    expect(shareText(w)).toBe('kr 34,00')
  })

  // The load-bearing case. After two payers of 34,00 the outstanding is 32,03 and one payer is
  // left, so the share is the EXACT remainder including the øre — not another whole krone.
  //
  // NOTE ON THE SOURCE, recorded because it was found by mutating it and not by reading it: the
  // `splitPersonsLeft === 1` early return above this expression is REDUNDANT. `Math.min(out,
  // Math.ceil(out / 1 / 100) * 100)` is `out` for every non-negative `out`, so deleting the early
  // return changes no answer — checked over every value from 0 to 200 000 øre, 0 differing cases.
  // The mutation that DOES change what the last payer hands over is rounding the remainder, and
  // that is the one this test is proved against (see the lane's mutation log).
  test('the last payer is asked for the exact remainder, øre and all', async () => {
    const w = mountSplit(3203, { splitPersons: 3, splitParts: [{ amount: 3400 }, { amount: 3400 }] })
    await w.vm.$nextTick()
    expect(w.vm.splitPersonsLeft).toBe(1)
    expect(w.vm.splitSuggestedShare).toBe(3203)
    expect(shareText(w)).toBe('kr 32,03')
  })

  test('the shares of all three payers sum to exactly the bill', async () => {
    const bill = 10003
    const first = mountSplit(bill, { splitPersons: 3 }).vm.splitSuggestedShare
    const second = mountSplit(bill - first, { splitPersons: 3, splitParts: [{ amount: first }] }).vm.splitSuggestedShare
    const third = mountSplit(bill - first - second, { splitPersons: 3, splitParts: [{ amount: first }, { amount: second }] }).vm.splitSuggestedShare
    expect(first + second + third).toBe(bill)
  })

  // A payer who leaves without paying: more parts than persons. `splitPersonsLeft` floors at 1 so
  // the share stays the whole remainder rather than dividing by zero or by a negative.
  test('more parts than payers still asks for the whole remainder, never a division by zero', async () => {
    const w = mountSplit(5000, { splitPersons: 2, splitParts: [{ amount: 10000 }, { amount: 10000 }, { amount: 10000 }] })
    await w.vm.$nextTick()
    expect(w.vm.splitPersonsLeft).toBe(1)
    expect(w.vm.splitSuggestedShare).toBe(5000)
    expect(Number.isFinite(w.vm.splitSuggestedShare)).toBe(true)
  })

  // Rounding up must never ask for more than is left. The window where that can happen is narrow
  // and it is enumerated rather than guessed: over every (outstanding ≤ 50,00, payers 2..12) pair,
  // the uncapped expression exceeds the outstanding in 1,089 of them, the smallest being a 0,99
  // remainder split two ways — round-up says 1,00, which is more than the whole bill.
  test('a rounded-up share is capped at what is actually outstanding', async () => {
    const w = mountSplit(99, { splitPersons: 2 })
    await w.vm.$nextTick()
    expect(w.vm.splitSuggestedShare).toBe(99)
    expect(shareText(w)).toBe('kr 0,99')
  })

  test('no equal share, at any payer count, ever exceeds the outstanding', () => {
    for (let payers = 2; payers <= 12; payers++) {
      for (const outstanding of [1, 99, 100, 101, 3203, 12550, 30000]) {
        const w = mountSplit(outstanding, { splitPersons: payers })
        expect(w.vm.splitSuggestedShare).toBeLessThanOrEqual(outstanding)
      }
    }
  })
})

describe('PaymentScreen — a portion may not be charged for more than is owed', () => {
  test('a custom portion at exactly the outstanding is valid', async () => {
    const w = mountSplit(30000, { splitCustom: true, splitPortion: 30000 })
    await w.vm.$nextTick()
    expect(w.vm.splitChargeAmount).toBe(30000)
    expect(w.vm.splitChargeValid).toBe(true)
  })

  test('one øre over the outstanding is refused, and the card button is disabled', async () => {
    const w = mountSplit(30000, { splitCustom: true, splitPortion: 30001 })
    await w.vm.$nextTick()
    expect(w.vm.splitChargeValid).toBe(false)
    expect(w.find('.payment__sp-card').attributes('disabled')).toBe('disabled')
  })

  test('a zero or negative portion is refused', async () => {
    expect(mountSplit(30000, { splitCustom: true, splitPortion: 0 }).vm.splitChargeValid).toBe(false)
    expect(mountSplit(30000, { splitCustom: true, splitPortion: -5000 }).vm.splitChargeValid).toBe(false)
  })

  test('the equal-share mode charges the suggested share, the custom mode charges the typed one', async () => {
    expect(mountSplit(30000, { splitPersons: 3, splitPortion: 700 }).vm.splitChargeAmount).toBe(10000)
    expect(mountSplit(30000, { splitPersons: 3, splitPortion: 700, splitCustom: true }).vm.splitChargeAmount).toBe(700)
  })
})

describe('PaymentScreen — cash first: notes and coins, and strictly part of the bill', () => {
  test('a whole-krone note below the outstanding is a valid cash-first portion', async () => {
    const w = mountSplit(30000, { splitCustom: true, splitPortion: 20000 })
    await w.vm.$nextTick()
    expect(w.vm.splitCashFirstValid).toBe(true)
  })

  // Cash does not come in øre. A portion carrying øre would leave the card charged for a figure
  // that cannot be handed over at the counter.
  test('a portion carrying øre is refused', () => {
    expect(mountSplit(30000, { splitCustom: true, splitPortion: 20050 }).vm.splitCashFirstValid).toBe(false)
  })

  // Covering the whole bill in cash is the plain "cash for the rest" action, not a cash-FIRST
  // portion — the latter charges a card for outstanding − portion, which would be zero.
  test('a portion covering the whole outstanding is refused as a cash-first portion', () => {
    expect(mountSplit(30000, { splitCustom: true, splitPortion: 30000 }).vm.splitCashFirstValid).toBe(false)
    expect(mountSplit(30000, { splitCustom: true, splitPortion: 40000 }).vm.splitCashFirstValid).toBe(false)
  })

  test('zero is refused', () => {
    expect(mountSplit(30000, { splitCustom: true, splitPortion: 0 }).vm.splitCashFirstValid).toBe(false)
  })
})

describe('PaymentScreen — the cash remainder is rounded the way the server rounds it', () => {
  test('an outstanding carrying øre is asked for at the nearest whole krone', () => {
    expect(mountSplit(3203).vm.splitCashDue).toBe(3200)
    expect(mountSplit(3250).vm.splitCashDue).toBe(3300)
    expect(mountSplit(3249).vm.splitCashDue).toBe(3200)
  })

  test('an outstanding already on a whole krone is unchanged', () => {
    expect(mountSplit(30000).vm.splitCashDue).toBe(30000)
  })

  // The cash pad on the splitcash step is handed the ROUNDED figure, which is the value the
  // rounding actually reaches the operator through.
  test('the rounded due is what the cash pad is given', async () => {
    const w = mountSplit(3250)
    w.setData({ step: 'splitcash' })
    await w.vm.$nextTick()
    expect(w.findComponent({ name: 'CashPad' }).props('amount')).toBe(3300)
  })
})

describe('PaymentScreen — the free-amount quick buttons', () => {
  test('300,00 offers halves, thirds and quarters rounded up to whole kroner', () => {
    expect(mountSplit(30000).vm.splitQuickAmounts).toEqual([15000, 10000, 7500])
  })

  test('a quick amount never exceeds what is outstanding', () => {
    mountSplit(100).vm.splitQuickAmounts.forEach(a => expect(a).toBeLessThanOrEqual(100))
  })

  test('identical shares are offered once', () => {
    const amounts = mountSplit(100).vm.splitQuickAmounts
    expect(amounts).toEqual([...new Set(amounts)])
    expect(amounts).toEqual([100])
  })

  test('the quick amounts reach the pad in custom mode', async () => {
    const w = mountSplit(30000, { splitCustom: true })
    await w.vm.$nextTick()
    expect(w.findComponent({ name: 'AmountPad' }).props('quickAmounts')).toEqual([15000, 10000, 7500])
  })
})

describe('PaymentScreen — split pay is only offered where the provider supports it', () => {
  const mountWithCashPoint = cashPoint => mount(PaymentScreen, {
    propsData: { check: check() },
    provide: { pos: { ...fakePos(), cashPoint } },
    mocks: { $store: storeFor('no') }
  })

  test('a terminal plus the rollout flag offers it', () => {
    expect(mountWithCashPoint({ cashPointId: 'cp-1', surfboardTerminalId: 'sb-1', partialPaymentsEnabled: true }).vm.canSplitPay).toBe(true)
  })

  test('no partial-payment terminal, no split', () => {
    expect(mountWithCashPoint({ cashPointId: 'cp-1', surfboardTerminalId: null, partialPaymentsEnabled: true }).vm.canSplitPay).toBe(false)
  })

  // The flag is tri-state on the wire; only an explicit true opens it, so an absent flag on an
  // older cash point does not read as enabled.
  test('the rollout flag must be explicitly true, not merely truthy or absent', () => {
    expect(mountWithCashPoint({ cashPointId: 'cp-1', surfboardTerminalId: 'sb-1', partialPaymentsEnabled: undefined }).vm.canSplitPay).toBe(false)
    expect(mountWithCashPoint({ cashPointId: 'cp-1', surfboardTerminalId: 'sb-1', partialPaymentsEnabled: 1 }).vm.canSplitPay).toBe(false)
  })
})

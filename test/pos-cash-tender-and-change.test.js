import { mount } from '@vue/test-utils'
import '~/plugins/global-mixin'
import CashPad from '~/components/admin/pos/CashPad.vue'

// The cash pad is the last thing between a check and the notes in the drawer. Nothing in the suite
// executed a single line of it: before this file `due`, `change`, `presets`, `canConfirm`, the
// `amount` watcher and `confirm` were all at zero hits, and the file read 13.6% (19 uncovered
// statements, 9 uncovered functions). It is the till, and it was untested.
//
// Two of its four computeds decide money a customer physically receives:
//   `due`    — Norwegian øre rounding, `Math.round(amount / 100) * 100`. A split part of 62,50 is
//              tendered as 63,00; the server rounds the same way and REJECTS a tender below its own
//              rounded due, so getting this wrong does not under-charge quietly, it dead-ends the
//              sale at the terminal with "less than the amount due".
//   `change` — what goes back over the counter. `Math.max(0, …)` is what stops an under-tender from
//              rendering as negative change; the button is what stops it being registered.
//
// Every assertion below reads RENDERED DOM, not a computed off the instance, wherever the DOM
// carries the figure — a component that stopped calling `due` in its template would still pass a
// `wrapper.vm.due` assertion, and that is exactly the shape of test this estate has shipped before.
// The instance-level assertions are kept alongside for the values the template does not print.

const posMocks = () => ({
  $i: key => key,
  $store: { dispatch: () => {}, subscribe: () => {} }
})

const mountPad = amount => mount(CashPad, { propsData: { amount }, mocks: posMocks() })

const dueText = w => w.find('.cash-pad__due-amount').text()
const changeText = w => w.find('.cash-pad__change-amount').text()

describe('CashPad — the amount due is rounded to the nearest whole krone before it is asked for', () => {
  // 62,50 is the case the source comment names: an equal split part with øre on it. Round-half-up
  // takes it UP to 63,00, so the operator is asked for more than the raw part, never less.
  test('a half-krone part rounds up, and the rounded figure is what the pad prints', () => {
    const w = mountPad(6250)
    expect(w.vm.due).toBe(6300)
    expect(dueText(w)).toContain('63,00')
    expect(dueText(w)).not.toContain('62,50')
  })

  test('a part below the half rounds down', () => {
    const w = mountPad(6249)
    expect(w.vm.due).toBe(6200)
    expect(dueText(w)).toContain('62,00')
  })

  test('an amount already on a whole krone is left alone', () => {
    const w = mountPad(12000)
    expect(w.vm.due).toBe(12000)
    expect(dueText(w)).toContain('120,00')
  })

  // A 100% discounted check. The source says the sale must stay confirmable; a pad that refused a
  // zero due would dead-end the flow with money already accounted for.
  test('a zero due is confirmable, not a dead end', () => {
    const w = mountPad(0)
    expect(w.vm.due).toBe(0)
    expect(w.vm.canConfirm).toBe(true)
    expect(w.find('.cash-pad__confirm').attributes('disabled')).toBeUndefined()
  })
})

describe('CashPad — the tender defaults to the due and follows it when the due moves', () => {
  test('the pad opens with the ROUNDED due tendered, not the raw amount', () => {
    const w = mountPad(6250)
    expect(w.vm.tendered).toBe(6300)
    expect(w.vm.change).toBe(0)
  })

  // The watcher exists because the same pad instance is reused across split portions. If it did not
  // re-seed, the second portion would open holding the first portion's tender — an over-tender that
  // reads as change owed on money that was never handed over.
  test('changing the amount re-seeds the tender to the new rounded due', async () => {
    const w = mountPad(6250)
    w.setProps({ amount: 20000 })
    await w.vm.$nextTick()
    expect(w.vm.due).toBe(20000)
    expect(w.vm.tendered).toBe(20000)
    expect(changeText(w)).toContain('0,00')
  })
})

describe('CashPad — change is what goes back over the counter', () => {
  test('a 200-krone note against a 63-krone due gives 137,00 back', async () => {
    const w = mountPad(6250)
    w.setData({ tendered: 20000 })
    await w.vm.$nextTick()
    expect(w.vm.change).toBe(13700)
    expect(changeText(w)).toContain('137,00')
    expect(w.find('.cash-pad__change').classes()).toContain('is-active')
  })

  test('an exact tender gives no change and the change panel stays inactive', () => {
    const w = mountPad(12000)
    expect(w.vm.change).toBe(0)
    expect(w.find('.cash-pad__change').classes()).not.toContain('is-active')
  })

  // An under-tender is not negative change. The floor at zero is what keeps the counter from
  // printing a figure the customer would be owed on money they did not hand over.
  test('an under-tender never renders as negative change', () => {
    const w = mountPad(12000)
    w.setData({ tendered: 5000 })
    expect(w.vm.change).toBe(0)
    expect(changeText(w)).not.toContain('-')
    expect(changeText(w)).not.toContain('−')
  })
})

describe('CashPad — an under-tender cannot be registered', () => {
  test('one øre short of the due disables the register button', async () => {
    const w = mountPad(12000)
    w.setData({ tendered: 11999 })
    await w.vm.$nextTick()
    expect(w.vm.canConfirm).toBe(false)
    expect(w.find('.cash-pad__confirm').attributes('disabled')).toBe('disabled')
  })

  test('exactly the due is enough', async () => {
    const w = mountPad(12000)
    w.setData({ tendered: 12000 })
    await w.vm.$nextTick()
    expect(w.vm.canConfirm).toBe(true)
    expect(w.find('.cash-pad__confirm').attributes('disabled')).toBeUndefined()
  })

  // The rounded due, not the raw amount, is the floor. Tendering 62,50 against a 62,50 part is an
  // under-tender here BECAUSE the server rounds to 63,00 and would refuse it.
  test('the floor is the rounded due, so the raw øre amount is short', async () => {
    const w = mountPad(6250)
    w.setData({ tendered: 6250 })
    await w.vm.$nextTick()
    expect(w.vm.canConfirm).toBe(false)
  })

  test('clicking the button while short emits nothing', async () => {
    const w = mountPad(12000)
    w.setData({ tendered: 5000 })
    await w.vm.$nextTick()
    w.vm.confirm()
    expect(w.emitted('confirm')).toBeUndefined()
  })

  test('a sufficient tender emits the tendered amount, not the due', async () => {
    const w = mountPad(6250)
    w.setData({ tendered: 20000 })
    await w.vm.$nextTick()
    w.vm.confirm()
    expect(w.emitted('confirm')).toHaveLength(1)
    expect(w.emitted('confirm')[0][0]).toEqual({ tendered: 20000 })
  })
})

describe('CashPad — the tender presets are notes an operator actually holds', () => {
  // The exact amount first, then the next 50/100/200/500/1000-krone round above it. Four at most.
  test('the first preset is the exact rounded due', () => {
    expect(mountPad(6250).vm.presets[0]).toBe(6300)
  })

  test('every other preset is strictly above the due', () => {
    const presets = mountPad(6250).vm.presets
    presets.slice(1).forEach(p => expect(p).toBeGreaterThan(6300))
  })

  test('a 63-krone due offers 100, 200 and 500 as the notes above it', () => {
    expect(mountPad(6250).vm.presets).toEqual([6300, 10000, 20000, 50000])
  })

  test('a due already on a round note does not repeat it', () => {
    const presets = mountPad(10000).vm.presets
    expect(presets[0]).toBe(10000)
    expect(presets.filter(p => p === 10000)).toHaveLength(1)
  })

  test('never more than four buttons', () => {
    expect(mountPad(1).vm.presets.length).toBeLessThanOrEqual(4)
    expect(mountPad(123456).vm.presets.length).toBeLessThanOrEqual(4)
  })

  test('the presets reach the pad as its quick amounts', () => {
    const w = mountPad(6250)
    expect(w.findComponent({ name: 'AmountPad' }).props('quickAmounts')).toEqual([6300, 10000, 20000, 50000])
  })
})

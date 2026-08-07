import { mount } from '@vue/test-utils'
import '~/plugins/global-mixin'
import '~/plugins/i18n'
import EodWizard from '~/components/admin/pos/EodWizard.vue'

// EodWizard closes the trading day: count the drawer, explain any difference, record the bank
// deposit, and cut the signed Z. It was at 0.0% — 35 uncovered statements, 27 uncovered branches,
// 11 uncovered functions, not one of them ever run.
//
// The rule it carries is a statutory one and the source names it: bokføringsforskriften § 5-3-14
// requires an explanation for a cash difference. Two failure shapes matter and both are money on a
// signed document:
//   an unexplained difference closing the day, and
//   an explanation journalled against a difference that does not exist — a reason the operator
//     picked before recounting, riding along on a zero-difference Z.
// The second is the one the source guards deliberately, and it is the one no test had ever run.

const storeFor = locale => ({ state: { adminLocale: locale }, dispatch () {}, subscribe () {} })

const fakePos = (over = {}) => ({
  cashPoint: { cashPointId: 'cp-1', surfboardTerminalId: 'sb-1' },
  drawerSvc: () => ({ EndDay: async () => ({ zReportId: 'z-1' }) }),
  reportSvc: () => ({ PrintZReport: async () => {} }),
  errMsg: e => String(e),
  notify: () => {},
  ...over
})

const mountEod = (propsData = {}, data = {}, posOver = {}) => {
  const w = mount(EodWizard, {
    propsData: { sessionId: 1, expectedCash: 500000, maxDifference: 5000, ...propsData },
    provide: { pos: fakePos(posOver) },
    mocks: { $store: storeFor('no') }
  })
  if (Object.keys(data).length) { w.setData(data) }
  return w
}

const diffText = w => w.find('.eod__diff strong').text()

describe('EodWizard — the counted difference', () => {
  test('counting exactly what was expected is no difference, and the panel says so', async () => {
    const w = mountEod({}, { counted: 500000 })
    await w.vm.$nextTick()
    expect(w.vm.diff).toBe(0)
    expect(diffText(w)).toBe('kr 0,00')
    expect(w.vm.explanationRequired).toBe(false)
  })

  test('a shortfall is negative and is shown as such', async () => {
    const w = mountEod({}, { counted: 497500 })
    await w.vm.$nextTick()
    expect(w.vm.diff).toBe(-2500)
    expect(diffText(w)).toContain('25,00')
    expect(diffText(w)).toMatch(/[-−]/)
  })

  test('an overage is positive', async () => {
    const w = mountEod({}, { counted: 503000 })
    await w.vm.$nextTick()
    expect(w.vm.diff).toBe(3000)
    expect(diffText(w)).toBe('kr 30,00')
  })

  // The direction matters: counted MINUS expected. Reversing it turns every shortfall into an
  // overage on a signed fiscal document.
  test('the difference is counted minus expected, not the other way round', () => {
    expect(mountEod({ expectedCash: 100000 }, { counted: 90000 }).vm.diff).toBeLessThan(0)
    expect(mountEod({ expectedCash: 100000 }, { counted: 110000 }).vm.diff).toBeGreaterThan(0)
  })
})

describe('EodWizard — a difference must be explained before the day can close', () => {
  // § 5-3-14. ANY non-zero difference needs a reason, however small — the tolerance limit is a
  // separate thing and drives only the warning.
  test('one øre short still needs an explanation', async () => {
    const w = mountEod({}, { counted: 499999 })
    await w.vm.$nextTick()
    expect(w.vm.explanationRequired).toBe(true)
    expect(w.vm.canProceedCount).toBe(false)
    expect(w.find('.eod__primary').attributes('disabled')).toBe('disabled')
  })

  test('an exact count needs no explanation and may proceed', async () => {
    const w = mountEod({}, { counted: 500000 })
    await w.vm.$nextTick()
    expect(w.vm.canProceedCount).toBe(true)
    expect(w.find('.eod__primary').attributes('disabled')).toBeUndefined()
    expect(w.find('.eod__body').findComponent({ name: 'ReasonPicker' }).exists()).toBe(false)
  })

  test('choosing a reason unblocks a difference', async () => {
    const w = mountEod({}, { counted: 499999, reasonSel: { reasonType: 'Tellefeil', reasonText: '' } })
    await w.vm.$nextTick()
    expect(w.vm.canProceedCount).toBe(true)
  })

  test('the free-text reason must actually carry text', () => {
    expect(mountEod({}, { counted: 499999, reasonSel: { reasonType: 'Annet', reasonText: '  ' } }).vm.canProceedCount).toBe(false)
    expect(mountEod({}, { counted: 499999, reasonSel: { reasonType: 'Annet', reasonText: 'Vekslepenger' } }).vm.canProceedCount).toBe(true)
  })
})

describe('EodWizard — the tolerance limit warns, it does not gate', () => {
  test('a difference inside the cash point limit still needs a reason', () => {
    const w = mountEod({ maxDifference: 5000 }, { counted: 502000 })
    expect(w.vm.outOfTolerance).toBe(false)
    expect(w.vm.explanationRequired).toBe(true)
  })

  test('a difference past the limit is flagged, in either direction', async () => {
    const over = mountEod({ maxDifference: 5000 }, { counted: 506000 })
    const under = mountEod({ maxDifference: 5000 }, { counted: 494000 })
    await over.vm.$nextTick()
    expect(over.vm.outOfTolerance).toBe(true)
    expect(under.vm.outOfTolerance).toBe(true)
    expect(over.find('.eod__diff').classes()).toContain('is-off')
  })

  test('exactly at the limit is not past it', () => {
    expect(mountEod({ maxDifference: 5000 }, { counted: 505000 }).vm.outOfTolerance).toBe(false)
    expect(mountEod({ maxDifference: 5000 }, { counted: 505001 }).vm.outOfTolerance).toBe(true)
  })
})

describe('EodWizard — what the close actually sends', () => {
  const captureEndDay = async (data) => {
    const calls = []
    const w = mountEod({}, data, { drawerSvc: () => ({ EndDay: async (sessionId, body) => { calls.push([sessionId, body]); return { zReportId: 'z-1' } } }) })
    await w.vm.submit()
    return { calls, w }
  }

  test('the counted amount and the bank deposit are sent as entered', async () => {
    const { calls } = await captureEndDay({ counted: 497500, bankDeposit: 400000, reasonSel: { reasonType: 'Tellefeil', reasonText: 'Manglet 25' } })
    expect(calls).toHaveLength(1)
    expect(calls[0][0]).toBe(1)
    expect(calls[0][1]).toMatchObject({ endCountedAmount: 497500, bankDepositAmount: 400000 })
  })

  test('a real difference sends the reason the operator chose', async () => {
    const { calls } = await captureEndDay({ counted: 497500, reasonSel: { reasonType: 'Tellefeil', reasonText: '  Manglet 25  ' } })
    expect(calls[0][1].differenceReasonType).toBe('Tellefeil')
    expect(calls[0][1].differenceText).toBe('Manglet 25')
  })

  // THE ONE THE SOURCE GUARDS. A reason chosen before the operator recounted is still sitting in
  // `reasonSel` once the count comes back to exact. Sending it would journal an explanation for a
  // difference that never happened, on a signed fiscal document.
  test('a zero difference sends NO reason, even when one is still selected', async () => {
    const { calls } = await captureEndDay({ counted: 500000, reasonSel: { reasonType: 'Tellefeil', reasonText: 'Manglet 25' } })
    expect(calls[0][1].differenceReasonType).toBe('None')
    expect(calls[0][1].differenceText).toBeNull()
  })

  test('a reason type with an empty text sends null rather than an empty string', async () => {
    const { calls } = await captureEndDay({ counted: 497500, reasonSel: { reasonType: 'Tellefeil', reasonText: '   ' } })
    expect(calls[0][1].differenceReasonType).toBe('Tellefeil')
    expect(calls[0][1].differenceText).toBeNull()
  })

  test('an absent email is sent as null, not as an empty string', async () => {
    const { calls } = await captureEndDay({ counted: 500000, email: '' })
    expect(calls[0][1].email).toBeNull()
  })

  test('a failing close leaves the wizard on the deposit step with the error shown', async () => {
    const w = mountEod({}, { step: 'deposit', counted: 500000 }, { drawerSvc: () => ({ EndDay: async () => { throw new Error('kassen er allerede lukket') } }) })
    await w.vm.submit()
    await w.vm.$nextTick()
    expect(w.vm.step).toBe('deposit')
    expect(w.vm.busy).toBe(false)
    expect(w.find('.eod__error').text()).toContain('allerede lukket')
  })

  test('a successful close moves to the result and stops working', async () => {
    const w = mountEod({}, { step: 'deposit', counted: 500000 })
    await w.vm.submit()
    expect(w.vm.step).toBe('result')
    expect(w.vm.busy).toBe(false)
  })
})

describe('EodWizard — reprinting the Z', () => {
  const resultData = over => ({ step: 'result', result: { zReportId: 'z-1', expectedCashAmount: 500000, countedAmount: 500000, difference: 0, bankDepositAmount: 400000 }, ...over })

  test('the Z prints on the cash point terminal', async () => {
    const printed = []
    const w = mountEod({}, resultData(), { reportSvc: () => ({ PrintZReport: async id => { printed.push(id) } }) })
    await w.vm.printZ()
    expect(printed).toEqual(['z-1'])
  })

  // A Z has no browser fallback the way a receipt does, so a register with no terminal gets a
  // disabled button rather than an error after the fact.
  test('a cash point with no terminal cannot print, and the button says so', async () => {
    const w = mountEod({}, resultData(), { cashPoint: { cashPointId: 'cp-1', surfboardTerminalId: null } })
    await w.vm.$nextTick()
    expect(w.vm.canPrintReport).toBe(false)
    expect(w.find('.eod__ghost').attributes('disabled')).toBe('disabled')
  })

  // Cutting a second Z is a second fiscal document. A double tap while the first print is in
  // flight must not produce one.
  test('a print already in flight does not fire a second one', async () => {
    const printed = []
    const w = mountEod({}, resultData({ printing: true }), { reportSvc: () => ({ PrintZReport: async id => { printed.push(id) } }) })
    await w.vm.printZ()
    expect(printed).toEqual([])
  })

  test('no Z id, no print', async () => {
    const printed = []
    const w = mountEod({}, { step: 'result', result: { zReportId: null } }, { reportSvc: () => ({ PrintZReport: async id => { printed.push(id) } }) })
    await w.vm.printZ()
    expect(printed).toEqual([])
  })

  test('the result rows print the day\'s figures', async () => {
    const w = mountEod({}, resultData({ result: { zReportId: 'z-1', expectedCashAmount: 500000, countedAmount: 497500, difference: -2500, bankDepositAmount: 400000 } }))
    await w.vm.$nextTick()
    const rows = w.findAll('.eod__row').wrappers.map(r => r.text())
    expect(rows.some(t => t.includes('kr 5 000,00'))).toBe(true)
    expect(rows.some(t => t.includes('kr 4 975,00'))).toBe(true)
    expect(rows.some(t => t.includes('kr 4 000,00'))).toBe(true)
  })
})

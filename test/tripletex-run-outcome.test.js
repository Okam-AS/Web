import { shallowMount } from '@vue/test-utils'
import TripletexPage from '~/pages/admin/tripletex.vue'

// The four shapes `AccountingExportResult` can come back as from the Tripletex export endpoints.
// They are a 2x2 over (success, skipped), and the whole point of this file is that the four are
// NOT two: `success:false` is two different worlds and only one of them is a failure.
//
// The messages are the backend's own, copied verbatim from `TripletexVoucherPoster.PostAsync`, so a
// reader can see which branch of the poster produces each row.
const POSTED = {
  target: 'Tripletex',
  success: true,
  skipped: false,
  voucherId: 4711,
  message: 'Bilag bokført i Tripletex (id 4711).'
}

// The genuinely idempotent skip: the key is already Posted, nothing to do, and nothing is wrong.
const ALREADY_POSTED = {
  target: 'Tripletex',
  success: true,
  skipped: true,
  voucherId: 4711,
  message: 'Bilag allerede bokført (id 4711).'
}

// The contended claim: another run holds this external key right now. The unique index refused the
// second claim, which is the idempotence guarantee doing exactly its job — no voucher was posted by
// THIS run and none was lost. `Success` is false only because this call did not post.
const CONTENDED = {
  target: 'Tripletex',
  success: false,
  skipped: true,
  voucherId: null,
  message: 'Bilaget eksporteres allerede av en annen kjøring.'
}

// The real failure: Tripletex rejected the voucher. The log row is Failed, nothing is booked, and an
// operator has to do something about it.
const FAILED = {
  target: 'Tripletex',
  success: false,
  skipped: false,
  voucherId: null,
  message: 'Tripletex request failed.'
}

function mountPage (results) {
  return shallowMount(TripletexPage, {
    mocks: {
      // Not logged in, so `mounted()` returns before `init()` and the page never reaches the store
      // or the Tripletex service. This file is about how a result RENDERS, not how it is fetched.
      $store: { getters: { userIsLoggedIn: false }, state: { currentUser: null } },
      $router: { push () {} }
    },
    // Seeded through the mount option rather than `setData` so the first render already has the
    // results — `setData` only lands on the next tick, and a wrapper read before it renders nothing
    // at all, which reds every assertion in this file for a reason that has nothing to do with the
    // page.
    data () {
      return { activeTab: 'vouchers', selectedStoreId: 1, results }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' }, Loading: true }
  })
}

// The status cell of the run-results table, as the operator sees it: the badge's text and the
// modifier class that colours it.
function statusCell (wrapper) {
  const badge = wrapper.find('.sb-table tbody tr td:nth-child(2) .sb-badge')
  return {
    text: badge.text(),
    classes: badge.classes(),
    isRed: badge.classes().includes('sb-badge--bad'),
    isGreen: badge.classes().includes('sb-badge--ok')
  }
}

describe('the manual voucher run reports what actually happened', () => {
  it('paints a booked voucher as a success', () => {
    const cell = statusCell(mountPage([POSTED]))
    expect(cell.text).toBe('OK')
    expect(cell.isGreen).toBe(true)
    expect(cell.isRed).toBe(false)
  })

  it('paints an already-booked voucher as a neutral skip, not as a second success', () => {
    const cell = statusCell(mountPage([ALREADY_POSTED]))
    expect(cell.text).toBe('Hoppet over')
    expect(cell.isGreen).toBe(false)
    expect(cell.isRed).toBe(false)
  })

  // The lane. A refusal caused by another run holding the claim is the guarantee working, and a red
  // row is an instruction to press the button again — which is the one operator action that can put
  // a second voucher into Tripletex under one external number. It must not read as a failure.
  it('does not paint a contended claim as a failure', () => {
    const cell = statusCell(mountPage([CONTENDED]))
    expect(cell.isRed).toBe(false)
    expect(cell.text).not.toBe('Feil')
  })

  // ...and it must not read as "done" either. A run that posted nothing because somebody else is
  // still posting is a third state, distinct from both the failure and the completed skip.
  it('does not paint a contended claim as a completed skip', () => {
    const cell = statusCell(mountPage([CONTENDED]))
    expect(cell.isGreen).toBe(false)
    expect(cell.text).not.toBe(statusCell(mountPage([ALREADY_POSTED])).text)
  })

  it('still tells the operator who holds the voucher', () => {
    const wrapper = mountPage([CONTENDED])
    expect(wrapper.find('.sb-table tbody tr').text()).toContain('Bilaget eksporteres allerede av en annen kjøring.')
  })

  // The other direction, so "never paint anything red" cannot satisfy this file: a voucher Tripletex
  // rejected is still a failure and still red.
  it('still paints a rejected voucher as a failure', () => {
    const cell = statusCell(mountPage([FAILED]))
    expect(cell.text).toBe('Feil')
    expect(cell.isRed).toBe(true)
    expect(cell.isGreen).toBe(false)
  })

  it('gives the four outcomes four distinct readings', () => {
    const readings = [POSTED, ALREADY_POSTED, CONTENDED, FAILED]
      .map(r => statusCell(mountPage([r])).text)
    expect(new Set(readings).size).toBe(4)
  })
})

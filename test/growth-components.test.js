import { mount } from '@vue/test-utils'
import GrowthConsentStanding from '~/components/admin/growth/GrowthConsentStanding.vue'
import GrowthAudiencePanel from '~/components/admin/growth/GrowthAudiencePanel.vue'
import GrowthSendGate from '~/components/admin/growth/GrowthSendGate.vue'
import GrowthRunOutcome from '~/components/admin/growth/GrowthRunOutcome.vue'
import translations from '~/translations'
import {
  readConsentStanding, readAudience, readRun, resolveSendGate,
  UNKNOWN, APPROVAL_LIVE,
  UNSUBSCRIBE_PRESENT, UNSUBSCRIBE_ABSENT,
  GATE_READY, GATE_BLOCKED
} from '~/utils/growth/send-gate'

// i18n resolved the way plugins/i18n.js resolves it, against the REAL dictionary — so a key these
// components render but nobody translated fails here rather than shipping as a raw key on screen.
const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}

const CONSENT_SUMMARY = {
  storeId: 90100,
  consentedContacts: 120,
  withdrawnContacts: 9,
  suppressedContacts: 14,
  pendingInvites: 3,
  suppressionsByReason: { Unsubscribe: 8, HardBounce: 4, Complaint: 2 }
}

const SNAPSHOT = {
  snapshotId: 3002,
  segmentKey: 'newsletter-subscribers',
  definitionVersion: 1,
  watermarkHash: 'sha256:aabbccdd',
  computedAt: '2026-07-20T09:30:00+00:00',
  includedCount: 42,
  excludedCount: 6,
  exclusionReasonBreakdown: { Suppressed: 3, Unverified: 2, FrequencyCapped: 1 }
}

// Copied from the backend's committed golden `docs/api/fixtures/growth/newsletter-detail.json`.
const RUN = {
  dispatchRunId: 9002,
  state: 'Completed',
  finalEligibleCount: 40,
  suppressedAtDispatchCount: 2,
  providerAcceptedCount: 40,
  deliveredCount: 38,
  failedCount: 0,
  ambiguousCount: 0,
  openedCount: 19,
  openRate: 0.5,
  openRateLabel: 'event-deduped (OpenedCount / DeliveredCount), not unique-recipient',
  startedAt: '2026-07-20T11:00:00+00:00',
  completedAt: '2026-07-20T11:02:00+00:00'
}

// Every input satisfied. Each gate test flips exactly one, so the untouched baseline is the positive
// control proving the component can reach an enabled button at all.
function gateFor (overrides) {
  return resolveSendGate(Object.assign({
    standing: readConsentStanding(CONSENT_SUMMARY),
    audience: readAudience(SNAPSHOT),
    approval: { state: APPROVAL_LIVE, approvalId: 7002, approvedAt: null, invalidatedAt: null },
    run: { state: UNKNOWN },
    unsubscribeMechanism: UNSUBSCRIBE_PRESENT,
    hasContent: true
  }, overrides || {}))
}

describe('GrowthConsentStanding — a read failure never looks like an empty store', () => {
  const render = standing => mount(GrowthConsentStanding, { propsData: { standing }, mocks: { $i } })

  test('an unreadable consent record shows dashes and says so — no zeros anywhere', () => {
    const wrapper = render(readConsentStanding(null))
    expect(wrapper.text()).toContain(translations.no.growth_standing_unknown)
    const figures = wrapper.findAll('.growth-standing__figure dd')
    expect(figures.length).toBe(4)
    for (let i = 0; i < figures.length; i++) {
      expect(figures.at(i).text()).toBe('—')
    }
    // The word "0" must not appear as a figure at all — that is the whole point.
    expect(figures.wrappers.map(w => w.text())).not.toContain('0')
  })

  test('POSITIVE CONTROL: a real read prints the real numbers through the same component', () => {
    const wrapper = render(readConsentStanding(CONSENT_SUMMARY))
    const figures = wrapper.findAll('.growth-standing__figure dd').wrappers.map(w => w.text())
    expect(figures).toEqual(['120', '9', '14', '3'])
    // And the failure notice is absent, so its presence above was meaningful.
    expect(wrapper.text()).not.toContain(translations.no.growth_standing_unknown)
  })

  test('a genuinely empty store prints real zeros, distinct from the unknown dashes', () => {
    const wrapper = render(readConsentStanding({
      storeId: 1,
      consentedContacts: 0,
      withdrawnContacts: 0,
      suppressedContacts: 0,
      pendingInvites: 0,
      suppressionsByReason: {}
    }))
    const figures = wrapper.findAll('.growth-standing__figure dd').wrappers.map(w => w.text())
    expect(figures).toEqual(['0', '0', '0', '0'])
    expect(wrapper.text()).not.toContain(translations.no.growth_standing_unknown)
    expect(wrapper.text()).toContain(translations.no.growth_standing_no_suppressions)
  })

  test('there is no control that could grant consent on a guest behalf', () => {
    // Backend invariant 10: store admins cannot grant consent for a guest, and there is no "add
    // subscriber" path. A panel that offered one — even a disabled one — would misrepresent that.
    const wrapper = render(readConsentStanding(CONSENT_SUMMARY))
    expect(wrapper.findAll('input').length).toBe(0)
    expect(wrapper.findAll('button').length).toBe(0)
    expect(wrapper.text()).toContain(translations.no.growth_standing_no_grant_note)
  })
})

describe('GrowthAudiencePanel — no count is better than a wrong one', () => {
  const render = (audience, busy) => mount(GrowthAudiencePanel, {
    propsData: { audience, busy: busy === true, locale: 'nb-NO' }, mocks: { $i }
  })

  test('with no snapshot the panel shows NO figure at all, not a zero', () => {
    const wrapper = render(readAudience(null))
    expect(wrapper.text()).toContain(translations.no.growth_audience_none)
    expect(wrapper.findAll('.growth-audience__figure').length).toBe(0)
    // POSITIVE CONTROL: the same component does render figures when there is a snapshot, so the
    // absence above is the unknown state rather than a template that never draws them.
    expect(render(readAudience(SNAPSHOT)).findAll('.growth-audience__figure').length).toBe(2)
  })

  test('a computed snapshot shows included, excluded and every exclusion reason', () => {
    const wrapper = render(readAudience(SNAPSHOT))
    const figures = wrapper.findAll('.growth-audience__figure dd').wrappers.map(w => w.text())
    expect(figures).toEqual(['42', '6'])
    const reasons = wrapper.findAll('.growth-audience__reason').wrappers.map(w => w.text())
    expect(reasons).toEqual(['Suppressed', 'Unverified', 'FrequencyCapped'])
  })

  test('the compute button emits, and is held while a compute is in flight', () => {
    const idle = render(readAudience(null))
    idle.find('.growth-audience__btn').trigger('click')
    expect(idle.emitted().compute).toHaveLength(1)

    const busy = render(readAudience(null), true)
    expect(busy.find('.growth-audience__btn').attributes('disabled')).toBe('disabled')
  })
})

describe('GrowthSendGate — the button cannot be walked around', () => {
  const render = (gate, busy) => mount(GrowthSendGate, {
    propsData: { gate, busy: busy === true }, mocks: { $i }
  })

  test('POSITIVE CONTROL: with everything satisfied the send button is enabled and emits', () => {
    const wrapper = render(gateFor())
    expect(wrapper.props('gate').state).toBe(GATE_READY)
    const button = wrapper.find('.growth-gate__send')
    expect(button.attributes('disabled')).toBeUndefined()
    button.trigger('click')
    expect(wrapper.emitted().send).toHaveLength(1)
  })

  test('an absent unsubscribe mechanism disables the button and names the reason', () => {
    const wrapper = render(gateFor({ unsubscribeMechanism: UNSUBSCRIBE_ABSENT }))
    expect(wrapper.props('gate').state).toBe(GATE_BLOCKED)
    expect(wrapper.find('.growth-gate__send').attributes('disabled')).toBe('disabled')
    expect(wrapper.text()).toContain(translations.no.growth_block_no_unsubscribe)
    // The button is not merely styled as disabled — clicking it emits nothing.
    wrapper.find('.growth-gate__send').trigger('click')
    expect(wrapper.emitted().send).toBeUndefined()
  })

  test('an unreadable consent record disables the button and is marked unresolved, not blocked', () => {
    const wrapper = render(gateFor({ standing: readConsentStanding(null) }))
    expect(wrapper.find('.growth-gate__send').attributes('disabled')).toBe('disabled')
    expect(wrapper.text()).toContain(translations.no.growth_block_consent_unreadable)
    // The two refusal kinds are drawn apart, because they ask for different next steps.
    expect(wrapper.findAll('.growth-gate__reason--unknown').length).toBeGreaterThan(0)
  })

  test('the recipient figure is a dash when no audience was computed, never a zero', () => {
    const wrapper = render(gateFor({ audience: readAudience(null) }))
    expect(wrapper.find('.growth-gate__recipients strong').text()).toBe('—')
    // POSITIVE CONTROL: with the snapshot it prints the snapshot's 42 — and 42 is the snapshot's
    // number, not the consent standing's 120.
    expect(render(gateFor()).find('.growth-gate__recipients strong').text()).toBe('42')
  })

  test('every refusal is listed at once, not one at a time', () => {
    const wrapper = render(gateFor({
      unsubscribeMechanism: UNSUBSCRIBE_ABSENT,
      hasContent: false,
      standing: readConsentStanding(null)
    }))
    const text = wrapper.text()
    expect(text).toContain(translations.no.growth_block_no_unsubscribe)
    expect(text).toContain(translations.no.growth_block_no_content)
    expect(text).toContain(translations.no.growth_block_consent_unreadable)
  })

  test('a dispatch in flight holds the button even when the gate is ready', () => {
    const wrapper = render(gateFor(), true)
    expect(wrapper.find('.growth-gate__send').attributes('disabled')).toBe('disabled')
    wrapper.find('.growth-gate__send').trigger('click')
    expect(wrapper.emitted().send).toBeUndefined()
  })

  test('an already-dispatched version cannot be sent again from here', () => {
    const wrapper = render(gateFor({ run: readRun(RUN) }))
    expect(wrapper.find('.growth-gate__send').attributes('disabled')).toBe('disabled')
    expect(wrapper.text()).toContain(translations.no.growth_gate_dispatched_note)
  })
})

describe('GrowthRunOutcome — accepted is not delivered', () => {
  const render = run => mount(GrowthRunOutcome, { propsData: { run, locale: 'nb-NO' }, mocks: { $i } })

  test('accepted and delivered are two separate figures on screen', () => {
    const wrapper = render(readRun(RUN))
    const figures = wrapper.findAll('.growth-run__figures .growth-run__figure dd').wrappers.map(w => w.text())
    // eligible, suppressed, accepted, delivered, failed, ambiguous — in the template's order.
    expect(figures).toEqual(['40', '2', '40', '38', '0', '0'])
    expect(wrapper.text()).toContain(translations.no.growth_run_truth_note)
  })

  test('a null open rate is a dash, never 0 %', () => {
    const wrapper = render(readRun(Object.assign({}, RUN, { deliveredCount: 0, openedCount: 0, openRate: null })))
    const opens = wrapper.findAll('.growth-run__opens .growth-run__figure dd').wrappers.map(w => w.text())
    expect(opens[0]).toBe('0') // opens genuinely counted zero
    expect(opens[1]).toBe('—') // the rate is unknown, not zero
    // POSITIVE CONTROL: a run that delivered prints a real rate through the same component.
    const delivered = render(readRun(RUN))
    expect(delivered.findAll('.growth-run__opens .growth-run__figure dd').at(1).text()).toBe('50.0 %')
  })

  test('the open-rate caveat travels with the figure', () => {
    // The server sends the label because the figure is event-deduped rather than per-recipient.
    // Dropping it would let a venue read a 50 % as "half of recipients opened it".
    expect(render(readRun(RUN)).text()).toContain('event-deduped')
  })
})

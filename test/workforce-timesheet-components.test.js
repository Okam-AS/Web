import { shallowMount } from '@vue/test-utils'
import translations from '~/translations'
import WorkforceTimesheetPanel from '~/components/admin/workforce/WorkforceTimesheetPanel.vue'
import WorkforceTimesheetBatchList from '~/components/admin/workforce/WorkforceTimesheetBatchList.vue'

// `$i` runs against the REAL Norwegian dictionary rather than an identity stub, so a key these
// components name but nobody translated fails here instead of shipping as a raw `wft_…` on screen.
function $i (key, params) {
  const text = translations.no[key]
  if (!text) { throw new Error('missing translation key: ' + key) }
  return params ? text.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : text
}

const mocks = { $i }

const period = over => Object.assign({
  timesheetPeriodId: 'p-1',
  fromBusinessDate: '2026-07-21',
  toBusinessDate: '2026-08-03',
  status: 'Open',
  lineCount: 8,
  complete: false,
  incompleteRowCount: 1,
  paidMinutes: 2445,
  unpaidBreakMinutes: 30,
  approvedByActorReference: null,
  approvedAtUtc: null,
  snapshotSha256: null,
  succeededExportCount: 0,
  failedExportCount: 0,
  adjustmentBatchCount: 0
}, over || {})

const open = props => shallowMount(WorkforceTimesheetPanel, {
  mocks,
  propsData: Object.assign({
    period: period(),
    exportEnabled: true,
    hasPayrollCapability: true,
    loading: false,
    busy: ''
  }, props || {})
})

describe('WorkforceTimesheetPanel', () => {
  // ---- THE REGRESSION THIS FILE EXISTS FOR ------------------------------------------------------
  //
  // `busy` is a STRING ('' | 'approve' | 'export'). Vue 2 drops a boolean attribute only for `null`,
  // `undefined` or `false` — an empty string is NOT falsy by that rule — so a binding written
  // `:disabled="!enabled || busy"` renders `disabled=""` in the one state where the button must
  // work: gate open, nothing in flight. It shipped exactly that way and cost the surface its Approve
  // button; the gate functions were correct and every unit test passed, because the fault was in the
  // BINDING and only visible on the rendered page.
  //
  // Asserted on the DOM attribute rather than on a computed, because the computed was never the
  // thing that was wrong.
  it('renders Approve genuinely enabled when the gate is open and nothing is in flight', () => {
    const button = open().find('[data-testid="wft-approve"]')
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('renders Export genuinely enabled on an approved period', () => {
    const button = open({ period: period({ status: 'Approved' }) })
      .find('[data-testid="wft-export"]')
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('disables both controls while a write is in flight', () => {
    const panel = open({ busy: 'approve' })
    expect(panel.find('[data-testid="wft-approve"]').attributes('disabled')).toBeDefined()
    expect(panel.find('[data-testid="wft-export"]').attributes('disabled')).toBeDefined()
  })

  // ---- withheld WITH a reason -------------------------------------------------------------------

  it('withholds Approve with a named reason when the stage flag is off', () => {
    const panel = open({ exportEnabled: false })
    expect(panel.find('[data-testid="wft-approve"]').attributes('disabled')).toBeDefined()
    expect(panel.find('[data-testid="wft-approve-why"]').text())
      .toBe(translations.no.wft_gate_flag_off)
  })

  // A panel nobody has told about the store's export switch has NOT been told it is off. The prop
  // defaulted to `false`, which is how this surface came to print "Eksport er slått av for denne
  // butikken." over a read that never answered.
  it('says the switch is unread, not off, when it was never told about the switch', () => {
    const panel = shallowMount(WorkforceTimesheetPanel, {
      mocks,
      propsData: { period: period(), hasPayrollCapability: true, loading: false, busy: '' }
    })
    expect(panel.find('[data-testid="wft-approve-why"]').text())
      .toBe(translations.no.wft_gate_flag_unread)
  })

  it('withholds Approve with a named reason without the payroll grant', () => {
    const panel = open({ hasPayrollCapability: false })
    expect(panel.find('[data-testid="wft-approve-why"]').text())
      .toBe(translations.no.wft_gate_no_payroll_capability)
  })

  // A disabled control with NOTHING beside it is the shape the defect above produced, and it teaches
  // a manager nothing. Whenever the button is withheld, a reason must be on screen.
  it('never withholds a control silently', () => {
    for (const props of [{ exportEnabled: false }, { hasPayrollCapability: false },
      { period: period({ lineCount: 0 }) }, { period: period({ status: 'Approved' }) }]) {
      const panel = open(props)
      expect(panel.find('[data-testid="wft-approve"]').attributes('disabled')).toBeDefined()
      expect(panel.find('[data-testid="wft-approve-why"]').exists()).toBe(true)
      expect(panel.find('[data-testid="wft-approve-why"]').text().length).toBeGreaterThan(0)
    }
  })

  // ---- UNKNOWN is not emptiness ------------------------------------------------------------------

  it('says the period is unread rather than rendering it as empty', () => {
    const panel = open({ period: null })
    expect(panel.find('[data-testid="wft-unknown"]').text())
      .toBe(translations.no.wft_period_unknown)
    expect(panel.find('[data-testid="wft-paid-hours"]').exists()).toBe(false)
  })

  // ---- the freeze ---------------------------------------------------------------------------------

  it('prints who froze the period and the digest of what was frozen', () => {
    const panel = open({
      period: period({
        status: 'Approved',
        approvedByActorReference: '8a2f6b10-4c7d-4e93-b5a1-0d3e8f7c2b46',
        approvedAtUtc: '2026-08-04T20:40:06Z',
        snapshotSha256: 'a'.repeat(64)
      })
    })
    expect(panel.find('[data-testid="wft-approved-by"]').text())
      .toBe('8a2f6b10-4c7d-4e93-b5a1-0d3e8f7c2b46')
    expect(panel.find('[data-testid="wft-snapshot-sha"]').text()).toBe('a'.repeat(64))
  })

  it('offers the unknown-hours decision only while there is one to make', () => {
    expect(open().find('[data-testid="wft-allow-incomplete"]').exists()).toBe(true)
    // Nothing unknown — nothing to decide.
    expect(open({ period: period({ incompleteRowCount: 0 }) })
      .find('[data-testid="wft-allow-incomplete"]').exists()).toBe(false)
    // Already frozen — the decision is spent.
    expect(open({ period: period({ status: 'Approved' }) })
      .find('[data-testid="wft-allow-incomplete"]').exists()).toBe(false)
  })

  it('emits the manager\'s unknown-hours decision rather than deciding for them', async () => {
    const panel = open()
    await panel.find('[data-testid="wft-allow-incomplete"]').setChecked(true)
    await panel.find('[data-testid="wft-approve"]').trigger('click')
    expect(panel.emitted().approve[0][0]).toEqual({ allowIncomplete: true })
  })

  it('defaults the unknown-hours decision to false, never to permission', async () => {
    const panel = open()
    await panel.find('[data-testid="wft-approve"]').trigger('click')
    expect(panel.emitted().approve[0][0]).toEqual({ allowIncomplete: false })
  })

  // A decision belongs to the period it was made about. Carrying it to the next one would freeze
  // unknown hours nobody agreed to freeze.
  it('clears the unknown-hours decision when the period changes', async () => {
    const panel = open()
    await panel.find('[data-testid="wft-allow-incomplete"]').setChecked(true)
    await panel.setProps({ period: period({ timesheetPeriodId: 'p-2' }) })
    await panel.find('[data-testid="wft-approve"]').trigger('click')
    expect(panel.emitted().approve[0][0]).toEqual({ allowIncomplete: false })
  })

  it('renders unknown hours as the marker and never as zero', () => {
    // `paidMinutes` is a real total; the UNKNOWN marker belongs to a null, which the panel's own
    // formatter owns. Asserted here so a template that swapped in `|| 0` is caught.
    const panel = open({ period: period({ paidMinutes: null }) })
    expect(panel.find('[data-testid="wft-paid-hours"]').text()).toBe('—')
  })
})

describe('WorkforceTimesheetBatchList', () => {
  const batch = over => Object.assign({
    batchId: 'b-1',
    providerKey: 'okam-csv',
    outcome: 'Succeeded',
    failureReason: null,
    payloadSha256: 'b'.repeat(64),
    contentType: 'text/csv; charset=utf-8',
    fileName: 'okam-timesheet-42-2026-07-21-2026-08-03.csv',
    lineCount: 8,
    requestedByActorReference: '8a2f6b10-4c7d-4e93-b5a1-0d3e8f7c2b46',
    createdAtUtc: '2026-08-04T20:40:17Z',
    isAdjustment: false
  }, over || {})

  const list = props => shallowMount(WorkforceTimesheetBatchList, {
    mocks,
    propsData: Object.assign({ batches: [batch()], downloading: '' }, props || {})
  })

  it('offers the bytes of a sent batch and names who sent it', () => {
    const panel = list()
    expect(panel.find('[data-testid="wft-download"]').attributes('disabled')).toBeUndefined()
    expect(panel.find('[data-testid="wft-batch-actor"]').text())
      .toBe('8a2f6b10-4c7d-4e93-b5a1-0d3e8f7c2b46')
  })

  it('withholds a download from a failed batch, which has no file', () => {
    const panel = list({ batches: [batch({ outcome: 'Failed', failureReason: 'provider refused' })] })
    expect(panel.find('[data-testid="wft-download"]').exists()).toBe(false)
    expect(panel.find('[data-testid="wft-no-download"]').exists()).toBe(true)
    // The failure itself stays on screen: a spent key with no file is the thing somebody has to
    // explain later, and a list that showed only successes would hide it.
    expect(panel.find('[data-testid="wft-batch-failure"]').text()).toBe('provider refused')
  })

  it('separates "nothing sent" from "we do not know what was sent"', () => {
    expect(list({ batches: null }).find('[data-testid="wft-batches-unknown"]').exists()).toBe(true)
    expect(list({ batches: [] }).find('[data-testid="wft-batches-empty"]').exists()).toBe(true)
    // …and they must not read the same, or the distinction is decorative.
    expect(translations.no.wft_batches_unknown).not.toBe(translations.no.wft_batches_empty)
  })

  it('shows the digest the server recorded for the bytes it sent', () => {
    expect(list().find('[data-testid="wft-batch-sha"]').text()).toBe('b'.repeat(64))
  })
})

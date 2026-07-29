import { shallowMount } from '@vue/test-utils'
import translations from '~/translations'
import WorkforceAttendanceTable from '~/components/admin/workforce-rates/WorkforceAttendanceTable.vue'
import WorkforceHoursExportPanel from '~/components/admin/workforce-rates/WorkforceHoursExportPanel.vue'
import WorkforceRateTimeline from '~/components/admin/workforce-rates/WorkforceRateTimeline.vue'
import { buildAttendance } from '~/utils/workforce-rates/attendance-view'
import { buildTimeline } from '~/utils/workforce-rates/rate-timeline'
import { parseHoursExportMeta } from '~/utils/workforce-rates/hours-export'

// `$i` runs against the REAL Norwegian dictionary rather than an identity stub, so a key these
// components name but nobody translated fails here instead of shipping as a raw `wfrt_…` on screen.
// It also means the assertions below are about what a manager actually reads.
function $i (key, params) {
  const text = translations.no[key]
  if (!text) { throw new Error('missing translation key: ' + key) }
  return params ? text.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : text
}

// `priceLabel` and friends come from the global mixin, which resolves them out of `~/core` — a git
// submodule this repo carries no checkout of. They are stubbed with the same shape core produces so
// the assertions can be about WHICH integer is formatted, not about the formatting.
const wholeAmount = minor => String(Math.trunc(Math.abs(minor) / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const fractionAmount = minor => String(Math.abs(minor) % 100).padStart(2, '0')
const priceLabel = minor => 'kr ' + wholeAmount(minor) + ',' + fractionAmount(minor)

const mocks = { $i, priceLabel, wholeAmount, fractionAmount }

const version = over => Object.assign({
  rateVersionId: 'rv-sep',
  source: 'EngagementOverride',
  effectiveFromLocalDate: '2026-09-01',
  effectiveFromUtc: '2026-08-31T22:00:00',
  effectiveToUtc: null,
  timeZoneId: 'Europe/Oslo',
  hourlyRateMinor: 23550,
  currency: 'NOK',
  createdAtUtc: '2026-08-20T09:12:33'
}, over)

const timelineOf = (versions, over) => buildTimeline(Object.assign({
  storeId: 42,
  source: 'EngagementOverride',
  timeZoneId: 'Europe/Oslo',
  versions
}, over))

function mountTimeline (props) {
  return shallowMount(WorkforceRateTimeline, {
    mocks,
    propsData: Object.assign({
      timeline: timelineOf([version()]),
      scopeLabel: 'Ida Berg',
      currency: 'NOK',
      canWrite: true,
      busy: false
    }, props)
  })
}

describe('WorkforceRateTimeline — the append-only model, made unmistakable', () => {
  // THE assertion this whole surface exists for. `WorkforceRatesController` binds no verb that can
  // change what an existing statement paid, so a row must carry no affordance that implies one.
  test('no row offers an edit or a delete, because the API has neither', () => {
    const wrapper = mountTimeline({
      timeline: timelineOf([
        version({ rateVersionId: 'rv-jul', effectiveFromLocalDate: '2026-07-01', effectiveToUtc: '2026-08-31T22:00:00' }),
        version()
      ])
    })

    // Not one control anywhere inside the history table.
    expect(wrapper.findAll('.wfrt-tl__table button').length).toBe(0)
    expect(wrapper.findAll('.wfrt-tl__table a').length).toBe(0)
    expect(wrapper.findAll('.wfrt-tl__table input').length).toBe(0)

    // And nothing in the rendered text invites one, in any of the words a manager would look for.
    expect(wrapper.find('.wfrt-tl__table').text()).not.toMatch(/rediger|endre|slett|fjern/i)

    // POSITIVE CONTROL: the component is not simply rendering nothing — the rows ARE there, and the
    // one control it does offer is the append.
    expect(wrapper.findAll('.wfrt-tl__table tbody tr').length).toBe(2)
    expect(wrapper.findAll('button').length).toBe(1)
    expect(wrapper.find('button').text()).toBe($i('wfrt_rate_submit'))
  })

  test('the form is phrased as "this rate applies from…", never as an edit', () => {
    const wrapper = mountTimeline()
    expect(wrapper.find('.wfrt-tl__form-title').text()).toBe($i('wfrt_rate_new_title'))
    expect(wrapper.find('.wfrt-tl__law').text()).toContain('SENERE')
  })

  test('the open row is marked as in force rather than given an invented end date', () => {
    const wrapper = mountTimeline({ timeline: timelineOf([version({ effectiveToUtc: null })]) })
    expect(wrapper.find('.wfrt-tl__badge').text()).toBe($i('wfrt_rate_in_force'))
    // A dash here would read as "we do not know when it ends", which is the opposite of open-ended.
    expect(wrapper.find('.wfrt-tl__badge').text()).not.toBe('—')
  })

  test('a closed row shows its end in the STORE\'s zone, not the viewer\'s', () => {
    // 22:00Z on 31 August is midnight on 1 September in Oslo.
    const wrapper = mountTimeline({ timeline: timelineOf([version({ effectiveToUtc: '2026-08-31T22:00:00' })]) })
    const cells = wrapper.findAll('.wfrt-tl__table tbody td')
    expect(cells.at(1).text()).toBe('2026-09-01')
    expect(cells.at(1).text()).not.toBe('2026-08-31')
  })
})

describe('WorkforceRateTimeline — the mistyped future rate, surfaced before the 409', () => {
  const busyTimeline = timelineOf([
    version({ rateVersionId: 'rv-jul', effectiveFromLocalDate: '2026-07-01', effectiveToUtc: '2026-08-31T22:00:00' }),
    version({ rateVersionId: 'rv-sep', effectiveFromLocalDate: '2026-09-01', effectiveToUtc: null })
  ])

  test('choosing a date that already carries a rate blocks the submit and says why', async () => {
    const wrapper = mountTimeline({ timeline: busyTimeline })
    await wrapper.setData({ form: { effectiveFromLocalDate: '2026-09-01', amountText: '250', currency: 'NOK' } })

    expect(wrapper.find('.wfrt-tl__blocker').text()).toBe($i('wfrt_rate_collision', { date: '2026-09-01' }))
    expect(wrapper.find('.wfrt-tl__blocker').text()).toContain('senere dato')
    expect(wrapper.find('button').attributes('disabled')).toBe('disabled')

    wrapper.vm.submit()
    expect(wrapper.emitted().submit).toBeUndefined()
  })

  // POSITIVE CONTROL: a free date must NOT block, or a form that never submitted would satisfy the
  // test above.
  test('and a free date submits', async () => {
    const wrapper = mountTimeline({ timeline: busyTimeline })
    await wrapper.setData({ form: { effectiveFromLocalDate: '2026-10-01', amountText: '250', currency: 'NOK' } })

    expect(wrapper.find('.wfrt-tl__blocker').exists()).toBe(false)
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()

    wrapper.vm.submit()
    expect(wrapper.emitted().submit[0][0]).toEqual({
      effectiveFromLocalDate: '2026-10-01',
      hourlyRateMinor: 25000,
      currency: 'NOK'
    })
  })

  test('it names the statement that will be closed forward, and what does NOT change', async () => {
    const wrapper = mountTimeline({ timeline: busyTimeline })
    await wrapper.setData({ form: { effectiveFromLocalDate: '2026-10-01', amountText: '250', currency: 'NOK' } })

    const effects = wrapper.findAll('.wfrt-tl__effect')
    expect(effects.at(0).text()).toBe($i('wfrt_rate_supersedes', { date: '2026-09-01' }))
    expect(effects.at(0).text()).toContain('endres ikke')
  })

  test('a BACKDATED statement is shown as bounded by the later one, not as cancelling it', async () => {
    const wrapper = mountTimeline({ timeline: busyTimeline })
    await wrapper.setData({ form: { effectiveFromLocalDate: '2026-08-01', amountText: '250', currency: 'NOK' } })

    const texts = wrapper.findAll('.wfrt-tl__effect').wrappers.map(w => w.text())
    expect(texts).toContain($i('wfrt_rate_bounded_by', { date: '2026-09-01' }))
    expect(texts.join(' ')).toContain('avlyser ikke')
  })

  test('the server\'s 409 marks the named row rather than describing it', () => {
    const wrapper = mountTimeline({ timeline: busyTimeline, conflictRateVersionId: 'rv-jul' })

    expect(wrapper.find('.wfrt-tl__conflict').text()).toBe($i('wfrt_rate_conflict_named'))
    const marked = wrapper.findAll('.wfrt-tl__row--named')
    expect(marked.length).toBe(1)
    expect(marked.at(0).text()).toContain('2026-07-01')
  })
})

describe('WorkforceRateTimeline — what goes on the wire', () => {
  test('the exact minor units are shown before the manager presses save', async () => {
    const wrapper = mountTimeline()
    await wrapper.setData({ form: { effectiveFromLocalDate: '2026-10-01', amountText: '235,50', currency: 'nok' } })

    expect(wrapper.find('.wfrt-tl__wire').text()).toBe($i('wfrt_rate_wire_preview', { minor: 23550, currency: 'NOK' }))
  })

  test('the currency is upper-cased on the way out, and a malformed one blocks', async () => {
    const wrapper = mountTimeline()
    await wrapper.setData({ form: { effectiveFromLocalDate: '2026-10-01', amountText: '235', currency: 'nok' } })
    wrapper.vm.submit()
    expect(wrapper.emitted().submit[0][0].currency).toBe('NOK')

    await wrapper.setData({ form: { effectiveFromLocalDate: '2026-10-01', amountText: '235', currency: 'NO' } })
    expect(wrapper.find('.wfrt-tl__error').text()).toBe($i('wfrt_rate_currency_invalid'))
    expect(wrapper.find('button').attributes('disabled')).toBe('disabled')
  })

  test('a refused amount shows its own reason and blocks the submit', async () => {
    const wrapper = mountTimeline()
    await wrapper.setData({ form: { effectiveFromLocalDate: '2026-10-01', amountText: '0', currency: 'NOK' } })

    expect(wrapper.find('.wfrt-tl__error').text()).toBe($i('wfrt_rate_amount_not_positive'))
    expect(wrapper.find('.wfrt-tl__wire').exists()).toBe(false)
    expect(wrapper.find('button').attributes('disabled')).toBe('disabled')

    await wrapper.setData({ form: { effectiveFromLocalDate: '2026-10-01', amountText: '235,555', currency: 'NOK' } })
    expect(wrapper.find('.wfrt-tl__error').text()).toBe($i('wfrt_rate_amount_decimals'))
  })

  test('the currency field defaults to the one the timeline is already denominated in', () => {
    const wrapper = mountTimeline({
      timeline: timelineOf([version({ currency: 'SEK' })]),
      currency: 'NOK'
    })
    expect(wrapper.vm.form.currency).toBe('SEK')
  })

  test('and falls back to the market\'s currency when the timeline has none in force', () => {
    const wrapper = mountTimeline({ timeline: timelineOf([]), currency: 'CHF' })
    expect(wrapper.vm.form.currency).toBe('CHF')
  })
})

describe('WorkforceRateTimeline — money is READ', () => {
  test('the rate is the wire integer through the admin\'s own formatter, unscaled', () => {
    const wrapper = mountTimeline({ timeline: timelineOf([version({ hourlyRateMinor: 23550, currency: 'NOK' })]) })
    const cell = wrapper.findAll('.wfrt-tl__table tbody td').at(2)

    expect(cell.text()).toBe(priceLabel(23550))
    expect(cell.text()).toBe('kr 235,50')
  })

  test('a rate stated in another currency shows the CODE, never this market\'s symbol', () => {
    const wrapper = mountTimeline({
      timeline: timelineOf([version({ hourlyRateMinor: 23550, currency: 'SEK' })]),
      currency: 'NOK'
    })
    const cell = wrapper.findAll('.wfrt-tl__table tbody td').at(2)

    expect(cell.text()).toBe('235,50 SEK')
    // A wrong symbol is a wrong amount.
    expect(cell.text()).not.toContain('kr')
  })

  test('an amount the API did not state renders as a dash, never as zero', () => {
    const wrapper = mountTimeline({ timeline: timelineOf([version({ hourlyRateMinor: null })]) })
    const cell = wrapper.findAll('.wfrt-tl__table tbody td').at(2)

    expect(cell.text()).toBe('—')
    expect(cell.text()).not.toContain('0')
  })
})

describe('WorkforceRateTimeline — honest state and the read-only case', () => {
  test('a failed read says so; an empty one says something else', () => {
    const unknown = mountTimeline({ timeline: buildTimeline(null) })
    expect(unknown.find('.wfrt-tl__unknown').text()).toBe($i('wfrt_rate_unknown'))
    expect(unknown.find('.wfrt-tl__empty').exists()).toBe(false)

    const empty = mountTimeline({ timeline: timelineOf([]) })
    expect(empty.find('.wfrt-tl__empty').text()).toBe($i('wfrt_rate_none_yet'))
    expect(empty.find('.wfrt-tl__unknown').exists()).toBe(false)
  })

  test('without write access the form is gone entirely, not merely disabled', () => {
    const wrapper = mountTimeline({ canWrite: false })
    expect(wrapper.find('.wfrt-tl__form').exists()).toBe(false)
    expect(wrapper.find('.wfrt-tl__readonly').text()).toBe($i('wfrt_rate_read_only'))
  })
})

describe('WorkforceAttendanceTable', () => {
  const attRow = over => Object.assign({
    staffMemberId: 'sm-1',
    displayName: 'Ida Berg',
    localBusinessDate: '2026-09-01T00:00:00',
    plannedMinutes: 450,
    actualMinutes: 465,
    paidBreakMinutes: 0,
    unpaidBreakMinutes: 30,
    varianceMinutes: 15,
    missingPunch: false,
    openSessionCount: 0,
    pendingAdjustmentCount: 0,
    approvedAdjustmentCount: 0,
    rejectedAdjustmentCount: 0,
    locked: false
  }, over)

  function mountAttendance (rows, over) {
    return shallowMount(WorkforceAttendanceTable, {
      mocks,
      propsData: Object.assign({
        attendance: buildAttendance(rows === null ? null : { timeZoneId: 'Europe/Oslo', asOfUtc: '2026-09-03T11:04:00Z', rows }),
        rangeLabel: 'Uke 36'
      }, over)
    })
  }

  // The requirement the endpoint imposes and the screen must repeat: a DRAFT week contributes no
  // planned minutes at all, so a manager comparing planned against clocked on an unpublished week
  // is comparing against nothing.
  test('the published-only rule is stated on every state of the table', () => {
    for (const wrapper of [mountAttendance([attRow()]), mountAttendance([]), mountAttendance(null)]) {
      expect(wrapper.find('.wfrt-att__law').text()).toBe($i('wfrt_att_published_only'))
      expect(wrapper.find('.wfrt-att__law').text()).toContain('PUBLISERTE')
    }
  })

  test('a failed read says so; an answered-but-empty one makes the opposite claim', () => {
    const unknown = mountAttendance(null)
    expect(unknown.find('.wfrt-att__unknown').text()).toBe($i('wfrt_att_unknown'))
    expect(unknown.find('.wfrt-att__table').exists()).toBe(false)
    expect(unknown.find('.wfrt-att__empty').exists()).toBe(false)

    const empty = mountAttendance([])
    expect(empty.find('.wfrt-att__empty').text()).toBe($i('wfrt_att_empty'))
    expect(empty.find('.wfrt-att__unknown').exists()).toBe(false)
  })

  test('the figures are the server\'s minutes, and a stated zero is rendered as zero', () => {
    const wrapper = mountAttendance([attRow({ plannedMinutes: 0, actualMinutes: 465, varianceMinutes: 465 })])
    const cells = wrapper.findAll('.wfrt-att__table tbody td')

    expect(cells.at(2).text()).toBe('0 min')
    expect(cells.at(2).text()).not.toBe('—')
    expect(cells.at(3).text()).toBe('7 t 45 min')
  })

  test('a negative variance reads as one signed figure', () => {
    const wrapper = mountAttendance([attRow({ plannedMinutes: 480, actualMinutes: 405, varianceMinutes: -75 })])
    expect(wrapper.findAll('.wfrt-att__table tbody td').at(4).text()).toBe('−1 t 15 min')
  })

  test('an unnamed engagement is a dash, not its id', () => {
    const wrapper = mountAttendance([attRow({ displayName: null })])
    const first = wrapper.findAll('.wfrt-att__table tbody td').at(0)
    expect(first.text()).toBe('—')
    expect(first.text()).not.toContain('sm-1')
  })

  test('an open session and a missing punch are flagged distinctly', () => {
    const open = mountAttendance([attRow({ openSessionCount: 1, missingPunch: true })])
    expect(open.find('.wfrt-att__flag--open').text()).toBe($i('wfrt_att_flag_open', { count: 1 }))
    expect(open.find('.wfrt-att__flag--missing').exists()).toBe(false)

    const missing = mountAttendance([attRow({ openSessionCount: 0, missingPunch: true })])
    expect(missing.find('.wfrt-att__flag--missing').text()).toBe($i('wfrt_att_flag_missing'))
    expect(missing.find('.wfrt-att__flag--open').exists()).toBe(false)
  })

  // The honest end of this surface: the correction endpoint names a clock session and no
  // manager-reachable read returns one, so the table says so rather than offering a dead control.
  test('it explains why corrections cannot be made here, and offers no control that would fail', () => {
    const wrapper = mountAttendance([attRow({ approvedAdjustmentCount: 1, pendingAdjustmentCount: 1 })])

    expect(wrapper.find('.wfrt-att__flag--adjusted').text()).toBe($i('wfrt_att_flag_adjusted', { approved: 1, total: 2 }))
    expect(wrapper.find('.wfrt-att__gap').text()).toBe($i('wfrt_att_no_correction_ui'))
    // The counts are reported; nothing acts on them. The only controls on the whole component are
    // the three week-navigation buttons, and the table itself carries no interactive element at all.
    expect(wrapper.findAll('button').length).toBe(3)
    expect(wrapper.findAll('.wfrt-att__table button').length).toBe(0)
    expect(wrapper.findAll('.wfrt-att__table a').length).toBe(0)
    expect(wrapper.findAll('.wfrt-att__table input').length).toBe(0)
    expect(wrapper.findAll('.wfrt-att__table select').length).toBe(0)
  })

  test('the week navigation emits a step rather than moving the week itself', () => {
    const wrapper = mountAttendance([attRow()])
    const buttons = wrapper.findAll('button')
    buttons.at(0).trigger('click')
    buttons.at(1).trigger('click')
    buttons.at(2).trigger('click')
    expect(wrapper.emitted().step.map(call => call[0])).toEqual([-1, 0, 1])
  })
})

describe('WorkforceHoursExportPanel', () => {
  function mountPanel (props) {
    return shallowMount(WorkforceHoursExportPanel, {
      mocks,
      propsData: Object.assign({
        from: '2026-09-01',
        to: '2026-09-14',
        canExport: true,
        busy: false,
        result: null,
        rangeError: null
      }, props)
    })
  }

  const fileWith = lines => ({
    text: lines.join('\n') + '\ncol\n',
    fileName: 'okam-hours-42.csv',
    meta: parseHoursExportMeta(lines.join('\n') + '\ncol\n')
  })

  test('without the capability the whole panel is a refusal, with no range to fill in', () => {
    const wrapper = mountPanel({ canExport: false })
    expect(wrapper.find('.wfrt-exp__blocked').text()).toBe($i('wfrt_exp_no_capability'))
    expect(wrapper.findAll('input').length).toBe(0)
    expect(wrapper.findAll('button').length).toBe(0)
  })

  test('the range inputs are calendar dates, and a bad range blocks the fetch', () => {
    const good = mountPanel()
    expect(good.findAll('input[type="date"]').length).toBe(2)
    expect(good.find('button').attributes('disabled')).toBeUndefined()

    const bad = mountPanel({ rangeError: 'too-long' })
    expect(bad.find('.wfrt-exp__error').text()).toBe($i('wfrt_exp_range_too_long', { max: 366 }))
    expect(bad.find('button').attributes('disabled')).toBe('disabled')

    expect(mountPanel({ rangeError: 'reversed' }).find('.wfrt-exp__error').text())
      .toBe($i('wfrt_exp_range_reversed'))
    expect(mountPanel({ rangeError: 'missing' }).find('.wfrt-exp__error').text())
      .toBe($i('wfrt_exp_range_missing'))
  })

  // The three verdicts must be three, and the third must not collapse into either of the others.
  test('complete, incomplete and NOT-STATED are three distinct verdicts', () => {
    const complete = mountPanel({ result: fileWith(['# version=1', '# complete=true', '# rowCount=12', '# incompleteRowCount=0']) })
    expect(complete.find('.wfrt-exp__verdict').text()).toBe($i('wfrt_exp_complete'))
    expect(complete.find('.wfrt-exp__verdict').classes()).toContain('wfrt-exp__verdict--complete')

    const incomplete = mountPanel({ result: fileWith(['# version=1', '# complete=false', '# rowCount=12', '# incompleteRowCount=3']) })
    expect(incomplete.find('.wfrt-exp__verdict').text()).toBe($i('wfrt_exp_incomplete', { count: 3 }))
    expect(incomplete.find('.wfrt-exp__verdict').classes()).toContain('wfrt-exp__verdict--incomplete')

    const unstated = mountPanel({ result: fileWith(['# version=1', '# rowCount=12']) })
    expect(unstated.find('.wfrt-exp__verdict').text()).toBe($i('wfrt_exp_completeness_unstated'))
    expect(unstated.find('.wfrt-exp__verdict').text()).not.toBe($i('wfrt_exp_complete'))
    expect(unstated.find('.wfrt-exp__verdict').classes()).toContain('wfrt-exp__verdict--unstated')
  })

  test('a figure the preamble did not carry is a dash, never a zero', () => {
    const wrapper = mountPanel({ result: fileWith(['# version=1', '# complete=true']) })
    const facts = wrapper.findAll('.wfrt-exp__facts dd').wrappers.map(w => w.text())

    expect(facts[0]).toBe('—')
    expect(facts[0]).not.toBe('0')

    // POSITIVE CONTROL: a stated zero IS shown as zero, so the dash above means "not stated".
    const zero = mountPanel({ result: fileWith(['# version=1', '# complete=true', '# rowCount=0']) })
    expect(zero.findAll('.wfrt-exp__facts dd').at(0).text()).toBe('0')
  })

  test('a preamble version this page does not know is not interpreted at all', () => {
    const wrapper = mountPanel({ result: fileWith(['# version=2', '# complete=true', '# rowCount=12']) })

    expect(wrapper.find('.wfrt-exp__unknown-version').text()).toBe($i('wfrt_exp_unknown_version', { version: '2' }))
    // No verdict is rendered from fields whose meaning is no longer known.
    expect(wrapper.find('.wfrt-exp__verdict').exists()).toBe(false)
    expect(wrapper.find('.wfrt-exp__facts').exists()).toBe(false)
    // The bytes are still downloadable — the file is not this page's to withhold.
    expect(wrapper.text()).toContain($i('wfrt_exp_download'))
  })

  test('it says the file carries hours and no money at all', () => {
    const wrapper = mountPanel({ result: fileWith(['# version=1', '# complete=true', '# basis=hours-only', '# wageMath=none']) })
    expect(wrapper.find('.wfrt-exp__basis').text()).toBe($i('wfrt_exp_hours_only'))
  })
})

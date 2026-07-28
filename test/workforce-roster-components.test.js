import { mount } from '@vue/test-utils'
import WorkforceRosterTable from '~/components/admin/workforce/WorkforceRosterTable.vue'
import WorkforceAddPersonForm from '~/components/admin/workforce/WorkforceAddPersonForm.vue'
import WorkforceEngagementPanel from '~/components/admin/workforce/WorkforceEngagementPanel.vue'
import { buildRoster, buildRoles, buildTerms, endEngagementEffects } from '~/utils/workforce/roster'
import translations from '~/translations'

// These tests are meaningful only under a non-UTC TZ — run the suite with TZ=Europe/Oslo. Under
// TZ=UTC the store-zone rendering below is indistinguishable from a browser-local one.

// The real Norwegian dictionary, resolved the way plugins/i18n.js resolves it, so a missing key
// fails the test rather than silently rendering the key name.
const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}

const summary = over => Object.assign({
  staffMemberId: 'sm-1',
  workforcePersonId: 'p-1',
  displayName: 'Ida Berg',
  employmentNumber: '104',
  capabilities: ['WorkforceSelf'],
  isActive: true,
  activeFromUtc: '2026-01-10T00:00:00',
  activeToUtc: null,
  legalEmployerId: 'le-1',
  personState: 'Claimed'
}, over)

function mountTable (roster, extra) {
  return mount(WorkforceRosterTable, {
    propsData: Object.assign({ roster, timeZoneId: 'Europe/Oslo', locale: 'no' }, extra || {}),
    mocks: { $i }
  })
}

describe('WorkforceRosterTable — the three answers look different on screen', () => {
  test('a read that did not answer says so, and says it is NOT a claim about the store', () => {
    const wrapper = mountTable(buildRoster(null))
    expect(wrapper.text()).toContain(translations.no.wfr_roster_unknown)
    // Not the empty sentence, and no table at all.
    expect(wrapper.text()).not.toContain(translations.no.wfr_roster_empty)
    expect(wrapper.find('.wfr-table__grid').exists()).toBe(false)
  })

  test('a store that really has nobody says something else entirely', () => {
    const wrapper = mountTable(buildRoster([]))
    expect(wrapper.text()).toContain(translations.no.wfr_roster_empty)
    expect(wrapper.text()).not.toContain(translations.no.wfr_roster_unknown)
  })

  test('rows render capabilities as capabilities, and an ended engagement as ended', () => {
    const wrapper = mountTable(buildRoster([
      summary({ capabilities: ['WorkforceSelf', 'WorkforceManager'] }),
      summary({ staffMemberId: 'sm-2', workforcePersonId: 'p-2', displayName: 'Jonas Vik', isActive: false })
    ]))

    expect(wrapper.findAll('.wfr-table__row')).toHaveLength(2)
    expect(wrapper.text()).toContain(translations.no.wfr_cap_manager)
    expect(wrapper.text()).toContain(translations.no.wfr_status_ended)
  })

  // An engagement that holds no grants is a real fact; one whose grants did not load is not. They
  // must not render as the same blank cell.
  test('"no capabilities" and "capabilities unknown" are different cells', () => {
    expect(mountTable(buildRoster([summary({ capabilities: [] })])).text())
      .toContain(translations.no.wfr_cap_none)
    expect(mountTable(buildRoster([summary({ capabilities: undefined })])).text())
      .toContain(translations.no.wfr_cap_unknown)
  })

  // The bare wire stamp again, this time through the whole render path. Read as browser-local under
  // Europe/Oslo it would print 9 January.
  test('dates print in the STORE zone off a bare wire stamp', () => {
    const wrapper = mountTable(buildRoster([summary({ activeFromUtc: '2026-01-09T23:30:00' })]))
    // 23:30 UTC is 00:30 on the 10th in Oslo.
    expect(wrapper.text()).toContain('10')
  })

  test('a null date is a dash, never a zero or a fabricated day', () => {
    const wrapper = mountTable(buildRoster([summary()]))
    expect(wrapper.text()).toContain('—')
  })

  test('one person with two engagements is marked as such', () => {
    const wrapper = mountTable(buildRoster([
      summary({ staffMemberId: 'sm-1', legalEmployerId: 'le-1' }),
      summary({ staffMemberId: 'sm-2', legalEmployerId: 'le-2' })
    ]))
    expect(wrapper.text()).toContain('2 engasjementer')
  })

  test('a store left with no active manager is told, in the strongest terms available', () => {
    const wrapper = mountTable(buildRoster([summary({ capabilities: ['WorkforceSelf'] })]))
    expect(wrapper.text()).toContain(translations.no.wfr_no_manager_left)
  })

  test('selecting a row emits it', () => {
    const wrapper = mountTable(buildRoster([summary()]))
    wrapper.find('.wfr-table__row').trigger('click')
    expect(wrapper.emitted().select[0][0].staffMemberId).toBe('sm-1')
  })
})

describe('WorkforceAddPersonForm — the index, honoured before the call', () => {
  function mountForm (rows) {
    return mount(WorkforceAddPersonForm, {
      propsData: { roster: buildRoster(rows) },
      mocks: { $i }
    })
  }

  test('the single legal employer a store has is chosen rather than made a ceremony', () => {
    const wrapper = mountForm([summary()])
    expect(wrapper.vm.legalEmployerId).toBe('le-1')
    expect(wrapper.find('select').exists()).toBe(false)
  })

  test('several employers are a choice, labelled by count because they carry no name', () => {
    const wrapper = mountForm([summary(), summary({ staffMemberId: 'sm-2', legalEmployerId: 'le-2' })])
    const options = wrapper.findAll('select option')
    expect(options.length).toBe(2)
    // No name is invented for an id the service never names.
    expect(wrapper.text()).toContain(translations.no.wfr_add_employer_hint)
  })

  test('a new person needs a name before it can be submitted', async () => {
    const wrapper = mountForm([summary()])
    expect(wrapper.vm.canSubmit).toBe(false)
    await wrapper.setData({ displayName: 'Nora Haug' })
    expect(wrapper.vm.canSubmit).toBe(true)
  })

  test('the second-engagement path refuses a same-store, same-employer duplicate before the call', async () => {
    const wrapper = mountForm([summary()])
    await wrapper.setData({ mode: 'existing', workforcePersonId: 'p-1' })

    expect(wrapper.vm.conflict).not.toBeNull()
    expect(wrapper.vm.canSubmit).toBe(false)
    expect(wrapper.text()).toContain(translations.no.wfr_conflict_same_store)
  })

  // The half of the index this screen cannot see. Saying it BEFORE the attempt is the point: the
  // refusal that follows names nothing, so a manager who has not been warned reads it as a bug.
  test('it warns that the check cannot see other stores', async () => {
    const wrapper = mountForm([summary({ isActive: false })])
    await wrapper.setData({ mode: 'existing', workforcePersonId: 'p-1' })

    expect(wrapper.vm.conflict).toBeNull()
    expect(wrapper.text()).toContain(translations.no.wfr_conflict_cross_store_caveat)
  })

  test('submitting emits the raw form; the wire shape is built outside the component', async () => {
    const wrapper = mountForm([summary()])
    await wrapper.setData({ displayName: 'Nora Haug', capabilities: ['WorkforceSelf', 'WorkforceScheduler'] })
    wrapper.find('form').trigger('submit')

    expect(wrapper.emitted().submit[0][0]).toMatchObject({
      workforcePersonId: null,
      displayName: 'Nora Haug',
      legalEmployerId: 'le-1',
      capabilities: ['WorkforceSelf', 'WorkforceScheduler']
    })
  })
})

describe('WorkforceEngagementPanel — capability is not role, and ending is not deletion', () => {
  function mountPanel (rows, over) {
    const roster = buildRoster(rows)
    const row = roster.rows[0]
    return mount(WorkforceEngagementPanel, {
      propsData: Object.assign({
        row,
        roster,
        detail: { staffMemberId: row.staffMemberId, revision: 'AAAA', contactEmail: 'ida@example.com', contactPhone: '+4790000000' },
        effects: endEngagementEffects(roster, row, (over || {}).attendance || null),
        canManage: true,
        storeId: 42,
        timeZoneId: 'Europe/Oslo',
        locale: 'no',
        asOf: new Date('2026-07-29T00:00:00Z')
      }, over || {}),
      mocks: { $i }
    })
  }

  // The single most important sentence on the panel.
  test('roles are stated to grant nothing at all', () => {
    const wrapper = mountPanel([summary()], { roles: buildRoles([{ roleId: 'r1', name: 'Kokk', sortOrder: 1, effectiveFromUtc: '2025-01-01T00:00:00', effectiveToUtc: null }], new Date('2026-07-29T00:00:00Z')), staffRoles: [] })
    expect(wrapper.text()).toContain(translations.no.wfr_panel_roles_hint)
    // And capabilities are described separately, as the thing that does grant.
    expect(wrapper.text()).toContain(translations.no.wfr_panel_capabilities_hint)
  })

  test('an unfetched role list is unknown, not "this store has no roles"', () => {
    const wrapper = mountPanel([summary()], { roles: null })
    expect(wrapper.text()).toContain(translations.no.wfr_panel_roles_unknown)
    expect(wrapper.text()).not.toContain(translations.no.wfr_panel_roles_none_defined)
  })

  test('an unfetched term history is unknown, not "no terms"', () => {
    const wrapper = mountPanel([summary()], { terms: null })
    expect(wrapper.text()).toContain(translations.no.wfr_panel_terms_unknown)
  })

  // One null, two meanings — decided by the caller's own capabilities, not by the null.
  test('a wage a caller may not read is WITHHELD on screen, not blank and not "none"', () => {
    const term = { id: 't1', effectiveFromUtc: '2026-01-01T00:00:00', effectiveToUtc: null, contractMinutesPerWeek: 2250, employmentCategory: 'Fast', wage: null }
    const withheld = mountPanel([summary()], { terms: buildTerms([term], false) })
    expect(withheld.text()).toContain(translations.no.wfr_term_wage_withheld)

    const none = mountPanel([summary()], { terms: buildTerms([term], true) })
    expect(none.text()).toContain(translations.no.wfr_term_wage_none)
  })

  test('a contract nobody recorded is a dash, never 0 hours', () => {
    const term = { id: 't1', effectiveFromUtc: '2026-01-01T00:00:00', effectiveToUtc: null, contractMinutesPerWeek: null, wage: null }
    const wrapper = mountPanel([summary()], { terms: buildTerms([term], true) })
    expect(wrapper.text()).toContain('—')
    expect(wrapper.text()).not.toContain('0 t/uke')
  })

  test('37.5 hours a week renders as 37.5 hours a week', () => {
    const term = { id: 't1', effectiveFromUtc: '2026-01-01T00:00:00', effectiveToUtc: null, contractMinutesPerWeek: 2250, wage: null }
    const wrapper = mountPanel([summary()], { terms: buildTerms([term], true) })
    expect(wrapper.text()).toContain('37.5 t/uke')
  })

  describe('the end section tells the truth about what ending does', () => {
    test('shifts, self-service and the personalliste are each stated', () => {
      const wrapper = mountPanel([summary()])
      expect(wrapper.text()).toContain(translations.no.wfr_end_effect_shifts)
      expect(wrapper.text()).toContain(translations.no.wfr_end_effect_selfservice)
      expect(wrapper.text()).toContain(translations.no.wfr_end_effect_personnel_list)
    })

    // The guard that stops a statutory record being stranded without an end time.
    test('a KNOWN open clock session blocks the end button and says why', () => {
      const wrapper = mountPanel([summary()], {
        attendance: { rows: [{ staffMemberId: 'sm-1', openSessionCount: 1 }] }
      })
      expect(wrapper.text()).toContain('1 åpne stemplingsøkter')
      expect(wrapper.find('.wfr-panel__btn--danger').attributes('disabled')).toBe('disabled')
    })

    test('a cleared check reads as cleared and lets the end proceed', () => {
      const wrapper = mountPanel([summary()], {
        attendance: { rows: [{ staffMemberId: 'sm-1', openSessionCount: 0 }] }
      })
      expect(wrapper.text()).toContain(translations.no.wfr_end_effect_punches_clear)
      expect(wrapper.find('.wfr-panel__btn--danger').attributes('disabled')).toBeUndefined()
    })

    // An unanswered probe must not read as a clear — but neither may it become an unliftable block,
    // or an unrelated 403 would freeze the screen.
    test('an UNANSWERED check reads as unknown, and does not masquerade as a clear', () => {
      const wrapper = mountPanel([summary()], { attendance: null })
      expect(wrapper.text()).toContain(translations.no.wfr_end_effect_punches_unknown)
      expect(wrapper.text()).not.toContain(translations.no.wfr_end_effect_punches_clear)
      expect(wrapper.find('.wfr-panel__btn--danger').attributes('disabled')).toBeUndefined()
    })

    // No request can clear an ActiveToUtc once set, and the schedule refuses shifts past it.
    test('the end date is opt-in and its one-way nature is stated when opted into', async () => {
      const wrapper = mountPanel([summary()])
      expect(wrapper.vm.recordEndDate).toBe(false)
      expect(wrapper.text()).not.toContain(translations.no.wfr_end_date_one_way)

      await wrapper.setData({ recordEndDate: true })
      expect(wrapper.text()).toContain(translations.no.wfr_end_date_one_way)
    })

    test('ending emits the opt-in choice rather than a date the manager never asked for', () => {
      const wrapper = mountPanel([summary()])
      wrapper.find('.wfr-panel__btn--danger').trigger('click')
      expect(wrapper.emitted().end[0][0]).toEqual({ recordEndDate: false, endDate: '' })
    })

    // The lockout with no key: no endpoint can grant the capability back afterwards.
    test('the store\'s last active manager cannot be ended from here', () => {
      const wrapper = mountPanel([summary({ capabilities: ['WorkforceManager'] })])
      expect(wrapper.text()).toContain(translations.no.wfr_last_manager_warning)
      expect(wrapper.find('.wfr-panel__btn--danger').attributes('disabled')).toBe('disabled')
    })

    test('stripping the manager grant from the last manager is blocked the same way', async () => {
      const wrapper = mountPanel([summary({ capabilities: ['WorkforceManager'] })])
      await wrapper.setData({ draftCapabilities: [] })
      expect(wrapper.vm.losingLastManager).toBe(true)
      expect(wrapper.find('.wfr-panel__section .wfr-panel__btn').attributes('disabled')).toBe('disabled')
    })
  })

  describe('reactivation', () => {
    test('an ended engagement offers reopening and says nothing was deleted', () => {
      const wrapper = mountPanel([summary({ isActive: false })])
      expect(wrapper.text()).toContain(translations.no.wfr_reactivate_hint)
      expect(wrapper.text()).not.toContain(translations.no.wfr_end_submit)
    })

    test('an ended engagement carrying an unclearable past end date warns it stays unschedulable', () => {
      const wrapper = mountPanel([summary({ isActive: false, activeToUtc: '2026-06-30T00:00:00' })])
      expect(wrapper.text()).toContain('Engasjementet har sluttdato')
    })
  })

  // Payroll identifiers belong to the ENGAGEMENT, and the payroll number only ever arrives on the
  // detail read — `GET /staff` omits it entirely.
  describe('the engagement\'s own numbers', () => {
    test('a save is withheld until the detail read has answered, so an empty box is not saved as blank', () => {
      const wrapper = mountPanel([summary()], { detail: null })
      expect(wrapper.vm.numbersChanged).toBe(false)
    })

    test('editing a number offers a save that carries no capability list', async () => {
      const wrapper = mountPanel([summary()])
      await wrapper.setData({ draftEmploymentNumber: '211' })
      expect(wrapper.vm.numbersChanged).toBe(true)

      wrapper.findAll('.wfr-panel__section').at(1).find('.wfr-panel__btn').trigger('click')
      expect(wrapper.emitted()['save-numbers'][0][0]).toEqual({ employmentNumber: '211', payrollNumber: '' })
    })
  })

  // An engagement created on the roster page starts with no term at all, so the form has to be
  // reachable from here or a new hire has no recorded contract size anywhere.
  describe('appending an employment term', () => {
    test('the form is offered once the term history has answered', () => {
      const wrapper = mountPanel([summary()], { terms: [] })
      expect(wrapper.find('.wfr-panel__termform').exists()).toBe(true)
    })

    test('it is withheld while the term history is unknown — there is nothing to append to yet', () => {
      const wrapper = mountPanel([summary()], { terms: null })
      expect(wrapper.find('.wfr-panel__termform').exists()).toBe(false)
    })

    // The endpoint refuses a wage write from a caller who cannot read one, so offering the field
    // would turn every save into a 403.
    test('wage fields are offered only to a caller who may read a wage', () => {
      const rows = payroll => mountPanel([summary()], { terms: [], hasPayrollApprover: payroll })
        .findAll('.wfr-panel__termform .wfr-panel__termgrid')
      expect(rows(false)).toHaveLength(1)
      expect(rows(true)).toHaveLength(2)
    })

    test('it emits the raw form; the wire shape is built outside the component', async () => {
      const wrapper = mountPanel([summary()], { terms: [] })
      await wrapper.setData({ newTerm: { effectiveFromDate: '2026-08-01', contractHoursPerWeek: '37.5', employmentCategory: 'Fast', wageAmount: '', wageCurrency: '', wageInterval: '' } })
      wrapper.find('.wfr-panel__termform button').trigger('click')

      expect(wrapper.emitted()['save-term'][0][0]).toMatchObject({
        effectiveFromDate: '2026-08-01',
        contractHoursPerWeek: '37.5',
        employmentCategory: 'Fast'
      })
    })
  })

  test('a read-only caller is offered no write at all', () => {
    const wrapper = mountPanel([summary()], { canManage: false })
    expect(wrapper.find('.wfr-panel__btn--danger').attributes('disabled')).toBe('disabled')
  })

  test('contact details that did not load say so rather than rendering as blank', () => {
    const wrapper = mountPanel([summary()], { detail: null })
    expect(wrapper.text()).toContain(translations.no.wfr_panel_detail_unknown)
  })
})

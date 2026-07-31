import { mount } from '@vue/test-utils'
import MealsCompanyPanel from '~/components/admin/meals/MealsCompanyPanel.vue'
import MealsCorridorPanel from '~/components/admin/meals/MealsCorridorPanel.vue'
import MealsPeoplePanel from '~/components/admin/meals/MealsPeoplePanel.vue'
import MealsProgramPanel from '~/components/admin/meals/MealsProgramPanel.vue'

// The panels of the Meals setup surface. What is under test is not layout: it is the set of claims
// each panel is allowed to make and the writes it is allowed to emit — the honesty rules that would
// otherwise survive only as prose in a comment.

const $i = (key, params) => (params ? key + ':' + JSON.stringify(params) : key)

const loaded = rows => ({ state: 'loaded', refusal: null, rows, isEmpty: rows.length === 0 })
const unknown = refusal => ({ state: 'unknown', refusal, rows: [], isEmpty: false })

function money () {
  // The global mixin's formatters. Stubbed to something recognisable rather than to the real core
  // formatter, which this repo carries no checkout of.
  return {
    priceLabel: minor => 'kr ' + minor,
    wholeAmount: minor => String(Math.floor(minor / 100)),
    fractionAmount: minor => String(minor % 100)
  }
}

describe('MealsCompanyPanel — two authorities, and neither pretends to be the other', () => {
  const company = row => ({ state: row ? 'loaded' : 'unknown', refusal: row ? null : 'dark', row })

  test('without the concierge role the create form is not rendered — it is a stated refusal', () => {
    const wrapper = mount(MealsCompanyPanel, {
      mocks: { $i },
      propsData: { canConcierge: false, company: company(null) }
    })
    expect(wrapper.text()).toContain('meals_concierge_only')
    expect(wrapper.findAll('form')).toHaveLength(0)

    // Positive control: with the role the form IS there, so the assertion above is about the gate
    // and not about the component never rendering a form.
    const concierge = mount(MealsCompanyPanel, {
      mocks: { $i },
      propsData: { canConcierge: true, company: company(null) }
    })
    expect(concierge.findAll('form').length).toBeGreaterThan(0)
  })

  test('the create carries the first admin, defaulted to the signed-in account', () => {
    const wrapper = mount(MealsCompanyPanel, {
      mocks: { $i },
      propsData: { canConcierge: true, selfUserId: 'user-1', company: company(null) }
    })
    wrapper.setData({ create: Object.assign({}, wrapper.vm.create, { organizationNumber: '912345678', legalName: 'Acme AS', countryCode: 'no' }) })
    wrapper.vm.submitCreate()

    const emitted = wrapper.emitted('create-company')[0][0]
    expect(emitted.adminApplicationUserId).toBe('user-1')
    // Normalised the way the server normalises it, so the value on screen and the value stored agree.
    expect(emitted.countryCode).toBe('NO')
    // Omitted rather than sent blank: the server falls back to the legal name for a missing display
    // name, and an empty string is a value it would store.
    expect(emitted.displayName).toBeUndefined()
  })

  test('a create missing what the server requires costs a sentence, not a round trip', () => {
    const wrapper = mount(MealsCompanyPanel, {
      mocks: { $i },
      propsData: { canConcierge: true, selfUserId: 'user-1', company: company(null) }
    })
    wrapper.vm.submitCreate()
    expect(wrapper.emitted('create-company')).toBeUndefined()
    expect(wrapper.vm.createError).toBe('meals_err_orgnr_required')
  })

  // The compare-and-swap. Without a revision the edit could silently overwrite somebody else's
  // change, so the submit is withheld and said out loud rather than sent hopefully.
  test('the edit is withheld when the server sent no revision to swap against', () => {
    const wrapper = mount(MealsCompanyPanel, {
      mocks: { $i },
      propsData: {
        canConcierge: false,
        selectedCompanyId: 'c-1',
        company: company({ companyId: 'c-1', displayName: 'Acme', revision: null })
      }
    })
    expect(wrapper.text()).toContain('meals_no_revision')
    wrapper.vm.submitUpdate()
    expect(wrapper.emitted('update-company')).toBeUndefined()
  })

  test('and with one it sends exactly the fields the route accepts, plus that revision', () => {
    const wrapper = mount(MealsCompanyPanel, {
      mocks: { $i },
      propsData: {
        canConcierge: false,
        selectedCompanyId: 'c-1',
        company: company({ companyId: 'c-1', displayName: 'Acme', organizationNumber: '912345678', revision: 'rev-7' })
      }
    })
    wrapper.vm.submitUpdate()

    const emitted = wrapper.emitted('update-company')[0][0]
    expect(emitted).toEqual({
      displayName: 'Acme',
      billingContactName: null,
      billingContactEmail: null,
      billingContactPhone: null,
      expectedVersion: 'rev-7'
    })
    // The registration identity has no field on this route and must not acquire one here.
    expect(emitted.organizationNumber).toBeUndefined()
    expect(emitted.countryCode).toBeUndefined()
  })

  test('a company-scoped refusal reads as the module-wide gate, not the venue one', () => {
    const wrapper = mount(MealsCompanyPanel, {
      mocks: { $i },
      propsData: { canConcierge: false, selectedCompanyId: 'c-1', company: company(null) }
    })
    expect(wrapper.text()).toContain('meals_refusal_company_dark')
    expect(wrapper.text()).not.toContain('meals_refusal_dark:')
  })
})

describe('MealsCorridorPanel — the currency is derived, never typed', () => {
  const selected = { companyId: 'c-1', agreementId: null, agreementStatus: null, hasCorridorHere: false }

  test('with no market currency the form is withheld and the reason named', () => {
    const wrapper = mount(MealsCorridorPanel, {
      mocks: { $i },
      propsData: { canConcierge: true, currency: null, companyId: 'c-1', selected }
    })
    expect(wrapper.text()).toContain('meals_corridor_no_currency')
    expect(wrapper.findAll('form')).toHaveLength(0)
  })

  test('there is no currency input at all — it is shown as a fact', () => {
    const wrapper = mount(MealsCorridorPanel, {
      mocks: { $i },
      propsData: { canConcierge: true, currency: 'NOK', companyId: 'c-1', selected }
    })
    expect(wrapper.findAll('form')).toHaveLength(1)
    expect(wrapper.text()).toContain('NOK')

    const names = wrapper.findAll('input').wrappers.map(w => w.attributes('type'))
    // Four seller fields plus the price terms, and nothing that could set a currency or a date.
    expect(names).toEqual(['text', 'text', 'text', 'text', 'text'])
    expect(wrapper.findAll('input[type="date"]')).toHaveLength(0)
    expect(wrapper.findAll('select')).toHaveLength(0)
  })

  test('the signing body carries the derived currency and no effective instant', () => {
    const wrapper = mount(MealsCorridorPanel, {
      mocks: { $i },
      propsData: { canConcierge: true, currency: 'NOK', companyId: 'c-1', selected }
    })
    wrapper.setData({ form: Object.assign({}, wrapper.vm.form, { sellerLegalName: 'Kafé Nord AS', sellerOrganizationNumber: '998877665' }) })
    wrapper.vm.submit()

    const emitted = wrapper.emitted('sign-agreement')[0][0]
    expect(emitted.currency).toBe('NOK')
    expect(emitted.effectiveFromUtc).toBeUndefined()
    expect(emitted.storeId).toBeUndefined()
  })

  // Signing is a CONCIERGE operation and reading the company is a COMPANY-ADMIN one. A concierge who
  // is not this company's admin gets a 403 on the read — so `selected` is null — and must still be
  // able to sign, which is the only thing they came here to do.
  test('signing survives a company the caller cannot read', () => {
    const wrapper = mount(MealsCorridorPanel, {
      mocks: { $i },
      propsData: { canConcierge: true, currency: 'NOK', companyId: 'c-1', selected: null }
    })
    wrapper.setData({ form: Object.assign({}, wrapper.vm.form, { sellerLegalName: 'Kafé Nord AS', sellerOrganizationNumber: '998877665' }) })
    wrapper.vm.submit()
    expect(wrapper.emitted('sign-agreement')).toHaveLength(1)
    expect(wrapper.find('form button[type="submit"]').attributes('disabled')).toBeFalsy()
  })

  test('and is withheld when there is no company at all', () => {
    const wrapper = mount(MealsCorridorPanel, {
      mocks: { $i },
      propsData: { canConcierge: true, currency: 'NOK', companyId: null, selected: null }
    })
    wrapper.vm.submit()
    expect(wrapper.emitted('sign-agreement')).toBeUndefined()
  })

  test('an existing active corridor is named before anybody signs a second one', () => {
    const wrapper = mount(MealsCorridorPanel, {
      mocks: { $i },
      propsData: {
        canConcierge: true,
        currency: 'NOK',
        selected: { companyId: 'c-1', agreementId: 'a-1', agreementStatus: 'Active', currency: 'NOK', hasCorridorHere: true }
      }
    })
    expect(wrapper.text()).toContain('meals_corridor_exists')
  })
})

describe('MealsProgramPanel — an immutable policy, stated before it is issued', () => {
  const program = over => Object.assign({
    programId: 'p-1',
    agreementId: 'a-1',
    storeId: 42,
    currency: 'NOK',
    name: 'Lunsj',
    status: 'Active',
    currentPolicyVersion: null,
    expectedCurrentVersion: 0,
    enrolledMemberCount: 0,
    revision: 'r1'
  }, over)

  const mountPanel = props => mount(MealsProgramPanel, {
    mocks: Object.assign({ $i }, money()),
    propsData: Object.assign({
      programs: loaded([program()]),
      selected: { companyId: 'c-1', agreementId: 'a-1', agreementStatus: 'Active', hasCorridorHere: true },
      storeId: 42,
      defaultTimeZone: 'Europe/Oslo',
      currency: 'NOK'
    }, props)
  })

  test('a programme at another venue is marked, because publishing against it is not undoable', () => {
    const wrapper = mountPanel({ programs: loaded([program(), program({ programId: 'p-2', storeId: 99, name: 'Kantine' })]) })
    expect(wrapper.text()).toContain('meals_program_other_venue')
    // ...and exactly once: the programme at THIS venue is not marked.
    expect(wrapper.text().split('meals_program_other_venue')).toHaveLength(2)
  })

  test('without an active corridor here, creating a programme is refused with the next step named', () => {
    const wrapper = mountPanel({ selected: { companyId: 'c-1', agreementId: null, agreementStatus: null, hasCorridorHere: false } })
    expect(wrapper.text()).toContain('meals_program_needs_corridor')
    expect(wrapper.vm.canCreateProgram).toBe(false)
  })

  test('the policy body carries the weekday mask, the window in minutes and the programme currency', () => {
    const wrapper = mountPanel({ selectedProgramId: 'p-1' })
    wrapper.setData({
      policy: Object.assign({}, wrapper.vm.policy, {
        allowance: '120,50',
        periodKind: 'CalendarMonth',
        weekdays: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
        windowStart: '11:00',
        windowEnd: '14:30',
        timeZoneId: 'Europe/Oslo',
        effectiveFromLocal: '2026-08-01T09:00'
      })
    })
    wrapper.vm.submitPolicy()

    const emitted = wrapper.emitted('create-policy')[0][0]
    expect(emitted.programId).toBe('p-1')
    expect(emitted.request).toMatchObject({
      expectedCurrentVersion: 0,
      allowanceMinor: 12050,
      currency: 'NOK',
      periodKind: 'CalendarMonth',
      eligibleWeekdaysMask: 31,
      localWindowStartMinutes: 660,
      localWindowEndMinutes: 870,
      timeZoneId: 'Europe/Oslo'
    })
    // The instant is read in the reader's own zone and sent absolute — never a bare local string.
    expect(emitted.request.effectiveFromUtc).toMatch(/Z$/)
    expect(new Date(emitted.request.effectiveFromUtc).getTime())
      .toBe(new Date('2026-08-01T09:00').getTime())
  })

  test('the currency is the PROGRAMME\'s, not the admin market\'s — a mismatch is the server\'s 409', () => {
    const wrapper = mountPanel({
      programs: loaded([program({ currency: 'CHF' })]),
      selectedProgramId: 'p-1',
      currency: 'NOK'
    })
    wrapper.setData({ policy: Object.assign({}, wrapper.vm.policy, { allowance: '10', effectiveFromLocal: '2026-08-01T09:00' }) })
    wrapper.vm.submitPolicy()
    expect(wrapper.emitted('create-policy')[0][0].request.currency).toBe('CHF')
    // ...and the preview refuses the kroner symbol over a franc amount.
    expect(wrapper.vm.allowancePreview).toBe('10,0 CHF')
  })

  test('a zero allowance is accepted — the server validates non-negative, not positive', () => {
    const wrapper = mountPanel({ selectedProgramId: 'p-1' })
    wrapper.setData({ policy: Object.assign({}, wrapper.vm.policy, { allowance: '0', effectiveFromLocal: '2026-08-01T09:00' }) })
    wrapper.vm.submitPolicy()
    expect(wrapper.emitted('create-policy')[0][0].request.allowanceMinor).toBe(0)

    // ...and a negative one is not.
    wrapper.setData({ policy: Object.assign({}, wrapper.vm.policy, { allowance: '-1' }) })
    wrapper.vm.submitPolicy()
    expect(wrapper.emitted('create-policy')).toHaveLength(1)
    expect(wrapper.vm.policyError).toBe('meals_err_allowance_not_positive')
  })

  test('an empty weekday mask and an inverted window are refused before the round trip', () => {
    const wrapper = mountPanel({ selectedProgramId: 'p-1' })
    wrapper.setData({
      policy: Object.assign({}, wrapper.vm.policy, {
        allowance: '100',
        effectiveFromLocal: '2026-08-01T09:00',
        weekdays: { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false }
      })
    })
    wrapper.vm.submitPolicy()
    expect(wrapper.vm.policyError).toBe('meals_err_weekdays_required')

    wrapper.setData({
      policy: Object.assign({}, wrapper.vm.policy, {
        weekdays: { mon: true },
        windowStart: '14:00',
        windowEnd: '11:00'
      })
    })
    wrapper.vm.submitPolicy()
    expect(wrapper.vm.policyError).toBe('meals_err_window_order')
    expect(wrapper.emitted('create-policy')).toBeUndefined()
  })

  test('the panel says it cannot read a policy back, so nobody supersedes one blind', () => {
    const wrapper = mountPanel({ selectedProgramId: 'p-1' })
    expect(wrapper.text()).toContain('meals_policy_no_read_note')
    expect(wrapper.text()).toContain('meals_policy_immutable_note')
  })

  test('a refused programmes read is the company-scoped sentence, never an empty list', () => {
    const wrapper = mountPanel({ programs: unknown('dark') })
    expect(wrapper.text()).toContain('meals_refusal_company_dark')
    expect(wrapper.text()).not.toContain('meals_programs_none')
  })
})

describe('MealsPeoplePanel — the two places this module\'s honesty is hardest', () => {
  const mountPanel = props => mount(MealsPeoplePanel, {
    mocks: { $i },
    propsData: Object.assign({ invitations: loaded([]), members: loaded([]) }, props)
  })

  const issued = {
    invitationId: 'i-1',
    intendedContactEmail: 'kari@acme.no',
    intendedRole: 'Employee',
    state: 'Pending',
    expiresAtUtc: '2026-08-14T09:00:00',
    token: 'mealsinv_abc123'
  }

  // ---- MIG-17 ------------------------------------------------------------------------------------

  test('the permanent consequence is on screen before anything can be issued', () => {
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('meals_mig17_title')
    expect(wrapper.text()).toContain('meals_mig17_body')
    // A danger note, not a hint: it is the one thing on this panel that cannot be undone.
    expect(wrapper.findAll('.mls-note--danger')).toHaveLength(1)
  })

  test('the issue button is dead until the consequence is acknowledged', async () => {
    const wrapper = mountPanel()
    expect(wrapper.find('form button[type="submit"]').attributes('disabled')).toBeTruthy()

    await wrapper.setData({ acknowledged: true })
    expect(wrapper.find('form button[type="submit"]').attributes('disabled')).toBeFalsy()
  })

  test('and the submit itself refuses without it — the disabled attribute is not the only guard', () => {
    const wrapper = mountPanel()
    wrapper.setData({ invite: Object.assign({}, wrapper.vm.invite, { email: 'kari@acme.no' }), acknowledged: false })
    wrapper.vm.submitInvitation()
    expect(wrapper.emitted('create-invitation')).toBeUndefined()
    expect(wrapper.vm.inviteError).toBe('meals_err_ack_required')
  })

  test('the member list shows the identifier the statement will carry, and names why', () => {
    const wrapper = mountPanel({
      members: loaded([{ membershipId: 'm-1', applicationUserId: 'u-9', role: 'Employee', state: 'Active' }])
    })
    expect(wrapper.text()).toContain('m-1')
    expect(wrapper.text()).toContain('meals_members_display_note')
  })

  // ---- The token handover ------------------------------------------------------------------------

  test('with a token on screen there is NO send control of any kind', () => {
    const wrapper = mountPanel({ issued })
    const labels = wrapper.findAll('button').wrappers.map(w => w.text())
    expect(labels).toEqual(['meals_token_copy', 'meals_token_done'])
    expect(labels.join(' ')).not.toMatch(/send|deliver|email|sms/i)
    expect(wrapper.text()).toContain('meals_token_not_sent_title')
    expect(wrapper.text()).toContain('meals_token_not_sent_body')
  })

  test('the token is on screen so it CAN be relayed, and readonly so it cannot be edited into rubbish', () => {
    const wrapper = mountPanel({ issued })
    const field = wrapper.find('#meals-issued-token')
    expect(field.element.value).toBe('mealsinv_abc123')
    expect(field.attributes('readonly')).toBeTruthy()
    // It replaces the issue form while it is up, so a second issue cannot scroll it off screen.
    expect(wrapper.findAll('form')).toHaveLength(0)
  })

  test('the panel states that it will not be shown again, and that the claim is contact-bound', () => {
    const wrapper = mountPanel({ issued })
    expect(wrapper.text()).toContain('meals_token_once_note')
    expect(wrapper.text()).toContain('meals_token_bearer_note')
    expect(wrapper.text()).toContain('meals_token_no_claim_screen')
  })

  test('dismissing it is an explicit act by the operator, not a timeout', async () => {
    const wrapper = mountPanel({ issued })
    await wrapper.findAll('button').at(1).trigger('click')
    expect(wrapper.emitted('dismiss-issued')).toHaveLength(1)
  })

  test('no invitation ROW ever renders a token — no read can produce one', () => {
    const wrapper = mountPanel({
      invitations: loaded([{ invitationId: 'i-1', intendedContactEmail: 'kari@acme.no', intendedRole: 'Employee', state: 'Pending', isRevocable: true, revision: 'r1' }])
    })
    expect(wrapper.text()).not.toContain('mealsinv_')
  })

  // ---- Revocation, the mitigation for a token that went astray -----------------------------------

  test('only a pending invitation offers revoke, and it carries the revision to swap against', async () => {
    const wrapper = mountPanel({
      invitations: loaded([
        { invitationId: 'i-1', state: 'Pending', isRevocable: true, revision: 'r1' },
        { invitationId: 'i-2', state: 'Claimed', isRevocable: false, revision: 'r2' }
      ])
    })
    const buttons = wrapper.findAll('tbody button')
    expect(buttons).toHaveLength(1)

    await buttons.at(0).trigger('click')
    expect(wrapper.emitted('revoke-invitation')[0][0]).toEqual({ invitationId: 'i-1', expectedVersion: 'r1' })
  })

  test('the invitation body carries one contact and the bounded expiry', () => {
    const wrapper = mountPanel()
    wrapper.setData({
      acknowledged: true,
      invite: { email: 'kari@acme.no', phone: '', role: 'Employee', expiresInDays: 30 }
    })
    wrapper.vm.submitInvitation()
    expect(wrapper.emitted('create-invitation')[0][0]).toEqual({
      intendedContactEmail: 'kari@acme.no',
      intendedContactPhone: null,
      intendedRole: 'Employee',
      expiresInDays: 30
    })
  })

  test('an out-of-range expiry and a missing contact are refused before the round trip', () => {
    const wrapper = mountPanel()
    wrapper.setData({ acknowledged: true, invite: { email: '', phone: '', role: 'Employee', expiresInDays: 14 } })
    wrapper.vm.submitInvitation()
    expect(wrapper.vm.inviteError).toBe('meals_err_contact_required')

    wrapper.setData({ invite: { email: 'kari@acme.no', phone: '', role: 'Employee', expiresInDays: 365 } })
    wrapper.vm.submitInvitation()
    expect(wrapper.vm.inviteError).toBe('meals_err_expires_range')
    expect(wrapper.emitted('create-invitation')).toBeUndefined()
  })
})

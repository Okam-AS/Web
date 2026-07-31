import { mount } from '@vue/test-utils'
import MealsCompanyPicker from '~/components/admin/meals/MealsCompanyPicker.vue'

// The picker is the one place on the setup surface that reads the VENUE's directory, so it is also
// the one place whose refusal is the per-store gate rather than the module-wide one. And it is where
// "there is no route that lists company accounts" becomes a thing an operator has to be told.

const $i = (key, params) => (params ? key + ':' + JSON.stringify(params) : key)

function companies (over) {
  return Object.assign({
    state: 'loaded',
    refusal: null,
    rows: [],
    isEmpty: true,
    unconfirmedCompanyIds: []
  }, over)
}

const row = over => Object.assign({
  companyId: 'c-1',
  label: 'Acme',
  secondaryName: 'Acme Industri AS',
  organizationNumber: '912345678',
  companyStatus: 'Active',
  agreementId: 'a-1',
  agreementStatus: 'Active',
  currency: 'NOK',
  hasCorridorHere: true,
  isSelected: false
}, over)

const mountPicker = over => mount(MealsCompanyPicker, { mocks: { $i }, propsData: { companies: companies(over) } })

describe('MealsCompanyPicker', () => {
  test('an unanswered directory is a caveat, never an empty venue', () => {
    const wrapper = mountPicker({ state: 'unknown', refusal: 'dark', isEmpty: false })
    // The STORE sentence: this list is gated by the per-store flag, not the installation's config.
    expect(wrapper.text()).toContain('meals_refusal_dark')
    expect(wrapper.text()).not.toContain('meals_refusal_company_dark')
    expect(wrapper.text()).not.toContain('meals_picker_none')
  })

  // The two come apart, and this is the case that would otherwise lose the caveat: one company on
  // screen from this session, while the directory read failed. Presenting it without the caveat
  // would show one company as though it were the venue's whole set.
  test('a failed directory keeps its caveat even when a session company fills the list', () => {
    const wrapper = mountPicker({
      state: 'loaded',
      refusal: 'unknown',
      isEmpty: false,
      rows: [row({ companyId: 'c-2', hasCorridorHere: false, agreementId: null, agreementStatus: null })]
    })
    expect(wrapper.text()).toContain('meals_refusal_unknown')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
  })

  test('an answered empty directory is a claim about the venue, and carries no caveat', () => {
    const wrapper = mountPicker({ isEmpty: true })
    expect(wrapper.text()).toContain('meals_picker_none')
    expect(wrapper.text()).not.toContain('meals_refusal')
  })

  test('a company with no corridor here is named as such, not left looking broken', () => {
    const wrapper = mountPicker({
      isEmpty: false,
      rows: [row({ hasCorridorHere: false, agreementId: null, agreementStatus: null, currency: null })]
    })
    expect(wrapper.text()).toContain('meals_picker_no_corridor')
  })

  test('the rows that leave on reload are counted and explained', () => {
    const wrapper = mountPicker({ isEmpty: false, rows: [row()], unconfirmedCompanyIds: ['c-2'] })
    expect(wrapper.text()).toContain('meals_picker_unconfirmed:{"count":1}')
  })

  test('the identifier field is the documented recovery, and refuses a stray paste', () => {
    const wrapper = mountPicker()
    wrapper.setData({ companyId: 'not a guid' })
    wrapper.vm.submitById()
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.vm.error).toBe('meals_err_company_id_invalid')

    wrapper.setData({ companyId: '11111111-1111-1111-1111-111111111111' })
    wrapper.vm.submitById()
    expect(wrapper.emitted('select')[0]).toEqual(['11111111-1111-1111-1111-111111111111'])
  })

  test('clicking a row selects that company', async () => {
    const wrapper = mountPicker({ isEmpty: false, rows: [row()] })
    await wrapper.find('tbody tr').trigger('click')
    expect(wrapper.emitted('select')[0]).toEqual(['c-1'])
  })
})

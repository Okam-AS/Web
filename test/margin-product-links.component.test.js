import { mount } from '@vue/test-utils'
import MarginProductLinkPanel from '~/components/admin/margin/MarginProductLinkPanel.vue'
import { readProductLinks } from '~/utils/margin/menu-margin'
import translations from '~/translations'

const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}

const RECIPE = 'aaaaaaaa-0000-0000-0000-000000000001'
const OTHER_RECIPE = 'aaaaaaaa-0000-0000-0000-000000000002'
const SOUP = 'pppppppp-0000-0000-0000-000000000001'
const BUN = 'pppppppp-0000-0000-0000-000000000002'
const GONE = 'pppppppp-0000-0000-0000-000000000009'

const CATALOG = [
  { productId: SOUP, productName: 'Tomatsuppe', goodsGroupName: 'Mat', productHidden: false, recipeId: RECIPE, recipeName: 'Tomatsuppe' },
  { productId: BUN, productName: 'Bolle', goodsGroupName: 'Mat', productHidden: false, recipeId: OTHER_RECIPE, recipeName: 'Bollebakst' }
]

function render (options) {
  const opts = options || {}
  return mount(MarginProductLinkPanel, {
    propsData: {
      links: opts.links === undefined ? [] : opts.links,
      products: opts.products === undefined ? CATALOG : opts.products,
      recipeId: RECIPE,
      busy: opts.busy === true,
      saving: opts.saving === true
    },
    mocks: { $i }
  })
}

describe('the editor refuses to open on an unknown starting set', () => {
  // The save is a REPLACE-SET. An editor seeded from an unknown set would offer to save an empty list
  // over the venue's real links, deleting every one of them without anyone seeing it.
  test('a link read that did not answer shows no rows and no save', () => {
    const wrapper = render({ links: null })
    expect(wrapper.find('[data-test="links-unknown"]').text()).toBe(translations.no.mrg_links_unknown)
    expect(wrapper.find('[data-test="link-save"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="link-add"]').exists()).toBe(false)
  })

  // CONTROL: an ANSWERED empty set opens the editor. The two fixtures differ only in null versus [].
  test('CONTROL: an answered empty set opens the editor and says the recipe has no link yet', () => {
    const wrapper = render({ links: [] })
    expect(wrapper.find('[data-test="links-unknown"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="links-empty"]').text()).toBe(translations.no.mrg_links_empty)
    expect(wrapper.find('[data-test="link-save"]').exists()).toBe(true)
  })
})

describe('the current set is what the editor starts from', () => {
  const existing = readProductLinks({
    recipeId: RECIPE,
    links: [{ productId: SOUP, quantityPerSoldUnit: 0.25, isActive: true, isBroken: false, productName: 'Tomatsuppe' }]
  })

  test('an existing link is seeded into the rows, quantity included', () => {
    const wrapper = render({ links: existing })
    expect(wrapper.findAll('[data-test="link-product"]')).toHaveLength(1)
    expect(wrapper.find('[data-test="link-quantity"]').element.value).toBe('0.25')
  })

  // A link pointing at a product the catalog no longer holds has NO option to select. Without an
  // explicit choice for it the select would fall back to blank and the next save would delete it.
  test('a link whose product left the catalog keeps a choice of its own', () => {
    const orphaned = readProductLinks({
      recipeId: RECIPE,
      links: [{ productId: GONE, quantityPerSoldUnit: 1, isActive: true, isBroken: true, productName: null }]
    })
    const wrapper = render({ links: orphaned })

    const options = wrapper.find('[data-test="link-product"]').findAll('option')
    const values = options.wrappers.map(o => o.element.value)
    expect(values).toContain(GONE)
    expect(wrapper.text()).toContain(translations.no.mrg_links_product_gone)
  })

  // CONTROL: a product that IS in the catalog gets no such marker.
  test('CONTROL: a live product is offered by name, with no "gone" marker', () => {
    const wrapper = render({ links: existing })
    expect(wrapper.text()).not.toContain(translations.no.mrg_links_product_gone)
    expect(wrapper.text()).toContain('Tomatsuppe')
  })

  test('a product already claimed by another recipe is offered, and named as claimed', () => {
    // Hiding it would leave a venue hunting for a dish it can see in the POS; the backend refuses the
    // save with `margin.product-link-invalid`, so the picker says so first.
    const wrapper = render({ links: [] })
    wrapper.vm.add()
    expect(wrapper.vm.optionLabel(CATALOG[1])).toBe('Bolle (allerede koblet til Bollebakst)')
    // The recipe's OWN product carries no such note.
    expect(wrapper.vm.optionLabel(CATALOG[0])).toBe('Tomatsuppe')
  })
})

describe('what gets emitted, and what gets refused before the round trip', () => {
  test('the whole desired set is emitted, with the quantity as a number', async () => {
    const wrapper = render({ links: [] })
    wrapper.vm.add()
    wrapper.vm.draft[0].productId = SOUP
    wrapper.vm.draft[0].quantity = '0.25'
    await wrapper.vm.$nextTick()

    wrapper.find('[data-test="link-save"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted().save[0][0]).toEqual([{ productId: SOUP, quantityPerSoldUnit: 0.25 }])
  })

  test('clearing every row emits an empty set — the way a recipe is unlinked', async () => {
    const wrapper = render({
      links: readProductLinks({ recipeId: RECIPE, links: [{ productId: SOUP, quantityPerSoldUnit: 1, isActive: true }] })
    })
    wrapper.find('[data-test="link-remove"]').trigger('click')
    await wrapper.vm.$nextTick()
    wrapper.find('[data-test="link-save"]').trigger('click')

    expect(wrapper.emitted().save[0][0]).toEqual([])
  })

  test('a zero quantity is refused locally, and nothing is emitted', async () => {
    const wrapper = render({ links: [] })
    wrapper.vm.add()
    wrapper.vm.draft[0].productId = SOUP
    wrapper.vm.draft[0].quantity = '0'
    await wrapper.vm.$nextTick()

    wrapper.find('[data-test="link-save"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted().save).toBeUndefined()
    expect(wrapper.find('[data-test="link-error"]').text()).toBe(translations.no.mrg_links_err_quantity)
  })

  test('the same product twice is refused: a product belongs to one recipe', async () => {
    const wrapper = render({ links: [] })
    wrapper.vm.add()
    wrapper.vm.add()
    wrapper.vm.draft[0].productId = SOUP
    wrapper.vm.draft[0].quantity = '1'
    wrapper.vm.draft[1].productId = SOUP
    wrapper.vm.draft[1].quantity = '1'
    await wrapper.vm.$nextTick()

    wrapper.find('[data-test="link-save"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted().save).toBeUndefined()
    expect(wrapper.find('[data-test="link-error"]').text()).toBe(translations.no.mrg_links_err_duplicate)
  })

  test('a row with no product is refused', async () => {
    const wrapper = render({ links: [] })
    wrapper.vm.add()
    await wrapper.vm.$nextTick()
    wrapper.find('[data-test="link-save"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted().save).toBeUndefined()
    expect(wrapper.find('[data-test="link-error"]').text()).toBe(translations.no.mrg_links_err_product)
  })
})

describe('the editor is a copy, and the replace-set is said out loud', () => {
  // Editing must not mutate the read model the rest of the page renders from.
  test('editing a row leaves the prop untouched', async () => {
    const links = readProductLinks({ recipeId: RECIPE, links: [{ productId: SOUP, quantityPerSoldUnit: 1, isActive: true }] })
    const wrapper = render({ links })
    wrapper.vm.draft[0].quantity = '9'
    await wrapper.vm.$nextTick()

    expect(links[0].quantityPerSoldUnit).toBe(1)
  })

  test('a fresh answer from the server re-seeds the editor', async () => {
    const wrapper = render({ links: [] })
    wrapper.vm.add()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.draft).toHaveLength(1)

    wrapper.setProps({
      links: readProductLinks({ recipeId: RECIPE, links: [{ productId: BUN, quantityPerSoldUnit: 2, isActive: true }] })
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.draft).toEqual([{ productId: BUN, quantity: '2' }])
  })

  test('the surface says that saving replaces the whole set', () => {
    expect(render({ links: [] }).text()).toContain(translations.no.mrg_links_replace_caveat)
  })
})

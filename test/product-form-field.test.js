import { mount } from '@vue/test-utils'
import ProductFormField from '~/components/admin/ProductFormField.vue'
import MenuRowDetails from '~/components/admin/MenuRowDetails.vue'

// The shared field is presentation only. It owns the label, hint and spacing that the product
// editor already had, and nothing about the value: each editor keeps its own binding, so reusing
// it here cannot change how Products saves.

describe('the shared product field', () => {
  test('renders its label and the control it wraps', () => {
    const wrapper = mount(ProductFormField, {
      propsData: { label: 'Navn' },
      slots: { default: '<input class="probe" value="Pizza">' }
    })

    expect(wrapper.find('label').text()).toContain('Navn')
    expect(wrapper.find('input.probe').element.value).toBe('Pizza')
  })

  test('shows a hint only when one is given', () => {
    const without = mount(ProductFormField, { propsData: { label: 'Navn' } })
    expect(without.find('.product-form-hint').exists()).toBe(false)

    const with_ = mount(ProductFormField, { propsData: { label: 'Pant', hint: 'I kroner' } })
    expect(with_.find('.product-form-hint').text()).toBe('I kroner')
  })

  test('ties the label to the control when an id is given', () => {
    const wrapper = mount(ProductFormField, {
      propsData: { label: 'Navn', controlId: 'row-1-name' },
      slots: { default: '<input id="row-1-name">' }
    })

    expect(wrapper.find('label').attributes('for')).toBe('row-1-name')
  })

  test('renders the actions slot beside the control', () => {
    const wrapper = mount(ProductFormField, {
      propsData: { label: 'Navn' },
      slots: { default: '<input>', actions: '<button class="use-source">Bruk kilde</button>' }
    })

    expect(wrapper.find('button.use-source').exists()).toBe(true)
  })
})

describe('the row detail panel', () => {
  // Six groups is the shape the legacy import produced. All of them stay listed and each stays
  // clickable: the detail panel supplements the table, it never truncates what is already there.
  const groups = Array.from({ length: 6 }, (_unused, index) => ({
    variantGroupId: `group-${index}`,
    name: `Gruppe ${index + 1}`,
    required: index === 0,
    multiSelect: index === 1,
    minimumSelectedOptions: null,
    maximumSelectedOptions: null,
    options: [{ name: 'Alternativ', amount: 1500, negativeAmount: false }]
  }))

  const row = {
    rowKey: 'row-1',
    action: 'Update',
    displayName: 'Vegetar nr. 11',
    targetProductId: 'p-1',
    metadataEdits: {},
    variantGroups: null,
    clearVariantGroups: false,
    current: { name: 'Vegetar nr. 11', variants: groups },
    sourcePrices: {},
    manualPrices: {}
  }

  test('lists every existing variant group and keeps each one editable', () => {
    const wrapper = mount(MenuRowDetails, {
      propsData: { row, categories: [], newCategories: [] },
      mocks: { $i: (key, args) => (args ? `${key}:${JSON.stringify(args)}` : key) }
    })

    const rows = wrapper.findAll('.variant-row')
    expect(rows).toHaveLength(6)
    expect(wrapper.text()).toContain('Gruppe 6')

    rows.at(5).trigger('click')
    expect(wrapper.emitted('edit-variant')[0]).toEqual([5])
  })

  test('uses the shared product field for the metadata inputs', () => {
    const wrapper = mount(MenuRowDetails, {
      propsData: { row, categories: [], newCategories: [] },
      mocks: { $i: (key, args) => (args ? `${key}:${JSON.stringify(args)}` : key) }
    })

    expect(wrapper.findAllComponents(ProductFormField).length).toBeGreaterThan(0)
  })
})

import { mount } from '@vue/test-utils'
import MenuProductSearch from '~/components/admin/MenuProductSearch.vue'
import MenuColumnPicker from '~/components/admin/MenuColumnPicker.vue'

// Scrolling inside a popover is the operator reading it, and it used to close the thing being
// read. Scrolling the page underneath is different: the popover is anchored to a control that
// has moved, so it re-anchors, and closes only once that control is gone.

// A scroll in an arbitrary container does not bubble, which is why the listener is registered
// with capture. Dispatching on window with an explicit target is what that listener sees.
const scrollFrom = (node) => {
  const event = new Event('scroll')
  Object.defineProperty(event, 'target', { value: node, configurable: true })
  window.dispatchEvent(event)
}

describe('the product autocomplete', () => {
  const options = [
    { value: 1, label: 'Vegetar nr. 11 MEDIUM' },
    { value: 2, label: 'Vegetar nr. 11 STOR' }
  ]

  const build = () => mount(MenuProductSearch, {
    propsData: { options, value: 1, createLabel: 'Opprett nytt produkt' },
    attachTo: document.body
  })

  test('stays open while the list of matches is scrolled', async () => {
    const wrapper = build()
    await wrapper.find('input').trigger('focus')
    expect(wrapper.vm.open).toBe(true)

    scrollFrom(wrapper.vm.$refs.list)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.open).toBe(true)
    expect(wrapper.find('[role=listbox]').exists()).toBe(true)
    wrapper.destroy()
  })

  test('stays open when an option inside the list is what scrolled', async () => {
    // Keyboard navigation scrolls the active option into view, and the event comes from it.
    const wrapper = build()
    await wrapper.find('input').trigger('focus')

    scrollFrom(wrapper.find('[role=option]').element)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.open).toBe(true)
    wrapper.destroy()
  })

  test('re-anchors rather than closing when the page scrolls under it', async () => {
    const wrapper = build()
    await wrapper.find('input').trigger('focus')

    const repositioned = jest.spyOn(wrapper.vm, 'reposition')
    scrollFrom(document.body)
    await wrapper.vm.$nextTick()

    expect(repositioned).toHaveBeenCalled()
    expect(wrapper.vm.open).toBe(true)
    wrapper.destroy()
  })

  test('closes when the control it belongs to has scrolled off screen', async () => {
    const wrapper = build()
    await wrapper.find('input').trigger('focus')

    wrapper.vm.$refs.trigger.getBoundingClientRect = () => ({ top: -400, bottom: -380, left: 0, width: 200, height: 20 })
    scrollFrom(document.body)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.open).toBe(false)
    wrapper.destroy()
  })

  test('a click outside still closes it', async () => {
    const wrapper = build()
    await wrapper.find('input').trigger('focus')

    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.open).toBe(false)
    wrapper.destroy()
  })

  test('Escape still closes it', async () => {
    const wrapper = build()
    await wrapper.find('input').trigger('focus')

    await wrapper.find('input').trigger('keydown', { key: 'Escape' })

    expect(wrapper.vm.open).toBe(false)
    wrapper.destroy()
  })
})

describe('the column picker', () => {
  const build = () => mount(MenuColumnPicker, {
    propsData: { visible: ['product'], counts: {} },
    mocks: { $i: key => key },
    attachTo: document.body
  })

  test('stays open while its own list of columns is scrolled', async () => {
    const wrapper = build()
    await wrapper.find('button').trigger('click')
    expect(wrapper.vm.open).toBe(true)

    scrollFrom(wrapper.vm.$refs.panel)
    await wrapper.vm.$nextTick()

    // This is the one that was broken: any scroll at all used to close it, this one included.
    expect(wrapper.vm.open).toBe(true)
    expect(wrapper.find('.column-picker-panel').exists()).toBe(true)
    wrapper.destroy()
  })

  test('stays open when a checkbox row inside the panel is what scrolled', async () => {
    const wrapper = build()
    await wrapper.find('button').trigger('click')

    scrollFrom(wrapper.find('.column-picker-panel label').element)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.open).toBe(true)
    wrapper.destroy()
  })

  test('re-anchors rather than closing when the page scrolls under it', async () => {
    const wrapper = build()
    await wrapper.find('button').trigger('click')

    const repositioned = jest.spyOn(wrapper.vm, 'reposition')
    scrollFrom(document.body)
    await wrapper.vm.$nextTick()

    expect(repositioned).toHaveBeenCalled()
    expect(wrapper.vm.open).toBe(true)
    wrapper.destroy()
  })

  test('a click outside still closes it', async () => {
    const wrapper = build()
    await wrapper.find('button').trigger('click')

    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.open).toBe(false)
    wrapper.destroy()
  })

  test('a click inside the panel leaves it open', async () => {
    const wrapper = build()
    await wrapper.find('button').trigger('click')

    wrapper.find('.column-picker-panel').element
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.open).toBe(true)
    wrapper.destroy()
  })

  test('Escape still closes it', async () => {
    const wrapper = build()
    await wrapper.find('button').trigger('click')

    await wrapper.find('.column-picker-panel').trigger('keydown.esc')

    expect(wrapper.vm.open).toBe(false)
    wrapper.destroy()
  })
})

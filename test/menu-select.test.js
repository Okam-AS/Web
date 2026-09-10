import { mount } from '@vue/test-utils'
import MenuSelect from '~/components/admin/MenuSelect.vue'

const options = [{ value: null, label: 'Ingen kobling' }, { value: 7, label: 'Pizza' }, { value: 8, label: 'Utilgjengelig', disabled: true }, { value: 9, label: 'Salat' }]
const build = props => mount(MenuSelect, { propsData: { options, ...props }, attrs: { 'aria-label': 'Produkt' }, attachTo: document.body })

test('preserves numeric IDs and null, emits once, and closes after selection', async () => {
  const wrapper = build()
  await wrapper.find('button').trigger('click')
  await wrapper.findAll('[role=option]').at(1).trigger('click')
  expect(wrapper.emitted('input')).toEqual([[7]])
  expect(wrapper.emitted('change')).toEqual([[7]])
  expect(wrapper.find('[role=listbox]').exists()).toBe(false)
  await wrapper.setProps({ value: 7 })
  await wrapper.find('button').trigger('click')
  await wrapper.findAll('[role=option]').at(0).trigger('click')
  expect(wrapper.emitted('input')[1]).toEqual([null])
  wrapper.destroy()
})

test('keyboard navigation skips disabled options and Escape cancels without changing a value', async () => {
  const wrapper = build({ value: 7 })
  const button = wrapper.find('button')
  await button.trigger('keydown', { key: 'ArrowDown' })
  await button.trigger('keydown', { key: 'ArrowDown' })
  await button.trigger('keydown', { key: 'Enter' })
  expect(wrapper.emitted('input')).toEqual([[9]])
  await button.trigger('click')
  await button.trigger('keydown', { key: 'Home' })
  await button.trigger('keydown', { key: 'Escape' })
  expect(wrapper.emitted('input')).toHaveLength(1)
  expect(button.attributes('aria-expanded')).toBe('false')
  wrapper.destroy()
})

test('typeahead, outside click and Tab work without committing highlighted options', async () => {
  const wrapper = build()
  const button = wrapper.find('button')
  await button.trigger('keydown', { key: 's' })
  expect(wrapper.find('[role=option].active').text()).toBe('Salat')
  await button.trigger('keydown', { key: 'Tab' })
  expect(wrapper.find('[role=listbox]').exists()).toBe(false)
  await button.trigger('click')
  document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  await wrapper.vm.$nextTick()
  expect(button.attributes('aria-expanded')).toBe('false')
  expect(wrapper.emitted('input')).toBeUndefined()
  wrapper.destroy()
})

test('disabled controls do not open or emit', async () => {
  const wrapper = build({ disabled: true })
  await wrapper.find('button').trigger('click')
  expect(wrapper.find('[role=listbox]').exists()).toBe(false)
  expect(wrapper.emitted('input')).toBeUndefined()
  wrapper.destroy()
})

import { mount } from '@vue/test-utils'
import MenuProductSearch from '~/components/admin/MenuProductSearch.vue'
const options = [{ value: 11, label: 'Vegetar nr. 11 MEDIUM' }, { value: 12, label: 'Vegetar nr. 11 STOR' }]
const build = () => mount(MenuProductSearch, { propsData: { options, value: 12, createLabel: 'Opprett nytt produkt' }, attachTo: document.body })

test('searching then Enter links the matching existing product, not Create', async () => {
  const wrapper = build()
  const input = wrapper.find('input')
  await input.trigger('focus')
  await input.setValue('11 medium')
  await input.trigger('keydown', { key: 'Enter' })
  expect(wrapper.emitted('input')).toEqual([[11]])
  wrapper.destroy()
})

test('Create is an explicit choice and emits null', async () => {
  const wrapper = build()
  await wrapper.find('input').trigger('focus')
  await wrapper.findAll('[role=option]').at(0).trigger('click')
  expect(wrapper.emitted('input')).toEqual([[null]])
  wrapper.destroy()
})

test('editing text then Escape restores the existing choice without changing it', async () => {
  const wrapper = build()
  const input = wrapper.find('input')
  await input.trigger('focus')
  await input.setValue('unknown product')
  await input.trigger('keydown', { key: 'Escape' })
  expect(input.element.value).toBe('Vegetar nr. 11 STOR')
  expect(wrapper.emitted('input')).toBeUndefined()
  wrapper.destroy()
})

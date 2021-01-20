import { mount } from '@vue/test-utils'
import Login from '@/components/Login.vue'

describe('Login', () => {
  test('is a Vue instance', () => {
    const wrapper = mount(Login)
    expect(wrapper.vm).toBeTruthy()
  })
})

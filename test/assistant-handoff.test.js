import { shallowMount } from '@vue/test-utils'
import AIQueryBox from '~/components/admin/statistics/AIQueryBox.vue'

// The box on the statistics board no longer answers — it hands over to `/admin/assistant`.
//
// It used to call `_aiService.AskQuestion(query, storeIds, 'no')` and render `result.answer`, and
// that was broken in a way nothing caught: the API preserves C# PascalCase (Newtonsoft, no contract
// resolver), so the successful body carries `Answer` and `result.answer` was ALWAYS `undefined`.
// The component therefore took its `else` branch on every successful turn and displayed
// "Kunne ikke få svar fra AI" for answers it had actually received. The hard-coded `'no'` was the
// second defect: an English or German operator was answered in Norwegian whatever the sidebar said.
//
// Both die with the call. These tests pin the replacement so neither can come back.
describe('AIQueryBox hands the question over', () => {
  function mountBox (selectedStoreIds) {
    const pushed = []
    const wrapper = shallowMount(AIQueryBox, {
      propsData: { selectedStoreIds: selectedStoreIds || [] },
      mocks: {
        $i: key => key,
        $router: { push: (to) => { pushed.push(to); return Promise.resolve() } }
      }
    })
    return { wrapper, pushed }
  }

  // Driven through the real button, and therefore through its `:disabled="!query.trim()"` binding —
  // the tick is what lets that binding re-render, and without it this asserts against a button the
  // component still considers disabled.
  test('submitting navigates to the assistant with the question in the URL', async () => {
    const { wrapper, pushed } = mountBox()

    wrapper.setData({ query: 'hvor mye solgte vi i går?' })
    await wrapper.vm.$nextTick()
    wrapper.find('[data-test="ai-query-send"]').trigger('click')

    expect(pushed).toEqual([{ path: '/admin/assistant', query: { q: 'hvor mye solgte vi i går?' } }])
  })

  test('the send button is disabled until there is a question to send', async () => {
    const { wrapper } = mountBox()

    expect(wrapper.find('[data-test="ai-query-send"]').attributes('disabled')).toBe('disabled')

    wrapper.setData({ query: 'q' })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="ai-query-send"]').attributes('disabled')).toBeUndefined()
  })

  // Without this the assistant would silently widen to every store the operator administers and
  // answer a different question from the one the board on screen was showing.
  test('the scope the board was narrowed to travels with it', () => {
    const { wrapper, pushed } = mountBox([3, 4])

    wrapper.setData({ query: 'q' })
    wrapper.vm.submitQuery()

    expect(pushed[0].query.stores).toBe('3,4')
  })

  test('an empty scope adds no stores parameter at all', () => {
    const { wrapper, pushed } = mountBox([])

    wrapper.setData({ query: 'q' })
    wrapper.vm.submitQuery()

    expect(pushed[0].query.stores).toBeUndefined()
  })

  test('a blank question navigates nowhere', () => {
    const { wrapper, pushed } = mountBox()

    wrapper.setData({ query: '   ' })
    wrapper.vm.submitQuery()

    expect(pushed).toEqual([])
  })

  // The component must no longer hold an opinion about the answer shape, because holding one wrong
  // is exactly what it did.
  test('it no longer calls the AI service, and renders no answer of its own', () => {
    const { wrapper } = mountBox()

    expect(wrapper.vm.$options.methods.submitQuery.constructor.name).not.toBe('AsyncFunction')
    expect(wrapper.find('.query-response').exists()).toBe(false)
    expect(wrapper.find('.query-error').exists()).toBe(false)
    expect(wrapper.vm.$data.response).toBeUndefined()
  })
})

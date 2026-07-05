import { shallowMount } from '@vue/test-utils'
import StoreLogoCard from '~/components/admin/StoreLogoCard.vue'

function mountCard (getImpl) {
  const showToast = jest.fn()
  const _storeService = { Get: jest.fn().mockImplementation(getImpl || (() => Promise.resolve({}))) }
  const wrapper = shallowMount(StoreLogoCard, {
    propsData: { storeId: 42 },
    mocks: {
      $i: (k) => k,
      $config: { okamApiBaseUrl: 'http://api.test' },
      $store: { state: { currentUser: { token: 't' } } },
      showToast,
      _storeService
    }
  })
  return { wrapper, showToast, _storeService }
}

describe('StoreLogoCard', () => {
  test('fetches the current logo on mount and shows a preview when present', async () => {
    const { wrapper, _storeService } = mountCard(() => Promise.resolve({ logoUrl: true }))
    await wrapper.vm.$nextTick(); await wrapper.vm.$nextTick()
    expect(_storeService.Get).toHaveBeenCalledWith(42)
    const img = wrapper.find('.store-logo-card__preview')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toContain('/storelogo/42')
  })

  test('rejects an invalid file with a toast and does not upload', () => {
    const { wrapper, showToast } = mountCard()
    const spy = jest.spyOn(wrapper.vm, 'cropAndUpload').mockImplementation(() => {})
    wrapper.vm.handleFile({ type: 'image/gif', size: 10 })
    expect(showToast).toHaveBeenCalledWith('logo_errorFormat', 'error')
    expect(spy).not.toHaveBeenCalled()
  })

  test('accepts a valid file and proceeds to crop/upload', () => {
    const { wrapper } = mountCard()
    const spy = jest.spyOn(wrapper.vm, 'cropAndUpload').mockImplementation(() => {})
    wrapper.vm.handleFile({ type: 'image/png', size: 1024 })
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

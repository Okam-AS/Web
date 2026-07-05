jest.mock('axios')

import { shallowMount } from '@vue/test-utils'
import axios from 'axios'
import StoreLogoCard from '~/components/admin/StoreLogoCard.vue'

function mountCard (getImpl) {
  const _storeService = { Get: jest.fn().mockImplementation(getImpl || (() => Promise.resolve({}))) }
  const wrapper = shallowMount(StoreLogoCard, {
    propsData: { storeId: 42 },
    mocks: {
      $i: (k) => k,
      $config: { okamApiBaseUrl: 'http://api.test' },
      $store: { state: { currentUser: { token: 't' } } },
      _storeService
    }
  })
  return { wrapper, _storeService }
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
    const { wrapper } = mountCard()
    const showToast = jest.spyOn(wrapper.vm, 'showToast').mockImplementation(() => {})
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

  test('upload() posts the cropped blob and reports success', async () => {
    axios.post.mockResolvedValue({})
    const { wrapper } = mountCard()
    const showToast = jest.spyOn(wrapper.vm, 'showToast').mockImplementation(() => {})

    wrapper.vm.upload(new Blob(['x'], { type: 'image/png' }))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(axios.post).toHaveBeenCalledTimes(1)
    const [url, formData, config] = axios.post.mock.calls[0]
    expect(url).toBe('http://api.test/stores/logo')
    expect(formData).toBeInstanceOf(FormData)
    expect(formData.get('NumberId')).toBe('42')
    expect(formData.get('Image')).toBeInstanceOf(Blob)
    expect(config).toEqual({ headers: { Authorization: 'Bearer t' } })

    expect(showToast).toHaveBeenCalledWith('logo_updated', 'success')
    expect(wrapper.emitted('logo-updated')).toBeTruthy()
  })

  test('upload() shows an error toast and does not emit when the request fails', async () => {
    axios.post.mockRejectedValue(new Error('boom'))
    const { wrapper } = mountCard()
    const showToast = jest.spyOn(wrapper.vm, 'showToast').mockImplementation(() => {})

    wrapper.vm.upload(new Blob(['x'], { type: 'image/png' }))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(showToast).toHaveBeenCalledWith('logo_errorUpload', 'error')
    expect(wrapper.emitted('logo-updated')).toBeFalsy()
  })

  test('showToast (real implementation) sets toast state to visible with the given message and type', () => {
    const { wrapper } = mountCard()
    jest.useFakeTimers()

    wrapper.vm.showToast('x', 'success')
    expect(wrapper.vm.toast).toEqual({ show: true, message: 'x', type: 'success' })

    jest.runAllTimers()
    jest.useRealTimers()
  })
})

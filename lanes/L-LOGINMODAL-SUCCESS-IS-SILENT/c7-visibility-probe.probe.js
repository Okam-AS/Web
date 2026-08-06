// C7 VISIBILITY PROBE — throwaway measurement, not a pin.
//
// The first probe used a store whose `dispatch('SetCurrentUser')` did NOT write `state.currentUser`.
// That is an artifact: the template hides the whole form (and with it the error box) behind
// `v-if="!user || !user.token"`, so a store that never gains a token overstates what is rendered.
// And every mount site unmounts the modal from the same `@close` the success path emits.
//
// So there are potentially THREE things standing between the assignment and a person's eyes:
//   1. the adapter collapsing the response to a boolean   (measured: it does)
//   2. `user.token` becoming truthy, hiding the form      (measured here)
//   3. the parent unmounting the modal on `close`         (measured here)
//
// This probe reports which of them actually hold, with a REACTIVE store and a REAL parent shape.

import Vue from 'vue'
import { mount } from '@vue/test-utils'
import LoginModal from '~/components/molecules/LoginModal.vue'
import { setPlatform } from '~/core/platform'
import { UserService } from '~/core/services/user-service'
import { AdminUserService } from '~/plugins/admin-core-services'

const SENTINEL = 'SENTINEL-CREDENTIAL-DO-NOT-RENDER'

const LOGIN_BODY = {
  id: 'c0ffee00-0000-0000-0000-000000000001',
  phoneNumber: '+4799999999',
  adminIn: [{ id: 7, name: 'Kafe Nord' }],
  token: SENTINEL
}

function usePlatformAnswering (body) {
  class OkHttpModule {
    constructor () {
      this.httpClient = () => Promise.resolve({ status: 200, statusCode: 200, data: body })
    }
  }
  class UnusedPersistenceModule {}
  setPlatform(OkHttpModule, UnusedPersistenceModule)
}

const initializer = { bearerToken: '', clientPlatformName: 'jest', cultureCode: 'no' }

/** A store that REALLY applies SetCurrentUser, and is reactive so the template re-evaluates. */
function reactiveStore () {
  const state = Vue.observable({ currentUser: null })
  return {
    state,
    get getters () { return { userIsLoggedIn: !!(state.currentUser && state.currentUser.token) } },
    dispatch (action, payload) {
      if (action === 'SetCurrentUser') state.currentUser = payload
      if (action === 'ClearState') state.currentUser = null
      return Promise.resolve()
    }
  }
}

/** The shape every mount site uses: `v-if="showLogin"` + a close handler that unmounts. */
const Host = {
  components: { LoginModal },
  data: () => ({ showLogin: true, sawErrorBox: false, sawText: [] }),
  template: '<div><LoginModal v-if="showLogin" @close="onClose" /></div>',
  methods: { onClose (isLoggedIn) { this.showLogin = !isLoggedIn } }
}

const tick = async (wrapper) => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
}

describe('C7 VISIBILITY — is the assigned string ever actually on screen?', () => {
  test('GUARD 2+3: standalone modal, reactive store — is the error box rendered after success?', async () => {
    usePlatformAnswering(LOGIN_BODY)
    const store = reactiveStore()
    const wrapper = mount(LoginModal, {
      stubs: { Modal: { template: '<div class="modal-stub"><slot /></div>' } },
      mocks: { $t: (k) => k, $store: store, _userService: new AdminUserService(store, initializer) }
    })
    await wrapper.vm.$nextTick()
    wrapper.vm.login('123456')

    // Sample the DOM at every tick, because a box that paints for one frame still painted.
    const samples = []
    for (let i = 0; i < 6; i++) {
      await tick(wrapper)
      samples.push(wrapper.find('.alert--error').exists() ? wrapper.find('.alert--error').text() : null)
    }

    console.log('[VIS] errorMessage state ->', JSON.stringify(wrapper.vm.errorMessage))
    console.log('[VIS] store gained a token ->', !!(store.state.currentUser && store.state.currentUser.token))
    console.log('[VIS] error box per tick ->', JSON.stringify(samples))
    console.log('[VIS] logged-in branch shown ->', wrapper.find('.login-modal__logged-in').exists())
  })

  test('GUARD 3: mounted under the REAL parent shape — does the box paint before the unmount?', async () => {
    usePlatformAnswering(LOGIN_BODY)
    const store = reactiveStore()
    const host = mount(Host, {
      stubs: { Modal: { template: '<div class="modal-stub"><slot /></div>' } },
      mocks: { $t: (k) => k, $store: store, _userService: new AdminUserService(store, initializer) }
    })
    await host.vm.$nextTick()
    const modal = host.findComponent(LoginModal)
    modal.vm.login('123456')

    const samples = []
    for (let i = 0; i < 6; i++) {
      await tick(host)
      samples.push(host.find('.alert--error').exists() ? host.find('.alert--error').text() : null)
    }

    console.log('[VIS-PARENT] modal still mounted ->', host.findComponent(LoginModal).exists())
    console.log('[VIS-PARENT] error box per tick ->', JSON.stringify(samples))
    console.log('[VIS-PARENT] host html carries "true" alert ->', host.html().includes('alert--error'))
  })

  test('COUNTERFACTUAL under the same guards: a service that resolves the user', async () => {
    // Guard 1 removed (raw core service), guards 2 and 3 still in place. If the sentinel reaches the
    // DOM here, the assignment is a credential-rendering primitive that only the adapter is hiding.
    usePlatformAnswering(LOGIN_BODY)
    const store = reactiveStore()
    const host = mount(Host, {
      stubs: { Modal: { template: '<div class="modal-stub"><slot /></div>' } },
      mocks: { $t: (k) => k, $store: store, _userService: new UserService(initializer) }
    })
    await host.vm.$nextTick()
    const modal = host.findComponent(LoginModal)
    modal.vm.login('123456')

    const sentinelSeen = []
    for (let i = 0; i < 6; i++) {
      await tick(host)
      sentinelSeen.push(host.html().includes(SENTINEL))
    }

    console.log('[CF] modal errorMessage carries sentinel ->', String(modal.vm.errorMessage).includes(SENTINEL))
    console.log('[CF] sentinel present in host DOM per tick ->', JSON.stringify(sentinelSeen))
    console.log('[CF] store gained a token ->', !!(store.state.currentUser && store.state.currentUser.token))
  })
})

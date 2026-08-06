// C7 PROBE — throwaway measurement, not a pin. Run explicitly, never by `npm test`.
//
// The question: `LoginModal.login` assigns `JSON.stringify(response)` to `errorMessage` on the
// SUCCESS path. Does that `response` carry credential material? The sign-in endpoint returns a
// token, so this is not hypothetical — but the answer depends on which layer the modal is actually
// wired to, and that has to be MEASURED rather than reasoned about.
//
// This probe answers it by driving the real chain (real RequestService, real UserService, real
// AdminUserService adapter, real stock modal) against an HTTP module that answers /user/login with a
// realistic body. The token value is a SENTINEL; this file reports only whether the sentinel
// appears, and reports key NAMES, never values.

import { mount } from '@vue/test-utils'
import LoginModal from '~/components/molecules/LoginModal.vue'
import { setPlatform } from '~/core/platform'
import { UserService } from '~/core/services/user-service'
import { AdminUserService } from '~/plugins/admin-core-services'

// A value that appears nowhere else, so "did the credential reach the DOM" is a substring test
// rather than a judgement call. It is NOT a real token.
const SENTINEL = 'SENTINEL-CREDENTIAL-DO-NOT-RENDER'

// The shape /user/login answers with: the User model (core/models/user/user.ts) plus the token the
// backend mints. Key names only are ever printed below.
const LOGIN_BODY = {
  id: 'c0ffee00-0000-0000-0000-000000000001',
  phoneNumber: '+4799999999',
  email: 'someone@example.test',
  emailConfirmed: true,
  firstName: 'Kari',
  lastName: 'Nordmann',
  isPowerUser: false,
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

function fakeStore () {
  const dispatched = []
  return {
    dispatched,
    state: { currentUser: null },
    getters: { userIsLoggedIn: false },
    dispatch: (action, payload) => { dispatched.push({ action, payload }); return Promise.resolve() }
  }
}

const settle = async (wrapper) => {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
    if (wrapper) await wrapper.vm.$nextTick()
  }
}

/** Report a value's shape without ever printing credential material. */
function describeValue (v) {
  if (v === null) return 'null'
  if (typeof v !== 'object') return `${typeof v} ${JSON.stringify(v)}`
  return `object keys=[${Object.keys(v).join(',')}]`
}

describe('C7 PROBE — what does the success path actually put in errorMessage?', () => {
  test('LAYER 1: the raw core UserService.Login resolves the FULL user, token included', async () => {
    usePlatformAnswering(LOGIN_BODY)
    const core = new UserService(initializer)
    const result = await core.Login('+4799999999', '123456')

    console.log('[PROBE] core UserService.Login ->', describeValue(result))
    console.log('[PROBE] core result carries the sentinel:', JSON.stringify(result).includes(SENTINEL))

    expect(Object.keys(result)).toContain('token')
    expect(JSON.stringify(result)).toContain(SENTINEL)
  })

  test('LAYER 2: the AdminUserService adapter the modal is wired to collapses it to a boolean', async () => {
    usePlatformAnswering(LOGIN_BODY)
    const store = fakeStore()
    const adapter = new AdminUserService(store, initializer)
    const result = await adapter.Login('+4799999999', '123456')

    console.log('[PROBE] AdminUserService.Login ->', describeValue(result))
    console.log('[PROBE] adapter result carries the sentinel:', JSON.stringify(result).includes(SENTINEL))
    console.log('[PROBE] store actions dispatched:', store.dispatched.map(d => d.action).join(','))
    console.log('[PROBE] SetCurrentUser payload keys:',
      store.dispatched.length ? Object.keys(store.dispatched[0].payload || {}).join(',') : '(none)')
  })

  test('LAYER 3: the adapter that is NOT used here (LoginAdmin) returns the user object instead', async () => {
    usePlatformAnswering(LOGIN_BODY)
    const adapter = new AdminUserService(fakeStore(), initializer)
    const result = await adapter.LoginAdmin('+4799999999', '123456')

    console.log('[PROBE] AdminUserService.LoginAdmin ->', describeValue(result))
    console.log('[PROBE] LoginAdmin result carries the sentinel:', JSON.stringify(result).includes(SENTINEL))
  })

  test('LAYER 4: the STOCK modal on the real chain — what lands in errorMessage and in the DOM', async () => {
    usePlatformAnswering(LOGIN_BODY)
    const store = fakeStore()
    const wrapper = mount(LoginModal, {
      stubs: { Modal: { template: '<div class="modal-stub"><slot /></div>' } },
      mocks: {
        $t: (key) => key,
        $store: store,
        _userService: new AdminUserService(store, initializer)
      }
    })
    await wrapper.vm.$nextTick()
    wrapper.vm.login('123456')
    await settle(wrapper)

    const message = wrapper.vm.errorMessage
    console.log('[PROBE] errorMessage after a SUCCESSFUL sign-in ->', JSON.stringify(message))
    console.log('[PROBE] errorMessage carries the sentinel:', String(message).includes(SENTINEL))
    console.log('[PROBE] an error box is rendered:', wrapper.find('.alert--error').exists())
    console.log('[PROBE] rendered error text ->',
      wrapper.find('.alert--error').exists() ? JSON.stringify(wrapper.find('.alert--error').text()) : '(none)')
    console.log('[PROBE] whole rendered DOM carries the sentinel:', wrapper.html().includes(SENTINEL))
  })

  test('LAYER 5: the COUNTERFACTUAL — the same line against a service that returns the user', async () => {
    // One line in plugins/admin-core-services.js is the entire reason layer 4 is not a credential
    // leak. This measures what `JSON.stringify(response)` renders if a caller is ever pointed at a
    // service whose Login resolves the user — which the sibling method LoginAdmin already does.
    usePlatformAnswering(LOGIN_BODY)
    const store = fakeStore()
    const wrapper = mount(LoginModal, {
      stubs: { Modal: { template: '<div class="modal-stub"><slot /></div>' } },
      mocks: {
        $t: (key) => key,
        $store: store,
        _userService: new UserService(initializer) // the raw core service — resolves the User
      }
    })
    await wrapper.vm.$nextTick()
    wrapper.vm.login('123456')
    await settle(wrapper)

    console.log('[PROBE-CF] errorMessage carries the sentinel:', String(wrapper.vm.errorMessage).includes(SENTINEL))
    console.log('[PROBE-CF] whole rendered DOM carries the sentinel:', wrapper.html().includes(SENTINEL))
    console.log('[PROBE-CF] errorMessage key names:',
      (String(wrapper.vm.errorMessage).match(/"([a-zA-Z]+)":/g) || []).join(' '))
  })
})

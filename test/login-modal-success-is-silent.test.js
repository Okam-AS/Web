import Vue from 'vue'
import { mount } from '@vue/test-utils'
import LoginModal from '~/components/molecules/LoginModal.vue'
import { setPlatform } from '~/core/platform'
import { UserService } from '~/core/services/user-service'
import { AdminUserService } from '~/plugins/admin-core-services'

// ---- WHY THIS FILE EXISTS ---------------------------------------------------------------------
//
// `LoginModal.login` reported a SUCCESSFUL sign-in through the slot the modal uses to say what went
// wrong:
//
//     if (Boolean(response)) {
//       this.codeSent = true;
//       this.errorMessage = JSON.stringify(response);   // <- on the success path
//       this.$emit("close", true);
//     }
//
// ---- WHAT WAS ACTUALLY IN THAT RESPONSE (the C7 question, measured) ----------------------------
//
// It was NOT a credential, and the reason is not in this file. This modal's `_userService` is
// `AdminUserService` (plugins/global-mixin.js), whose `Login` override maps the resolved `User` to a
// boolean before the modal ever sees it — so the string assigned was «true». Two tests below hold
// that finding in place, because it is the difference between a cosmetic defect and a credential
// rendered into the DOM, and nothing in the modal decides which one it is:
//
//   * PREMISE 1 drives the real chain and shows the adapter really does collapse it to a boolean.
//   * PREMISE 2 drives the raw core `UserService.Login` the adapter wraps, and shows THAT one
//     resolves the whole user with `token` on it. The sibling method `LoginAdmin`, in the same
//     adapter file, likewise returns the user object rather than a boolean.
//
// So the modal was one call-site edit away from serializing a token into an alert box. That token is
// worth naming precisely: `/User/login` mints it with `Expires = DateTime.Now.AddDays(36500)` and
// the estate has no revocation path for it, so an exposure would not be one anybody could undo.
// GUARD (test C7) therefore pins the property that actually protects this — the modal puts NOTHING
// from the response into `errorMessage`, whatever `Login` resolves — rather than pinning today's
// lucky boolean.
//
// ---- WHY THE FIX IS A RESET AND NOT A DELETION ------------------------------------------------
//
// `login` had no `errorMessage` reset of its own, unlike `getCode` directly above it. The defective
// assignment was therefore the only thing clearing a previous «Feil kode», and deleting it alone
// would let a stale failure ride onto a sign-in that WORKED — the same lie pointing the other way,
// which is exactly the defect a sibling lane's ninth mutant found in `getCode`. Test B pins that
// direction, and it is the test that reds if the reset is dropped.
//
// ---- PROVED BY MUTATION, NOT BY PASSING -------------------------------------------------------
//
// lanes/L-LOGINMODAL-SUCCESS-IS-SILENT/kill-proof.txt — 10 mutants, 0 survivors. Restoring the
// original `this.errorMessage = JSON.stringify(response)` reds A, C7 and F by name.

const SENTINEL = 'SENTINEL-CREDENTIAL-DO-NOT-RENDER'

/** The shape `/user/login` answers with: the User model plus the token the backend mints. */
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

/** A store that really applies SetCurrentUser, so `user.token` behaves as it does in the app. */
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

function mountModal (userService, store) {
  return mount(LoginModal, {
    stubs: {
      // `atoms/Modal` drives the body scroll lock through vue-meta, which is not installed on this
      // local Vue. Only its default slot matters here.
      Modal: { template: '<div class="modal-stub"><slot /></div>' }
    },
    mocks: {
      $t: (key) => key,
      $store: store || reactiveStore(),
      _userService: userService
    }
  })
}

/** `login` settles across several microtasks (`.then` -> `.finally` -> re-render). */
async function settle (wrapper) {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()
  }
}

/**
 * Sign in with `code`.
 *
 * Deliberately calls the method rather than typing into `OtpInput`. Typing emits `update` BEFORE
 * `complete`, and `update` is bound to `clearError` — so a UI-driven retry would clear the previous
 * error through a SIBLING COMPONENT's event and test B could never see whether `login` resets
 * anything itself. Test G below drives the real widget, so the wiring is covered too.
 */
async function signInWith (wrapper, code) {
  await wrapper.vm.$nextTick()
  wrapper.vm.login(code)
  await settle(wrapper)
}

const errorBox = (wrapper) => (wrapper.find('.alert--error').exists() ? wrapper.find('.alert--error').text() : null)

describe('the premise: what the sign-in response really carries at this call site', () => {
  test('PREMISE 1: the service the modal is wired to resolves a BOOLEAN, not the user', async () => {
    usePlatformAnswering(LOGIN_BODY)
    const store = reactiveStore()
    const result = await new AdminUserService(store, initializer).Login('+4799999999', '123456')

    // This, and nothing in LoginModal.vue, is why the old assignment rendered «true» rather than a
    // credential. It is an override in plugins/admin-core-services.js — a different file, a
    // different owner, one line long.
    expect(result).toBe(true)
    expect(JSON.stringify(result)).not.toContain(SENTINEL)

    // The token does still arrive — it goes to the store, which is where it belongs.
    expect(store.state.currentUser.token).toBe(SENTINEL)
  })

  test('PREMISE 2: the raw core UserService.Login it wraps resolves the whole user, token included', async () => {
    usePlatformAnswering(LOGIN_BODY)
    const result = await new UserService(initializer).Login('+4799999999', '123456')

    // Key NAMES only. This is the payload the old line would have serialized into an alert box had
    // the call site ever been pointed one layer down — or at `LoginAdmin`, which returns this shape.
    expect(Object.keys(result)).toEqual(expect.arrayContaining(['id', 'phoneNumber', 'adminIn', 'token']))
    expect(typeof result.token).toBe('string')
  })
})

describe('LoginModal.login — a sign-in that worked says nothing in the error slot', () => {
  test('A: the success path leaves errorMessage empty', async () => {
    const wrapper = mountModal({ Login: jest.fn().mockResolvedValue(true) })

    await signInWith(wrapper, '123456')

    // Reds on the stock modal: errorMessage is «true», the serialized response.
    expect(wrapper.vm.errorMessage).toBe('')
  })

  test('B: a previous failure does not survive a sign-in that worked', async () => {
    // The direction the naive deletion breaks. `login` carried no reset of its own, so the defective
    // assignment was the only thing overwriting «Feil kode» on the way through.
    const Login = jest.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
    const wrapper = mountModal({ Login })

    await signInWith(wrapper, '000000')
    expect(wrapper.vm.errorMessage).toBe('Feil kode')

    await signInWith(wrapper, '123456')

    expect(wrapper.vm.errorMessage).toBe('')
  })

  test('C7: NOTHING from the response reaches errorMessage or the DOM, whatever Login resolves', async () => {
    // The guard that survives a change of call site. `Login` here resolves a token-bearing user —
    // the shape the raw core service really returns (PREMISE 2) — and the modal must still put none
    // of it on screen. Reds on the stock modal: errorMessage becomes the serialized user.
    const wrapper = mountModal({ Login: jest.fn().mockResolvedValue({ ...LOGIN_BODY }) })

    await signInWith(wrapper, '123456')

    expect(wrapper.vm.errorMessage).toBe('')
    expect(wrapper.vm.errorMessage).not.toContain(SENTINEL)
    expect(wrapper.html()).not.toContain(SENTINEL)
  })

  test('D: a wrong code still says so, so the failure branch is untouched', async () => {
    const wrapper = mountModal({ Login: jest.fn().mockResolvedValue(false) })

    await signInWith(wrapper, '000000')

    expect(wrapper.vm.errorMessage).toBe('Feil kode')
    expect(wrapper.vm.codeSent).toBe(false)
    expect(wrapper.vm.code).toBe('')
  })

  test('E: a genuine rejection still says so, so the catch arm is not merely decorative', async () => {
    const wrapper = mountModal({ Login: jest.fn().mockRejectedValue(new Error('boom')) })

    await signInWith(wrapper, '000000')

    expect(wrapper.vm.errorMessage).toBe('Feil kode')
    expect(wrapper.vm.codeSent).toBe(false)
  })

  test('F: no error box is rendered after a sign-in that worked', async () => {
    const wrapper = mountModal({ Login: jest.fn().mockResolvedValue(true) })

    await signInWith(wrapper, '123456')

    expect(errorBox(wrapper)).toBeNull()
  })

  test('G: the success path still closes the modal and reports it signed in', async () => {
    // The two behaviours that must NOT change. Without this, deleting the whole success branch
    // would satisfy every test above.
    const wrapper = mountModal({ Login: jest.fn().mockResolvedValue(true) })

    await signInWith(wrapper, '123456')

    expect(wrapper.vm.codeSent).toBe(true)
    expect(wrapper.emitted().close).toBeTruthy()
    expect(wrapper.emitted().close[0]).toEqual([true])
    expect(wrapper.vm.isLoading).toBe(false)
  })

  test('H: the phone number and code are still sent as the service expects', async () => {
    const Login = jest.fn().mockResolvedValue(true)
    const wrapper = mountModal({ Login })
    await wrapper.vm.$nextTick()
    wrapper.vm.phone = '99 99 99 99'
    await signInWith(wrapper, '123456')

    expect(Login).toHaveBeenCalledWith('+4799999999', '123456')
  })
})

describe('LoginModal.login — driven through the real OtpInput, not just the method', () => {
  test('I: typing the six digits signs in and leaves no error on screen', async () => {
    // The wiring test. `OtpInput` emits `update` then `complete`; `complete` is what calls `login`.
    const wrapper = mountModal({ Login: jest.fn().mockResolvedValue({ ...LOGIN_BODY }) })
    await wrapper.vm.$nextTick()
    await wrapper.setData({ smsSent: true })

    const boxes = wrapper.findAll('.otp-input input')
    expect(boxes.length).toBe(6)
    for (let i = 0; i < 6; i++) {
      boxes.at(i).element.value = String(i + 1)
      await boxes.at(i).trigger('input')
    }
    await settle(wrapper)

    expect(wrapper.vm.errorMessage).toBe('')
    expect(errorBox(wrapper)).toBeNull()
    expect(wrapper.html()).not.toContain(SENTINEL)
    expect(wrapper.emitted().close).toBeTruthy()
  })
})

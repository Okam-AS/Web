import { mount } from '@vue/test-utils'
import LoginModal, { SEND_FAILED } from '~/components/molecules/LoginModal.vue'
import { setPlatform } from '~/core/platform'
import { RequestService } from '~/core/services/request-service'
import { UserService } from '~/core/services/user-service'

// ---- WHY THIS FILE EXISTS ---------------------------------------------------------------------
//
// `LoginModal.getCode` advanced to the six-box code step from inside a `.then()` that never read the
// value it was handed:
//
//     .then(() => { this.smsSent = true })
//     .catch(() => { this.errorMessage = "Feil telefonnummer" })
//
// That reads as "advance on success, complain on failure" and is neither, because the layer
// underneath does not reject on failure. `RequestService.PostRequest` RESOLVES a rejected request
// to the axios error object — deliberately, and documented in that file: the `Safe*Request`
// variants exist to make the other verbs behave the same way, and 205 call sites read the result
// through `TryParseResponse` / `TryParseResponseWithError`. So `SendVerificationToken` returns
// `false` and its promise FULFILS, the `.then()` runs, and the `.catch()` cannot be reached by
// anything the server does. With nothing listening at all the modal opened six boxes for a code
// nobody had sent.
//
// ---- WHY THE CHAIN IS REAL HERE ---------------------------------------------------------------
//
// The obvious unit test — stub `_userService.SendVerificationToken` to return `false` and assert
// the modal behaves — pins the modal against an ASSUMPTION about the request layer, and a wrong
// assumption about the request layer is precisely the bug. So the first test below fakes nothing
// above the socket: the real `RequestService`, the real `UserService` and the real modal all run,
// and only the platform HTTP module is replaced by one that rejects the way axios rejects. If
// `PostRequest` were ever changed to reject instead of resolve, that test would notice, because the
// modal is wired to the real thing.
//
// The narrower tests that follow use a stub deliberately, to pin the two branches independently of
// what any layer happens to do today.
//
// ---- PROVED BY MUTATION, NOT BY PASSING -------------------------------------------------------
//
// See lanes/L-LOGIN-MODAL-REPORTS-A-FAILED-SEND/mutation-receipt.txt. Restoring the original
// `.then(() => { this.smsSent = true })` reds tests A, B and D by name.

/** An axios-shaped rejection for a request that never reached a server (nothing listening). */
function connectionRefused () {
  const error = new Error('Network Error')
  error.code = 'ECONNREFUSED'
  return Promise.reject(error)
}

/** An axios-shaped rejection for a request the server REFUSED — the real response is under `.response`. */
function serverSaidNo (status, body) {
  const error = new Error('Request failed with status code ' + status)
  error.response = { status, data: body }
  return Promise.reject(error)
}

/** Registers a platform whose httpClient always fails, the way the real one does. */
function usePlatformThatFails (reject) {
  class FailingHttpModule {
    constructor () { this.httpClient = () => reject() }
  }
  class UnusedPersistenceModule {}
  setPlatform(FailingHttpModule, UnusedPersistenceModule)
}

function mountModal (userService) {
  return mount(LoginModal, {
    stubs: {
      // `atoms/Modal` drives the body scroll lock through vue-meta, which is not installed on this
      // local Vue. Only its default slot matters here, and stubbing it keeps this test about the
      // modal's own logic rather than about the wrapper's.
      Modal: { template: '<div class="modal-stub"><slot /></div>' }
    },
    mocks: {
      $t: (key) => key,
      $store: { state: { currentUser: null }, getters: { userIsLoggedIn: false } },
      _userService: userService
    }
  })
}

/** `getCode` settles across several microtasks (`.then` -> `.finally` -> re-render). */
async function settle (wrapper) {
  for (let i = 0; i < 4; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()
  }
}

async function askForACode (wrapper) {
  // `data.isLoading` starts TRUE and `mounted()` clears it, so the whole form is behind a `v-if`
  // that has not re-rendered yet at the moment `mount()` returns. Without this tick the phone field
  // does not exist and every test here fails on the harness rather than on the product.
  await wrapper.vm.$nextTick()
  await wrapper.find('.input-wrapper input[type="tel"]').setValue('99999999')
  await wrapper.find('button.btn--primary').trigger('click')
  await settle(wrapper)
}

const codeBoxes = (wrapper) => wrapper.findAll('.otp-input input').length
const phoneStepShown = (wrapper) => wrapper.find('.input-wrapper input[type="tel"]').exists()

describe('the request layer really does fulfil a failed request — the premise the modal got wrong', () => {
  test('PREMISE: PostRequest RESOLVES a refused request instead of rejecting it', async () => {
    usePlatformThatFails(connectionRefused)
    const requestService = new RequestService({ bearerToken: '', clientPlatformName: 'jest', cultureCode: 'no' })

    const arms = []
    await requestService.PostRequest('/user/sendverificationtoken', { phoneNumber: '+4799999999' })
      .then(() => arms.push('then'))
      .catch(() => arms.push('catch'))

    // This is the whole reason a `.catch()` arm in the modal was dead code.
    expect(arms).toEqual(['then'])
  })

  test.each([
    ['nothing listening', connectionRefused],
    ['the server refused it (500)', () => serverSaidNo(500, { message: 'boom' })],
    ['the server rejected the number (400)', () => serverSaidNo(400, { message: 'bad number' })]
  ])('PREMISE: SendVerificationToken returns false and does NOT throw when %s', async (_label, reject) => {
    usePlatformThatFails(reject)
    const userService = new UserService({ bearerToken: '', clientPlatformName: 'jest', cultureCode: 'no' })

    const arms = []
    const result = await userService.SendVerificationToken('+4799999999')
      .then((value) => { arms.push('then'); return value })
      .catch(() => { arms.push('catch') })

    expect(arms).toEqual(['then'])
    expect(result).toBe(false)
  })
})

describe('LoginModal.getCode — the code step is only reached when a code was sent', () => {
  test('A: THE WHOLE REAL CHAIN — nothing listening leaves the modal on the phone step, saying so', async () => {
    // Real RequestService, real UserService, real modal. Only the socket is faked.
    usePlatformThatFails(connectionRefused)
    const userService = new UserService({ bearerToken: '', clientPlatformName: 'jest', cultureCode: 'no' })
    const wrapper = mountModal(userService)

    await askForACode(wrapper)

    // The measurement: boxes for a code that was never sent. Six here is the defect.
    expect(codeBoxes(wrapper)).toBe(0)
    expect(wrapper.vm.smsSent).toBe(false)
    expect(phoneStepShown(wrapper)).toBe(true)
    expect(wrapper.find('.alert--error').text()).toContain('kunne ikke sende koden')
  })

  test('B: a resolved false — the shape a failed send really has — does not advance', async () => {
    const wrapper = mountModal({ SendVerificationToken: jest.fn().mockResolvedValue(false) })

    await askForACode(wrapper)

    expect(codeBoxes(wrapper)).toBe(0)
    expect(wrapper.vm.smsSent).toBe(false)
    expect(wrapper.vm.errorMessage).toBe(SEND_FAILED)
  })

  test('C: a genuine rejection is still handled, so the catch arm is not merely decorative', async () => {
    const wrapper = mountModal({ SendVerificationToken: jest.fn().mockRejectedValue(new Error('boom')) })

    await askForACode(wrapper)

    expect(codeBoxes(wrapper)).toBe(0)
    expect(wrapper.vm.smsSent).toBe(false)
    expect(wrapper.vm.errorMessage).toBe(SEND_FAILED)
  })

  test('D: a code that WAS sent still opens the six boxes — the success path is untouched', async () => {
    const wrapper = mountModal({ SendVerificationToken: jest.fn().mockResolvedValue(true) })

    await askForACode(wrapper)

    expect(wrapper.vm.smsSent).toBe(true)
    expect(codeBoxes(wrapper)).toBe(6)
    expect(wrapper.vm.errorMessage).toBe('')
  })

  test('E: the loading flag is cleared on failure, so the modal is usable again', async () => {
    const wrapper = mountModal({ SendVerificationToken: jest.fn().mockResolvedValue(false) })

    await askForACode(wrapper)

    expect(wrapper.vm.isLoading).toBe(false)
  })

  test('G: a retry that works clears the earlier failure instead of carrying it onto the code step', async () => {
    // Found by mutation, not by design: deleting `this.errorMessage = ""` from the top of `getCode`
    // survived the first eight mutants, because nothing here had ever asked for a SECOND attempt.
    // Without that line the modal reaches the six boxes still showing «we could not send the code»,
    // which is the same class of lie as the original defect pointing the other way.
    const SendVerificationToken = jest.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
    const wrapper = mountModal({ SendVerificationToken })

    await askForACode(wrapper)
    expect(wrapper.vm.errorMessage).toBe(SEND_FAILED)
    expect(codeBoxes(wrapper)).toBe(0)

    await askForACode(wrapper)

    expect(wrapper.vm.smsSent).toBe(true)
    expect(codeBoxes(wrapper)).toBe(6)
    expect(wrapper.vm.errorMessage).toBe('')
  })

  test('F: the message does not claim a wrong number, because a false cannot know that', () => {
    // `SendVerificationToken` collapses "wrong number", "server said no" and "nothing answered"
    // into one `false`. The old string asserted the first of the three.
    expect(SEND_FAILED).not.toContain('Feil telefonnummer')
    expect(SEND_FAILED).toContain('kunne ikke sende koden')
  })
})

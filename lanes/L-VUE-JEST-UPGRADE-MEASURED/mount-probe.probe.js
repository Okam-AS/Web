// Mount probe for the four templates the brief names as unmountable.
//
// Two questions per file, kept apart on purpose:
//   "transforms" — can vue-jest turn the SFC into a module at all? This is the transpiler question.
//                  A failure here is the buble parse error, and nothing else can run.
//   "mounts"     — can a test actually put the component on screen? A file can transform and still
//                  fail to mount for ordinary reasons (a store, an injection, an async hook), and
//                  those two failures must not be reported as the same finding.
//
// The mount assertion asserts a COMPILED RENDER FUNCTION and non-empty output, not `wrapper.exists()`.
// A failed vue-jest transform leaves an empty module object behind in the registry; Vue mounts `{}`
// without complaint beyond a console warning, so `exists()` returns true and the probe would report
// four green mounts for four templates that produced no DOM at all. That false pass was observed on
// the first draft of this file and is the reason for the stronger assertion.
//
// `jest.resetModules()` runs before each test because the registry caches the failed require: without
// it the second require of a broken SFC returns the empty module instead of throwing again.
//
// This file is NOT part of the measured full-suite totals: both full runs were taken before it
// existed, and it is invoked on its own path.
import { shallowMount } from '@vue/test-utils'

const targets = [
  ['components/molecules/ReceiptModal.vue', () => require('~/components/molecules/ReceiptModal.vue')],
  ['pages/admin/products.vue', () => require('~/pages/admin/products.vue')],
  ['pages/admin/wolt-menu.vue', () => require('~/pages/admin/wolt-menu.vue')],
  ['components/onboarding/OnboardingProductImages.vue', () => require('~/components/onboarding/OnboardingProductImages.vue')]
]

const mocks = {
  $i: key => key,
  $t: key => key,
  $route: { params: {}, query: {}, path: '/' },
  $router: { push: () => {}, replace: () => {} },
  $store: { state: {}, getters: {}, commit: () => {}, dispatch: () => Promise.resolve() },
  $axios: { $get: () => Promise.resolve({}), $post: () => Promise.resolve({}) },
  $nuxt: { $emit: () => {}, $on: () => {} }
}

describe.each(targets)('%s', (name, load) => {
  beforeEach(() => jest.resetModules())

  test('transforms', () => {
    let error = null
    try {
      load()
    } catch (e) {
      error = e
    }
    if (error) {
      // Surface the message: it is the whole finding when this fails.
      throw new Error(`TRANSFORM FAILED for ${name}: ${error.message.split('\n').slice(0, 2).join(' | ')}`)
    }
    expect(error).toBeNull()
  })

  test('mounts', () => {
    const mod = load()
    const component = mod.default || mod
    // The compiled template. Absent means the transform produced nothing mountable.
    expect(typeof component.render).toBe('function')
    const wrapper = shallowMount(component, { mocks, stubs: { NuxtLink: true } })
    expect(wrapper.html()).toBeTruthy()
    wrapper.destroy()
  })
})

// Controls. Without these, "all eight fail" is not evidence about optional chaining — it is equally
// consistent with a probe that fails for everything. Each control isolates one variable.
const controls = [
  ['CONTROL old idiom in template (expected: mounts)', () => require('./fixtures/OldIdiomInTemplate.vue'), true],
  ['CONTROL optional chaining in SCRIPT only (expected: mounts)', () => require('./fixtures/OptionalInScriptOnly.vue'), true],
  ['CONTROL optional chaining in TEMPLATE (expected: fails)', () => require('./fixtures/OptionalInTemplate.vue'), false]
]

describe.each(controls)('%s', (name, load, shouldLoad) => {
  beforeEach(() => jest.resetModules())

  test('transform outcome matches the control expectation', () => {
    let error = null
    try {
      load()
    } catch (e) {
      error = e
    }
    if (shouldLoad) {
      expect(error && error.message).toBeFalsy()
      const mod = load()
      const component = mod.default || mod
      expect(typeof component.render).toBe('function')
      expect(shallowMount(component, { mocks }).html()).toContain('probe')
    } else {
      expect(error).not.toBeNull()
      expect(error.message).toMatch(/Unexpected token/)
    }
  })
})

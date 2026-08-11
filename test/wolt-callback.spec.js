import { mount } from '@vue/test-utils'
import WoltCallback from '~/pages/wolt-callback.vue'

// This page receives Wolt's OAuth authorization code. The property under test is a
// security property, not a rendering one: the code must leave the browser only towards
// the configured Okam API. A hardcoded third-party host once shipped here, so the
// destination is asserted exactly rather than merely "is a URL".
describe('pages/wolt-callback', () => {
  const originalLocation = window.location
  const originalApiBaseUrl = process.env.API_BASE_URL

  beforeAll(() => {
    // jsdom refuses real navigation, so window.location is replaced with a plain
    // object whose href records what the page tried to navigate to.
    delete window.location
    window.location = { href: '' }
  })

  afterAll(() => {
    window.location = originalLocation
    process.env.API_BASE_URL = originalApiBaseUrl
  })

  beforeEach(() => {
    window.location.href = ''
    process.env.API_BASE_URL = 'https://api.example.test'
  })

  const mountWithQuery = (query) => mount(WoltCallback, { mocks: { $route: { query } } })

  test('forwards the callback to the API SSIO endpoint, preserving the query', () => {
    mountWithQuery({ code: 'authorization-code-123', state: 'opaque-state', scope: 'venue' })

    expect(window.location.href).toBe(
      'https://api.example.test/wolt/marketplace/auth/ssio/callback' +
        '?code=authorization-code-123&state=opaque-state&scope=venue'
    )
  })

  test('sends the authorization code only to the configured API base', () => {
    mountWithQuery({ code: 'authorization-code-123' })

    expect(window.location.href.startsWith('https://api.example.test/')).toBe(true)
    expect(window.location.href).not.toMatch(/ngrok/)
  })

  test('redirects without a query string when Wolt sends no parameters', () => {
    mountWithQuery({})

    expect(window.location.href).toBe('https://api.example.test/wolt/marketplace/auth/ssio/callback')
  })

  test('stays on the current origin when no API base is configured', () => {
    // Failing closed is the point: an unset base must not fall back to some other host.
    process.env.API_BASE_URL = ''
    mountWithQuery({ code: 'authorization-code-123' })

    expect(window.location.href).toBe(
      '/wolt/marketplace/auth/ssio/callback?code=authorization-code-123'
    )
  })
})

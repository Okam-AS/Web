import fs from 'fs'
import path from 'path'
import { shallowMount } from '@vue/test-utils'
import AdminPage from '~/components/organisms/AdminPage.vue'

// THE FRONT DOOR TOLD TWO LIES, AND THEY WERE ONE BUG.
//
// Both were found by walking the product against a live backend, not by a suite — the suites were
// green through all of it — so what is pinned here is what the browser showed, and the browser
// evidence is named beside each rule rather than described.
//
//   `lanes/L-THE-SIGN-IN-FRONT-DOOR-IS-HONEST/probe-early-training.json`   (defect two)
//   `lanes/L-THE-SIGN-IN-FRONT-DOOR-IS-HONEST/trace-url-live.json`         (defect one)
//
// DEFECT TWO — the send that succeeded and was thrown away. `AdminPage.initAuth` raised the sign-in
// modal and THEN bounced to /admin. Pressing «Send kode» in that window really sent an SMS (POST
// /user/sendverificationtoken, six OTP boxes rendered at 453ms) and the navigation destroyed the
// modal at 485ms. A fresh modal mounted at the phone step with zero boxes. From inside `LoginModal`
// the send worked, so no amount of reporting there could have named it; only the shell knows the
// page is leaving. The fix removes the state instead of describing it: no door on a route the shell
// is about to leave.
//
// DEFECT ONE — the redirect the app wrote and then dropped. The shell's ?redirect= is correct and
// survives sign-in; four PAGES destroyed it. `AdminPage` is a page component's CHILD, so its
// `mounted` runs first and starts navigating; the page's own `mounted` then answered "you are not a
// Key Account Manager" to a visitor it had never met and `push('/admin')` superseded the in-flight
// navigation. Measured: one pushState, /admin/overview -> /admin, no redirect query after it.
//
// The two rules are tested together because they are one journey and one cause: a navigation this
// shell starts must not have a live control, or a lost destination, riding on it.

describe('AdminPage — the sign-in door only appears on a route the shell keeps', () => {
  function mountShell (route, replaceResult) {
    const replace = jest.fn().mockReturnValue(replaceResult)
    const wrapper = shallowMount(AdminPage, {
      mocks: {
        $store: {
          getters: { userIsLoggedIn: false },
          state: { currentUser: null }
        },
        $route: route,
        $router: { replace },
        _userService: { Reload: jest.fn().mockResolvedValue(undefined) }
      },
      stubs: { 'client-only': true }
    })
    return { wrapper, replace }
  }

  const route = (path, query) => ({
    path,
    query: query || {},
    fullPath: path + (query && query.redirect
      ? '?redirect=' + encodeURIComponent(String(query.redirect))
      : '')
  })

  const settled = () => new Promise(resolve => setTimeout(resolve, 0))

  test('THE DEFECT: a guarded deep link bounces, and puts up NO door on the page it is leaving', async () => {
    const { wrapper, replace } = mountShell(route('/admin/training-courses'))
    await settled()
    expect(replace).toHaveBeenCalledWith('/admin?redirect=%2Fadmin%2Ftraining-courses')
    // The whole of defect two. A modal here owns a phone field and a button that really sends.
    expect(wrapper.vm.showLogin).toBe(false)
  })

  test('the sign-in page itself keeps its door, and navigates nowhere', async () => {
    const { wrapper, replace } = mountShell(route('/admin'))
    await settled()
    expect(replace).not.toHaveBeenCalled()
    expect(wrapper.vm.showLogin).toBe(true)
  })

  // The URL the sign-in flow leaves in the address bar. It renders for a signed-out visitor on
  // purpose — it is bookmarkable and reloadable — so it is a route the shell KEEPS, and the door
  // belongs on it. This is the in-page sign-in path, and it must not be collateral damage.
  test.each([
    ['/admin/ongoing'],
    ['/admin/orders'],
    ['/admin/kitchen']
  ])('%s carrying a redirect query keeps its door and does not bounce', async (path) => {
    const { wrapper, replace } = mountShell(route(path, { redirect: path }))
    await settled()
    expect(replace).not.toHaveBeenCalled()
    expect(wrapper.vm.showLogin).toBe(true)
    wrapper.destroy()
  })

  // Withholding the door is only honest while the leaving is actually going to happen. A refused
  // navigation leaves the visitor on a guarded page, and a guarded page with no way in is worse
  // than the defect this lane closed.
  test('a navigation that is REFUSED puts the door back rather than leaving no way in', async () => {
    const { wrapper, replace } = mountShell(route('/admin/training-courses'), Promise.reject(new Error('aborted')))
    await settled()
    await settled()
    expect(replace).toHaveBeenCalled()
    expect(wrapper.vm.showLogin).toBe(true)
  })

  test('a router that returns no promise at all is not treated as a refusal', async () => {
    // vue-router below 3.1 returns undefined from `replace`. The navigation still happens; there is
    // simply nothing to hang a fallback on, and inventing a door here would put one back on every
    // leaving route — which is the defect.
    const { wrapper } = mountShell(route('/admin/training-courses'), undefined)
    await settled()
    expect(wrapper.vm.showLogin).toBe(false)
  })
})

// The other half. A page-level PRIVILEGE guard may not answer for a visitor the app has not met —
// that question belongs to the shell, and the page's bare `push('/admin')` destroys the shell's
// in-flight ?redirect= when it fires.
//
// ONLY FOR PAGES THAT ACTUALLY MOUNT THE SHELL, and that clause is not a technicality — it is a
// regression this lane shipped and then caught in a browser while the suite stayed green.
// `pages/admin/wrapped.vue` renders no `<AdminPage>` at all: it has no `initAuth`, writes no
// `?redirect=`, and mounts no `LoginModal`. Its own `push('/admin')` is the ONLY thing standing
// between an anonymous visitor and a page that renders nothing forever, which is what the live walk
// found after that page was "fixed" alongside the other four:
// `lanes/L-THE-SIGN-IN-FRONT-DOOR-IS-HONEST/walk-wrapped-delegation-regression.json` — no send
// control ever, no navigation, one unchanging sample, an anonymous visitor left on a blank page
// with no way in. A page with no shell must keep its own door-keeping.
//
// Asserted over the whole admin surface rather than over the four pages that were wrong, so a FIFTH
// page acquiring the pattern reds here instead of being found by another live walk.
describe('no admin page answers "who are you" with "you are not privileged"', () => {
  const pagesDir = path.resolve(__dirname, '..', 'pages', 'admin')

  function adminPages (dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).reduce((acc, entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { return acc.concat(adminPages(full)) }
      return entry.name.endsWith('.vue') ? acc.concat(full) : acc
    }, [])
  }

  // The `mounted` hook only — that is the hook that races the shell. A bounce inside a click
  // handler or a data loader runs long after the shell has settled and is not this defect.
  function mountedHook (source) {
    const start = source.search(/^\s{2}(async\s+)?mounted\s*\(/m)
    if (start === -1) { return null }
    const rest = source.slice(start)
    // To the next top-level option key at the same indentation.
    const end = rest.slice(1).search(/^\s{2}[A-Za-z$_][\w$]*\s*[(:]/m)
    return end === -1 ? rest : rest.slice(0, end + 1)
  }

  const offenders = adminPages(pagesDir).filter((file) => {
    const source = fs.readFileSync(file, 'utf8')
    // No shell, no delegation. See the note above.
    if (!/<AdminPage/.test(source)) { return false }
    const hook = mountedHook(source)
    if (!hook) { return false }
    if (!/\$router\.push\(\s*['"]\/admin['"]\s*\)/.test(hook)) { return false }
    // The line eleven pages already open with, and the five this lane added it to. Its presence
    // means the anonymous case returns before any privilege bounce can fire.
    return !/if\s*\(\s*!\s*this\.\$store\.getters\.userIsLoggedIn\s*\)\s*\{\s*\n?\s*return/.test(hook)
  }).map(file => path.relative(pagesDir, file)).sort()

  test('every page that bounces to /admin on mount lets the shell answer authentication first', () => {
    expect(offenders).toEqual([])
  })
})

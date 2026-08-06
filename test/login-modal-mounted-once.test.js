/**
 * ONE sign-in modal per page. Not one you can select between — one that exists.
 *
 * ---- WHAT WAS WRONG ---------------------------------------------------------------------------
 *
 * `components/organisms/AdminPage.vue` renders `<LoginModal v-if="showLogin">` and opens it from
 * `initAuth()` on every admin route. Eleven pages under `pages/admin/` ALSO rendered their own
 * `<LoginModal v-if="showLogin">`, on the same condition (`!$store.getters.userIsLoggedIn`,
 * evaluated in their own `mounted`), inside the very `<AdminPage>` that already had one. Asking for
 * `/admin/lang` while signed out therefore put TWO complete sign-in modals on the page, each with
 * its own phone field, its own OTP boxes and its own copy of the sign-in state, and only one of
 * them was the one the person was looking at.
 *
 * That is not a test-selector problem, and it was not found by reading the code. Lane
 * L-LOGIN-MODAL-REPORTS-A-FAILED-SEND hit it as a Playwright strict-mode violation — `.login-modal`
 * resolving to 2 elements — and had to move its whole evidence arm to `/admin` (the index page
 * mounts none of its own) and count code inputs across every modal on the page to get an assertion
 * that could not be fooled. `test/e2e/journeys/modal-estate-scroll-lock.spec.js` recorded the same
 * two elements on `/admin/ongoing` as a note it declined to fix.
 *
 * ---- WHY A SOURCE CENSUS AND NOT A BROWSER COUNT ----------------------------------------------
 *
 * Measured, not assumed: the second modal is TRANSIENT in a browser. `AdminPage.initAuth` fires
 * `$router.replace('/admin?redirect=…')` for any admin path other than `/admin`, which unmounts the
 * page — and its duplicate — a beat after both are on screen. A Playwright count is therefore a
 * race against a redirect, which is exactly the kind of assertion that goes quietly green on a
 * slower machine. The mount SITES are not transient, and they are what this counts: every admin
 * route's full component tree, every `<LoginModal>` element in it, resolved the way Nuxt resolves
 * them (`components: true` in nuxt.config.js means a tag needs no import statement to render).
 *
 * ---- HOW THIS FAILS WHEN IT SHOULD ------------------------------------------------------------
 *
 * Three ways, deliberately:
 *   • test 1 asserts EXACTLY one on every admin route — so restoring any page's own `<LoginModal>`
 *     reds it (proved: `lanes/L-LOGINMODAL-MOUNTED-ONCE/red-proof.txt`), and so does a scanner that
 *     has gone blind and counts nothing, because zero is not one either.
 *   • test 2 sweeps every page in `pages/`, not only `pages/admin/`, so a duplicate introduced on a
 *     consumer route is caught by the same rule.
 *   • test 3 pins the estate-wide list of files that mount a sign-in modal at all. Adding one
 *     anywhere — a layout, a nested component, a new page — reds until the list is edited on
 *     purpose, which is the review moment this defect never got.
 */
const fs = require('fs')
const path = require('path')
const compiler = require('vue-template-compiler')
const { mount } = require('@vue/test-utils')
const AdminPage = require('../components/organisms/AdminPage.vue').default

const ROOT = path.resolve(__dirname, '..')

/** The component this whole file is about. Normalised the way tag comparison below normalises. */
const LOGIN_MODAL = 'loginmodal'

/** `<LoginModal>`, `<login-modal>` and `<Login-Modal>` are one component. So compare like this. */
const normalise = tag => String(tag || '').replace(/[-_]/g, '').toLowerCase()

const walkFiles = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkFiles(full, out)
    } else if (entry.name.endsWith('.vue')) {
      out.push(full)
    }
  }
  return out
}

const PAGE_FILES = walkFiles(path.join(ROOT, 'pages')).sort()
const COMPONENT_FILES = walkFiles(path.join(ROOT, 'components')).sort()
const LAYOUT_FILES = walkFiles(path.join(ROOT, 'layouts')).sort()

/**
 * Tag -> component file(s). `components: true` is set in nuxt.config.js, so a template may render
 * any component under `components/` WITHOUT importing it; an import-graph walk would miss exactly
 * those and under-report, which is the wrong direction to be wrong in for a "no more than one"
 * rule. Resolving by name is how the framework itself resolves them.
 *
 * One basename is ambiguous in this repository (`OrderModal.vue` exists twice). A tag that resolves
 * to more than one file is counted at its MAXIMUM, so ambiguity can never hide a second modal.
 */
const byTag = new Map()
for (const file of COMPONENT_FILES) {
  const key = normalise(path.basename(file, '.vue'))
  if (!byTag.has(key)) { byTag.set(key, []) }
  byTag.get(key).push(file)
}

/** The `<template>` half of an SFC, or '' when the file has none. */
const templateOf = (file) => {
  const parsed = compiler.parseComponent(fs.readFileSync(file, 'utf8'))
  return (parsed.template && parsed.template.content) || ''
}

/**
 * Element tags in render order, from the real Vue 2 template compiler rather than a regex — a regex
 * would count `<LoginModal>` written inside an HTML comment or a documentation string, and this file
 * itself is proof that people write that.
 */
const elementTagsIn = (file) => {
  const content = templateOf(file)
  if (!content.trim()) { return [] }
  const { ast, errors } = compiler.compile(content, { comments: false })
  if (errors && errors.length) {
    throw new Error('template of ' + path.relative(ROOT, file) + ' did not compile: ' + errors.join('; '))
  }
  const tags = []
  const visit = (node) => {
    if (!node || node.type !== 1) { return }
    tags.push(node.tag)
    ;(node.children || []).forEach(visit)
    // `v-if`/`v-else-if`/`v-else` siblings hang off the `if` node rather than the child list, and
    // every one of them is a mount site — `v-if="showLogin"` is precisely how both modals were
    // written, so a walk that skipped these branches would count zero of the defect.
    ;(node.ifConditions || []).forEach((c) => { if (c.block !== node) { visit(c.block) } })
    if (node.scopedSlots) { Object.values(node.scopedSlots).forEach(visit) }
  }
  visit(ast)
  return tags
}

/**
 * How many `<LoginModal>` mount sites the tree rooted at `file` contains, counting a component
 * rendered twice twice. Memoised per file; a cycle contributes 0 rather than hanging.
 */
const memo = new Map()
const countMountSites = (file, stack = new Set()) => {
  if (memo.has(file)) { return memo.get(file) }
  if (stack.has(file)) { return 0 }
  stack.add(file)
  let total = 0
  for (const tag of elementTagsIn(file)) {
    const key = normalise(tag)
    if (key === LOGIN_MODAL) {
      total += 1
      continue
    }
    const candidates = byTag.get(key)
    if (!candidates) { continue }
    total += Math.max(...candidates.map(c => countMountSites(c, stack)))
  }
  stack.delete(file)
  memo.set(file, total)
  return total
}

const rel = file => path.relative(ROOT, file)
const ADMIN_PAGES = PAGE_FILES.filter(f => rel(f).startsWith('pages/admin/'))

/**
 * The two admin pages that are not built on the admin shell, and so have no sign-in modal at all.
 * Named rather than filtered by a shape test, so that a page which LOSES its `<AdminPage>` shows up
 * as a failure here instead of quietly excusing itself from the rule.
 */
const ADMIN_PAGES_WITHOUT_THE_SHELL = ['pages/admin/reservation.vue', 'pages/admin/wrapped.vue']

describe('a page has one sign-in modal, not two', () => {
  test('every admin route mounts exactly one <LoginModal>, and it is the shell\'s', () => {
    // Sanity first: if this scanner cannot see the one modal that is SUPPOSED to be there, every
    // count below is a zero that means nothing. Assert the shell before asserting the pages.
    expect(countMountSites(path.join(ROOT, 'components/organisms/AdminPage.vue'))).toBe(1)
    expect(ADMIN_PAGES.length).toBeGreaterThan(60)

    const counted = ADMIN_PAGES
      .filter(f => !ADMIN_PAGES_WITHOUT_THE_SHELL.includes(rel(f)))
      .map(f => [rel(f), countMountSites(f)])

    expect(counted.filter(([, n]) => n !== 1)).toEqual([])

    for (const name of ADMIN_PAGES_WITHOUT_THE_SHELL) {
      expect([name, countMountSites(path.join(ROOT, name))]).toEqual([name, 0])
    }
  })

  test('no page anywhere renders a second sign-in modal', () => {
    const offenders = PAGE_FILES
      .map(f => [rel(f), countMountSites(f)])
      .filter(([, n]) => n > 1)

    expect(offenders).toEqual([])
  })

  test('only these files mount a sign-in modal at all', () => {
    const mounts = [...PAGE_FILES, ...COMPONENT_FILES, ...LAYOUT_FILES]
      .filter(f => rel(f) !== 'components/molecules/LoginModal.vue')
      .filter(f => elementTagsIn(f).some(t => normalise(t) === LOGIN_MODAL))
      .map(rel)
      .sort()

    expect(mounts).toEqual([
      // Unreachable: no template in this repository renders `<MyUserDropdown>` and nothing imports
      // it, so this mount site is on no page's tree and no count above sees it. Left in place and
      // listed here rather than deleted, because deleting a component is a different change than
      // deleting a duplicate — but it is on the record now, which it was not before.
      'components/atoms/MyUserDropdown.vue',
      // The one modal every admin route gets, opened by `initAuth`.
      'components/organisms/AdminPage.vue',
      // Standalone claim pages: `layout: 'empty'`, no `<AdminPage>`, so each of these mounts the
      // ONLY modal on its page. A guest arrives holding a claim token and must sign in without
      // navigating away from it, which is the whole reason the modal is mounted in place here.
      'pages/meals/join.vue',
      'pages/workforce/join.vue'
    ])
  })
})

/**
 * The census above counts mount SITES in source. These two mount the shell for real, in jsdom, and
 * count `.login-modal` elements in a document — because a census of a class name nobody renders
 * would be a tidy green measurement of nothing.
 */
describe('the shell renders that one modal, and lets a page ask for it', () => {
  const mountShell = (opts = {}) => {
    const replace = jest.fn()
    const wrapper = mount(AdminPage, {
      mocks: {
        $t: key => key,
        $i: key => key,
        $route: { path: '/admin', fullPath: '/admin', query: {} },
        $router: { replace },
        $store: {
          getters: { userIsLoggedIn: opts.signedIn ? 'user-1' : null },
          state: { currentUser: opts.signedIn ? { id: 'user-1', adminIn: [{ id: 1 }] } : {} }
        },
        _userService: { Reload: () => Promise.resolve(true) }
      },
      stubs: {
        // Nuxt registers this one; without it the shell's whole template would render nothing and
        // every count below would be a zero that proves the opposite of what it looks like.
        'client-only': { render (h) { return h('div', this.$slots.default) } },
        AdminPageHeader: true,
        AdminPageFooter: true,
        OnboardingNotification: true,
        // The modal's own chrome. `LoginModal` itself is REAL — it is the component under count.
        Modal: { render (h) { return h('div', this.$slots.default) } }
      }
    })
    return { wrapper, replace }
  }

  test('a signed-out visitor to /admin gets exactly one .login-modal', async () => {
    const { wrapper, replace } = mountShell({ signedIn: false })
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.login-modal')).toHaveLength(1)
    // `/admin` is already the sign-in route, so nothing navigates away from under it.
    expect(replace).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  test('openLogin() raises that same one modal and never a second', async () => {
    const { wrapper } = mountShell({ signedIn: true })
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.login-modal')).toHaveLength(0)

    // What `pages/admin/onboarding.vue` and `pages/admin/wolt-menu.vue` call when `Reload()` says
    // the session they mounted with is no longer good. Calling it twice is the case that matters:
    // the answer is still one modal.
    wrapper.vm.openLogin()
    wrapper.vm.openLogin()
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.login-modal')).toHaveLength(1)
    wrapper.destroy()
  })
})

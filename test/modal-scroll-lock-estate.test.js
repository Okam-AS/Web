import fs from 'fs'
import path from 'path'
import Vue from 'vue'
import VueMeta from 'vue-meta'
import { mount } from '@vue/test-utils'
import bodyScrollLock, { BODY_SCROLL_LOCK_CLASS_MOBILE } from '~/utils/body-scroll-lock'
import Modal from '~/components/atoms/Modal.vue'
import SmsDriverModal from '~/components/molecules/SmsDriverModal.vue'
import TransferOrderModal from '~/components/molecules/TransferOrderModal.vue'
import TermsModal from '~/components/modals/TermsModal.vue'
import PageHeader from '~/components/organisms/PageHeader.vue'

// THE SCROLL LOCK ACROSS THE WHOLE ESTATE, not just the shared modal.
//
// ---- WHAT WAS ACTUALLY WRONG, WHICH IS NOT WHAT THE REVIEW SAID -------------------------------
//
// The review that raised this said "seven other modals write the overflow style directly". A census
// of the tree says the number is EIGHT modals, plus the marketing site's mobile nav drawer and the
// product editor on `pages/admin/products.vue` — ten writers of `document.body.style.overflow`, none
// of them counting — and it also says something the review did not look for: SEVENTEEN MORE
// full-screen overlay modals that locked NOTHING AT ALL. So the estate had two mechanisms, eleven
// writers and a large silent majority, and the exit criterion ("one declared mechanism") is only met
// when all of them go through `~/utils/body-scroll-lock`.
//
// ---- WHY THESE ASSERTIONS ARE SHAPED THIS WAY -------------------------------------------------
//
// The trap this lane inherited: a unit test in this repo asserted a body class after mount and
// PASSED FOR A YEAR while the app was broken in every browser, because jsdom has no vue-meta and an
// imperative `classList.add` therefore survives in jsdom and nowhere else. The rule that came out of
// it — assert the declaration, and install the real library wherever you assert behaviour — is what
// this file follows: vue-meta is installed with Nuxt's own options and the DOM assertions below are
// made against what vue-meta wrote, not against what a component did to `document.body`.
//
// What a browser still has to say, and what `test/e2e/journeys/modal-estate-scroll-lock.spec.js`
// therefore measures: `overflow: hidden` does not stop `window.scrollTo`, so no assertion here — and
// none available in jsdom — can tell a working lock from a broken one. Only a wheel gesture can.

const NUXT_META_OPTIONS = {
  keyName: 'head',
  attribute: 'data-n-head',
  ssrAttribute: 'data-n-head-ssr',
  tagIDKeyName: 'hid'
}

Vue.use(VueMeta, NUXT_META_OPTIONS)

const REPO_ROOT = path.join(__dirname, '..')
const ROOTS = ['layouts', 'pages', 'components', 'utils']

/** The comments in these files name the old mechanism on purpose; only real statements count. */
function stripComments (source) {
  return source.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

function filesUnder (dir, extensions, found) {
  found = found || []
  if (!fs.existsSync(dir)) { return found }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      filesUnder(full, extensions, found)
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      found.push(full)
    }
  }
  return found
}

function sourceFiles () {
  return ROOTS.reduce(
    (all, root) => all.concat(filesUnder(path.join(REPO_ROOT, root), ['.vue', '.js'])),
    []
  ).map(file => ({ file: path.relative(REPO_ROOT, file), code: fs.readFileSync(file, 'utf8') }))
}

// ---- the behavioural half ----------------------------------------------------------------------

function settle (wrapper) {
  wrapper.vm.$meta().refresh()
}

function bodyClasses () {
  const value = document.body.getAttribute('class')
  return value ? value.split(' ').filter(Boolean) : []
}

function resetBody () {
  document.body.removeAttribute('class')
  document.body.removeAttribute('data-n-head')
}

const ORDER = {
  id: 'order-1',
  friendlyOrderId: '1024',
  storeId: 42,
  storeLegalName: 'Fixture Kafé',
  deliveryType: 'SelfPickup',
  status: 'Accepted',
  items: [],
  totalAmount: 0
}

const STORES = [{ id: 42, name: 'Fixture Kafé' }, { id: 43, name: 'Fixture Bakeri' }]

const $i = key => key

/** A stand-in for `layouts/default.vue`: contributes the market class, hosts whatever is passed. */
function hostFor (children) {
  return {
    props: {
      isCh: { type: Boolean, default: false },
      open: { type: Array, default: () => [] },
      // Props handed down to whatever is open, from the host, so a test can change a CHILD's props
      // through `wrapper.setProps` — vue-test-utils refuses `setProps` on anything but the root.
      childProps: { type: Object, default: () => ({}) }
    },
    components: children,
    head () {
      return { bodyAttrs: { class: this.isCh ? ['okam-ch'] : [] } }
    },
    template:
      '<div>' +
      Object.keys(children)
        .map(name => '<' + name + ' v-if="open.indexOf(\'' + name + '\') > -1" v-bind="childProps" />')
        .join('') +
      '</div>'
  }
}

// vue-meta's `attributeMap` is module-level and keyed by appId, and `mount()` mints a new root — and
// therefore a new appId — every time. A root left alive keeps contributing to `document.body` in the
// NEXT test, so every wrapper is tracked and torn down, including the ones whose test failed. Without
// this a single broken mount poisons every assertion after it, which is a worse instrument than none.
const mounted = []

function mountHost (children, props, options) {
  const wrapper = mount(hostFor(children), Object.assign({
    propsData: props,
    mocks: { $i },
    stubs: { 'focus-trap': { template: '<div><slot /></div>' } }
  }, options || {}))
  mounted.push(wrapper)
  return wrapper
}

function teardown () {
  while (mounted.length) {
    const wrapper = mounted.pop()
    // Destroy AND refresh. `updateAttribute` only removes the classes THIS app is recorded as having
    // written, and vue-meta debounces its own post-destroy update by 10ms — so a destroy without a
    // synchronous refresh leaves the class on the body until a timer fires inside the next test,
    // where it reads as that test's own result. That is a lie an instrument must not be able to tell.
    try { wrapper.destroy(); wrapper.vm.$meta().refresh() } catch (e) { /* mount threw; nothing to undo */ }
  }
  resetBody()
}

describe('every modal locks through the one declared mechanism', () => {
  beforeEach(resetBody)
  afterEach(teardown)

  test('two DIFFERENT modals open, one closes, and the page is still locked', async () => {
    // THE DEFECT, stated as a test. `pages/admin/ongoing.vue` hosts six of these modals over one
    // shared `currentOrder`; `components/organisms/OrderModal.vue` nests a seventh inside itself.
    // Each of them used to release `document.body.style.overflow` on its own way out, unconditionally
    // — so the last close won and the page behind whatever was still open started scrolling. There is
    // no counter here to get right: vue-meta re-derives `body.class` from the LIVE COMPONENT TREE, so
    // the lock is held exactly while at least one contributor is mounted.
    const wrapper = mountHost(
      { SmsDriverModal, TransferOrderModal },
      { open: ['SmsDriverModal', 'TransferOrderModal'], childProps: { order: ORDER, stores: STORES } }
    )
    settle(wrapper)
    expect(bodyClasses()).toContain('noscroll')

    await wrapper.setProps({ open: ['TransferOrderModal'] })
    settle(wrapper)
    expect(bodyClasses()).toContain('noscroll')

    await wrapper.setProps({ open: [] })
    settle(wrapper)
    expect(bodyClasses()).not.toContain('noscroll')
  })

  test('a migrated modal composes with the shared one rather than replacing it', async () => {
    const wrapper = mountHost(
      { Modal, TransferOrderModal },
      { open: ['Modal', 'TransferOrderModal'], childProps: { order: ORDER, stores: STORES } }
    )
    settle(wrapper)
    expect(bodyClasses()).toContain('noscroll')

    // Close the SHARED modal, which is the one that was fixed first. The migrated one is still open.
    await wrapper.setProps({ open: ['TransferOrderModal'] })
    settle(wrapper)
    expect(bodyClasses()).toContain('noscroll')
  })

  test('THE MARKET CLASS SURVIVES a migrated modal being open', () => {
    // `okam-ch` is what themes the entire Swiss site, and it lives on the same attribute. vue-meta
    // merges array-valued attributes by concatenation and STRING-valued ones by replacement, so one
    // string anywhere in the chain deletes the others — in both directions, silently. TermsModal is
    // on the signup page, which is a marketing page and therefore also a Swiss page.
    const wrapper = mountHost({ TermsModal }, {
      isCh: true, open: ['TermsModal'], childProps: { isVisible: true }
    })
    settle(wrapper)

    expect(bodyClasses().sort()).toEqual(['noscroll', 'okam-ch'])
  })

  test('an ALWAYS-MOUNTED modal locks only while it is visible', async () => {
    // Six components in this estate are mounted for the life of the page and hide themselves with
    // `v-if` on their own root. For those, "mounted" is not "on screen": the default mixin would hold
    // the lock forever and the page would simply never scroll again, with nothing on screen to
    // explain it. They override `bodyScrollLocked` and this is the assertion that they did.
    const wrapper = mountHost({ TermsModal }, {
      open: ['TermsModal'], childProps: { isVisible: false }
    })
    settle(wrapper)
    expect(bodyClasses()).not.toContain('noscroll')

    await wrapper.setProps({ childProps: { isVisible: true } })
    settle(wrapper)
    expect(bodyClasses()).toContain('noscroll')

    await wrapper.setProps({ childProps: { isVisible: false } })
    settle(wrapper)
    expect(bodyClasses()).not.toContain('noscroll')
  })

  test('the marketing header locks only while the drawer is open, and lets go on close', async () => {
    // `PageHeader.closeMenu()` used to set `document.body.style.overflow = ''` unconditionally, from
    // the marketing site's header, over whatever else was holding it.
    const wrapper = mountHost({ PageHeader }, { isCh: true, open: ['PageHeader'] }, {
      mocks: {
        $i,
        $store: { getters: { userIsLoggedIn: false } },
        marketConfig: { shopUrl: 'https://example.test' },
        isCh: true
      },
      stubs: { NuxtLink: { template: '<a><slot /></a>' } }
    })
    settle(wrapper)
    expect(bodyClasses()).toEqual(['okam-ch'])

    wrapper.findComponent(PageHeader).vm.toggleMenu()
    await wrapper.vm.$nextTick()
    settle(wrapper)
    expect(bodyClasses().sort()).toEqual(['noscroll', 'okam-ch'])

    wrapper.findComponent(PageHeader).vm.closeMenu()
    await wrapper.vm.$nextTick()
    settle(wrapper)
    expect(bodyClasses()).toEqual(['okam-ch'])
  })

  test('a surface that locks only on mobile contributes its own media-scoped class', () => {
    // `pages/admin/products.vue` is the one such surface — a side panel on a desktop, a full-screen
    // sheet on a phone. The page is too large to mount here; what is being pinned is that overriding
    // `bodyScrollLockClasses` reaches the body as an ARRAY and composes like any other contribution,
    // because that is the part that could silently stop being true.
    const MobileOnly = {
      mixins: [bodyScrollLock],
      computed: {
        bodyScrollLockClasses () { return [BODY_SCROLL_LOCK_CLASS_MOBILE] }
      },
      template: '<div />'
    }
    const wrapper = mountHost({ MobileOnly }, { isCh: true, open: ['MobileOnly'] })
    settle(wrapper)

    expect(bodyClasses().sort()).toEqual(['noscroll-mobile', 'okam-ch'])
    expect(BODY_SCROLL_LOCK_CLASS_MOBILE).toBe('noscroll-mobile')
  })

  test('the mixin declares an ARRAY, and declares nothing at all when unlocked', () => {
    // The declaration itself, asserted directly — the half a behavioural test in jsdom cannot see.
    const locked = bodyScrollLock.head.call({ bodyScrollLocked: true, bodyScrollLockClasses: ['noscroll'] })
    expect(locked).toEqual({ bodyAttrs: { class: ['noscroll'] } })
    expect(Array.isArray(locked.bodyAttrs.class)).toBe(true)

    const unlocked = bodyScrollLock.head.call({ bodyScrollLocked: false, bodyScrollLockClasses: ['noscroll'] })
    expect(unlocked).toEqual({ bodyAttrs: { class: [] } })
  })
})

// ---- the source-level half ---------------------------------------------------------------------
//
// Three invariants whose breach is invisible at runtime: nothing throws, nothing logs, a class simply
// stops being there or never leaves. Each is compared for EQUALITY against a named list so that it
// goes red when the world changes rather than quietly passing on a stale one.

describe('there is exactly one mechanism, and no way back to the old one', () => {
  test('NOTHING in the app sets document.body.style.overflow', () => {
    // The channel the eleven writers used. It is not owned by vue-meta, so it survives a head update
    // — which is precisely why it looked like the working mechanism while being the uncounted one.
    const offenders = sourceFiles()
      .filter(({ code }) => /document\.body\.style(\.overflow|\[['"]overflow)/.test(stripComments(code)))
      .map(({ file }) => file)

    expect(offenders.sort()).toEqual([])
  })

  test('every overlay modal in the estate declares the lock', () => {
    // A modal that locks nothing is not a lesser bug than a modal that locks wrongly — it is the same
    // page moving behind the same overlay. This walks every `*Modal*.vue` in the tree and requires
    // each to reach the mechanism one of the two ways there are: the mixin, or `atoms/Modal`, which
    // carries the mixin itself.
    const modals = ROOTS
      .reduce((all, root) => all.concat(filesUnder(path.join(REPO_ROOT, root), ['.vue'])), [])
      .filter(file => /Modal[^/]*\.vue$/.test(file) || /\/Modal\.vue$/.test(file))
      .map(file => path.relative(REPO_ROOT, file))

    // A tripwire on the census itself: if modals are added or removed, this number moves and the
    // reader is sent back to check the list rather than trusting a green run.
    expect(modals.length).toBe(29)

    const unlocked = modals.filter((file) => {
      const code = stripComments(fs.readFileSync(path.join(REPO_ROOT, file), 'utf8'))
      return !/body-scroll-lock/.test(code) && !/atoms\/Modal/.test(code)
    })

    expect(unlocked.sort()).toEqual([])
  })

  test('a modal that hides ITSELF ties the lock to the condition it hides on', () => {
    // The trap in migrating these. Most modals are mounted by a parent's `v-if`, so "mounted" and "on
    // screen" are the same thing and the mixin's default is right. SIX are not: they are mounted for
    // the life of the page and hide themselves with `v-if` on their OWN root element. On those the
    // default would hold the lock forever — the page would never scroll again and nothing on screen
    // would say why, which is a worse bug than the one being fixed.
    //
    // Checked at the source rather than by mounting all six: what has to be true is that the override
    // EXISTS, and a behavioural test of it is in the first half of this file for the one of them that
    // mounts cheaply. This is the guard that stops the seventh from being added without one.
    const offenders = []

    for (const { file, code } of sourceFiles()) {
      if (!file.endsWith('.vue') || !/body-scroll-lock/.test(stripComments(code))) { continue }
      const template = /<template>([\s\S]*?)\n<\/template>/.exec(code)
      if (!template) { continue }
      const rootTag = /<\s*[a-zA-Z][^>]*>/.exec(template[1])
      if (!rootTag || !/\sv-if=/.test(rootTag[0])) { continue }
      if (!/bodyScrollLocked\s*\(/.test(code)) { offenders.push(file) }
    }

    expect(offenders.sort()).toEqual([])
  })

  test('no component that uses the mixin also declares its own head()', () => {
    // vue-meta installs NO merge strategy for the key, so Vue's default applies and a component's own
    // `head()` REPLACES the mixin's outright rather than merging with it. The lock would disappear
    // without a word, which is the same class of failure this whole lane exists to close.
    const offenders = sourceFiles()
      .filter(({ file, code }) => {
        if (file === 'utils/body-scroll-lock.js') { return false }
        const stripped = stripComments(code)
        return /body-scroll-lock/.test(stripped) && /\n\s*head\s*\(\s*\)\s*\{/.test(stripped)
      })
      .map(({ file }) => file)

    expect(offenders.sort()).toEqual([])
  })

  test('every bodyAttrs.class declared anywhere is an array', () => {
    // Same invariant the shared-modal lane pinned, re-checked over `utils/` as well — which is where
    // the declaration now lives, and therefore outside the roots that guard was written to walk.
    const offenders = []

    for (const { file, code } of sourceFiles()) {
      const declaration = /bodyAttrs\s*:\s*\{[\s\S]*?\}/.exec(stripComments(code))
      if (!declaration) { continue }
      const klass = /class\s*:\s*([\s\S]*?)(?:,\s*\n|\n\s*\})/.exec(declaration[0])
      if (!klass) { continue }
      const value = klass[1].trim()
      // Every BRANCH of the expression has to be an array — a ternary that is an array on one side
      // and a string on the other composes half the time, which is worse than never composing
      // because it looks like it works. `.join(...)` is called out by name: it is the shape that
      // reads as an array in a diff and merges like a string.
      const branches = value.split(/\?|:/).map(part => part.trim()).filter(Boolean)
      const declaresArray = part => /^\[/.test(part) || part === 'this.bodyScrollLockClasses'
      const isArray = branches.some(declaresArray) &&
        branches.every(part => declaresArray(part) || !/['"[\]]/.test(part)) &&
        !/\.join\s*\(/.test(value)
      if (!isArray) { offenders.push(file + ' -> class: ' + value) }
    }

    expect(offenders).toEqual([])
  })
})

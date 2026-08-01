import fs from 'fs'
import path from 'path'
import Vue from 'vue'
import VueMeta from 'vue-meta'
import { mount } from '@vue/test-utils'
import Modal from '~/components/atoms/Modal.vue'

// The scroll lock behind a modal, tested WITH THE HEAD MANAGER IN THE ROOM.
//
// ---- WHY THIS FILE IS SHAPED THIS WAY ---------------------------------------------------------
//
// There was already a test in this repo of exactly this kind of claim. It asserted
// `document.body.classList.contains('wfpl-print-host')` after mount and it PASSED, for a year, while
// the thing it described was broken in every browser. jsdom has no vue-meta, so an imperative
// `document.body.classList.add(...)` in `mounted` survives in a unit test and NOWHERE ELSE: in the
// running app `layouts/default.vue` declares `bodyAttrs`, and vue-meta's `updateAttribute` rebuilds
// `body.class` from its own map and writes it whole. The test could only ever pass and the app could
// only ever fail.
//
// The lesson is not "never assert the DOM". It is that a test which omits the component that OWNS
// the state under test is not testing that state. So this file installs the real vue-meta, with the
// exact options Nuxt installs it with (.nuxt/index.js), and mounts a root that declares `bodyAttrs`
// the way `layouts/default.vue` does. What it then asserts about `document.body` is true of the
// browser too, because the same code wrote it.
//
// `attributeMap` inside vue-meta is module-level and keyed by appId, and `mount()` mints a new root —
// and therefore a new appId — every time. So each test destroys its wrapper and `resetBody()` puts
// the attribute back, or a later test would read a body still carrying an earlier root's classes.

/** The comments in these files name the trap on purpose; only real statements count as breaches. */
function stripComments (source) {
  return source.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

const NUXT_META_OPTIONS = {
  keyName: 'head',
  attribute: 'data-n-head',
  ssrAttribute: 'data-n-head-ssr',
  tagIDKeyName: 'hid'
}

Vue.use(VueMeta, NUXT_META_OPTIONS)

/** A stand-in for `layouts/default.vue`: declares the market class, hosts however many modals. */
const Host = {
  props: {
    isCh: { type: Boolean, default: false },
    modals: { type: Number, default: 0 }
  },
  components: { Modal },
  head () {
    return { bodyAttrs: { class: this.isCh ? ['okam-ch'] : [] } }
  },
  template: '<div><Modal v-for="n in modals" :key="n"><p>modal {{ n }}</p></Modal></div>'
}

/** vue-meta debounces updates by 10ms; `refresh()` is the synchronous door to the same code. */
function settle (wrapper) {
  wrapper.vm.$meta().refresh()
}

function bodyClasses () {
  const value = document.body.getAttribute('class')
  return value ? value.split(' ').filter(Boolean).sort() : []
}

function resetBody () {
  document.body.removeAttribute('class')
  document.body.removeAttribute('data-n-head')
}

function mountHost (props) {
  return mount(Host, { propsData: props, stubs: { 'focus-trap': { template: '<div><slot /></div>' } } })
}

describe('the class the scroll lock rides on', () => {
  afterEach(resetBody)

  test('is DECLARED through head(), not added to document.body', () => {
    // The regression guard the last one needed. The imperative form works in jsdom and fails in
    // every browser, so its ABSENCE from the source is what has to be asserted — a behavioural test
    // cannot tell the two apart here, which is precisely how the first defect survived review.
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'atoms', 'Modal.vue'), 'utf8'
    )
    expect(stripComments(source)).not.toMatch(/document\.body\.classList/)

    // The declaration moved into `~/utils/body-scroll-lock` when the OTHER ten writers of the body
    // lock were migrated onto it (lane/modal-seven) — this component no longer owns a `head()` of
    // its own, and must not grow one back: vue-meta installs no merge strategy for the key, so a
    // local `head()` would REPLACE the mixin's rather than add to it and the lock would vanish.
    // What is asserted here is therefore the mixin's declaration, reached the way this component
    // reaches it.
    expect(stripComments(source)).toMatch(/mixins:\s*\[bodyScrollLock\]/)
    expect(stripComments(source)).not.toMatch(/\n\s*head\s*\(\s*\)\s*\{/)

    const lock = Modal.mixins.find(mixin => typeof mixin.head === 'function')
    expect(lock.head.call({ bodyScrollLocked: true, bodyScrollLockClasses: ['noscroll'] }))
      .toEqual({ bodyAttrs: { class: ['noscroll'] } })
  })

  test('reaches the body for real once vue-meta is the one writing it', () => {
    const wrapper = mountHost({ modals: 1 })
    settle(wrapper)

    expect(bodyClasses()).toContain('noscroll')

    wrapper.destroy()
    settle(wrapper)
    expect(bodyClasses()).not.toContain('noscroll')
  })

  test('is carried ALONGSIDE the market class, not instead of it', () => {
    // A page or component that declares `bodyAttrs.class` as a STRING replaces the layout's value
    // rather than adding to it, and `okam-ch` is what themes the entire Swiss site. Declared as
    // arrays, both survive — which is the only reason a component may declare a body class at all.
    const wrapper = mountHost({ isCh: true, modals: 1 })
    settle(wrapper)

    expect(bodyClasses()).toEqual(['noscroll', 'okam-ch'])

    wrapper.destroy()
  })

  test('closing one of two open modals does not release the lock behind the other', async () => {
    // The classic failure of every counted body-class lock. There is no counter here: vue-meta
    // re-derives the attribute from the live component tree, so the assertion is that the lock
    // survives losing ONE contributor and disappears on losing the last.
    const wrapper = mountHost({ isCh: true, modals: 2 })
    settle(wrapper)
    expect(bodyClasses()).toContain('noscroll')

    // Pinned because it looks like a bug and is not: concatenation means two open modals contribute
    // the class TWICE, and `class="okam-ch noscroll noscroll"` is what the body carries. A duplicate
    // class name is legal and inert in CSS, it does not grow on further refreshes (asserted by the
    // second `settle` below), and de-duplicating it would mean introducing exactly the counting this
    // design exists to avoid. If this ever reads as a single `noscroll`, something started merging by
    // replacement again and the composition guarantee is gone.
    expect(document.body.getAttribute('class')).toBe('okam-ch noscroll noscroll')
    settle(wrapper)
    expect(document.body.getAttribute('class')).toBe('okam-ch noscroll noscroll')

    await wrapper.setProps({ modals: 1 })
    settle(wrapper)
    expect(bodyClasses()).toContain('noscroll')

    await wrapper.setProps({ modals: 0 })
    settle(wrapper)
    expect(bodyClasses()).not.toContain('noscroll')

    wrapper.destroy()
  })
})

describe('the declaration discipline that makes the above hold', () => {
  // vue-meta merges `bodyAttrs` with deepmerge: arrays CONCATENATE, everything else REPLACES. So one
  // string-valued `bodyAttrs.class` anywhere in the tree silently deletes every other contribution
  // beneath it — no error, no warning, a class simply stops being there. The invariant is cheap to
  // state and impossible to notice the breach of, which is what a source-level guard is for.
  const ROOTS = ['layouts', 'pages', 'components']

  // THE ONE FILE STILL DOING IT, AND WHY IT IS NAMED HERE RATHER THAN FIXED HERE.
  //
  // `pages/admin/workforce-personnel-list.vue` carries the identical defect: it adds its print-host
  // class imperatively, so its statutory print stylesheet is inert for the same reason the scroll
  // lock was. It is ALREADY FIXED on `lane/print-host`, which found it, printed the paper and holds
  // the PDFs proving it — fixing it a second time here would only produce a conflict over a file
  // this lane has no evidence for.
  //
  // The list is compared for EQUALITY rather than containment, so it cannot rot: the moment that
  // lane merges, this test goes red saying the exemption is stale, and the fix is to delete the
  // line. It is the merge prompt, not a permanent excuse.
  const KNOWN_UNFIXED = ['pages/admin/workforce-personnel-list.vue']

  function vueFilesUnder (dir, found) {
    found = found || []
    if (!fs.existsSync(dir)) { return found }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { vueFilesUnder(full, found) } else if (entry.name.endsWith('.vue')) { found.push(full) }
    }
    return found
  }

  test('every bodyAttrs.class in the repo is declared as an array', () => {
    const offenders = []
    const repoRoot = path.join(__dirname, '..')

    for (const root of ROOTS) {
      for (const file of vueFilesUnder(path.join(repoRoot, root))) {
        const source = fs.readFileSync(file, 'utf8')
        const declaration = /bodyAttrs\s*:\s*\{[\s\S]*?\}/.exec(source)
        if (!declaration) { continue }
        const klass = /class\s*:\s*([\s\S]*?)(?:,\s*\n|\n\s*\})/.exec(declaration[0])
        if (!klass) { continue }
        const value = klass[1].trim()
        // An array literal, or a conditional whose branches are array literals — and NOT an array
        // that is joined back down to a string on the way out, which is the shape that looks right
        // in a diff and merges like a string.
        const isArray = /^(\[|.*\?\s*\[)/.test(value) && !/\.join\s*\(/.test(value)
        if (!isArray) {
          offenders.push(path.relative(repoRoot, file) + ' -> class: ' + value)
        }
      }
    }

    expect(offenders).toEqual([])
  })

  test('nothing mutates document.body.classList behind vue-meta\'s back', () => {
    // Scoped to `classList` deliberately. `document.body.style.overflow`, which seven other modal
    // components use, is NOT owned by vue-meta — nothing declares `bodyAttrs.style` — so it survives
    // a head update and is not the defect this guard is about. The class attribute is.
    const offenders = []
    const repoRoot = path.join(__dirname, '..')

    for (const root of ROOTS) {
      for (const file of vueFilesUnder(path.join(repoRoot, root))) {
        const code = stripComments(fs.readFileSync(file, 'utf8'))
        if (/document\.body\.classList\.(add|remove|toggle)/.test(code)) {
          offenders.push(path.relative(repoRoot, file))
        }
      }
    }

    expect(offenders.sort()).toEqual(KNOWN_UNFIXED.slice().sort())
  })
})

/**
 * `components/molecules/FocusTrap.vue` declared its teardown as `unmounted ()`.
 *
 * `unmounted` is a VUE 3 lifecycle hook. This application is Vue 2.7.14 (package.json pins
 * `vue: ^2.6.14`, node_modules resolves 2.7.14 — the declared range is not the one running), and
 * Vue 2 has no such hook: its names are `beforeDestroy` and `destroyed`. An unrecognised option key
 * is not an error and not a warning: Vue merges it onto `$options` with the DEFAULT strategy, which
 * leaves it a raw function instead of normalising it into the array a real hook becomes. The
 * framework never even saw it as a hook. Measured, not assumed — test 1 asserts both the call count
 * and that shape difference.
 *
 * Proved independently and first by lane L-DECLARATIONS-THE-FRAMEWORK-IGNORES, on jsdom + real
 * vue 2.7.14 + `vue-template-compiler` 2.7.14 (vue-loader's own transform, deliberately not
 * vue-jest): five mount/destroy cycles, the `unmounted()` body ran 0 times, `attachHandler` ran once
 * for all five. See `lanes/L-DECLARATIONS-THE-FRAMEWORK-IGNORES/ignored.md` §2. That the same result
 * falls out of vue-jest here is a second transform agreeing, not a repetition.
 *
 * ---- WHY THIS IS A HAND-ROLLED SCAN AND NOT A LINT RULE ---------------------------------------
 *
 * Because no lint rule in this repo can express it. `eslint-plugin-vue` is 6.2.2, which predates
 * Vue 3 — no rule in it knows the name `unmounted`. (`vue/no-reserved-keys` IS enabled and does
 * catch the neighbouring `_tick` data-key class, which is why that defect has a lint-based guard and
 * this one cannot.) `vue/no-unsupported-features` reads its version from package.json's `^2.6.14`
 * rather than from the installed 2.7.14, so switching it on today would gate against a Vue this
 * application does not run. Fixing that declaration is a separate lane's work and is left to it.
 *
 * So the release ran zero times in this application's life. The three things it does are the three
 * things that never happened, and all three are asserted below as consequences rather than as calls:
 *
 *   1. `instances = instances.filter(...)` — the module-level array keeps `{ vue: <the component>,
 *      observed: <its detached [data-lock] subtree> }` for EVERY trap ever mounted. `Modal.vue` is
 *      the only consumer and it is everywhere (ten admin pages, plus `AdminPage.vue`'s LoginModal on
 *      every admin route), so every modal a user opened stayed retained for the life of the page,
 *      still reachable from document-level handlers and still being written to. Test 4.
 *   2. `if (!instances.length) detachHandler()` — the array never empties, so the `focusin` (capture),
 *      `focusout` and window `blur` listeners were attached by the first modal of the session and
 *      released by nothing. Test 3.
 *   3. the `returnFocus` restore, and the closing `emitChange()` that hands governance back to a trap
 *      still on screen. Tests 5 and 6.
 *
 * ---- WHY TEST 3 COUNTS BINDINGS RATHER THAN WATCHING FOCUS ------------------------------------
 *
 * The honest reason, measured before this file was written: a leaked listener is INVISIBLE to a
 * pure focus assertion here. The stale handler does fire, and it does run `activateTrap()` against
 * the closed modal's detached node — but `moveFocusInside` finds nothing focusable in a subtree that
 * is not in the document, so `document.activeElement` is identical either way. Asserting only on
 * focus would have produced a test that passed against the defect. What is observable is the state
 * the document is left in, so that is what test 3 asserts, and test 4 asserts the other half — that
 * the event still reaches, and still writes to, a component Vue has already destroyed.
 *
 * ---- WHAT IS LIVE AND WHAT IS LATENT ----------------------------------------------------------
 *
 * Stated plainly because half of this defect is not a live regression. `Modal.vue` renders
 * `<focus-trap>` with NO props, so `returnFocus` is `false` at every call site in the repository:
 * test 6 is a latent contract, correct from the moment any consumer passes the prop, and nothing is
 * misbehaving on that path today. Tests 3 and 4 are live on every admin route. Test 5 is live
 * wherever two traps are mounted at once, which `AdminPage.vue` makes reachable — its LoginModal
 * sits on the same tree as the page's own modals.
 *
 * ---- ONE SCENARIO THIS DELIBERATELY DOES NOT ASSERT, AND WHY ----------------------------------
 *
 * "Open a modal, close it, open a second, check focus lands inside the second" is the obvious way to
 * write the focus-correctness half of this, and it is WRONG: it passes against the defect. Measured
 * both ways (`lanes/L-FOCUSTRAP-TEARDOWN/02-sequential-vs-stacked.txt`) — broken and fixed both land
 * focus on `second-in`. `mounted` does `instances.push(this.data)` and `reducePropsToState` takes
 * `.slice(-1)[0]`, so a trap that mounts AFTER a stale entry is appended after it and wins the
 * selection regardless; the stale entry is only ever consulted when nothing live was pushed after
 * it. That is why test 5 destroys the trap that was pushed LAST while an earlier one is still on
 * screen — the one arrangement in which the stale entry actually decides. Same defect, and the
 * difference between the two framings is a test that catches it and a test that does not.
 */
import fs from 'fs'
import path from 'path'
import { version as VUE_VERSION } from 'vue'
import { mount } from '@vue/test-utils'

const ROOT = path.resolve(__dirname, '..')

/**
 * FocusTrap keeps `instances`, `lastActiveTrap` and `lastActiveFocus` at module scope, so one test's
 * leftovers are the next test's starting conditions — and under the defect nothing is ever cleaned
 * up, which would let an earlier test's residue decide a later one. Each test gets its own copy of
 * the module so that what it observes was caused inside it.
 */
function freshTrap () {
  let Trap
  jest.isolateModules(() => {
    Trap = require('~/components/molecules/FocusTrap.vue')
  })
  return Trap.default || Trap
}

/**
 * What is bound to `document`/`window` right now. jsdom exposes no listener registry, so the only
 * way to know is to watch both doors; the value asserted on is the resulting SET of bindings, which
 * is a property of the document and outlives the component that registered it.
 */
function bindings () {
  const live = new Set()
  const real = {
    da: document.addEventListener.bind(document),
    dr: document.removeEventListener.bind(document),
    wa: window.addEventListener.bind(window),
    wr: window.removeEventListener.bind(window)
  }
  document.addEventListener = (t, f, c) => { live.add(`document.${t}`); return real.da(t, f, c) }
  document.removeEventListener = (t, f, c) => { live.delete(`document.${t}`); return real.dr(t, f, c) }
  window.addEventListener = (t, f, c) => { live.add(`window.${t}`); return real.wa(t, f, c) }
  window.removeEventListener = (t, f, c) => { live.delete(`window.${t}`); return real.wr(t, f, c) }
  return {
    focusRelated: () => [...live].filter(k => /focusin|focusout|window\.blur/.test(k)).sort(),
    restore: () => {
      document.addEventListener = real.da
      document.removeEventListener = real.dr
      window.addEventListener = real.wa
      window.removeEventListener = real.wr
    }
  }
}

function buttonInBody (id) {
  const el = document.createElement('button')
  el.id = id
  el.textContent = id
  document.body.appendChild(el)
  return el
}

const settle = () => new Promise(resolve => setTimeout(resolve, 10))

// ---- the estate sweep -------------------------------------------------------------------------

/** The comment above names `unmounted` on purpose; only real option keys are breaches. */
function stripComments (source) {
  return source.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * Options-API hooks that exist in Vue 3 and NOT in Vue 2.7. EXACTLY two names, and the count is the
 * point: 2.7's `LIFECYCLE_HOOKS` is 14 entries and two of them — `renderTracked` and
 * `renderTriggered` — are Vue 3 names that 2.7 really does call. "Looks like Vue 3" is therefore not
 * the test; being absent from this runtime is, and only `unmounted` and `beforeUnmount` are.
 *
 * Deliberately case-sensitive and boundary-anchored on top of that: 2.7 backports the composition
 * API, so `onUnmounted` / `onBeforeUnmount` imported from `vue` ARE called here. Their capital U/B
 * is what keeps them out of this pattern, so do not make it case-insensitive.
 */
const VUE3_ONLY_HOOK = /(^|[^A-Za-z0-9_$.])['"]?(unmounted|beforeUnmount)['"]?\s*(\(|:)/m

function vueFilesUnder (dirs) {
  const found = []
  const walk = (dir) => {
    if (!fs.existsSync(dir)) { return }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { walk(full) } else if (entry.name.endsWith('.vue')) { found.push(full) }
    }
  }
  dirs.forEach(d => walk(path.join(ROOT, d)))
  return found
}

// ---- the tests --------------------------------------------------------------------------------

describe('the hook name FocusTrap released through', () => {
  test('Vue 2.7 calls `destroyed` and does not call `unmounted`, silently', () => {
    const calls = []
    const Fixture = {
      template: '<div />',
      destroyed () { calls.push('destroyed') },
      unmounted () { calls.push('unmounted') }
    }
    const warn = jest.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mount(Fixture)
    const options = wrapper.vm.$options
    wrapper.destroy()

    // Asserted from the runtime rather than from package.json, which declares a range (^2.6.14) the
    // installed tree does not match.
    expect(VUE_VERSION).toBe('2.7.14')
    expect(calls).toEqual(['destroyed'])

    // The shape difference behind the silence. A real hook is merged into an array by `mergeHook`;
    // an unrecognised key keeps whatever it was handed. `unmounted` is still the raw function it was
    // written as, which is what "the framework never saw it as a hook" looks like from the inside.
    expect(Array.isArray(options.destroyed)).toBe(true)
    expect(typeof options.unmounted).toBe('function')

    // And nothing tells you — no error, no warning, at any level. This is why reading the file was
    // the only way it was ever going to be found.
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  test('no component in the estate declares a lifecycle hook this Vue never calls', () => {
    const files = vueFilesUnder(['components', 'pages', 'layouts'])
    // A walker that found nothing would read exactly like a clean estate.
    expect(files.length).toBeGreaterThan(100)

    const offenders = files
      .filter(f => VUE3_ONLY_HOOK.test(stripComments(fs.readFileSync(f, 'utf8'))))
      .map(f => path.relative(ROOT, f))

    expect(offenders).toEqual([])
  })
})

describe('what the focus trap releases when it is destroyed', () => {
  afterEach(() => { document.body.innerHTML = '' })

  test('the document is left carrying no focus handlers once the last trap is gone', async () => {
    const doc = bindings()
    try {
      const trap = mount(freshTrap(), { attachTo: document.body })
      // The trap does install them, or the release would have nothing to prove.
      expect(doc.focusRelated()).toEqual(['document.focusin', 'document.focusout', 'window.blur'])

      trap.destroy()
      await settle()

      expect(doc.focusRelated()).toEqual([])
    } finally {
      doc.restore()
    }
  })

  test('a focus event on the page no longer reaches a trap Vue has destroyed', async () => {
    const elsewhere = buttonInBody('elsewhere')
    const trap = mount(freshTrap(), {
      slots: { default: '<button id="inside">inside</button>' },
      attachTo: document.body
    })
    const vm = trap.vm

    trap.destroy()
    await settle()

    // `originalFocusedElement` is a LATCH, and it is written at MOUNT, not at close: mounting
    // activates the trap, which records what had focus before it took over (`<body>` here). So
    // "is it set?" cannot distinguish a live trap from a dead one — asserting that directly gives a
    // test that reds both before and after the fix, which is how this one was first written.
    // Clearing it is what makes a SECOND write visible, and a second write is the whole claim:
    // an event that arrives after `destroy()` and still finds this component.
    vm.originalFocusedElement = undefined

    // Somebody clicks into the page the closed modal used to cover.
    elsewhere.focus()
    document.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }))
    await settle()

    // A value here means the closed modal's component is still retained by `instances` AND still
    // being driven by a document-level handler nobody removed.
    expect(vm.originalFocusedElement).toBeUndefined()
    expect(document.activeElement).toBe(elsewhere)
  })

  test('closing the top trap hands governance back to the one still on screen', async () => {
    const Trap = freshTrap()
    const behind = mount(Trap, {
      slots: { default: '<button id="behind-inside">behind</button>' },
      attachTo: document.body
    })
    const above = mount(Trap, {
      slots: { default: '<button id="above-inside">above</button>' },
      attachTo: document.body
    })
    const outside = buttonInBody('outside')

    above.destroy()
    await settle()

    // Focus escapes to something outside every trap; the modal still on screen must claim it back.
    outside.focus()
    document.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }))
    await settle()

    expect(document.activeElement.id).toBe('behind-inside')
    behind.destroy()
  })

  test('returnFocus puts focus back on the element that opened the trap', async () => {
    // LATENT, not a live regression: `Modal.vue` passes no props, so `returnFocus` is false at every
    // call site today. This holds the contract for the first consumer that passes it.
    const opener = buttonInBody('opener')
    opener.focus()
    expect(document.activeElement).toBe(opener)

    const trap = mount(freshTrap(), {
      propsData: { returnFocus: true },
      slots: { default: '<button id="inside">inside</button>' },
      attachTo: document.body
    })
    document.getElementById('inside').focus()
    expect(document.activeElement.id).toBe('inside')

    trap.destroy()
    await settle()

    expect(document.activeElement).toBe(opener)
  })
})

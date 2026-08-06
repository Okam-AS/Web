import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import FeatureFlagsPage from '~/pages/admin/feature-flags.vue'
import translations from '~/translations'

const calls = []
// Per-method overrides a test installs to make one call fail or answer differently.
const behaviour = {}

// The page builds its client in a computed, so the module is mocked rather than the instance. Every
// call is recorded, because WHICH requests each control issues is the part of this page that is a
// contract with the backend rather than a rendering choice.
jest.mock('~/utils/platform/feature-flags-client', () => ({
  isPlatformApiError: error => !!(error && error.isPlatformApiError),
  StoreFeatureFlagReader: class {
    _call (name, args, fallback) {
      calls.push([name].concat(args))
      const override = behaviour[name]
      if (typeof override === 'function') { return override.apply(null, args) }
      return Promise.resolve(fallback)
    }

    GetCatalog () { return this._call('GetCatalog', [], CATALOG) }
    GetStoreFlags (storeId) { return this._call('GetStoreFlags', [storeId], STATES) }
    SetStoreFlag (storeId, key, enabled, note) {
      return this._call('SetStoreFlag', [storeId, key, enabled, note], {
        flagKey: key,
        module: 'Workforce',
        title: 'Schedule publication',
        defaultEnabled: false,
        isOverridden: true,
        overrideEnabled: enabled,
        effective: enabled,
        updatedByReference: 'user-manager',
        updatedAtUtc: '2026-08-01T10:00:00Z',
        note: note || null
      })
    }

    ClearStoreFlag (storeId, key) { return this._call('ClearStoreFlag', [storeId, key], { flagKey: key, cleared: true }) }
  }
}))

const CATALOG = [
  { flagKey: 'workforce.publication', module: 'Workforce', title: 'Schedule publication', defaultEnabled: false },
  { flagKey: 'Margin.Module', module: 'Margin', title: 'Module', defaultEnabled: false }
]

const STATES = [
  {
    flagKey: 'workforce.publication',
    module: 'Workforce',
    title: 'Schedule publication',
    defaultEnabled: false,
    isOverridden: false,
    overrideEnabled: false,
    effective: false,
    updatedByReference: null,
    updatedAtUtc: null,
    note: null
  },
  {
    flagKey: 'Margin.Module',
    module: 'Margin',
    title: 'Module',
    defaultEnabled: false,
    isOverridden: true,
    overrideEnabled: true,
    effective: false,
    updatedByReference: 'user-9',
    updatedAtUtc: '2026-07-30T08:00:00Z',
    note: 'pilot'
  }
]

// The Events deposit flag, added through per-test overrides rather than to the shared fixtures above,
// so the row counts the sibling tests assert stay the numbers those tests chose.
const DEPOSITS_KEY = 'Events.Deposits'
const DEPOSITS_CATALOG = CATALOG.concat([
  { flagKey: DEPOSITS_KEY, module: 'Events', title: 'Deposit money path', defaultEnabled: false }
])
const DEPOSITS_STATES = STATES.concat([
  {
    flagKey: DEPOSITS_KEY,
    module: 'Events',
    title: 'Deposit money path',
    defaultEnabled: false,
    isOverridden: false,
    overrideEnabled: false,
    effective: false,
    updatedByReference: null,
    updatedAtUtc: null,
    note: null
  }
])

const withDeposits = () => {
  behaviour.GetCatalog = () => Promise.resolve(DEPOSITS_CATALOG)
  behaviour.GetStoreFlags = () => Promise.resolve(DEPOSITS_STATES)
}

const settled = () => new Promise(resolve => setTimeout(resolve, 0))
const callsTo = name => calls.filter(c => c[0] === name)
/** The one `.ff-row` whose key cell is `flagKey`. */
const rowFor = (wrapper, flagKey) =>
  wrapper.findAll('.ff-row').wrappers.find(row => row.find('.ff-row__key').text() === flagKey)

// A refusal in the shape `PlatformApiError` produces: a real Error (so the page's own `e.message`
// path is the one under test) carrying the transpile-proof discriminator and the status.
const refusal = (status, message) =>
  Object.assign(new Error(message), { isPlatformApiError: true, status })

function mountPage () {
  return shallowMount(FeatureFlagsPage, {
    mocks: {
      $i: (key, params) => (params ? key + ':' + JSON.stringify(params) : key),
      $store: {
        getters: { userIsLoggedIn: true },
        state: { selectedAdminStore: 42, adminLocale: 'no', currentUser: { id: 1, adminIn: [{ id: 42 }] } }
      },
      // The Core initializer the global mixin normally supplies. `core/` is an uninitialised
      // submodule by design, so plugins/global-mixin.js can never load in a test; only
      // `bearerToken` is ever read from it.
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' }, NuxtLink: true }
  })
}

beforeEach(() => {
  calls.length = 0
  Object.keys(behaviour).forEach(key => delete behaviour[key])
})

describe('the lever exists and reaches the routes', () => {
  test('the page reads the catalog and the store on mount', async () => {
    mountPage()
    await settled()
    expect(callsTo('GetCatalog')).toHaveLength(1)
    expect(callsTo('GetStoreFlags')).toEqual([['GetStoreFlags', 42]])
  })

  test('every catalog flag is drawn, grouped by its owning module', async () => {
    const wrapper = mountPage()
    await settled()
    expect(wrapper.findAll('.ff-row')).toHaveLength(2)
    expect(wrapper.findAll('.ff-module__title').at(0).text()).toBe('Margin')
    expect(wrapper.findAll('.ff-module__title').at(1).text()).toBe('Workforce')
  })

  // THE POINT OF THE WHOLE LANE. Before this page, `PUT /stores/{id}/feature-flags` had no caller in
  // the frontend at all: every stage flag on six modules was curl-only.
  test('turning a flag on sends the PUT the frontend previously never sent', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.find('[data-flag-on="workforce.publication"]').trigger('click')
    await settled()
    expect(callsTo('SetStoreFlag')).toEqual([['SetStoreFlag', 42, 'workforce.publication', true, null]])
  })

  test('turning a flag off sends the same route with enabled false', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.find('[data-flag-off="workforce.publication"]').trigger('click')
    await settled()
    expect(callsTo('SetStoreFlag')).toEqual([['SetStoreFlag', 42, 'workforce.publication', false, null]])
  })

  test('the operator\'s reason travels with the write', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ notes: Object.assign({}, wrapper.vm.notes, { 'workforce.publication': 'incident 4412' }) })
    await settled()
    wrapper.find('[data-flag-off="workforce.publication"]').trigger('click')
    await settled()
    expect(callsTo('SetStoreFlag')[0][4]).toBe('incident 4412')
  })

  test('the note box is prefilled with the reason already on the override', async () => {
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.notes['Margin.Module']).toBe('pilot')
    expect(wrapper.vm.notes['workforce.publication']).toBe('')
  })

  // The clear button is offered only where there is an override to remove — a "remove override" on a
  // flag that has none is a control whose only possible outcome is `cleared:false`.
  test('clearing is offered only for an overridden flag, and re-reads afterwards', async () => {
    const wrapper = mountPage()
    await settled()
    expect(wrapper.find('[data-flag-clear="workforce.publication"]').exists()).toBe(false)

    wrapper.find('[data-flag-clear="Margin.Module"]').trigger('click')
    await settled()
    expect(callsTo('ClearStoreFlag')).toEqual([['ClearStoreFlag', 42, 'Margin.Module']])
    // The DELETE answers `{ flagKey, cleared }` and NOT the resulting state, so the store is read
    // again rather than the module default being assumed. Two reads: the mount and this one.
    expect(callsTo('GetStoreFlags')).toHaveLength(2)
  })

  test('a clear that removed nothing says so instead of claiming a change', async () => {
    behaviour.ClearStoreFlag = (_storeId, key) => Promise.resolve({ flagKey: key, cleared: false })
    const wrapper = mountPage()
    await settled()
    wrapper.find('[data-flag-clear="Margin.Module"]').trigger('click')
    await settled()
    expect(wrapper.vm.toast.message).toContain('ff_clear_none')
  })
})

describe('the page adopts what the server said, never what it asked for', () => {
  // Writing a stage flag ON does not make it effective if the module's gate ANDs it under a master
  // that is off. The server reports that disagreement on the write response; re-deriving the row
  // from the request would erase the single most useful thing this page shows.
  test('a write answered with effective:false renders as overruled, not as on', async () => {
    behaviour.SetStoreFlag = (_storeId, key, enabled) => Promise.resolve({
      flagKey: key,
      module: 'Workforce',
      title: 'Schedule publication',
      defaultEnabled: false,
      isOverridden: true,
      overrideEnabled: enabled,
      // The master is down. The row is on, the gate still says no.
      effective: false
    })
    const wrapper = mountPage()
    await settled()
    wrapper.find('[data-flag-on="workforce.publication"]').trigger('click')
    await settled()

    const row = wrapper.vm.board.rows.find(r => r.flagKey === 'workforce.publication')
    expect(row.state).toBe(true)
    expect(row.effective).toBe(false)
    expect(wrapper.text()).toContain('ff_overruled')
  })

  test('a successful write is reflected without another read', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.find('[data-flag-on="workforce.publication"]').trigger('click')
    await settled()
    expect(callsTo('GetStoreFlags')).toHaveLength(1)
    expect(wrapper.vm.board.rows.find(r => r.flagKey === 'workforce.publication').state).toBe(true)
  })
})

describe('what it refuses to claim', () => {
  test('a 403 on the store read blocks the page and does not say the store is missing', async () => {
    behaviour.GetStoreFlags = () => Promise.reject(refusal(403, 'HTTP 403'))
    const wrapper = mountPage()
    await settled()
    expect(wrapper.find('.ff-page__blocker').text()).toBe('ff_forbidden')
    expect(wrapper.findAll('.ff-row')).toHaveLength(0)
    // `ff_forbidden` is the ONE sentence for both things a 403 means. Asserting the copy itself,
    // because a future rewording that named a missing store would be a §concealment leak.
    expect(translations.no.ff_forbidden).not.toMatch(/finnes ikke|ikke funnet/i)
  })

  test('a store read that failed for any other reason leaves the flags unknown, not off', async () => {
    behaviour.GetStoreFlags = () => Promise.reject(refusal(500, 'boom'))
    const wrapper = mountPage()
    await settled()
    expect(wrapper.find('.ff-page__blocker').exists()).toBe(false)
    expect(wrapper.vm.boardUnknown).toBe(true)
    expect(wrapper.text()).toContain('ff_read_failed')
    expect(wrapper.findAll('.ff-row')).toHaveLength(0)
  })

  test('a failed catalog read still draws the board, and says writability is unknown', async () => {
    behaviour.GetCatalog = () => Promise.reject(new Error('offline'))
    const wrapper = mountPage()
    await settled()
    expect(wrapper.findAll('.ff-row')).toHaveLength(2)
    expect(wrapper.text()).toContain('ff_catalog_unknown')
  })

  // A key the catalog does not carry answers 400 on the PUT. Drawing a toggle for it would be an
  // affordance certain to be refused — which is the defect this whole lane exists to remove, one
  // level down.
  test('a flag outside the catalog gets no toggle at all', async () => {
    behaviour.GetCatalog = () => Promise.resolve([CATALOG[0]])
    const wrapper = mountPage()
    await settled()
    expect(wrapper.find('[data-flag-on="Margin.Module"]').exists()).toBe(false)
    expect(wrapper.find('[data-flag-on="workforce.publication"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('ff_not_writable')
  })

  test('a refused write shows the server\'s own sentence, and the row is not changed', async () => {
    behaviour.SetStoreFlag = () => Promise.reject(refusal(400, 'Unknown feature flag: workforce.publication'))
    const wrapper = mountPage()
    await settled()
    wrapper.find('[data-flag-on="workforce.publication"]').trigger('click')
    await settled()
    expect(wrapper.vm.toast.message).toBe('Unknown feature flag: workforce.publication')
    expect(wrapper.vm.toast.type).toBe('error')
    expect(wrapper.vm.board.rows.find(r => r.flagKey === 'workforce.publication').state).toBe(false)
  })
})

// The standing honesty statement. `effective` is the module gate's answer and it is ASYMMETRIC: an
// `effective: off` can be relied on, an `effective: on` cannot, because some modules also sit under a
// deployment-wide config switch (`Growth:Enabled`, `Events:Enabled`, `Margin` config) that no
// endpoint exposes and this page therefore cannot see. The page says that once, at the top, rather
// than leaving every operator to discover it by pressing a button.
//
// WHY THIS IS ASSERTED ON CONTENT. The test that stood here read
// `expect(translations.no.ff_effective_note).toBeTruthy()` in three locales — an assertion with no
// way to fail. A non-empty string is all it ever wanted, so it stayed green through both of the only
// two ways this note can go wrong: reworded to claim the OPPOSITE (that an `effective: on` is the
// dependable one), and removed from the template entirely. Both are pinned below, and the direction
// of the claim is pinned to the VALUE it is made about, so swapping "on" and "off" reds it.
describe('the standing honesty statement is on the screen, and says what it says', () => {
  // Each locale's copy, by the obligation it carries. The last two are the load-bearing ones: they
  // bind "can be relied on" to OFF and "is not a promise" to ON, as adjacent text, so a rewrite that
  // keeps every word and only exchanges the two values cannot satisfy them.
  const EFFECTIVE_NOTE_SAYS = {
    no: {
      'says whose answer «faktisk» is': [/modulens egen port/i],
      'names the switch this page cannot see': [/driftsbryter/i, /serveroppsettet/i, /ikke ser/i],
      'binds "can be relied on" to OFF': [/«faktisk: av» til å stole på/i],
      'binds "is not a promise" to ON': [/«faktisk: på» ikke er et løfte/i]
    },
    en: {
      'says whose answer "effective" is': [/module's own gate/i],
      'names the switch this page cannot see': [/deployment switch/i, /server configuration/i, /cannot see/i],
      'binds "can be relied on" to OFF': [/"effective: off" can be relied on/i],
      'binds "is not a promise" to ON': [/"effective: on" is not a promise/i]
    },
    de: {
      'says whose answer «effektiv» is': [/modul-eigenen Prüfung/i],
      'names the switch this page cannot see': [/Betriebsschalter/i, /Serverkonfiguration/i, /nicht sieht/i],
      'binds "can be relied on" to OFF': [/«Effektiv: aus» ist deshalb verlässlich/i],
      'binds "is not a promise" to ON': [/«effektiv: an» dagegen kein Versprechen/i]
    }
  }

  test.each(['no', 'en', 'de'])('%s says an effective:off is dependable and an effective:on is not', (locale) => {
    const text = translations[locale].ff_effective_note
    expect(typeof text).toBe('string')
    Object.keys(EFFECTIVE_NOTE_SAYS[locale]).forEach((obligation) => {
      EFFECTIVE_NOTE_SAYS[locale][obligation].forEach((pattern) => {
        expect({ obligation, text }).toEqual({ obligation, text: expect.stringMatching(pattern) })
      })
    })
  })

  // Copy nobody renders is copy nobody reads. The three locale tests above pass on the translation
  // file alone, so this one mounts the page and looks for the sentence in the DOM.
  test('the page actually renders the note, above the first row', async () => {
    const wrapper = mountPage()
    await settled()

    const notice = wrapper.findAll('.ff-page__notice').wrappers
      .find(p => p.text() === 'ff_effective_note')
    expect(notice).toBeDefined()

    // BEFORE the rows, not after them: an operator who has already read a badge has drawn the
    // conclusion this sentence exists to prevent.
    const html = wrapper.html()
    expect(wrapper.findAll('.ff-row').length).toBeGreaterThan(0)
    expect(html.indexOf('ff_effective_note')).toBeGreaterThan(-1)
    expect(html.indexOf('ff_effective_note')).toBeLessThan(html.indexOf('ff-row'))
  })

  // It is the PAGE's statement about what `effective` means, not a property of any one flag. Printed
  // per row it would be eighteen repetitions of a sentence nobody would then read — the same reason
  // the deposits precondition is on exactly one row and not on all of them.
  test('the note is stated once, and never on a row', async () => {
    withDeposits()
    const wrapper = mountPage()
    await settled()

    expect(wrapper.html().split('ff_effective_note')).toHaveLength(2)
    wrapper.findAll('.ff-row').wrappers.forEach((row) => {
      expect(row.text()).not.toContain('ff_effective_note')
    })
  })

  // The moment the note matters most is the one where the board is empty: a store read that failed
  // leaves every value unknown, and an operator staring at no rows still has to know that the values
  // this page would have shown are asymmetric. A note that renders only on the happy path is a note
  // missing from every incident.
  test('the note survives a failed store read, when no row is drawn at all', async () => {
    behaviour.GetStoreFlags = () => Promise.reject(refusal(500, 'boom'))
    const wrapper = mountPage()
    await settled()

    expect(wrapper.findAll('.ff-row')).toHaveLength(0)
    expect(wrapper.text()).toContain('ff_read_failed')
    expect(wrapper.findAll('.ff-page__notice').wrappers
      .some(p => p.text() === 'ff_effective_note')).toBe(true)
  })
})

// Arming `Events.Deposits` opens a money path, and its owner (`EventsFeatureFlags.Deposits`) states a
// precondition nothing enforces: the store's payment-provider configuration must already have
// processed live orders, and arming it for one that never took a live payment "is currently possible
// and is a procedural failure, not a technical one". That was tolerable while the only way to arm it
// was a curl. This page made it one click, so the sentence has to be on the row.
describe('the deposit switch names what must be true before it is thrown', () => {
  test('the precondition is on the deposits row, above that row\'s own switch', async () => {
    withDeposits()
    const wrapper = mountPage()
    await settled()

    const row = rowFor(wrapper, DEPOSITS_KEY)
    expect(row).toBeDefined()
    const note = row.find('[data-precondition="' + DEPOSITS_KEY + '"]')
    expect(note.exists()).toBe(true)
    expect(note.text()).toBe('ff_precondition_events_deposits')

    // ABOVE the control, not below it: an operator who has already clicked has not been told
    // anything. Order within the row's own markup, so it cannot be satisfied by a note elsewhere.
    const html = row.html()
    expect(html.indexOf('data-precondition')).toBeGreaterThan(-1)
    expect(html.indexOf('data-flag-on')).toBeGreaterThan(-1)
    expect(html.indexOf('data-precondition')).toBeLessThan(html.indexOf('data-flag-on'))
  })

  // A sentence printed on every row is a sentence nobody reads, and on seventeen of them it would be
  // a false claim about a flag whose owner states no such precondition.
  test('no other flag row claims a precondition', async () => {
    withDeposits()
    const wrapper = mountPage()
    await settled()

    expect(wrapper.findAll('[data-precondition]')).toHaveLength(1)
    expect(rowFor(wrapper, 'workforce.publication').find('[data-precondition]').exists()).toBe(false)
    expect(rowFor(wrapper, 'Margin.Module').find('[data-precondition]').exists()).toBe(false)
  })

  // The row still renders it when the store read did not carry the key (state unknown) — the
  // precondition is a property of the FLAG, not of a value this store happens to have.
  test('the precondition survives a store read that never mentioned the flag', async () => {
    behaviour.GetCatalog = () => Promise.resolve(DEPOSITS_CATALOG)
    behaviour.GetStoreFlags = () => Promise.resolve(STATES)
    const wrapper = mountPage()
    await settled()

    const row = rowFor(wrapper, DEPOSITS_KEY)
    expect(row.text()).toContain('ff_state_unknown_row')
    expect(row.find('[data-precondition="' + DEPOSITS_KEY + '"]').exists()).toBe(true)
  })

  // The copy itself, in every locale, asserted on its CONTENT. Three obligations, and the third is
  // the one that keeps this a disclosure: the page must not promise a refusal the API will not make.
  // Nothing in the estate defines "proven merchant configuration", so no code — here or in the API —
  // can block this write, and saying otherwise would be inventing a ruling nobody has made.
  const PRECONDITION_SAYS = {
    no: {
      'names the precondition': [/ekte bestillinger/i, /betalingsoppsett/i],
      'says nothing here checks it': [/ingenting her sjekker det/i],
      'says arming it anyway still goes through': [/går gjennom/i]
    },
    en: {
      'names the precondition': [/live orders/i, /payment setup/i],
      'says nothing here checks it': [/nothing here checks it/i],
      'says arming it anyway still goes through': [/will succeed/i]
    },
    de: {
      'names the precondition': [/echte Bestellungen/i, /Zahlungskonfiguration/i],
      'says nothing here checks it': [/nicht geprüft/i],
      'says arming it anyway still goes through': [/geht das Einschalten trotzdem durch/i]
    }
  }

  test.each(['no', 'en', 'de'])('%s states the precondition, that it is unchecked, and that arming still succeeds', (locale) => {
    const text = translations[locale].ff_precondition_events_deposits
    expect(typeof text).toBe('string')
    Object.keys(PRECONDITION_SAYS[locale]).forEach((obligation) => {
      PRECONDITION_SAYS[locale][obligation].forEach((pattern) => {
        expect({ obligation, text }).toEqual({ obligation, text: expect.stringMatching(pattern) })
      })
    })
  })
})

// TRAINING'S "OFF" IS NOT THE ONE THE WORD SUGGESTS, and this page is where somebody presses it.
//
// `TrainingModuleGate` (backend `feature/restaurant-modules`) routes reads through
// `EnsureVisibleAsync`, which consults no flag beyond visibility, and writes through
// `EnsureWritableAsync(flag)`, which throws `FlagDisabledReadOnly` — 409
// `training.flag-disabled-read-only` — when the flag is off on a visible store. Visible means
// `training.setup` on OR any Training row already exists for the store. So off refuses the write and
// leaves the lists, the form and its live submit exactly as they were; the
// `training-course-to-evidence` journey walks that state and its own step is named
// "READ-ONLY, NOT DARK". An operator flipping this during an incident expects the module to go away.
//
// The two rows are asserted to say DIFFERENT things, because their gates differ: `training.setup` is
// half of the visibility test and `training.assignments` is no part of it. One shared sentence would
// have to be wrong about one of them.
describe('the Training rows say what their switch being off actually does', () => {
  const SETUP_KEY = 'training.setup'
  const ASSIGN_KEY = 'training.assignments'

  const TRAINING_CATALOG = CATALOG.concat([
    { flagKey: SETUP_KEY, module: 'Training', title: 'Setup (courses/certificates)', defaultEnabled: false },
    { flagKey: ASSIGN_KEY, module: 'Training', title: 'Assignments', defaultEnabled: false }
  ])
  // Deliberately one ON and one OFF. What off does is a standing property of the flag, so the
  // sentence has to be readable BEFORE the value changes — a note that appears only once the row is
  // already off is a note that arrives after the click it existed to inform.
  const trainingState = (flagKey, title, on) => ({
    flagKey,
    module: 'Training',
    title,
    defaultEnabled: false,
    isOverridden: on,
    overrideEnabled: on,
    effective: on,
    updatedByReference: on ? 'user-3' : null,
    updatedAtUtc: on ? '2026-08-02T09:00:00Z' : null,
    note: null
  })
  const TRAINING_STATES = STATES.concat([
    trainingState(SETUP_KEY, 'Setup (courses/certificates)', true),
    trainingState(ASSIGN_KEY, 'Assignments', false)
  ])

  const withTraining = () => {
    behaviour.GetCatalog = () => Promise.resolve(TRAINING_CATALOG)
    behaviour.GetStoreFlags = () => Promise.resolve(TRAINING_STATES)
  }

  test.each([
    [SETUP_KEY, 'ff_off_training_setup'],
    [ASSIGN_KEY, 'ff_off_training_assignments']
  ])('%s carries its own sentence, above that row\'s own switch', async (flagKey, expected) => {
    withTraining()
    const wrapper = mountPage()
    await settled()

    const row = rowFor(wrapper, flagKey)
    expect(row).toBeDefined()
    const note = row.find('[data-off-meaning="' + flagKey + '"]')
    expect(note.exists()).toBe(true)
    expect(note.text()).toBe(expected)

    // Above the control, within the row's own markup: an operator who has already clicked has not
    // been warned of anything, and a sentence elsewhere on the page cannot satisfy this.
    const html = row.html()
    expect(html.indexOf('data-off-meaning')).toBeGreaterThan(-1)
    expect(html.indexOf('data-flag-off')).toBeGreaterThan(-1)
    expect(html.indexOf('data-off-meaning')).toBeLessThan(html.indexOf('data-flag-off'))
  })

  // The setup flag is rendered ON by the fixture above and still carries the sentence. This is the
  // test that would red if the note were ever made conditional on `row.state`, which would hide it
  // from precisely the operator who is about to turn the flag off.
  test('the sentence is on the row whether the switch is on or off', async () => {
    withTraining()
    const wrapper = mountPage()
    await settled()

    expect(rowFor(wrapper, SETUP_KEY).find('.ff-row__badge').text()).toBe('ff_state_on')
    expect(rowFor(wrapper, SETUP_KEY).find('[data-off-meaning]').exists()).toBe(true)
    expect(rowFor(wrapper, ASSIGN_KEY).find('.ff-row__badge').text()).toBe('ff_state_off')
    expect(rowFor(wrapper, ASSIGN_KEY).find('[data-off-meaning]').exists()).toBe(true)
  })

  // Their gates differ, so one shared sentence would be wrong about one of them: only
  // `training.setup` is part of the visibility test, and only it can take the module dark.
  test('the two Training rows do not share one sentence', async () => {
    withTraining()
    const wrapper = mountPage()
    await settled()

    const setup = rowFor(wrapper, SETUP_KEY).find('[data-off-meaning]').text()
    const assignments = rowFor(wrapper, ASSIGN_KEY).find('[data-off-meaning]').text()
    expect(setup).not.toBe(assignments)
  })

  // Five `training.*` flags are withheld from the catalog because they gate nothing, and the other
  // five modules' gates answer differently — `Events.Core` off is a 404 that takes the module dark.
  // A behaviour claim printed on a row whose gate nobody read would be the defect this lane fixes,
  // pointing the other way.
  test('no row outside Training claims anything about what its off does', async () => {
    behaviour.GetCatalog = () => Promise.resolve(TRAINING_CATALOG.concat(
      [{ flagKey: DEPOSITS_KEY, module: 'Events', title: 'Deposit money path', defaultEnabled: false }]))
    behaviour.GetStoreFlags = () => Promise.resolve(TRAINING_STATES.concat(DEPOSITS_STATES.slice(-1)))
    const wrapper = mountPage()
    await settled()

    expect(wrapper.findAll('[data-off-meaning]')).toHaveLength(2)
    expect(rowFor(wrapper, 'workforce.publication').find('[data-off-meaning]').exists()).toBe(false)
    expect(rowFor(wrapper, 'Margin.Module').find('[data-off-meaning]').exists()).toBe(false)
    expect(rowFor(wrapper, DEPOSITS_KEY).find('[data-off-meaning]').exists()).toBe(false)
  })

  // A property of the FLAG, not of a value this store happens to hold. The store read failing to
  // carry the key leaves the state unknown — and the behaviour of off is exactly as true.
  test('the sentence survives a store read that never mentioned the key', async () => {
    behaviour.GetCatalog = () => Promise.resolve(TRAINING_CATALOG)
    behaviour.GetStoreFlags = () => Promise.resolve(STATES)
    const wrapper = mountPage()
    await settled()

    const row = rowFor(wrapper, SETUP_KEY)
    expect(row.text()).toContain('ff_state_unknown_row')
    expect(row.find('[data-off-meaning="' + SETUP_KEY + '"]').exists()).toBe(true)
  })

  // The copy, per locale, asserted obligation by obligation. Each one is a fact read out of the gate
  // rather than a tone: writes refused, reads still served, the submit still live (which is the part
  // that surprises), and the one case per flag where that summary stops being the whole truth.
  const SETUP_SAYS = {
    no: {
      'says writes are refused': [/avvises skriving/i],
      'says reading continues': [/lesing fortsetter/i],
      'says the form and its submit stay live': [/lagreknappen er aktiv/i, /når du trykker/i],
      'names the store that does go dark': [/aldri har registrert/i, /finnes ikke/i]
    },
    en: {
      'says writes are refused': [/writes are refused/i],
      'says reading continues': [/reads keep serving/i],
      'says the form and its submit stay live': [/save button is live/i, /when you press it/i],
      'names the store that does go dark': [/never recorded/i, /not found/i]
    },
    de: {
      'says writes are refused': [/Schreibvorgänge abgewiesen/i],
      'says reading continues': [/gelesen wird weiter/i],
      'says the form and its submit stay live': [/Schaltfläche bleibt aktiv/i, /beim Klick/i],
      'names the store that does go dark': [/noch nie Trainingsdaten/i, /nicht gefunden/i]
    }
  }

  const ASSIGNMENTS_SAYS = {
    no: {
      'says writes are refused': [/avvises skriving/i],
      'says reading continues': [/lesing fortsetter/i],
      'says the form and its submit stay live': [/lagreknappen er aktiv/i, /når du trykker/i],
      'says it does not decide visibility': [/avgjør ikke om modulen er synlig/i, /training\.setup/]
    },
    en: {
      'says writes are refused': [/writes are refused/i],
      'says reading continues': [/reads keep serving/i],
      'says the form and its submit stay live': [/save button is live/i, /when you press it/i],
      'says it does not decide visibility': [/does not decide whether the module is visible/i, /training\.setup/]
    },
    de: {
      'says writes are refused': [/Schreibvorgänge abgewiesen/i],
      'says reading continues': [/gelesen wird weiter/i],
      'says the form and its submit stay live': [/Schaltfläche bleibt aktiv/i, /beim Klick/i],
      'says it does not decide visibility': [/entscheidet nicht über die Sichtbarkeit/i, /training\.setup/]
    }
  }

  const assertSays = (text, obligations) => {
    expect(typeof text).toBe('string')
    Object.keys(obligations).forEach((obligation) => {
      obligations[obligation].forEach((pattern) => {
        expect({ obligation, text }).toEqual({ obligation, text: expect.stringMatching(pattern) })
      })
    })
  }

  test.each(['no', 'en', 'de'])('%s tells the operator what training.setup being off does', (locale) => {
    assertSays(translations[locale].ff_off_training_setup, SETUP_SAYS[locale])
  })

  test.each(['no', 'en', 'de'])('%s tells the operator what training.assignments being off does', (locale) => {
    assertSays(translations[locale].ff_off_training_assignments, ASSIGNMENTS_SAYS[locale])
  })

  // THE CLAIM THAT HAD TO GO. The intro promised, for all six modules at once, that a switch which
  // is not on "refuses writes — reads and exports of what is already recorded keep working". True of
  // Training; false of Events, whose gate answers 404 EVENTS_DISABLED and takes the module dark,
  // reads included. A promise that holds for some modules and not others is not information, and it
  // is read during exactly the incident where acting on it is worst.
  const INTRO_SAYS = {
    no: { says: [/ikke likt fra modul til modul/i, /les raden/i], never: [/lesing og eksport av det som allerede er registrert, fortsetter/i] },
    en: { says: [/not the same from one module to the next/i, /read the row/i], never: [/reads and exports of what is already recorded keep working/i] },
    de: { says: [/von Modul zu Modul verschieden/i, /lesen Sie deshalb die Zeile/i], never: [/Lesen und Exportieren von bereits Erfasstem läuft weiter/i] }
  }

  test.each(['no', 'en', 'de'])('%s intro says what off does to reading differs by module, and promises nothing fleet-wide', (locale) => {
    const text = translations[locale].ff_page_intro
    INTRO_SAYS[locale].says.forEach(pattern => expect(text).toEqual(expect.stringMatching(pattern)))
    INTRO_SAYS[locale].never.forEach(pattern => expect(text).not.toEqual(expect.stringMatching(pattern)))
  })
})

describe('every key this page prints exists in all three locales', () => {
  // The repo has shipped a missing-translation defect before, and a kill-switch page rendering a raw
  // key during an incident is the worst possible time to find one.
  const KEYS = [
    'nav_feature_flags', 'ff_page_title', 'ff_page_intro', 'ff_reload', 'ff_effective_note',
    'ff_withheld_note', 'ff_catalog_unknown', 'ff_read_failed', 'ff_forbidden', 'ff_module_unknown',
    'ff_state_on', 'ff_state_off', 'ff_state_unknown', 'ff_default_on', 'ff_default_off',
    'ff_overridden', 'ff_not_overridden', 'ff_override_unknown', 'ff_effective_on', 'ff_effective_off',
    'ff_effective_unknown', 'ff_overruled', 'ff_state_unknown_row', 'ff_not_writable',
    'ff_precondition_events_deposits', 'ff_off_training_setup', 'ff_off_training_assignments',
    'ff_note_label',
    'ff_note_placeholder', 'ff_updated_by', 'ff_actor_unknown', 'ff_turn_on', 'ff_turn_off', 'ff_clear',
    'ff_saved_on', 'ff_saved_off', 'ff_cleared', 'ff_clear_none', 'ff_generic_error',
    'wf_conflict_flag_title', 'wf_conflict_flag', 'wf_conflict_flag_unnamed', 'wf_conflict_flag_link'
  ]

  test.each(['no', 'en', 'de'])('%s', (locale) => {
    const missing = KEYS.filter(key => typeof translations[locale][key] !== 'string' || !translations[locale][key])
    expect(missing).toEqual([])
  })

  test('the interpolated keys keep their placeholders in every locale', () => {
    ['no', 'en', 'de'].forEach((locale) => {
      expect(translations[locale].ff_updated_by).toContain('{actor}')
      expect(translations[locale].ff_saved_on).toContain('{flag}')
      expect(translations[locale].ff_saved_off).toContain('{flag}')
      expect(translations[locale].ff_cleared).toContain('{flag}')
      expect(translations[locale].ff_clear_none).toContain('{flag}')
      expect(translations[locale].wf_conflict_flag).toContain('{flag}')
    })
  })
})

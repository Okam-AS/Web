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

const settled = () => new Promise(resolve => setTimeout(resolve, 0))
const callsTo = name => calls.filter(c => c[0] === name)

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

  // The standing honesty statement. `effective: true` is not a promise for the modules that also sit
  // under a deployment-wide config switch this API cannot see (Growth, Events), so the page says so
  // once rather than leaving every operator to discover it by pressing a button.
  test('the page states, in all three locales, that an effective:true is not a promise', () => {
    expect(translations.no.ff_effective_note).toBeTruthy()
    expect(translations.en.ff_effective_note).toBeTruthy()
    expect(translations.de.ff_effective_note).toBeTruthy()
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
    'ff_effective_unknown', 'ff_overruled', 'ff_state_unknown_row', 'ff_not_writable', 'ff_note_label',
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

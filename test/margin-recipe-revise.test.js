import fs from 'fs'
import path from 'path'
import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import MarginRecipesPage from '~/pages/admin/margin-recipes.vue'
import translations from '~/translations'
import { MarginApiError } from '~/utils/margin/api-client'

// WHAT A CHEF CAN DO AFTER THE RECIPE WENT LIVE, end to end and through the screen.
//
// The claim under test is a ROUND TRIP and not four controls: new draft -> edit -> activate ->
// retire, on one recipe, in one journey. Four buttons each proved on its own would not catch the
// failure this exists for — a state a recipe can be moved INTO and not out of — because every step's
// precondition is the previous step's result, and only a journey can show that the chain holds.
//
// THE WIRE IS A STATEFUL FAKE, not a per-call script, and that is the whole design. A script returns
// whatever the test author expected; a world has to be TRANSITIONED, so "activate v2" is only
// satisfiable if v1 actually leaves the Active state. The transitions below are modelled line for
// line on `MarginRecipeService` in `OkamAPI-modules`:
//
//   CreateDraftFromActiveAsync — refuses without an Active version; clones its content INCLUDING
//                                sub-recipe lines and yield factors; numbers itself max+1.
//   EditDraftAsync             — Draft only; If-Match must be the DRAFT's own revision; ASSIGNS
//                                yield, portions, notes and the whole component set (a replace, so
//                                an omitted field is a deletion); refuses a yield factor outside (0,1].
//   ActivateAsync              — Draft only; supersedes the predecessor FIRST, then activates.
//   RetireAsync                — refuses without an Active version; If-Match is the ACTIVE VERSION's
//                                revision, not the recipe header's.
//
// Every mutation bumps the row's revision, exactly as a rowversion does, so a caller that resubmits a
// token it did not re-read is refused here as it would be by SQL Server.

/**
 * The fake wire's whole state, in ONE `mock`-prefixed container.
 *
 * Not a style choice: `jest.mock` hoists its factory above every import, and babel's hoist guard
 * therefore permits the factory to reference nothing but globals and bindings whose name begins with
 * `mock`. Everything the fake needs is reached through here; the readers below are ordinary module
 * code and may close over whatever they like.
 */
const mockWire = {
  calls: [],
  world: null,
  /** Runs a transition and hands back a promise, so a refusal arrives as a rejection, not a throw. */
  run (fn) {
    try { return Promise.resolve(fn()) } catch (e) { return Promise.reject(e) }
  },
  detail () { return detailOf(mockWire.world) },
  list () { return listOf(mockWire.world) },
  ingredients () { return INGREDIENTS }
}

let revisions = 0

const NOW = '2026-03-01T12:00:00'

const clone = value => JSON.parse(JSON.stringify(value))
const nextRevision = versionId => 'rev-' + versionId + '-' + (++revisions)

/** A typed refusal in the shape the real client throws, so the page's `fail()` sees what it expects. */
const refuse = (status, code) => new MarginApiError(status, { code, detail: 'server prose', retryable: status === 409 })

const INGREDIENTS = [
  { ingredientId: 'i-laks', name: 'Laks', baseUnit: 'Kilogram' },
  { ingredientId: 'i-flote', name: 'Fløte', baseUnit: 'Liter' }
]

function makeVersion (over) {
  return Object.assign({
    recipeVersionId: 'v-1',
    versionNumber: 1,
    state: 'Draft',
    yieldQuantity: 4,
    yieldUnit: 'Liter',
    portionCount: 10,
    effectiveFrom: NOW,
    effectiveTo: null,
    activatedAtUtc: null,
    retiredAtUtc: null,
    notes: null,
    revision: 'rev-v-1-0',
    components: []
  }, over)
}

/**
 * The two component lines every fixture below starts from, and both are there to be preserved rather
 * than read: an ingredient line with NO yield factor (`null` — the legal "no trim loss") and a
 * SUB-RECIPE line with one. An editor that dropped either would change what the dish costs.
 */
function startingComponents () {
  return [
    { ingredientId: 'i-laks', subRecipeId: null, quantity: 0.8, unitCode: 'kg', yieldFactor: null },
    { ingredientId: null, subRecipeId: 'r-fond', quantity: 1, unitCode: 'l', yieldFactor: 0.9 }
  ]
}

/**
 * The store's world.
 *
 * `versions` is the recipe's whole version history — Superseded and Retired rows included, because
 * the assertion that matters after an activation is about the row that LEFT the Active state, and a
 * fake that deleted it could not be asked.
 */
function makeWorld (versions) {
  return {
    recipeId: 'r-1',
    name: 'Fiskesuppe',
    kind: 'Sellable',
    notes: 'Recipe header note',
    // Deliberately unlike any version revision: the retire and edit guards below compare against the
    // VERSION's token, and a client that sent this one must be refused rather than quietly accepted.
    revision: 'rev-recipe-HEADER',
    versions,

    createDraftFromActive () {
      const active = this.versions.find(v => v.state === 'Active')
      if (!active) { throw refuse(400, 'margin.no-active-version') }

      const number = Math.max.apply(null, this.versions.map(v => v.versionNumber)) + 1
      const versionId = 'v-' + number
      const draft = makeVersion({
        recipeVersionId: versionId,
        versionNumber: number,
        state: 'Draft',
        yieldQuantity: active.yieldQuantity,
        yieldUnit: active.yieldUnit,
        portionCount: active.portionCount,
        notes: active.notes,
        revision: nextRevision(versionId),
        components: clone(active.components)
      })
      this.versions.push(draft)
      return clone(draft)
    },

    editDraft (versionId, request, revision) {
      const version = this.versions.find(v => v.recipeVersionId === versionId)
      if (!version) { throw refuse(404, 'margin.not-found') }
      if (version.state !== 'Draft') { throw refuse(400, 'margin.version-not-draft') }
      if (revision !== version.revision) { throw refuse(409, 'margin.stale-revision') }

      const components = (request.components || []).map(c => ({
        ingredientId: c.ingredientId || null,
        subRecipeId: c.subRecipeId || null,
        quantity: c.quantity,
        unitCode: c.unitCode,
        yieldFactor: c.yieldFactor === undefined ? null : c.yieldFactor
      }))

      if (!(request.yieldQuantity > 0) || !(request.portionCount > 0)) {
        throw refuse(400, 'margin.version-input-invalid')
      }
      for (const c of components) {
        if (!!c.ingredientId === !!c.subRecipeId) { throw refuse(400, 'margin.component-invalid') }
        if (!(c.quantity > 0)) { throw refuse(400, 'margin.component-invalid') }
        // The server's own range check, mirrored because it is what a `Number(null)` -> 0 in the
        // editor would trip: 0 is not in (0,1], so a save that changed nothing would be refused.
        if (c.yieldFactor !== null && !(c.yieldFactor > 0 && c.yieldFactor <= 1)) {
          throw refuse(400, 'margin.component-invalid')
        }
      }

      // A REPLACE, not a patch — every one of these is assigned unconditionally by the server.
      version.yieldQuantity = request.yieldQuantity
      version.yieldUnit = request.yieldUnit
      version.portionCount = request.portionCount
      version.notes = request.notes === undefined ? null : request.notes
      version.components = components
      version.revision = nextRevision(versionId)
      return clone(version)
    },

    activate (versionId, revision) {
      const version = this.versions.find(v => v.recipeVersionId === versionId)
      if (!version) { throw refuse(404, 'margin.not-found') }
      if (version.state !== 'Draft') { throw refuse(400, 'margin.version-not-draft') }
      if (revision !== version.revision) { throw refuse(409, 'margin.stale-revision') }

      const predecessor = this.versions.find(v => v.state === 'Active')
      if (predecessor) {
        predecessor.state = 'Superseded'
        predecessor.effectiveTo = NOW
        predecessor.revision = nextRevision(predecessor.recipeVersionId)
      }
      version.state = 'Active'
      version.effectiveFrom = NOW
      version.activatedAtUtc = NOW
      version.revision = nextRevision(versionId)
      return clone(version)
    },

    retire (revision) {
      const active = this.versions.find(v => v.state === 'Active')
      if (!active) { throw refuse(400, 'margin.no-active-version') }
      if (revision !== active.revision) { throw refuse(409, 'margin.stale-revision') }

      active.state = 'Retired'
      active.effectiveTo = NOW
      active.retiredAtUtc = NOW
      active.revision = nextRevision(active.recipeVersionId)
      return clone(active)
    }
  }
}

/**
 * A priced version, the way the server answers: a flat 60 kroner per component line, divided by the
 * portion count and rounded ONCE. The arithmetic lives here, on the wire's side of the boundary,
 * precisely so the page can be shown to be reading a number rather than computing one.
 */
function previewOf (version) {
  const total = version.components.length * 6000
  return {
    recipeVersionId: version.recipeVersionId,
    totalCostMinor: total,
    perPortionCostMinor: Math.round(total / version.portionCount),
    currency: 'NOK',
    complete: true,
    incompleteReasons: [],
    pricedAtUtc: '2026-03-01T12:00:00Z',
    lines: version.components.map((c, index) => ({
      componentId: 'c-' + index,
      ingredientId: c.ingredientId,
      subRecipeId: c.subRecipeId,
      quantity: c.quantity,
      unitCode: c.unitCode,
      incomplete: false,
      lineCostMinor: 6000
    }))
  }
}

/** `GET /margin/recipes/{id}`: the Active version, the Drafts, and a preview of one of them. */
function detailOf (w) {
  const active = w.versions.find(v => v.state === 'Active') || null
  const drafts = w.versions.filter(v => v.state === 'Draft').sort((a, b) => a.versionNumber - b.versionNumber)
  // `GetAsync` previews the Active version, and falls back to the LATEST Draft only when there is
  // none. A retired recipe with no draft has nothing to preview at all.
  const previewed = active || drafts[drafts.length - 1] || null

  return {
    recipeId: w.recipeId,
    name: w.name,
    kind: w.kind,
    notes: w.notes,
    revision: w.revision,
    activeVersion: active ? clone(active) : null,
    draftVersions: drafts.map(clone),
    costPreview: previewed ? previewOf(previewed) : null,
    generatedAtUtc: '2026-03-01T12:00:00Z'
  }
}

/** `GET /margin/recipes`: one row, with the nullable active-version number the wire really sends. */
function listOf (w) {
  const active = w.versions.find(v => v.state === 'Active') || null
  return [{
    recipeId: w.recipeId,
    name: w.name,
    kind: w.kind,
    notes: w.notes,
    revision: w.revision,
    activeVersionNumber: active ? active.versionNumber : null,
    draftVersionCount: w.versions.filter(v => v.state === 'Draft').length,
    activeProductLinkCount: 1,
    createdAtUtc: '2026-02-01T08:00:00'
  }]
}

jest.mock('~/utils/margin/recipe-client', () => ({
  MarginRecipeService: class {
    GetStatus (storeId) {
      mockWire.calls.push(['GetStatus'])
      return Promise.resolve({ storeId, flags: { module: true } })
    }

    ListRecipes () {
      mockWire.calls.push(['ListRecipes'])
      return mockWire.run(() => mockWire.list())
    }

    ListIngredients () {
      mockWire.calls.push(['ListIngredients'])
      return Promise.resolve({ ingredients: mockWire.ingredients(), starterCandidates: [] })
    }

    GetRecipe () {
      mockWire.calls.push(['GetRecipe'])
      return mockWire.run(() => mockWire.detail())
    }

    CreateRecipe () {
      mockWire.calls.push(['CreateRecipe'])
      return mockWire.run(() => mockWire.detail())
    }

    CreateVersion (_storeId, recipeId, request) {
      mockWire.calls.push(['CreateVersion', recipeId, request])
      return mockWire.run(() => mockWire.world.createDraftFromActive())
    }

    UpdateVersion (_storeId, recipeId, versionId, request, revision) {
      mockWire.calls.push(['UpdateVersion', recipeId, versionId, request, revision])
      return mockWire.run(() => mockWire.world.editDraft(versionId, request, revision))
    }

    ActivateVersion (_storeId, recipeId, versionId, revision) {
      mockWire.calls.push(['ActivateVersion', recipeId, versionId, revision])
      return mockWire.run(() => mockWire.world.activate(versionId, revision))
    }

    Retire (_storeId, recipeId, revision) {
      mockWire.calls.push(['Retire', recipeId, revision])
      return mockWire.run(() => mockWire.world.retire(revision))
    }

    CreateIngredient () {
      mockWire.calls.push(['CreateIngredient'])
      return Promise.resolve({ ingredientId: 'i-new' })
    }

    GetMenuMargin (storeId) {
      mockWire.calls.push(['GetMenuMargin'])
      return Promise.resolve({
        storeId, currency: 'NOK', pricedAtUtc: '2026-03-01T12:00:00Z', rows: [], unlinkedRecipes: [], products: []
      })
    }

    GetProductLinks (_storeId, recipeId) {
      mockWire.calls.push(['GetProductLinks'])
      return Promise.resolve({ recipeId, links: [] })
    }

    SetProductLinks (_storeId, recipeId, links) {
      mockWire.calls.push(['SetProductLinks'])
      return Promise.resolve({ recipeId, links })
    }
  }
}))

const settled = () => new Promise(resolve => setTimeout(resolve, 0))
const named = name => mockWire.calls.filter(c => c[0] === name)

function mountPage () {
  return shallowMount(MarginRecipesPage, {
    mocks: {
      // The key AND its interpolation arguments, so a control rendering the wrong version number is
      // visible in the DOM assertion rather than hidden behind translated prose.
      $i: (key, params) => (params ? key + ' ' + JSON.stringify(params) : key),
      priceLabel: minor => 'kr ' + minor,
      wholeAmount: minor => String(Math.trunc(minor / 100)),
      fractionAmount: minor => String(minor % 100).padStart(2, '0'),
      marketConfig: { currency: 'NOK' },
      $store: {
        getters: { userIsLoggedIn: true },
        state: { selectedAdminStore: 42, adminLocale: 'no', currentUser: { id: 1, adminIn: [{ id: 42 }] } }
      },
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
}

/**
 * Everything below goes through the DOM. A test that called `wrapper.vm.retire()` would pass with the
 * button unbound, which is the exact way a sibling's page test came to assert nothing this session.
 */
async function click (wrapper, testId) {
  const target = wrapper.find('[data-test="' + testId + '"]')
  // A missing control is a failed step, not a silent no-op — `find` on nothing returns a wrapper
  // whose `trigger` throws an unhelpful error much later.
  expect([testId, target.exists()]).toEqual([testId, true])
  target.trigger('click')
  await settled()
  await wrapper.vm.$nextTick()
}

async function setValue (wrapper, testId, value) {
  wrapper.find('[data-test="' + testId + '"]').setValue(value)
  await wrapper.vm.$nextTick()
}

/** Mount, wait for the gate and the reads, then select the recipe FROM THE LIST. */
async function openRecipe () {
  const wrapper = mountPage()
  await settled()
  wrapper.findAll('.mrg-list__item').at(0).trigger('click')
  await settled()
  await wrapper.vm.$nextTick()
  return wrapper
}

const versionOf = id => mockWire.world.versions.find(v => v.recipeVersionId === id)
const stateOf = id => (versionOf(id) || {}).state || 'absent'
const states = () => mockWire.world.versions.map(v => v.recipeVersionId + ':' + v.state)

/** An Active version and nothing else — the state a chef is in the moment after activating. */
const worldLive = () => makeWorld([makeVersion({
  recipeVersionId: 'v-1',
  versionNumber: 1,
  state: 'Active',
  activatedAtUtc: NOW,
  notes: 'Simmer 40 minutes',
  revision: 'rev-v-1-live',
  components: startingComponents()
})])

/** An Active version with a draft already open beside it. */
const worldLiveWithDraft = () => makeWorld([
  makeVersion({
    recipeVersionId: 'v-1',
    versionNumber: 1,
    state: 'Active',
    activatedAtUtc: NOW,
    notes: 'Simmer 40 minutes',
    revision: 'rev-v-1-live',
    components: startingComponents()
  }),
  makeVersion({
    recipeVersionId: 'v-2',
    versionNumber: 2,
    state: 'Draft',
    notes: 'Simmer 40 minutes',
    revision: 'rev-v-2-draft',
    components: startingComponents()
  })
])

beforeEach(() => {
  mockWire.calls.length = 0
  revisions = 0
  mockWire.world = null
})

// ---------------------------------------------------------------------------------------------
// THE ROUND TRIP. One recipe, four transitions, one journey.
// ---------------------------------------------------------------------------------------------

describe('an active recipe can be fixed and then ended, without leaving the page', () => {
  test('new draft -> edit -> activate -> retire, every step driven from the screen', async () => {
    mockWire.world = worldLive()
    const wrapper = await openRecipe()

    // ---- the starting state, by value ----------------------------------------------------------
    expect(states()).toEqual(['v-1:Active'])
    expect(wrapper.find('[data-test="revise-active"]').text()).toBe('mrg_revise_active {"number":1}')
    // 2 lines * 60 kr, over 10 portions. Read off the wire's own preview, never summed here.
    expect(wrapper.vm.cost.perPortionCostMinor).toBe(1200)
    // Nothing to edit and nothing to activate yet: the live version is immutable.
    expect(wrapper.find('[data-test="draft-editor"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="activate"]').exists()).toBe(false)

    // ---- STEP 1: a new draft, cloned from the live version --------------------------------------
    await click(wrapper, 'new-draft')

    expect(states()).toEqual(['v-1:Active', 'v-2:Draft'])
    // The live version did not move. A clone that superseded what it copied would take the store's
    // costed menu away in the middle of service.
    expect(versionOf('v-1').portionCount).toBe(10)
    expect(wrapper.find('[data-test="draft-editor"]').exists()).toBe(true)
    // The control that got us here is gone, so a second click cannot mint a version nothing reaches.
    expect(wrapper.find('[data-test="new-draft"]').exists()).toBe(false)
    // The clone carried BOTH lines, the sub-recipe one included.
    expect(wrapper.findAll('[data-test="draft-component"]')).toHaveLength(2)
    expect(wrapper.find('[data-test="draft-sub-recipe"]').exists()).toBe(true)
    // The editor is seeded from the SERVER's copy of the draft.
    expect(wrapper.find('[data-test="draft-portions"]').element.value).toBe('10')

    // ---- STEP 2: the edit ------------------------------------------------------------------------
    await setValue(wrapper, 'draft-portions', '20')
    await click(wrapper, 'save-draft')

    expect(wrapper.vm.failure).toBe('')
    expect(versionOf('v-2').portionCount).toBe(20)
    // The ACTIVE version is untouched by the edit — that is what makes the draft safe to work in.
    expect(versionOf('v-1').portionCount).toBe(10)
    expect(states()).toEqual(['v-1:Active', 'v-2:Draft'])
    // The note the screen never showed survived a REPLACE that assigns it unconditionally.
    expect(versionOf('v-2').notes).toBe('Simmer 40 minutes')
    // And so did the sub-recipe line and the yield factors — a null that stayed null, not a zero.
    expect(versionOf('v-2').components).toEqual([
      { ingredientId: 'i-laks', subRecipeId: null, quantity: 0.8, unitCode: 'kg', yieldFactor: null },
      { ingredientId: null, subRecipeId: 'r-fond', quantity: 1, unitCode: 'l', yieldFactor: 0.9 }
    ])

    // ---- STEP 3: activate ------------------------------------------------------------------------
    await click(wrapper, 'activate')

    expect(wrapper.vm.failure).toBe('')
    // THE PREVIOUS STATE IS GONE. An activation that left v-1 Active is the defect a round trip is
    // written to catch: two versions costing the same dish, and no way to say which the till used.
    expect(states()).toEqual(['v-1:Superseded', 'v-2:Active'])
    expect(stateOf('v-1')).not.toBe('Active')
    expect(wrapper.find('[data-test="revise-active"]').text()).toBe('mrg_revise_active {"number":2}')
    // The draft is no longer a draft, so both draft-facing controls have closed by themselves.
    expect(wrapper.find('[data-test="draft-editor"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="activate"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="new-draft"]').exists()).toBe(true)
    // The screen now costs the EDITED version: 12000 over 20 portions, not over the old 10.
    expect(wrapper.vm.cost.perPortionCostMinor).toBe(600)
    expect(wrapper.vm.cost.pricedVersionIsActive).toBe(true)

    // ---- STEP 4: retire, FROM ACTIVE --------------------------------------------------------------
    await click(wrapper, 'retire')

    expect(wrapper.vm.failure).toBe('')
    expect(states()).toEqual(['v-1:Superseded', 'v-2:Retired'])
    expect(mockWire.world.versions.some(v => v.state === 'Active')).toBe(false)
    expect(wrapper.find('[data-test="retire"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="revise-no-active"]').exists()).toBe(true)
    // A retired recipe keeps its name and its history and has NO current cost. Not a cost of zero —
    // the panel must be told nothing is costed rather than shown kr 0,00.
    expect(wrapper.vm.cost.state).toBe('not-costed')
    expect(wrapper.vm.cost.perPortionCostMinor).toBeNull()
    expect(wrapper.vm.cost.totalCostMinor).toBeNull()
  })

  // The list is the other place the recipe's state is legible, and it is read from the wire on every
  // transition rather than patched — so the row and the panel cannot come to disagree.
  test('the list row follows the same journey', async () => {
    mockWire.world = worldLive()
    const wrapper = await openRecipe()
    expect(wrapper.vm.recipeRows[0].activeVersionNumber).toBe(1)

    await click(wrapper, 'new-draft')
    expect(wrapper.vm.recipeRows[0].draftVersionCount).toBe(1)
    expect(wrapper.vm.recipeRows[0].activeVersionNumber).toBe(1)

    await click(wrapper, 'activate')
    expect(wrapper.vm.recipeRows[0].activeVersionNumber).toBe(2)
    expect(wrapper.vm.recipeRows[0].draftVersionCount).toBe(0)

    await click(wrapper, 'retire')
    // Null, and not 0: "no version is active" is an answer, and `Number(null)` would make it a
    // version numbered zero.
    expect(wrapper.vm.recipeRows[0].activeVersionNumber).toBeNull()
    expect(wrapper.vm.recipeRows[0].draftVersionCount).toBe(0)
  })
})

// ---------------------------------------------------------------------------------------------
// The four transitions, each on its own precondition, so a break in one is attributable to one.
// ---------------------------------------------------------------------------------------------

describe('the new draft is a clone of the ACTIVE version', () => {
  test('it is requested for this recipe, with no revision and no invented notes', async () => {
    mockWire.world = worldLive()
    const wrapper = await openRecipe()
    mockWire.calls.length = 0

    await click(wrapper, 'new-draft')

    const [, recipeId, request] = named('CreateVersion')[0]
    expect(recipeId).toBe('r-1')
    // The route takes no If-Match and the clone inherits the Active version's notes when the body
    // omits them. Inventing a note here would overwrite one nobody was shown.
    expect(request).toEqual({})
    expect(versionOf('v-2').notes).toBe('Simmer 40 minutes')
  })

  // A draft is not active, so nothing a dish EARNS can have moved. Re-reading the margin here would
  // be a round trip that can only return the same answer.
  test('it re-reads the recipe and the list, and not the menu margin', async () => {
    mockWire.world = worldLive()
    const wrapper = await openRecipe()
    mockWire.calls.length = 0

    await click(wrapper, 'new-draft')

    expect(named('GetRecipe')).toHaveLength(1)
    expect(named('ListRecipes')).toHaveLength(1)
    expect(named('GetMenuMargin')).toHaveLength(0)
  })
})

describe('the edit carries the DRAFT revision and the whole version', () => {
  test('the token sent is the draft own, not the recipe header one and not the active version one', async () => {
    mockWire.world = worldLiveWithDraft()
    const wrapper = await openRecipe()
    mockWire.calls.length = 0

    await click(wrapper, 'save-draft')

    const [, recipeId, versionId, , revision] = named('UpdateVersion')[0]
    expect(recipeId).toBe('r-1')
    expect(versionId).toBe('v-2')
    expect(revision).toBe('rev-v-2-draft')
    // The three tokens on this document are given different values on purpose, so the assertion can
    // tell them apart rather than agreeing with whichever one happened to be picked.
    expect(revision).not.toBe('rev-recipe-HEADER')
    expect(revision).not.toBe('rev-v-1-live')
  })

  // The server ASSIGNS every field of a draft on save, so anything the request leaves out is deleted
  // rather than kept. This is the assertion that a save which changed one number did not quietly
  // empty the recipe.
  test('a save that changed one number sends the version whole', async () => {
    mockWire.world = worldLiveWithDraft()
    const wrapper = await openRecipe()
    await setValue(wrapper, 'draft-portions', '25')
    mockWire.calls.length = 0

    await click(wrapper, 'save-draft')

    const request = named('UpdateVersion')[0][3]
    expect(request.portionCount).toBe(25)
    // Numbers, not the form's strings.
    expect(request.yieldQuantity).toBe(4)
    expect(request.yieldUnit).toBe('Liter')
    expect(request.notes).toBe('Simmer 40 minutes')
    expect(request.components).toEqual([
      { ingredientId: 'i-laks', subRecipeId: null, quantity: 0.8, unitCode: 'kg', yieldFactor: null },
      { ingredientId: null, subRecipeId: 'r-fond', quantity: 1, unitCode: 'l', yieldFactor: 0.9 }
    ])
  })

  // THE `Number(null)` TRAP, pinned on the one field where it is money. A yield factor of null means
  // "no trim loss"; `Number(null)` is 0, and 0 is outside the server's (0,1] range — so the coercion
  // does not fail silently, it makes a save that changed nothing impossible.
  test('a null yield factor stays null, and a real one is not rounded away', async () => {
    mockWire.world = worldLiveWithDraft()
    const wrapper = await openRecipe()
    mockWire.calls.length = 0

    await click(wrapper, 'save-draft')

    const sent = named('UpdateVersion')[0][3].components
    expect(sent[0].yieldFactor).toBeNull()
    expect(sent[0].yieldFactor).not.toBe(0)
    expect(sent[1].yieldFactor).toBe(0.9)
    expect(mockWire.world.versions.find(v => v.recipeVersionId === 'v-2').components[0].yieldFactor).toBeNull()
  })

  // Nothing active changed, so no dish's margin can have changed either.
  test('it re-reads the recipe and not the menu margin', async () => {
    mockWire.world = worldLiveWithDraft()
    const wrapper = await openRecipe()
    mockWire.calls.length = 0

    await click(wrapper, 'save-draft')

    expect(named('GetRecipe')).toHaveLength(1)
    expect(named('GetMenuMargin')).toHaveLength(0)
  })

  test('a refusal is rendered from its CODE and the draft is not reported as saved', async () => {
    mockWire.world = worldLiveWithDraft()
    const wrapper = await openRecipe()
    // A quantity the server refuses, entered through the field.
    await setValue(wrapper, 'draft-portions', '0')

    await click(wrapper, 'save-draft')

    expect(wrapper.find('[data-test="draft-error"]').text()).toBe('mrg_err_version_input')
    // Refused BEFORE the round trip: the same rules the service applies, checked to spare a trip.
    expect(named('UpdateVersion')).toHaveLength(0)
    expect(versionOf('v-2').portionCount).toBe(10)
  })
})

describe('activation supersedes what it replaces', () => {
  test('the predecessor leaves the Active state in the same transition', async () => {
    mockWire.world = worldLiveWithDraft()
    const wrapper = await openRecipe()

    await click(wrapper, 'activate')

    expect(states()).toEqual(['v-1:Superseded', 'v-2:Active'])
    expect(mockWire.world.versions.filter(v => v.state === 'Active')).toHaveLength(1)
  })
})

describe('retire is reachable from ACTIVE, and only from there', () => {
  test('the token sent is the ACTIVE VERSION revision, not the recipe header one', async () => {
    mockWire.world = worldLive()
    const wrapper = await openRecipe()
    mockWire.calls.length = 0

    await click(wrapper, 'retire')

    const [, recipeId, revision] = named('Retire')[0]
    expect(recipeId).toBe('r-1')
    expect(revision).toBe('rev-v-1-live')
    expect(revision).not.toBe('rev-recipe-HEADER')
    expect(wrapper.vm.failure).toBe('')
  })

  // THE PAIR. The two fixtures differ only in whether a version is Active, and the control must not
  // be offered in both: there is no route that retires a draft, so a button there would send a
  // request the server answers `margin.no-active-version`.
  test('a recipe with only a draft offers no retire control', async () => {
    mockWire.world = makeWorld([makeVersion({ recipeVersionId: 'v-1', versionNumber: 1, state: 'Draft', components: startingComponents() })])
    const wrapper = await openRecipe()

    expect(wrapper.find('[data-test="retire"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="new-draft"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="revise-no-active"]').exists()).toBe(true)
    // CONTROL: the draft-facing control IS offered on the same screen, so the absence above is a
    // rule and not an empty card.
    expect(wrapper.find('[data-test="activate"]').exists()).toBe(true)
  })

  test('CONTROL: the same recipe with an Active version offers it', async () => {
    mockWire.world = worldLive()
    const wrapper = await openRecipe()
    expect(wrapper.find('[data-test="retire"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="revise-no-active"]').exists()).toBe(false)
  })

  // Retiring takes the cost side away from every dish this recipe is sold as, because the read costs
  // the version active at its instant and there is none afterwards.
  test('it re-reads the menu margin, unlike a draft edit', async () => {
    mockWire.world = worldLive()
    const wrapper = await openRecipe()
    mockWire.calls.length = 0

    await click(wrapper, 'retire')

    expect(named('GetMenuMargin')).toHaveLength(1)
    expect(named('GetRecipe')).toHaveLength(1)
  })

  test('an active version with no revision token offers no retire, and says why', async () => {
    mockWire.world = makeWorld([makeVersion({
      recipeVersionId: 'v-1', versionNumber: 1, state: 'Active', revision: null, components: startingComponents()
    })])
    const wrapper = await openRecipe()

    expect(wrapper.find('[data-test="retire"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="retire-no-revision"]').exists()).toBe(true)
  })

  test('a server refusal is rendered from its CODE and the recipe stays active', async () => {
    mockWire.world = worldLive()
    const wrapper = await openRecipe()
    // The row moved under us: the token the page holds is no longer current.
    versionOf('v-1').revision = 'rev-v-1-somebody-else'

    await click(wrapper, 'retire')

    expect(wrapper.find('[data-test="failure"]').text()).toBe('mrg_err_stale')
    expect(stateOf('v-1')).toBe('Active')
    expect(wrapper.find('[data-test="retire"]').exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------------------------
// Null is not zero — pinned separately for null, undefined, '' and a genuine 0.
// ---------------------------------------------------------------------------------------------

describe('an absent number and a real zero are two different screens', () => {
  const withActiveNumber = number => makeWorld([makeVersion({
    recipeVersionId: 'v-1', versionNumber: number, state: 'Active', components: startingComponents()
  })])

  test('a null version number says so, and does not print v0', async () => {
    mockWire.world = withActiveNumber(null)
    const wrapper = await openRecipe()
    expect(wrapper.find('[data-test="revise-active"]').text()).toBe('mrg_revise_active_unknown')
  })

  test('an undefined version number is the same answer', async () => {
    mockWire.world = withActiveNumber(undefined)
    const wrapper = await openRecipe()
    expect(wrapper.find('[data-test="revise-active"]').text()).toBe('mrg_revise_active_unknown')
  })

  test('an empty-string version number is the same answer', async () => {
    mockWire.world = withActiveNumber('')
    const wrapper = await openRecipe()
    expect(wrapper.find('[data-test="revise-active"]').text()).toBe('mrg_revise_active_unknown')
  })

  // THE CONTROL that makes the three above a null check rather than a truthiness check: `!0` is
  // `true`, so a falsiness guard would send a genuine zero to the "we do not know" sentence.
  test('a version numbered 0 is a number, and is printed as one', async () => {
    mockWire.world = withActiveNumber(0)
    const wrapper = await openRecipe()
    expect(wrapper.find('[data-test="revise-active"]').text()).toBe('mrg_revise_active {"number":0}')
  })

  // The same rule inside the editor: a field seeded from `null` is EMPTY, and one seeded from a real
  // `0` shows the zero, so a venue can see the value the server is holding.
  test('a draft field seeds empty from null and "0" from a real zero', async () => {
    mockWire.world = makeWorld([
      makeVersion({ recipeVersionId: 'v-1', versionNumber: 1, state: 'Active', components: startingComponents() }),
      makeVersion({ recipeVersionId: 'v-2', versionNumber: 2, state: 'Draft', portionCount: null, components: [] })
    ])
    let wrapper = await openRecipe()
    expect(wrapper.find('[data-test="draft-portions"]').element.value).toBe('')

    mockWire.world = makeWorld([
      makeVersion({ recipeVersionId: 'v-1', versionNumber: 1, state: 'Active', components: startingComponents() }),
      makeVersion({ recipeVersionId: 'v-2', versionNumber: 2, state: 'Draft', portionCount: 0, components: [] })
    ])
    wrapper = await openRecipe()
    expect(wrapper.find('[data-test="draft-portions"]').element.value).toBe('0')
  })
})

// ---------------------------------------------------------------------------------------------
// Reachability (C3) and copy. Asserted, not rebuilt — the nav entry was already there.
// ---------------------------------------------------------------------------------------------

describe('the capability is reachable and speaks three languages', () => {
  // ASSERTED RATHER THAN ADDED: `/admin/margin-recipes` was already in the admin navigation before
  // this lane, so the pin here is what makes its REMOVAL red rather than silent.
  test('the admin navigation still links to the page these controls live on', () => {
    const nav = fs.readFileSync(
      path.resolve(__dirname, '..', 'components', 'organisms', 'AdminPageHeader.vue'), 'utf8')
    expect(nav).toMatch(/path:\s*'\/admin\/margin-recipes'/)
  })

  test('every key these controls ask for is present and non-empty in all three dictionaries', () => {
    const page = fs.readFileSync(
      path.resolve(__dirname, '..', 'pages', 'admin', 'margin-recipes.vue'), 'utf8')
    const used = Array.from(new Set((page.match(/'mrg_revise_[a-z0-9_]+'/g) || []).map(m => m.slice(1, -1))))

    expect(used.length).toBeGreaterThanOrEqual(12)
    for (const key of used) {
      for (const locale of ['no', 'en', 'de']) {
        expect([locale, key, typeof translations[locale][key]]).toEqual([locale, key, 'string'])
        expect([locale, key, (translations[locale][key] || '').trim().length > 0]).toEqual([locale, key, true])
      }
    }
  })

  // Retiring cannot be undone — the server has no route back, and the recipe's name stays taken — so
  // the copy has to say so before the button is pressed rather than after.
  test('the retire copy warns that it cannot be taken back', () => {
    expect(translations.en.mrg_revise_retire_lede.toLowerCase()).toContain('cannot be brought back')
    expect(translations.no.mrg_revise_retire_lede.toLowerCase()).toContain('kan ikke hentes tilbake')
    expect(translations.de.mrg_revise_retire_lede.toLowerCase()).toContain('nicht zurückgeholt werden')
  })
})

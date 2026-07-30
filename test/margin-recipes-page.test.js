import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import MarginRecipesPage from '~/pages/admin/margin-recipes.vue'
import translations from '~/translations'
import { MarginApiError } from '~/utils/margin/api-client'

const calls = []
// Per-test scripting of the fake backend. The page builds its client in a computed, so the MODULE is
// mocked rather than the instance.
const script = {}

jest.mock('~/utils/margin/recipe-client', () => ({
  MarginRecipeService: class {
    GetStatus (storeId) {
      calls.push(['GetStatus', storeId])
      return script.status ? script.status() : Promise.resolve({ storeId, flags: { module: true } })
    }

    ListRecipes () {
      calls.push(['ListRecipes'])
      return script.recipes ? script.recipes() : Promise.resolve([])
    }

    ListIngredients () {
      calls.push(['ListIngredients'])
      return script.ingredients ? script.ingredients() : Promise.resolve({ ingredients: [], starterCandidates: [] })
    }

    GetRecipe (_storeId, recipeId) {
      calls.push(['GetRecipe', recipeId])
      return script.recipe ? script.recipe() : Promise.resolve({ recipeId, draftVersions: [], costPreview: null })
    }

    CreateRecipe (_storeId, request) {
      calls.push(['CreateRecipe', request])
      return script.create ? script.create(request) : Promise.resolve({ recipeId: 'r-new', draftVersions: [], costPreview: null })
    }

    CreateIngredient (_storeId, request) {
      calls.push(['CreateIngredient', request])
      return Promise.resolve({ ingredientId: 'i-new' })
    }

    ActivateVersion (_storeId, recipeId, versionId, revision) {
      calls.push(['ActivateVersion', recipeId, versionId, revision])
      return Promise.resolve({ recipeVersionId: versionId, state: 'Active' })
    }

    GetMenuMargin (storeId) {
      calls.push(['GetMenuMargin', storeId])
      return script.menuMargin
        ? script.menuMargin()
        : Promise.resolve({ storeId, currency: 'NOK', pricedAtUtc: '2026-03-01T12:00:00Z', rows: [], unlinkedRecipes: [] })
    }

    GetProductLinks (_storeId, recipeId) {
      calls.push(['GetProductLinks', recipeId])
      return script.links ? script.links() : Promise.resolve({ recipeId, links: [] })
    }

    SetProductLinks (_storeId, recipeId, links) {
      calls.push(['SetProductLinks', recipeId, links])
      return script.setLinks
        ? script.setLinks(links)
        : Promise.resolve({ recipeId, links: links.map((l, i) => Object.assign({ id: 'l-' + i, isActive: true, isBroken: false }, l)) })
    }
  }
}))

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

function mountPage () {
  return shallowMount(MarginRecipesPage, {
    mocks: {
      $i: key => key,
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

const named = name => calls.filter(c => c[0] === name)

describe('the module gate is asked first, and its three answers are three screens', () => {
  beforeEach(() => { calls.length = 0; for (const k of Object.keys(script)) { delete script[k] } })

  // CONTROL for the two refusals below: with the module ON the page proceeds and reads.
  test('module ON: no blocker, and the three reads are issued', async () => {
    const wrapper = mountPage()
    await settled()
    expect(wrapper.find('[data-test="blocker"]').exists()).toBe(false)
    expect(named('ListRecipes')).toHaveLength(1)
    expect(named('ListIngredients')).toHaveLength(1)
    expect(named('GetMenuMargin')).toHaveLength(1)
  })

  test('module OFF: the page blocks and reads nothing', async () => {
    script.status = () => Promise.resolve({ storeId: 42, flags: { module: false } })
    const wrapper = mountPage()
    await settled()
    expect(wrapper.find('[data-test="blocker"]').text()).toBe('mrg_module_off')
    expect(named('ListRecipes')).toHaveLength(0)
    // The margin read is behind the same gate. With the module off every route answers the same
    // opaque 404, so issuing it would decorate a deliberate screen with a failure about it.
    expect(named('GetMenuMargin')).toHaveLength(0)
  })

  // The distinction the whole gate exists for. Every OTHER margin route answers the same opaque 404
  // whether the module is off or the caller is out of scope, so a page that guessed "off" from a
  // failed status read would tell a venue its module is disabled when the network merely blipped.
  test('a status read that FAILED says unknown, never "the module is off"', async () => {
    script.status = () => Promise.reject(new MarginApiError(503, { detail: 'gateway' }))
    const wrapper = mountPage()
    await settled()
    expect(wrapper.find('[data-test="blocker"]').text()).toBe('mrg_status_unknown')
    expect(wrapper.find('[data-test="blocker"]').text()).not.toBe('mrg_module_off')
  })

  test('a 404 on status IS the module being invisible, and says so', async () => {
    script.status = () => Promise.reject(new MarginApiError(404, { code: 'margin.not-found' }))
    const wrapper = mountPage()
    await settled()
    expect(wrapper.find('[data-test="blocker"]').text()).toBe('mrg_module_off')
  })
})

describe('a read that failed is unknown, not empty', () => {
  beforeEach(() => { calls.length = 0; for (const k of Object.keys(script)) { delete script[k] } })

  // The two fixtures differ ONLY in whether the read resolved with `[]` or rejected. They must not
  // produce the same screen: one says the store has no recipes, the other says we do not know.
  test('a failed recipe list renders UNKNOWN', async () => {
    script.recipes = () => Promise.reject(new MarginApiError(500, {}))
    const wrapper = mountPage()
    await settled()
    expect(wrapper.find('[data-test="recipes-unknown"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="recipes-empty"]').exists()).toBe(false)
  })

  test('an EMPTY recipe list renders empty', async () => {
    script.recipes = () => Promise.resolve([])
    const wrapper = mountPage()
    await settled()
    expect(wrapper.find('[data-test="recipes-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="recipes-unknown"]').exists()).toBe(false)
  })

  test('the same rule for the ingredient list, which is what names the cost lines', async () => {
    script.ingredients = () => Promise.reject(new MarginApiError(500, {}))
    const failed = mountPage()
    await settled()
    expect(failed.find('[data-test="ingredients-unknown"]').exists()).toBe(true)

    script.ingredients = () => Promise.resolve({ ingredients: [], starterCandidates: [] })
    const empty = mountPage()
    await settled()
    expect(empty.find('[data-test="ingredients-unknown"]').exists()).toBe(false)
    expect(empty.find('[data-test="no-ingredients"]').exists()).toBe(true)
  })
})

describe('entering a recipe', () => {
  beforeEach(() => { calls.length = 0; for (const k of Object.keys(script)) { delete script[k] } })

  const created = {
    recipeId: 'r-new',
    name: 'Fiskesuppe',
    revision: 'rev-recipe',
    activeVersion: null,
    draftVersions: [{
      recipeVersionId: 'v-1',
      versionNumber: 1,
      state: 'Draft',
      yieldQuantity: 4,
      yieldUnit: 'Liter',
      portionCount: 20,
      revision: 'rev-draft-1'
    }],
    costPreview: {
      recipeVersionId: 'v-1',
      totalCostMinor: 226,
      perPortionCostMinor: 11,
      currency: 'NOK',
      complete: true,
      incompleteReasons: [],
      pricedAtUtc: '2026-03-01T12:00:00Z',
      lines: []
    }
  }

  // The create answers with the FULL detail document, cost preview included. A second read would be
  // a second priced instant and a needless round trip.
  test('the create response IS the cost: no follow-up GET is issued', async () => {
    script.create = () => Promise.resolve(created)
    const wrapper = mountPage()
    await settled()
    calls.length = 0

    wrapper.setData({ form: { name: 'Fiskesuppe', yieldQuantity: '4', yieldUnit: 'Liter', portionCount: '20', components: [] } })
    await wrapper.vm.createRecipe()
    await settled()

    expect(named('CreateRecipe')).toHaveLength(1)
    expect(named('GetRecipe')).toHaveLength(0)
    expect(wrapper.vm.cost.totalCostMinor).toBe(226)
  })

  test('the request is shaped the way the controller binds it', async () => {
    script.create = () => Promise.resolve(created)
    const wrapper = mountPage()
    await settled()
    calls.length = 0

    wrapper.setData({
      form: {
        name: '  Fiskesuppe  ',
        yieldQuantity: '4',
        yieldUnit: 'Liter',
        portionCount: '20',
        components: [{ ingredientId: 'i-laks', quantity: '800', unitCode: 'g' }]
      }
    })
    await wrapper.vm.createRecipe()
    await settled()

    const request = named('CreateRecipe')[0][1]
    expect(request.name).toBe('Fiskesuppe')
    expect(request.kind).toBe('Sellable')
    // Numbers, not the form's strings — the wire takes decimals and an int.
    expect(request.initialVersion.yieldQuantity).toBe(4)
    expect(request.initialVersion.portionCount).toBe(20)
    expect(request.initialVersion.components).toEqual([{ ingredientId: 'i-laks', quantity: 800, unitCode: 'g' }])
  })

  test('a blank name is refused locally without a round trip', async () => {
    const wrapper = mountPage()
    await settled()
    calls.length = 0

    wrapper.setData({ form: { name: '   ', yieldQuantity: '4', yieldUnit: 'Liter', portionCount: '20', components: [] } })
    await wrapper.vm.createRecipe()
    await settled()

    expect(named('CreateRecipe')).toHaveLength(0)
    expect(wrapper.find('[data-test="form-error"]').exists()).toBe(true)
  })

  test('a server refusal is rendered from its CODE, not its prose', async () => {
    script.create = () => Promise.reject(new MarginApiError(400, {
      code: 'margin.recipe-name-conflict',
      detail: 'A recipe with this name already exists in the store.'
    }))
    const wrapper = mountPage()
    await settled()

    wrapper.setData({ form: { name: 'Fiskesuppe', yieldQuantity: '4', yieldUnit: 'Liter', portionCount: '20', components: [] } })
    await wrapper.vm.createRecipe()
    await settled()

    expect(wrapper.find('[data-test="failure"]').text()).toBe('mrg_err_name_conflict')
  })
})

// The backend split one concurrency answer into three (`MarginContractSupport.TryReadIfMatch`), and
// two of the three arrive on statuses this page never looked at — it dispatches on `code` only, so
// the status move is free. What is NOT free is the codes: an unmapped one falls through to
// `mrg_err_generic` ("Something went wrong. Nothing was saved."), which for a fixable input problem is
// both wrong and alarming, and tells a venue nothing about what to do next.
describe('the three concurrency arms are three different sentences', () => {
  beforeEach(() => { calls.length = 0; for (const k of Object.keys(script)) { delete script[k] } })

  const failWith = async (status, code) => {
    script.create = () => Promise.reject(new MarginApiError(status, { code, detail: 'server prose' }))
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ form: { name: 'Fiskesuppe', yieldQuantity: '4', yieldUnit: 'Liter', portionCount: '20', components: [] } })
    await wrapper.vm.createRecipe()
    await settled()
    return wrapper.find('[data-test="failure"]').text()
  }

  test('an absent precondition is its own message, not the generic one', async () => {
    expect(await failWith(400, 'margin.revision-required')).toBe('mrg_err_revision_required')
  })

  test('a mangled precondition is its own message too', async () => {
    expect(await failWith(400, 'margin.revision-invalid')).toBe('mrg_err_revision_invalid')
  })

  test('and the lost race keeps its own, which is now the ONLY one advising a retry', async () => {
    expect(await failWith(409, 'margin.stale-revision')).toBe('mrg_err_stale')
  })

  test('none of the three falls through to the generic failure', async () => {
    for (const [status, code] of [[400, 'margin.revision-required'], [400, 'margin.revision-invalid'], [409, 'margin.stale-revision']]) {
      expect(await failWith(status, code)).not.toBe('mrg_err_generic')
    }
    // The positive control: a code the page genuinely does not know DOES fall through, so the
    // assertions above are a real distinction and not a dead branch.
    expect(await failWith(500, 'margin.something-new')).toBe('mrg_err_generic')
  })

  // Dispatch is on `code` alone — deliberately, because the split moved two of these off 409 and any
  // status-keyed branch would have silently changed meaning on the day the backend landed.
  test('the code decides, and the status does not', async () => {
    expect(await failWith(409, 'margin.revision-required')).toBe('mrg_err_revision_required')
    expect(await failWith(400, 'margin.stale-revision')).toBe('mrg_err_stale')
  })

  test('the copy exists in all three dictionaries and says three different things', () => {
    const keys = ['mrg_err_revision_required', 'mrg_err_revision_invalid', 'mrg_err_stale']
    for (const locale of ['no', 'en', 'de']) {
      for (const key of keys) { expect(typeof translations[locale][key]).toBe('string') }
      expect(new Set(keys.map(k => translations[locale][k])).size).toBe(keys.length)
    }
  })

  // `mrg_err_stale` used to cover malformed input as well as a lost race, so it could not say what
  // had happened. It now covers exactly one thing, and the copy has to name it: somebody else got
  // there first. A message that still merely says "try again" would be the old ambiguity surviving
  // the split.
  test('the lost-race copy names the race, and the two 400s do not tell anyone to just retry', () => {
    expect(translations.en.mrg_err_stale.toLowerCase()).toContain('somebody else')
    expect(translations.en.mrg_err_revision_required.toLowerCase()).not.toContain('somebody else')
    expect(translations.en.mrg_err_revision_invalid.toLowerCase()).not.toContain('somebody else')
  })
})

describe('activating a draft carries the DRAFT revision, not the recipe header one', () => {
  beforeEach(() => { calls.length = 0; for (const k of Object.keys(script)) { delete script[k] } })

  // The detail document carries a `revision` field at BOTH levels, under the same name. Sending the
  // header's would guard the wrong row: the server would compare a recipe rowversion against a
  // version rowversion and either 409 spuriously or, worse, pass. The two are given DIFFERENT values
  // here precisely so the assertion can tell them apart.
  const withDrafts = {
    recipeId: 'r-1',
    revision: 'rev-recipe-HEADER',
    activeVersion: null,
    draftVersions: [
      { recipeVersionId: 'v-2', versionNumber: 2, state: 'Draft', portionCount: 10, revision: 'rev-draft-2' },
      { recipeVersionId: 'v-3', versionNumber: 3, state: 'Draft', portionCount: 10, revision: 'rev-draft-3' }
    ],
    costPreview: null
  }

  test('the highest draft and its own revision are what get sent', async () => {
    script.recipe = () => Promise.resolve(withDrafts)
    const wrapper = mountPage()
    await settled()

    await wrapper.vm.selectRecipe('r-1')
    await settled()
    calls.length = 0

    await wrapper.vm.activate()
    await settled()

    const [, recipeId, versionId, revision] = named('ActivateVersion')[0]
    expect(recipeId).toBe('r-1')
    expect(versionId).toBe('v-3')
    expect(revision).toBe('rev-draft-3')
    expect(revision).not.toBe('rev-recipe-HEADER')
  })

  // The activate response carries the VERSION only; the cost preview switches from previewing the
  // draft to costing the now-Active version, which is a different document.
  test('the detail is re-read after activation rather than patched', async () => {
    script.recipe = () => Promise.resolve(withDrafts)
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectRecipe('r-1')
    await settled()
    calls.length = 0

    await wrapper.vm.activate()
    await settled()
    expect(named('GetRecipe')).toHaveLength(1)
  })

  test('a draft with no revision offers no activate button, and says why', async () => {
    script.recipe = () => Promise.resolve(Object.assign({}, withDrafts, {
      draftVersions: [{ recipeVersionId: 'v-2', versionNumber: 2, state: 'Draft', portionCount: 10, revision: null }]
    }))
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectRecipe('r-1')
    await settled()

    expect(wrapper.find('[data-test="no-revision"]').exists()).toBe(true)
  })

  // Activation changes which version the menu margin costs: the read resolves the version ACTIVE at
  // its instant, so before this call the dish had no cost side at all.
  test('activation re-reads the menu margin, not just the recipe', async () => {
    script.recipe = () => Promise.resolve(withDrafts)
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectRecipe('r-1')
    await settled()
    calls.length = 0

    await wrapper.vm.activate()
    await settled()
    expect(named('GetMenuMargin')).toHaveLength(1)
  })
})

describe('the margin read is unknown when it fails, never an empty menu', () => {
  beforeEach(() => { calls.length = 0; for (const k of Object.keys(script)) { delete script[k] } })

  // The pair. The two fixtures differ ONLY in whether the read resolved or rejected, and they must
  // not produce the same model: one says nothing about any dish, the other says every dish's margin
  // is unknown.
  test('a failed menu-margin read leaves the model UNKNOWN', async () => {
    script.menuMargin = () => Promise.reject(new MarginApiError(500, {}))
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.menuMargin.state).toBe('unknown')
    expect(wrapper.vm.catalogProducts).toEqual([])
  })

  test('CONTROL: an answered read is READY, and its rows reach the page', async () => {
    script.menuMargin = () => Promise.resolve({
      storeId: 42,
      currency: 'NOK',
      pricedAtUtc: '2026-03-01T12:00:00Z',
      rows: [{
        productId: 'p-1',
        productName: 'Tomatsuppe',
        recipeId: 'r-1',
        priceBasis: 'Base',
        vatPercent: 15,
        grossPriceMinor: 14900,
        depositMinor: 0,
        netPriceMinor: 12957,
        plateCostMinor: 905,
        contributionMinor: 12052,
        foodCostPercent: 6.98464,
        costComplete: true
      }],
      unlinkedRecipes: []
    })
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.menuMargin.state).toBe('ready')
    expect(wrapper.vm.menuMargin.rows[0].contributionMinor).toBe(12052)
    // The same answer is the module's only product catalog — Margin owns no product endpoint.
    expect(wrapper.vm.catalogProducts.map(p => p.productId)).toEqual(['p-1'])
  })
})

describe('linking a recipe to the dishes it is sold as', () => {
  beforeEach(() => { calls.length = 0; for (const k of Object.keys(script)) { delete script[k] } })

  test('selecting a recipe reads its own link set', async () => {
    const wrapper = mountPage()
    await settled()
    calls.length = 0

    await wrapper.vm.selectRecipe('r-1')
    await settled()

    expect(named('GetProductLinks')).toHaveLength(1)
    expect(wrapper.vm.productLinks).toEqual([])
  })

  // The save is a REPLACE-SET, so an editor opened on an unknown starting set would offer to save an
  // empty list over the venue's real links. A failed read therefore leaves it null and shut.
  test('a failed link read leaves the set UNKNOWN rather than empty', async () => {
    script.links = () => Promise.reject(new MarginApiError(500, {}))
    const wrapper = mountPage()
    await settled()

    await wrapper.vm.selectRecipe('r-1')
    await settled()
    expect(wrapper.vm.productLinks).toBeNull()
  })

  test('saving sends the whole desired set and re-reads the margin it just changed', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectRecipe('r-1')
    await settled()
    calls.length = 0

    await wrapper.vm.saveLinks([{ productId: 'p-1', quantityPerSoldUnit: 0.25 }])
    await settled()

    const [, recipeId, links] = named('SetProductLinks')[0]
    expect(recipeId).toBe('r-1')
    expect(links).toEqual([{ productId: 'p-1', quantityPerSoldUnit: 0.25 }])
    // Linking a dish is exactly what turns "no margin" into one, so the stale answer may not stay.
    expect(named('GetMenuMargin')).toHaveLength(1)
    // The save's own response IS the fresh set — no second link read.
    expect(named('GetProductLinks')).toHaveLength(0)
    expect(wrapper.vm.productLinks).toEqual([{
      productId: 'p-1',
      quantityPerSoldUnit: 0.25,
      productName: null,
      goodsGroupName: null,
      productHidden: false,
      isBroken: false
    }])
  })

  test('a server refusal renders from its CODE, not its prose', async () => {
    script.setLinks = () => Promise.reject(new MarginApiError(400, {
      code: 'margin.product-link-invalid',
      detail: 'Product 3f2504e0-4f89-11d3-9a0c-0305e82c3301 is already actively linked to another recipe.'
    }))
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectRecipe('r-1')
    await settled()

    await wrapper.vm.saveLinks([{ productId: 'p-1', quantityPerSoldUnit: 1 }])
    await settled()

    expect(wrapper.find('[data-test="failure"]').text()).toBe('mrg_err_product_link')
    // The server's prose embeds a raw Guid. A venue cannot read a Guid, so it stays off the screen.
    expect(wrapper.text()).not.toContain('3f2504e0')
  })

  // A brand-new recipe is sold by nobody, and the READ is what says so. Without the re-read the
  // margin panel would fall through to "we do not know why there are no rows", which is a weaker and
  // less true answer than the one available.
  test('creating a recipe re-reads the margin so the new recipe can be named as unsold', async () => {
    script.create = () => Promise.resolve({ recipeId: 'r-new', draftVersions: [], costPreview: null })
    const wrapper = mountPage()
    await settled()
    calls.length = 0

    wrapper.setData({ form: { name: 'Fiskesuppe', yieldQuantity: '4', yieldUnit: 'Liter', portionCount: '20', components: [] } })
    await wrapper.vm.createRecipe()
    await settled()

    expect(named('GetMenuMargin')).toHaveLength(1)
    expect(named('GetProductLinks')).toHaveLength(1)
  })
})

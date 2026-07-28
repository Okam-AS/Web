import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import MarginRecipesPage from '~/pages/admin/margin-recipes.vue'
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
  test('module ON: no blocker, and the two reads are issued', async () => {
    const wrapper = mountPage()
    await settled()
    expect(wrapper.find('[data-test="blocker"]').exists()).toBe(false)
    expect(named('ListRecipes')).toHaveLength(1)
    expect(named('ListIngredients')).toHaveLength(1)
  })

  test('module OFF: the page blocks and reads nothing', async () => {
    script.status = () => Promise.resolve({ storeId: 42, flags: { module: false } })
    const wrapper = mountPage()
    await settled()
    expect(wrapper.find('[data-test="blocker"]').text()).toBe('mrg_module_off')
    expect(named('ListRecipes')).toHaveLength(0)
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
})

import { mount } from '@vue/test-utils'
import MarginCostPanel from '~/components/admin/margin/MarginCostPanel.vue'
import { readCostPreview, ingredientNames } from '~/utils/margin/cost-preview'
import translations from '~/translations'

// The real Norwegian dictionary, resolved the way plugins/i18n.js resolves it, so these assert the
// copy a venue actually sees — and fail if a key was never added.
const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}

// The admin's money formatter lives on the global mixin (plugins/global-mixin.js), which resolves
// `priceLabel` out of `~/core/helpers/tools` — a git submodule this repo carries no checkout of, so
// it cannot be imported here. These stand-ins reproduce its shape exactly (minor units in, "kr "
// prefix, space-grouped whole part, comma, two-digit fraction), the same way the Workforce component
// tests supply theirs. What is under test is WHICH figure is rendered, never the grouping.
const wholeAmount = minor => String(Math.trunc(Math.abs(minor) / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const fractionAmount = minor => String(Math.abs(minor) % 100).padStart(2, '0')
const priceLabel = minor => 'kr ' + wholeAmount(minor) + ',' + fractionAmount(minor)

const LAKS = '11111111-1111-1111-1111-111111111111'
const FLOTE = '22222222-2222-2222-2222-222222222222'
const LOK = '33333333-3333-3333-3333-333333333333'
const ACTIVE_V = 'aaaaaaaa-0000-0000-0000-000000000001'
const DRAFT_V2 = 'bbbbbbbb-0000-0000-0000-000000000002'

// See `test/margin-cost-preview.test.js` for the arithmetic: three fractional lines round to
// 188 + 35 + 4 = 227, while the batch total, rounded once over the unrounded 225.85, is 226. Both
// are correct; only one is the total. That real one-øre gap is what the first test discriminates on.
const LINES = [
  { componentId: 'c-laks', ingredientId: LAKS, subRecipeId: null, quantity: 800, unitCode: 'g', lineCostMinor: 188, incomplete: false },
  { componentId: 'c-flote', ingredientId: FLOTE, subRecipeId: null, quantity: 1000, unitCode: 'ml', lineCostMinor: 35, incomplete: false },
  { componentId: 'c-lok', ingredientId: LOK, subRecipeId: null, quantity: 300, unitCode: 'g', lineCostMinor: 4, incomplete: false }
]

const NAMES = ingredientNames({
  ingredients: [
    { ingredientId: LAKS, name: 'Laks' },
    { ingredientId: FLOTE, name: 'Fløte' },
    { ingredientId: LOK, name: 'Løk' }
  ]
})

function detail (previewOver, detailOver) {
  return Object.assign({
    recipeId: 'r-1',
    name: 'Fiskesuppe',
    activeVersion: {
      recipeVersionId: ACTIVE_V,
      versionNumber: 1,
      state: 'Active',
      yieldQuantity: 4,
      yieldUnit: 'Liter',
      portionCount: 20,
      revision: 'rev-active'
    },
    draftVersions: [],
    costPreview: Object.assign({
      recipeVersionId: ACTIVE_V,
      totalCostMinor: 226,
      perPortionCostMinor: 11,
      currency: 'NOK',
      complete: true,
      incompleteReasons: [],
      pricedAtUtc: '2026-03-01T12:00:00Z',
      lines: LINES
    }, previewOver)
  }, detailOver)
}

function render (options) {
  const opts = options || {}
  const cost = readCostPreview(
    opts.detail === undefined ? detail() : opts.detail,
    opts.names === undefined ? NAMES : opts.names
  )
  return mount(MarginCostPanel, {
    propsData: {
      cost,
      currency: opts.currency === undefined ? 'NOK' : opts.currency,
      locale: 'no'
    },
    mocks: { $i, priceLabel, wholeAmount, fractionAmount }
  })
}

describe('the batch total is READ, never summed from the column', () => {
  test('the panel prints 226 while its own line column adds to 227', () => {
    const wrapper = render()

    const lineCells = wrapper.findAll('[data-test="line-cost"]')
    // CONTROL: the column is really on screen with real numbers, so the assertion below is a
    // discrimination between two rendered figures rather than a check that the panel is blank.
    expect(lineCells.length).toBe(3)
    expect(lineCells.at(0).text()).toBe(priceLabel(188))
    expect(lineCells.at(1).text()).toBe(priceLabel(35))
    expect(lineCells.at(2).text()).toBe(priceLabel(4))

    const sumOfLines = 188 + 35 + 4
    expect(sumOfLines).toBe(227)
    expect(wrapper.find('[data-test="batch-cost"]').text()).toBe(priceLabel(226))
    expect(wrapper.find('[data-test="batch-cost"]').text()).not.toBe(priceLabel(sumOfLines))
  })

  test('the per-portion figure is the wire field, not the batch divided here', () => {
    const wrapper = render()
    expect(wrapper.find('[data-test="portion-cost"]').text()).toBe(priceLabel(11))
  })

  test('the caveat about the column not adding up is on screen, not left to be inferred', () => {
    expect(render().text()).toContain(translations.no.mrg_cost_no_sum_caveat)
  })
})

describe('an unpriced line is a dash and a reason, never kr 0,00', () => {
  // The two lines carry the SAME wire value — `lineCostMinor: 0` — and differ only in the flag. One
  // 0 means the line is free; the other means the calculator could not price it and wrote 0 anyway.
  test('the same wire 0 renders as an amount when priced and as a dash when not', () => {
    const wrapper = render({
      detail: detail({
        complete: false,
        totalCostMinor: 0,
        perPortionCostMinor: 0,
        lines: [
          Object.assign({}, LINES[0], { lineCostMinor: 0, incomplete: false }),
          Object.assign({}, LINES[1], { lineCostMinor: 0, incomplete: true })
        ]
      })
    })

    const cells = wrapper.findAll('[data-test="line-cost"]')
    expect(cells.at(0).text()).toBe(priceLabel(0))
    expect(cells.at(1).text()).toBe('—')
  })

  test('an unpriced line says why, against the ingredient name', () => {
    const wrapper = render({
      detail: detail({
        complete: false,
        totalCostMinor: 188,
        perPortionCostMinor: 9,
        lines: [LINES[0], Object.assign({}, LINES[1], { lineCostMinor: 0, incomplete: true })]
      })
    })

    expect(wrapper.text()).toContain('Fløte')
    expect(wrapper.text()).toContain(translations.no.mrg_line_flag_no_price)
  })

  // The server's own `incompleteReasons` are English prose with a raw Guid embedded. They stay off
  // the screen; a venue cannot read a Guid.
  test('no raw Guid reaches the screen', () => {
    const wrapper = render({
      detail: detail({
        complete: false,
        totalCostMinor: 188,
        lines: [LINES[0], Object.assign({}, LINES[1], { lineCostMinor: 0, incomplete: true })],
        incompleteReasons: ['Ingredient ' + FLOTE + ' has no effective price at the priced instant.']
      })
    })
    expect(wrapper.text()).not.toContain(FLOTE)
  })
})

describe('the three ways an incomplete cost can end', () => {
  const someUnpriced = detail({
    complete: false,
    totalCostMinor: 188,
    perPortionCostMinor: 9,
    lines: [LINES[0], Object.assign({}, LINES[1], { lineCostMinor: 0, incomplete: true })]
  })

  const noneUnpriced = detail({
    complete: false,
    totalCostMinor: 0,
    perPortionCostMinor: 0,
    lines: [
      Object.assign({}, LINES[0], { lineCostMinor: 0, incomplete: true }),
      Object.assign({}, LINES[1], { lineCostMinor: 0, incomplete: true })
    ]
  })

  test('SOME priced: the amounts are shown as the lower bounds they are', () => {
    const wrapper = render({ detail: someUnpriced })
    expect(wrapper.find('[data-test="batch-cost"]').text()).toBe('minst ' + priceLabel(188))
    expect(wrapper.find('[data-test="cost-notice"]').text()).toContain('1 av 2 linjer mangler pris')
  })

  // The pair. Same shape, same wire, one line's flag flipped — and the answer must be a refusal
  // rather than "minst kr 0,00", which reads as free.
  test('NONE priced: the panel shows the unknown mark, not a floor of zero', () => {
    const wrapper = render({ detail: noneUnpriced })
    expect(wrapper.find('[data-test="batch-cost"]').text()).toBe('—')
    expect(wrapper.find('[data-test="portion-cost"]').text()).toBe('—')
    expect(wrapper.text()).not.toContain('minst ' + priceLabel(0))
    expect(wrapper.find('[data-test="cost-notice"]').text()).toContain('ukjent')
  })

  test('COMPLETE: no floor prefix and no warning', () => {
    const wrapper = render()
    expect(wrapper.find('[data-test="batch-cost"]').text()).toBe(priceLabel(226))
    expect(wrapper.text()).not.toContain('minst')
    expect(wrapper.find('[data-test="cost-notice"]').exists()).toBe(false)
  })

  test('a recipe with no version to price says so, and is not the same screen as a failed read', () => {
    const notCosted = render({ detail: detail({}, { costPreview: null, activeVersion: null }) })
    const unknown = render({ detail: null })

    expect(notCosted.find('[data-test="cost-notice"]').text()).toBe(translations.no.mrg_cost_not_costed)
    expect(unknown.find('[data-test="cost-notice"]').text()).toBe(translations.no.mrg_cost_unknown)
    expect(notCosted.find('[data-test="cost-notice"]').text()).not.toBe(unknown.find('[data-test="cost-notice"]').text())
  })
})

describe('this panel is about COST, and says nothing about the margin', () => {
  // `GET /margin/menu-margin` is now built and `MarginMenuMarginPanel` renders it against the price
  // the till would charge, resolving the version active at the read instant. THIS panel previews the
  // Active version or falls back to the latest Draft, which is a different document — so the two must
  // not share a slot, and a plate cost must never appear under a heading about margin.
  test('no margin figure and no menu price appear beside the plate cost', () => {
    const wrapper = render()

    expect(wrapper.find('[data-test="batch-cost"]').text()).toBe(priceLabel(226))
    expect(wrapper.find('[data-test="menu-margin"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain(translations.no.mrg_margin_title)
  })

  // A percentage is what a margin looks like. Nothing on the cost panel produces one, and a food-cost
  // percent invented beside a plate cost is the exact figure someone would price a dish on.
  test('no percentage is rendered anywhere on the panel', () => {
    expect(render().text()).not.toContain('%')
    expect(render({ detail: detail({ complete: false, totalCostMinor: 188, lines: [LINES[0], Object.assign({}, LINES[1], { incomplete: true, lineCostMinor: 0 })] }) }).text()).not.toContain('%')
  })
})

describe('which version the figures belong to', () => {
  test('an active version is badged as active', () => {
    expect(render().text()).toContain('Aktiv v1')
  })

  // The backend falls back to the latest Draft when nothing is active, and says so nowhere on the
  // wire. A screen that did not distinguish these would show a draft cost as the menu cost.
  test('the draft fallback is badged as a draft, not as the menu', () => {
    const wrapper = render({
      detail: detail(
        { recipeVersionId: DRAFT_V2 },
        {
          activeVersion: null,
          draftVersions: [{ recipeVersionId: DRAFT_V2, versionNumber: 2, state: 'Draft', yieldQuantity: 4, yieldUnit: 'Liter', portionCount: 20, revision: 'rev-d2' }]
        }
      )
    })
    expect(wrapper.text()).toContain('Utkast v2')
    expect(wrapper.text()).not.toContain('Aktiv v')
  })
})

describe('money priced in another currency keeps its own code', () => {
  test('a foreign currency is printed with its ISO code and no kroner symbol', () => {
    const wrapper = render({ detail: detail({ currency: 'SEK' }), currency: 'NOK' })
    const batch = wrapper.find('[data-test="batch-cost"]').text()
    expect(batch).toBe('2,26 SEK')
    expect(batch).not.toContain('kr')
  })

  // CONTROL: the same fixture in the admin's own currency DOES take the symbol, so the row above is
  // a discrimination rather than a formatter that never prints "kr".
  test('the market currency is printed through the admin money formatter', () => {
    expect(render({ detail: detail({ currency: 'NOK' }), currency: 'NOK' }).find('[data-test="batch-cost"]').text())
      .toBe(priceLabel(226))
  })
})

describe('naming a line', () => {
  test('a resolved name, a name the list does not hold, and a list that never answered', () => {
    const partial = ingredientNames({ ingredients: [{ ingredientId: LAKS, name: 'Laks' }] })
    const resolved = render({ names: partial })
    expect(resolved.text()).toContain('Laks')
    expect(resolved.text()).toContain(translations.no.mrg_line_ingredient_gone)

    const unknown = render({ names: null })
    expect(unknown.text()).toContain(translations.no.mrg_line_ingredient_unknown)
    // The claim "this ingredient is no longer in the list" rests on a list that answered. It must
    // not be made off a read that never happened.
    expect(unknown.text()).not.toContain(translations.no.mrg_line_ingredient_gone)
  })
})

describe('the recipe facts that make the money readable', () => {
  test('the yield and the portion count are shown beside the two figures', () => {
    const text = render().text()
    expect(text).toContain('for 4 liter')
    expect(text).toContain('delt på 20 porsjoner')
  })
})

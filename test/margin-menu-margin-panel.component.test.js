import { mount } from '@vue/test-utils'
import MarginMenuMarginPanel from '~/components/admin/margin/MarginMenuMarginPanel.vue'
import { readMenuMargin } from '~/utils/margin/menu-margin'
import translations from '~/translations'

// The real Norwegian dictionary, resolved the way plugins/i18n.js resolves it, so these assert the
// copy a venue actually sees — and fail if a key was never added.
const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}

// The admin's money formatter lives on the global mixin, which resolves `priceLabel` out of
// `~/core/helpers/tools` — a git submodule this repo carries no checkout of, so it cannot be imported
// here. These stand-ins reproduce its shape exactly, the same way the cost-panel test supplies theirs.
// What is under test is WHICH figure is rendered, never the grouping.
const wholeAmount = minor => String(Math.trunc(Math.abs(minor) / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const fractionAmount = minor => String(Math.abs(minor) % 100).padStart(2, '0')
const priceLabel = minor => 'kr ' + wholeAmount(minor) + ',' + fractionAmount(minor)

const RECIPE = 'aaaaaaaa-0000-0000-0000-000000000001'
const SOUP = 'pppppppp-0000-0000-0000-000000000001'
const HERB_SOUP = 'pppppppp-0000-0000-0000-000000000002'

const DASH = '—'

function row (over) {
  return Object.assign({
    productId: SOUP,
    productName: 'Tomatsuppe',
    goodsGroupName: 'Mat',
    productHidden: false,
    recipeId: RECIPE,
    recipeName: 'Tomatsuppe',
    quantityPerSoldUnit: 0.25,
    linkBroken: false,
    priceBasis: 'Base',
    vatPercent: 15,
    grossPriceMinor: 14900,
    depositMinor: 0,
    netPriceMinor: 12957,
    plateCostMinor: 905,
    contributionMinor: 12052,
    foodCostPercent: 905 / 12957 * 100,
    costComplete: true,
    incompleteReasons: []
  }, over)
}

function render (rows, options) {
  const opts = options || {}
  const response = rows === null
    ? null
    : {
      storeId: 42,
      currency: opts.wireCurrency === undefined ? 'NOK' : opts.wireCurrency,
      pricedAtUtc: '2026-03-01T12:00:00Z',
      rows,
      unlinkedRecipes: opts.unlinkedRecipes || []
    }

  return mount(MarginMenuMarginPanel, {
    propsData: {
      menuMargin: readMenuMargin(response),
      recipeId: opts.recipeId === undefined ? RECIPE : opts.recipeId,
      recipeKind: opts.recipeKind === undefined ? 'Sellable' : opts.recipeKind,
      currency: opts.currency === undefined ? 'NOK' : opts.currency,
      locale: 'no'
    },
    mocks: { $i, priceLabel, wholeAmount, fractionAmount }
  })
}

const cell = (wrapper, basis, test) =>
  wrapper.find('[data-basis="' + basis + '"]').find('[data-test="' + test + '"]').text()

describe('the golden dish, in all three VAT contexts', () => {
  // MB4-1 from the backend's acceptance suite, to the øre: one plate cost of 905 against three
  // different ex-VAT nets. The eat-in surcharge of 2000 øre is charged at 25 %, so eat-in nets only
  // 563 øre more than take-away — the exact reason a single-basis surface would be wrong.
  const THREE = [
    row({ priceBasis: 'Base', vatPercent: 15, grossPriceMinor: 14900, netPriceMinor: 12957, contributionMinor: 12052, foodCostPercent: 905 / 12957 * 100 }),
    row({ priceBasis: 'Table', vatPercent: 25, grossPriceMinor: 16900, netPriceMinor: 13520, contributionMinor: 12615, foodCostPercent: 905 / 13520 * 100 }),
    row({ priceBasis: 'Delivery', vatPercent: 15, grossPriceMinor: 17900, netPriceMinor: 15566, contributionMinor: 14661, foodCostPercent: 905 / 15566 * 100 })
  ]

  test('every basis is on screen, with the figure the backend computed', () => {
    const wrapper = render(THREE)

    expect(wrapper.findAll('[data-test="mm-row"]')).toHaveLength(3)

    expect(cell(wrapper, 'Base', 'mm-net')).toBe(priceLabel(12957))
    expect(cell(wrapper, 'Base', 'mm-plate')).toBe(priceLabel(905))
    expect(cell(wrapper, 'Base', 'mm-contribution')).toBe(priceLabel(12052))
    expect(cell(wrapper, 'Base', 'mm-food-cost')).toBe('6,98 %')

    expect(cell(wrapper, 'Table', 'mm-net')).toBe(priceLabel(13520))
    expect(cell(wrapper, 'Table', 'mm-contribution')).toBe(priceLabel(12615))
    expect(cell(wrapper, 'Table', 'mm-food-cost')).toBe('6,69 %')

    expect(cell(wrapper, 'Delivery', 'mm-net')).toBe(priceLabel(15566))
    expect(cell(wrapper, 'Delivery', 'mm-contribution')).toBe(priceLabel(14661))
    expect(cell(wrapper, 'Delivery', 'mm-food-cost')).toBe('5,81 %')
  })

  // A percentage with no basis beside it is not a number: the same plate cost reads 6,98 % or 6,69 %
  // depending on which VAT the till charges.
  test('each figure carries the basis it belongs to, and its VAT rate', () => {
    const wrapper = render(THREE)
    const first = wrapper.find('[data-basis="Base"]')
    const second = wrapper.find('[data-basis="Table"]')

    expect(first.text()).toContain(translations.no.mrg_margin_basis_base)
    expect(first.text()).toContain('15 % mva.')
    expect(second.text()).toContain(translations.no.mrg_margin_basis_table)
    expect(second.text()).toContain('25 % mva.')
  })

  test('nothing on the panel is summed: the plate cost is one figure repeated, not divided per basis', () => {
    const wrapper = render(THREE)
    for (const basis of ['Base', 'Table', 'Delivery']) {
      expect(cell(wrapper, basis, 'mm-plate')).toBe(priceLabel(905))
    }
  })

  test('the dish header names the product, its goods group and what one sold unit consumes', () => {
    const text = render(THREE).text()
    expect(text).toContain('Tomatsuppe')
    expect(text).toContain('Mat')
    expect(text).toContain('0,25')
  })
})

describe('a withheld figure is a dash, never a zero', () => {
  // THE PAIR, in one fixture and one assertion block: a dish priced exactly at its plate cost earns a
  // real zero, and a dish whose cost could not be computed earns an unknown. Rendering both as
  // "kr 0,00" collapses two opposite decisions — reprice versus investigate.
  const BREAK_EVEN = row({
    productId: SOUP,
    productName: 'Nullsuppe',
    priceBasis: 'Base',
    vatPercent: 25,
    netPriceMinor: 10000,
    plateCostMinor: 10000,
    contributionMinor: 0,
    foodCostPercent: 100,
    costComplete: true
  })
  const UNKNOWN = row({
    productId: HERB_SOUP,
    productName: 'Urtesuppe',
    priceBasis: 'Base',
    vatPercent: 25,
    netPriceMinor: 10000,
    plateCostMinor: 0,
    contributionMinor: null,
    foodCostPercent: null,
    costComplete: false
  })

  test('a genuine zero prints kr 0,00 and 100,00 %, and the unknown beside it prints a dash', () => {
    const wrapper = render([BREAK_EVEN, UNKNOWN])
    const dishes = wrapper.findAll('[data-test="mm-dish"]')
    expect(dishes).toHaveLength(2)

    const earnsNothing = dishes.at(0)
    const unknown = dishes.at(1)

    // CONTROL: the panel really can print a zero as money. Without this the dash below would prove
    // only that the panel prints dashes.
    expect(earnsNothing.find('[data-test="mm-contribution"]').text()).toBe(priceLabel(0))
    expect(earnsNothing.find('[data-test="mm-food-cost"]').text()).toBe('100,00 %')

    expect(unknown.find('[data-test="mm-contribution"]').text()).toBe(DASH)
    expect(unknown.find('[data-test="mm-food-cost"]').text()).toBe(DASH)
    expect(unknown.find('[data-test="mm-contribution"]').text()).not.toBe(priceLabel(0))
    expect(unknown.find('[data-test="mm-food-cost"]').text()).not.toBe('0,00 %')
  })

  // The refused number, named: net 10000 minus the zero-cost BOUND is 10000 øre of contribution — a
  // full-margin dish, the best row on the menu, on a dish whose cost nobody knows.
  test('the zero cost bound never becomes a full contribution', () => {
    const wrapper = render([UNKNOWN])
    expect(UNKNOWN.netPriceMinor - UNKNOWN.plateCostMinor).toBe(10000)
    expect(wrapper.find('[data-test="mm-contribution"]').text()).not.toBe(priceLabel(10000))
    expect(wrapper.find('[data-test="mm-contribution"]').text()).toBe(DASH)
  })

  test('a dish with no menu price withholds both derived figures and says why', () => {
    // MB4-4: the cost IS known (1000 øre of beans) and the price is not. The naive net−cost with the
    // absent price read as zero yields −1000 øre, the worst contribution on the menu.
    const wrapper = render([row({
      netPriceMinor: null,
      plateCostMinor: 1000,
      costComplete: true,
      contributionMinor: null,
      foodCostPercent: null
    })])

    expect(wrapper.find('[data-test="mm-net"]').text()).toBe(DASH)
    // CONTROL: the cost half IS rendered on the very same row, so the two dashes are a decision.
    expect(wrapper.find('[data-test="mm-plate"]').text()).toBe(priceLabel(1000))
    expect(wrapper.find('[data-test="mm-contribution"]').text()).toBe(DASH)
    expect(wrapper.find('[data-test="mm-contribution"]').text()).not.toBe('−' + priceLabel(1000))
    expect(wrapper.find('[data-test="mm-withheld"]').text()).toContain(translations.no.mrg_margin_why_no_price)
  })

  test('a row missing both halves names both reasons, not just the first', () => {
    const wrapper = render([row({
      netPriceMinor: null,
      plateCostMinor: null,
      costComplete: false,
      contributionMinor: null,
      foodCostPercent: null
    })])
    const why = wrapper.find('[data-test="mm-withheld"]').text()
    expect(why).toContain(translations.no.mrg_margin_why_no_price)
    expect(why).toContain(translations.no.mrg_margin_why_no_cost)
  })
})

describe('the three plate-cost states render as three different things', () => {
  const exact = row({ plateCostMinor: 905, costComplete: true })
  const floor = row({ productId: HERB_SOUP, productName: 'Trøffelsuppe', plateCostMinor: 2420, costComplete: false, contributionMinor: null, foodCostPercent: null })
  const absent = row({ productId: 'pppppppp-0000-0000-0000-000000000003', productName: 'Ukoblet', plateCostMinor: null, costComplete: false, contributionMinor: null, foodCostPercent: null })

  test('exact, "at least", and a dash — one screen, three renderings', () => {
    const dishes = render([exact, floor, absent]).findAll('[data-test="mm-dish"]')

    expect(dishes.at(0).find('[data-test="mm-plate"]').text()).toBe(priceLabel(905))
    expect(dishes.at(1).find('[data-test="mm-plate"]').text()).toBe('minst ' + priceLabel(2420))
    expect(dishes.at(2).find('[data-test="mm-plate"]').text()).toBe(DASH)

    expect(dishes.at(0).find('[data-test="mm-plate"]').attributes('data-plate-state')).toBe('exact')
    expect(dishes.at(1).find('[data-test="mm-plate"]').attributes('data-plate-state')).toBe('floor')
    expect(dishes.at(2).find('[data-test="mm-plate"]').attributes('data-plate-state')).toBe('absent')
  })

  // A version with NO components costs 0 and is complete: a fact. A version nothing could be priced
  // for also reports 0, as a bound. The wire value is identical; only the flag differs.
  test('the same wire 0 is "kr 0,00" when complete and "minst kr 0,00" when it is a bound', () => {
    const trueZero = render([row({ plateCostMinor: 0, costComplete: true, contributionMinor: 12957, foodCostPercent: 0 })])
    const boundZero = render([row({ plateCostMinor: 0, costComplete: false, contributionMinor: null, foodCostPercent: null })])

    expect(trueZero.find('[data-test="mm-plate"]').text()).toBe(priceLabel(0))
    expect(boundZero.find('[data-test="mm-plate"]').text()).toBe('minst ' + priceLabel(0))
    expect(trueZero.find('[data-test="mm-plate"]').text()).not.toBe(boundZero.find('[data-test="mm-plate"]').text())
  })
})

describe('the percentage is a ratio, and is never money', () => {
  // 6.9846…% must not go anywhere near the money formatter: as minor units it would print "kr 0,06",
  // and as a naive ×100 it would print "kr 698,46". Both are on screen-shaped numbers, and both are
  // the wrong kind of number.
  test('a food-cost percent is rounded to 2 dp and carries a per-cent sign, not a currency', () => {
    const wrapper = render([row()])
    const shown = wrapper.find('[data-test="mm-food-cost"]').text()

    expect(shown).toBe('6,98 %')
    expect(shown).not.toContain('kr')
    expect(shown).not.toBe(priceLabel(6.98))
    expect(shown).not.toBe(priceLabel(698))
  })

  // CONTROL: money on the SAME row does go through the money formatter, so the row above discriminates
  // between two formatters rather than proving the panel never prints "kr".
  test('CONTROL: the money beside it does carry the currency', () => {
    expect(render([row()]).find('[data-test="mm-net"]').text()).toContain('kr')
  })

  test('the ratio is not multiplied or divided on its way to the screen', () => {
    // 100 % must read as 100,00 %, not 1,00 % (a fraction misread) and not 10 000,00 % (×100 twice).
    const wrapper = render([row({ netPriceMinor: 10000, plateCostMinor: 10000, contributionMinor: 0, foodCostPercent: 100 })])
    expect(wrapper.find('[data-test="mm-food-cost"]').text()).toBe('100,00 %')
  })

  test('rounding happens at presentation and away from zero, matching the backend export', () => {
    // The backend renders this same value with MidpointRounding.AwayFromZero to "12.35".
    const wrapper = render([row({ foodCostPercent: 12.345 })])
    expect(wrapper.find('[data-test="mm-food-cost"]').text()).toBe('12,35 %')
  })
})

describe('a loss is rendered as a loss', () => {
  // The row this surface exists for: a dish whose plate cost exceeds its ex-VAT net price. It is the
  // one figure a venue acts on immediately, and it must not be mistaken for a gain.
  test('a negative contribution keeps its sign', () => {
    const wrapper = render([row({ netPriceMinor: 8000, plateCostMinor: 10000, contributionMinor: -2000, foodCostPercent: 125 })])
    expect(wrapper.find('[data-test="mm-contribution"]').text()).toBe('−' + priceLabel(2000))
    expect(wrapper.find('[data-test="mm-contribution"]').text()).not.toBe(priceLabel(2000))
  })

  // Core's formatter builds the amount by string-slicing the minor units, which garbles a negative one
  // below a krone: −9 øre would come out as "kr 0,-9". The magnitude goes through the formatter and
  // the sign is placed in front, so the small loss is still a readable amount.
  test('a loss smaller than one krone is still a readable amount', () => {
    const wrapper = render([row({ netPriceMinor: 8000, plateCostMinor: 8009, contributionMinor: -9, foodCostPercent: 100.1125 })])
    const shown = wrapper.find('[data-test="mm-contribution"]').text()
    expect(shown).toBe('−' + priceLabel(9))
    expect(shown).not.toContain('0,-9')
  })

  // CONTROL: a positive contribution is untouched by the sign rule.
  test('CONTROL: a positive contribution carries no minus', () => {
    expect(render([row()]).find('[data-test="mm-contribution"]').text()).toBe(priceLabel(12052))
  })
})

describe('the four ways a recipe can carry no margin, kept apart', () => {
  test('the read did not answer', () => {
    const wrapper = render(null)
    expect(wrapper.find('[data-test="mm-unknown"]').text()).toBe(translations.no.mrg_margin_read_unknown)
    expect(wrapper.find('[data-test="mm-unsold"]').exists()).toBe(false)
  })

  test('the read answered and named this recipe as one nobody sells', () => {
    const wrapper = render([], { unlinkedRecipes: [{ recipeId: RECIPE, name: 'Personalmat', kind: 'Sellable' }] })
    expect(wrapper.find('[data-test="mm-unsold"]').text()).toBe(translations.no.mrg_margin_unsold)
    expect(wrapper.find('[data-test="mm-unknown"]').exists()).toBe(false)
  })

  test('the recipe is a sub-recipe, which has no menu price by design', () => {
    const wrapper = render([], { recipeKind: 'Component' })
    expect(wrapper.find('[data-test="mm-sub-recipe"]').text()).toBe(translations.no.mrg_margin_sub_recipe)
    expect(wrapper.find('[data-test="mm-unsold"]').exists()).toBe(false)
  })

  test('the read answered, the recipe is sellable and linked, and yet nothing came back for it', () => {
    const wrapper = render([])
    expect(wrapper.find('[data-test="mm-absent"]').text()).toBe(translations.no.mrg_margin_no_rows)
    expect(wrapper.find('[data-test="mm-unsold"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="mm-unknown"]').exists()).toBe(false)
  })

  // CONTROL for all four: with rows, none of the four notices appears and the figures do.
  test('CONTROL: a recipe that IS sold shows figures and none of the four notices', () => {
    const wrapper = render([row()])
    for (const state of ['mm-unknown', 'mm-unsold', 'mm-sub-recipe', 'mm-absent']) {
      expect(wrapper.find('[data-test="' + state + '"]').exists()).toBe(false)
    }
    expect(wrapper.find('[data-test="mm-contribution"]').text()).toBe(priceLabel(12052))
  })
})

describe('what the catalog says about the dish, surfaced rather than dropped', () => {
  test('a hidden product and a broken link are flagged, not filtered out', () => {
    const wrapper = render([row({ productHidden: true, linkBroken: true })])
    expect(wrapper.find('[data-test="mm-hidden"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="mm-broken"]').exists()).toBe(true)
    // Still shows its figures: F2 says surfaced, never silently dropped.
    expect(wrapper.find('[data-test="mm-contribution"]').text()).toBe(priceLabel(12052))
  })

  // Pant sits inside the price and OUTSIDE the VAT base. Showing it is what stops the net looking
  // like arithmetic that failed — taking the net off the gross reads 29.76 % where 32.05 % is true.
  test('a deposit inside the price is named beside the net', () => {
    const withPant = render([row({ grossPriceMinor: 16900, depositMinor: 200 })])
    expect(withPant.find('[data-test="mm-deposit"]').text()).toContain(priceLabel(200))
    // CONTROL: a dish with no deposit says nothing about one.
    expect(render([row()]).find('[data-test="mm-deposit"]').exists()).toBe(false)
  })
})

describe('money the API priced in another currency keeps its own code', () => {
  test('a foreign currency is printed with its ISO code and no kroner symbol', () => {
    const wrapper = render([row()], { wireCurrency: 'SEK', currency: 'NOK' })
    const contribution = wrapper.find('[data-test="mm-contribution"]').text()
    expect(contribution).toBe('120,52 SEK')
    expect(contribution).not.toContain('kr')
  })

  // CONTROL: the same fixture in the admin's own currency DOES take the symbol.
  test('CONTROL: the market currency goes through the admin money formatter', () => {
    expect(render([row()], { wireCurrency: 'NOK', currency: 'NOK' }).find('[data-test="mm-contribution"]').text())
      .toBe(priceLabel(12052))
  })
})

import {
  readMenuMargin,
  readMenuMarginRow,
  readProductLinks,
  dishesForRecipe,
  isRecipeUnsold,
  MENU_MARGIN_UNKNOWN,
  MENU_MARGIN_READY,
  PLATE_ABSENT,
  PLATE_FLOOR,
  PLATE_EXACT,
  BLOCKED_NO_PRICE,
  BLOCKED_NO_COST,
  BLOCKED_COST_INCOMPLETE
} from '~/utils/margin/menu-margin'

// The fixtures below are the backend's own, lifted from `WebApi.Tests/Margin/MarginMenuMarginReadTests.cs`
// so the model is read against the numbers the shipped endpoint actually produces rather than against
// numbers invented to suit it.
const RECIPE = 'aaaaaaaa-0000-0000-0000-000000000001'
const OTHER_RECIPE = 'aaaaaaaa-0000-0000-0000-000000000002'
const SOUP = 'pppppppp-0000-0000-0000-000000000001'
const OTHER_DISH = 'pppppppp-0000-0000-0000-000000000002'

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

function body (rows, over) {
  return Object.assign({
    storeId: 42,
    currency: 'NOK',
    pricedAtUtc: '2026-03-01T12:00:00Z',
    rows,
    unlinkedRecipes: []
  }, over)
}

describe('a read that did not answer is UNKNOWN, never "no dish earns anything"', () => {
  // The pair: the ONLY difference is whether the body arrived. They must not produce the same model,
  // because one is a claim about the network and the other is a claim about the menu.
  test('null, a non-object and a body without rows are all unknown', () => {
    for (const bad of [null, undefined, 'nope', {}, { rows: null }]) {
      expect(readMenuMargin(bad).state).toBe(MENU_MARGIN_UNKNOWN)
    }
  })

  test('CONTROL: a body with an EMPTY row list is READY, and says the store has no priced dish', () => {
    const model = readMenuMargin(body([]))
    expect(model.state).toBe(MENU_MARGIN_READY)
    expect(model.rows).toEqual([])
    expect(model.state).not.toBe(MENU_MARGIN_UNKNOWN)
  })

  test('the unknown model carries no figures to accidentally render', () => {
    const model = readMenuMargin(null)
    expect(model.rows).toEqual([])
    expect(model.products).toEqual([])
    expect(model.currency).toBeNull()
    expect(model.pricedAt).toBeNull()
  })
})

describe('the contribution is READ, never recomputed as net minus plate', () => {
  // The sharpest probe on this module. The wire is given a contribution that DISAGREES with
  // `net − plate` — which is exactly what the backend's own rounding can produce, since the plate cost
  // is rounded half-up once after the quantity multiplication. A model that recomputed would answer
  // 12052; the wire says 12051, and the wire wins.
  test('a wire contribution that disagrees with the subtraction is the one that survives', () => {
    const read = readMenuMarginRow(row({ contributionMinor: 12051 }))

    expect(read.netPriceMinor - read.plateCostMinor).toBe(12052)
    expect(read.contributionMinor).toBe(12051)
    expect(read.contributionMinor).not.toBe(read.netPriceMinor - read.plateCostMinor)
  })

  // CONTROL: when the wire agrees with the subtraction the reader still returns the wire's own field,
  // so the row above is a discrimination and not a reader that mangles every contribution.
  test('CONTROL: an agreeing contribution is returned unchanged', () => {
    const read = readMenuMarginRow(row())
    expect(read.contributionMinor).toBe(12052)
    expect(read.contributionMinor).toBe(read.netPriceMinor - read.plateCostMinor)
  })

  test('the food-cost percent is the wire ratio, not plate ÷ net computed here', () => {
    // A deliberately wrong-but-plausible ratio: a reader that derived one would answer 6.9846…
    const read = readMenuMarginRow(row({ foodCostPercent: 42.5 }))
    expect(read.foodCostPercent).toBe(42.5)
    expect(read.foodCostPercent).not.toBeCloseTo(905 / 12957 * 100, 6)
  })

  // The ratio arrives exact and unrounded and must reach presentation that way: rounding it in the
  // model would put the rounding a layer below the only place allowed to do it.
  test('the ratio keeps its full precision through the model', () => {
    const exact = 905 / 12957 * 100
    expect(readMenuMarginRow(row()).foodCostPercent).toBe(exact)
    expect(readMenuMarginRow(row()).foodCostPercent).not.toBe(6.98)
  })
})

describe('the three plate-cost states are three different facts', () => {
  // MB4-6 in the backend suite: a dish that earns exactly zero, a dish whose earnings are unknown,
  // and a dish with no cost side at all. Rendering any pair the same is the defect the whole honest-
  // state posture exists to prevent.
  const exactZero = readMenuMarginRow(row({ plateCostMinor: 0, costComplete: true, contributionMinor: 10000, foodCostPercent: 0, netPriceMinor: 10000 }))
  const boundZero = readMenuMarginRow(row({ plateCostMinor: 0, costComplete: false, contributionMinor: null, foodCostPercent: null, netPriceMinor: 10000 }))
  const absent = readMenuMarginRow(row({ plateCostMinor: null, costComplete: false, contributionMinor: null, foodCostPercent: null, netPriceMinor: 10000 }))

  test('the same wire 0 is an EXACT cost or a LOWER BOUND depending only on costComplete', () => {
    expect(exactZero.plateCostMinor).toBe(0)
    expect(boundZero.plateCostMinor).toBe(0)
    expect(exactZero.plateState).toBe(PLATE_EXACT)
    expect(boundZero.plateState).toBe(PLATE_FLOOR)
    expect(exactZero.plateState).not.toBe(boundZero.plateState)
  })

  test('a null plate cost is ABSENT, and never collapses to the zero bound', () => {
    expect(absent.plateCostMinor).toBeNull()
    expect(absent.plateState).toBe(PLATE_ABSENT)
    expect(absent.plateState).not.toBe(boundZero.plateState)
  })

  test('a partially priced cost is a bound, and the derived figures stay absent', () => {
    // MB4-5: 2420 øre of priced lines against a 21653 net. The flattering 11.18 % is what the partial
    // sum would have claimed, and it is what keeps a loss-making dish on the menu.
    const partial = readMenuMarginRow(row({
      netPriceMinor: 21653,
      plateCostMinor: 2420,
      costComplete: false,
      contributionMinor: null,
      foodCostPercent: null
    }))
    expect(partial.plateState).toBe(PLATE_FLOOR)
    expect(partial.contributionMinor).toBeNull()
    expect(partial.foodCostPercent).toBeNull()
    // The refused figures, derived here from the row's own fields so the refusal is a real one.
    expect(partial.netPriceMinor - partial.plateCostMinor).toBe(19233)
    expect(partial.contributionMinor).not.toBe(19233)
  })

  // The most dangerous wrong answer on the surface: a zero-cost bound turned into "0 % food cost /
  // full contribution" makes an uncosted dish look like the best on the menu.
  test('the zero BOUND never becomes a full contribution or 0 %', () => {
    expect(boundZero.netPriceMinor - boundZero.plateCostMinor).toBe(10000)
    expect(boundZero.contributionMinor).toBeNull()
    expect(boundZero.contributionMinor).not.toBe(10000)
    expect(boundZero.foodCostPercent).toBeNull()
    expect(boundZero.foodCostPercent).not.toBe(0)
  })

  // CONTROL for the row above: the genuine zero DOES carry its figures, so "absent" is a decision the
  // reader makes about one fixture and not a reader that nulls everything.
  test('CONTROL: the genuine zero keeps its contribution and its percent', () => {
    expect(exactZero.contributionMinor).toBe(10000)
    expect(exactZero.foodCostPercent).toBe(0)
  })
})

describe('why a margin is missing, named in full', () => {
  test('a dish with no menu price says so, and 0 is not the answer', () => {
    const unpriced = readMenuMarginRow(row({ netPriceMinor: null, contributionMinor: null, foodCostPercent: null }))
    expect(unpriced.netPriceMinor).toBeNull()
    expect(unpriced.blockers).toEqual([BLOCKED_NO_PRICE])
  })

  test('both halves missing names BOTH reasons rather than the first', () => {
    const neither = readMenuMarginRow(row({
      netPriceMinor: null,
      plateCostMinor: null,
      costComplete: false,
      contributionMinor: null,
      foodCostPercent: null
    }))
    expect(neither.blockers).toEqual([BLOCKED_NO_PRICE, BLOCKED_NO_COST])
  })

  test('an incomplete cost is a different reason from an absent one', () => {
    const incomplete = readMenuMarginRow(row({ costComplete: false, plateCostMinor: 2420, contributionMinor: null, foodCostPercent: null }))
    expect(incomplete.blockers).toEqual([BLOCKED_COST_INCOMPLETE])
    expect(incomplete.blockers).not.toEqual([BLOCKED_NO_COST])
  })

  // CONTROL: a row that HAS its margin names no blocker, so the list above is a discrimination.
  test('CONTROL: a complete row carries no blockers at all', () => {
    expect(readMenuMarginRow(row()).blockers).toEqual([])
  })
})

describe('all three price bases survive, because a dropped row would be a lie', () => {
  const threeBases = [
    row({ priceBasis: 'Base', vatPercent: 15, netPriceMinor: 12957, contributionMinor: 12052 }),
    row({ priceBasis: 'Table', vatPercent: 25, netPriceMinor: 13520, contributionMinor: 12615 }),
    row({ priceBasis: 'Delivery', vatPercent: 15, netPriceMinor: 15566, contributionMinor: 14661 })
  ]

  test('the grouped dish keeps every basis, in the order the wire sent them', () => {
    const dishes = dishesForRecipe(readMenuMargin(body(threeBases)), RECIPE)
    expect(dishes).toHaveLength(1)
    expect(dishes[0].bases.map(b => b.priceBasis)).toEqual(['Base', 'Table', 'Delivery'])
  })

  // The point of the three rows: the SAME plate cost against three different ex-VAT nets, because
  // servering and take-away carry different VAT. A single-basis surface would report one of these as
  // the dish's margin.
  test('one plate cost, three different contributions', () => {
    const bases = dishesForRecipe(readMenuMargin(body(threeBases)), RECIPE)[0].bases
    expect(bases.map(b => b.plateCostMinor)).toEqual([905, 905, 905])
    expect(bases.map(b => b.contributionMinor)).toEqual([12052, 12615, 14661])
    expect(new Set(bases.map(b => b.contributionMinor)).size).toBe(3)
  })

  test('rows belonging to another recipe are not shown against this one', () => {
    const model = readMenuMargin(body([
      row(),
      row({ productId: OTHER_DISH, recipeId: OTHER_RECIPE, productName: 'Annet' })
    ]))
    expect(dishesForRecipe(model, RECIPE).map(d => d.productId)).toEqual([SOUP])
    // CONTROL: the other recipe's row is really in the model — it is filtered, not missing.
    expect(dishesForRecipe(model, OTHER_RECIPE).map(d => d.productId)).toEqual([OTHER_DISH])
  })

  test('two dishes made from one recipe are two groups, each with its own bases', () => {
    const model = readMenuMargin(body([
      row({ priceBasis: 'Base' }),
      row({ productId: OTHER_DISH, productName: 'Suppe stor', priceBasis: 'Base' }),
      row({ productId: OTHER_DISH, productName: 'Suppe stor', priceBasis: 'Table' })
    ]))
    const dishes = dishesForRecipe(model, RECIPE)
    expect(dishes.map(d => d.productId)).toEqual([SOUP, OTHER_DISH])
    expect(dishes[1].bases).toHaveLength(2)
  })
})

describe('a recipe nobody sells is named, not left to be inferred', () => {
  test('the read says which sellable recipes carry no active link', () => {
    const model = readMenuMargin(body([], { unlinkedRecipes: [{ recipeId: RECIPE, name: 'Personalmat', kind: 'Sellable' }] }))
    expect(isRecipeUnsold(model, RECIPE)).toBe(true)
    expect(isRecipeUnsold(model, OTHER_RECIPE)).toBe(false)
  })

  // The claim "nobody sells this" rests on a read that answered. It must not be made off one that
  // never happened, where the honest answer is that we do not know.
  test('an unknown read claims nothing about who sells what', () => {
    expect(isRecipeUnsold(readMenuMargin(null), RECIPE)).toBe(false)
    expect(dishesForRecipe(readMenuMargin(null), RECIPE)).toEqual([])
  })
})

describe('the catalog the picker is built from', () => {
  test('each product appears once, keeping the read order and its current recipe claim', () => {
    const model = readMenuMargin(body([
      row({ priceBasis: 'Base' }),
      row({ priceBasis: 'Table' }),
      row({ productId: OTHER_DISH, productName: 'Brus', recipeId: null, recipeName: null, priceBasis: 'Base' })
    ]))
    expect(model.products.map(p => p.productId)).toEqual([SOUP, OTHER_DISH])
    expect(model.products[0].recipeName).toBe('Tomatsuppe')
    // A product nobody has costed is still in the catalog — it is what a venue links next.
    expect(model.products[1].recipeId).toBeNull()
  })
})

describe('the wire stamp is parsed as an instant, never as browser-local', () => {
  test('pricedAtUtc becomes a Date at the UTC instant it names', () => {
    const model = readMenuMargin(body([]))
    expect(model.pricedAt.toISOString()).toBe('2026-03-01T12:00:00.000Z')
  })

  // The defect this guards: a stamp WITHOUT a zone handed to `new Date()` is read as browser-local,
  // which under TZ=Europe/Oslo shifts it by an hour or two. `parseApiInstant` appends the Z.
  test('a bare stamp is still read as UTC, not as Oslo wall time', () => {
    const model = readMenuMargin(body([], { pricedAtUtc: '2026-03-01T12:00:00' }))
    expect(model.pricedAt.toISOString()).toBe('2026-03-01T12:00:00.000Z')
    expect(model.pricedAt.getTime()).not.toBe(new Date('2026-03-01T12:00:00').getTime())
  })
})

describe('the recipe link set, read from its own endpoint', () => {
  const linksBody = {
    recipeId: RECIPE,
    generatedAtUtc: '2026-03-01T12:00:00Z',
    links: [
      { id: 'l-1', productId: SOUP, quantityPerSoldUnit: 0.25, isActive: true, isBroken: false, productName: 'Tomatsuppe', productHidden: false },
      { id: 'l-2', productId: OTHER_DISH, quantityPerSoldUnit: 1, isActive: false, isBroken: false, productName: 'Gammel rett', productHidden: false }
    ]
  }

  test('only the ACTIVE links seed the editor — a retired one must not be re-saved', () => {
    const links = readProductLinks(linksBody)
    expect(links.map(l => l.productId)).toEqual([SOUP])
  })

  // A link whose product the catalog no longer holds produces no menu-margin row at all, which is why
  // the editor is seeded from HERE: seeding it from the margin answer would make the next replace-set
  // save delete a link nobody was shown.
  test('a broken link survives the read and is flagged', () => {
    const links = readProductLinks({
      recipeId: RECIPE,
      links: [{ productId: OTHER_DISH, quantityPerSoldUnit: 2, isActive: true, isBroken: true, productName: null }]
    })
    expect(links).toHaveLength(1)
    expect(links[0].isBroken).toBe(true)
  })

  test('a read that did not answer is null, which is not the same as no links', () => {
    expect(readProductLinks(null)).toBeNull()
    expect(readProductLinks({})).toBeNull()
    // CONTROL: an answer with an empty list IS an answer, and it means the recipe has no links.
    expect(readProductLinks({ recipeId: RECIPE, links: [] })).toEqual([])
  })
})

import fs from 'fs'
import path from 'path'
import {
  readCostPreview,
  readRecipeRow,
  ingredientNames,
  activatableDraft,
  COST_UNKNOWN,
  COST_NOT_COSTED,
  COST_NONE_PRICED,
  COST_FLOOR,
  COST_EXACT,
  NAME_RESOLVED,
  NAME_UNRESOLVED,
  NAME_UNKNOWN
} from '~/utils/margin/cost-preview'
import { unitCodesFor, defaultUnitCodeFor, BASE_UNITS } from '~/utils/margin/units'
import translations from '~/translations'

const LAKS = '11111111-1111-1111-1111-111111111111'
const FLOTE = '22222222-2222-2222-2222-222222222222'
const LOK = '33333333-3333-3333-3333-333333333333'
const ACTIVE_V = 'aaaaaaaa-0000-0000-0000-000000000001'
const DRAFT_V2 = 'bbbbbbbb-0000-0000-0000-000000000002'
const DRAFT_V3 = 'bbbbbbbb-0000-0000-0000-000000000003'

// ---------------------------------------------------------------------------------------------
// THE ARITHMETIC THESE FIXTURES ARE BUILT ON, spelled out so the numbers are checkable by eye and
// so the one probe that matters is not an accident.
//
// The backend carries the explosion in decimal øre and rounds HALF-UP once per line AND once for the
// batch total, over the UNROUNDED sum (`MarginRecipeCostCalculator.PreviewVersionAsync`):
//
//   laks   800 g  @ 0.2345 øre/g   = 187.60 øre  ->  line 188
//   fløte 1000 ml @ 0.0345 øre/ml  =  34.50 øre  ->  line  35
//   løk    300 g  @ 0.0125 øre/g   =   3.75 øre  ->  line   4
//                        unrounded  = 225.85 øre  ->  TOTAL 226
//                     rounded lines  = 188+35+4   =        227
//
// 226 !== 227, and BOTH are correct — one is the total, the other is a column of totals. That gap is
// what every "never summed" assertion below discriminates on, and it is a real gap rather than a
// contrived one: it is what half-up rounding of three fractional lines actually produces.
// ---------------------------------------------------------------------------------------------

function line (over) {
  return Object.assign({
    componentId: 'c-' + Math.random().toString(36).slice(2, 8),
    ingredientId: LAKS,
    subRecipeId: null,
    quantity: 800,
    unitCode: 'g',
    unitCostPerBaseUnitOre: 0.2345,
    packPriceMinor: 23450,
    lineCostMinor: 188,
    incomplete: false
  }, over)
}

const PRICED_LINES = [
  line({ componentId: 'c-laks', ingredientId: LAKS, quantity: 800, unitCode: 'g', lineCostMinor: 188 }),
  line({ componentId: 'c-flote', ingredientId: FLOTE, quantity: 1000, unitCode: 'ml', lineCostMinor: 35 }),
  line({ componentId: 'c-lok', ingredientId: LOK, quantity: 300, unitCode: 'g', lineCostMinor: 4 })
]

function version (over) {
  return Object.assign({
    recipeVersionId: ACTIVE_V,
    versionNumber: 1,
    state: 'Active',
    yieldQuantity: 4,
    yieldUnit: 'Liter',
    portionCount: 20,
    // Column-loaded stamps: BARE on the wire, no `Z`. See the parse tests at the bottom.
    effectiveFrom: '2026-03-01T09:00:00',
    activatedAtUtc: '2026-03-01T09:00:00',
    revision: 'rev-active',
    components: []
  }, over)
}

function preview (over) {
  return Object.assign({
    recipeVersionId: ACTIVE_V,
    totalCostMinor: 226,
    perPortionCostMinor: 11,
    currency: 'NOK',
    complete: true,
    incompleteReasons: [],
    // Server-computed stamp: `DateTimeKind.Utc`, so it DOES carry a `Z`.
    pricedAtUtc: '2026-03-01T12:00:00Z',
    lines: PRICED_LINES
  }, over)
}

function detail (over) {
  return Object.assign({
    recipeId: 'r-1',
    name: 'Fiskesuppe',
    kind: 'Sellable',
    revision: 'rev-recipe',
    activeVersion: version(),
    draftVersions: [],
    costPreview: preview(),
    generatedAtUtc: '2026-03-01T12:00:00Z'
  }, over)
}

describe('readCostPreview — the five states, kept apart', () => {
  // The positive control for every "returns nulls" assertion below: the SAME function, on a real
  // document, produces real numbers. Without this row, a `readCostPreview` that returned nulls for
  // everything would satisfy the whole unknown/no-data half of this file.
  test('CONTROL: a complete preview yields the amounts the wire stated', () => {
    const cost = readCostPreview(detail(), null)
    expect(cost.state).toBe(COST_EXACT)
    expect(cost.totalCostMinor).toBe(226)
    expect(cost.perPortionCostMinor).toBe(11)
    expect(cost.currency).toBe('NOK')
    expect(cost.isFloor).toBe(false)
  })

  test('no document at all is UNKNOWN, and claims nothing', () => {
    const cost = readCostPreview(null, null)
    expect(cost.state).toBe(COST_UNKNOWN)
    expect(cost.totalCostMinor).toBeNull()
    expect(cost.perPortionCostMinor).toBeNull()
    expect(cost.lines).toEqual([])
  })

  // A retired recipe with no draft: the read SUCCEEDED and there is genuinely no version to price.
  // A different sentence from "the read failed", and the two must not collapse.
  test('a document with no costPreview is NOT-COSTED, which is not UNKNOWN', () => {
    const cost = readCostPreview(detail({ costPreview: null, activeVersion: null }), null)
    expect(cost.state).toBe(COST_NOT_COSTED)
    expect(COST_NOT_COSTED).not.toBe(COST_UNKNOWN)
    expect(cost.totalCostMinor).toBeNull()
  })

  // THE PAIR THIS FILE EXISTS FOR. The two fixtures differ in ONE line's `incomplete` flag and its
  // cost — everything else, including the wire's `totalCostMinor`, is deliberately identical. If the
  // model collapsed the two, exactly one of these two assertions would fail.
  describe('an incomplete cost: floor versus nothing known', () => {
    const twoUnpriced = [
      PRICED_LINES[0],
      Object.assign({}, PRICED_LINES[1], { lineCostMinor: 0, incomplete: true }),
      Object.assign({}, PRICED_LINES[2], { lineCostMinor: 0, incomplete: true })
    ]
    const allUnpriced = [
      Object.assign({}, PRICED_LINES[0], { lineCostMinor: 0, incomplete: true }),
      twoUnpriced[1],
      twoUnpriced[2]
    ]

    test('SOME lines priced: the totals are lower bounds and are shown', () => {
      const cost = readCostPreview(detail({
        costPreview: preview({ complete: false, totalCostMinor: 188, perPortionCostMinor: 9, lines: twoUnpriced })
      }), null)

      expect(cost.state).toBe(COST_FLOOR)
      expect(cost.isFloor).toBe(true)
      expect(cost.totalCostMinor).toBe(188)
      expect(cost.pricedLineCount).toBe(1)
      expect(cost.unpricedLineCount).toBe(2)
    })

    test('NO line priced: the wire 0 is withheld, because a floor of zero knows nothing', () => {
      const cost = readCostPreview(detail({
        costPreview: preview({ complete: false, totalCostMinor: 0, perPortionCostMinor: 0, lines: allUnpriced })
      }), null)

      expect(cost.state).toBe(COST_NONE_PRICED)
      expect(cost.totalCostMinor).toBeNull()
      expect(cost.perPortionCostMinor).toBeNull()
      expect(cost.pricedLineCount).toBe(0)
    })
  })

  // The other zero, and the opposite ruling. An empty version costs nothing and the backend says
  // `complete: true` about it, so the 0 is a fact rather than an absence. Two zeros, two meanings —
  // this row and the one above it are the pair that proves the model reads the flag, not the number.
  test('a version with no lines is EXACT, and its zero is a real zero', () => {
    const cost = readCostPreview(detail({
      costPreview: preview({ complete: true, totalCostMinor: 0, perPortionCostMinor: 0, lines: [] })
    }), null)

    expect(cost.state).toBe(COST_EXACT)
    expect(cost.totalCostMinor).toBe(0)
    expect(cost.lineCount).toBe(0)
  })
})

describe('readCostPreview — a line cost is read behind its flag, never as its number', () => {
  // Both lines carry `lineCostMinor: 0` on the wire. ONLY the flag differs. One 0 means "this line
  // is free"; the other means "this line could not be priced" — and the calculator writes the same
  // 0 for both (`return (0m, false, null)`).
  test('the same wire 0 reads as 0 when priced and as null when not', () => {
    const cost = readCostPreview(detail({
      costPreview: preview({
        complete: false,
        lines: [
          line({ componentId: 'free', lineCostMinor: 0, incomplete: false }),
          line({ componentId: 'unpriced', lineCostMinor: 0, incomplete: true }),
          line({ componentId: 'real', lineCostMinor: 188, incomplete: false })
        ]
      })
    }), null)

    const byId = {}
    for (const l of cost.lines) { byId[l.componentId] = l }

    expect(byId.free.lineCostMinor).toBe(0)
    expect(byId.unpriced.lineCostMinor).toBeNull()
    expect(byId.real.lineCostMinor).toBe(188)
  })

  test('the model never adds the lines up: the total is 226 while the column is 227', () => {
    const cost = readCostPreview(detail(), null)
    const columnSum = cost.lines.reduce((sum, l) => sum + l.lineCostMinor, 0)

    expect(columnSum).toBe(227)
    expect(cost.totalCostMinor).toBe(226)
    expect(cost.totalCostMinor).not.toBe(columnSum)
  })

  test('a component referencing neither an ingredient nor a sub-recipe is flagged, not costed', () => {
    const cost = readCostPreview(detail({
      costPreview: preview({
        complete: false,
        lines: [line({ componentId: 'orphan', ingredientId: null, subRecipeId: null, lineCostMinor: 0, incomplete: true })]
      })
    }), null)

    expect(cost.lines[0].isOrphan).toBe(true)
    expect(cost.lines[0].isSubRecipe).toBe(false)
    expect(cost.lines[0].lineCostMinor).toBeNull()
  })
})

describe('readCostPreview — which version was priced', () => {
  // The wire does not say. The backend previews the Active version when there is one and falls back
  // to the latest Draft otherwise, so these two fixtures differ ONLY in whether an active version
  // exists — and they must not answer the same way.
  test('an active version priced against its own id reads as active', () => {
    const cost = readCostPreview(detail(), null)
    expect(cost.pricedVersionIsActive).toBe(true)
    expect(cost.pricedVersionNumber).toBe(1)
  })

  test('the draft fallback reads as a DRAFT, so a draft cost is never shown as the menu cost', () => {
    const cost = readCostPreview(detail({
      activeVersion: null,
      draftVersions: [version({ recipeVersionId: DRAFT_V2, versionNumber: 2, state: 'Draft', revision: 'rev-d2' })],
      costPreview: preview({ recipeVersionId: DRAFT_V2 })
    }), null)

    expect(cost.pricedVersionIsActive).toBe(false)
    expect(cost.pricedVersionNumber).toBe(2)
  })

  test('the yield and portion count come from the version that was priced', () => {
    const cost = readCostPreview(detail(), null)
    expect(cost.yieldQuantity).toBe(4)
    expect(cost.yieldUnit).toBe('Liter')
    expect(cost.portionCount).toBe(20)
  })
})

describe('readCostPreview — naming a line, three ways', () => {
  const names = ingredientNames({ ingredients: [{ ingredientId: LAKS, name: 'Laks' }] })

  test('the list answered and holds the id: resolved, with the name', () => {
    const cost = readCostPreview(detail(), names)
    expect(cost.lines[0].nameState).toBe(NAME_RESOLVED)
    expect(cost.lines[0].name).toBe('Laks')
  })

  // A positive answer — the store's list does not have it — and it is drawn from the SAME read that
  // resolved the row above, so this is not a failed lookup.
  test('the list answered and does NOT hold the id: unresolved', () => {
    const cost = readCostPreview(detail(), names)
    expect(cost.lines[1].nameState).toBe(NAME_UNRESOLVED)
    expect(cost.lines[1].name).toBeNull()
  })

  test('the list did not answer: unknown for every line, and no claim about any of them', () => {
    const cost = readCostPreview(detail(), null)
    for (const l of cost.lines) {
      expect(l.nameState).toBe(NAME_UNKNOWN)
    }
    // The distinction is real, not two names for one state.
    expect(NAME_UNKNOWN).not.toBe(NAME_UNRESOLVED)
  })

  test('a failed ingredient read is null, not an empty map', () => {
    expect(ingredientNames(null)).toBeNull()
    expect(ingredientNames({})).toBeNull()
    expect(ingredientNames({ ingredients: [] })).toEqual({})
  })
})

describe('wire instants are read as UTC, never as browser-local', () => {
  // THE POSITIVE CONTROL FOR THIS WHOLE BLOCK. Under TZ=UTC a bare stamp and a UTC stamp are the
  // same instant and every assertion below passes without proving anything. This row fails in that
  // case rather than going quiet, so a green run under the wrong zone is not mistaken for evidence.
  test('CONTROL: the suite is running in a zone where the bug would be visible', () => {
    expect(new Date('2026-07-06T23:30:00').getTimezoneOffset()).not.toBe(0)
  })

  // 23:30 on a July evening in Oslo — the exact instant the backend's own epoch pin uses, and the
  // hour where a mis-parsed stamp crosses a date boundary.
  const BARE = '2026-07-06T23:30:00'

  test('a bare column-loaded stamp is UTC (createdAtUtc on the recipe list)', () => {
    const row = readRecipeRow({ recipeId: 'r-1', name: 'Fiskesuppe', createdAtUtc: BARE })
    expect(row.createdAt.toISOString()).toBe('2026-07-06T23:30:00.000Z')
    // What `new Date(iso)` would have done instead. Different instant, different DATE in UTC terms.
    expect(row.createdAt.getTime()).not.toBe(new Date(BARE).getTime())
  })

  test('a Z-suffixed computed stamp and its bare twin are the same instant', () => {
    const withZ = readCostPreview(detail({ costPreview: preview({ pricedAtUtc: BARE + 'Z' }) }), null)
    const bare = readCostPreview(detail({ costPreview: preview({ pricedAtUtc: BARE }) }), null)
    expect(bare.pricedAt.getTime()).toBe(withZ.pricedAt.getTime())
  })

  test('a missing or unparseable stamp is null, not the epoch and not now', () => {
    expect(readRecipeRow({ recipeId: 'r', createdAtUtc: null }).createdAt).toBeNull()
    expect(readRecipeRow({ recipeId: 'r', createdAtUtc: 'not a date' }).createdAt).toBeNull()
  })
})

describe('readRecipeRow — a nullable count stays null', () => {
  test('no active version reads as null, never as version 0', () => {
    const row = readRecipeRow({ recipeId: 'r', name: 'X', activeVersionNumber: null, draftVersionCount: 1 })
    expect(row.activeVersionNumber).toBeNull()
    expect(row.draftVersionCount).toBe(1)
  })
})

describe('activatableDraft — the draft whose revision activation must carry', () => {
  test('picks the highest version number, not the last element', () => {
    const draft = activatableDraft({
      draftVersions: [
        version({ recipeVersionId: DRAFT_V3, versionNumber: 3, revision: 'rev-d3' }),
        version({ recipeVersionId: DRAFT_V2, versionNumber: 2, revision: 'rev-d2' })
      ]
    })
    expect(draft.recipeVersionId).toBe(DRAFT_V3)
    // The DRAFT's own revision — the recipe header carries a field of the same name one level up.
    expect(draft.revision).toBe('rev-d3')
  })

  test('no drafts is null', () => {
    expect(activatableDraft({ draftVersions: [] })).toBeNull()
    expect(activatableDraft(null)).toBeNull()
  })
})

// ---------------------------------------------------------------------------------------------
// The unit picker, pinned against the backend switch it mirrors.
// ---------------------------------------------------------------------------------------------

// Every alias `MarginRecipeSupport.TryFamilyFactor` accepts, transcribed from
// `Services/Margin/MarginRecipeSupport.cs`. A code offered by the picker that is NOT in here is a
// line the backend cannot convert — which does not error, it just silently fails to price.
const BACKEND_UNITS = {
  mass: ['g', 'gram', 'grams', 'gr', 'kg', 'kilo', 'kilogram', 'kilograms'],
  volume: ['ml', 'milliliter', 'millilitre', 'cl', 'centiliter', 'centilitre', 'dl', 'deciliter', 'decilitre', 'l', 'liter', 'litre', 'liters', 'litres'],
  count: ['pcs', 'pc', 'piece', 'pieces', 'stk', 'ea']
}

describe('unit codes offered per base unit', () => {
  test('every offered code is one the backend converts, in the matching family', () => {
    const family = { Gram: 'mass', Kilogram: 'mass', Milliliter: 'volume', Liter: 'volume', Piece: 'count' }
    for (const baseUnit of BASE_UNITS) {
      const codes = unitCodesFor(baseUnit)
      expect(codes.length).toBeGreaterThan(0)
      for (const code of codes) {
        expect(BACKEND_UNITS[family[baseUnit]]).toContain(code)
      }
    }
  })

  test('mass and volume are not interchangeable', () => {
    expect(unitCodesFor('Gram')).toEqual(unitCodesFor('Kilogram'))
    expect(unitCodesFor('Milliliter')).toEqual(unitCodesFor('Liter'))
    expect(unitCodesFor('Gram')).not.toEqual(unitCodesFor('Liter'))
  })

  // Guessing a family for a base unit we do not recognise would author lines that cannot price.
  test('an unrecognised base unit offers nothing rather than a default family', () => {
    expect(unitCodesFor('Furlong')).toEqual([])
    expect(defaultUnitCodeFor('Furlong')).toBe('')
  })

  test('the default code for an ingredient is its own base unit', () => {
    expect(defaultUnitCodeFor('Gram')).toBe('g')
    expect(defaultUnitCodeFor('Kilogram')).toBe('kg')
    expect(defaultUnitCodeFor('Milliliter')).toBe('ml')
    expect(defaultUnitCodeFor('Liter')).toBe('l')
    expect(defaultUnitCodeFor('Piece')).toBe('stk')
  })
})

// ---------------------------------------------------------------------------------------------
// Copy. A key missing in one language is a defect, and a key a component asks for and no dictionary
// has renders as the raw key on screen.
// ---------------------------------------------------------------------------------------------

describe('mrg_ translation keys', () => {
  const keysIn = locale => Object.keys(translations[locale]).filter(k => k.indexOf('mrg_') === 0).sort()

  test('the block exists and is not a stub', () => {
    expect(keysIn('no').length).toBeGreaterThan(50)
  })

  test('no, en and de carry exactly the same key set', () => {
    expect(keysIn('en')).toEqual(keysIn('no'))
    expect(keysIn('de')).toEqual(keysIn('no'))
  })

  // Static scan of the two source files. Catches a typo'd key, which would otherwise render as the
  // literal `mrg_something` on screen and pass every behavioural test in this repo.
  test('every key the page and the panel ask for exists in all three languages', () => {
    const sources = [
      path.resolve(__dirname, '..', 'pages', 'admin', 'margin-recipes.vue'),
      path.resolve(__dirname, '..', 'components', 'admin', 'margin', 'MarginCostPanel.vue')
    ].map(file => fs.readFileSync(file, 'utf8')).join('\n')

    // Quoted `mrg_*` literals. A trailing underscore is a PREFIX being concatenated at runtime
    // (`'mrg_unit_' + unit`), not a key — those are covered by the row below.
    const used = Array.from(new Set((sources.match(/'mrg_[a-z0-9_]+'/g) || [])
      .map(m => m.slice(1, -1))
      .filter(key => !key.endsWith('_'))))

    expect(used.length).toBeGreaterThan(30)
    for (const key of used) {
      for (const locale of ['no', 'en', 'de']) {
        expect(translations[locale][key]).toBeDefined()
      }
    }
  })

  test('the runtime-built unit keys exist for every base unit', () => {
    for (const baseUnit of BASE_UNITS) {
      for (const locale of ['no', 'en', 'de']) {
        expect(translations[locale]['mrg_unit_' + baseUnit.toLowerCase()]).toBeDefined()
      }
    }
  })
})

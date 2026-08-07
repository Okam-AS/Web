import { state as makeState, getters, actions, mutations } from '~/store/index'
import { MutationName, ActionName } from '~/core/enums'

// ---- WHY THIS FILE EXISTS ---------------------------------------------------------------------
//
// `store/index.js` is the Vuex ROOT store — it holds `carts`, `orders`, `currentUser`, `stores` and
// the selected admin store — and on trunk `a63c30f` it was at 0% of 97 statements, 61 uncovered
// branches, 43 uncovered functions, and **NO JEST TEST IMPORTED IT AT ALL**. It is the state half of
// the cart; `test/cart-wire.test.js` is the wire half.
//
// ---- THE FOUR THINGS THAT ACTUALLY COST MONEY HERE ---------------------------------------------
//
//   1. A LINE ITEM THAT DUPLICATES INSTEAD OF UPDATING IS A DOUBLE CHARGE. `SetLineItem` upserts by
//      `lineItem.id`: an id already in the cart is REPLACED IN PLACE, anything else is unshifted.
//      Changing a quantity goes through the same mutation as adding a product, so an upsert that
//      degraded to a push would put the same product in the basket twice at the new quantity.
//   2. REMOVING A LINE THAT IS NOT THERE MUST REMOVE NOTHING. `RemoveLineItem` computes
//      `findIndex(...)` and hands the result to `Vue.delete` WITHOUT CHECKING IT — so on a miss it
//      calls `Vue.delete(items, -1)`. `Array.prototype.splice(-1, 1)` removes the LAST element, and
//      the only reason this is not a bug is Vue 2's `isValidArrayIndex` guard rejecting negatives
//      inside `del`. That guard is invisible from this file, which is exactly why it is pinned here:
//      a hand-rolled `splice` "cleanup", or a Vue 3 migration, silently deletes the customer's last
//      line instead.
//   3. TWO MUTATIONS BUILD A CART AND THEY DO NOT BUILD THE SAME ONE. `SetCartRootProperties` and
//      `RemoveCart` create `{ storeId, items: [], calculations: {} }`; `SetLineItem`'s else-branch
//      creates `{ storeId, items: [lineItem] }` with NO `calculations`. The `cartByStoreId` getter
//      repairs the difference. Both halves are pinned, because the repair is the only thing standing
//      between that branch and a component reading `cart.calculations.finalAmount`.
//   4. A CORRUPT PERSISTED VALUE MUST NOT BLANK THE BASKET. `SetCarts` writes only when it is handed
//      an array, and `Load` reads three separate localStorage keys.
//
// ---- WHAT IS REACHABLE AND WHAT IS NOT (C3) ----------------------------------------------------
//
// Not everything here is wired in this app, and the file says which is which rather than implying a
// green test means a live capability:
//
//   REACHED IN THIS REPO: `SetLineItem` / `RemoveLineItem` (via `plugins/admin-core-services.js:76-82`,
//   driven by `components/organisms/ProductConfig.vue:207-216`), `ClearState` (dispatched on logout
//   and on a 401 — `plugins/admin-core-services.js:39,46,65`), `SetSelectedAdminStore` and
//   `SetAdminLocale` (`components/organisms/AdminPageHeader.vue`, `components/admin/LanguageSwitcher.vue`).
//
//   NOT REACHED BY ANY CALLER IN THIS REPO: `SetCartRootProperties`, `RemoveCart`, `RemoveCartItems`,
//   `SetCartIsLoading`, and the `cartByStoreId` getter — a repo-wide search finds them named only in
//   `core/enums/mutation-name.ts` and in this store. They are pinned as a CONTRACT, not as evidence
//   that a capability exists.
//
// ---- WHY THESE ASSERTIONS CANNOT PASS VACUOUSLY -----------------------------------------------
//
// Every cart world below holds MORE THAN ONE STORE and MORE THAN ONE LINE. A mutation tested against
// a one-cart, one-line world cannot tell "updated the right cart" from "updated the only cart", and
// cannot tell "removed the named line" from "removed a line". Each arm asserts the whole resulting
// array with `toEqual`, so an extra row, a missing row and a reordering all red.
//
// ---- ONE BRANCH IS DELIBERATELY LEFT UNCOVERED, AND HERE IS WHY -------------------------------
//
// `RemoveLineItem` writes `const index = (cart.items || []).findIndex(...)` and then
// `Vue.delete(cart.items, index)` — the `|| []` guards the SEARCH and not the DELETE. Against a cart
// whose `items` is missing (a shape `SetCarts` accepts and `Load` can restore from a persisted dump
// written by an older build), that second line raises
// `TypeError: Cannot read properties of undefined (reading '__ob__')`, measured on trunk `a63c30f`.
// Nothing in this repo repairs that shape either: the only code that would — the `cartByStoreId`
// getter — has no caller here.
//
// That is a defect, not a contract, so it is REPORTED rather than pinned: a test asserting the
// throw would go red the day somebody fixes it, which is the wrong way round. The `|| []` false
// branch therefore stays uncovered on purpose, and this paragraph is the record of why.

const OTHER_STORE = 7
const STORE = 42

const line = (id, over = {}) => ({ id, productId: 1, quantity: 1, amount: 10000, ...over })

/** Two stores, three lines. Nothing below can pass by acting on "the only one". */
function twoCartWorld () {
  const s = makeState()
  s.carts = [
    { storeId: OTHER_STORE, items: [line('other-1')], calculations: { finalAmount: 10000 } },
    { storeId: STORE, items: [line('a'), line('b')], calculations: { finalAmount: 20000 } }
  ]
  return s
}

afterEach(() => { window.localStorage.clear() })

describe('the initial state — a fresh basket, and a market that is chosen rather than assumed', () => {
  test('every call builds its OWN state: two stores cannot share a carts array', () => {
    const a = makeState()
    const b = makeState()
    expect(a.carts).toEqual([])
    expect(a.orders).toEqual([])
    expect(a.stores).toEqual([])
    expect(a.currentUser).toEqual({})
    expect(a.cartIsLoading).toBe(false)
    expect(a.selectedAdminStore).toBeNull()
    a.carts.push({ storeId: STORE })
    expect(b.carts).toEqual([])
    expect(a.carts).not.toBe(b.carts)
  })

  test('the market and the admin language start from the edition, not from a hard-coded string', () => {
    const s = makeState()
    // The Norwegian edition is the build default; the Swiss one flips both.
    expect(s.market).toBe('no')
    expect(s.adminLocale).toBe('no')
    expect(getters.marketIsCh(s)).toBe(false)
    expect(getters.marketConfig(s).currency).toBe('NOK')
    expect(getters.marketConfig({ ...s, market: 'ch' }).currency).toBe('CHF')
    // An unknown market falls back to Norway rather than to `undefined.currency`.
    expect(getters.marketConfig({ ...s, market: 'zz' }).currency).toBe('NOK')
    expect(getters.marketIsCh({ ...s, market: 'ch' })).toBe(true)
  })

  test('the platform name this app sends on every request is Web', () => {
    expect(getters.clientPlatformName()).toBe('Web')
  })
})

describe('cartByStoreId — the getter that repairs what SetLineItem leaves behind', () => {
  test('it finds the named store\'s cart and not the other one', () => {
    const s = twoCartWorld()
    const cart = getters.cartByStoreId(s)(STORE)
    expect(cart.storeId).toBe(STORE)
    expect(cart.items.map(i => i.id)).toEqual(['a', 'b'])
    expect(cart.calculations).toEqual({ finalAmount: 20000 })
    expect(getters.cartByStoreId(s)(OTHER_STORE).items.map(i => i.id)).toEqual(['other-1'])
  })

  test('a store with no cart gets an EMPTY basket, never undefined', () => {
    const s = twoCartWorld()
    const cart = getters.cartByStoreId(s)(999)
    expect(cart.items).toEqual([])
    expect(cart.calculations).toEqual({})
    // Nothing was invented in the state itself.
    expect(s.carts.map(c => c.storeId)).toEqual([OTHER_STORE, STORE])
  })

  test('IT REPAIRS THE SHAPE `SetLineItem` PRODUCES — the two halves of that seam, together', () => {
    const s = makeState()
    // The else-branch of `SetLineItem` creates a cart with items and NO `calculations`.
    mutations[MutationName.SetLineItem](s, { storeId: STORE, lineItem: line('a') })
    expect(s.carts[0].calculations).toBeUndefined()

    // …and the getter is what stops a component reading `cart.calculations.finalAmount` from
    // throwing on the very first product a customer adds.
    const cart = getters.cartByStoreId(s)(STORE)
    expect(cart.calculations).toEqual({})
    expect(cart.items.map(i => i.id)).toEqual(['a'])
  })

  test('a cart whose items were persisted as a non-array is handed back as an empty basket', () => {
    const s = makeState()
    s.carts = [{ storeId: STORE, items: null, calculations: {} }]
    expect(getters.cartByStoreId(s)(STORE).items).toEqual([])
    s.carts = [{ storeId: STORE, calculations: {} }]
    expect(getters.cartByStoreId(s)(STORE).items).toEqual([])
  })

  test('an empty `carts` and an absent `carts` both answer with an empty basket', () => {
    expect(getters.cartByStoreId({ carts: [] })(STORE).items).toEqual([])
    expect(getters.cartByStoreId({})(STORE).items).toEqual([])
  })
})

describe('SetLineItem — the mutation a double charge would come out of', () => {
  test('AN ID ALREADY IN THE CART IS REPLACED IN PLACE, never appended', () => {
    const s = twoCartWorld()
    mutations[MutationName.SetLineItem](s, {
      storeId: STORE,
      lineItem: line('a', { quantity: 3, amount: 30000 })
    })
    const cart = s.carts.find(c => c.storeId === STORE)
    // Two lines, not three. A quantity change goes through this same mutation as an add.
    expect(cart.items).toHaveLength(2)
    expect(cart.items.map(i => i.id)).toEqual(['a', 'b'])
    expect(cart.items[0]).toEqual(line('a', { quantity: 3, amount: 30000 }))
    // The other line is untouched, and so is the other store's cart.
    expect(cart.items[1]).toEqual(line('b'))
    expect(s.carts.find(c => c.storeId === OTHER_STORE).items).toEqual([line('other-1')])
  })

  test('a NEW line goes to the front, so the thing just added is the thing on screen', () => {
    const s = twoCartWorld()
    mutations[MutationName.SetLineItem](s, { storeId: STORE, lineItem: line('c') })
    expect(s.carts.find(c => c.storeId === STORE).items.map(i => i.id)).toEqual(['c', 'a', 'b'])
  })

  test('a store with no cart yet gets one carrying exactly the line that was added', () => {
    const s = twoCartWorld()
    mutations[MutationName.SetLineItem](s, { storeId: 999, lineItem: line('z') })
    expect(s.carts).toHaveLength(3)
    expect(s.carts[2]).toEqual({ storeId: 999, items: [line('z')] })
    // The two existing carts are untouched.
    expect(s.carts[0].items.map(i => i.id)).toEqual(['other-1'])
    expect(s.carts[1].items.map(i => i.id)).toEqual(['a', 'b'])
  })

  test('it writes to the NAMED store even when another store holds a line with the same id', () => {
    const s = makeState()
    s.carts = [
      { storeId: OTHER_STORE, items: [line('shared', { quantity: 1 })], calculations: {} },
      { storeId: STORE, items: [line('shared', { quantity: 1 })], calculations: {} }
    ]
    mutations[MutationName.SetLineItem](s, { storeId: STORE, lineItem: line('shared', { quantity: 9 }) })
    expect(s.carts[0].items[0].quantity).toBe(1)
    expect(s.carts[1].items[0].quantity).toBe(9)
  })
})

describe('RemoveLineItem — and the -1 that must not delete the last line', () => {
  test('the named line goes and every other line stays', () => {
    const s = twoCartWorld()
    mutations[MutationName.RemoveLineItem](s, { storeId: STORE, lineItem: line('a') })
    expect(s.carts.find(c => c.storeId === STORE).items).toEqual([line('b')])
    expect(s.carts.find(c => c.storeId === OTHER_STORE).items).toEqual([line('other-1')])
  })

  test('REMOVING A LINE THAT IS NOT IN THE CART REMOVES NOTHING', () => {
    // `findIndex` answers -1 and the mutation hands that straight to `Vue.delete`, where
    // `splice(-1, 1)` would take the LAST line. Vue 2's `isValidArrayIndex` rejects negatives, and
    // this arm is what notices if that stops being true.
    const s = twoCartWorld()
    mutations[MutationName.RemoveLineItem](s, { storeId: STORE, lineItem: line('not-in-this-cart') })
    expect(s.carts.find(c => c.storeId === STORE).items).toEqual([line('a'), line('b')])
    expect(s.carts.find(c => c.storeId === STORE).items).toHaveLength(2)
  })

  test('removing from a store that has no cart at all is a no-op, not a throw', () => {
    const s = twoCartWorld()
    mutations[MutationName.RemoveLineItem](s, { storeId: 999, lineItem: line('a') })
    expect(s.carts).toHaveLength(2)
    expect(s.carts.find(c => c.storeId === STORE).items).toEqual([line('a'), line('b')])
  })

  test('emptying a cart one line at a time reaches zero and stops there', () => {
    const s = twoCartWorld()
    mutations[MutationName.RemoveLineItem](s, { storeId: STORE, lineItem: line('a') })
    mutations[MutationName.RemoveLineItem](s, { storeId: STORE, lineItem: line('b') })
    expect(s.carts.find(c => c.storeId === STORE).items).toEqual([])
    // One more removal against an empty basket must still not reach into the other store.
    mutations[MutationName.RemoveLineItem](s, { storeId: STORE, lineItem: line('b') })
    expect(s.carts.find(c => c.storeId === STORE).items).toEqual([])
    expect(s.carts.find(c => c.storeId === OTHER_STORE).items).toEqual([line('other-1')])
  })
})

describe('the cart mutations no caller in this repo reaches — pinned as a contract, not as a capability', () => {
  // C3: `SetCartRootProperties`, `RemoveCart`, `RemoveCartItems` and `SetCartIsLoading` are named
  // only in `core/enums/mutation-name.ts` and in `store/index.js`. Nothing commits them here. These
  // arms describe what they DO; they are not evidence that anything can be done with them.

  test('SetCartRootProperties copies a FIXED list of twelve keys and nothing else', () => {
    const s = twoCartWorld()
    mutations[MutationName.SetCartRootProperties](s, {
      storeId: STORE,
      homeDeliveryMethodId: 'hd-1',
      paymentType: 'PayInStore',
      deliveryType: 'TableDelivery',
      discountCode: 'SOMMER',
      fullAddress: 'Kong Oscars gate 1',
      zipCode: '5017',
      city: 'Bergen',
      paymentIntentId: 'pi_1',
      comment: 'uten løk',
      tipPercent: 10,
      tableName: 'Bord 4',
      requestedCompletion: '2026-06-15T18:00:00',
      // Not in the list. The server computes the tip amount from the percent, so a client that
      // could write it here would be publishing a second opinion about a figure on the receipt.
      tipAmount: 999,
      useReward: true,
      deliveryInstructions: 'ring på'
    })
    const cart = s.carts.find(c => c.storeId === STORE)
    expect(cart.homeDeliveryMethodId).toBe('hd-1')
    expect(cart.paymentType).toBe('PayInStore')
    expect(cart.deliveryType).toBe('TableDelivery')
    expect(cart.discountCode).toBe('SOMMER')
    expect(cart.fullAddress).toBe('Kong Oscars gate 1')
    expect(cart.zipCode).toBe('5017')
    expect(cart.city).toBe('Bergen')
    expect(cart.paymentIntentId).toBe('pi_1')
    expect(cart.comment).toBe('uten løk')
    expect(cart.tipPercent).toBe(10)
    expect(cart.tableName).toBe('Bord 4')
    expect(cart.requestedCompletion).toBe('2026-06-15T18:00:00')
    expect(cart.tipAmount).toBeUndefined()
    expect(cart.useReward).toBeUndefined()
    expect(cart.deliveryInstructions).toBeUndefined()
    // The lines and the server's own figures are untouched by a root-property write.
    expect(cart.items.map(i => i.id)).toEqual(['a', 'b'])
    expect(cart.calculations).toEqual({ finalAmount: 20000 })
  })

  test('an undefined member leaves the stored value alone rather than clearing it', () => {
    const s = twoCartWorld()
    mutations[MutationName.SetCartRootProperties](s, { storeId: STORE, discountCode: 'SOMMER' })
    mutations[MutationName.SetCartRootProperties](s, { storeId: STORE, city: 'Bergen' })
    const cart = s.carts.find(c => c.storeId === STORE)
    expect(cart.discountCode).toBe('SOMMER')
    expect(cart.city).toBe('Bergen')
    // …but an explicit null IS a value, and clears it. The two are different acts.
    mutations[MutationName.SetCartRootProperties](s, { storeId: STORE, discountCode: null })
    expect(cart.discountCode).toBeNull()
  })

  test('it creates the cart when the store has none, WITH the calculations key SetLineItem omits', () => {
    const s = makeState()
    mutations[MutationName.SetCartRootProperties](s, { storeId: STORE, tipPercent: 5 })
    expect(s.carts).toHaveLength(1)
    expect(s.carts[0].storeId).toBe(STORE)
    expect(s.carts[0].items).toEqual([])
    expect(s.carts[0].calculations).toEqual({})
    expect(s.carts[0].tipPercent).toBe(5)
  })

  test('RemoveCart empties the named cart to a fresh shell and drops every root property with it', () => {
    const s = twoCartWorld()
    s.carts[1].discountCode = 'SOMMER'
    s.carts[1].tipPercent = 10
    mutations[MutationName.RemoveCart](s, STORE)
    expect(s.carts).toHaveLength(2)
    expect(s.carts[1]).toEqual({ storeId: STORE, items: [], calculations: {} })
    // A discount and a tip do not survive a cleared basket, and the other store is untouched.
    expect(s.carts[1].discountCode).toBeUndefined()
    expect(s.carts[0].items).toEqual([line('other-1')])
  })

  test('RemoveCart on a store with no cart adds nothing', () => {
    const s = twoCartWorld()
    mutations[MutationName.RemoveCart](s, 999)
    expect(s.carts.map(c => c.storeId)).toEqual([OTHER_STORE, STORE])
  })

  test('RemoveCartItems keeps the cart and its root properties and empties only the lines', () => {
    const s = twoCartWorld()
    s.carts[1].discountCode = 'SOMMER'
    mutations[MutationName.RemoveCartItems](s, STORE)
    expect(s.carts[1].items).toEqual([])
    expect(s.carts[1].discountCode).toBe('SOMMER')
    expect(s.carts[1].calculations).toEqual({ finalAmount: 20000 })
    expect(s.carts[0].items).toEqual([line('other-1')])

    mutations[MutationName.RemoveCartItems](s, 999)
    expect(s.carts).toHaveLength(2)
  })

  test('SetCartIsLoading is a plain flag', () => {
    const s = makeState()
    mutations[MutationName.SetCartIsLoading](s, true)
    expect(s.cartIsLoading).toBe(true)
    mutations[MutationName.SetCartIsLoading](s, false)
    expect(s.cartIsLoading).toBe(false)
  })
})

describe('SetCarts — a corrupt persisted value must not blank the basket', () => {
  test('an array replaces the carts', () => {
    const s = twoCartWorld()
    mutations[MutationName.SetCarts](s, [])
    expect(s.carts).toEqual([])
  })

  test('anything that is NOT an array is IGNORED and the existing carts stand', () => {
    const nonArrays = [undefined, null, 'carts', 0, { 0: { storeId: STORE }, length: 1 }]
    nonArrays.forEach((value) => {
      const s = twoCartWorld()
      mutations[MutationName.SetCarts](s, value)
      expect(s.carts.map(c => c.storeId)).toEqual([OTHER_STORE, STORE])
    })
    expect(nonArrays).toHaveLength(5)
  })
})

describe('the user, the stores and the orders', () => {
  test('SetCurrentUser stores a DEEP COPY — the caller cannot reach into the store afterwards', () => {
    const s = makeState()
    const user = { id: 'u-1', name: 'Ada', address: { fullAddress: 'Kong Oscars gate 1', zipCode: '5017', city: 'Bergen' } }
    mutations[MutationName.SetCurrentUser](s, user)

    user.name = 'somebody else'
    user.address.city = 'Oslo'
    expect(s.currentUser.name).toBe('Ada')
    expect(s.currentUser.address.city).toBe('Bergen')
    expect(s.currentUser).not.toBe(user)
    expect(s.currentUser.address).not.toBe(user.address)
  })

  test('ClearCurrentUser empties the user to `{}` rather than to null, so getters stay safe', () => {
    const s = makeState()
    mutations[MutationName.SetCurrentUser](s, { id: 'u-1' })
    expect(getters.userIsLoggedIn(s)).toBe('u-1')
    mutations[MutationName.ClearCurrentUser](s)
    expect(s.currentUser).toEqual({})
    expect(getters.userIsLoggedIn(s)).toBeUndefined()
  })

  test('SetStore upserts by id: an existing store is replaced, a new one is appended', () => {
    const s = makeState()
    mutations[MutationName.SetStores](s, [{ id: 1, name: 'A' }, { id: 2, name: 'B' }])
    mutations[MutationName.SetStore](s, { id: 2, name: 'B renamed' })
    expect(s.stores).toEqual([{ id: 1, name: 'A' }, { id: 2, name: 'B renamed' }])
    mutations[MutationName.SetStore](s, { id: 3, name: 'C' })
    expect(s.stores.map(x => x.id)).toEqual([1, 2, 3])
  })

  test('SetOrders and SetDeliveryAddress write what they are given', () => {
    const s = makeState()
    mutations[MutationName.SetOrders](s, [{ orderId: 900 }])
    expect(s.orders).toEqual([{ orderId: 900 }])
    mutations[MutationName.SetCurrentUser](s, { id: 'u-1' })
    mutations[MutationName.SetDeliveryAddress](s, { fullAddress: 'Kong Oscars gate 1', zipCode: '5017', city: 'Bergen' })
    expect(s.currentUser.address).toEqual({ fullAddress: 'Kong Oscars gate 1', zipCode: '5017', city: 'Bergen' })
  })

  test('deliveryAddress needs ALL FIVE parts — a half address is no address', () => {
    const complete = { id: 'u-1', address: { fullAddress: 'Kong Oscars gate 1', zipCode: '5017', city: 'Bergen' } }
    expect(getters.deliveryAddress({ currentUser: complete })()).toBe('Kong Oscars gate 1, 5017 Bergen')

    const missing = [
      {},
      { id: 'u-1' },
      { id: 'u-1', address: {} },
      { id: 'u-1', address: { fullAddress: 'Kong Oscars gate 1' } },
      { id: 'u-1', address: { fullAddress: 'Kong Oscars gate 1', zipCode: '5017' } },
      { id: 'u-1', address: { zipCode: '5017', city: 'Bergen' } },
      { address: complete.address }
    ]
    missing.forEach((user) => {
      expect(getters.deliveryAddress({ currentUser: user })()).toBe('')
    })
    expect(missing).toHaveLength(7)
    expect(getters.deliveryAddress({})()).toBe('')
  })
})

describe('Load — three separate localStorage keys, and the base-10 that stops 08 becoming 0', () => {
  test('a persisted state dump is merged over the initial state', () => {
    window.localStorage.setItem('state', JSON.stringify({
      currentUser: { id: 'u-1' },
      carts: [{ storeId: STORE, items: [line('a')], calculations: {} }]
    }))
    const s = makeState()
    mutations[MutationName.Load](s)
    expect(s.currentUser).toEqual({ id: 'u-1' })
    expect(s.carts[0].items.map(i => i.id)).toEqual(['a'])
    // Members the dump did not carry keep their initial values.
    expect(s.orders).toEqual([])
    expect(s.market).toBe('no')
  })

  test('the selected admin store is parsed BASE TEN — a leading zero is not an octal', () => {
    window.localStorage.setItem('selectedAdminStore', '08')
    const s = makeState()
    mutations[MutationName.Load](s)
    expect(s.selectedAdminStore).toBe(8)
    expect(typeof s.selectedAdminStore).toBe('number')
  })

  test('the admin language is read separately, so it survives a state dump that predates it', () => {
    window.localStorage.setItem('state', JSON.stringify({ carts: [] }))
    window.localStorage.setItem('adminLocale', 'en')
    const s = makeState()
    mutations[MutationName.Load](s)
    expect(s.adminLocale).toBe('en')
  })

  test('with nothing stored at all, the initial state stands', () => {
    const s = makeState()
    mutations[MutationName.Load](s)
    expect(s.currentUser).toEqual({})
    expect(s.carts).toEqual([])
    expect(s.selectedAdminStore).toBeNull()
    expect(s.adminLocale).toBe('no')
  })
})

describe('the actions — what a logout and a store switch actually commit', () => {
  const recorder = () => {
    const committed = []
    return { committed, commit: (type, payload) => committed.push([type, payload]) }
  }

  test('CLEARSTATE EMPTIES THE USER, THE CARTS AND THE ORDERS — all three, in that order', () => {
    // Dispatched on logout and on any 401 (`plugins/admin-core-services.js:39,46,65`). A clear that
    // dropped the user and kept the carts would leave one person's basket in front of the next.
    const r = recorder()
    actions[ActionName.ClearState]({ commit: r.commit })
    expect(r.committed).toEqual([
      [MutationName.ClearCurrentUser, undefined],
      [MutationName.SetCarts, []],
      [MutationName.SetOrders, []]
    ])
  })

  test('the three pass-through actions commit their one mutation with their payload', () => {
    let r = recorder()
    actions[ActionName.Load]({ commit: r.commit })
    expect(r.committed).toEqual([[MutationName.Load, undefined]])

    r = recorder()
    actions[ActionName.SetCurrentUser]({ commit: r.commit }, { id: 'u-1' })
    expect(r.committed).toEqual([[MutationName.SetCurrentUser, { id: 'u-1' }]])

    r = recorder()
    actions[ActionName.SetDeliveryAddress]({ commit: r.commit }, { city: 'Bergen' })
    expect(r.committed).toEqual([[MutationName.SetDeliveryAddress, { city: 'Bergen' }]])
  })

  test('SetSelectedAdminStore persists the id AND the name, so a reload does not blink', () => {
    const r = recorder()
    const state = { currentUser: { adminIn: [{ id: 7, name: 'Bryggen Bistro' }, { id: 42, name: 'Torget' }] } }
    actions.SetSelectedAdminStore({ commit: r.commit, state }, 42)
    expect(r.committed).toEqual([['SetSelectedAdminStore', 42]])
    expect(window.localStorage.getItem('selectedAdminStore')).toBe('42')
    expect(window.localStorage.getItem('selectedAdminStoreName')).toBe('Torget')
  })

  test('an id the user does not administer persists the id and NOT a stale name', () => {
    const r = recorder()
    window.localStorage.setItem('selectedAdminStoreName', 'Torget')
    const state = { currentUser: { adminIn: [{ id: 7, name: 'Bryggen Bistro' }] } }
    actions.SetSelectedAdminStore({ commit: r.commit, state }, 999)
    expect(window.localStorage.getItem('selectedAdminStore')).toBe('999')
    // The old name is left rather than overwritten with a guess — but it is never a NEW wrong name.
    expect(window.localStorage.getItem('selectedAdminStoreName')).toBe('Torget')

    // …and a user with no `adminIn` at all does not throw.
    actions.SetSelectedAdminStore({ commit: r.commit, state: { currentUser: {} } }, 5)
    expect(window.localStorage.getItem('selectedAdminStore')).toBe('5')
    actions.SetSelectedAdminStore({ commit: r.commit, state: {} }, 6)
    expect(window.localStorage.getItem('selectedAdminStore')).toBe('6')
  })

  test('SetAdminLocale commits and persists the language', () => {
    const r = recorder()
    actions.SetAdminLocale({ commit: r.commit }, 'de')
    expect(r.committed).toEqual([['SetAdminLocale', 'de']])
    expect(window.localStorage.getItem('adminLocale')).toBe('de')
    const s = makeState()
    mutations.SetAdminLocale(s, 'de')
    expect(s.adminLocale).toBe('de')
  })

  test('the two string-keyed mutations behind those actions write the state they name', () => {
    const s = makeState()
    expect(s.selectedAdminStore).toBeNull()
    mutations.SetSelectedAdminStore(s, 42)
    expect(s.selectedAdminStore).toBe(42)
    // Clearing the selection is a real act and must not be confused with never having chosen.
    mutations.SetSelectedAdminStore(s, null)
    expect(s.selectedAdminStore).toBeNull()
  })

  test('ONE ACTION IS REGISTERED UNDER THE LITERAL KEY "undefined"', () => {
    // `store/index.js:58` declares `[ActionName.SetNotificationApproved]`, and `ActionName` has no
    // such member (`core/enums/action-name.ts` lists ten, and that is not one of them). The computed
    // key evaluates to `undefined`, so the handler lands on `actions.undefined` — a dispatch of
    // 'SetNotificationApproved' would fail with Vuex's «unknown action type». It is a no-op body
    // ("Used for mobile push"), so nothing is lost today; it is pinned because the same spelling
    // mistake on an action with a body would be silent.
    expect(ActionName.SetNotificationApproved).toBeUndefined()
    expect(Object.prototype.hasOwnProperty.call(actions, 'undefined')).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(actions, 'SetNotificationApproved')).toBe(false)
    expect(typeof actions.undefined).toBe('function')
    // The registered handler commits nothing.
    const r = recorder()
    actions.undefined({ commit: r.commit })
    expect(r.committed).toEqual([])
  })

  test('every action key is a real name, and the "undefined" one is the only exception', () => {
    const keys = Object.keys(actions)
    expect(keys.sort()).toEqual([
      'ClearState',
      'Load',
      'SetAdminLocale',
      'SetCurrentUser',
      'SetDeliveryAddress',
      'SetSelectedAdminStore',
      'undefined'
    ])
    expect(keys.filter(k => k === 'undefined')).toHaveLength(1)
  })
})

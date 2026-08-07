import { setPlatform } from '~/core/platform'
import { CartService } from '~/core/services/cart-service'
import { Cart } from '~/core/models/cart/cart'
import { DeliveryType, PaymentType } from '~/core/enums'

// ---- WHY THIS FILE EXISTS ---------------------------------------------------------------------
//
// On trunk `a63c30f` the cart was uncovered ON BOTH SIDES OF THE WIRE AT ONCE:
// `core/services/cart-service.ts` at 4.3%, `core/models/cart/cart.ts` at 6.3%, `store/index.js` at
// 0% and imported by no test at all, and the backend's `Services/CartService.cs` at 24.3% with 681
// uncovered branches — the largest single branch gap in either repository. The cart decides what a
// customer is charged, and nothing on this side of it was executed by a test.
//
// This file takes the wire half (the client and the model it posts); `test/store-cart-state.test.js`
// takes the state half.
//
// ---- WHAT IS PINNED, AND WHY EACH ONE IS THE CONSEQUENTIAL PART -------------------------------
//
//   1. NINE ROUTES, CHARACTER FOR CHARACTER, AGAINST THE CONTROLLER THAT SERVES THEM. Thirteen
//      request paths in this very `core/services` directory carried a trailing slash that ASP.NET
//      matched either way, so production never noticed and the strict fixture 404'd
//      (`test/core-request-path-shape.test.js`). Here the paths are checked against
//      `Controllers/CartsController.cs` route-for-route, WITH the verb: `/carts/{storeId}` is a GET
//      that reads a cart and a DELETE that empties one, on the same string. A verb chosen wrongly
//      here is not a 404 — it is a different act.
//
//   2. A CART READ THAT DID NOT LAND MUST NOT RESOLVE TO A CART. `RequestService.PostRequest`
//      RESOLVES a rejected request to the error object — deliberately, and documented in that file —
//      and `TryParseResponse` answers `undefined` for a 204, for any non-200 and for a body it
//      cannot parse. `pages/admin/delivery.vue` shipped a defect of exactly that shape: a store
//      toggle whose failure was a plain `false` nobody read. Every method here except `Delete`
//      throws instead, and each arm below drives the REAL `RequestService` through a platform module
//      that fails the way axios fails, rather than stubbing the service and pinning the page against
//      an assumption about the request layer — a wrong assumption about the request layer being
//      precisely the bug that shape produces.
//
//   3. THE TWO `ignoreLegecy*` DEFAULTS ARE A MONEY SWITCH, NOT A COMPATIBILITY SHIM. In
//      `Helpers/PaymentTypeExtensions.cs:98-107`, `GetPaymentTypeWithFallbackToLegecy` returns the
//      cart's own `PaymentType` only when `IgnoreLegecyIsWaiterOrderBool` is true; otherwise it
//      returns `IsWaiterOrder ? PayInStore : Stripe` — so a cart that sent `false` is CHARGED TO A
//      CARD whatever payment type the customer picked. `DeliveryTypeExtensions.cs:38-48` is the same
//      switch for delivery. `core/models/cart/cart.ts` defaults both to `true`, and that default is
//      the only thing making the chosen types authoritative.
//
// ---- WHY THESE ASSERTIONS CANNOT PASS VACUOUSLY -----------------------------------------------
//
// Route arms use `toBe` on the whole URL, never `toContain` — a fragment match survives a trailing
// slash, a doubled slash and a wrong store id, which are the three faults this class takes. Every
// "it throws" arm asserts the exact Norwegian message, so a method that threw for some other reason
// (a TypeError on an undefined response, say) reds rather than passing. The `ignoreLegecy` arms
// assert `toBe(true)` rather than truthiness, because the backend reads them as C# `bool`.

/** The requests a run made, in order, exactly as `RequestService` built them. */
let sent = []

/**
 * Registers a platform whose http module answers `answers[i]` to the i-th request.
 *
 * An answer may be a plain response object (resolved), or `{ reject: value }` — which is how axios
 * signals a non-2xx: it REJECTS with an error carrying the real response under `.response`. Both
 * halves matter, because `PostRequest` catches the rejection and resolves the error object while
 * `GetRequest`/`PutRequest`/`DeleteRequest` do not, and the cart client reads all four the same way.
 */
function usePlatform (answers) {
  sent = []
  let index = 0
  class RecordingHttpModule {
    constructor () {
      this.httpClient = (request) => {
        sent.push(request)
        const answer = answers[Math.min(index, answers.length - 1)]
        index += 1
        if (answer && Object.prototype.hasOwnProperty.call(answer, 'reject')) {
          return Promise.reject(answer.reject)
        }
        return Promise.resolve(answer)
      }
    }
  }
  class UnusedPersistenceModule {}
  setPlatform(RecordingHttpModule, UnusedPersistenceModule)
}

/** The shape axios resolves for a successful call. */
const ok = data => ({ status: 200, data })
/** A 200 whose body is not what the caller asked for is still a 200 — `TryParseResponse` returns it. */
const status = (code, data) => ({ status: code, data })

const service = () => new CartService({ bearerToken: 'tok-cart', clientPlatformName: 'Web', cultureCode: 'no' })

async function failureFrom (call) {
  try {
    await call()
    return null
  } catch (e) {
    return e
  }
}

const lastUrl = () => sent[sent.length - 1].url
const lastMethod = () => sent[sent.length - 1].method

describe('CartService — nine routes, and the verb is half of each one', () => {
  test('the two POST reads that take a body: recommendations and one line item', async () => {
    usePlatform([ok([{ productId: 1 }])])
    const products = await service().GetRecommendations({ storeId: 42, productIds: [7] })
    expect(lastUrl()).toBe('/carts/recommendations')
    expect(lastMethod()).toBe('POST')
    expect(sent[0].data).toEqual({ storeId: 42, productIds: [7] })
    expect(products).toEqual([{ productId: 1 }])

    usePlatform([ok({ id: 'li-1', amount: 12500 })])
    const line = await service().GetCartLineItem({ productId: 7, quantity: 2 })
    expect(lastUrl()).toBe('/carts/lineItem')
    expect(lastMethod()).toBe('POST')
    expect(sent[0].data).toEqual({ productId: 7, quantity: 2 })
    // The PRICED line comes back from the server; nothing on this side recomputes it.
    expect(line).toEqual({ id: 'li-1', amount: 12500 })
  })

  test('GET /carts/{storeId} reads the cart and DELETE /carts/{storeId} empties it — same path, different act', async () => {
    usePlatform([ok({ storeId: 42, items: [] })])
    await service().GetByStoreId(42)
    expect(lastUrl()).toBe('/carts/42')
    expect(lastMethod()).toBe('GET')

    usePlatform([ok(true)])
    const deleted = await service().Delete(42)
    expect(lastUrl()).toBe('/carts/42')
    expect(lastMethod()).toBe('DELETE')
    expect(deleted).toBe(true)
  })

  test('PUT /carts is the whole-cart write, and it sends the model as the body', async () => {
    const cart = new Cart()
    cart.storeId = 42
    cart.tipPercent = 10
    usePlatform([ok({ ...cart, id: 'srv' })])
    await service().Update(cart)
    expect(lastUrl()).toBe('/carts')
    expect(lastMethod()).toBe('PUT')
    expect(sent[0].data.tipPercent).toBe(10)
    expect(sent[0].data.storeId).toBe(42)
  })

  test('GET /carts/validate/{storeId} — a read, so it must not be a POST', async () => {
    usePlatform([ok({ isValid: true, messages: [] })])
    const validation = await service().Validate(42)
    expect(lastUrl()).toBe('/carts/validate/42')
    expect(lastMethod()).toBe('GET')
    expect(validation).toEqual({ isValid: true, messages: [] })
  })

  test('POST /carts/complete/{storeId} — THE CHECKOUT, and it is the only route that mints an order', async () => {
    usePlatform([ok({ orderId: 900, finalAmount: 27500 })])
    const order = await service().Complete(42)
    expect(lastUrl()).toBe('/carts/complete/42')
    expect(lastMethod()).toBe('POST')
    // A read sent as a POST creates; a create sent as a GET does nothing. The verb is the act.
    expect(order).toEqual({ orderId: 900, finalAmount: 27500 })
  })

  test('POST /carts/updateCompanyInfo/{storeId} and POST /carts/reorder/{orderId}', async () => {
    usePlatform([ok({ companyName: 'Bryggen Bistro AS', companyVat: '912345678' })])
    await service().UpdateCompanyInfo(42, { companyVat: '912345678' })
    expect(lastUrl()).toBe('/carts/updateCompanyInfo/42')
    expect(lastMethod()).toBe('POST')
    expect(sent[0].data).toEqual({ companyVat: '912345678' })

    usePlatform([ok({ storeId: 42, items: [{ id: 'li-1' }] })])
    await service().ReorderFromOrder(900)
    expect(lastUrl()).toBe('/carts/reorder/900')
    expect(lastMethod()).toBe('POST')

    // The controller binds it as `{orderCode}` — a string — so a code-shaped id must survive too.
    usePlatform([ok({ storeId: 42, items: [] })])
    await service().ReorderFromOrder('AB12-CD')
    expect(lastUrl()).toBe('/carts/reorder/AB12-CD')
  })

  test('every path is already in canonical form: one leading slash, no trailing slash, no doubling', async () => {
    const calls = [
      ['GetRecommendations', s => s.GetRecommendations({})],
      ['GetCartLineItem', s => s.GetCartLineItem({})],
      ['GetByStoreId', s => s.GetByStoreId(42)],
      ['Update', s => s.Update(new Cart())],
      ['Validate', s => s.Validate(42)],
      ['Complete', s => s.Complete(42)],
      ['Delete', s => s.Delete(42)],
      ['UpdateCompanyInfo', s => s.UpdateCompanyInfo(42, {})],
      ['ReorderFromOrder', s => s.ReorderFromOrder(900)]
    ]
    // Every public method of the class is exercised, so a tenth route cannot be added unnoticed.
    const declared = Object.getOwnPropertyNames(CartService.prototype).filter(n => n !== 'constructor')
    expect(declared.sort()).toEqual(calls.map(c => c[0]).sort())

    const paths = []
    for (const [, invoke] of calls) {
      usePlatform([ok({})])
      await invoke(service())
      paths.push(lastUrl())
    }
    expect(paths).toHaveLength(9)
    paths.forEach((path) => {
      expect(path.startsWith('/')).toBe(true)
      expect(path.endsWith('/')).toBe(false)
      expect(path).not.toContain('//')
      expect(path).not.toContain('undefined')
    })
    expect(paths).toEqual([
      '/carts/recommendations',
      '/carts/lineItem',
      '/carts/42',
      '/carts',
      '/carts/validate/42',
      '/carts/complete/42',
      '/carts/42',
      '/carts/updateCompanyInfo/42',
      '/carts/reorder/900'
    ])
  })
})

describe('CartService — a cart that did not come back is never a cart', () => {
  // The three shapes `TryParseResponse` answers `undefined` for, all of which arrive as a FULFILLED
  // promise from the request layer. This is the delivery-toggle defect's exact shape.
  const notLanded = [
    ['a 204 with no content', status(204, undefined)],
    ['a 400 the server refused with', status(400, { message: 'nope' })],
    ['a 500', status(500, null)],
    ['nothing at all', undefined],
    ['a null response', null]
  ]

  test.each(notLanded)('GetByStoreId throws its own message on %s', async (_label, answer) => {
    usePlatform([answer])
    const error = await failureFrom(() => service().GetByStoreId(42))
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Kunne ikke hente handlekurv')
  })

  test('each method throws its OWN message, so a page can tell which read failed', async () => {
    const expected = [
      [s => s.GetRecommendations({}), 'Kunne ikke hente produkter'],
      [s => s.GetCartLineItem({}), 'Kunne ikke hente produkt'],
      [s => s.GetByStoreId(42), 'Kunne ikke hente handlekurv'],
      [s => s.Update(new Cart()), 'Kunne ikke oppdatere handlekurv'],
      [s => s.Validate(42), 'Kunne ikke validere handlekurv'],
      [s => s.Complete(42), 'Kunne ikke fullføre ordre'],
      [s => s.UpdateCompanyInfo(42, {}), 'Kunne ikke oppdatere firmainfo'],
      [s => s.ReorderFromOrder(900), 'Kunne ikke bestille på nytt']
    ]
    const messages = []
    for (const [invoke] of expected) {
      usePlatform([status(500, null)])
      const error = await failureFrom(() => invoke(service()))
      messages.push(error === null ? '(resolved)' : error.message)
    }
    expect(messages).toEqual(expected.map(e => e[1]))
    // Eight distinct messages: none of them is a shared "something went wrong".
    expect(new Set(messages).size).toBe(8)
  })

  test('A FAILED CHECKOUT THROWS. It never resolves to an order-shaped nothing', async () => {
    // `PostRequest` catches the rejection and RESOLVES the axios error object, so `Complete` sees a
    // fulfilled promise carrying an error. Reading `.then()` alone here would advance a customer to
    // a confirmation screen for an order the server never created.
    const axiosError = new Error('Request failed with status code 502')
    axiosError.response = { status: 502, data: { message: 'bad gateway' } }
    usePlatform([{ reject: axiosError }])

    const error = await failureFrom(() => service().Complete(42))
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Kunne ikke fullføre ordre')
    // …and specifically NOT the axios error passed through, which a caller might mistake for a body.
    expect(error.message).not.toBe('Request failed with status code 502')
  })

  test('Delete is the ONE method that answers with a boolean, and false means it did not land', async () => {
    usePlatform([ok(true)])
    expect(await service().Delete(42)).toBe(true)

    usePlatform([status(400, { message: 'nope' })])
    expect(await service().Delete(42)).toBe(false)

    usePlatform([status(204, undefined)])
    expect(await service().Delete(42)).toBe(false)

    // The backend answers `Ok(true)` for a successful empty (`CartsController.cs:119-126`), so the
    // 200 case above is the real success shape and `false` really does mean the cart still stands.
  })

  test('a 200 carrying `false` is still an answer — it is the body, not the status, that is parsed', async () => {
    usePlatform([ok(false)])
    // `TryParseResponse` returns `false`, which is `!== undefined`, so the delete DID land.
    expect(await service().Delete(42)).toBe(true)
  })
})

describe('the Cart model — the defaults a first cart is created with', () => {
  test('a fresh cart tips nobody, charges nothing and belongs to no store', () => {
    const cart = new Cart()
    expect(cart.tipPercent).toBe(0)
    expect(cart.tipAmount).toBe(0)
    expect(cart.useReward).toBe(false)
    expect(cart.isHomeDelivery).toBe(false)
    expect(cart.storeId).toBe(0)
    expect(cart.id).toBe('')
    expect(cart.items).toEqual([])
    expect(cart.calculations).toEqual({})
    // Company fields are empty strings, not undefined: the model is posted whole and a missing
    // company name and an empty one must not arrive as different things.
    expect(cart.companyEmail).toBe('')
    expect(cart.companyName).toBe('')
    expect(cart.companyVat).toBe('')
    expect(cart.companyAddress).toBe('')
    expect(cart.companyZipCode).toBe('')
    expect(cart.companyCity).toBe('')
  })

  test('neither type is CHOSEN yet — both start at NotSet rather than at a plausible default', () => {
    const cart = new Cart()
    expect(cart.deliveryType).toBe(DeliveryType.NotSet)
    expect(cart.paymentType).toBe(PaymentType.NotSet)
    expect(cart.deliveryType).toBe('NotSet')
    expect(cart.paymentType).toBe('NotSet')
    // A cart that started at `SelfPickup` or `Stripe` would be a choice nobody made.
    expect(cart.deliveryType).not.toBe(DeliveryType.SelfPickup)
    expect(cart.paymentType).not.toBe(PaymentType.Stripe)
  })

  test('BOTH LEGACY BOOLEANS ARE IGNORED BY DEFAULT — this is the money switch, not a shim', () => {
    const cart = new Cart()
    // `Helpers/PaymentTypeExtensions.cs:98-107`: with this false, the server returns
    // `IsWaiterOrder ? PayInStore : Stripe` and the customer's chosen payment type is discarded —
    // an order meant to be paid in store is charged to a card.
    expect(cart.ignoreLegecyIsWaiterOrderBool).toBe(true)
    // `Helpers/DeliveryTypeExtensions.cs:38-48`: with this false, the server returns
    // `IsSelfPickup ? SelfPickup : InstantHomeDelivery` and a table order becomes a home delivery.
    expect(cart.ignoreLegecyIsSelfPickupBool).toBe(true)
    // Read as C# `bool`, so truthiness is not enough — they must be the literal `true`.
    expect(typeof cart.ignoreLegecyIsWaiterOrderBool).toBe('boolean')
    expect(typeof cart.ignoreLegecyIsSelfPickupBool).toBe('boolean')
  })

  test('the optional fields exist as keys and serialise away, so a first PUT sends no invented values', () => {
    const cart = new Cart()
    expect(cart.discountCode).toBeUndefined()
    expect(cart.paymentIntentId).toBeUndefined()
    expect(cart.vippsOrderId).toBeUndefined()
    expect(cart.requestedCompletion).toBeUndefined()
    expect(cart.tableName).toBeUndefined()
    expect(cart.homeDeliveryMethodId).toBeUndefined()

    const wire = JSON.parse(JSON.stringify(cart))
    // `JSON.stringify` drops undefined members, so none of the above reaches the server as null —
    // which the model binder would read as "clear this field" rather than "do not touch it".
    expect(Object.prototype.hasOwnProperty.call(wire, 'discountCode')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(wire, 'paymentIntentId')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(wire, 'tableName')).toBe(false)
    // …while the money-bearing defaults DO reach it.
    expect(wire.tipPercent).toBe(0)
    expect(wire.tipAmount).toBe(0)
    expect(wire.ignoreLegecyIsWaiterOrderBool).toBe(true)
    expect(wire.ignoreLegecyIsSelfPickupBool).toBe(true)
    expect(wire.deliveryType).toBe('NotSet')
    expect(wire.paymentType).toBe('NotSet')
  })

  test('two carts do not share their items array — one customer\'s line cannot appear in another\'s cart', () => {
    const a = new Cart()
    const b = new Cart()
    a.items.push({ id: 'li-1' })
    expect(a.items).toHaveLength(1)
    expect(b.items).toHaveLength(0)
    expect(a.items).not.toBe(b.items)
    expect(a.calculations).not.toBe(b.calculations)
  })

  test('the model the client posts is the model, not a copy the service reshapes', async () => {
    const cart = new Cart()
    cart.storeId = 42
    cart.paymentType = PaymentType.PayInStore
    cart.deliveryType = DeliveryType.TableDelivery
    cart.tableName = 'Bord 4'
    cart.tipPercent = 15

    usePlatform([ok({ id: 'srv-1' })])
    await service().Update(cart)

    const body = sent[0].data
    expect(body.paymentType).toBe('PayInStore')
    expect(body.deliveryType).toBe('TableDelivery')
    expect(body.tableName).toBe('Bord 4')
    expect(body.tipPercent).toBe(15)
    expect(body.ignoreLegecyIsWaiterOrderBool).toBe(true)
    expect(body.ignoreLegecyIsSelfPickupBool).toBe(true)
  })
})

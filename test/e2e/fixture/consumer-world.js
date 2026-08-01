// The seeded world the consumer checkout journey runs in — shared by the fixture backend and by the
// journey that seeds the browser, so the two cannot drift.
//
// ConsumerWeb hydrates its Pinia stores from localStorage (core/services/persistence-service.ts over
// the web PersistenceModule), so "a signed-in guest standing at checkout with a cart" is a set of
// localStorage keys rather than a login flow to drive. The journey writes exactly the keys the app
// reads, and the fixture answers for exactly the same user, store and cart — a mismatch between the
// two would show up as a checkout that renders an empty cart, which is not a product defect.

const BEARER = 'consumer-journey-token';
const USER_ID = 'user-ingrid';
const STORE_ID = 91;
const COMPANY_ID = '6f2b6a11-4f0e-4a9f-9d55-2d5f0f0f1a01';
const CURRENCY = 'NOK';

// Integer MINOR units (øre) throughout — core's convention for every amount it carries.
const PRICE_SALAD = 14900;
const PRICE_COFFEE = 3900;
const CART_TOTAL_MINOR = PRICE_SALAD + PRICE_COFFEE;
const ALLOWANCE_MINOR = 25000;

// ---- the Meals feature gate this world runs under -----------------------------------------------
//
// The whole Company Meals surface is deny-closed, and it is worth being exact about WHERE, because it
// is not where the other five modules put their switches.
//
//   `MealsFeatureGate` is bound to the HOST CONFIG section `Features:Meals` through
//   `IOptionsMonitor<MealsFeatureSettings>`, and both keys default false. Every route these journeys
//   walk resolves through it and nothing else: `GET /v1/meals/me/companies` and
//   `GET /v1/meals/me/context` call `RequireVisible()` -> `IsModuleEnabled`;
//   `POST /v1/stores/{id}/meals/quotes` calls `RequireOrderingVisible()` -> `IsOrderingEnabled`; and
//   the funding bind inside `POST /carts/complete/{id}` checks `IsOrderingEnabled` again.
//   `IsOrderingEnabled` is `Module && Ordering`, so the money flag REQUIRES the module flag.
//
// THERE IS NO PER-STORE LEVER FOR ANY OF IT. `meals.module` is the module's only catalog entry and
// `StoreBackedMealsFeatureFlags` — the only thing that reads a per-store row — is consulted at three
// store-addressable ADMIN routes, none of which is on this path. `meals.ordering` is WITHHELD from
// the catalog outright, with the reason written down in `MealsFeatureFlags.Withheld`: the §7
// precondition (a company may fund a checkout only once its billing terms are signed) is not
// something a generic per-store toggle can enforce. So `/admin/feature-flags` cannot move either
// switch, and neither can a guest — which is why the consumer journeys DECLARE this posture rather
// than flipping it through a page, and why the mutation that proves the gate bites is a journey of
// its own (`meals-module-dark`) rather than a step inside these.
//
// Modelled ON here because that is the deployment every other consumer journey is claiming to run
// against: a venue whose Company Meals pilot is live. Before this was modelled, those journeys were
// green against a world with no gate in it at all — the same defect the workforce schedule journey
// had, and the reason for this sweep.
const MEALS_MODULE_ENABLED = true;
const MEALS_ORDERING_ENABLED = true;

const store = () => ({
  id: STORE_ID,
  name: 'Kantina Vulkan',
  currencyCode: CURRENCY,
  approved: true,
  isOpenNow: true,
  allowOrdersAfterOpeningHours: true,
  warningMessage: '',
  termsUrl: '',
  address: { fullAddress: 'Maridalsveien 17', zipCode: '0175', city: 'Oslo' },
  payment: { stripeEnabled: true },
  deliveryMethods: [],
  openingHours: [],
  // The tip percentage strip is the cheapest lever a guest has for changing the total ON the checkout
  // page, which is what the stale-reservation journeys need: the cart is re-priced without leaving the
  // page the reservation was minted on. CheckoutTip renders nothing unless the store enables it.
  tip: { percentEnabled: true, heading: '' },
  tips: []
});

const user = () => ({
  id: USER_ID,
  phoneNumber: '99999999',
  firstName: 'Ingrid',
  lastName: 'Hauge',
  email: 'ingrid@example.test',
  favoriteProductIds: [],
  fullAddress: 'Maridalsveien 17',
  zipCode: '0175',
  city: 'Oslo'
});

function lineItem (id, name, amount, quantity) {
  return {
    id,
    quantity,
    notes: '',
    product: { id: 'product-' + id, name, amount, baseAmount: amount, currency: CURRENCY, productVariants: [], selectedOptionsAmount: 0 }
  };
}

function withCalculations (cart) {
  const itemsAmount = (cart.items || []).reduce((total, item) => total + (item.product.amount * item.quantity), 0);
  // A tip PERCENT is priced by the server, not by the client: the checkout sends `tipPercent` and reads
  // the re-priced cart back. Modelled here because a journey that changed the total by writing
  // `tipAmount` from the browser would be driving a path no guest takes. A percent of zero falls back
  // to the custom amount — the PUT handler clears that whenever the percent itself changed, so
  // switching back to 0% removes the tip instead of leaving the last derived amount standing.
  const percent = Number(cart.tipPercent) || 0;
  const tip = percent > 0 ? Math.round(itemsAmount * percent / 100) : (Number(cart.tipAmount) || 0);
  cart.tipAmount = tip;
  cart.calculations = {
    itemsAmount,
    itemsAmountLineThrough: 0,
    deliveryAmount: 0,
    tableAdditionalAmount: 0,
    deliveryAdditionalAmount: 0,
    orderDiscountAmount: 0,
    tipAmount: tip,
    serviceFeeAmount: 0,
    woltServiceFeeAmount: 0,
    rewardAmountSpent: 0,
    earnableRewardAmount: 0,
    rewardBalanceBeforeOrder: 0,
    usedGiftcardAmount: 0,
    giftcardBalanceBeforeOrder: 0,
    finalAmount: itemsAmount + tip
  };
  return cart;
}

/** Self-pickup so the journey needs no address, no delivery method and no map. */
const seedCart = () => withCalculations({
  id: 'cart-' + STORE_ID,
  storeId: STORE_ID,
  items: [lineItem('a1', 'Dagens salat', PRICE_SALAD, 1), lineItem('b2', 'Kaffe', PRICE_COFFEE, 1)],
  deliveryType: 'SelfPickup',
  paymentType: 'NotSet',
  tipAmount: 0,
  tipPercent: 0,
  useReward: false,
  isHomeDelivery: false,
  comment: '',
  ignoreLegecyIsSelfPickupBool: true,
  ignoreLegecyIsWaiterOrderBool: true
});

const company = () => ({
  companyId: COMPANY_ID,
  legalName: 'Nordane Technologies AS',
  displayName: 'Nordane',
  membershipId: 'ee0b2a55-8f31-4a1a-9d0e-8c1d2e3f4a5b',
  role: 'Employee',
  membershipState: 'Active',
  storeId: STORE_ID,
  currency: CURRENCY
});

module.exports = {
  BEARER, USER_ID, STORE_ID, COMPANY_ID, CURRENCY,
  PRICE_SALAD, PRICE_COFFEE, CART_TOTAL_MINOR, ALLOWANCE_MINOR,
  MEALS_MODULE_ENABLED, MEALS_ORDERING_ENABLED,
  store, user, seedCart, withCalculations, company
};

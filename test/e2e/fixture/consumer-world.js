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
  const tip = Number(cart.tipAmount) || 0;
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
  store, user, seedCart, withCalculations, company
};

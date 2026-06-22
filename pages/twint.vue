<template>
  <div class="twint-page">
    <div class="twint-container">
      <div class="page-head">
        <h1>Bezahlen mit <span class="twint-word">TWINT</span></h1>
        <p>So bezahlen Ihre Gäste eine Bestellung bei Okam – schnell, sicher und in Sekunden.</p>
      </div>

      <div class="checkout-grid">
        <!-- Order summary -->
        <section class="card order-card">
          <h2>Ihre Bestellung</h2>
          <p class="store-line"><span class="material-icons">storefront</span> Trattoria Bellevue · Zürich</p>
          <ul class="order-items">
            <li v-for="item in order" :key="item.name">
              <span class="qty">{{ item.qty }}×</span>
              <span class="name">{{ item.name }}</span>
              <span class="price">{{ chf(item.priceMinor * item.qty) }}</span>
            </li>
          </ul>
          <div class="order-line"><span>Zwischensumme</span><span>{{ chf(subtotal) }}</span></div>
          <div class="order-line"><span>Liefergebühr</span><span>{{ chf(deliveryMinor) }}</span></div>
          <div class="order-total"><span>Total</span><span>{{ chf(total) }}</span></div>
          <p class="vat-note">inkl. MwSt.</p>
        </section>

        <!-- Payment -->
        <section class="card pay-card">
          <h2>Zahlungsart</h2>

          <div class="methods">
            <button
              type="button"
              class="method"
              :class="{ 'method--selected': method === 'twint' }"
              @click="method = 'twint'"
            >
              <span class="method__radio" />
              <span class="twint-badge">TWINT</span>
              <span class="method__label">Mit der TWINT-App</span>
            </button>
            <button
              type="button"
              class="method"
              :class="{ 'method--selected': method === 'card' }"
              @click="method = 'card'"
            >
              <span class="method__radio" />
              <span class="material-icons method__cardicon">credit_card</span>
              <span class="method__label">Kredit- &amp; Debitkarte</span>
            </button>
          </div>

          <button class="pay-btn" :class="{ 'pay-btn--card': method === 'card' }" :disabled="processing" @click="payNow">
            <template v-if="!processing">{{ payLabel }} · {{ chf(total) }}</template>
            <template v-else>Wird verarbeitet…</template>
          </button>

          <p v-if="!liveMode" class="preview-note">
            <strong>Vorschau-Modus.</strong> Eine echte Zahlung wird ausgeführt, sobald ein
            Schweizer Stripe-Konto (Publishable Key) hinterlegt ist. Der Ablauf zeigt die
            Zahlung so, wie Ihre Gäste sie erleben.
          </p>
        </section>
      </div>
    </div>

    <!-- Flow overlay -->
    <transition name="fade">
      <div v-if="step !== 'idle'" class="twint-overlay" @click.self="reset">
        <div class="twint-modal">
          <button class="twint-modal__close" aria-label="Schliessen" @click="reset">×</button>

          <template v-if="step === 'qr'">
            <div class="twint-badge twint-badge--lg">TWINT</div>
            <h3>Code mit der TWINT-App scannen</h3>
            <div class="qr-wrap">
              <client-only>
                <vue-qrcode :value="qrPayload" :options="{ width: 220, margin: 1, color: { dark: '#000000', light: '#ffffff' } }" />
              </client-only>
            </div>
            <p>Öffnen Sie die TWINT-App und scannen Sie den Code, um <strong>{{ chf(total) }}</strong> zu bezahlen.</p>
            <button class="sim-btn" @click="simulatePay">Zahlung in der App bestätigen (Demo)</button>
          </template>

          <template v-else-if="step === 'card'">
            <span class="material-icons card-head-icon">credit_card</span>
            <h3>Mit Karte bezahlen</h3>
            <div class="card-form">
              <label>Kartennummer</label>
              <input v-model="cardData.number" type="text" inputmode="numeric" autocomplete="off" />
              <div class="card-form__row">
                <div>
                  <label>Ablauf</label>
                  <input v-model="cardData.expiry" type="text" autocomplete="off" />
                </div>
                <div>
                  <label>CVC</label>
                  <input v-model="cardData.cvc" type="text" inputmode="numeric" autocomplete="off" />
                </div>
              </div>
            </div>
            <button class="sim-btn" @click="simulatePay">{{ chf(total) }} bezahlen (Demo)</button>
          </template>

          <template v-else-if="step === 'processing'">
            <div class="spinner" />
            <p>Zahlung wird bestätigt…</p>
          </template>

          <template v-else-if="step === 'success'">
            <div class="success-check">✓</div>
            <h3>Zahlung erfolgreich</h3>
            <p><strong>{{ chf(total) }}</strong> {{ method === 'twint' ? 'mit TWINT' : 'mit Karte' }} bezahlt.<br>Ihre Bestellung wurde aufgegeben.</p>
            <button class="done-btn" @click="reset">Fertig</button>
          </template>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import VueQrcode from '@chenfengyuan/vue-qrcode'
import { formatChf } from '~/utils/price'

export default {
  components: { VueQrcode },
  data: () => ({
    step: 'idle', // idle | qr | card | processing | success
    processing: false,
    method: 'twint', // twint | card
    qrPayload: 'https://okam.ch/pay/twint/demo-7Q2K9X',
    deliveryMinor: 590,
    order: [
      { name: 'Pizza Margherita', qty: 1, priceMinor: 1850 },
      { name: 'Cheeseburger & Pommes', qty: 1, priceMinor: 2400 },
      { name: 'Mineralwasser 50cl', qty: 2, priceMinor: 450 }
    ],
    cardData: { number: '4242 4242 4242 4242', expiry: '12 / 27', cvc: '123' }
  }),
  computed: {
    subtotal () { return this.order.reduce((sum, i) => sum + i.priceMinor * i.qty, 0) },
    total () { return this.subtotal + this.deliveryMinor },
    payLabel () { return this.method === 'twint' ? 'Mit TWINT bezahlen' : 'Mit Karte bezahlen' },
    // Live mode activates automatically once a Swiss Stripe publishable key is configured.
    liveMode () { return !!process.env.STRIPE_PUBLISHABLE_KEY }
  },
  methods: {
    chf (minor) { return formatChf(minor) },
    payNow () {
      if (this.method === 'twint' && this.liveMode) { return this.payWithTwintLive() }
      // Preview: TWINT shows the QR screen, card shows the card form.
      this.step = this.method === 'twint' ? 'qr' : 'card'
    },
    simulatePay () {
      this.step = 'processing'
      this.timer = setTimeout(() => { this.step = 'success' }, 1600)
    },
    reset () {
      if (this.timer) { clearTimeout(this.timer) }
      this.step = 'idle'
      this.processing = false
    },
    // --- Real TWINT flow — runs once a Swiss Stripe account + publishable key exist ---
    // Backed by the OkamAPI `feature/twint-swiss` branch.
    async payWithTwintLive () {
      this.processing = true
      try {
        // 1) Backend creates a TWINT PaymentIntent (CHF, automatic capture, no server-confirm):
        //      POST /stripe/createPaymentIntent
        //        { amount: this.total, currency: 'chf', paymentMethodType: 'twint', cartId }
        //      -> { secret: clientSecret }
        //
        // 2) Confirm client-side with Stripe.js. Stripe renders the QR on desktop and
        //    redirects to the TWINT app on mobile, then returns to return_url:
        //      const stripe = Stripe(process.env.STRIPE_PUBLISHABLE_KEY)
        //      const { error } = await stripe.confirmTwintPayment(clientSecret, {
        //        return_url: window.location.origin + '/twint?status=done'
        //      })
        //
        // Wiring is intentionally documented scaffolding until Swiss Stripe credentials
        // are provisioned; until then payNow() uses preview mode.
        this.step = 'qr'
      } finally {
        this.processing = false
      }
    }
  },
  beforeDestroy () {
    if (this.timer) { clearTimeout(this.timer) }
  },
  head () {
    return {
      title: 'Mit TWINT bezahlen – Okam',
      meta: [
        { hid: 'description', name: 'description', content: 'TWINT-Zahlung bei Okam: schnell und sicher mit der TWINT-App in Schweizer Franken bezahlen.' }
      ]
    }
  }
}
</script>

<style lang="scss" scoped>
.twint-page {
  min-height: 70vh;
  background: #fafbfc;
  padding: 48px 24px 64px;

  @media (max-width: 768px) {
    padding: 32px 16px 48px;
  }
}

.twint-container {
  max-width: 920px;
  margin: 0 auto;
}

.page-head {
  text-align: center;
  margin-bottom: 32px;

  h1 {
    font-size: 2em;
    font-weight: 600;
    color: #292c34;
    margin: 0 0 8px;

    @media (max-width: 768px) { font-size: 1.5em; }
  }

  p {
    color: #64748b;
    margin: 0;
  }
}

.twint-word { color: #1bb776; }

.checkout-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.card {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);

  h2 {
    font-size: 1.1em;
    font-weight: 600;
    color: #292c34;
    margin: 0 0 16px;
  }
}

.store-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85em;
  color: #64748b;
  margin: -8px 0 16px;

  .material-icons { font-size: 1.1em; color: #1bb776; }
}

.order-items {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;

  li {
    display: grid;
    grid-template-columns: 32px 1fr auto;
    gap: 8px;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #e2e8f0;
    color: #292c34;
    font-size: 0.95em;

    .qty { color: #64748b; font-weight: 600; }
    .price { font-weight: 600; }
  }
}

.order-line {
  display: flex;
  justify-content: space-between;
  color: #64748b;
  font-size: 0.9em;
  padding: 4px 0;
}

.order-total {
  display: flex;
  justify-content: space-between;
  font-size: 1.15em;
  font-weight: 700;
  color: #292c34;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 2px solid #e2e8f0;
}

.vat-note {
  text-align: right;
  font-size: 0.8em;
  color: #94a3b8;
  margin: 4px 0 0;
}

.methods {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.method {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  padding: 14px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;

  &:hover { border-color: #cbd5e0; }

  &--selected {
    border-color: #1bb776;
    background: rgba(27, 183, 118, 0.06);

    .method__radio {
      border-color: #1bb776;
      border-width: 5px;
    }
  }

  &__radio {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid #cbd5e0;
    flex: none;
    transition: all 0.2s ease;
  }

  &__label { color: #292c34; font-size: 0.95em; }
  &__cardicon { color: #64748b; }
}

.pay-btn {
  width: 100%;
  background: #000000;
  color: #ffffff;
  border: none;
  padding: 16px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1em;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
  }

  &--card {
    background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);

    &:hover:not(:disabled) { box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4); }
  }

  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.preview-note {
  margin: 14px 0 0;
  font-size: 0.8em;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 10px 12px;
  line-height: 1.5;
}

.twint-overlay {
  position: fixed;
  inset: 0;
  background: rgba(41, 44, 52, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.twint-modal {
  position: relative;
  background: #ffffff;
  border-radius: 16px;
  padding: 32px;
  width: 100%;
  max-width: 380px;
  text-align: center;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
  animation: modalRise 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  h3 {
    font-size: 1.2em;
    color: #292c34;
    margin: 0 0 16px;
  }

  p {
    color: #64748b;
    font-size: 0.9em;
    line-height: 1.6;
  }

  &__close {
    position: absolute;
    top: 12px;
    right: 16px;
    background: none;
    border: none;
    font-size: 1.6em;
    line-height: 1;
    color: #94a3b8;
    cursor: pointer;
    transition: transform 0.2s ease;

    &:hover { transform: rotate(90deg); }
  }
}

@keyframes modalRise {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.qr-wrap {
  display: flex;
  justify-content: center;
  padding: 16px;
  margin: 8px 0 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.card-head-icon {
  font-size: 2.4em;
  color: #1bb776;
  margin-bottom: 4px;
}

.card-form {
  text-align: left;
  margin: 8px 0 4px;

  label {
    display: block;
    font-size: 0.72em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #64748b;
    margin: 12px 0 6px;
  }

  input {
    width: 100%;
    padding: 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.95em;
    color: #292c34;
    font-family: inherit;

    &:focus {
      outline: none;
      border-color: #1bb776;
      box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
    }
  }

  &__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
}

.sim-btn {
  margin-top: 18px;
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  color: #ffffff;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;

  &:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4); }
}

.done-btn {
  margin-top: 8px;
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  color: #ffffff;
  border: none;
  padding: 12px 28px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.spinner {
  width: 44px;
  height: 44px;
  margin: 12px auto 16px;
  border: 4px solid #e2e8f0;
  border-top-color: #1bb776;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.success-check {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: #1bb776;
  color: #ffffff;
  font-size: 2em;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes pop {
  0% { transform: scale(0); }
  100% { transform: scale(1); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter, .fade-leave-to { opacity: 0; }
</style>

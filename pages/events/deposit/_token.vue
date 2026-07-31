<template>
  <GuestShell
    :locale="locale"
    :eyebrow="t('ev_guest_deposit_eyebrow')"
    private-link
    @locale="setLocale"
  >
    <template v-if="held">
      <section class="eg-card">
        <h1 class="eg-title">
          {{ t('ev_guest_deposit_title') }}
        </h1>

        <!-- The amount first, because it is the only number on the page and the reason the guest
             opened it. Withheld, never printed bare, when the answer carried no currency. -->
        <p v-if="amount" class="eg-amount" data-test="amount">
          {{ amount }}
        </p>
        <p v-else class="eg-note eg-note--warn" data-test="no-currency">
          {{ t('ev_guest_money_no_currency') }}
        </p>

        <!-- One sentence per stance, and the stance is decided on the settled money facts BEFORE the
             clock: a paid deposit whose link has since expired is paid, and telling a guest their
             paid deposit expired is the worst sentence this page could produce. -->
        <p class="eg-lede" data-test="stance">
          {{ t(stanceSentence) }}
        </p>

        <!-- The provider link, and only while the stance says it is live. Read through the stance
             rather than off the field, so a redirect left on a settled row can never become a
             second payment button. -->
        <a
          v-if="paymentUrl"
          class="eg-btn eg-btn--primary"
          :href="paymentUrl"
          rel="noopener"
          data-test="pay"
        >
          {{ t('ev_guest_deposit_pay', { provider: providerLabel }) }}
        </a>
        <p v-if="paymentUrl" class="eg-quiet">
          {{ t('ev_guest_deposit_pay_note', { provider: providerLabel }) }}
        </p>

        <dl v-if="view.paymentType" class="eg-facts">
          <div>
            <dt>{{ t('ev_guest_deposit_rail_label') }}</dt>
            <dd>{{ providerLabel }}</dd>
          </div>
        </dl>

        <!-- The raw status, and ONLY when this page has no sentence of its own for it. Every state
             the deposit machine can reach is said above in words a guest can act on, so printing
             `Requested` beside "not paid yet" would be a system word doing no work. When the server
             names a state we have no wording for, the word itself is the useful thing: the guest can
             quote it to the venue instead of being told a state that was invented for them. -->
        <p v-if="statusIsUnexplained" class="eg-detail" data-test="status-verbatim">
          {{ t('ev_guest_status_verbatim', { status: view.status || '?' }) }}
        </p>

        <!-- The deposit page carries no event and no contact detail by design (spec §5), so this
             page cannot name the arrangement, the venue or the guest. Saying so beats a blank space
             the reader has to explain to themselves. -->
        <p class="eg-quiet">
          {{ t('ev_guest_deposit_no_event') }}
        </p>
      </section>
    </template>

    <div v-else-if="loading" class="eg-card eg-card--quiet" :aria-busy="String(showLoading)">
      <p v-if="showLoading" class="eg-quiet">
        {{ t('ev_guest_loading') }}
      </p>
    </div>

    <div v-else-if="read.state === GUEST_NOT_FOUND" class="eg-card" data-test="not-found">
      <h1 class="eg-title">
        {{ t('ev_guest_deposit_not_found_heading') }}
      </h1>
      <p class="eg-lede">
        {{ t('ev_guest_deposit_not_found_body') }}
      </p>
    </div>

    <div v-else-if="read.state === GUEST_UNAVAILABLE" class="eg-card" data-test="unavailable">
      <h1 class="eg-title">
        {{ t('ev_guest_state_unavailable_heading') }}
      </h1>
      <p class="eg-lede">
        {{ t('ev_guest_state_unavailable_body') }}
      </p>
    </div>

    <div v-else class="eg-card" data-test="unknown">
      <h1 class="eg-title">
        {{ t('ev_guest_state_unknown_heading') }}
      </h1>
      <p class="eg-lede">
        {{ t('ev_guest_state_unknown_body') }}
      </p>
      <p v-if="read.detail" class="eg-detail">
        {{ t('ev_guest_refused_detail', { detail: read.detail }) }}
      </p>
      <button type="button" class="eg-btn eg-btn--ghost" @click="load">
        {{ t('ev_guest_retry') }}
      </button>
    </div>
  </GuestShell>
</template>

<script>
import GuestShell from '~/components/events/GuestShell.vue';
import { EventsGuestService } from '~/utils/events/events-guest-client';
import { isEventsApiError } from '~/utils/events/events-client';
import { translate } from '~/utils/i18n';
import {
  GUEST_HELD,
  GUEST_NOT_FOUND,
  GUEST_UNAVAILABLE,
  GUEST_UNKNOWN,
  DEPOSIT_PAYABLE,
  DEPOSIT_RAIL_UNSUPPORTED,
  DEPOSIT_PAID,
  DEPOSIT_REFUNDED,
  DEPOSIT_FORFEITED,
  DEPOSIT_EXPIRED,
  DEPOSIT_FAILED,
  DEPOSIT_NO_AFFORDANCE,
  readGuestDeposit,
  depositStance,
  depositPaymentUrl,
  formatMoney,
  guestLocale
} from '~/utils/events/guest';

// One sentence per stance. Every one of them is a state the deposit machine can really be in, and
// none of them is a stand-in for another: refunded is not failed, forfeited is not expired, and a
// deposit with no way to pay is not a deposit that was never asked for.
const STANCE_SENTENCES = {};
STANCE_SENTENCES[DEPOSIT_PAYABLE] = 'ev_guest_deposit_payable';
STANCE_SENTENCES[DEPOSIT_RAIL_UNSUPPORTED] = 'ev_guest_deposit_rail_unsupported';
STANCE_SENTENCES[DEPOSIT_PAID] = 'ev_guest_deposit_paid';
STANCE_SENTENCES[DEPOSIT_REFUNDED] = 'ev_guest_deposit_refunded';
STANCE_SENTENCES[DEPOSIT_FORFEITED] = 'ev_guest_deposit_forfeited';
STANCE_SENTENCES[DEPOSIT_EXPIRED] = 'ev_guest_deposit_expired';
STANCE_SENTENCES[DEPOSIT_FAILED] = 'ev_guest_deposit_failed';
STANCE_SENTENCES[DEPOSIT_NO_AFFORDANCE] = 'ev_guest_deposit_no_affordance';

// The tokenised deposit page the backend's own link points at
// (`{PublicBaseUrl}/events/deposit/{token}` — see `EventsEmailNotificationDelivery.ComposeLink`).
//
// It READS and it hands over to the provider; it never takes a payment itself. For the Vipps and
// Dintero flows the server hands back the redirect the provider issued, and that is the whole of the
// payment affordance. For Stripe it hands back a PaymentIntent client secret instead, and this page
// deliberately renders NO form for it: there is no hosted Stripe page in the backend, Stripe
// deposits cannot even be issued on this branch (`EventsDepositPaymentPortAdapter.Initiate` throws
// `EVENTS_PAYMENT_PROVIDER`), and a form that looks like payment and is not is worse than a sentence
// saying to contact the venue.
export default {
  name: 'EventsGuestDepositPage',
  components: { GuestShell },
  layout: 'empty',
  data () {
    return {
      locale: 'no',
      loading: true,
      showLoading: false,
      loadingTimer: null,
      read: { state: GUEST_UNKNOWN, view: null, code: null, detail: null },
      dash: '–',
      GUEST_NOT_FOUND,
      GUEST_UNAVAILABLE
    };
  },
  computed: {
    held () {
      return this.read.state === GUEST_HELD;
    },
    view () {
      return this.read.view || {};
    },
    amount () {
      return formatMoney(this.view.amountMinor, this.view.currencyCode, this.locale);
    },
    stanceSentence () {
      return STANCE_SENTENCES[depositStance(this.view)] || 'ev_guest_deposit_status_unknown';
    },
    statusIsUnexplained () {
      return !STANCE_SENTENCES[depositStance(this.view)];
    },
    paymentUrl () {
      return depositPaymentUrl(this.view);
    },
    // The provider's own name. `PaymentType` is an enum name on the wire (`Vipps`, `Stripe`), which
    // is also what a guest calls it, so it is printed as it arrives rather than mapped through a
    // table this page would have to keep in step with the enum.
    providerLabel () {
      return this.view.paymentType || this.t('ev_guest_deposit_rail_unnamed');
    }
  },
  created () {
    this._service = new EventsGuestService();
  },
  mounted () {
    this.locale = guestLocale(this.$i18n && this.$i18n.locale);
    this.load();
  },
  beforeDestroy () {
    if (this.loadingTimer) { clearTimeout(this.loadingTimer); }
  },
  methods: {
    t (key, params) {
      return translate(this.locale, key, params);
    },
    setLocale (locale) {
      this.locale = guestLocale(locale);
    },

    async load () {
      const token = this.$route && this.$route.params ? this.$route.params.token : null;
      if (!token) {
        this.stopLoadingLadder();
        this.read = { state: GUEST_NOT_FOUND, view: null, code: null, detail: null };
        return;
      }

      this.loading = true;
      this.startLoadingLadder();
      try {
        this.read = readGuestDeposit(await this._service.GetDeposit(token), null);
      } catch (e) {
        this.read = isEventsApiError(e)
          ? readGuestDeposit(null, e)
          : { state: GUEST_UNKNOWN, view: null, code: null, detail: (e && e.message) || null };
      } finally {
        this.stopLoadingLadder();
      }
    },

    startLoadingLadder () {
      if (this.loadingTimer) { clearTimeout(this.loadingTimer); }
      this.showLoading = false;
      this.loadingTimer = setTimeout(() => { this.showLoading = true; }, 300);
    },

    stopLoadingLadder () {
      if (this.loadingTimer) { clearTimeout(this.loadingTimer); }
      this.loadingTimer = null;
      this.showLoading = false;
      this.loading = false;
    }
  },
  head () {
    return {
      title: translate(this.locale, 'ev_guest_deposit_meta_title'),
      meta: [{ hid: 'robots', name: 'robots', content: 'noindex, nofollow' }]
    };
  }
};
</script>

<style scoped>
.eg-card {
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  margin-bottom: 20px;
  box-shadow: 0 1px 2px rgba(41, 44, 52, 0.04), 0 8px 24px rgba(41, 44, 52, 0.06);
}

.eg-card--quiet { min-height: 132px; }

.eg-title {
  margin: 0 0 12px;
  font-size: 30px;
  line-height: 1.15;
  font-weight: 600;
  color: #292c34;
}

.eg-amount {
  margin: 20px 0;
  font-size: 40px;
  line-height: 1;
  font-weight: 600;
  color: #292c34;
  font-variant-numeric: tabular-nums;
}

.eg-lede { margin: 0 0 20px; font-size: 16px; color: #292c34; }
.eg-quiet { margin: 12px 0 0; font-size: 14.5px; color: #64748b; }
.eg-detail { margin: 8px 0 0; font-size: 14.5px; color: #64748b; }
.eg-note { margin: 20px 0; padding: 16px 20px; border-radius: 12px; font-size: 15px; }
.eg-note--warn { background: #fff7ed; color: #92400e; }

.eg-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 20px;
  margin: 28px 0 0;
}

.eg-facts dt {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.eg-facts dd { margin: 6px 0 0; font-size: 16px; color: #292c34; }

.eg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 0 24px;
  border-radius: 12px;
  border: 1px solid transparent;
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: transform 180ms cubic-bezier(0.16, 0.84, 0.34, 1), background-color 180ms cubic-bezier(0.16, 0.84, 0.34, 1);
}

.eg-btn:not(:disabled):active { transform: translateY(1px); }

.eg-btn--primary {
  width: 100%;
  min-height: 64px;
  background: #1bb776;
  color: #fff;
  box-sizing: border-box;
}

.eg-btn--primary:hover { background: #159f63; }
.eg-btn--ghost { background: #fff; border-color: #cbd5e1; color: #292c34; }
.eg-btn--ghost:hover { background: #f4f6f8; }

@media (max-width: 560px) {
  .eg-card { padding: 24px; }
  .eg-title { font-size: 26px; }
  .eg-amount { font-size: 34px; }
}

@media (prefers-reduced-motion: reduce) {
  .eg-btn { transition: none; }
}
</style>

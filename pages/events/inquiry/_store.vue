<template>
  <GuestShell
    :locale="locale"
    :eyebrow="t('ev_guest_inquiry_eyebrow')"
    @locale="setLocale"
  >
    <!-- ---- sent ----------------------------------------------------------------------------- -->
    <section v-if="confirmation" class="eg-card eg-card--good" data-test="sent">
      <h1 class="eg-title">
        {{ t('ev_guest_inquiry_sent_heading') }}
      </h1>
      <p class="eg-lede">
        {{ t('ev_guest_inquiry_sent_body') }}
      </p>
      <p v-if="confirmation.publicId" class="eg-ref">
        {{ t('ev_guest_inquiry_reference', { reference: confirmation.publicId }) }}
      </p>
    </section>

    <template v-else-if="storeId">
      <section class="eg-card">
        <h1 class="eg-title">
          {{ t('ev_guest_inquiry_title') }}
        </h1>
        <p class="eg-lede">
          {{ t('ev_guest_inquiry_intro') }}
        </p>

        <form class="eg-form" novalidate @submit.prevent="send">
          <label class="eg-field">
            <span>{{ t('ev_guest_field_occasion') }}</span>
            <input
              v-model="form.title"
              type="text"
              :placeholder="t('ev_guest_field_occasion_hint')"
              :disabled="busy"
            >
          </label>

          <div class="eg-grid">
            <label class="eg-field">
              <span>{{ t('ev_guest_field_date') }}</span>
              <input v-model="form.eventDate" type="date" :disabled="busy">
            </label>
            <label class="eg-field">
              <span>{{ t('ev_guest_field_guests') }}</span>
              <input v-model.number="form.guestCountPlanned" type="number" min="1" step="1" :disabled="busy">
            </label>
            <label class="eg-field">
              <span>{{ t('ev_guest_field_from') }}</span>
              <input v-model="form.startTime" type="time" :disabled="busy">
            </label>
            <label class="eg-field">
              <span>{{ t('ev_guest_field_to') }}</span>
              <input v-model="form.endTime" type="time" :disabled="busy">
            </label>
          </div>

          <div class="eg-grid">
            <label class="eg-field">
              <span>{{ t('ev_guest_field_name') }}</span>
              <input v-model="form.contactName" type="text" autocomplete="name" :disabled="busy">
            </label>
            <label class="eg-field">
              <span>{{ t('ev_guest_field_email') }}</span>
              <input v-model="form.contactEmail" type="email" autocomplete="email" :disabled="busy">
            </label>
            <label class="eg-field">
              <span>{{ t('ev_guest_field_phone') }}</span>
              <input v-model="form.contactPhone" type="tel" autocomplete="tel" :disabled="busy">
            </label>
            <label class="eg-field">
              <span>{{ t('ev_guest_field_company') }}</span>
              <input v-model="form.companyName" type="text" autocomplete="organization" :disabled="busy">
            </label>
          </div>

          <label class="eg-field">
            <span>{{ t('ev_guest_field_message') }}</span>
            <textarea v-model="form.message" rows="4" :disabled="busy" />
          </label>

          <p v-if="showProblems && problems.length" class="eg-note eg-note--warn" data-test="problems">
            {{ t('ev_guest_inquiry_needs') }}
          </p>

          <button type="submit" class="eg-btn eg-btn--primary" :disabled="busy">
            {{ busy ? t('ev_guest_inquiry_sending') : t('ev_guest_inquiry_submit') }}
          </button>
        </form>
      </section>

      <!-- The venue can have the Events module switched off, and there is no anonymous read that
           says so before the form is filled in. So the refusal is where the guest learns it, and it
           is rendered with the server's own words rather than as a generic failure. -->
      <section v-if="refusal" class="eg-card eg-card--bad" data-test="refusal">
        <h2 class="eg-heading">
          {{ t('ev_guest_inquiry_refused_heading') }}
        </h2>
        <p class="eg-lede">
          {{ t(refusalSentence) }}
        </p>
        <p v-if="refusal.message" class="eg-detail">
          {{ t('ev_guest_refused_detail', { detail: refusal.message }) }}
        </p>
      </section>
    </template>

    <div v-else-if="resolving" class="eg-card eg-card--quiet" :aria-busy="String(showLoading)">
      <p v-if="showLoading" class="eg-quiet">
        {{ t('ev_guest_loading') }}
      </p>
    </div>

    <!-- No venue, no form. A guest cannot send an enquiry to nobody, and a form that submits into
         a refusal every time is not a form. -->
    <div v-else class="eg-card" data-test="store-unknown">
      <h1 class="eg-title">
        {{ t('ev_guest_store_unknown_heading') }}
      </h1>
      <p class="eg-lede">
        {{ t('ev_guest_store_unknown_body') }}
      </p>
    </div>
  </GuestShell>
</template>

<script>
import GuestShell from '~/components/events/GuestShell.vue';
import { EventsGuestService } from '~/utils/events/events-guest-client';
import { PublicStoreService } from '~/utils/public-store-client';
import { isEventsApiError } from '~/utils/events/events-client';
import { translate } from '~/utils/i18n';
import { inquiryProblems, refusalKey, guestLocale } from '~/utils/events/guest';

// The public enquiry form: the only guest surface that is not tokenised, and the one entry point
// into the Events pipeline a venue can put on its own website.
//
// The route parameter names the venue, as an id (`/events/inquiry/42`) or as the store slug the
// public shop pages already use (`/events/inquiry/lyststedet`). The slug is resolved through the one
// anonymous route that answers with an id and nothing else — see `~/utils/public-store-client` for
// why the store reads BESIDE it are not used here.
//
// `POST /events/inquiries` takes `storeId` in the BODY, which is unlike every other Events route
// (the tokenised ones carry it implicitly, the admin ones carry it in the path). It is sent from the
// resolved route parameter and from nowhere else: a store id out of a query string or a form field
// would let anyone file an enquiry against any venue from a page they control.
export default {
  name: 'EventsGuestInquiryPage',
  components: { GuestShell },
  layout: 'empty',
  data () {
    return {
      locale: 'no',
      resolving: true,
      showLoading: false,
      loadingTimer: null,
      busy: false,
      storeId: null,
      form: newForm(),
      showProblems: false,
      confirmation: null,
      refusal: null
    };
  },
  computed: {
    problems () {
      return inquiryProblems(this.form);
    },
    refusalSentence () {
      return refusalKey(this.refusal && this.refusal.code);
    }
  },
  created () {
    this._service = new EventsGuestService();
    this._stores = new PublicStoreService();
  },
  mounted () {
    this.locale = guestLocale(this.$i18n && this.$i18n.locale);
    this.resolveStore();
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

    async resolveStore () {
      const param = this.$route && this.$route.params ? String(this.$route.params.store || '') : '';
      this.resolving = true;
      this.showLoading = false;
      this.loadingTimer = setTimeout(() => { this.showLoading = true; }, 300);

      try {
        // A bare number is the id itself, so the common case costs no round trip.
        this.storeId = /^\d+$/.test(param)
          ? Number(param)
          : await this._stores.ResolveIdBySlug(param);
      } finally {
        if (this.loadingTimer) { clearTimeout(this.loadingTimer); }
        this.loadingTimer = null;
        this.showLoading = false;
        this.resolving = false;
      }
    },

    /**
     * T1. The required fields mirror `EventsInquiryService`'s own guards (a contact name, a contact
     * email, a positive guest count) plus a real date, and they block the submit rather than being
     * defaulted: an enquiry the venue cannot answer is worse for the guest than one they have to
     * finish filling in. The server still decides, and its refusal is rendered when it disagrees.
     */
    async send () {
      if (this.busy || !this.storeId) { return; }
      if (this.problems.length) { this.showProblems = true; return; }

      this.busy = true;
      this.refusal = null;
      try {
        this.confirmation = await this._service.CreateInquiry({
          storeId: this.storeId,
          title: this.form.title.trim() || null,
          eventDate: this.form.eventDate,
          // Sent as the bare `HH:mm` the time input produces, which is what the `TimeSpan?` binder
          // takes and what the admin form already sends. Empty stays null rather than becoming
          // midnight, which would be a time nobody chose.
          startTime: this.form.startTime || null,
          endTime: this.form.endTime || null,
          guestCountPlanned: this.form.guestCountPlanned,
          contactName: this.form.contactName.trim(),
          contactEmail: this.form.contactEmail.trim(),
          contactPhone: this.form.contactPhone.trim() || null,
          companyName: this.form.companyName.trim() || null,
          message: this.form.message.trim() || null
        });
      } catch (e) {
        this.refusal = isEventsApiError(e) ? e : { code: null, message: (e && e.message) || null };
      } finally {
        this.busy = false;
      }
    }
  },
  head () {
    return {
      title: translate(this.locale, 'ev_guest_inquiry_meta_title')
    };
  }
};

function newForm () {
  return {
    title: '',
    eventDate: '',
    startTime: '',
    endTime: '',
    guestCountPlanned: null,
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    companyName: '',
    message: ''
  };
}
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
.eg-card--good { background: #f0fdf4; border: 1px solid #bbf7d0; box-shadow: none; }
.eg-card--bad { background: #fef2f2; border: 1px solid #fecaca; box-shadow: none; }

.eg-title {
  margin: 0 0 12px;
  font-size: 30px;
  line-height: 1.15;
  font-weight: 600;
  color: #292c34;
}

.eg-heading { margin: 0 0 12px; font-size: 20px; font-weight: 600; color: #292c34; }
.eg-lede { margin: 0 0 12px; font-size: 16px; color: #292c34; }
.eg-quiet { margin: 12px 0 0; font-size: 14.5px; color: #64748b; }
.eg-detail { margin: 8px 0 0; font-size: 14.5px; color: #64748b; }
.eg-note { margin: 20px 0; padding: 16px 20px; border-radius: 12px; font-size: 15px; }
.eg-note--warn { background: #fff7ed; color: #92400e; }

.eg-form { margin-top: 28px; }
.eg-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
.eg-field { display: block; margin-bottom: 20px; }

.eg-field span {
  display: block;
  margin-bottom: 8px;
  font-size: 14.5px;
  font-weight: 600;
  color: #292c34;
}

.eg-field input,
.eg-field textarea {
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  font: inherit;
  font-size: 16px;
  color: #292c34;
  box-sizing: border-box;
  transition: border-color 180ms cubic-bezier(0.16, 0.84, 0.34, 1);
}

.eg-field input:focus,
.eg-field textarea:focus {
  outline: none;
  border-color: #1bb776;
  box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.18);
}

.eg-btn {
  min-height: 52px;
  padding: 0 24px;
  border-radius: 12px;
  border: 1px solid transparent;
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 180ms cubic-bezier(0.16, 0.84, 0.34, 1), background-color 180ms cubic-bezier(0.16, 0.84, 0.34, 1);
}

.eg-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.eg-btn:not(:disabled):active { transform: translateY(1px); }

.eg-btn--primary {
  width: 100%;
  min-height: 64px;
  background: #1bb776;
  color: #fff;
}

.eg-btn--primary:not(:disabled):hover { background: #159f63; }

.eg-ref {
  margin: 12px 0 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: #64748b;
  word-break: break-all;
}

@media (max-width: 560px) {
  .eg-card { padding: 24px; }
  .eg-title { font-size: 26px; }
}

@media (prefers-reduced-motion: reduce) {
  .eg-btn,
  .eg-field input,
  .eg-field textarea { transition: none; }
}
</style>

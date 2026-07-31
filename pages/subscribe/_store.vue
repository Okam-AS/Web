<template>
  <GuestShell
    :locale="locale"
    :eyebrow="t('gr_guest_signup_eyebrow')"
    @locale="setLocale"
  >
    <!-- ---- the request was taken ------------------------------------------------------------- -->
    <!-- Rendered INSTEAD of the form, and never beside it: a second submit would supersede the
         pending invite and kill the confirm link the first one minted. -->
    <section v-if="accepted" class="gg-card gg-card--good" data-test="accepted">
      <h1 class="gg-title">
        {{ t('gr_guest_signup_accepted_heading') }}
      </h1>
      <p class="gg-lede">
        {{ t('gr_guest_signup_accepted_body') }}
      </p>
      <p class="gg-body">
        {{ t('gr_guest_signup_accepted_nothing_yet') }}
      </p>
      <!-- The two sentences the 202 obliges. The endpoint answers identically whether the address is
           new, already pending or already verified — so the page may not report which, and saying so
           out loud is better than a guest reading the silence as a bug. -->
      <p class="gg-quiet">
        {{ t('gr_guest_signup_accepted_no_oracle') }}
      </p>
      <p class="gg-quiet">
        {{ t('gr_guest_signup_accepted_nothing_arrives') }}
      </p>
    </section>

    <template v-else-if="capture">
      <section class="gg-card">
        <h1 class="gg-title">
          {{ t('gr_guest_signup_title') }}
        </h1>
        <p class="gg-lede">
          {{ t('gr_guest_signup_intro') }}
        </p>
        <!-- The consent wording says "this business" and names no venue, because one platform-global
             row is shown at every venue. This page cannot fill that in either: no anonymous backend
             read answers a venue's name without also answering its invoicing addresses and giftcard
             bank account (see `~/utils/public-store-client`). Rather than invent a name or print a
             URL slug as if it were one, the page says plainly whose list this is in the terms it can
             actually stand behind. -->
        <p class="gg-quiet">
          {{ t('gr_guest_signup_which_venue') }}
        </p>

        <form class="gg-form" novalidate @submit.prevent="submit">
          <label class="gg-field">
            <span>{{ t('gr_guest_signup_email_label') }}</span>
            <input
              v-model="form.email"
              type="email"
              inputmode="email"
              autocomplete="email"
              autocapitalize="off"
              spellcheck="false"
              :placeholder="t('gr_guest_signup_email_hint')"
              :disabled="busy"
            >
          </label>

          <!-- THE CONSENT TICK IS THE SERVER'S OWN SENTENCE, RENDERED VERBATIM AS THE LABEL.
               `GrowthPublicConsentTextResponse` carries the text and the version id in one response
               precisely so a page cannot display one version and pin another, and the receipt written
               on confirm pins the id this form posts. It is unticked on arrival and there is no
               pre-selection anywhere on this page: a pre-ticked box is not an affirmative action
               (GDPR art. 4(11)) and would make every receipt worthless. -->
          <label class="gg-consent" data-test="consent">
            <input v-model="form.consented" type="checkbox" :disabled="busy">
            <span v-text="capture.text" />
          </label>

          <p class="gg-quiet" data-test="consent-provenance">
            {{ t('gr_guest_signup_consent_recorded', { version: capture.version, locale: capture.locale }) }}
          </p>
          <!-- Only when it is true. The consent register holds one locale (`nb-NO`), so an English or
               German reader is shown Norwegian wording — and it stays Norwegian, because translating
               it here would show a sentence different from the one on the receipt. -->
          <p v-if="consentLanguageDiffers" class="gg-note gg-note--info" data-test="consent-language">
            {{ t('gr_guest_signup_consent_language', { locale: capture.locale }) }}
          </p>

          <p v-if="showProblems && problems.length" class="gg-note gg-note--warn" data-test="problems">
            {{ t(problemKey) }}
          </p>

          <button type="submit" class="gg-btn gg-btn--primary" :disabled="busy">
            {{ busy ? t('gr_guest_signup_sending') : t('gr_guest_signup_submit') }}
          </button>

          <p class="gg-quiet">
            {{ t('gr_guest_signup_leaving_is_easy') }}
          </p>
        </form>
      </section>

      <section v-if="refusal" class="gg-card gg-card--bad" data-test="refusal">
        <h2 class="gg-heading">
          {{ t('gr_guest_signup_refused_heading') }}
        </h2>
        <p class="gg-lede">
          {{ t(refusalSentence) }}
        </p>
        <p v-if="refusal.message" class="gg-detail">
          {{ t('gr_guest_refused_detail', { detail: refusal.message }) }}
        </p>
      </section>
    </template>

    <div v-else-if="loading" class="gg-card gg-card--quiet" :aria-busy="String(showLoading)">
      <p v-if="showLoading" class="gg-quiet">
        {{ t('gr_guest_loading') }}
      </p>
    </div>

    <!-- NO CONSENT TEXT, NO FORM. Without a version id there is nothing lawful to pin a capture to,
         and the endpoint would refuse every submission with `growth.consent_text_unknown`. A form
         that is certain to be refused is not a form, so none is drawn. -->
    <div v-else-if="unavailable" class="gg-card" data-test="unavailable">
      <h1 class="gg-title">
        {{ t('gr_guest_signup_unavailable_heading') }}
      </h1>
      <p class="gg-lede">
        {{ t('gr_guest_signup_unavailable_body') }}
      </p>
    </div>

    <div v-else class="gg-card" data-test="unknown">
      <h1 class="gg-title">
        {{ t('gr_guest_state_unknown_heading') }}
      </h1>
      <p class="gg-lede">
        {{ t('gr_guest_state_unknown_body') }}
      </p>
      <p v-if="read.detail" class="gg-detail">
        {{ t('gr_guest_refused_detail', { detail: read.detail }) }}
      </p>
      <button type="button" class="gg-btn gg-btn--ghost" @click="load">
        {{ t('gr_guest_retry') }}
      </button>
    </div>
  </GuestShell>
</template>

<script>
import GuestShell from '~/components/events/GuestShell.vue';
import { GrowthGuestService } from '~/utils/growth/growth-guest-client';
import { PublicStoreService } from '~/utils/public-store-client';
import { isGrowthApiError } from '~/utils/growth/api-client';
import { guestHead } from '~/utils/growth/guest-head';
import { translate } from '~/utils/i18n';
import {
  GROWTH_HELD,
  GROWTH_UNAVAILABLE,
  GROWTH_UNKNOWN,
  CAPTURE_SOURCE_WEB,
  readGrowth,
  growthRefusalKey,
  subscribeProblems,
  consentLocaleDiffers,
  guestLocale
} from '~/utils/growth/guest';

// The public double-opt-in capture surface — the page without which the whole Growth module cannot
// acquire a single subscriber, because nothing else in the estate creates a contact point.
//
// PUBLIC BY CONSTRUCTION, which in this app is a routing fact rather than a flag: authentication is
// enforced by the `AdminPage` organism (it mounts the login modal and redirects to `/admin`), and
// there is no route middleware anywhere in the repo, so a page that does not wrap itself in
// `AdminPage` is reachable by anyone. The `empty` layout keeps the marketing chrome off it, and
// `GrowthGuestService` is built with no initializer so it cannot attach a bearer token even when the
// person reading this page is a signed-in staff member.
//
// THE ROUTE PARAMETER NAMES THE VENUE, as an id (`/subscribe/42`) or as the store slug the public
// shop pages already use (`/subscribe/lyststedet`). `POST /v1/growth/stores/{storeId}/subscriptions`
// takes the store in the PATH and the backend treats it as authoritative, so it comes from the route
// and from nowhere else — a store id out of a query string would let any page capture consent against
// any venue.
//
// `/subscribe/confirm` is a static sibling of this dynamic route and Nuxt sorts static segments
// first, so the confirm landing always wins. The consequence, named rather than discovered: a store
// whose slug is literally `confirm` cannot be addressed here.
//
// TWO CALLS, IN ORDER, AND THE SECOND ONLY IF THE FIRST HELD. The consent text is read first because
// it is the thing that decides whether a capture is possible at all: it carries the version id the
// capture must pin, and its 404 is the same dark-store 404 the capture would get.
export default {
  name: 'GrowthGuestSignupPage',
  components: { GuestShell },
  layout: 'empty',
  data () {
    return {
      locale: 'no',
      loading: true,
      showLoading: false,
      loadingTimer: null,
      busy: false,
      storeId: null,
      read: { state: GROWTH_UNKNOWN, view: null, code: null, detail: null },
      form: { email: '', consented: false },
      showProblems: false,
      accepted: false,
      refusal: null
    };
  },
  computed: {
    // The served consent text, or null. Everything the form needs travels in this one object.
    capture () {
      return this.read.state === GROWTH_HELD ? this.read.view : null;
    },
    unavailable () {
      return this.read.state === GROWTH_UNAVAILABLE;
    },
    problems () {
      return subscribeProblems(this.form);
    },
    problemKey () {
      return this.problems.includes('email')
        ? 'gr_guest_signup_needs_email'
        : 'gr_guest_signup_needs_consent';
    },
    consentLanguageDiffers () {
      return consentLocaleDiffers(this.capture, this.locale);
    },
    refusalSentence () {
      return growthRefusalKey(this.refusal && this.refusal.code);
    }
  },
  created () {
    // Built once and kept: this client holds no token and no state, unlike the admin services whose
    // bearer token changes under them and which are therefore rebuilt per access.
    this._service = new GrowthGuestService();
    this._stores = new PublicStoreService();
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
      this.loading = true;
      this.startLoadingLadder();
      try {
        const param = this.$route && this.$route.params ? String(this.$route.params.store || '') : '';
        // A bare number is the id itself, so the common case costs no round trip.
        this.storeId = /^\d+$/.test(param)
          ? Number(param)
          : await this._stores.ResolveIdBySlug(param);

        if (!this.storeId) {
          // A slug that resolves to nothing is indistinguishable, to a guest, from a venue that has
          // the module off — and the backend deliberately refuses to distinguish those either. One
          // sentence covers both rather than two that guess.
          this.read = { state: GROWTH_UNAVAILABLE, view: null, code: null, detail: null };
          return;
        }

        this.read = readGrowth(await this._service.GetConsentText(this.storeId), null);
      } catch (e) {
        this.read = isGrowthApiError(e)
          ? readGrowth(null, e)
          : { state: GROWTH_UNKNOWN, view: null, code: null, detail: (e && e.message) || null };
      } finally {
        this.stopLoadingLadder();
      }
    },

    startLoadingLadder () {
      if (this.loadingTimer) { clearTimeout(this.loadingTimer); }
      this.showLoading = false;
      // Nothing at all under 300ms: a spinner that flashes for one frame reads as a fault, and most
      // of these reads land well inside it.
      this.loadingTimer = setTimeout(() => { this.showLoading = true; }, 300);
    },

    stopLoadingLadder () {
      if (this.loadingTimer) { clearTimeout(this.loadingTimer); }
      this.loadingTimer = null;
      this.showLoading = false;
      this.loading = false;
    },

    /**
     * The capture. `consentTextVersionId` is taken from the SAME response whose `text` was rendered
     * above, never from anywhere else — that identity is what makes the resulting receipt evidence of
     * what this guest actually read.
     */
    async submit () {
      if (this.busy || !this.capture || !this.storeId) { return; }
      if (this.problems.length) { this.showProblems = true; return; }

      this.busy = true;
      this.refusal = null;
      try {
        await this._service.Subscribe(this.storeId, {
          email: this.form.email.trim(),
          consentTextVersionId: this.capture.consentTextVersionId,
          captureSource: CAPTURE_SOURCE_WEB
        });
        this.accepted = true;
        // The address is dropped the moment it has been posted. It is not needed again — the
        // acknowledgment carries none and echoing it back would put it in the DOM of a page that may
        // be left open on a shared phone — and the endpoint's whole design is that this page learns
        // nothing about the address it just sent.
        this.form = { email: '', consented: false };
      } catch (e) {
        this.refusal = isGrowthApiError(e) ? e : { code: null, message: (e && e.message) || null };
      } finally {
        this.busy = false;
      }
    }
  },
  head () {
    // The one Growth guest page that IS indexable: it is a public capture surface a venue links to
    // from its own site, and it carries no credential.
    return guestHead(translate(this.locale, 'gr_guest_signup_meta_title'), { index: true });
  }
};
</script>

<style scoped>
/* Only what is this page's own; the card, form and button chrome is `assets/sass/_guest-surface`. */
.gg-form .gg-consent { margin-bottom: 20px; }
.gg-form .gg-btn--primary { margin-top: 8px; }
</style>

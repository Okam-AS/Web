<template>
  <GuestShell
    :locale="locale"
    :eyebrow="t('gr_guest_unsub_eyebrow')"
    private-link
    @locale="setLocale"
  >
    <section v-if="done" class="gg-card gg-card--good" data-test="done">
      <h1 class="gg-title">
        {{ t('gr_guest_unsub_done_heading') }}
      </h1>
      <p class="gg-lede">
        {{ t('gr_guest_unsub_done_body') }}
      </p>
      <p class="gg-body">
        {{ t('gr_guest_unsub_done_scope') }}
      </p>
      <p class="gg-quiet">
        {{ t('gr_guest_unsub_done_return') }}
      </p>
      <p class="gg-quiet">
        {{ t('gr_guest_unsub_done_replay') }}
      </p>
    </section>

    <div v-else-if="busy" class="gg-card gg-card--quiet" :aria-busy="String(showLoading)">
      <p v-if="showLoading" class="gg-quiet">
        {{ t('gr_guest_unsub_working') }}
      </p>
    </div>

    <section v-else-if="tokenDead" class="gg-card" data-test="token-dead">
      <h1 class="gg-title">
        {{ t('gr_guest_unsub_dead_heading') }}
      </h1>
      <p class="gg-lede">
        {{ t('gr_guest_unsub_dead_body') }}
      </p>
      <p class="gg-quiet">
        {{ t('gr_guest_unsub_dead_next') }}
      </p>
    </section>

    <section v-else-if="noToken" class="gg-card" data-test="no-token">
      <h1 class="gg-title">
        {{ t('gr_guest_unsub_notoken_heading') }}
      </h1>
      <p class="gg-lede">
        {{ t('gr_guest_unsub_notoken_body') }}
      </p>
    </section>

    <section v-else class="gg-card" data-test="unknown">
      <h1 class="gg-title">
        {{ t('gr_guest_state_unknown_heading') }}
      </h1>
      <!-- A failed unsubscribe is the one failure on this surface a guest must not be left to assume
           worked. It says so, and the retry stays available because the token is still held. -->
      <p class="gg-lede">
        {{ t('gr_guest_unsub_unknown_body') }}
      </p>
      <p v-if="detail" class="gg-detail">
        {{ t('gr_guest_refused_detail', { detail: detail }) }}
      </p>
      <button type="button" class="gg-btn gg-btn--ghost" :disabled="!token" @click="unsubscribe">
        {{ t('gr_guest_retry') }}
      </button>
    </section>
  </GuestShell>
</template>

<script>
import GuestShell from '~/components/events/GuestShell.vue';
import { GrowthGuestService } from '~/utils/growth/growth-guest-client';
import { isGrowthApiError } from '~/utils/growth/api-client';
import { guestHead } from '~/utils/growth/guest-head';
import { translate } from '~/utils/i18n';
import {
  GROWTH_TOKEN_DEAD,
  GROWTH_NO_TOKEN,
  GROWTH_UNKNOWN,
  growthState,
  tokenFromUrl,
  guestLocale
} from '~/utils/growth/guest';

// The browser landing for an RFC 8058 unsubscribe token.
//
// ONE CLICK MEANS ONE CLICK. It unsubscribes on arrival and asks nothing first. RFC 8058 §1 is
// explicit that the act completes without a confirmation step, GDPR art. 7(3) requires withdrawal to
// be as easy as consent, and markedsføringsloven § 15 requires a working opt-out in every marketing
// message — a "are you sure?" here would be the textbook dark pattern all three exist to forbid.
//
// WHAT THIS PAGE IS FOR, stated plainly because it is not the machine path. The `List-Unsubscribe`
// header points mailbox providers at `POST {PublicApiBaseUrl}/v1/growth/unsubscribe?token=…` on the
// API itself, and that POST is the one-click mechanism; it is not this page and does not need one.
// This page is the HUMAN path for the same token: a guest who long-presses the unsubscribe affordance
// and opens the URI in a browser today reaches a POST-only endpoint and gets a 405, which reads as a
// broken opt-out. It accepts the token from `?token=` for exactly that case, and from `#token=` for
// any future body link, preferring the fragment when both are present.
//
// ⚠ NOTHING LINKS HERE YET, and that is a backend fact rather than an omission on this side. The
// newsletter footer (`GrowthMarketingFooter`) deliberately links the preference centre instead —
// which is the right default, since that surface can also do art. 15/17 — and the RFC 8058 URI is
// fixed to the API origin by the RFC. Two one-line backend changes would connect it: a GET handler on
// `/v1/growth/unsubscribe` that 302s to `{PreferenceCentreBaseUrl}/../unsubscribe#token=…` (a GET
// redirect is permitted; the RFC only forbids redirecting the POST), or a second footer link. Until
// one lands, this page is reachable only by constructing the URL.
export default {
  name: 'GrowthGuestUnsubscribePage',
  components: { GuestShell },
  layout: 'empty',
  data () {
    return {
      locale: 'no',
      token: null,
      busy: true,
      showLoading: false,
      loadingTimer: null,
      done: false,
      state: GROWTH_UNKNOWN,
      detail: null
    };
  },
  computed: {
    tokenDead () {
      return this.state === GROWTH_TOKEN_DEAD;
    },
    noToken () {
      return this.state === GROWTH_NO_TOKEN;
    }
  },
  created () {
    this._service = new GrowthGuestService();
  },
  mounted () {
    this.locale = guestLocale(this.$i18n && this.$i18n.locale);
    this.token = this.readToken();
    if (!this.token) {
      this.busy = false;
      this.state = GROWTH_NO_TOKEN;
      return;
    }
    this.unsubscribe();
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

    // Stripped from the address bar like the other two, with one extra reason: this token is the one
    // that can arrive in a QUERY string, so it is the one most likely to be in a history entry, a
    // shared screenshot or a pasted message.
    readToken () {
      if (typeof window === 'undefined' || !window.location) { return null; }
      const token = tokenFromUrl(window.location.hash, window.location.search);
      if (token && window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(null, '', window.location.pathname);
      }
      return token;
    },

    async unsubscribe () {
      if (!this.token) { return; }

      this.busy = true;
      this.detail = null;
      this.startLoadingLadder();
      try {
        // The response is the resulting preference state. It is not rendered field by field: on this
        // page the guest asked for one thing, and the useful answer is that it happened.
        await this._service.Unsubscribe(this.token);
        this.done = true;
      } catch (e) {
        this.done = false;
        this.state = isGrowthApiError(e) ? growthState(e) : GROWTH_UNKNOWN;
        this.detail = (e && e.message) || null;
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
      this.busy = false;
    }
  },
  head () {
    return guestHead(translate(this.locale, 'gr_guest_unsub_meta_title'));
  }
};
</script>

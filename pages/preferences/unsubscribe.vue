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
// This page is the HUMAN path for the same token, and it is reached two ways:
//
//   1. THE FOOTER LINK — `{UnsubscribePageBaseUrl}#token=…`, emitted by `GrowthMarketingFooter` in
//      every dispatched newsletter beside the preference-centre link. This is the primary entry, and
//      the reason it exists is that the preference centre CANNOT be completed from a mail client's
//      cross-site context (its session cookie is `SameSite=Strict` and the API's CORS posture is
//      non-credentialed) while this page needs no session at all.
//   2. A LONG-PRESS on the `List-Unsubscribe` URI — a human opening the machine URI by hand. The API
//      answers that GET with a 302 to this page, moving the token from `?token=` into `#token=`.
//      (It used to answer 405, i.e. a visibly broken opt-out, which is what that redirect closed.)
//
// So the token is accepted from `#token=` and from `?token=`, preferring the fragment when both are
// present — the fragment is the safer carrier, because a browser never transmits it.
//
// FOR A GUEST SURFACE THE MAIL IS THE NAVIGATION ENTRY. There is deliberately no in-app link to this
// page: its audience is a person holding a message, not a person browsing the site, and a token-less
// arrival can do nothing but read the `no-token` card.
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

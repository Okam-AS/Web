<template>
  <GuestShell
    :locale="locale"
    :eyebrow="t('gr_guest_confirm_eyebrow')"
    private-link
    @locale="setLocale"
  >
    <section v-if="confirmed" class="gg-card gg-card--good" data-test="confirmed">
      <h1 class="gg-title">
        {{ t('gr_guest_confirm_done_heading') }}
      </h1>
      <p class="gg-lede">
        {{ t('gr_guest_confirm_done_body') }}
      </p>
      <p class="gg-body">
        {{ t('gr_guest_confirm_done_leaving') }}
      </p>
      <!-- Spending the same link twice returns the identical answer and appends nothing, so a guest
           who reloads or clicks again sees this and not a failure. Saying so removes the one reason
           they would otherwise have to worry that they subscribed twice. -->
      <p class="gg-quiet">
        {{ t('gr_guest_confirm_done_replay') }}
      </p>
    </section>

    <div v-else-if="busy" class="gg-card gg-card--quiet" :aria-busy="String(showLoading)">
      <p v-if="showLoading" class="gg-quiet">
        {{ t('gr_guest_confirm_working') }}
      </p>
    </div>

    <!-- 410. Unknown, expired and superseded are ONE answer on the wire (anti-oracle), so all three
         are offered as possible reasons rather than one being picked and asserted. -->
    <section v-else-if="tokenDead" class="gg-card" data-test="token-dead">
      <h1 class="gg-title">
        {{ t('gr_guest_confirm_dead_heading') }}
      </h1>
      <p class="gg-lede">
        {{ t('gr_guest_confirm_dead_body') }}
      </p>
      <ul class="gg-list">
        <li>{{ t('gr_guest_confirm_dead_used') }}</li>
        <li>{{ t('gr_guest_confirm_dead_expired') }}</li>
        <li>{{ t('gr_guest_confirm_dead_superseded') }}</li>
      </ul>
      <p class="gg-quiet">
        {{ t('gr_guest_confirm_dead_next') }}
      </p>
    </section>

    <section v-else-if="noToken" class="gg-card" data-test="no-token">
      <h1 class="gg-title">
        {{ t('gr_guest_confirm_notoken_heading') }}
      </h1>
      <p class="gg-lede">
        {{ t('gr_guest_confirm_notoken_body') }}
      </p>
      <p class="gg-quiet">
        {{ t('gr_guest_confirm_notoken_why') }}
      </p>
    </section>

    <section v-else class="gg-card" data-test="unknown">
      <h1 class="gg-title">
        {{ t('gr_guest_state_unknown_heading') }}
      </h1>
      <p class="gg-lede">
        {{ t('gr_guest_confirm_unknown_body') }}
      </p>
      <p v-if="detail" class="gg-detail">
        {{ t('gr_guest_refused_detail', { detail: detail }) }}
      </p>
      <button type="button" class="gg-btn gg-btn--ghost" :disabled="!token" @click="confirm">
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

// The double-opt-in landing: the page `GrowthSettings.ConfirmBaseUrl` has been addressing since the
// module shipped, and which did not exist until now — so no contact point in any deployment could
// ever reach `Verified`, and the subscriber segment was structurally empty.
//
// THE PATH IS NOT OURS TO CHOOSE. The default is `https://okam.no/subscribe/confirm`; the token is
// appended as `#token=…`.
//
// THE TOKEN RIDES THE FRAGMENT, and that is load-bearing rather than incidental. A fragment is never
// transmitted to a server, so the credential stays out of every access log, proxy and `Referer`
// header between the guest's mailbox and the API. The page reads it from `window.location`, posts it
// in a request body, and then strips it out of the address bar — after that the URL left on screen,
// in the history entry and in anything the guest copies is inert.
//
// IT CONFIRMS ON ARRIVAL RATHER THAN BEHIND A BUTTON. The affirmative act is the click in the
// mailbox; a second "yes, really" here would be friction added to the one step in the journey that
// must be as light as possible, and it is not friction that buys safety: a link-scanner that fetches
// URLs server-side never receives the fragment at all, so it cannot spend this token however many
// times it follows the link.
export default {
  name: 'GrowthGuestConfirmPage',
  components: { GuestShell },
  layout: 'empty',
  data () {
    return {
      locale: 'no',
      token: null,
      busy: true,
      showLoading: false,
      loadingTimer: null,
      confirmed: false,
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
    this.confirm();
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

    /**
     * Reads the token out of the fragment and then removes it from the visible URL.
     *
     * The strip is the point: without it a single-use credential sits in the address bar of a page
     * that stays open, gets screenshotted, and is the first thing a guest copies when they want to
     * ask the venue about it. `replaceState` rewrites the current history entry rather than adding
     * one, so Back still leaves the page instead of returning to a URL that no longer works.
     */
    readToken () {
      if (typeof window === 'undefined' || !window.location) { return null; }
      const token = tokenFromUrl(window.location.hash, window.location.search);
      if (token && window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      return token;
    },

    async confirm () {
      if (!this.token) { return; }

      this.busy = true;
      this.detail = null;
      this.startLoadingLadder();
      try {
        await this._service.Confirm(this.token);
        this.confirmed = true;
      } catch (e) {
        this.confirmed = false;
        if (isGrowthApiError(e)) {
          this.state = growthState(e);
          this.detail = e.message || null;
        } else {
          // An untyped rejection is a request that never happened (offline, DNS). Nothing is claimed
          // about the subscription, and the retry stays available because the token is still held.
          this.state = GROWTH_UNKNOWN;
          this.detail = (e && e.message) || null;
        }
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
    return guestHead(translate(this.locale, 'gr_guest_confirm_meta_title'));
  }
};
</script>

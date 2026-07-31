<template>
  <GuestShell
    :locale="locale"
    :eyebrow="t('gr_guest_prefs_eyebrow')"
    private-link
    @locale="setLocale"
  >
    <template v-if="open">
      <!-- ---- what is held ------------------------------------------------------------------- -->
      <section class="gg-card">
        <h1 class="gg-title">
          {{ t('gr_guest_prefs_title') }}
        </h1>
        <p class="gg-lede">
          {{ t('gr_guest_prefs_intro') }}
        </p>

        <dl class="gg-facts" data-test="held">
          <div>
            <dt>{{ t('gr_guest_prefs_field_channel') }}</dt>
            <dd>{{ channelLabel }}</dd>
          </div>
          <div>
            <dt>{{ t('gr_guest_prefs_field_purpose') }}</dt>
            <dd>{{ purposeLabel }}</dd>
          </div>
          <div>
            <dt>{{ t('gr_guest_prefs_field_standing') }}</dt>
            <dd data-test="standing">
              {{ t('gr_guest_standing_' + standingNow) }}
            </dd>
          </div>
        </dl>

        <!-- The response carries no address, by design (spec §3 invariant 11). A page that showed
             one would be reading it back out of a store this surface is not allowed to read from —
             so it says what it does not know rather than leaving a blank the guest has to interpret. -->
        <p class="gg-quiet">
          {{ t('gr_guest_prefs_no_address') }}
        </p>
        <p class="gg-quiet">
          {{ t('gr_guest_prefs_one_venue') }}
        </p>
      </section>

      <!-- ---- the one control ------------------------------------------------------------------ -->
      <!-- ONE channel and ONE purpose, because the module has exactly one of each in v1. A page
           offering a grid of categories the backend cannot store would be inventing choices. -->
      <section class="gg-card">
        <h2 class="gg-heading">
          {{ t('gr_guest_prefs_control_heading') }}
        </h2>
        <p class="gg-body">
          {{ t(receivingNow ? 'gr_guest_prefs_control_on' : 'gr_guest_prefs_control_off') }}
        </p>

        <button
          v-if="receivingNow"
          type="button"
          class="gg-btn gg-btn--leave"
          data-test="stop"
          :disabled="busy"
          @click="setConsent(false)"
        >
          {{ busy ? t('gr_guest_working') : t('gr_guest_prefs_stop') }}
        </button>

        <button
          v-else
          type="button"
          class="gg-btn gg-btn--primary"
          data-test="resume"
          :disabled="busy"
          @click="setConsent(true)"
        >
          {{ busy ? t('gr_guest_working') : t('gr_guest_prefs_resume') }}
        </button>

        <!-- The honest outcome of asking to be put back on a list you are SUPPRESSED from: nothing
             changed. `UpdatePreferenceAsync` records the re-consent but never lifts a suppression —
             only a fresh confirmation click from the mailbox itself does that. A toggle that silently
             sprang back would read as a broken page; this says which act would actually work. -->
        <p v-if="blocked" class="gg-note gg-note--warn" data-test="reconsent-blocked">
          {{ t('gr_guest_prefs_resume_blocked') }}
        </p>

        <p v-if="stopped" class="gg-note gg-note--info" data-test="stopped">
          {{ t('gr_guest_prefs_stopped_note') }}
        </p>
      </section>

      <!-- ---- art. 15 -------------------------------------------------------------------------- -->
      <section class="gg-card">
        <h2 class="gg-heading">
          {{ t('gr_guest_access_heading') }}
        </h2>
        <p class="gg-body">
          {{ t('gr_guest_access_body') }}
        </p>

        <div v-if="accessFiled" class="gg-note gg-note--info" data-test="access-filed">
          <strong>{{ t('gr_guest_access_filed_heading') }}</strong>
          <p>{{ t('gr_guest_access_filed_body') }}</p>
          <p>{{ t('gr_guest_request_deadline') }}</p>
          <p class="gg-ref">
            {{ t('gr_guest_request_reference', { reference: accessFiled.requestId, when: instant(accessFiled.receivedAt) }) }}
          </p>
        </div>

        <button
          v-else
          type="button"
          class="gg-btn gg-btn--ghost"
          data-test="file-access"
          :disabled="busy"
          @click="fileAccess"
        >
          {{ busy ? t('gr_guest_working') : t('gr_guest_access_button') }}
        </button>
      </section>

      <!-- ---- art. 17 -------------------------------------------------------------------------- -->
      <!-- Irreversible, so it is described in full BEFORE it is offered, and the description
           separates the three things that actually happen at three different times rather than
           collapsing them into "your data has been deleted". -->
      <section class="gg-card gg-card--grave">
        <h2 class="gg-heading">
          {{ t('gr_guest_erasure_heading') }}
        </h2>

        <div v-if="erasureFiled" data-test="erasure-filed">
          <p class="gg-lede">
            {{ t('gr_guest_erasure_filed_heading') }}
          </p>
          <p class="gg-body">
            {{ t('gr_guest_erasure_filed_now') }}
          </p>
          <p class="gg-body">
            {{ t('gr_guest_erasure_filed_later') }}
          </p>
          <p class="gg-body">
            {{ t('gr_guest_request_deadline') }}
          </p>
          <p class="gg-ref">
            {{ t('gr_guest_request_reference', { reference: erasureFiled.requestId, when: instant(erasureFiled.receivedAt) }) }}
          </p>
        </div>

        <template v-else-if="erasureAsked">
          <p class="gg-lede" data-test="erasure-warning">
            {{ t('gr_guest_erasure_irreversible') }}
          </p>
          <ul class="gg-list">
            <li>{{ t('gr_guest_erasure_step_now') }}</li>
            <li>{{ t('gr_guest_erasure_step_later') }}</li>
            <li>{{ t('gr_guest_erasure_step_kept') }}</li>
            <li>{{ t('gr_guest_erasure_step_shared') }}</li>
          </ul>
          <div class="gg-row gg-stack">
            <button
              type="button"
              class="gg-btn gg-btn--danger"
              data-test="erasure-confirm"
              :disabled="busy"
              @click="fileErasure"
            >
              {{ busy ? t('gr_guest_working') : t('gr_guest_erasure_confirm') }}
            </button>
            <button
              type="button"
              class="gg-btn gg-btn--plain"
              data-test="erasure-cancel"
              :disabled="busy"
              @click="erasureAsked = false"
            >
              {{ t('gr_guest_erasure_cancel') }}
            </button>
          </div>
        </template>

        <template v-else>
          <p class="gg-body">
            {{ t('gr_guest_erasure_body') }}
          </p>
          <button
            type="button"
            class="gg-btn gg-btn--ghost"
            data-test="erasure-open"
            :disabled="busy"
            @click="erasureAsked = true"
          >
            {{ t('gr_guest_erasure_button') }}
          </button>
        </template>
      </section>

      <section v-if="refusal" class="gg-card gg-card--bad" data-test="refusal">
        <h2 class="gg-heading">
          {{ t('gr_guest_prefs_refused_heading') }}
        </h2>
        <p class="gg-lede">
          {{ t(refusalSentence) }}
        </p>
        <p v-if="refusal.message" class="gg-detail">
          {{ t('gr_guest_refused_detail', { detail: refusal.message }) }}
        </p>
      </section>

      <p class="gg-quiet" data-test="session-note">
        {{ t('gr_guest_prefs_session_note') }}
      </p>
    </template>

    <div v-else-if="opening" class="gg-card gg-card--quiet" :aria-busy="String(showLoading)">
      <p v-if="showLoading" class="gg-quiet">
        {{ t('gr_guest_loading') }}
      </p>
    </div>

    <section v-else-if="tokenDead" class="gg-card" data-test="token-dead">
      <h1 class="gg-title">
        {{ t('gr_guest_prefs_dead_heading') }}
      </h1>
      <p class="gg-lede">
        {{ t('gr_guest_prefs_dead_body') }}
      </p>
      <ul class="gg-list">
        <li>{{ t('gr_guest_prefs_dead_used') }}</li>
        <li>{{ t('gr_guest_prefs_dead_expired') }}</li>
      </ul>
      <p class="gg-quiet">
        {{ t('gr_guest_prefs_dead_next') }}
      </p>
    </section>

    <section v-else-if="sessionDead" class="gg-card" data-test="session-dead">
      <h1 class="gg-title">
        {{ t('gr_guest_prefs_session_dead_heading') }}
      </h1>
      <p class="gg-lede">
        {{ t('gr_guest_prefs_session_dead_body') }}
      </p>
      <p class="gg-quiet">
        {{ t('gr_guest_prefs_session_dead_next') }}
      </p>
    </section>

    <section v-else-if="noToken" class="gg-card" data-test="no-token">
      <h1 class="gg-title">
        {{ t('gr_guest_prefs_notoken_heading') }}
      </h1>
      <p class="gg-lede">
        {{ t('gr_guest_prefs_notoken_body') }}
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
        {{ t('gr_guest_prefs_unknown_body') }}
      </p>
      <p v-if="detail" class="gg-detail">
        {{ t('gr_guest_refused_detail', { detail: detail }) }}
      </p>
    </section>
  </GuestShell>
</template>

<script>
import GuestShell from '~/components/events/GuestShell.vue';
import { GrowthGuestService } from '~/utils/growth/growth-guest-client';
import { isGrowthApiError } from '~/utils/growth/api-client';
import { guestHead } from '~/utils/growth/guest-head';
import { translate } from '~/utils/i18n';
import { formatDeadline } from '~/utils/events/guest';
import {
  GROWTH_TOKEN_DEAD,
  GROWTH_SESSION_DEAD,
  GROWTH_NO_TOKEN,
  GROWTH_UNKNOWN,
  CHANNEL_EMAIL,
  PURPOSE_NEWSLETTER,
  PRIVACY_ACCESS,
  PRIVACY_ERASURE,
  growthState,
  growthRefusalKey,
  tokenFromUrl,
  standing,
  receiving,
  reconsentBlocked,
  guestLocale
} from '~/utils/growth/guest';

// The no-login preference centre: spec §5 endpoints 3, 4, 5 and 7, and the ONLY route a guest has to
// any of them. Every dispatched newsletter's footer carries a per-recipient link to this path, and
// until this page existed that link landed on a 404 — which meant a person could be marketed to and
// had no door at all to inspect what was held on them, narrow it, or ask for it to be erased. That is
// GDPR art. 15 and art. 17 intake with no intake.
//
// THE PATH IS NOT OURS TO CHOOSE. `GrowthSettings.PreferenceCentreBaseUrl` defaults to
// `https://okam.no/preferences/communications` and appends `#token=…`.
//
// THE LINK IS SINGLE-USE AND THE SESSION IS SHORT. Opening it CLAIMS the token
// (`ExecuteUpdateAsync … WHERE UsedAt IS NULL`), so the same URL will not open a second session even
// a second later, and the session it mints lasts 30 minutes. Both are deliberate; both are told to
// the guest, because a person who loses a session mid-erasure and finds their link dead needs to know
// that the newest message in their inbox carries a fresh one rather than concluding they have been
// locked out of their own rights.
//
// ⚠ THE SESSION COOKIE CANNOT REACH THE API AS THIS APP IS DEPLOYED TODAY. It is HttpOnly + Secure +
// SameSite=Strict on the API origin, and this app's `API_BASE_URL` is a different SITE
// (`okamapi.azurewebsites.net` vs `okam.no`), while `Program.cs` builds CORS with `AllowAnyOrigin()`,
// which a browser refuses to combine with credentials. Endpoints 4/5/7 will therefore answer 401
// `growth.session_invalid` until the API is served same-site or the policy names this origin with
// `AllowCredentials`. The page is written to the contract and renders that 401 as what it is (see the
// `session-dead` branch) rather than as a page that silently does nothing — the seam is in
// `~/utils/growth/growth-guest-client`.
export default {
  name: 'GrowthGuestPreferencesPage',
  components: { GuestShell },
  layout: 'empty',
  data () {
    return {
      locale: 'no',
      token: null,
      opening: true,
      showLoading: false,
      loadingTimer: null,
      busy: false,
      csrf: null,
      scope: null,
      state: null,
      status: GROWTH_UNKNOWN,
      detail: null,
      refusal: null,
      wanted: null,
      stopped: false,
      erasureAsked: false,
      accessFiled: null,
      erasureFiled: null
    };
  },
  computed: {
    open () {
      return !!(this.scope && this.state);
    },
    standingNow () {
      return standing(this.state);
    },
    // A channel or purpose outside the v1 enum is printed VERBATIM rather than mapped to a sentence
    // this page invented for it. The guest can then quote the value back to the venue, which is more
    // use to them than a confident label that is wrong.
    channelLabel () {
      const channel = this.scope && this.scope.channel;
      return channel === CHANNEL_EMAIL ? this.t('gr_guest_channel_email') : (channel || '–');
    },
    purposeLabel () {
      const purpose = this.scope && this.scope.purpose;
      return purpose === PURPOSE_NEWSLETTER ? this.t('gr_guest_purpose_newsletter') : (purpose || '–');
    },
    receivingNow () {
      return receiving(this.state);
    },
    // True only after a request to resume that the server did not honour — never as a standing
    // warning, which would read as an accusation on a page a guest opened to change one setting.
    blocked () {
      return reconsentBlocked(this.wanted, this.state);
    },
    tokenDead () {
      return this.status === GROWTH_TOKEN_DEAD;
    },
    sessionDead () {
      return this.status === GROWTH_SESSION_DEAD;
    },
    noToken () {
      return this.status === GROWTH_NO_TOKEN;
    },
    refusalSentence () {
      return growthRefusalKey(this.refusal && this.refusal.code);
    }
  },
  created () {
    this._service = new GrowthGuestService();
  },
  mounted () {
    this.locale = guestLocale(this.$i18n && this.$i18n.locale);
    this.token = this.readToken();
    if (!this.token) {
      this.opening = false;
      this.status = GROWTH_NO_TOKEN;
      return;
    }
    this.openSession();
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
    instant (value) {
      return formatDeadline(value, this.locale) || '–';
    },

    /**
     * Reads the token from the fragment and strips it from the address bar.
     *
     * It matters more here than on the confirm page: this credential opens a session that can file an
     * ERASURE, so leaving it in a URL a guest might copy into a message to the venue would be handing
     * that capability to whoever reads the message. It is also read once and then discarded — the
     * session, not the token, is what the rest of the page uses.
     */
    readToken () {
      if (typeof window === 'undefined' || !window.location) { return null; }
      const token = tokenFromUrl(window.location.hash, window.location.search);
      if (token && window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      return token;
    },

    async openSession () {
      this.opening = true;
      this.startLoadingLadder();
      try {
        const issue = await this._service.OpenPreferenceSession(this.token);
        this.csrf = issue.csrfToken;
        this.scope = issue;
        // The token is spent. Dropping it makes it impossible for any later code path to replay it,
        // and there is nothing to replay it for: a second open would be a 410.
        this.token = null;
        this.state = await this._service.GetPreferences(this.csrf);
      } catch (e) {
        this.scope = null;
        this.state = null;
        this.status = isGrowthApiError(e) ? growthState(e) : GROWTH_UNKNOWN;
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
      this.opening = false;
    },

    /**
     * Endpoint 5. `channel` and `purpose` come from the session's own scope and are never chosen
     * here: the session cannot widen its scope, and a mismatch is a typed 403 rather than a silent
     * no-op, so echoing the scope back is the only correct call.
     *
     * The RESPONSE is what gets rendered, never `consented`. That is the whole reason `wanted` is
     * kept separately: comparing what was asked for against what came back is how the page can tell
     * the guest that a resume did not take.
     */
    async setConsent (consented) {
      if (this.busy || !this.open) { return; }

      this.busy = true;
      this.refusal = null;
      this.wanted = consented;
      this.stopped = false;
      try {
        this.state = await this._service.UpdatePreference(
          this.csrf, this.scope.channel, this.scope.purpose, consented);
        this.stopped = consented === false && !receiving(this.state);
      } catch (e) {
        this.handleFailure(e);
      } finally {
        this.busy = false;
      }
    },

    /** Endpoint 7, art. 15. Idempotent server-side: a second press returns the SAME open request. */
    async fileAccess () {
      if (this.busy || !this.open) { return; }

      this.busy = true;
      this.refusal = null;
      try {
        this.accessFiled = await this._service.FilePrivacyRequest(this.csrf, PRIVACY_ACCESS);
      } catch (e) {
        this.handleFailure(e);
      } finally {
        this.busy = false;
      }
    },

    /**
     * Endpoint 7, art. 17. Filing writes a channel-global suppression immediately; the destruction
     * itself is a later, human step the venue performs, and may be deferred further while another
     * venue holds live consent on the same contact point. The page re-reads the preference state
     * afterwards so the standing it shows is the suppressed one the server now holds, rather than the
     * one it was showing a moment ago.
     */
    async fileErasure () {
      if (this.busy || !this.open) { return; }

      this.busy = true;
      this.refusal = null;
      try {
        this.erasureFiled = await this._service.FilePrivacyRequest(this.csrf, PRIVACY_ERASURE);
        this.erasureAsked = false;
        this.wanted = null;
        this.stopped = false;
        this.state = await this._service.GetPreferences(this.csrf);
      } catch (e) {
        this.handleFailure(e);
      } finally {
        this.busy = false;
      }
    },

    // A 401 mid-session is not one control failing, it is the session being over — so it replaces the
    // page rather than appearing as a red box under a form the guest can no longer use.
    handleFailure (e) {
      if (isGrowthApiError(e) && growthState(e) === GROWTH_SESSION_DEAD) {
        this.scope = null;
        this.state = null;
        this.status = GROWTH_SESSION_DEAD;
        this.detail = e.message || null;
        return;
      }
      this.refusal = isGrowthApiError(e) ? e : { code: null, message: (e && e.message) || null };
    }
  },
  head () {
    return guestHead(translate(this.locale, 'gr_guest_prefs_meta_title'));
  }
};
</script>

<style scoped>
/* This page's own: the controls are stacked and full width so the leave control is never the smaller
   of the two. Everything else is `assets/sass/_guest-surface`. */
.gg-card .gg-btn { margin-top: 16px; }
.gg-row .gg-btn { margin-top: 0; }
</style>

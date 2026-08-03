<template>
  <div class="wj-shell">
    <div class="wj-paper">
      <header class="wj-top">
        <p class="wj-eyebrow">
          {{ t('wfjoin_eyebrow') }}
        </p>
        <nav class="wj-langs" :aria-label="t('wfjoin_lang_label')">
          <button
            v-for="option in locales"
            :key="option"
            type="button"
            class="wj-lang"
            :class="{ 'wj-lang--on': option === locale }"
            :aria-pressed="String(option === locale)"
            @click="setLocale(option)"
          >
            {{ t('wfjoin_lang_' + option) }}
          </button>
        </nav>
      </header>

      <main class="wj-body">
        <!-- ---- the engagement this visit created --------------------------------------------------
             First, outside every other state, and nothing below can wipe it. A claim CONSUMES the
             invitation: if this receipt vanished behind a later failure the worker would have no
             evidence they are in and a code that can never be used again. -->
        <section v-if="claimed" class="wj-card wj-card--good" data-test="claimed">
          <h1 class="wj-title">
            {{ t('wfjoin_done_title') }}
          </h1>
          <p class="wj-lede">
            {{ t('wfjoin_done_body') }}
          </p>

          <!-- WHAT A CLAIM DID NOT DO, said here because the opposite is the natural assumption. The
               response's capability list is the engagement's PRE-EXISTING grants; claiming never adds
               one (spec §3.1, no self-escalation). So a worker whose engagement carries no
               `WorkforceSelf` is genuinely linked and still cannot use the worker page — and they
               must be told that by this screen rather than discover it as an empty page. -->
          <dl class="wj-facts">
            <div>
              <dt>{{ t('wfjoin_field_store') }}</dt>
              <dd>{{ claimed.storeId || dash }}</dd>
            </div>
            <div>
              <dt>{{ t('wfjoin_field_grants') }}</dt>
              <dd data-test="claimed-grants">
                {{ grantsLabel }}
              </dd>
            </div>
          </dl>

          <p v-if="!hasSelfService" class="wj-note wj-note--warn" data-test="no-selfservice">
            {{ t('wfjoin_done_no_selfservice') }}
          </p>

          <a v-else class="wj-btn wj-btn--primary" href="/admin/workforce-me" data-test="go-to-my-shifts">
            {{ t('wfjoin_done_go') }}
          </a>
        </section>

        <!-- ---- a refusal --------------------------------------------------------------------------
             Heading, body, then the platform's own words if it sent any that add something. Never a
             bare apology: every entry ends in something the reader can do or somebody they can ask. -->
        <section v-if="refused" class="wj-card wj-card--bad" data-test="refusal">
          <h2 class="wj-heading">
            {{ t(refused.heading) }}
          </h2>
          <p class="wj-lede">
            {{ t(refused.body) }}
          </p>
          <p v-if="refusedDetail" class="wj-detail" data-test="refusal-detail">
            {{ t('wfjoin_platform_words', { detail: refusedDetail }) }}
          </p>

          <!-- ALREADY IN? The opaque refusal cannot distinguish "wrong code" from "a code you
               yourself already used", so the page does not guess — it shows what it CAN read: the
               engagements this account actually holds. A reader who was simply claiming twice
               recognises their own store here and stops worrying; a reader with a genuinely bad code
               sees an empty list and knows to ask. Stated as evidence, never as a diagnosis of which
               of the five causes applied. -->
          <div v-if="showExisting" class="wj-note wj-note--info" data-test="existing-access">
            <strong>{{ t('wfjoin_existing_title') }}</strong>
            <p>{{ t('wfjoin_existing_body', { count: existingMemberships.length }) }}</p>
            <a class="wj-inline-link" href="/admin/workforce-me">{{ t('wfjoin_done_go') }}</a>
          </div>

          <button
            v-if="refused.action === CLAIM_ACTION_SIGN_IN"
            type="button"
            class="wj-btn wj-btn--ghost"
            data-test="refusal-sign-in"
            @click="openLogin"
          >
            {{ t('wfjoin_signin_button') }}
          </button>
          <button
            v-else-if="refused.action === CLAIM_ACTION_RETRY || refused.action === CLAIM_ACTION_RETRY_FRESH"
            type="button"
            class="wj-btn wj-btn--ghost"
            :disabled="busy"
            data-test="refusal-retry"
            @click="retry"
          >
            {{ t('wfjoin_retry') }}
          </button>
        </section>

        <!-- ---- no code yet -----------------------------------------------------------------------
             The primary way in, not a fallback. The roster panel copies a BARE code to the clipboard
             and names this address separately, so what actually reaches the worker is a string in a
             message — and a paste field is the shape of the thing they were handed. -->
        <section v-if="ready && !token && !claimed" class="wj-card" data-test="paste">
          <h1 class="wj-title">
            {{ t('wfjoin_paste_title') }}
          </h1>
          <p class="wj-lede">
            {{ t('wfjoin_paste_intro') }}
          </p>

          <form class="wj-form" novalidate @submit.prevent="acceptPastedCode">
            <label class="wj-field">
              <span>{{ t('wfjoin_paste_label') }}</span>
              <input
                v-model="pasted"
                type="text"
                inputmode="text"
                autocomplete="off"
                autocapitalize="off"
                autocorrect="off"
                spellcheck="false"
                :placeholder="t('wfjoin_paste_placeholder')"
                data-test="code-input"
              >
            </label>
            <p v-if="showPasteProblem" class="wj-note wj-note--warn" data-test="paste-empty">
              {{ t('wfjoin_paste_empty') }}
            </p>
            <button type="submit" class="wj-btn wj-btn--primary" data-test="code-submit">
              {{ t('wfjoin_paste_button') }}
            </button>
          </form>

          <p class="wj-quiet">
            {{ t('wfjoin_paste_help') }}
          </p>
        </section>

        <!-- ---- code held, nobody signed in -------------------------------------------------------
             `WorkforceMeController` carries a class-level `[Authorize]` and endpoint 32 does not opt
             out, so there is no anonymous preview to offer and this screen does not pretend there is.
             THERE IS NO PREVIEW AT ALL, in fact — unlike Meals, this module binds no
             invitation-session route, so nothing can be shown about the code before it is spent. The
             page says that rather than implying it merely has not loaded yet. -->
        <section v-else-if="ready && token && !signedIn && !claimed" class="wj-card" data-test="sign-in">
          <h1 class="wj-title">
            {{ t('wfjoin_signin_title') }}
          </h1>
          <p class="wj-lede">
            {{ t('wfjoin_signin_body') }}
          </p>
          <p class="wj-quiet">
            {{ t('wfjoin_signin_kept') }}
          </p>
          <button type="button" class="wj-btn wj-btn--primary" data-test="sign-in-button" @click="openLogin">
            {{ t('wfjoin_signin_button') }}
          </button>
        </section>

        <!-- ---- code held, signed in ---------------------------------------------------------------
             The one command this page issues, and everything it will do, said before it is pressed.
             Kept on screen after a retryable refusal rather than replaced by it. -->
        <!-- Withheld once a refusal is on screen, and the two reasons are different. A FINAL refusal
             (wrong / spent / expired / revoked / another login's) will be refused identically for
             ever, so a button standing there is a control that does nothing — which teaches the
             reader that this page's buttons do not mean anything, and spends the credibility the
             refusals that DO require action depend on. A RETRYABLE refusal already carries its own
             retry inside the refusal card, so a second button here would be two controls for one
             act. The escape hatch below (`other-code`) is what remains in the final case, and it is
             the only thing that can still help. -->
        <section v-else-if="canClaim" class="wj-card" data-test="confirm">
          <h1 class="wj-title">
            {{ t('wfjoin_confirm_title') }}
          </h1>
          <p class="wj-lede">
            {{ t('wfjoin_confirm_body') }}
          </p>

          <!-- WHAT THIS PAGE CANNOT TELL THEM, said on the page rather than left as an absence.
               Endpoint 32 is write-only: no route resolves a token into a store name, a role or an
               expiry, so this screen genuinely does not know which venue is on the other end of the
               string in its memory. A claim screen that quietly omitted that would read as "there is
               nothing more to know"; naming the gap is the difference between a page that does not
               know and a page that implies. -->
          <div class="wj-note wj-note--info" data-test="unknowns">
            <strong>{{ t('wfjoin_unknowns_title') }}</strong>
            <p>{{ t('wfjoin_unknowns_body') }}</p>
          </div>

          <button
            type="button"
            class="wj-btn wj-btn--primary"
            :disabled="busy"
            data-test="claim-button"
            @click="claim"
          >
            {{ busy ? t('wfjoin_button_busy') : t('wfjoin_button') }}
          </button>
        </section>

        <!-- Nothing at all under 300ms; a spinner that shows for one frame reads as a fault. -->
        <div v-else-if="working" class="wj-card wj-card--quiet" :aria-busy="String(showWorking)">
          <p v-if="showWorking" class="wj-quiet">
            {{ t('wfjoin_working') }}
          </p>
        </div>
      </main>

      <!-- A held code that has been refused for good. The refusal card above is the whole answer; the
           only remaining thing this page can do for them is take a different code. Outside the chain
           above so it is offered whichever state the refusal happened in. -->
      <section v-if="canTryAnotherCode" class="wj-card wj-card--quiet" data-test="other-code">
        <button type="button" class="wj-btn wj-btn--ghost" data-test="other-code-button" @click="forgetCode">
          {{ t('wfjoin_other_code') }}
        </button>
      </section>

      <footer class="wj-foot">
        <p class="wj-note-line">
          {{ t('wfjoin_private_note') }}
        </p>
        <p class="wj-note-line">
          {{ t('wfjoin_footer_help') }}
        </p>
        <p class="wj-mark">
          {{ t('wfjoin_footer_mark') }}
        </p>
      </footer>
    </div>

    <LoginModal
      v-if="showLogin"
      :subtitle="t('wfjoin_login_subtitle')"
      @close="closeLogin"
    />
  </div>
</template>

<script>
import LoginModal from '~/components/molecules/LoginModal.vue';
import { WorkforceMeService } from '~/utils/workforce-me/me-client';
import { hasCapability, CAPABILITY_SELF } from '~/utils/workforce-me/memberships';
import {
  invitationRefusal,
  claimProblemDetail,
  isRetryable,
  CLAIM_ACTION_SIGN_IN,
  CLAIM_ACTION_RETRY,
  CLAIM_ACTION_RETRY_FRESH
} from '~/utils/workforce-me/invitation-claim';
import { translate } from '~/utils/i18n';
import { newGuid } from '~/utils/guid';

const LOCALES = ['no', 'en', 'de'];

// The `#` payload is accepted both bare and as `token=…`, because a person hand-building this link
// will write whichever they expect to work and neither is wrong.
const FRAGMENT_TOKEN = /^(?:token=)?(.+)$/;

/**
 * Where an invited worker turns a code into an engagement.
 *
 * ---- WHY THIS PAGE HAD TO EXIST AT ALL --------------------------------------------------------
 *
 * `POST /staff` creates a WorkforcePerson with no `ApplicationUserId`, and endpoint 32 is the ONLY
 * route in the module that ever sets one. Until this page existed the entire `/workforce/me` surface
 * — own shifts, availability, time off, publication acknowledgements, open-shift claims — was
 * reachable only by hand-crafting an HTTP request, because nothing in the estate could turn a token
 * into a session. A manager could build a roster of people who could never sign in.
 *
 * ---- WHY THE ROUTE IS `/workforce/join` AND NOT UNDER `/admin` --------------------------------
 *
 * The claimant is a barista, a dishwasher, a driver. They administer no store, they hold no
 * engagement yet, and endpoint 32 resolves NO store-scoped authority and takes no store id — the
 * backend authorises it purely as "the authenticated person holding this token". Neither pattern this
 * repo already has fits:
 *
 *   • `AdminPage` (even with `allow-non-admin`, as `/admin/workforce-me` uses) wraps the reader in
 *     operator chrome — sidebar, store switcher — for stores they do not administer, and its
 *     anonymous path redirects to `/admin?redirect=<fullPath>`. `fullPath` includes the hash, so that
 *     redirect would copy the credential into a QUERY STRING, which is exactly where it must never
 *     be. The membership guard is not the problem; the redirect is.
 *   • The Events guest pages bypass authentication entirely, which this page cannot do:
 *     `WorkforceMeController` carries a class-level `[Authorize]` and endpoint 32 does not opt out.
 *
 * It is therefore the same THIRD shape `pages/meals/join.vue` established: a public route with no
 * shell that authenticates itself in place. `layout: 'empty'` keeps the marketing chrome off and
 * `LoginModal` is mounted BY this page rather than reached by navigating — which is also what makes
 * the token survive signing in (below).
 *
 * ---- WHY THE TOKEN RIDES THE FRAGMENT ---------------------------------------------------------
 *
 * A fragment is the only part of a URL that is never sent to a server — not in the request line, not
 * in `Referer` — so it stays out of access logs and out of any host this page links to. It is read
 * once in `mounted` and immediately scrubbed with `history.replaceState`, so a screenshot, a shared
 * screen or a back button does not carry the credential. It is then held in component memory and
 * NOWHERE else: not in `sessionStorage`, not in the Vuex store (which persists itself to
 * `localStorage`), not in the route. There is no round trip to survive — signing in mounts a modal
 * inside this page, so no navigation happens and component state is simply still there afterwards.
 *
 * NOTHING IN THE ESTATE MINTS SUCH A LINK, deliberately: the roster panel copies the bare code and
 * names this page's address separately, so the credential and the destination travel as two things.
 * The fragment reader is not dead code for that — it is the defence for the case that actually
 * happens, a manager pasting `…/workforce/join#wfinv_…` into a message themselves. Without it that
 * token would be silently ignored and the worker stuck; with it the token is taken and the address
 * bar is cleaned within the same tick.
 *
 * ---- WHY A REPEAT CLAIM IS A REPLAY RATHER THAN AN ERROR --------------------------------------
 *
 * The invitation is one-use, so the second claim of a token is `workforce.invitation-invalid` — which
 * is the SAME answer as a code that never existed. Left alone, a worker who lost the response on a
 * flaky connection and pressed again would be told their own success does not exist.
 *
 * Two things prevent that, and they cover different failures. Within a visit, the idempotency key is
 * minted once per (code, account) and REUSED, so a second press replays the first command
 * server-side and returns the engagement it created (claim idempotency is scoped per user, so no
 * other caller's key can alias it). Across visits — a closed tab, a second device — the key is gone,
 * so the refusal is genuine; the page then reads the caller's OWN memberships and shows them, which
 * is the only honest way to answer "have I already done this?" without asking the server a question
 * whose answer is deliberately opaque.
 */
export default {
  name: 'WorkforceJoinPage',
  components: { LoginModal },
  layout: 'empty',
  data () {
    return {
      // False until `mounted` has read the fragment. The first server render and the first client
      // render therefore produce the same markup, so there is no hydration mismatch to repair.
      ready: false,
      locale: 'no',
      token: '',
      pasted: '',
      showPasteProblem: false,
      showLogin: false,
      working: false,
      showWorking: false,
      workingTimer: null,
      busy: false,
      claimed: null,
      refused: null,
      refusedDetail: null,
      // The engagements this ACCOUNT already holds, read only after a refusal. Null means not asked
      // or the read failed — never rendered as "you have none", which is a different claim.
      existingMemberships: null,
      // The idempotency key for this visit's ONE claim, together with the (code, account) pair it was
      // minted for. Re-minted when either half changes, so signing in as somebody else does not
      // resubmit under the previous account's key.
      claimKey: null,
      claimKeyFor: null,
      dash: '—',
      CLAIM_ACTION_SIGN_IN,
      CLAIM_ACTION_RETRY,
      CLAIM_ACTION_RETRY_FRESH
    };
  },
  computed: {
    locales () {
      return LOCALES;
    },
    signedIn () {
      return !!(this.$store && this.$store.getters && this.$store.getters.userIsLoggedIn);
    },
    userId () {
      const user = this.$store && this.$store.state ? this.$store.state.currentUser : null;
      return (user && user.id) || null;
    },
    /**
     * Whether the claim linked an engagement the worker can actually SELF-SERVE on.
     *
     * A claim never widens capability — the response carries the engagement's pre-existing grants —
     * so an engagement created without `WorkforceSelf` produces a linked login that the worker page
     * will greet with an empty screen. Telling them here, on the receipt, is the difference between
     * "you are in, ask your manager for access to your shifts" and a page that appears broken.
     */
    hasSelfService () {
      return hasCapability(this.claimed && this.claimed.capabilities, CAPABILITY_SELF);
    },
    grantsLabel () {
      const grants = this.claimed && this.claimed.capabilities;
      if (grants === null || grants === undefined) { return this.dash; }
      const list = Array.isArray(grants) ? grants : String(grants).split(',');
      const named = list.map(g => String(g).trim()).filter(g => g && g !== 'None');
      return named.length ? named.join(', ') : this.t('wfjoin_grants_none');
    },
    /**
     * Whether the claim button is worth offering.
     *
     * A refusal that is not retryable is FINAL for this code — wrong, spent, expired, revoked, or
     * bound to another login — and the server will refuse the identical command again, for ever.
     * The button is therefore withheld rather than left standing and disabled-looking: an affordance
     * that cannot succeed is worse than no affordance, because the reader spends a press learning
     * that this page's controls are decorative.
     *
     * The FIRST browser run of this page got this wrong. The confirm card was keyed only on "signed
     * in and holding a code", so after a spent-code refusal the screenshot showed a live green
     * "Løs inn koden" under a red card explaining the code no longer works. `pages/meals/join.vue`
     * has always had this guard; this page was written from it and dropped it, and only opening the
     * page found that out.
     */
    canClaim () {
      if (!this.ready || !this.token || !this.signedIn || this.claimed) { return false; }
      return !this.refused || isRetryable(this.refused);
    },
    /** Shown only when the account demonstrably holds something — never as "you have none". */
    showExisting () {
      return !!(this.existingMemberships && this.existingMemberships.length);
    },
    /**
     * The client, built FRESH on every access — never cached in `created()`.
     *
     * `_coreInitializer` (plugins/global-mixin.js) is a computed that returns a NEW plain object
     * carrying `bearerToken` read out of the Vuex store. A service constructed once at `created()`
     * therefore holds a SNAPSHOT of whatever the token was then, and on this page that is the empty
     * string: the whole point of this screen is that the reader is not signed in when it mounts.
     * Signing in later replaces the store's user, the computed recomputes — and a cached service
     * goes on sending the anonymous initializer it captured, so every call 401s.
     *
     * That is not hypothetical. This page was written against `pages/meals/join.vue`, which caches
     * its service in `created()`, and the first browser run of this journey failed with
     * `POST /workforce/me/invitations/claim -> 401` for exactly this reason. Every admin page in the
     * repo already builds its workforce service as a computed for the same reason; this one now
     * matches them rather than the page it was modelled on.
     */
    _workforceMeService () {
      return new WorkforceMeService(this._coreInitializer);
    },
    /** The escape hatch, offered exactly when this code is spent and pressing again cannot help. */
    canTryAnotherCode () {
      return this.ready && !!this.token && !this.claimed && !this.working && !this.busy &&
        !!this.refused &&
        this.refused.action !== CLAIM_ACTION_RETRY &&
        this.refused.action !== CLAIM_ACTION_RETRY_FRESH &&
        this.refused.action !== CLAIM_ACTION_SIGN_IN;
    }
  },
  mounted () {
    this.locale = LOCALES.includes(this.$i18n && this.$i18n.locale) ? this.$i18n.locale : 'no';

    const fromLink = this.readFragment();
    if (fromLink) { this.token = fromLink; }
    this.ready = true;
  },
  beforeDestroy () {
    this.stopWorking();
  },
  methods: {
    t (key, params) {
      return translate(this.locale, key, params);
    },
    setLocale (locale) {
      if (LOCALES.includes(locale)) { this.locale = locale; }
    },

    /**
     * Take the code out of the address bar and put it back without one.
     *
     * `replaceState` rather than `$router.replace`: vue-router would push the scrubbed URL through
     * the SPA history, and the entry it replaces is the one the browser has already recorded. The
     * native call rewrites that entry in place, which is what keeps the credential out of the back
     * stack and out of any screenshot taken a moment later.
     */
    readFragment () {
      if (typeof window === 'undefined' || !window.location) { return null; }

      const raw = String(window.location.hash || '').replace(/^#/, '').trim();
      if (!raw) { return null; }

      const match = FRAGMENT_TOKEN.exec(raw);
      const token = match ? decodeURIComponent(match[1]).trim() : '';
      if (!token) { return null; }

      if (window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      return token;
    },

    acceptPastedCode () {
      const code = this.pasted.trim();
      if (!code) { this.showPasteProblem = true; return; }

      this.showPasteProblem = false;
      this.token = code;
      // Cleared from the field as well as taken into memory: an input still holding the code would
      // put it back on screen behind every later state, and a shared phone keeps its form values.
      this.pasted = '';
      this.clearOutcome();
    },

    forgetCode () {
      this.token = '';
      this.clearOutcome();
    },

    openLogin () {
      this.showLogin = true;
    },

    /**
     * The modal closes; the page decides what that meant.
     *
     * Nothing navigates and nothing is stored, so the code is simply still in `this.token`. The
     * previous account's refusal and membership list are dropped whichever way this went: a refusal
     * earned by one account must never be left on screen next to another account's name.
     */
    closeLogin () {
      this.showLogin = false;
      this.clearOutcome();
    },

    clearOutcome () {
      this.refused = null;
      this.refusedDetail = null;
      this.existingMemberships = null;
    },

    refuse (error) {
      this.refused = invitationRefusal(error);
      this.refusedDetail = claimProblemDetail(error);
    },

    startWorking () {
      this.working = true;
      this.stopTimer();
      this.showWorking = false;
      this.workingTimer = setTimeout(() => { this.showWorking = true; }, 300);
    },

    stopWorking () {
      this.stopTimer();
      this.showWorking = false;
      this.working = false;
    },

    stopTimer () {
      if (this.workingTimer) { clearTimeout(this.workingTimer); }
      this.workingTimer = null;
    },

    /**
     * #32. The one command this page issues.
     *
     * The key is minted per (code, account) and reused, so pressing the button again after a response
     * that never arrived REPLAYS that command rather than issuing a second one against an invitation
     * the first attempt already consumed.
     */
    async claim () {
      if (this.busy || !this.canClaim) { return; }

      const scope = this.token + '|' + (this.userId || '');
      if (this.claimKeyFor !== scope) {
        this.claimKey = newGuid();
        this.claimKeyFor = scope;
      }

      this.busy = true;
      this.clearOutcome();
      try {
        this.claimed = await this._workforceMeService.ClaimInvitation(this.token, this.claimKey);
      } catch (e) {
        // `claim-link-conflict` and `invitation-issue-conflict` both say so explicitly: the
        // reservation under this key stays Reserved for ever, so a retry MUST carry a fresh one.
        // Dropping the scope is what makes the retry the refusal offers able to succeed at all.
        if (e && e.code === 'workforce.claim-link-conflict') { this.claimKeyFor = null; }
        this.refuse(e);
        await this.readOwnAccess();
      } finally {
        this.busy = false;
      }
    },

    /**
     * After a refusal only: what engagements does this ACCOUNT actually hold?
     *
     * The refusal itself is deliberately opaque and cannot be interrogated — asking the server "was
     * that my own second claim?" is precisely the question the anti-oracle exists to refuse. This
     * asks a question the caller IS entitled to have answered, about themselves, and shows the
     * answer beside the refusal so a repeat claimant can recognise their own situation. A failed read
     * leaves the list null and nothing is shown; it must never render as "you have none".
     */
    async readOwnAccess () {
      if (!this.signedIn) { return; }
      try {
        const memberships = await this._workforceMeService.GetMemberships();
        this.existingMemberships = Array.isArray(memberships) ? memberships : null;
      } catch (e) {
        this.existingMemberships = null;
      }
    },

    /** Only the refusals whose command may never have landed, or which the server said to repeat. */
    retry () {
      if (this.busy) { return; }
      this.claim();
    }
  },
  head () {
    return {
      title: translate(this.locale, 'wfjoin_meta_title'),
      // A page reached with a bearer credential in its fragment must never be indexed. `robots.txt`
      // cannot express this usefully, so the page declares it — the same reason the Events and Meals
      // guest pages do.
      meta: [{ hid: 'robots', name: 'robots', content: 'noindex, nofollow' }]
    };
  }
};
</script>

<style scoped>
/* Deliberately the visual language of the Meals and Events guest pages rather than the admin design
   system: the reader is the same kind of person in the same kind of moment — a phone, a message, one
   decision. The styles are local rather than imported, for the same reason `pages/meals/join.vue`
   keeps its own: the shared guest shell carries module-specific copy that a workforce page must not
   borrow. */
.wj-shell {
  min-height: 100vh;
  background: #f4f6f8;
  padding: 32px 20px 56px;
  display: flex;
  justify-content: center;
  color: #292c34;
  font-size: 16px;
  line-height: 1.45;
}

.wj-paper {
  width: 100%;
  max-width: 660px;
}

.wj-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.wj-eyebrow {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #64748b;
}

.wj-langs {
  display: flex;
  gap: 4px;
}

.wj-lang {
  min-height: 44px;
  min-width: 48px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  font: inherit;
  font-size: 14.5px;
  color: #64748b;
  cursor: pointer;
}

.wj-lang--on {
  background: #fff;
  border-color: #e2e8f0;
  color: #292c34;
  font-weight: 600;
}

.wj-card {
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  margin-bottom: 20px;
  box-shadow: 0 1px 2px rgba(41, 44, 52, 0.04), 0 8px 24px rgba(41, 44, 52, 0.06);
}

.wj-card--quiet { min-height: 96px; }
.wj-card--good { background: #f0fdf4; border: 1px solid #bbf7d0; box-shadow: none; }
.wj-card--bad { background: #fef2f2; border: 1px solid #fecaca; box-shadow: none; }

.wj-title {
  margin: 0 0 12px;
  font-size: 30px;
  line-height: 1.15;
  font-weight: 600;
  color: #292c34;
}

.wj-heading {
  margin: 0 0 12px;
  font-size: 20px;
  font-weight: 600;
  color: #292c34;
}

.wj-lede { margin: 0 0 12px; font-size: 16px; color: #292c34; }
.wj-quiet { margin: 12px 0 0; font-size: 14.5px; color: #64748b; }
.wj-detail { margin: 8px 0 0; font-size: 14.5px; color: #64748b; }

.wj-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 20px;
  margin: 20px 0 0;
}

.wj-facts dt {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.wj-facts dd { margin: 6px 0 0; font-size: 16px; color: #292c34; }

.wj-note { margin: 20px 0 0; padding: 16px 20px; border-radius: 12px; font-size: 15px; }
.wj-note--info { background: #eff6ff; color: #1e3a8a; }
.wj-note--warn { background: #fff7ed; color: #92400e; }
.wj-note p { margin: 6px 0 0; }

.wj-inline-link { display: inline-block; margin-top: 8px; color: #1e3a8a; font-weight: 600; }

.wj-form { margin-top: 20px; }
.wj-field { display: block; margin-bottom: 20px; }

.wj-field span {
  display: block;
  margin-bottom: 8px;
  font-size: 14.5px;
  font-weight: 600;
  color: #292c34;
}

.wj-field input {
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  font: inherit;
  /* 16px keeps iOS Safari from zooming the viewport when the field takes focus — this page is read
     on a phone more often than not. */
  font-size: 16px;
  color: #292c34;
  box-sizing: border-box;
  transition: border-color 180ms cubic-bezier(0.16, 0.84, 0.34, 1);
}

.wj-field input:focus {
  outline: none;
  border-color: #1bb776;
  box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.18);
}

.wj-btn {
  display: inline-block;
  min-height: 52px;
  padding: 14px 24px;
  margin-top: 20px;
  border-radius: 12px;
  border: 1px solid transparent;
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 180ms cubic-bezier(0.16, 0.84, 0.34, 1), transform 180ms cubic-bezier(0.16, 0.84, 0.34, 1);
}

.wj-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.wj-btn:not(:disabled):active { transform: translateY(1px); }

.wj-btn--primary {
  width: 100%;
  min-height: 64px;
  padding: 20px 24px;
  background: #1bb776;
  color: #fff;
  box-sizing: border-box;
}

.wj-btn--primary:not(:disabled):hover { background: #159f63; }
.wj-btn--ghost { background: #fff; border-color: #cbd5e1; color: #292c34; }
.wj-btn--ghost:not(:disabled):hover { background: #f4f6f8; }

.wj-foot { padding: 4px 4px 0; }
.wj-note-line { margin: 0 0 8px; font-size: 13.5px; color: #64748b; }

.wj-mark {
  margin: 16px 0 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

@media (max-width: 560px) {
  .wj-card { padding: 24px; }
  .wj-title { font-size: 26px; }
}

@media (prefers-reduced-motion: reduce) {
  .wj-btn,
  .wj-field input { transition: none; }
}
</style>

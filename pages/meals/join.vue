<template>
  <div class="mj-shell">
    <div class="mj-paper">
      <header class="mj-top">
        <p class="mj-eyebrow">
          {{ t('meals_claim_eyebrow') }}
        </p>
        <nav class="mj-langs" :aria-label="t('meals_claim_lang_label')">
          <button
            v-for="option in locales"
            :key="option"
            type="button"
            class="mj-lang"
            :class="{ 'mj-lang--on': option === locale }"
            :aria-pressed="String(option === locale)"
            @click="setLocale(option)"
          >
            {{ t('meals_claim_lang_' + option) }}
          </button>
        </nav>
      </header>

      <main class="mj-body">
        <!-- ---- the membership this visit created ------------------------------------------------
             First, outside every other state, and nothing below can wipe it. A claim consumes the
             invitation: if this receipt disappeared behind a later failure the employee would have
             no evidence they are a member and a code that can never be used again. -->
        <section v-if="claimed" class="mj-card mj-card--good" data-test="claimed">
          <h1 class="mj-title">
            {{ claimedTitle }}
          </h1>
          <p class="mj-lede">
            {{ t('meals_claim_done_body', { role: claimedRoleLabel }) }}
          </p>
          <p class="mj-lede">
            {{ t('meals_claim_done_next') }}
          </p>

          <!-- LEDGER ENTRY MIG-17, from the claimant's side.
               `MealsMembership.EmployeeReference` does not exist, so `MealsStatementService` writes
               `MemberDisplayRef = MembershipId.ToString()` and this person appears on every line of
               their employer's monthly bill as a bare identifier, permanently.

               THE DECISION (argued in the block comment on this component): they are told AFTER the
               claim and never before, and the disclosure is the reference itself rather than the
               defect. Before the claim it would be an unactionable alarm — the reference can only be
               captured at invitation, the invitation is already issued, and refusing to claim would
               cost them the benefit while fixing nothing. Afterwards it is the one thing that is
               genuinely theirs and genuinely useful: the string their employer's statements will
               name them by if they ever have to query a line. -->
          <dl class="mj-facts">
            <div>
              <dt>{{ t('meals_claim_ref_label') }}</dt>
              <dd class="mj-ref">
                {{ claimed.membershipId || dash }}
              </dd>
            </div>
          </dl>
          <p class="mj-quiet">
            {{ t('meals_claim_ref_body') }}
          </p>
        </section>

        <!-- ---- a refusal ------------------------------------------------------------------------
             Heading, body, then the platform's own words if it sent any. Never a bare apology: the
             body of every entry ends in something the reader can do or somebody they can ask. -->
        <section v-if="refused" class="mj-card mj-card--bad" data-test="refusal">
          <h2 class="mj-heading">
            {{ t(refused.heading) }}
          </h2>
          <p class="mj-lede">
            {{ t(refused.body) }}
          </p>
          <p v-if="refusedDetail" class="mj-detail" data-test="refusal-detail">
            {{ t('meals_claim_platform_words', { detail: refusedDetail }) }}
          </p>

          <button
            v-if="refused.action === CLAIM_ACTION_SWITCH_ACCOUNT"
            type="button"
            class="mj-btn mj-btn--ghost"
            data-test="switch-account"
            @click="openLogin"
          >
            {{ t('meals_claim_switch_account') }}
          </button>
          <button
            v-else-if="refused.action === CLAIM_ACTION_SIGN_IN"
            type="button"
            class="mj-btn mj-btn--ghost"
            data-test="refusal-sign-in"
            @click="openLogin"
          >
            {{ t('meals_claim_signin_button') }}
          </button>
          <button
            v-else-if="refused.action === CLAIM_ACTION_RETRY"
            type="button"
            class="mj-btn mj-btn--ghost"
            :disabled="busy"
            data-test="refusal-retry"
            @click="retry"
          >
            {{ t('meals_claim_retry') }}
          </button>
        </section>

        <!-- ---- no code yet ---------------------------------------------------------------------
             The primary way in, not a fallback. The concierge screen copies a bare code to the
             clipboard, so what actually reaches the employee is a string in a message rather than a
             link — a paste field is the shape of the thing they were handed. -->
        <section v-if="ready && !token && !claimed" class="mj-card" data-test="paste">
          <h1 class="mj-title">
            {{ t('meals_claim_paste_title') }}
          </h1>
          <p class="mj-lede">
            {{ t('meals_claim_paste_intro') }}
          </p>

          <form class="mj-form" novalidate @submit.prevent="acceptPastedCode">
            <label class="mj-field">
              <span>{{ t('meals_claim_paste_label') }}</span>
              <input
                v-model="pasted"
                type="text"
                inputmode="text"
                autocomplete="off"
                autocapitalize="off"
                autocorrect="off"
                spellcheck="false"
                :placeholder="t('meals_claim_paste_placeholder')"
                data-test="code-input"
              >
            </label>
            <p v-if="showPasteProblem" class="mj-note mj-note--warn" data-test="paste-empty">
              {{ t('meals_claim_paste_empty') }}
            </p>
            <button type="submit" class="mj-btn mj-btn--primary">
              {{ t('meals_claim_paste_button') }}
            </button>
          </form>

          <p class="mj-quiet">
            {{ t('meals_claim_paste_help') }}
          </p>
        </section>

        <!-- ---- code held, nobody signed in ------------------------------------------------------
             Both invitee routes sit behind the controller's `[Authorize]`, so there is no anonymous
             preview to offer and this screen does not pretend there is one. -->
        <section v-else-if="ready && token && !signedIn && !claimed" class="mj-card" data-test="sign-in">
          <h1 class="mj-title">
            {{ t('meals_claim_signin_title') }}
          </h1>
          <p class="mj-lede">
            {{ t('meals_claim_signin_body') }}
          </p>
          <p class="mj-quiet">
            {{ t('meals_claim_signin_kept') }}
          </p>
          <button type="button" class="mj-btn mj-btn--primary" data-test="sign-in-button" @click="openLogin">
            {{ t('meals_claim_signin_button') }}
          </button>
        </section>

        <!-- ---- the invitation -------------------------------------------------------------------
             Kept on screen after a refused claim, not replaced by it: the employee should be able to
             see what they were refused ABOUT. Only the button goes. -->
        <section v-else-if="preview && !claimed" class="mj-card" data-test="preview">
          <h1 class="mj-title">
            {{ previewTitle }}
          </h1>

          <dl class="mj-facts">
            <div>
              <dt>{{ t('meals_claim_field_role') }}</dt>
              <dd>{{ previewRoleLabel }}</dd>
            </div>
            <div>
              <dt>{{ t('meals_claim_field_expires') }}</dt>
              <dd>{{ previewExpiry }}</dd>
            </div>
          </dl>

          <!-- WHAT THIS PAGE CANNOT TELL THEM, said on the page rather than left as an absence.
               `MealsInvitationSessionModel` carries a company display name, a role and an expiry and
               NOTHING else — no allowance, no venue, no inviter. A claim screen that quietly omitted
               those would read as "there is no budget attached"; naming the gap is the difference
               between a page that does not know and a page that implies. -->
          <div class="mj-note mj-note--info" data-test="unknowns">
            <strong>{{ t('meals_claim_unknowns_title') }}</strong>
            <p>{{ t('meals_claim_unknowns_body') }}</p>
          </div>

          <template v-if="canClaim">
            <p class="mj-lede">
              {{ t('meals_claim_effect') }}
            </p>
            <button
              type="button"
              class="mj-btn mj-btn--primary"
              :disabled="busy"
              data-test="claim-button"
              @click="claim"
            >
              {{ busy ? t('meals_claim_button_busy') : t('meals_claim_button') }}
            </button>
          </template>
        </section>

        <!-- Nothing at all under 300ms; a spinner that shows for one frame reads as a fault. -->
        <div v-else-if="working" class="mj-card mj-card--quiet" :aria-busy="String(showWorking)">
          <p v-if="showWorking" class="mj-quiet">
            {{ t('meals_claim_working') }}
          </p>
        </div>
      </main>

      <!-- A held code that has been refused for good — wrong code, used, withdrawn, expired. The
           refusal card above is the whole answer; the only thing left that this page can do for
           them is take a different code. Outside the chain above, so it is offered whether the
           refusal happened at the lookup (no preview) or at the claim (preview still on screen). -->
      <section v-if="canTryAnotherCode" class="mj-card mj-card--quiet" data-test="other-code">
        <button type="button" class="mj-btn mj-btn--ghost" data-test="other-code-button" @click="forgetCode">
          {{ t('meals_claim_other_code') }}
        </button>
      </section>

      <footer class="mj-foot">
        <p class="mj-note-line">
          {{ t('meals_claim_private_note') }}
        </p>
        <p class="mj-note-line">
          {{ t('meals_claim_footer_help') }}
        </p>
        <p class="mj-mark">
          {{ t('meals_claim_footer_mark') }}
        </p>
      </footer>
    </div>

    <LoginModal
      v-if="showLogin"
      :subtitle="t('meals_claim_login_subtitle')"
      @close="closeLogin"
    />
  </div>
</template>

<script>
import LoginModal from '~/components/molecules/LoginModal.vue';
import { MealsClaimService } from '~/utils/meals/claim-client';
import {
  claimRefusal,
  problemDetail,
  CLAIM_ACTION_SIGN_IN,
  CLAIM_ACTION_SWITCH_ACCOUNT,
  CLAIM_ACTION_RETRY
} from '~/utils/meals/refusal-copy';
import { translate } from '~/utils/i18n';
import { newGuid } from '~/utils/guid';

const LOCALES = ['no', 'en', 'de'];

// The `#` payload is accepted both bare and as `token=…`, because a person hand-building this link
// will write whichever they expect to work and neither is wrong.
const FRAGMENT_TOKEN = /^(?:token=)?(.+)$/;

/**
 * Where an invited employee turns a code into a membership.
 *
 * ---- WHY THE ROUTE IS `/meals/join` AND NOT UNDER `/admin` --------------------------------------
 *
 * The claimant is a shop assistant, a nurse, a driver. They administer no store, they are not yet a
 * member of the company, and the two routes behind this page (`POST /v1/meals/invitations/session`,
 * `POST /v1/meals/invitations/claim`) resolve NO company-admin authority and take no store id — the
 * backend authorises them purely as "the person this token named". So neither of the two patterns
 * this repo already has is a fit:
 *
 *   • `AdminPage` (even with `allow-non-admin`, as `/admin/workforce-me` uses) would wrap them in the
 *     operator chrome — sidebar, store switcher, onboarding notification — for stores they do not
 *     administer, and its anonymous path redirects to `/admin?redirect=<fullPath>`. `fullPath`
 *     includes the hash, so that redirect would copy the credential into a QUERY STRING, which is
 *     exactly where it must never be. The membership guard is not the problem here; the redirect is.
 *   • The Events guest pages (`pages/events/proposal/_token.vue`) bypass authentication entirely,
 *     which this page cannot do: `MealsMembershipController` carries a class-level `[Authorize]` and
 *     neither invitee action opts out.
 *
 * It is therefore a THIRD shape: a public route with no shell, that authenticates itself in place.
 * `layout: 'empty'` keeps the marketing chrome off, and `LoginModal` is mounted by this page rather
 * than reached by navigating — which is also what makes the token survive signing in (below).
 *
 * ---- WHY THE TOKEN RIDES THE FRAGMENT -------------------------------------------------------
 *
 * `CreateMealsInvitationSessionRequest` states the rule the backend expects of its clients: "The
 * client moves the token out of the browser URL fragment into this request body." A fragment is the
 * only part of a URL that is never sent to a server — not in the request line, not in `Referer` —
 * so it stays out of access logs and out of any host this page links to. The Events pages put their
 * token in the PATH, but they say why: "THE PATH IS NOT OURS TO CHOOSE", because the backend mails
 * that link. Nothing mails this one. The path is ours, and this is the one the backend asked for.
 *
 * The fragment is read once in `mounted` and immediately scrubbed with `history.replaceState`, so a
 * screenshot, a shared screen or a back button does not carry the credential. It is then held in
 * component memory and NOWHERE else — not in `sessionStorage`, not in the store, not in the route.
 * There is no round trip to survive: signing in mounts a modal inside this page, so no navigation
 * happens and component state is simply still there afterwards.
 *
 * NOTHING IN THE ESTATE MINTS SUCH A LINK, deliberately: `MealsPeoplePanel` copies the bare code and
 * names this page's address separately, so the credential and the destination travel as two things.
 * The fragment reader is not dead for that — it is the defence for the case that actually happens,
 * an operator pasting `…/meals/join#mealsinv_…` into a message themselves. Without it that token
 * would be silently ignored and the employee stuck; with it the token is taken and the address bar
 * is cleaned within the same tick.
 *
 * ---- MIG-17: WHAT THE CLAIMANT IS TOLD, AND WHEN --------------------------------------------
 *
 * `MealsMembership.EmployeeReference` does not exist. The reference can only be captured AT
 * INVITATION, so a membership claimed today can never acquire one, and `MealsStatementService`
 * writes `MemberDisplayRef = MembershipId.ToString()` — this person is a bare GUID on every line of
 * their employer's monthly bill, permanently. The concierge screen already gates issuing on an
 * explicit acknowledgement, so the COMPANY is informed. The question this page had to answer is
 * whether the PERSON is.
 *
 * Told, but afterwards, and reframed. Three reasons:
 *
 *   1. Before the claim it is unactionable. The invitation is already issued and cannot be amended;
 *      the only lever the employee has is to not claim, which costs them the benefit and fixes
 *      nothing, since a reissued invitation cannot carry a reference either.
 *   2. It is not an exposure to a stranger. The identifier is visible to their employer, who named
 *      their email or phone to create the invitation and already knows exactly who they are. A GUID
 *      on that bill is less identifying than a name, not more.
 *   3. The part that IS theirs is actionable, and it is not the defect — it is the string. If they
 *      ever have to say "that line was not my lunch", they will have to quote the reference their
 *      employer's statement shows, because it will not show their name. So the receipt prints it
 *      under a plain label with one sentence of what it is for.
 *
 * Alarming a non-technical reader about a schema gap they cannot influence, in the moment they are
 * handed a benefit, would spend the credibility the page needs for the refusals that DO require them
 * to act. This is a deliberate choice about emphasis, not a decision to withhold: the consequence —
 * statements name you by this, not by your name — is stated in as many words.
 */
export default {
  name: 'MealsJoinPage',
  components: { LoginModal },
  layout: 'empty',
  data () {
    return {
      // False until `mounted` has read the fragment. The first server render and the first client
      // render therefore produce the same markup, so there is no hydration mismatch to repair — the
      // reason this page needs no `client-only` wrapper the way `AdminPage` does.
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
      preview: null,
      claimed: null,
      refused: null,
      refusedDetail: null,
      // The idempotency key for this visit's ONE claim, together with the (code, account) pair it
      // was minted for. Held so a retry after a lost response replays the same command instead of
      // issuing a second one — see `MealsClaimService.Claim`. Re-minted when either half changes,
      // so a person who signs in as somebody else does not resubmit under the old key.
      claimKey: null,
      claimKeyFor: null,
      dash: '—',
      CLAIM_ACTION_SIGN_IN,
      CLAIM_ACTION_SWITCH_ACCOUNT,
      CLAIM_ACTION_RETRY
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
     * Whether the claim button is worth offering.
     *
     * A refusal that is not retryable is FINAL for this code — already used, withdrawn, expired,
     * wrong account, already a member — and the server will refuse the identical command again. A
     * button left standing there is a control that does nothing, which teaches the reader that this
     * page's buttons do not mean anything.
     */
    canClaim () {
      if (!this.preview || this.claimed || !this.signedIn) { return false; }
      return !this.refused || this.refused.action === CLAIM_ACTION_RETRY;
    },
    /** The escape hatch, offered exactly when this code is spent and pressing again cannot help. */
    canTryAnotherCode () {
      return this.ready && !!this.token && !this.claimed && !this.working && !this.busy &&
        !!this.refused && this.refused.action !== CLAIM_ACTION_RETRY &&
        this.refused.action !== CLAIM_ACTION_SIGN_IN;
    },
    previewTitle () {
      const name = this.companyName(this.preview);
      return name
        ? this.t('meals_claim_preview_title', { company: name })
        : this.t('meals_claim_preview_title_unnamed');
    },
    previewRoleLabel () {
      return this.roleLabel(this.preview && this.preview.intendedRole);
    },
    previewExpiry () {
      return this.instant(this.preview && this.preview.expiresAtUtc) || this.dash;
    },
    // The company name comes from the PREVIEW, not from the claim response: `MealsMemberModel`
    // carries a company id and no name at all. Keeping the preview after a successful claim is what
    // lets the receipt say who they joined instead of printing a guid at them.
    claimedTitle () {
      const name = this.companyName(this.preview);
      return name
        ? this.t('meals_claim_done_title', { company: name })
        : this.t('meals_claim_done_title_unnamed');
    },
    claimedRoleLabel () {
      return this.roleLabel(this.claimed && this.claimed.role);
    }
  },
  created () {
    this._service = new MealsClaimService(this._coreInitializer);
  },
  mounted () {
    this.locale = LOCALES.includes(this.$i18n && this.$i18n.locale) ? this.$i18n.locale : 'no';

    const fromLink = this.readFragment();
    if (fromLink) { this.token = fromLink; }
    this.ready = true;

    if (this.token && this.signedIn) { this.openPreview(); }
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
    companyName (source) {
      const name = source && source.companyDisplayName;
      return typeof name === 'string' && name.trim() ? name.trim() : null;
    },
    // A role outside the enum is printed verbatim rather than mapped onto one this page knows —
    // the same rule the concierge panel keeps, for the same reason: a value the client renamed is
    // worse than one the reader can quote back.
    roleLabel (role) {
      switch (role) {
      case 'CompanyAdmin': return this.t('meals_claim_role_admin');
      case 'Employee': return this.t('meals_claim_role_employee');
      default: return role || this.dash;
      }
    },
    instant (value) {
      if (!value) { return null; }
      const parsed = new Date(/[Zz]|[+-]\d{2}:?\d{2}$/.test(value) ? value : value + 'Z');
      if (isNaN(parsed.getTime())) { return null; }
      return new Intl.DateTimeFormat(this.locale, {
        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
      }).format(parsed);
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

      if (this.signedIn) { this.openPreview(); }
    },

    forgetCode () {
      this.token = '';
      this.preview = null;
      this.clearOutcome();
    },

    openLogin () {
      this.showLogin = true;
    },

    /**
     * The modal closes; the page decides what that meant.
     *
     * Nothing navigates and nothing is stored, so the code is simply still in `this.token`. The
     * previous account's preview and refusal are dropped whichever way this went: a refusal earned
     * by one account must never be left on screen next to another account's name.
     */
    closeLogin (isLoggedIn) {
      this.showLogin = false;
      this.preview = null;
      this.clearOutcome();
      if (isLoggedIn && this.token) { this.openPreview(); }
    },

    clearOutcome () {
      this.refused = null;
      this.refusedDetail = null;
    },

    refuse (error) {
      this.refused = claimRefusal(error);
      this.refusedDetail = problemDetail(error);
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

    /** #7. The preview is the only read on this page, and it is what turns a code into a sentence. */
    async openPreview () {
      if (!this.token || !this.signedIn) { return; }

      this.startWorking();
      this.clearOutcome();
      try {
        this.preview = await this._service.CreateSession(this.token);
      } catch (e) {
        this.preview = null;
        this.refuse(e);
      } finally {
        this.stopWorking();
      }
    },

    /**
     * #8. The one command this page issues.
     *
     * The key is minted per (code, account) and reused, so pressing the button again after a
     * response that never arrived replays that command rather than starting a second one. The
     * preview is deliberately NOT re-read afterwards: the invitation is consumed, so a re-read would
     * answer `invitation-not-claimable` and paint a refusal over a membership that was just created.
     */
    async claim () {
      if (!this.token || !this.signedIn || this.busy || this.claimed) { return; }

      const scope = this.token + '|' + (this.userId || '');
      if (this.claimKeyFor !== scope) {
        this.claimKey = newGuid();
        this.claimKeyFor = scope;
      }

      this.busy = true;
      this.clearOutcome();
      try {
        this.claimed = await this._service.Claim(this.token, this.claimKey);
      } catch (e) {
        // A payload mismatch means this key is already spoken for by a DIFFERENT command, so
        // retrying under it would collide identically for ever. Dropping the scope is what makes
        // the retry the refusal offers actually able to succeed.
        if (e && e.code === 'meals.idempotency-payload-mismatch') { this.claimKeyFor = null; }
        this.refuse(e);
      } finally {
        this.busy = false;
      }
    },

    /** The only refusals that offer this are the ones where the command may never have landed. */
    retry () {
      if (this.busy) { return; }
      if (this.preview) { this.claim(); } else { this.openPreview(); }
    }
  },
  head () {
    return {
      title: translate(this.locale, 'meals_claim_meta_title'),
      // A page reached with a bearer credential in its fragment must never be indexed. `robots.txt`
      // cannot express this usefully, so the page declares it — the same reason the Events guest
      // pages do.
      meta: [{ hid: 'robots', name: 'robots', content: 'noindex, nofollow' }]
    };
  }
};
</script>

<style scoped>
/* Deliberately the visual language of the Events guest pages rather than the admin design system:
   the reader is the same kind of person in the same kind of moment — a phone, a message, one
   decision — and a second look for that situation would be a second thing to maintain. The styles
   are local rather than imported from `components/events/GuestShell.vue`, because that component's
   frame carries events-specific copy (`ev_guest_footer_help` sends the reader back to "the venue")
   and a meals page must not borrow it. */
.mj-shell {
  min-height: 100vh;
  background: #f4f6f8;
  padding: 32px 20px 56px;
  display: flex;
  justify-content: center;
  color: #292c34;
  font-size: 16px;
  line-height: 1.45;
}

.mj-paper {
  width: 100%;
  max-width: 660px;
}

.mj-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.mj-eyebrow {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #64748b;
}

.mj-langs {
  display: flex;
  gap: 4px;
}

.mj-lang {
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

.mj-lang--on {
  background: #fff;
  border-color: #e2e8f0;
  color: #292c34;
  font-weight: 600;
}

.mj-card {
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  margin-bottom: 20px;
  box-shadow: 0 1px 2px rgba(41, 44, 52, 0.04), 0 8px 24px rgba(41, 44, 52, 0.06);
}

.mj-card--quiet { min-height: 96px; }
.mj-card--good { background: #f0fdf4; border: 1px solid #bbf7d0; box-shadow: none; }
.mj-card--bad { background: #fef2f2; border: 1px solid #fecaca; box-shadow: none; }

.mj-title {
  margin: 0 0 12px;
  font-size: 30px;
  line-height: 1.15;
  font-weight: 600;
  color: #292c34;
}

.mj-heading {
  margin: 0 0 12px;
  font-size: 20px;
  font-weight: 600;
  color: #292c34;
}

.mj-lede { margin: 0 0 12px; font-size: 16px; color: #292c34; }
.mj-quiet { margin: 12px 0 0; font-size: 14.5px; color: #64748b; }
.mj-detail { margin: 8px 0 0; font-size: 14.5px; color: #64748b; }

.mj-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 20px;
  margin: 20px 0 0;
}

.mj-facts dt {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.mj-facts dd { margin: 6px 0 0; font-size: 16px; color: #292c34; }

.mj-ref {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  letter-spacing: 0.02em;
  word-break: break-all;
}

.mj-note { margin: 20px 0 0; padding: 16px 20px; border-radius: 12px; font-size: 15px; }
.mj-note--info { background: #eff6ff; color: #1e3a8a; }
.mj-note--warn { background: #fff7ed; color: #92400e; }
.mj-note p { margin: 6px 0 0; }

.mj-form { margin-top: 20px; }
.mj-field { display: block; margin-bottom: 20px; }

.mj-field span {
  display: block;
  margin-bottom: 8px;
  font-size: 14.5px;
  font-weight: 600;
  color: #292c34;
}

.mj-field input {
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

.mj-field input:focus {
  outline: none;
  border-color: #1bb776;
  box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.18);
}

.mj-btn {
  min-height: 52px;
  padding: 0 24px;
  margin-top: 20px;
  border-radius: 12px;
  border: 1px solid transparent;
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 180ms cubic-bezier(0.16, 0.84, 0.34, 1), transform 180ms cubic-bezier(0.16, 0.84, 0.34, 1);
}

.mj-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.mj-btn:not(:disabled):active { transform: translateY(1px); }

.mj-btn--primary {
  width: 100%;
  min-height: 64px;
  background: #1bb776;
  color: #fff;
}

.mj-btn--primary:not(:disabled):hover { background: #159f63; }
.mj-btn--ghost { background: #fff; border-color: #cbd5e1; color: #292c34; }
.mj-btn--ghost:not(:disabled):hover { background: #f4f6f8; }

.mj-foot { padding: 4px 4px 0; }
.mj-note-line { margin: 0 0 8px; font-size: 13.5px; color: #64748b; }

.mj-mark {
  margin: 16px 0 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

@media (max-width: 560px) {
  .mj-card { padding: 24px; }
  .mj-title { font-size: 26px; }
}

@media (prefers-reduced-motion: reduce) {
  .mj-btn,
  .mj-field input { transition: none; }
}
</style>

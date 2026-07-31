<template>
  <GuestShell
    :locale="locale"
    :eyebrow="t('ev_guest_proposal_eyebrow')"
    private-link
    @locale="setLocale"
  >
    <!-- ---- the answer this visit gave ------------------------------------------------------- -->
    <!-- Rendered ABOVE the offer and OUTSIDE every read state, so the receipt for an answer the
         guest has already given cannot be wiped off the screen by a re-read that fails afterwards.
         What they did is theirs; what the server currently holds is a separate question. -->
    <section v-if="receipt" class="eg-card eg-card--good" data-test="accepted">
      <h2 class="eg-heading">
        {{ t('ev_guest_accepted_heading') }}
      </h2>
      <p v-if="depositAsked" class="eg-lede">
        {{ t('ev_guest_accepted_deposit', { amount: depositAsked }) }}
      </p>
      <p class="eg-lede">
        {{ t('ev_guest_accepted_next') }}
      </p>
      <dl class="eg-facts">
        <div>
          <dt>{{ t('ev_guest_receipt_version') }}</dt>
          <dd>{{ receipt.acceptedVersionNo }}</dd>
        </div>
        <div>
          <dt>{{ t('ev_guest_receipt_when') }}</dt>
          <dd>{{ instant(receipt.acceptedAtUtc) || dash }}</dd>
        </div>
      </dl>
      <p class="eg-ref">
        {{ t('ev_guest_receipt_reference', { reference: receipt.proposalContentHash || dash }) }}
      </p>
    </section>

    <section v-else-if="declined" class="eg-card" data-test="declined">
      <h2 class="eg-heading">
        {{ t('ev_guest_declined_heading') }}
      </h2>
      <p class="eg-lede">
        {{ t('ev_guest_declined_body') }}
      </p>
    </section>

    <!-- ---- a refused answer ----------------------------------------------------------------- -->
    <!-- Keyed on the stable `EVENTS_*` code, with the server's own prose beneath it. A guest who
         cannot accept is owed the reason, not only our paraphrase of it. -->
    <section v-if="refusal" class="eg-card eg-card--bad" data-test="refusal">
      <h2 class="eg-heading">
        {{ t('ev_guest_refused_heading') }}
      </h2>
      <p class="eg-lede">
        {{ t(refusalSentence) }}
      </p>
      <p v-if="refusal.message" class="eg-detail">
        {{ t('ev_guest_refused_detail', { detail: refusal.message }) }}
      </p>
    </section>

    <!-- ---- the offer ------------------------------------------------------------------------ -->
    <template v-if="held">
      <article class="eg-card">
        <h1 class="eg-title">
          {{ view.eventTitle || t('ev_guest_untitled') }}
        </h1>

        <dl class="eg-facts">
          <div>
            <dt>{{ t('ev_guest_field_date') }}</dt>
            <dd>{{ dayLabel }}</dd>
          </div>
          <div>
            <dt>{{ t('ev_guest_field_guests') }}</dt>
            <dd>{{ guestsLabel }}</dd>
          </div>
          <div>
            <dt>{{ t('ev_guest_field_deadline') }}</dt>
            <dd>{{ deadlineLabel }}</dd>
          </div>
        </dl>

        <!-- An amendment is a change to a booking the guest already has. Saying so before the
             numbers is the difference between "here is your offer" and "here is what changes". -->
        <p v-if="view.isAmendment" class="eg-note eg-note--info" data-test="amendment">
          {{ t('ev_guest_amendment') }}
        </p>

        <!-- The state of an offer that can no longer be answered. Rendered BESIDE the content and
             never instead of it: the guest still sees exactly what was sent them, which is the
             whole point of answering a superseded token with its own version rather than a 404. -->
        <div v-if="closedNotice" class="eg-note eg-note--warn" data-test="closed">
          <strong>{{ t(closedNotice.heading) }}</strong>
          <p>{{ t(closedNotice.body) }}</p>
          <p v-if="closedNotice.verbatim" class="eg-detail">
            {{ t('ev_guest_status_verbatim', { status: view.status || '?' }) }}
          </p>
        </div>
      </article>

      <!-- ---- what is being offered ---------------------------------------------------------- -->
      <section class="eg-card">
        <h2 class="eg-heading">
          {{ t('ev_guest_lines_heading') }}
        </h2>

        <p v-if="!lines.length" class="eg-quiet">
          {{ t('ev_guest_lines_none') }}
        </p>

        <ul v-else class="eg-lines">
          <li v-for="line in lines" :key="line.lineNo" class="eg-line">
            <div class="eg-line__what">
              <span class="eg-line__desc">{{ line.description || kindLabel(line.kind) }}</span>
              <span class="eg-line__meta">{{ lineMeta(line) }}</span>
            </div>
            <span class="eg-line__sum">{{ money(line.amountMinor) || dash }}</span>
          </li>
        </ul>
      </section>

      <!-- ---- the money ---------------------------------------------------------------------- -->
      <section class="eg-card">
        <h2 class="eg-heading">
          {{ t('ev_guest_money_heading') }}
        </h2>

        <!-- A version cannot be SENT without a currency, so this is a state the guest should never
             meet. If it happens the figures are withheld rather than printed bare: a number with no
             denomination is read in whatever currency the reader assumes. -->
        <p v-if="!currencyKnown" class="eg-note eg-note--warn" data-test="no-currency">
          {{ t('ev_guest_money_no_currency') }}
        </p>

        <template v-else>
          <dl class="eg-sums">
            <div>
              <dt>{{ t('ev_guest_total_lines') }}</dt>
              <dd class="eg-sums__figure">
                {{ money(view.totalMinor) || dash }}
              </dd>
            </div>
            <div v-if="view.roomFeeMinor">
              <dt>{{ t('ev_guest_room_fee') }}</dt>
              <dd class="eg-sums__figure">
                {{ money(view.roomFeeMinor) || dash }}
              </dd>
            </div>
            <div v-if="view.minimumSpendMinor">
              <dt>{{ t('ev_guest_minimum_spend') }}</dt>
              <dd class="eg-sums__figure">
                {{ money(view.minimumSpendMinor) || dash }}
              </dd>
            </div>
            <div>
              <dt>{{ t('ev_guest_deposit') }}</dt>
              <dd class="eg-sums__figure">
                {{ view.depositRequiredMinor ? (money(view.depositRequiredMinor) || dash) : t('ev_guest_deposit_none') }}
              </dd>
            </div>
          </dl>

          <p v-if="view.minimumSpendMinor" class="eg-quiet">
            {{ t('ev_guest_minimum_spend_note') }}
          </p>
          <!-- Four independent server columns, four labels, no arithmetic. `totalMinor` is the sum
               of the LINE amounts alone and the three beside it are their own columns, so adding
               them would double-count a room fee that is also a line. -->
          <p class="eg-quiet">
            {{ t('ev_guest_money_note') }}
          </p>
        </template>
      </section>

      <!-- ---- terms -------------------------------------------------------------------------- -->
      <section class="eg-card">
        <h2 class="eg-heading">
          {{ t('ev_guest_terms_heading') }}
        </h2>
        <!-- Interpolated as text, never as markup: the string is venue-authored and this is a public
             page. `white-space: pre-wrap` keeps the venue's own line breaks, which is also why the
             interpolation sits tight against its tag: with pre-wrap, the template's own indentation
             would be rendered as an indent on the venue's first line. -->
        <p v-if="termsText" class="eg-terms" v-text="termsText" />
        <p v-else class="eg-quiet">
          {{ t('ev_guest_terms_none') }}
        </p>
      </section>

      <!-- ---- answering ---------------------------------------------------------------------- -->
      <!-- The accept and decline controls exist for exactly ONE stance: the server said this version
           is Sent and unexpired. A superseded, expired, accepted or declined offer renders no
           control at all, rather than one that is certain to be refused. -->
      <section v-if="offerAnswerable" class="eg-card">
        <h2 class="eg-heading">
          {{ t('ev_guest_accept_heading') }}
        </h2>
        <p class="eg-lede">
          {{ t('ev_guest_accept_intro') }}
        </p>

        <form class="eg-form" novalidate @submit.prevent="accept">
          <label class="eg-field">
            <span>{{ t('ev_guest_accept_name') }}</span>
            <input
              v-model="form.acceptorName"
              type="text"
              autocomplete="name"
              :disabled="busy"
            >
          </label>
          <label class="eg-field">
            <span>{{ t('ev_guest_accept_email') }}</span>
            <input
              v-model="form.acceptorEmail"
              type="email"
              autocomplete="email"
              :disabled="busy"
            >
          </label>

          <p v-if="showFormProblems && problems.length" class="eg-note eg-note--warn" data-test="accept-problems">
            {{ t(problemKey) }}
          </p>

          <p class="eg-quiet">
            {{ t('ev_guest_accept_binding') }}
          </p>

          <button type="submit" class="eg-btn eg-btn--primary" :disabled="busy">
            {{ busy ? t('ev_guest_accept_pending') : t('ev_guest_accept_button') }}
          </button>
        </form>

        <div class="eg-decline">
          <button
            v-if="!showDecline"
            type="button"
            class="eg-btn eg-btn--ghost"
            :disabled="busy"
            @click="showDecline = true"
          >
            {{ t('ev_guest_decline_button') }}
          </button>

          <form v-else class="eg-form" @submit.prevent="decline">
            <label class="eg-field">
              <span>{{ t('ev_guest_decline_note') }}</span>
              <textarea v-model="declineNote" rows="3" :disabled="busy" />
            </label>
            <div class="eg-row">
              <button type="submit" class="eg-btn eg-btn--ghost" :disabled="busy">
                {{ t('ev_guest_decline_confirm') }}
              </button>
              <button type="button" class="eg-btn eg-btn--plain" :disabled="busy" @click="showDecline = false">
                {{ t('ev_guest_decline_cancel') }}
              </button>
            </div>
          </form>
        </div>
      </section>

      <!-- ---- the reference ------------------------------------------------------------------ -->
      <!-- The content hash the backend settles at send and re-verifies at acceptance. It is printed
           because it is the guest's half of the evidence: the same reference on every reload is how
           they can tell nobody moved the numbers under them. -->
      <p v-if="view.contentHash" class="eg-ref" data-test="reference">
        {{ t('ev_guest_reference', { reference: view.contentHash }) }}
      </p>
      <p class="eg-quiet">
        {{ t('ev_guest_reference_note') }}
      </p>
    </template>

    <!-- ---- the read has not answered, or answered no ----------------------------------------- -->
    <!-- Nothing at all under 300ms: a spinner that flashes for one frame reads as a fault, and the
         great majority of these reads land well inside it. A RE-read never reaches this branch,
         because the state it replaces is still HELD while it is in flight. -->
    <div v-else-if="loading" class="eg-card eg-card--quiet" :aria-busy="String(showLoading)">
      <p v-if="showLoading" class="eg-quiet">
        {{ t('ev_guest_loading') }}
      </p>
    </div>

    <!-- Three refusals, three sentences. A wrong link, a module the venue has switched off, and a
         read that fell over are three different things to a guest, and only the first is theirs
         to fix. -->
    <div v-else-if="read.state === GUEST_NOT_FOUND" class="eg-card" data-test="not-found">
      <h1 class="eg-title">
        {{ t('ev_guest_state_not_found_heading') }}
      </h1>
      <p class="eg-lede">
        {{ t('ev_guest_state_not_found_body') }}
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
  STANCE_OPEN,
  STANCE_ACCEPTED,
  STANCE_DECLINED,
  STANCE_SUPERSEDED,
  STANCE_EXPIRED,
  readGuestProposal,
  proposalStance,
  canAct,
  acceptorProblems,
  refusalKey,
  formatMoney,
  formatQuantity,
  formatVatRate,
  formatEventDay,
  formatDeadline,
  guestLocale
} from '~/utils/events/guest';

// `EventsProposalLineKind`. A kind outside the enum is printed verbatim rather than mapped, for the
// same reason the admin surface prints an unrecognised status verbatim: an unknown value the page
// renamed is worse than one the guest can quote back to the venue.
const LINE_KINDS = ['Package', 'MenuItem', 'AddOn', 'RoomFee', 'Custom'];

// The guest's view of one proposal, and the two answers only they can give.
//
// PUBLIC BY CONSTRUCTION, and that is a routing fact rather than a flag: authentication in this app
// is enforced by the `AdminPage` organism, which mounts the login modal and redirects to
// `/admin?redirect=…`. There is no route middleware anywhere in the repo, so a page that does not
// wrap itself in `AdminPage` is reachable by anyone — exactly like `pages/kvittering/_id/_token.vue`,
// the public receipt behind an SMS link. The `empty` layout keeps the marketing chrome off it.
//
// THE PATH IS NOT OURS TO CHOOSE. `EventsEmailNotificationDelivery.ComposeLink` mails
// `{PublicBaseUrl}/events/{proposal|deposit}/{token}`, so this file and its deposit sibling are
// where that link has to land.
//
// EVERY ANSWER IS FOLLOWED BY A RE-READ and no projection is kept from a mutation's response. It is
// the law the admin page keeps, and it matters more here: the two ways an offer can stop being
// answerable (a newer version, an elapsed deadline) both happen without this page doing anything,
// so the state after an answer has to come from the server rather than from what the page believed.
export default {
  name: 'EventsGuestProposalPage',
  components: { GuestShell },
  layout: 'empty',
  data () {
    return {
      locale: 'no',
      loading: true,
      showLoading: false,
      loadingTimer: null,
      busy: false,
      read: { state: GUEST_UNKNOWN, view: null, code: null, detail: null },
      form: { acceptorName: '', acceptorEmail: '' },
      showFormProblems: false,
      showDecline: false,
      declineNote: '',
      receipt: null,
      declined: false,
      refusal: null,
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
    lines () {
      return Array.isArray(this.view.lines) ? this.view.lines : [];
    },
    // The single gate on both controls: the SERVER's `isActionable`, and no answer given in this
    // visit. Never a local re-derivation from the status and the clock, which is how a browser an
    // hour out of step hides a live offer or offers a dead one.
    offerAnswerable () {
      return this.held && canAct(this.view) && !this.receipt && !this.declined;
    },
    stance () {
      return proposalStance(this.view);
    },
    currencyKnown () {
      return typeof this.view.currencyCode === 'string' && /^[A-Za-z]{3}$/.test(this.view.currencyCode.trim());
    },
    // The heading and body for an offer that cannot be answered. Null while it can be, and null once
    // this visit has produced an answer of its own, which is the same fact said better.
    closedNotice () {
      if (this.stance === STANCE_OPEN || this.receipt || this.declined) { return null; }
      switch (this.stance) {
      case STANCE_SUPERSEDED:
        return { heading: 'ev_guest_stance_superseded_heading', body: 'ev_guest_stance_superseded_body' };
      case STANCE_EXPIRED:
        return { heading: 'ev_guest_stance_expired_heading', body: 'ev_guest_stance_expired_body' };
      case STANCE_ACCEPTED:
        return { heading: 'ev_guest_stance_accepted_heading', body: 'ev_guest_stance_accepted_body' };
      case STANCE_DECLINED:
        return { heading: 'ev_guest_stance_declined_heading', body: 'ev_guest_stance_declined_body' };
      default:
        // A status this page has no sentence for is shown verbatim beside the neutral one, so the
        // guest can quote it to the venue rather than be told a state that was invented for them.
        return {
          heading: 'ev_guest_stance_unknown_heading',
          body: 'ev_guest_stance_unknown_body',
          verbatim: true
        };
      }
    },
    problems () {
      return acceptorProblems(this.form);
    },
    problemKey () {
      return this.problems.includes('acceptorName')
        ? 'ev_guest_accept_needs_name'
        : 'ev_guest_accept_needs_email';
    },
    refusalSentence () {
      return refusalKey(this.refusal && this.refusal.code);
    },
    dayLabel () {
      return formatEventDay(this.view.eventDate, this.locale) || this.dash;
    },
    guestsLabel () {
      return typeof this.view.guestCountPlanned === 'number'
        ? this.t('ev_guest_guests_value', { count: this.view.guestCountPlanned })
        : this.dash;
    },
    deadlineLabel () {
      return formatDeadline(this.view.expiresAtUtc, this.locale) || this.t('ev_guest_deadline_none');
    },
    termsText () {
      const text = this.view.termsText;
      return typeof text === 'string' && text.trim() ? text : null;
    },
    // Named only when there is one to name. A zero deposit is not "no deposit yet": it is a venue
    // that asks for none, and acceptance then promotes straight to Confirmed on the server.
    depositAsked () {
      return this.view.depositRequiredMinor ? this.money(this.view.depositRequiredMinor) : null;
    }
  },
  created () {
    // Built once and kept: this client holds no token and no state, unlike the admin services whose
    // bearer token changes under them and which are therefore rebuilt per access.
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
    money (minor) {
      return formatMoney(minor, this.view.currencyCode, this.locale);
    },
    instant (value) {
      return formatDeadline(value, this.locale);
    },
    kindLabel (kind) {
      return LINE_KINDS.includes(kind) ? this.t('ev_guest_kind_' + kind) : (kind || this.dash);
    },
    // Quantity, unit price and the venue's VAT rate on one quiet line. The rate is shown as the rate
    // the venue entered, and nothing is computed from it: the wire says nothing about whether the
    // amounts include it, so a VAT FIGURE here would be a tax claim this product cannot make.
    lineMeta (line) {
      const parts = [];
      const quantity = formatQuantity(line.quantity, this.locale);
      const unit = this.money(line.unitPriceMinor);
      if (quantity && unit) {
        parts.push(quantity + ' × ' + unit);
      } else if (quantity) {
        parts.push(quantity);
      }
      const vat = formatVatRate(line.vatRate, this.locale);
      if (vat !== null) { parts.push(this.t('ev_guest_line_vat_value', { rate: vat })); }
      return parts.join(' · ');
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
        this.read = readGuestProposal(await this._service.GetProposal(token), null);
      } catch (e) {
        // A typed failure carries the code the states are read off; an untyped one (the network fell
        // over) carries none, so it resolves to UNKNOWN, which is the honest answer for a read that
        // never happened.
        this.read = isEventsApiError(e)
          ? readGuestProposal(null, e)
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
    },

    /**
     * T5. The guest's name and email are checked HERE because the backend records them without
     * validating them: both go straight onto the append-only acceptance receipt, and a receipt
     * naming nobody is the one outcome this form must not produce.
     */
    async accept () {
      if (!this.offerAnswerable || this.busy) { return; }
      if (this.problems.length) { this.showFormProblems = true; return; }

      this.busy = true;
      this.refusal = null;
      try {
        this.receipt = await this._service.AcceptProposal(this.$route.params.token, {
          acceptorName: this.form.acceptorName.trim(),
          acceptorEmail: this.form.acceptorEmail.trim()
        });
      } catch (e) {
        this.refusal = isEventsApiError(e) ? e : { code: null, message: (e && e.message) || null };
      } finally {
        this.busy = false;
        // Taken or refused, the page re-reads. On success the read replaces the offer with the
        // server's own current state; on a refusal it is the recovery, because the two refusals a
        // guest actually meets (superseded, expired) both mean the page in front of them is stale.
        await this.load();
      }
    },

    async decline () {
      if (!this.offerAnswerable || this.busy) { return; }

      this.busy = true;
      this.refusal = null;
      try {
        await this._service.DeclineProposal(this.$route.params.token, {
          note: this.declineNote.trim() || null
        });
        this.declined = true;
        this.showDecline = false;
      } catch (e) {
        this.refusal = isEventsApiError(e) ? e : { code: null, message: (e && e.message) || null };
      } finally {
        this.busy = false;
        await this.load();
      }
    }
  },
  head () {
    return {
      title: translate(this.locale, 'ev_guest_proposal_meta_title'),
      // A bearer link must never be indexed, and the token rides the path. `robots.txt` cannot cover
      // that usefully (the path is different for every guest), so the page declares it itself.
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
.eg-card--good { background: #f0fdf4; border: 1px solid #bbf7d0; box-shadow: none; }
.eg-card--bad { background: #fef2f2; border: 1px solid #fecaca; box-shadow: none; }

.eg-title {
  margin: 0 0 12px;
  font-size: 30px;
  line-height: 1.15;
  font-weight: 600;
  color: #292c34;
}

.eg-heading {
  margin: 0 0 12px;
  font-size: 20px;
  font-weight: 600;
  color: #292c34;
}

.eg-lede { margin: 0 0 12px; font-size: 16px; color: #292c34; }
.eg-quiet { margin: 12px 0 0; font-size: 14.5px; color: #64748b; }
.eg-detail { margin: 8px 0 0; font-size: 14.5px; color: #64748b; }

.eg-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 20px;
  margin: 20px 0 0;
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

.eg-note { margin: 20px 0 0; padding: 16px 20px; border-radius: 12px; font-size: 15px; }
.eg-note--info { background: #eff6ff; color: #1e3a8a; }
.eg-note--warn { background: #fff7ed; color: #92400e; }
.eg-note p { margin: 6px 0 0; }
.eg-note .eg-detail { color: inherit; opacity: 0.85; }

.eg-lines { list-style: none; margin: 0; padding: 0; }

.eg-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20px;
  padding: 14px 0;
  border-bottom: 1px solid #eef1f4;
}

.eg-line:last-child { border-bottom: 0; padding-bottom: 0; }
.eg-line__what { display: flex; flex-direction: column; gap: 4px; }
.eg-line__desc { font-size: 16px; color: #292c34; }
.eg-line__meta { font-size: 14.5px; color: #64748b; font-variant-numeric: tabular-nums; }

.eg-line__sum {
  font-size: 16px;
  font-weight: 600;
  color: #292c34;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.eg-sums { margin: 0; }

.eg-sums > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20px;
  padding: 12px 0;
  border-bottom: 1px solid #eef1f4;
}

.eg-sums > div:last-child { border-bottom: 0; }
.eg-sums dt { font-size: 16px; color: #64748b; }
.eg-sums dd { margin: 0; }

.eg-sums__figure {
  font-size: 20px;
  font-weight: 600;
  color: #292c34;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.eg-terms { margin: 0; white-space: pre-wrap; font-size: 15px; color: #292c34; }

.eg-form { margin-top: 20px; }
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
.eg-btn--ghost { background: #fff; border-color: #cbd5e1; color: #292c34; }
.eg-btn--ghost:not(:disabled):hover { background: #f4f6f8; }
.eg-btn--plain { background: transparent; color: #64748b; }

.eg-decline { margin-top: 20px; padding-top: 20px; border-top: 1px solid #eef1f4; }
.eg-row { display: flex; gap: 12px; flex-wrap: wrap; }

.eg-ref {
  margin: 0 4px 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: #94a3b8;
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

<template>
  <div class="ev-journey">
    <!-- ---- the rail ------------------------------------------------------------------------ -->
    <ol class="ev-journey__rail">
      <li
        v-for="node in rail"
        :key="node.phase"
        class="ev-journey__node"
        :class="'ev-journey__node--' + node.state"
      >
        {{ $i('ev_status_' + node.phase) }}
      </li>
    </ol>

    <p v-if="status.state === STATUS_ABSENT" class="ev-journey__notice ev-journey__notice--warn">
      {{ $i('ev_status_absent_note') }}
    </p>
    <p v-else-if="status.state === STATUS_UNRECOGNISED" class="ev-journey__notice ev-journey__notice--warn">
      {{ $i('ev_status_unrecognised', { status: status.status }) }}
    </p>
    <p v-else-if="status.isOffRamp" class="ev-journey__notice ev-journey__notice--warn">
      {{ $i('ev_status_offramp', { status: $i('ev_status_' + status.status) }) }}
    </p>

    <!-- ---- the event ---------------------------------------------------------------------- -->
    <section class="ev-journey__section">
      <h3>{{ detail.title || unknownMark }}</h3>
      <dl class="ev-journey__facts">
        <div><dt>{{ $i('ev_field_date') }}</dt><dd>{{ dayLabel }}</dd></div>
        <div><dt>{{ $i('ev_field_time') }}</dt><dd>{{ timeLabel }}</dd></div>
        <div><dt>{{ $i('ev_field_guests') }}</dt><dd>{{ count(detail.guestCountPlanned) }}</dd></div>
        <div><dt>{{ $i('ev_field_contact') }}</dt><dd>{{ contactLabel }}</dd></div>
        <div><dt>{{ $i('ev_field_company') }}</dt><dd>{{ detail.companyName || unknownMark }}</dd></div>
        <div><dt>{{ $i('ev_field_source') }}</dt><dd>{{ detail.source || unknownMark }}</dd></div>
        <div><dt>{{ $i('ev_field_zone') }}</dt><dd>{{ zoneId || unknownMark }}</dd></div>
        <div><dt>{{ $i('ev_field_created') }}</dt><dd>{{ instant(detail.createdAtUtc) }}</dd></div>
      </dl>
    </section>

    <!-- ---- proposals ---------------------------------------------------------------------- -->
    <section class="ev-journey__section">
      <h3>{{ $i('ev_versions_heading') }}</h3>
      <p v-if="!versions.length" class="ev-journey__notice">
        {{ $i('ev_versions_none') }}
      </p>
      <div v-for="version in versions" :key="version.versionNo" class="ev-journey__version">
        <div class="ev-journey__version-head">
          <strong>{{ $i('ev_version_no', { no: version.versionNo }) }}</strong>
          <span class="ev-journey__chip">{{ version.status || unknownMark }}</span>
          <span v-if="version.versionNo === detail.acceptedProposalVersionNo" class="ev-journey__chip ev-journey__chip--ok">
            {{ $i('ev_version_operative') }}
          </span>
        </div>

        <!-- Four independent server figures, four labels. Nothing here is added to anything else:
             `totalMinor` is the sum of the LINE amounts alone, and the three beside it are their own
             columns. See the note at the foot of utils/events/journey.js. -->
        <dl class="ev-journey__facts">
          <div><dt>{{ $i('ev_version_total') }}</dt><dd>{{ amount(version.totalMinor, version.currencyCode) }}</dd></div>
          <div><dt>{{ $i('ev_version_minimum') }}</dt><dd>{{ amount(version.minimumSpendMinor, version.currencyCode) }}</dd></div>
          <div><dt>{{ $i('ev_version_roomfee') }}</dt><dd>{{ amount(version.roomFeeMinor, version.currencyCode) }}</dd></div>
          <div><dt>{{ $i('ev_version_deposit') }}</dt><dd>{{ amount(version.depositRequiredMinor, version.currencyCode) }}</dd></div>
          <div><dt>{{ $i('ev_version_sent') }}</dt><dd>{{ instant(version.sentAtUtc) }}</dd></div>
          <div><dt>{{ $i('ev_version_expires') }}</dt><dd>{{ instant(version.expiresAtUtc) }}</dd></div>
        </dl>

        <table v-if="linesOf(version).length" class="ev-journey__table">
          <thead>
            <tr>
              <th>{{ $i('ev_line_no') }}</th>
              <th>{{ $i('ev_line_kind') }}</th>
              <th>{{ $i('ev_line_desc') }}</th>
              <th class="ev-journey__num">
                {{ $i('ev_line_qty') }}
              </th>
              <th class="ev-journey__num">
                {{ $i('ev_line_unit') }}
              </th>
              <th class="ev-journey__num">
                {{ $i('ev_line_amount') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in linesOf(version)" :key="line.lineNo">
              <td>{{ count(line.lineNo) }}</td>
              <td>{{ line.kind || unknownMark }}</td>
              <td>{{ line.description || unknownMark }}</td>
              <td class="ev-journey__num">
                {{ count(line.quantity) }}
              </td>
              <td class="ev-journey__num">
                {{ amount(line.unitPriceMinor, version.currencyCode) }}
              </td>
              <td class="ev-journey__num">
                {{ amount(line.amountMinor, version.currencyCode) }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- The handover, as the ADDRESS the guest opens rather than as a bare identifier. The path
             is not a choice made here: `EventsEmailNotificationDelivery.ComposeLink` mails
             `{PublicBaseUrl}/events/proposal/{token}`, and `pages/events/proposal/_token.vue` is the
             page that answers it. Before that page existed there was nothing to link to, which is
             why this used to print the token alone. -->
        <p v-if="version.publicToken" class="ev-journey__handover">
          <span class="ev-journey__handover-label">{{ $i('ev_version_token') }}</span>
          <a :href="guestLink('proposal', version.publicToken)" target="_blank" rel="noopener">
            <code>{{ guestLink('proposal', version.publicToken) }}</code>
          </a>
          <span class="ev-journey__hint">{{ $i('ev_handover_note') }}</span>
        </p>
      </div>
    </section>

    <!-- ---- deposits ----------------------------------------------------------------------- -->
    <section class="ev-journey__section">
      <h3>{{ $i('ev_deposit_heading') }}</h3>
      <p v-if="deposits.state === FACET_NONE" class="ev-journey__notice">
        {{ $i('ev_deposit_none') }}
      </p>
      <p v-else-if="deposits.state === FACET_GATED" class="ev-journey__notice">
        {{ $i('ev_deposit_gated') }}
      </p>
      <p v-else-if="deposits.state === FACET_UNKNOWN" class="ev-journey__notice ev-journey__notice--warn">
        {{ $i('ev_deposit_unknown') }}<span v-if="deposits.detail"> {{ deposits.detail }}</span>
      </p>
      <!-- Only a HELD read is drawn. An unhandled state renders nothing rather than reaching for
           rows that are not there. The WHOLE history is drawn, not "the current one": a cancelled
           request and its reissue are two facts, and showing only the newest hides the first. -->
      <template v-else-if="deposits.state === FACET_HELD">
        <div v-for="deposit in deposits.rows" :key="deposit.id" class="ev-journey__version">
          <dl class="ev-journey__facts">
            <div><dt>{{ $i('ev_deposit_status') }}</dt><dd>{{ deposit.status || unknownMark }}</dd></div>
            <div><dt>{{ $i('ev_deposit_rail') }}</dt><dd>{{ deposit.paymentType || unknownMark }}</dd></div>
            <!-- Requested and refunded, side by side. The difference between them is the outstanding
                 sum, which the API does not expose; see ev_deposit_no_net. -->
            <div><dt>{{ $i('ev_deposit_amount') }}</dt><dd>{{ amount(deposit.amountMinor, deposit.currencyCode) }}</dd></div>
            <div><dt>{{ $i('ev_deposit_refunded') }}</dt><dd>{{ amount(deposit.refundedMinor, deposit.currencyCode) }}</dd></div>
            <div><dt>{{ $i('ev_deposit_paid') }}</dt><dd>{{ instant(deposit.paidAtUtc) }}</dd></div>
            <div><dt>{{ $i('ev_deposit_expires') }}</dt><dd>{{ instant(deposit.expiresAtUtc) }}</dd></div>
          </dl>
          <p class="ev-journey__hint">
            {{ $i('ev_deposit_no_net') }}
          </p>
          <p v-if="deposit.publicToken" class="ev-journey__handover">
            <span class="ev-journey__handover-label">{{ $i('ev_deposit_token') }}</span>
            <a :href="guestLink('deposit', deposit.publicToken)" target="_blank" rel="noopener">
              <code>{{ guestLink('deposit', deposit.publicToken) }}</code>
            </a>
            <span class="ev-journey__hint">{{ $i('ev_handover_note') }}</span>
          </p>
          <table v-if="receiptsOf(deposit).length" class="ev-journey__table">
            <thead>
              <tr>
                <th>{{ $i('ev_receipt_kind') }}</th>
                <th>{{ $i('ev_receipt_ref') }}</th>
                <th class="ev-journey__num">
                  {{ $i('ev_receipt_amount') }}
                </th>
                <th>{{ $i('ev_receipt_at') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(receipt, index) in receiptsOf(deposit)" :key="index">
                <td>{{ receipt.kind || unknownMark }}</td>
                <td><code>{{ receipt.providerReference || unknownMark }}</code></td>
                <td class="ev-journey__num">
                  {{ amount(receipt.amountMinor, deposit.currencyCode) }}
                </td>
                <td>{{ instant(receipt.createdAtUtc) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>

    <!-- ---- run sheet ---------------------------------------------------------------------- -->
    <section class="ev-journey__section">
      <h3>{{ $i('ev_runsheet_heading') }}</h3>
      <!-- The run sheet is the ONE facet with an admin GET, so it is the one that can honestly say
           "there is none yet" — `EVENTS_RUNSHEET_NOT_FOUND` is an answer. Not-yet-asked stays unknown. -->
      <p v-if="runSheet.state === FACET_NONE" class="ev-journey__notice">
        {{ $i('ev_runsheet_none') }}
      </p>
      <p v-else-if="runSheet.state === FACET_GATED" class="ev-journey__notice">
        {{ $i('ev_runsheet_gated') }}
      </p>
      <p v-else-if="runSheet.state === FACET_UNKNOWN" class="ev-journey__notice ev-journey__notice--warn">
        {{ $i('ev_runsheet_unknown') }}<span v-if="runSheet.detail"> {{ runSheet.detail }}</span>
      </p>
      <!-- Only a HELD projection is drawn. An unhandled state renders nothing rather than
           reaching for a view that is not there. -->
      <template v-else-if="runSheet.state === FACET_HELD">
        <dl class="ev-journey__facts">
          <div><dt>{{ $i('ev_runsheet_version') }}</dt><dd>{{ count(runSheet.view.versionNo) }}</dd></div>
          <div><dt>{{ $i('ev_runsheet_status') }}</dt><dd>{{ runSheet.view.status || unknownMark }}</dd></div>
          <div><dt>{{ $i('ev_runsheet_from') }}</dt><dd>{{ count(runSheet.view.generatedFromProposalVersionNo) }}</dd></div>
          <div><dt>{{ $i('ev_runsheet_issued_by') }}</dt><dd>{{ authorLabel(runSheet.view.issuedByUserId) }}</dd></div>
          <div><dt>{{ $i('ev_runsheet_issued_at') }}</dt><dd>{{ instant(runSheet.view.issuedAtUtc) }}</dd></div>
        </dl>
        <p v-if="runSheet.view.isStale" class="ev-journey__notice ev-journey__notice--warn">
          {{ $i('ev_runsheet_stale') }}
        </p>
        <ul v-if="runSheetItems.length" class="ev-journey__items">
          <li v-for="(item, index) in runSheetItems" :key="index">
            <span class="ev-journey__chip">{{ item.section || unknownMark }}</span>
            <span v-if="item.timeLabel" class="ev-journey__item-time">{{ item.timeLabel }}</span>
            {{ item.body || unknownMark }}
            <span v-if="item.quantityLabel" class="ev-journey__hint">{{ item.quantityLabel }}</span>
          </li>
        </ul>
      </template>
    </section>

    <!-- ---- settlement --------------------------------------------------------------------- -->
    <section class="ev-journey__section">
      <h3>{{ $i('ev_settlement_heading') }}</h3>
      <p v-if="settlement.state === FACET_NONE" class="ev-journey__notice">
        {{ $i('ev_settlement_none') }}
      </p>
      <p v-else-if="settlement.state === FACET_GATED" class="ev-journey__notice ev-journey__notice--warn">
        {{ $i('ev_settlement_gated') }}
      </p>
      <p v-else-if="settlement.state === FACET_UNKNOWN" class="ev-journey__notice ev-journey__notice--warn">
        {{ $i('ev_settlement_unknown') }}<span v-if="settlement.detail"> {{ settlement.detail }}</span>
      </p>
      <!-- Only a HELD projection is drawn. An unhandled state renders nothing rather than
           reaching for a view that is not there. -->
      <template v-else-if="settlement.state === FACET_HELD">
        <dl class="ev-journey__facts">
          <div><dt>{{ $i('ev_settlement_status') }}</dt><dd>{{ settlement.view.status || unknownMark }}</dd></div>
          <!-- The server's own line-sum. Nothing is netted off it; the wire carries no sign convention
               that would say which kinds subtract. See ev_settlement_no_balance. -->
          <div><dt>{{ $i('ev_settlement_total') }}</dt><dd>{{ amount(settlement.view.statementTotalMinor, null) }}</dd></div>
          <div><dt>{{ $i('ev_settlement_reconciled') }}</dt><dd>{{ instant(settlement.view.reconciledAtUtc) }}</dd></div>
          <div><dt>{{ $i('ev_settlement_closed') }}</dt><dd>{{ instant(settlement.view.closedAtUtc) }}</dd></div>
          <div><dt>{{ $i('ev_settlement_closed_by') }}</dt><dd>{{ authorLabel(settlement.view.closedByUserId) }}</dd></div>
        </dl>
        <p class="ev-journey__hint">
          {{ $i('ev_settlement_no_balance') }}
        </p>
        <table v-if="settlementLines.length" class="ev-journey__table">
          <thead>
            <tr>
              <th>{{ $i('ev_line_no') }}</th>
              <th>{{ $i('ev_line_kind') }}</th>
              <th>{{ $i('ev_settlement_source') }}</th>
              <th class="ev-journey__num">
                {{ $i('ev_settlement_recorded') }}
              </th>
              <th class="ev-journey__num">
                {{ $i('ev_settlement_truth') }}
              </th>
              <th>{{ $i('ev_settlement_match') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in settlementLines" :key="line.lineNo">
              <td>{{ count(line.lineNo) }}</td>
              <td>{{ line.kind || unknownMark }}</td>
              <td><code>{{ line.sourceReference || unknownMark }}</code></td>
              <td class="ev-journey__num">
                {{ amount(line.amountMinor, null) }}
              </td>
              <!-- Truth is null until a reconcile has fetched it. Null is a dash, never a repeat of
                   the recorded amount and never a zero — an unverified line must not read as matched. -->
              <td class="ev-journey__num">
                {{ amount(line.truthAmountMinor, null) }}
              </td>
              <td>{{ line.matchState || unknownMark }}</td>
            </tr>
          </tbody>
        </table>
      </template>
    </section>

    <!-- ---- activity ----------------------------------------------------------------------- -->
    <section class="ev-journey__section">
      <h3>{{ $i('ev_activity_heading') }}</h3>
      <p v-if="!transitions.length" class="ev-journey__notice">
        {{ $i('ev_activity_none') }}
      </p>
      <ul v-else class="ev-journey__items">
        <li v-for="(row, index) in transitions" :key="index">
          <span class="ev-journey__item-time">{{ instant(row.createdAtUtc) }}</span>
          <span class="ev-journey__chip">{{ row.action || unknownMark }}</span>
          {{ (row.fromStatus || $i('ev_activity_from_none')) + ' → ' + (row.toStatus || unknownMark) }}
          <span class="ev-journey__hint">{{ row.actorKind || unknownMark }}</span>
          <span v-if="row.reasonCode" class="ev-journey__hint">{{ row.reasonCode }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script>
import {
  FACET_GATED,
  FACET_UNKNOWN,
  FACET_HELD,
  FACET_NONE,
  STATUS_ABSENT,
  STATUS_UNRECOGNISED,
  AUTHOR_NONE,
  buildPhaseRail,
  readEventStatus,
  readAuthor,
  readMinor,
  eventDateKey,
  clockLabel,
  readInstant
} from '~/utils/events/journey';

// One event, read out. Purely presentational: every panel renders a state its page resolved, and the
// component owns no fetching and no actions, so the honesty rules it draws are testable without a
// network and without a click.
//
// Every panel below is filled by a READ, so a fresh page load shows the same thing the tab that made
// the change shows. An absence drawn here is one the server established, not one assumed from having
// nothing in hand.
export default {
  name: 'EventsJourney',
  props: {
    // `EventsEventDetailView`.
    detail: {
      type: Object,
      required: true
    },
    // `readDeposits` shape: `{ state, rows, code, detail }` — a LIST, because an event accumulates
    // deposits across a cancel-and-reissue and the newest is not automatically the relevant one.
    deposits: {
      type: Object,
      required: true
    },
    // `readSettlement` / `readRunSheet` shapes: `{ state, view, code, detail }`.
    settlement: {
      type: Object,
      required: true
    },
    runSheet: {
      type: Object,
      required: true
    },
    locale: {
      type: String,
      default: 'no'
    },
    // The ISO code this admin's money formatter prints (the market's own currency). Money the API
    // priced in ANY OTHER currency is rendered with its code and without a symbol, because printing
    // "kr" over a CHF amount relabels money. Null disables the comparison rather than guessing.
    currency: {
      type: String,
      default: null
    }
  },
  data () {
    return {
      unknownMark: '—',
      FACET_GATED,
      FACET_UNKNOWN,
      FACET_HELD,
      FACET_NONE,
      STATUS_ABSENT,
      STATUS_UNRECOGNISED
    };
  },
  computed: {
    status () {
      return readEventStatus(this.detail.status);
    },
    rail () {
      return buildPhaseRail(this.detail.status);
    },
    versions () {
      return Array.isArray(this.detail.versions) ? this.detail.versions : [];
    },
    transitions () {
      return Array.isArray(this.detail.transitions) ? this.detail.transitions : [];
    },
    settlementLines () {
      const view = this.settlement.view;
      return view && Array.isArray(view.lines) ? view.lines : [];
    },
    runSheetItems () {
      const view = this.runSheet.view;
      return view && Array.isArray(view.items) ? view.items : [];
    },
    // The venue's own zone, off the event. There is no fallback to the browser's: an instant this
    // surface cannot place is left unplaced rather than shown in whatever zone the laptop is set to.
    zoneId () {
      return this.detail.timeZoneId || null;
    },
    dayLabel () {
      const key = eventDateKey(this.detail.eventDate);
      if (!key) { return this.unknownMark; }
      const parts = key.split('-');
      const date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
      if (isNaN(date.getTime())) { return this.unknownMark; }
      return new Intl.DateTimeFormat(this.locale, {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
      }).format(date);
    },
    timeLabel () {
      const from = clockLabel(this.detail.startTime);
      const to = clockLabel(this.detail.endTime);
      if (!from && !to) { return this.unknownMark; }
      return (from || this.unknownMark) + '–' + (to || this.unknownMark);
    },
    contactLabel () {
      const parts = [this.detail.contactName, this.detail.contactEmail, this.detail.contactPhone]
        .filter(part => typeof part === 'string' && part.trim());
      return parts.length ? parts.join(' · ') : this.unknownMark;
    }
  },
  methods: {
    count (value) {
      return value === null || value === undefined ? this.unknownMark : String(value);
    },

    /**
     * The guest-facing address for a token, as an ABSOLUTE url when this build knows its own origin
     * and as a bare path when it does not (server render, or a test host with no `window`).
     *
     * The origin is the BROWSER's, not `EventsSettings.PublicBaseUrl`: that setting is the mail
     * composer's and is not exposed by any API this surface can read. They agree in a normal
     * deployment, and where they do not, the address a member of staff can copy out of their own
     * browser is the one that works for the venue that is looking at it.
     */
    guestLink (kind, token) {
      const origin = typeof window !== 'undefined' && window.location ? window.location.origin : '';
      return origin + '/events/' + kind + '/' + token;
    },
    linesOf (version) {
      return Array.isArray(version.lines) ? version.lines : [];
    },
    receiptsOf (deposit) {
      return Array.isArray(deposit.receipts) ? deposit.receipts : [];
    },

    /**
     * A `…AtUtc` stamp in the VENUE's zone.
     *
     * Column-loaded stamps come off EF as `Unspecified` and serialise bare, so `parseApiInstant` reads
     * them as the UTC they are — `new Date(iso)` would read them as browser-local and slide every
     * stamp by the viewer's own offset. Without the event's zone nothing is placed: the stamp is
     * withheld rather than shown in the browser's.
     */
    instant (value) {
      const parsed = readInstant(value);
      if (!parsed || !this.zoneId) { return this.unknownMark; }
      return new Intl.DateTimeFormat(this.locale, {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: this.zoneId
      }).format(parsed);
    },

    /**
     * Integer minor units through the admin's OWN money formatter — `priceLabel` on the global mixin.
     * No formatting is reimplemented here. When the API priced the figure in some other currency the
     * symbol is withheld and the ISO code shown instead, because a wrong symbol is a wrong amount.
     *
     * A figure that did not arrive as an integer, or did not arrive at all, is a dash. Not a zero.
     */
    amount (minor, currency) {
      const value = readMinor(minor);
      if (value === null) { return this.unknownMark; }
      if (currency && this.currency && currency !== this.currency) {
        return this.wholeAmount(value) + ',' + this.fractionAmount(value) + ' ' + currency;
      }
      return this.priceLabel(value);
    },

    // An absent author is an ordinary value, not a defect to dress up: rows written before the claim
    // fix in `a69edf41` have none. It reads as "no author recorded" — never "Unknown user", which
    // would assert a user record, and never an empty string, which would look like a bug.
    authorLabel (userId) {
      const author = readAuthor(userId);
      return author.state === AUTHOR_NONE
        ? this.unknownMark + ' ' + this.$i('ev_author_none')
        : this.$i('ev_author_reference', { reference: author.reference });
    }
  }
};
</script>

<style scoped>
.ev-journey__rail { display: flex; flex-wrap: wrap; gap: 6px; list-style: none; margin: 0 0 16px; padding: 0; }
.ev-journey__node { padding: 4px 10px; border-radius: 6px; background: #f1f5f9; color: #94a3b8; font-size: 0.8em; }
.ev-journey__node--done { background: #dcfce7; color: #166534; }
.ev-journey__node--current { background: #1bb776; color: #fff; font-weight: 600; }
.ev-journey__section { margin-bottom: 24px; }
.ev-journey__section h3 { font-size: 1.1em; font-weight: 600; color: #292c34; margin: 0 0 10px; }
.ev-journey__facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 0 0 10px; }
.ev-journey__facts dt { font-size: 0.75em; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; }
.ev-journey__facts dd { margin: 2px 0 0; color: #292c34; font-size: 0.95em; }
.ev-journey__notice { margin: 0 0 10px; padding: 12px; background: #f8f9fa; border-radius: 8px; color: #64748b; font-size: 0.9em; }
.ev-journey__notice--warn { background: #fff7ed; color: #92400e; }
.ev-journey__version { padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; }
.ev-journey__version-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.ev-journey__chip { display: inline-block; padding: 2px 8px; border-radius: 6px; background: #f1f5f9; font-size: 0.8em; color: #64748b; }
.ev-journey__chip--ok { background: #dcfce7; color: #166534; }
.ev-journey__table { width: 100%; border-collapse: collapse; font-size: 0.85em; margin-top: 8px; }
.ev-journey__table th { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; }
.ev-journey__table td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; }
.ev-journey__num { text-align: right; }
.ev-journey__handover { margin: 8px 0 0; font-size: 0.85em; word-break: break-all; }
.ev-journey__handover-label { font-weight: 600; margin-right: 6px; }
.ev-journey__hint { display: block; color: #64748b; font-size: 0.8em; font-style: italic; margin-top: 4px; }
.ev-journey__items { list-style: none; margin: 0; padding: 0; font-size: 0.85em; }
.ev-journey__items li { padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
.ev-journey__item-time { color: #64748b; margin-right: 8px; }
</style>

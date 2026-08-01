<template>
  <AdminPage full-width @login-success="init">
    <div class="ev-page">
      <div class="ev-page__header">
        <h1 class="ev-page__title">
          {{ $i('ev_page_title') }}
        </h1>
        <p class="ev-page__intro">
          {{ $i('ev_page_intro') }}
        </p>
      </div>

      <transition name="ev-toast">
        <div v-if="toast.show" class="ev-page__toast" :class="'ev-page__toast--' + toast.type">
          {{ toast.message }}
        </div>
      </transition>

      <!-- A refused action answers with the status the server actually holds and the transitions that
           ARE legal from it. Both are shown verbatim: this surface keeps no copy of the state machine,
           so the server is the only thing that ever says what is permitted. -->
      <div v-if="refusal" class="ev-page__refusal">
        <strong>{{ refusalHeading }}</strong>
        <p>{{ refusal.message }}</p>
        <p v-if="refusal.currentStatus" class="ev-page__refusal-detail">
          {{ $i('ev_refusal_current', { status: refusal.currentStatus }) }}
        </p>
        <p v-if="refusal.permittedActions && refusal.permittedActions.length" class="ev-page__refusal-detail">
          {{ $i('ev_refusal_permitted', { actions: refusal.permittedActions.join(', ') }) }}
        </p>
        <p v-else-if="refusal.permittedActions" class="ev-page__refusal-detail">
          {{ $i('ev_refusal_permitted_none') }}
        </p>
        <!-- Shown only for the two concurrency codes, and only because the page has already
             re-read the settlement — so the revision on screen is current and a second press is a
             thing that can actually succeed. -->
        <p v-if="refusalIsRetryable" class="ev-page__refusal-detail" data-test="refusal-retry">
          {{ $i('ev_refusal_retry') }}
        </p>
        <button class="ev-page__btn ev-page__btn--ghost" @click="refusal = null">
          {{ $i('ev_dismiss') }}
        </button>
      </div>

      <div class="ev-page__controls">
        <label class="ev-page__field">
          <span>{{ $i('ev_col_status') }}</span>
          <select v-model="filters.status" :disabled="loading" @change="loadPipeline">
            <option value="">{{ $i('ev_filter_status_all') }}</option>
            <option v-for="phase in allStatuses" :key="phase" :value="phase">{{ $i('ev_status_' + phase) }}</option>
          </select>
        </label>
        <label class="ev-page__field">
          <span>{{ $i('ev_filter_from') }}</span>
          <input v-model="filters.from" type="date" :disabled="loading" @change="loadPipeline">
        </label>
        <label class="ev-page__field">
          <span>{{ $i('ev_filter_to') }}</span>
          <input v-model="filters.to" type="date" :disabled="loading" @change="loadPipeline">
        </label>
        <button class="ev-page__btn ev-page__btn--ghost" :disabled="loading" @click="loadPipeline">
          {{ $i('ev_reload') }}
        </button>
        <button class="ev-page__btn" :disabled="busy" @click="showCreate = !showCreate">
          {{ $i('ev_action_create') }}
        </button>
      </div>

      <!-- ---- new event ------------------------------------------------------------------- -->
      <form v-if="showCreate" class="ev-page__form" @submit.prevent="createEvent">
        <h3>{{ $i('ev_create_heading') }}</h3>
        <p class="ev-page__hint">
          {{ $i('ev_create_hint') }}
        </p>
        <div class="ev-page__form-grid">
          <label class="ev-page__field"><span>{{ $i('ev_field_title') }}</span><input v-model="draftEvent.title" type="text"></label>
          <label class="ev-page__field"><span>{{ $i('ev_field_date') }}</span><input v-model="draftEvent.eventDate" type="date" required></label>
          <label class="ev-page__field"><span>{{ $i('ev_field_start') }}</span><input v-model="draftEvent.startTime" type="time"></label>
          <label class="ev-page__field"><span>{{ $i('ev_field_end') }}</span><input v-model="draftEvent.endTime" type="time"></label>
          <label class="ev-page__field"><span>{{ $i('ev_field_guests') }}</span><input v-model.number="draftEvent.guestCountPlanned" type="number" min="1" required></label>
          <label class="ev-page__field"><span>{{ $i('ev_field_contact_name') }}</span><input v-model="draftEvent.contactName" type="text" required></label>
          <label class="ev-page__field"><span>{{ $i('ev_field_contact_email') }}</span><input v-model="draftEvent.contactEmail" type="email" required></label>
          <label class="ev-page__field"><span>{{ $i('ev_field_contact_phone') }}</span><input v-model="draftEvent.contactPhone" type="text"></label>
          <label class="ev-page__field"><span>{{ $i('ev_field_company') }}</span><input v-model="draftEvent.companyName" type="text"></label>
        </div>
        <button class="ev-page__btn" type="submit" :disabled="busy">
          {{ $i('ev_action_create_submit') }}
        </button>
      </form>

      <!-- ---- guest links that never arrived ---------------------------------------------- -->
      <div class="ev-page__panel">
        <h2>{{ $i('ev_notify_heading') }}</h2>
        <p v-if="notificationFacet.state === FACET_HELD" class="ev-page__notice" data-test="notify-dispatch">
          <!-- Dispatch off is the state an empty list would otherwise report as "all clear": with the
               drain stopped nothing can fail, because nothing is being delivered at all. The queued
               count is what makes that legible, so it is printed with it and not instead of it. -->
          {{ notificationFacet.view.dispatchEnabled
            ? $i('ev_notify_dispatch_on', { queued: notificationFacet.view.queuedCount })
            : $i('ev_notify_dispatch_off', { queued: notificationFacet.view.queuedCount }) }}
        </p>
        <p v-else-if="notificationFacet.state === FACET_GATED" class="ev-page__notice">
          {{ $i('ev_notify_gated') }}
        </p>
        <p v-else class="ev-page__notice ev-page__notice--warn">
          {{ $i('ev_notify_unknown') }}
        </p>

        <template v-if="notificationFacet.state === FACET_HELD">
          <p v-if="!deadLetteredRows.length" class="ev-page__notice" data-test="notify-none">
            {{ $i('ev_notify_none') }}
          </p>
          <template v-else>
            <!-- The count is reported separately from the list because the list is capped: when the
                 cap bites the two differ, and a bare list would hide how much it is hiding. -->
            <p v-if="notificationFacet.view.deadLetteredCount > deadLetteredRows.length" class="ev-page__notice ev-page__notice--warn">
              {{ $i('ev_notify_truncated', { shown: deadLetteredRows.length, total: notificationFacet.view.deadLetteredCount }) }}
            </p>
            <ul class="ev-page__deadletters">
              <li v-for="row in deadLetteredRows" :key="row.notificationOutboxId">
                <span>{{ row.kind }} · {{ row.eventTitle || '—' }} · {{ row.attemptCount }}/{{ row.maxAttempts }}</span>
                <!-- The redacted failure label. It is the one field that says whether requeueing can
                     possibly help, and it never carries the address or the token. -->
                <span class="ev-page__hint">{{ row.lastError || $i('ev_notify_no_error') }}</span>
                <button class="ev-page__btn ev-page__btn--ghost" :disabled="busy" @click="requeueNotification(row.notificationOutboxId)">
                  {{ $i('ev_action_requeue') }}
                </button>
              </li>
            </ul>
          </template>
        </template>
      </div>

      <!-- ---- pipeline -------------------------------------------------------------------- -->
      <div class="ev-page__panel">
        <h2>{{ $i('ev_pipeline_heading') }}</h2>
        <EventsPipeline
          :listing="listing"
          :locale="locale"
          :selected-id="selectedId"
          @select="selectEvent"
        />
      </div>

      <!-- ---- one event ------------------------------------------------------------------- -->
      <!-- `--journey` is not decoration: it is the one panel the print rules at the foot of this
           file let through, and everything else on the page — including the notification panel,
           which lists guests whose link never arrived — is taken off the paper by default. -->
      <div v-if="selectedId" class="ev-page__panel ev-page__panel--journey">
        <h2>{{ $i('ev_journey_heading') }}</h2>

        <p v-if="detailRead.state === READ_UNKNOWN" class="ev-page__notice ev-page__notice--warn">
          {{ $i('ev_detail_unknown') }}<span v-if="detailRead.code"> ({{ detailRead.code }})</span>
        </p>
        <p v-else-if="detailRead.state === READ_DISABLED" class="ev-page__notice">
          {{ $i('ev_pipeline_disabled') }}
        </p>
        <p v-else-if="detailRead.state === READ_FORBIDDEN" class="ev-page__notice ev-page__notice--warn">
          {{ $i('ev_pipeline_forbidden') }}
        </p>

        <template v-else>
          <EventsJourney
            :detail="detailRead.view"
            :deposits="depositsFacet"
            :settlement="settlementFacet"
            :run-sheet="runSheetFacet"
            :locale="locale"
            :currency="currency"
            @print-unavailable="notify($i('ev_runsheet_print_unavailable'), 'error')"
          />

          <!-- ---- actions --------------------------------------------------------------- -->
          <div class="ev-page__actions">
            <h3>{{ $i('ev_actions_heading') }}</h3>

            <!-- Every action is offered against the status the SERVER reported, compared by equality.
                 Nothing is derived from the version list or from the transitions; those correlate with
                 the lifecycle and are each a way to get it wrong. -->
            <div class="ev-page__actionrow">
              <button
                v-if="statusIs('Inquiry') || statusIs('Proposing') || statusIs('ProposalSent') || statusIs('Accepted')"
                class="ev-page__btn"
                :disabled="busy"
                @click="showProposal = !showProposal"
              >
                {{ $i('ev_action_draft') }}
              </button>
              <button
                v-if="draftVersionNo"
                class="ev-page__btn"
                :disabled="busy"
                @click="sendVersion(draftVersionNo)"
              >
                {{ $i('ev_action_send', { no: draftVersionNo }) }}
              </button>
              <button
                v-if="statusIs('Inquiry') || statusIs('Proposing') || statusIs('ProposalSent')"
                class="ev-page__btn ev-page__btn--ghost"
                :disabled="busy"
                @click="markLost"
              >
                {{ $i('ev_action_mark_lost') }}
              </button>
              <button
                v-if="statusIs('Accepted')"
                class="ev-page__btn"
                :disabled="busy"
                @click="issueDeposit"
              >
                {{ $i('ev_action_issue_deposit', { rail: depositRail }) }}
              </button>
              <button
                v-if="cancellableDeposit"
                class="ev-page__btn ev-page__btn--ghost"
                :disabled="busy"
                @click="cancelDeposit"
              >
                {{ $i('ev_action_cancel_deposit') }}
              </button>
              <button
                v-if="statusIs('Confirmed')"
                class="ev-page__btn"
                :disabled="busy"
                @click="startService"
              >
                {{ $i('ev_action_start_service') }}
              </button>
              <!-- Offered in every state, like the note log and for the same reason: the allergy that
                   arrives on the morning of service arrives long after the last transition. -->
              <button class="ev-page__btn ev-page__btn--ghost" :disabled="busy" @click="toggleDietary">
                {{ $i('ev_action_dietary') }}
              </button>
              <button class="ev-page__btn ev-page__btn--ghost" :disabled="busy" @click="generateRunSheet">
                {{ $i('ev_action_runsheet') }}
              </button>
              <button
                v-if="statusIs('InService')"
                class="ev-page__btn"
                :disabled="busy"
                @click="closeEvent"
              >
                {{ $i('ev_action_close') }}
              </button>
              <!-- The invoice line. Offered against the SETTLEMENT's own state, not the event's:
                   a statement takes lines until T13 closes it. -->
              <button
                v-if="settlementIsOpen"
                class="ev-page__btn ev-page__btn--ghost"
                :disabled="busy"
                @click="showLine = !showLine"
              >
                {{ $i('ev_action_add_settlement_line') }}
              </button>
              <button
                v-if="statusIs('Settling')"
                class="ev-page__btn"
                :disabled="busy"
                @click="reconcile"
              >
                {{ $i('ev_action_reconcile') }}
              </button>
              <button
                v-if="statusIs('Settling')"
                class="ev-page__btn"
                :disabled="busy"
                @click="closeSettlement"
              >
                {{ $i('ev_action_close_settlement') }}
              </button>
              <button class="ev-page__btn ev-page__btn--ghost" :disabled="busy" @click="showCancel = !showCancel">
                {{ $i('ev_action_cancel_event') }}
              </button>
            </div>

            <p class="ev-page__hint">
              {{ $i('ev_accept_note') }}
            </p>
            <p class="ev-page__hint">
              {{ $i('ev_deposit_rail_note', { wired: depositRailsWired, unwired: depositRailsUnwired }) }}
            </p>
            <p class="ev-page__hint">
              {{ $i('ev_settlement_gate_note') }}
            </p>
          </div>

          <!-- ---- a settlement line ------------------------------------------------------- -->
          <form v-if="showLine" class="ev-page__form" @submit.prevent="addSettlementLine">
            <h3>{{ $i('ev_line_heading') }}</h3>
            <p class="ev-page__hint">
              {{ $i('ev_line_generated_note') }}
            </p>
            <div class="ev-page__form-grid">
              <label class="ev-page__field">
                <span>{{ $i('ev_line_kind') }}</span>
                <select v-model="draftLine.kind">
                  <option v-for="kind in settlementLineKinds" :key="kind" :value="kind">{{ kind }}</option>
                </select>
              </label>
              <label class="ev-page__field"><span>{{ $i('ev_line_amount') }}</span><input v-model="draftLine.amount" type="text" inputmode="decimal"></label>
              <label class="ev-page__field"><span>{{ $i('ev_line_source_ref') }}</span><input v-model="draftLine.sourceReference" type="text"></label>
              <label class="ev-page__field"><span>{{ $i('ev_line_note') }}</span><input v-model="draftLine.note" type="text"></label>
              <label v-if="draftLine.kind === 'Adjustment'" class="ev-page__field">
                <span>{{ $i('ev_line_adjustment_reason') }}</span>
                <input v-model="draftLine.adjustmentReason" type="text">
              </label>
            </div>
            <p v-if="lineBlocked" class="ev-page__notice ev-page__notice--warn" data-test="line-blocked">
              {{ lineBlocked }}
            </p>
            <button class="ev-page__btn" type="submit" :disabled="busy || !!lineBlocked">
              {{ $i('ev_action_add_settlement_line_submit') }}
            </button>
          </form>

          <!-- ---- dietary requirement ----------------------------------------------------- -->
          <form v-if="showDietary" class="ev-page__form" @submit.prevent="recordDietary">
            <h3>{{ $i('ev_dietary_heading') }}</h3>
            <!-- The rule the field is useless without: a blank is "never asked", so an absence has to
                 be written in words. The server refuses an empty statement; this says why first. -->
            <p class="ev-page__hint">
              {{ $i('ev_dietary_note') }}
            </p>
            <label class="ev-page__field">
              <span>{{ $i('ev_dietary_statement') }}</span>
              <textarea v-model="draftDietary" rows="3" data-test="dietary-statement" />
            </label>
            <p v-if="dietaryStatedAt" class="ev-page__hint" data-test="dietary-stated">
              {{ $i('ev_dietary_stated', { at: dietaryStatedAt }) }}
            </p>
            <p class="ev-page__hint">
              {{ $i('ev_dietary_reissue_note') }}
            </p>
            <button class="ev-page__btn" type="submit" :disabled="busy || !draftDietary.trim()">
              {{ $i('ev_action_dietary_submit') }}
            </button>
          </form>

          <!-- ---- refund ------------------------------------------------------------------ -->
          <form v-if="refundableDeposit" class="ev-page__form" @submit.prevent="refundDeposit">
            <h3>{{ $i('ev_refund_heading') }}</h3>
            <p class="ev-page__hint">
              {{ $i('ev_refund_note') }}
            </p>
            <div class="ev-page__form-grid">
              <label class="ev-page__field"><span>{{ $i('ev_refund_amount') }}</span><input v-model="draftRefund.amount" type="text" inputmode="decimal"></label>
            </div>
            <p v-if="refundBlocked" class="ev-page__notice ev-page__notice--warn" data-test="refund-blocked">
              {{ refundBlocked }}
            </p>
            <button class="ev-page__btn" type="submit" :disabled="busy || !!refundBlocked">
              {{ $i('ev_action_refund_submit') }}
            </button>
          </form>

          <!-- ---- cancel ------------------------------------------------------------------ -->
          <form v-if="showCancel" class="ev-page__form" @submit.prevent="cancelEvent">
            <h3>{{ $i('ev_cancel_heading') }}</h3>
            <div class="ev-page__form-grid">
              <label class="ev-page__field"><span>{{ $i('ev_cancel_reason') }}</span><input v-model="draftCancel.reason" type="text"></label>
              <label class="ev-page__field">
                <span>{{ $i('ev_cancel_resolution') }}</span>
                <!-- Empty by default and empty is sent as nothing: with a paid deposit the server
                     refuses rather than choosing, which is the only honest outcome. -->
                <select v-model="draftCancel.resolution">
                  <option value="">{{ $i('ev_cancel_resolution_none') }}</option>
                  <option v-for="resolution in depositResolutions" :key="resolution" :value="resolution">
                    {{ $i('ev_cancel_resolution_' + resolution.toLowerCase()) }}
                  </option>
                </select>
              </label>
            </div>
            <p class="ev-page__hint">
              {{ $i('ev_cancel_resolution_note') }}
            </p>
            <button class="ev-page__btn" type="submit" :disabled="busy">
              {{ $i('ev_action_cancel_event_submit') }}
            </button>
          </form>

          <!-- ---- proposal draft form --------------------------------------------------- -->
          <form v-if="showProposal" class="ev-page__form" @submit.prevent="createProposal">
            <h3>{{ $i('ev_proposal_heading') }}</h3>
            <div class="ev-page__form-grid">
              <label class="ev-page__field"><span>{{ $i('ev_field_currency') }}</span><input v-model="draftProposal.currencyCode" type="text" maxlength="3"></label>
              <label class="ev-page__field"><span>{{ $i('ev_version_minimum') }}</span><input v-model="draftProposal.minimumSpend" type="text" inputmode="decimal"></label>
              <label class="ev-page__field"><span>{{ $i('ev_version_roomfee') }}</span><input v-model="draftProposal.roomFee" type="text" inputmode="decimal"></label>
              <label class="ev-page__field"><span>{{ $i('ev_version_deposit') }}</span><input v-model="draftProposal.depositRequired" type="text" inputmode="decimal"></label>
              <label class="ev-page__field"><span>{{ $i('ev_field_expiry_day') }}</span><input v-model="draftProposal.expiryDay" type="date"></label>
            </div>
            <p class="ev-page__hint">
              {{ $i('ev_field_expiry_hint', { zone: venueZone || '—' }) }}
            </p>
            <label class="ev-page__field"><span>{{ $i('ev_field_terms') }}</span><textarea v-model="draftProposal.termsText" rows="2" /></label>

            <div v-for="(line, index) in draftProposal.lines" :key="index" class="ev-page__form-grid">
              <label class="ev-page__field">
                <span>{{ $i('ev_line_kind') }}</span>
                <select v-model="line.kind">
                  <option v-for="kind in lineKinds" :key="kind" :value="kind">{{ kind }}</option>
                </select>
              </label>
              <label class="ev-page__field"><span>{{ $i('ev_line_desc') }}</span><input v-model="line.description" type="text"></label>
              <label class="ev-page__field"><span>{{ $i('ev_line_qty') }}</span><input v-model.number="line.quantity" type="number" min="0" step="1"></label>
              <label class="ev-page__field"><span>{{ $i('ev_line_unit') }}</span><input v-model="line.unitPrice" type="text" inputmode="decimal"></label>
              <label class="ev-page__field"><span>{{ $i('ev_line_vat') }}</span><input v-model.number="line.vatRate" type="number" min="0" max="1" step="0.01"></label>
            </div>
            <button class="ev-page__btn ev-page__btn--ghost" type="button" @click="addLine">
              {{ $i('ev_action_add_line') }}
            </button>
            <p v-if="moneyFieldsRejected.length" class="ev-page__notice ev-page__notice--warn">
              {{ $i('ev_money_rejected', { fields: moneyFieldsRejected.join(', ') }) }}
            </p>
            <button class="ev-page__btn" type="submit" :disabled="busy || moneyFieldsRejected.length > 0">
              {{ $i('ev_action_draft_submit') }}
            </button>
          </form>
        </template>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import EventsPipeline from '~/components/admin/events/EventsPipeline.vue';
import EventsJourney from '~/components/admin/events/EventsJourney.vue';
import {
  EventsService,
  isEventsApiError,
  EVENTS_STATE,
  EVENTS_DISABLED,
  EVENTS_CONFLICT,
  EVENTS_REVISION_REQUIRED,
  EVENTS_SETTLEMENT_NOT_RECONCILED,
  EVENTS_NOTIFICATION_ALREADY_SENT
} from '~/utils/events/events-client';
import {
  READ_UNKNOWN,
  READ_DISABLED,
  READ_FORBIDDEN,
  READ_ANSWERED,
  FACET_HELD,
  FACET_GATED,
  PHASE_SEQUENCE,
  OFF_RAMPS,
  DEPOSIT_RAIL_VIPPS,
  DEPOSIT_RAILS_WIRED,
  DEPOSIT_RAILS_UNWIRED,
  CANCELLABLE_DEPOSIT_STATUSES,
  REFUNDABLE_DEPOSIT_STATUSES,
  readListing,
  readDetail,
  readDeposits,
  readSettlement,
  readRunSheet,
  readNotificationHealth,
  readEventStatus,
  actionableDeposit,
  parseMinorUnits,
  proposalExpiryParam
} from '~/utils/events/journey';

// `EventsProposalLineKind` — the server `Enum.TryParse`s this name and answers EVENTS_VALIDATION for
// anything else, so the field is a closed list here rather than free text.
const LINE_KINDS = ['Package', 'MenuItem', 'AddOn', 'RoomFee', 'Custom'];

// The only two settlement line kinds a caller may author. `DepositApplied` and `PosCheck` are
// GENERATED by close and by pos-links, and `AddLineAsync` refuses either here — so they are not
// offered. `Refund` exists in the enum and is refused as well.
const SETTLEMENT_LINE_KINDS = ['Invoice', 'Adjustment'];

// `EventsDepositResolution` — what the server does with a PAID deposit when the event is cancelled.
// There is no default: cancelling with money held and no instruction is refused, which is the right
// outcome, because either default would be this surface deciding about a guest's money.
const DEPOSIT_RESOLUTIONS = ['Refund', 'Forfeit'];

// The Events proving surface: one venue's pipeline, and one event walked from enquiry to settled.
// Reads and lifecycle actions only — the two steps a GUEST owns (accepting a proposal, paying a
// deposit) are not here and cannot be, because both are anonymous token routes.
//
// EVERY FACET IS RE-READ AFTER EVERY ACTION, and no projection is kept from a mutation's answer. That
// is not belt-and-braces: the deposit and the settlement each have an idempotent GET, the settlement's
// read is the ONLY place the `If-Match` token comes from, and a page that held the last answer instead
// would lose the token on reload and hold a figure the server has since moved.
export default {
  name: 'AdminEventsPipeline',
  components: { AdminPage, EventsPipeline, EventsJourney },
  data () {
    return {
      loading: false,
      busy: false,
      showCreate: false,
      showProposal: false,
      showLine: false,
      showCancel: false,
      showDietary: false,
      draftDietary: '',
      filters: { status: '', from: '', to: '' },
      listing: { state: READ_UNKNOWN, rows: null, code: null, detail: null },
      selectedId: null,
      detailRead: { state: READ_UNKNOWN, view: null, code: null, detail: null },
      // The RAW answers, kept exactly as the reads returned them and turned into states by the pure
      // readers in `~/utils/events/journey`. Null means the read has not answered — never "none",
      // which is a claim only an answered read can make.
      depositsRead: null,
      depositsError: null,
      settlementRead: null,
      settlementError: null,
      runSheetView: null,
      runSheetError: null,
      notificationRead: null,
      notificationError: null,
      refusal: null,
      lastFailure: null,
      draftEvent: newEventForm(),
      draftProposal: newProposalForm(),
      draftLine: newSettlementLineForm(),
      draftCancel: newCancelForm(),
      draftRefund: { amount: '' },
      toast: { show: false, message: '', type: 'success' },
      toastTimer: null,
      READ_UNKNOWN,
      READ_DISABLED,
      READ_FORBIDDEN,
      READ_ANSWERED,
      FACET_HELD,
      FACET_GATED
    };
  },
  computed: {
    storeId () {
      const selected = this.$store.state.selectedAdminStore;
      if (selected) { return selected; }
      const stores = (this.$store.state.currentUser && this.$store.state.currentUser.adminIn) || [];
      return stores.length ? stores[0].id : '';
    },
    locale () {
      return this.$store.state.adminLocale || 'no';
    },
    // The market is the single source for currency, and it is what `priceLabel` already formats in.
    currency () {
      return (this.marketConfig && this.marketConfig.currency) || null;
    },
    _eventsService () {
      return new EventsService(this._coreInitializer);
    },
    allStatuses () {
      return PHASE_SEQUENCE.concat(OFF_RAMPS);
    },
    lineKinds () {
      return LINE_KINDS;
    },
    settlementLineKinds () {
      return SETTLEMENT_LINE_KINDS;
    },
    depositResolutions () {
      return DEPOSIT_RESOLUTIONS;
    },
    depositRail () {
      return DEPOSIT_RAIL_VIPPS;
    },
    depositRailsWired () {
      return DEPOSIT_RAILS_WIRED.join(', ');
    },
    depositRailsUnwired () {
      return DEPOSIT_RAILS_UNWIRED.join(', ');
    },
    depositsFacet () {
      return readDeposits(this.depositsRead, this.depositsError);
    },
    settlementFacet () {
      return readSettlement(this.settlementRead, this.settlementError);
    },
    runSheetFacet () {
      return readRunSheet(this.runSheetView, this.runSheetError);
    },
    notificationFacet () {
      return readNotificationHealth(this.notificationRead, this.notificationError);
    },
    deadLetteredRows () {
      const view = this.notificationFacet.view;
      return view && Array.isArray(view.deadLettered) ? view.deadLettered : [];
    },
    // The settlement only when a read HELD one. A gated or failed read yields null, so nothing below
    // — including the `If-Match` token — can be taken off a state that is not a settlement.
    settlementView () {
      return this.settlementFacet.state === FACET_HELD ? this.settlementFacet.view : null;
    },
    detail () {
      return this.detailRead.state === READ_ANSWERED ? this.detailRead.view : null;
    },
    venueZone () {
      return this.detail ? this.detail.timeZoneId : null;
    },
    // What the venue currently has on record. Null means NOBODY HAS STATED ANYTHING — it is never
    // rendered as "no requirements", which is the claim this field exists to stop the sheet making.
    dietaryStatement () {
      return this.detail && this.detail.dietary ? this.detail.dietary.statement : null;
    },
    dietaryStatedAt () {
      const stated = this.detail && this.detail.dietary ? this.detail.dietary.statedAtUtc : null;
      return stated ? new Date(stated).toLocaleString(this.locale === 'no' ? 'nb-NO' : this.locale) : null;
    },
    // The newest Draft version, which is the one `send` (T3) would act on. Null when there is none —
    // the send button then has nothing to name and is not offered.
    draftVersionNo () {
      if (!this.detail || !Array.isArray(this.detail.versions)) { return null; }
      const drafts = this.detail.versions.filter(v => v.status === 'Draft');
      return drafts.length ? drafts[drafts.length - 1].versionNo : null;
    },
    // Chosen by STATUS off the deposit read, never by position and never from the event's lifecycle
    // status, which moves independently of the deposit's.
    cancellableDeposit () {
      return actionableDeposit(this.depositsFacet.rows, CANCELLABLE_DEPOSIT_STATUSES);
    },
    refundableDeposit () {
      return actionableDeposit(this.depositsFacet.rows, REFUNDABLE_DEPOSIT_STATUSES);
    },
    /**
     * The settlement's opaque revision, threaded straight back as `If-Match`, and taken from the READ
     * — which is the only call that supplies one.
     *
     * NULL IS AN ORDINARY VALUE HERE, not a fault: `revision` is a SQL Server `rowversion` and a
     * SQLite host has no such column, so the server sends none and its guard demands none. The client
     * sends no header at all in that case (`ifMatchHeader`), and the mutation proceeds. Refusing to
     * act without a token would leave every local run looking broken.
     */
    settlementRevision () {
      return this.settlementView ? this.settlementView.revision : null;
    },
    // A statement can take a line while it is open. `Closed` is terminal (T13 ran) and the server
    // refuses; the form is not offered rather than offering an action that cannot succeed.
    settlementIsOpen () {
      return !!this.settlementView && this.settlementView.status !== 'Closed';
    },
    // An Adjustment is justified only by its own free text, and the server requires it. Blocking the
    // submit here saves a round trip; the server stays the one that decides.
    lineBlocked () {
      const line = this.draftLine;
      if (parseMinorUnits(line.amount) === null) { return this.$i('ev_line_amount_needed'); }
      if (line.kind === 'Adjustment' && !String(line.adjustmentReason || '').trim()) {
        return this.$i('ev_line_reason_needed');
      }
      return '';
    },
    // A refund amount that cannot be read as money is not sent. The server also refuses zero and
    // negatives, and refuses more than remains unrefunded — none of which is second-guessed here.
    refundBlocked () {
      const minor = parseMinorUnits(this.draftRefund.amount);
      return minor === null || minor <= 0 ? this.$i('ev_refund_amount_needed') : '';
    },
    // Which typed money fields the operator's text could not be read as. Non-empty blocks the submit
    // rather than sending a coerced number nobody typed.
    moneyFieldsRejected () {
      const rejected = [];
      const check = (text, label) => {
        if (String(text || '').trim() && parseMinorUnits(text) === null) { rejected.push(label); }
      };
      check(this.draftProposal.minimumSpend, this.$i('ev_version_minimum'));
      check(this.draftProposal.roomFee, this.$i('ev_version_roomfee'));
      check(this.draftProposal.depositRequired, this.$i('ev_version_deposit'));
      this.draftProposal.lines.forEach((line, index) => {
        check(line.unitPrice, this.$i('ev_line_unit') + ' #' + (index + 1));
      });
      return rejected;
    },
    /**
     * The heading over a refusal, chosen on the CODE and never on the status.
     *
     * The two concurrency codes are the reason this list is not shorter. They used to be one 409
     * saying "re-read and retry", which for a request that carried no `If-Match` at all was advice
     * that could not be followed — the seed loop that proved it stalled at `settlement/lines` twice.
     * They now say two different things, and this surface says them: one is a lost race worth
     * repeating, the other is a precondition this page has since fetched.
     */
    refusalHeading () {
      if (!this.refusal) { return ''; }
      if (this.refusal.code === EVENTS_STATE) { return this.$i('ev_refusal_state'); }
      if (this.refusal.code === EVENTS_DISABLED) { return this.$i('ev_refusal_disabled'); }
      if (this.refusal.code === EVENTS_REVISION_REQUIRED) { return this.$i('ev_refusal_revision_required'); }
      if (this.refusal.code === EVENTS_CONFLICT) { return this.$i('ev_refusal_conflict'); }
      // T13 refuses a statement that has not been reconciled. It is the ordinary way to meet the
      // settlement tail out of order, and "the action was refused (EVENTS_SETTLEMENT_NOT_RECONCILED)"
      // does not tell an operator that the button beside it is the one to press.
      if (this.refusal.code === EVENTS_SETTLEMENT_NOT_RECONCILED) { return this.$i('ev_refusal_not_reconciled'); }
      // A requeue is refused for a link the guest DID receive — deliberately, because delivery is
      // not idempotent and the payload is a live credential. Pressing again cannot help.
      if (this.refusal.code === EVENTS_NOTIFICATION_ALREADY_SENT) { return this.$i('ev_refusal_notification_sent'); }
      return this.$i('ev_refusal_other', { code: this.refusal.code || '—' });
    },
    // Both concurrency refusals are recoverable by the same act, and the page has already performed
    // it — every settlement action re-reads the settlement afterwards, so the token on screen is
    // fresh. The instruction is therefore "press it again", and it is only shown when that is true.
    refusalIsRetryable () {
      return !!this.refusal &&
        (this.refusal.code === EVENTS_REVISION_REQUIRED || this.refusal.code === EVENTS_CONFLICT);
    }
  },
  watch: {
    storeId () { this.init(); }
  },
  mounted () {
    this.init();
  },
  beforeDestroy () {
    if (this.toastTimer) { clearTimeout(this.toastTimer); }
  },
  methods: {
    init () {
      this.selectedId = null;
      this.clearEventState();
      this.loadPipeline();
      this.loadNotificationHealth();
    },

    // Everything about the previously selected event goes back to UNKNOWN, never to empty. A stale
    // deposit or settlement left on screen would be this surface reporting another event's money.
    clearEventState () {
      this.detailRead = { state: READ_UNKNOWN, view: null, code: null, detail: null };
      this.depositsRead = null;
      this.depositsError = null;
      this.settlementRead = null;
      this.settlementError = null;
      this.runSheetView = null;
      this.runSheetError = null;
      this.lastFailure = null;
      this.showProposal = false;
      this.showLine = false;
      this.showCancel = false;
      this.draftProposal = newProposalForm();
      this.draftLine = newSettlementLineForm();
      this.draftCancel = newCancelForm();
      this.draftRefund = { amount: '' };
    },

    async loadPipeline () {
      if (!this.storeId) { return; }
      this.loading = true;
      // Cleared to unknown before the read, so a failure cannot leave the previous venue's rows up.
      this.listing = { state: READ_UNKNOWN, rows: null, code: null, detail: null };
      try {
        const rows = await this._eventsService.ListEvents(
          this.storeId, this.filters.status || null, this.filters.from || null, this.filters.to || null);
        this.listing = readListing(rows, null);
      } catch (e) {
        // The raw failure is passed on whether or not it is typed: an untyped one carries no `code`
        // and no 403, so it resolves to UNKNOWN — which is the honest answer for a read that fell over.
        this.listing = readListing(null, e);
        if (!isEventsApiError(e)) { this.notifyError(e); }
      } finally {
        this.loading = false;
      }
    },

    // Opening an enquiry reads every facet of it. All four are independent routes and none of them
    // needs another's answer, so they are issued together rather than in a chain.
    async selectEvent (eventId) {
      this.selectedId = eventId;
      this.clearEventState();
      await Promise.all([
        this.loadDetail(),
        this.loadRunSheet(),
        this.loadDeposits(),
        this.loadSettlement()
      ]);
    },

    async loadDetail () {
      if (!this.selectedId) { return; }
      try {
        const view = await this._eventsService.GetEvent(this.storeId, this.selectedId);
        this.detailRead = readDetail(view, null);
      } catch (e) {
        this.detailRead = readDetail(null, e);
        if (!isEventsApiError(e)) { this.notifyError(e); }
      }
    },

    async loadRunSheet () {
      if (!this.selectedId) { return; }
      this.runSheetView = null;
      this.runSheetError = null;
      try {
        this.runSheetView = await this._eventsService.GetRunSheet(this.storeId, this.selectedId, null);
      } catch (e) {
        this.runSheetError = e;
        if (!isEventsApiError(e)) { this.notifyError(e); }
      }
    },

    // The deposit history. Cleared to unknown before the read, so a failure cannot leave the previous
    // answer on screen looking current.
    async loadDeposits () {
      if (!this.selectedId) { return; }
      this.depositsRead = null;
      this.depositsError = null;
      try {
        this.depositsRead = await this._eventsService.ListDeposits(this.storeId, this.selectedId);
      } catch (e) {
        this.depositsError = e;
        if (!isEventsApiError(e)) { this.notifyError(e); }
      }
    },

    /**
     * The settlement, AND the `If-Match` token every settlement mutation needs.
     *
     * This is the call that makes the settlement tail work after a page reload: before it existed the
     * revision lived only in the answer to the last mutation, so a refresh lost it and there was no
     * safe call to recover it — `StartService` is the only near-idempotent one and it still moves a
     * `Confirmed` event.
     */
    async loadSettlement () {
      if (!this.selectedId) { return; }
      this.settlementRead = null;
      this.settlementError = null;
      try {
        this.settlementRead = await this._eventsService.GetSettlement(this.storeId, this.selectedId);
      } catch (e) {
        this.settlementError = e;
        if (!isEventsApiError(e)) { this.notifyError(e); }
      }
    },

    // Store-wide, not per event: a guest who was never told is found by watching the venue, not by
    // opening the one enquiry that happens to own the failed link.
    async loadNotificationHealth () {
      if (!this.storeId) { return; }
      this.notificationRead = null;
      this.notificationError = null;
      try {
        this.notificationRead = await this._eventsService.GetNotificationHealth(this.storeId);
      } catch (e) {
        this.notificationError = e;
      }
    },

    statusIs (phase) {
      if (!this.detail) { return false; }
      const read = readEventStatus(this.detail.status);
      return read.status === phase;
    },

    /**
     * One place every mutation goes through: it clears the previous refusal, runs the call, re-reads
     * the detail, and routes a typed `EVENTS_*` failure into the refusal banner rather than a toast.
     * A refusal carries `currentStatus` and `permittedActions`, and those are worth reading.
     *
     * `lastFailure` keeps the raw error whether or not it was typed, for a caller that wants to know
     * an action failed without re-inspecting the refusal.
     */
    async run (label, action) {
      this.busy = true;
      this.refusal = null;
      this.lastFailure = null;
      try {
        const result = await action();
        await this.loadDetail();
        await this.loadPipeline();
        this.notify(label);
        return result;
      } catch (e) {
        this.lastFailure = e;
        if (isEventsApiError(e)) { this.refusal = e; } else { this.notifyError(e); }
        return null;
      } finally {
        this.busy = false;
      }
    },

    /**
     * A settlement action, followed — ALWAYS, whether it succeeded or was refused — by a re-read.
     *
     * On success the read replaces the mutation's answer, so what is on screen is the server's own
     * current statement rather than a copy of one moment of it. On a refusal it is the recovery: both
     * `EVENTS_REVISION_REQUIRED` and `EVENTS_CONFLICT` are fixed by holding a current revision, and
     * this is the call that supplies one — so by the time the banner is read, pressing the button
     * again is a thing that can work.
     *
     * It deliberately does NOT retry by itself. An automatic second attempt on a money path would
     * decide, on the operator's behalf, that whatever the other writer did is acceptable to write
     * over.
     */
    async runSettlement (label, action) {
      const result = await this.run(label, action);
      await this.loadSettlement();
      return result;
    },

    /** The same shape for the deposit actions, which change the deposit history rather than read it. */
    async runDeposit (label, action) {
      const result = await this.run(label, action);
      await this.loadDeposits();
      return result;
    },

    async createEvent () {
      const request = Object.assign({}, this.draftEvent);
      const created = await this.run(this.$i('ev_toast_created'), () =>
        this._eventsService.CreateEvent(this.storeId, request));
      if (created) {
        this.showCreate = false;
        this.draftEvent = newEventForm();
        await this.selectEvent(created.id);
      }
    },

    async createProposal () {
      const form = this.draftProposal;
      const request = {
        currencyCode: form.currencyCode || null,
        minimumSpendMinor: parseMinorUnits(form.minimumSpend) || 0,
        roomFeeMinor: parseMinorUnits(form.roomFee) || 0,
        depositRequiredMinor: parseMinorUnits(form.depositRequired) || 0,
        termsText: form.termsText || null,
        // Null rather than a guess: without the venue's zone there is no instant to send.
        expiresAtUtc: proposalExpiryParam(this.venueZone, form.expiryDay),
        lines: form.lines.map(line => ({
          kind: line.kind,
          description: line.description,
          quantity: line.quantity,
          unitPriceMinor: parseMinorUnits(line.unitPrice) || 0,
          vatRate: line.vatRate
        }))
      };
      const version = await this.run(this.$i('ev_toast_drafted'), () =>
        this._eventsService.CreateProposalVersion(this.storeId, this.selectedId, request));
      if (version) {
        this.showProposal = false;
        this.draftProposal = newProposalForm();
      }
    },

    sendVersion (versionNo) {
      return this.run(this.$i('ev_toast_sent'), () =>
        this._eventsService.SendProposalVersion(this.storeId, this.selectedId, versionNo));
    },

    markLost () {
      return this.run(this.$i('ev_toast_lost'), () =>
        this._eventsService.MarkLost(this.storeId, this.selectedId, { reasonCode: 'Other', note: null }));
    },

    issueDeposit () {
      return this.runDeposit(this.$i('ev_toast_deposit'), () =>
        this._eventsService.IssueDeposit(this.storeId, this.selectedId, { paymentType: DEPOSIT_RAIL_VIPPS }));
    },

    cancelDeposit () {
      const deposit = this.cancellableDeposit;
      if (!deposit) { return Promise.resolve(null); }
      return this.runDeposit(this.$i('ev_toast_deposit_cancelled'), () =>
        this._eventsService.CancelDeposit(this.storeId, this.selectedId, deposit.id));
    },

    /**
     * Money back to the guest. The amount is the operator's, in integer minor units, and it is sent
     * exactly as typed — a partial refund is a legitimate act, so nothing here rounds it up to the
     * deposit or down to what it thinks remains. The server holds the ceiling
     * (`EVENTS_REFUND_EXCEEDS_PAID`).
     */
    async refundDeposit () {
      const deposit = this.refundableDeposit;
      if (!deposit || this.refundBlocked) { return null; }
      const amountMinor = parseMinorUnits(this.draftRefund.amount);
      const result = await this.runDeposit(this.$i('ev_toast_refunded'), () =>
        this._eventsService.RefundDeposit(this.storeId, this.selectedId, deposit.id, { amountMinor }));
      if (result) { this.draftRefund = { amount: '' }; }
      return result;
    },

    /**
     * T14/T15. `resolution` is sent only when the operator picked one — a blank stays null, and the
     * server refuses the cancel outright if a paid deposit is held with no instruction. Defaulting it
     * here would be this page deciding whether a guest is refunded.
     */
    async cancelEvent () {
      const result = await this.runSettlement(this.$i('ev_toast_cancelled'), () =>
        this._eventsService.CancelEvent(this.storeId, this.selectedId, {
          reason: this.draftCancel.reason || null,
          resolution: this.draftCancel.resolution || null
        }));
      // The resolution may have refunded or forfeited the deposit, so its history moved too.
      await this.loadDeposits();
      if (result) {
        this.showCancel = false;
        this.draftCancel = newCancelForm();
      }
      return result;
    },

    startService () {
      return this.runSettlement(this.$i('ev_toast_in_service'), () =>
        this._eventsService.StartService(this.storeId, this.selectedId));
    },

    /**
     * Opens the dietary form on what is ALREADY recorded, so an operator editing a statement starts
     * from the words that are on the sheet today. Starting from blank would invite a shorter
     * replacement of a longer requirement — an allergy lost to a fresh text box.
     */
    toggleDietary () {
      this.showDietary = !this.showDietary;
      if (this.showDietary) {
        this.draftDietary = this.dietaryStatement || '';
      }
    },

    /**
     * Records what the venue was told. The run sheet is re-read afterwards because this write is what
     * makes an already-printed sheet stale — the operator has to see that the paper on the pass is now
     * out of date, which is the whole point of recording it before service.
     */
    async recordDietary () {
      const statement = this.draftDietary.trim();
      if (!statement) { return null; }
      const result = await this.run(this.$i('ev_toast_dietary'), () =>
        this._eventsService.RecordDietaryStatement(this.storeId, this.selectedId, { statement }));
      await this.loadRunSheet();
      if (result) { this.showDietary = false; }
      return result;
    },

    async generateRunSheet () {
      this.runSheetError = null;
      const view = await this.run(this.$i('ev_toast_runsheet'), () =>
        this._eventsService.GenerateRunSheet(this.storeId, this.selectedId));
      if (view) { this.runSheetView = view; } else { await this.loadRunSheet(); }
    },

    closeEvent () {
      return this.runSettlement(this.$i('ev_toast_closed'), () =>
        this._eventsService.CloseEvent(this.storeId, this.selectedId));
    },

    /**
     * The invoice line — the step without which "close → reconcile → settle" has nothing to reconcile.
     *
     * `sourceKind` is not sent: the server derives it from `kind`, and a field on the wire the server
     * overwrites reads as a choice the operator made and did not.
     */
    async addSettlementLine () {
      if (this.lineBlocked) { return null; }
      const form = this.draftLine;
      const request = {
        kind: form.kind,
        amountMinor: parseMinorUnits(form.amount),
        sourceReference: form.sourceReference || null,
        note: form.note || null,
        adjustmentReason: form.kind === 'Adjustment' ? form.adjustmentReason : null
      };
      const result = await this.runSettlement(this.$i('ev_toast_line_added'), () =>
        this._eventsService.AddSettlementLine(this.storeId, this.selectedId, request, this.settlementRevision));
      if (result) {
        this.showLine = false;
        this.draftLine = newSettlementLineForm();
      }
      return result;
    },

    reconcile () {
      return this.runSettlement(this.$i('ev_toast_reconciled'), () =>
        this._eventsService.ReconcileSettlement(this.storeId, this.selectedId, this.settlementRevision));
    },

    closeSettlement () {
      return this.runSettlement(this.$i('ev_toast_settled'), () =>
        this._eventsService.CloseSettlement(this.storeId, this.selectedId, this.settlementRevision));
    },

    /**
     * Put an undelivered guest link back in the drain's way.
     *
     * `requeued: false` is a SUCCESS — the row was already queued, so the operator's goal already
     * held — and it is reported as its own sentence rather than as the same toast, because a button
     * that says "sent" for both trains staff to press it again.
     */
    async requeueNotification (notificationOutboxId) {
      this.busy = true;
      this.refusal = null;
      try {
        const result = await this._eventsService.RequeueNotification(this.storeId, notificationOutboxId);
        this.notify(result && result.requeued === false
          ? this.$i('ev_toast_requeue_already_queued')
          : this.$i('ev_toast_requeued'));
      } catch (e) {
        if (isEventsApiError(e)) { this.refusal = e; } else { this.notifyError(e); }
      } finally {
        this.busy = false;
      }
      await this.loadNotificationHealth();
    },

    addLine () {
      this.draftProposal.lines.push(newLine());
    },

    notify (message, type = 'success') {
      this.toast = { show: true, message, type };
      if (this.toastTimer) { clearTimeout(this.toastTimer); }
      this.toastTimer = setTimeout(() => { this.toast.show = false; }, 5000);
    },
    notifyError (e) {
      this.notify((e && e.message) || this.$i('ev_error_generic'), 'error');
    }
  }
};

function newEventForm () {
  return {
    title: '',
    eventDate: '',
    startTime: '',
    endTime: '',
    guestCountPlanned: 1,
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    companyName: ''
  };
}

function newLine () {
  return { kind: 'Package', description: '', quantity: 1, unitPrice: '', vatRate: 0.25 };
}

function newProposalForm () {
  return {
    currencyCode: 'NOK',
    minimumSpend: '',
    roomFee: '',
    depositRequired: '',
    termsText: '',
    expiryDay: '',
    lines: [newLine()]
  };
}

function newSettlementLineForm () {
  return { kind: 'Invoice', amount: '', sourceReference: '', note: '', adjustmentReason: '' };
}

// No resolution is pre-selected. See `cancelEvent`.
function newCancelForm () {
  return { reason: '', resolution: '' };
}
</script>

<style scoped>
.ev-page { max-width: 1400px; margin: 0 auto; padding: 24px; }
.ev-page__header { margin-bottom: 24px; }
.ev-page__title { font-size: 2em; font-weight: 600; color: #292c34; margin: 0 0 8px; }
.ev-page__intro { color: #64748b; margin: 0; }
.ev-page__controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; background: #fff; padding: 16px; border-radius: 12px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05); margin-bottom: 24px; }
.ev-page__panel { background: #fff; padding: 20px; border-radius: 12px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05); margin-bottom: 24px; }
.ev-page__panel h2 { font-size: 1.2em; font-weight: 600; color: #292c34; margin: 0 0 12px; }
.ev-page__field { display: flex; flex-direction: column; gap: 4px; font-size: 0.85em; }
.ev-page__field span { font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; font-size: 0.9em; }
.ev-page__field input, .ev-page__field select, .ev-page__field textarea { padding: 8px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 1em; }
.ev-page__btn { background: #1bb776; color: #fff; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; }
.ev-page__btn:disabled { background: #cbd5e0; cursor: not-allowed; }
.ev-page__btn--ghost { background: #fff; color: #292c34; border: 2px solid #e2e8f0; }
.ev-page__form { background: #f8f9fa; padding: 16px; border-radius: 12px; margin-bottom: 24px; }
.ev-page__form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 12px; }
.ev-page__actions { border-top: 1px solid #e2e8f0; margin-top: 20px; padding-top: 16px; }
.ev-page__actionrow { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.ev-page__notice { margin: 0 0 12px; padding: 12px; background: #f8f9fa; border-radius: 8px; color: #64748b; font-size: 0.9em; }
.ev-page__notice--warn { background: #fff7ed; color: #92400e; }
.ev-page__hint { color: #64748b; font-size: 0.8em; font-style: italic; margin: 4px 0; }
.ev-page__refusal { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 24px; color: #991b1b; }
.ev-page__refusal p { margin: 6px 0; }
.ev-page__refusal-detail { font-size: 0.85em; }
.ev-page__deadletters { list-style: none; margin: 0; padding: 0; font-size: 0.85em; }
.ev-page__deadletters li { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
.ev-page__toast { padding: 12px 16px; border-radius: 8px; background: #dcfce7; color: #166534; margin-bottom: 16px; }
.ev-page__toast--error { background: #fee2e2; color: #991b1b; }

/* ---- THE PAGE HALF OF THE PRINT PATH -----------------------------------------------------------
   The component half lives in `EventsJourney.vue` and decides what of ONE event reaches the paper.
   This half decides that nothing else on the page does.

   SCOPED, like the other half, and for the same reason: these selectors carry this page's `data-v-`
   attribute, so they cannot reach a screen this page did not render even though the chunk's CSS
   stays loaded after navigation. No body class, no `head()`, nothing to apply and therefore nothing
   to forget — the estate's previous print stylesheet was guarded by an imperative body class that
   vue-meta rebuilt away, and it printed the admin shell for as long as nobody looked.

   DEFAULT-DENY, again. `.ev-page > *` takes the whole page off the paper and the selected event's
   panel is named back in; inside it, the same trick admits only the journey component. So the
   filters, the create form, the action buttons, the refusal banner and the undelivered-notification
   list are all off the kitchen sheet, and so is whatever a later lane adds beside them.

   Vue applies THIS page's scope id to a child component's root element, which is why
   `.ev-journey` — `EventsJourney`'s root — is reachable from here and its innards are not. That is
   the correct seam: what happens inside the sheet is the component's business. */
@media print {
  .ev-page { max-width: none; margin: 0; padding: 0; }
  .ev-page > * { display: none !important; }
  .ev-page__panel--journey { display: block !important; border: 0; padding: 0; margin: 0; background: transparent; }
  .ev-page__panel--journey > * { display: none !important; }
  .ev-page__panel--journey > .ev-journey { display: block !important; }
}
</style>

<style>
/* A NAMED page box, claimed by `.ev-journey__section--sheet` in the component's own print rules.
   Named rather than a bare `@page`, which carries no selector at all and therefore cannot be scoped
   or guarded by anything: a bare one would put a 14 mm A4 margin on every other document this admin
   prints for the rest of the session, since this page's CSS and theirs coexist once both have been
   visited. Named, it is inert until something claims it — and the only thing that claims it is a
   rule that already carries the component's scope attribute.
   A browser without named-page support ignores both halves and prints the sheet at its own default
   margins: readable, just not exactly 14 mm. */
@page ev-runsheet {
  size: A4 portrait;
  margin: 14mm;
}

/* WHAT IS DELIBERATELY *NOT* HERE. There is no rule that reaches the admin shell — no
   `.admin__main`, no `.admin__content`, no body-class contributor. Two reasons, and the second one
   is the one that settled it:
     • Those elements are ANCESTORS of this page's scope, so reaching them means an UNSCOPED rule,
       which is the thing this whole change is arranged to avoid.
     • It would fix nothing measurable. The shell reserves a 264px gutter for the sidebar it hides
       when printing, and that gutter IS visible in a viewport screenshot taken under emulated print
       media — but it is absent from the A4 document the browser actually produces, which was checked
       by measuring the text's position in the printed PDF rather than assumed. A rule whose effect
       cannot be observed in the artifact is a rule that gets kept forever because nobody can tell
       whether it still does anything.
   The one shell element that WOULD print is the onboarding banner, and only for a store still in
   onboarding. That residue is recorded in the lane's RETURN rather than papered over here. */
</style>

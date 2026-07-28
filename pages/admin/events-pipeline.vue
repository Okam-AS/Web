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
      <div v-if="selectedId" class="ev-page__panel">
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
            :deposit="depositFacet"
            :settlement="settlementFacet"
            :run-sheet="runSheetFacet"
            :locale="locale"
            :currency="currency"
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
                v-if="cancellableDepositId"
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
import { EventsService, isEventsApiError, EVENTS_STATE, EVENTS_DISABLED } from '~/utils/events/events-client';
import {
  READ_UNKNOWN,
  READ_DISABLED,
  READ_FORBIDDEN,
  READ_ANSWERED,
  PHASE_SEQUENCE,
  OFF_RAMPS,
  DEPOSIT_RAIL_VIPPS,
  DEPOSIT_RAILS_WIRED,
  DEPOSIT_RAILS_UNWIRED,
  readListing,
  readDetail,
  readFacet,
  readRunSheet,
  readEventStatus,
  parseMinorUnits,
  proposalExpiryParam
} from '~/utils/events/journey';

// `EventsProposalLineKind` — the server `Enum.TryParse`s this name and answers EVENTS_VALIDATION for
// anything else, so the field is a closed list here rather than free text.
const LINE_KINDS = ['Package', 'MenuItem', 'AddOn', 'RoomFee', 'Custom'];

// The deposit statuses that leave a deposit still cancellable (`EventsDepositService.CancelAsync`
// refuses anything else). Read off the projection the issue call returned — never inferred from the
// event's own lifecycle status, which moves independently of the deposit's.
const CANCELLABLE_DEPOSIT_STATUSES = ['Requested', 'Pending'];

// The Events proving surface: one venue's pipeline, and one event walked from enquiry to as far as
// this backend goes. Reads and lifecycle actions only — the two steps a GUEST owns (accepting a
// proposal, paying a deposit) are not here and cannot be, because both are anonymous token routes.
export default {
  name: 'AdminEventsPipeline',
  components: { AdminPage, EventsPipeline, EventsJourney },
  data () {
    return {
      loading: false,
      busy: false,
      showCreate: false,
      showProposal: false,
      filters: { status: '', from: '', to: '' },
      listing: { state: READ_UNKNOWN, rows: null, code: null, detail: null },
      selectedId: null,
      detailRead: { state: READ_UNKNOWN, view: null, code: null, detail: null },
      // The deposit and the settlement have no admin GET, so they start life as "we cannot ask" and
      // are filled only by the answer to a mutation this tab made. Nothing is persisted across a
      // reload, and nothing is reconstructed from the detail. See utils/events/events-client.js.
      depositView: null,
      depositError: null,
      settlementView: null,
      settlementError: null,
      runSheetView: null,
      runSheetError: null,
      refusal: null,
      lastFailure: null,
      draftEvent: newEventForm(),
      draftProposal: newProposalForm(),
      toast: { show: false, message: '', type: 'success' },
      toastTimer: null,
      READ_UNKNOWN,
      READ_DISABLED,
      READ_FORBIDDEN,
      READ_ANSWERED
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
    depositRail () {
      return DEPOSIT_RAIL_VIPPS;
    },
    depositRailsWired () {
      return DEPOSIT_RAILS_WIRED.join(', ');
    },
    depositRailsUnwired () {
      return DEPOSIT_RAILS_UNWIRED.join(', ');
    },
    depositFacet () {
      return readFacet(this.depositView, this.depositError);
    },
    settlementFacet () {
      return readFacet(this.settlementView, this.settlementError);
    },
    runSheetFacet () {
      return readRunSheet(this.runSheetView, this.runSheetError);
    },
    detail () {
      return this.detailRead.state === READ_ANSWERED ? this.detailRead.view : null;
    },
    venueZone () {
      return this.detail ? this.detail.timeZoneId : null;
    },
    // The newest Draft version, which is the one `send` (T3) would act on. Null when there is none —
    // the send button then has nothing to name and is not offered.
    draftVersionNo () {
      if (!this.detail || !Array.isArray(this.detail.versions)) { return null; }
      const drafts = this.detail.versions.filter(v => v.status === 'Draft');
      return drafts.length ? drafts[drafts.length - 1].versionNo : null;
    },
    cancellableDepositId () {
      const view = this.depositView;
      if (!view || !CANCELLABLE_DEPOSIT_STATUSES.includes(view.status)) { return null; }
      return view.id;
    },
    // The settlement's opaque revision, threaded straight back as `If-Match`. Held only as long as the
    // answer that produced it: there is no read to refresh it from.
    settlementRevision () {
      return this.settlementView ? this.settlementView.revision : null;
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
    refusalHeading () {
      if (!this.refusal) { return ''; }
      if (this.refusal.code === EVENTS_STATE) { return this.$i('ev_refusal_state'); }
      if (this.refusal.code === EVENTS_DISABLED) { return this.$i('ev_refusal_disabled'); }
      return this.$i('ev_refusal_other', { code: this.refusal.code || '—' });
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
    },

    // Everything about the previously selected event goes back to UNKNOWN, never to empty. A stale
    // deposit or settlement left on screen would be this surface reporting another event's money.
    clearEventState () {
      this.detailRead = { state: READ_UNKNOWN, view: null, code: null, detail: null };
      this.depositView = null;
      this.depositError = null;
      this.settlementView = null;
      this.settlementError = null;
      this.runSheetView = null;
      this.runSheetError = null;
      this.lastFailure = null;
      this.showProposal = false;
      this.draftProposal = newProposalForm();
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

    async selectEvent (eventId) {
      this.selectedId = eventId;
      this.clearEventState();
      await this.loadDetail();
      await this.loadRunSheet();
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

    // The run sheet is the one facet with a GET, so it is the one that is actually re-read.
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
     * `lastFailure` keeps the raw error whether or not it was typed, because the deposit and
     * settlement panels need SOMETHING to hand to `readFacet`: a call that fell over left that facet
     * unknown, and unknown must not be reported as "there is no route to ask".
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

    async issueDeposit () {
      this.depositError = null;
      const result = await this.run(this.$i('ev_toast_deposit'), () =>
        this._eventsService.IssueDeposit(this.storeId, this.selectedId, { paymentType: DEPOSIT_RAIL_VIPPS }));
      if (result) { this.depositView = result.deposit; } else { this.depositError = this.lastFailure; }
    },

    async cancelDeposit () {
      const depositId = this.cancellableDepositId;
      if (!depositId) { return; }
      const view = await this.run(this.$i('ev_toast_deposit_cancelled'), () =>
        this._eventsService.CancelDeposit(this.storeId, this.selectedId, depositId));
      if (view) { this.depositView = view; }
    },

    async startService () {
      const result = await this.run(this.$i('ev_toast_in_service'), () =>
        this._eventsService.StartService(this.storeId, this.selectedId));
      // T11 answers with a lifecycle result. A settlement does not exist yet at InService, so this is
      // normally null — and null here means the answer carried none, not that one was hidden.
      if (result) { this.settlementView = result.settlement || null; }
    },

    async generateRunSheet () {
      this.runSheetError = null;
      const view = await this.run(this.$i('ev_toast_runsheet'), () =>
        this._eventsService.GenerateRunSheet(this.storeId, this.selectedId));
      if (view) { this.runSheetView = view; } else { await this.loadRunSheet(); }
    },

    async closeEvent () {
      this.settlementError = null;
      const result = await this.run(this.$i('ev_toast_closed'), () =>
        this._eventsService.CloseEvent(this.storeId, this.selectedId));
      if (result) { this.settlementView = result.settlement || null; } else { this.settlementError = this.lastFailure; }
    },

    async reconcile () {
      this.settlementError = null;
      const result = await this.run(this.$i('ev_toast_reconciled'), () =>
        this._eventsService.ReconcileSettlement(this.storeId, this.selectedId, this.settlementRevision));
      if (result) { this.settlementView = result.settlement || null; } else { this.settlementError = this.lastFailure; }
    },

    async closeSettlement () {
      this.settlementError = null;
      const result = await this.run(this.$i('ev_toast_settled'), () =>
        this._eventsService.CloseSettlement(this.storeId, this.selectedId, this.settlementRevision));
      if (result) { this.settlementView = result.settlement || null; } else { this.settlementError = this.lastFailure; }
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
.ev-page__toast { padding: 12px 16px; border-radius: 8px; background: #dcfce7; color: #166534; margin-bottom: 16px; }
.ev-page__toast--error { background: #fee2e2; color: #991b1b; }
</style>

<template>
  <div class="pos-root">
    <!-- Startup -->
    <div v-if="loading" class="pos-boot">
      <div class="pos-boot__spinner" />
      <p>{{ $i('pos_loading') }}</p>
    </div>

    <div v-else-if="startupError" class="pos-boot">
      <p class="pos-boot__error">
        {{ startupError }}
      </p>
      <button type="button" class="pos-boot__retry" @click="startup">
        {{ $i('pos_retry') }}
      </button>
      <button type="button" class="pos-boot__link" @click="exit">
        {{ $i('pos_back_to_admin') }}
      </button>
    </div>

    <template v-else>
      <PosTopBar v-if="cashPoint && session" />

      <main class="pos-body">
        <!-- Sell and Board are one screen: the check panel is always mounted on the right and only
             the left column swaps between the floor plan and the products. Rendering the board as a
             separate screen tore the open check off the display every time the operator glanced at
             the floor. -->
        <SellScreen v-if="mode === 'sell' || mode === 'board'" v-show="canOperate" />
        <DayFlow v-else-if="mode === 'day'" />
        <ReceiptsView v-else-if="mode === 'receipts'" />
      </main>

      <!-- Blocking overlays (highest priority first) -->
      <CashPointPicker v-if="needsCashPoint" />
      <OperatorLoginScreen v-else-if="needsOperator" />
      <BeginDayModal v-else-if="needsDay" />

      <!-- Operator switch -->
      <PinPadModal
        v-if="showSwitch"
        :title="$i('pos_switch_operator')"
        :subtitle="$i('pos_switch_operator_hint')"
        :operators="operators"
        :pinless="fastSwitch"
        :error="switchError"
        :busy="switchBusy"
        @submit="onSwitchSubmit"
        @close="showSwitch = false"
      />

      <!-- Park-or-void prompt when the operator leaves a check that still carries items. -->
      <div v-if="abandonPrompt" class="pos-abandon" @click.self="abandonBusy || onAbandonChoice('cancel')">
        <div class="pos-abandon__panel">
          <h3 class="pos-abandon__title">{{ abandonName }}</h3>
          <p class="pos-abandon__text">
            {{ $i(abandonOnTable ? 'pos_abandon_prompt_table' : 'pos_abandon_prompt', { name: abandonName, amount: priceLabel(abandonPrompt.check.finalAmount) }) }}
          </p>

          <!-- A seated check's answer is almost always "leave it where the guests are sitting", and
               that answer costs nothing: it is already open on that table. It leads, and it is the
               only option here that sends nothing at all. -->
          <button
            v-if="abandonOnTable && !abandonTablePick"
            type="button"
            class="pos-abandon__park"
            :disabled="abandonBusy"
            @click="onAbandonChoice('keep')"
          >
            {{ $i('pos_keep_on_table', { name: abandonName }) }}
          </button>
          <!-- Placing the check on a table is the mirror image of parking it (Park clears the table,
               Move sets one), so it belongs in the same decision — otherwise a quick sale that turned
               out to be a table's order has to be parked and resumed onto the table afterwards.
               When the prompt was raised by tapping a table, that table IS the answer: offer it by
               name and skip the list entirely. -->
          <template v-if="!abandonTablePick">
            <button
              v-if="abandonTargetTable"
              type="button"
              :class="abandonOnTable ? 'pos-abandon__secondary' : 'pos-abandon__park'"
              :disabled="abandonBusy"
              @click="onAbandonPlace(abandonTargetTable)"
            >
              {{ $i(abandonOnTable ? 'pos_move_to_table_named' : 'pos_place_on_table_named', { name: tableLabel(abandonTargetTable) }) }}
            </button>
            <button
              v-else-if="abandonTables.length"
              type="button"
              :class="abandonOnTable ? 'pos-abandon__secondary' : 'pos-abandon__park'"
              :disabled="abandonBusy"
              @click="abandonTablePick = true"
            >
              {{ $i(abandonOnTable ? 'pos_move_to_other_table' : 'pos_place_on_table') }}
            </button>
            <!-- All of them are disabled mid-move: a void firing on a check that is being moved
                 would settle it twice and resolve the pending promise from two places.
                 On a seated check the label spells out the part "Park" never said — the table is
                 freed and the check leaves the floor plan for the parked strip. -->
            <button
              type="button"
              :class="(abandonOnTable || abandonTargetTable || abandonTables.length) ? 'pos-abandon__secondary' : 'pos-abandon__park'"
              :disabled="abandonBusy"
              @click="onAbandonChoice('park')"
            >
              {{ abandonOnTable ? $i('pos_unseat_park', { name: abandonName }) : $i('pos_park_check') }}
            </button>
            <button type="button" class="pos-abandon__cancel" :disabled="abandonBusy" @click="onAbandonChoice('cancel')">
              {{ $i('common_cancel') }}
            </button>
            <!-- Void journals a VOIDTRANS and cannot be taken back, so it is separated from the
                 keep-the-check options by a rule and demoted to a link rather than sitting as a
                 same-size button directly under Park. It asks a second time below. -->
            <div class="pos-abandon__danger">
              <button type="button" class="pos-abandon__void" :disabled="abandonBusy" @click="abandonVoidConfirm = true">
                {{ $i('pos_void_check') }}
              </button>
            </div>
          </template>

          <template v-else>
            <div class="pos-abandon__tables">
              <button
                v-for="t in abandonTables"
                :key="t.tableId"
                type="button"
                class="pos-abandon__table"
                :disabled="abandonBusy"
                @click="onAbandonPlace(t)"
              >
                <span class="pos-abandon__table-name">{{ tableLabel(t) }}</span>
                <span class="pos-abandon__table-act">{{ $i('pos_move_here') }}</span>
              </button>
            </div>
            <button type="button" class="pos-abandon__cancel" :disabled="abandonBusy" @click="abandonTablePick = false">
              {{ $i('common_back') }}
            </button>
          </template>
        </div>
      </div>

      <PosConfirm
        v-if="abandonVoidConfirm"
        :title="$i('pos_void_check')"
        :text="$i('pos_void_check_confirm', { amount: abandonPrompt ? priceLabel(abandonPrompt.check.finalAmount) : '' })"
        :confirm-label="$i('pos_void_check')"
        danger
        :busy="abandonBusy"
        @confirm="onAbandonVoidConfirmed"
        @cancel="abandonVoidConfirm = false"
      />

      <!-- Leaving the register with an open check is the same decision as leaving it any other
           way, so it runs the same park-or-void prompt instead of silently walking away. -->
      <PosConfirm
        v-if="exitConfirm"
        :title="$i('pos_exit')"
        :text="$i('pos_exit_confirm')"
        :confirm-label="$i('pos_exit_short')"
        @confirm="onExitConfirmed"
        @cancel="exitConfirm = false"
      />

      <!-- One toast host for the whole register (notices, food-ready, undo actions). -->
      <PosToast :toasts="toasts" @dismiss="dismissToast" @action="runToastAction" />
    </template>
  </div>
</template>

<script>
import PosTopBar from '~/components/admin/pos/PosTopBar.vue';
import SellScreen from '~/components/admin/pos/SellScreen.vue';
import DayFlow from '~/components/admin/pos/DayFlow.vue';
import ReceiptsView from '~/components/admin/pos/ReceiptsView.vue';
import CashPointPicker from '~/components/admin/pos/CashPointPicker.vue';
import OperatorLoginScreen from '~/components/admin/pos/OperatorLoginScreen.vue';
import BeginDayModal from '~/components/admin/pos/BeginDayModal.vue';
import PinPadModal from '~/components/admin/pos/PinPadModal.vue';
import PosToast from '~/components/admin/pos/PosToast.vue';
import PosConfirm from '~/components/admin/pos/PosConfirm.vue';

// PosShell owns the whole POS session: cash point, operator session, open trading day, active mode
// and the polled board status. It is provided to every descendant as `pos`, and it is the single
// place that stamps the X-Operator-Session header onto the (per-access) core service instances.
export default {
  name: 'PosShell',
  components: {
    PosTopBar,
    SellScreen,
    DayFlow,
    ReceiptsView,
    CashPointPicker,
    OperatorLoginScreen,
    BeginDayModal,
    PinPadModal,
    PosToast,
    PosConfirm
  },
  provide () {
    return { pos: this };
  },
  props: {
    storeId: { type: [Number, String], required: true }
  },
  data () {
    return {
      loading: true,
      startupError: '',
      cashPoints: [],
      cashPoint: null,
      operators: [],
      session: null,
      daySession: null,
      boardStatus: null,
      activeCheck: null,
      catalog: [],
      catalogError: false,
      mode: 'sell',
      // Training mode: sales produce a TRAINREC (segregated into the X/Z training totals) instead of
      // settling for real. Device-scoped and reset on reload / operator change, so it can never leak
      // into a real shift silently.
      trainingMode: false,
      online: true,
      // A card payment is on the terminal: session teardown must wait for the flow to end.
      paymentActive: false,
      // Lines rung in but not yet acknowledged by the server. Owned by the sell screen, mirrored
      // here because a mode switch unmounts that screen (v-if) and its queue would go with it.
      addsPending: 0,
      showSwitch: false,
      switchBusy: false,
      switchError: '',
      boardTimer: null,
      // Every toast in the register: notices, the food-ready nudge and action toasts (Angre).
      // Owned here so a message raised on one screen survives a mode switch and two of them
      // can never render on top of each other.
      toasts: [],
      // Soft chime on food-ready. Off by default (no autoplay surprises); persisted per store and
      // toggled from the top bar.
      chimeEnabled: false,
      // Leaving a non-empty check prompts place-on-table / park / void; resolves the pending switch.
      abandonPrompt: null,
      // The prompt's second step: the free-table list behind "Plasser på bord".
      abandonTablePick: false,
      abandonBusy: false,
      // Second confirmation on the prompt's void branch (VOIDTRANS is irreversible).
      abandonVoidConfirm: false,
      // Leaving the register while a check is open.
      exitConfirm: false
    };
  },
  computed: {
    storeName () {
      const stores = (this.$store.state.currentUser && this.$store.state.currentUser.adminIn) || [];
      const s = stores.find(x => String(x.id) === String(this.storeId));
      return s ? s.name : '';
    },
    sessionId () { return this.session ? this.session.operatorSessionId : ''; },
    // WP-B3: fast operator switch (opt-in per register) turns the switch pad into a single tap.
    fastSwitch () { return !!(this.cashPoint && this.cashPoint.allowFastOperatorSwitch); },
    dayOpen () { return !!(this.daySession && !this.daySession.closedAt); },
    needsCashPoint () { return !this.cashPoint; },
    needsOperator () { return !!this.cashPoint && !this.session; },
    // Receipts are exempt alongside Dag: looking up a receipt to reprint or send it is reading
    // what the day already produced, and the day is most often closed when a customer comes back
    // for one. Forcing a new trading day open to reach it would be a fiscal event caused by a
    // lookup.
    needsDay () {
      return !!this.cashPoint && !!this.session && !this.dayOpen &&
        this.mode !== 'day' && this.mode !== 'receipts';
    },
    canOperate () { return !!this.cashPoint && !!this.session && this.dayOpen; },
    // Whether the check in the prompt is seated. A seated check has somewhere to stay, so the whole
    // prompt reads differently: keeping it is the headline answer and parking becomes the option
    // that has to explain itself.
    abandonOnTable () { return !!(this.abandonPrompt && this.abandonPrompt.check.tableId); },
    abandonName () {
      if (!this.abandonPrompt) { return ''; }
      const check = this.abandonPrompt.check;
      if (!check.tableId) { return this.$i('pos_quick_sale'); }
      return check.tableName || this.$i('pos_table');
    },
    // Free tables the abandoned check can be placed on. Occupied ones are left out on purpose:
    // dropping a check onto a table that already has one is a merge, and a merge consumes a check —
    // too big a decision to hide behind a table tap in a leave-the-screen prompt.
    abandonTables () {
      if (!this.abandonPrompt) { return []; }
      const currentTableId = this.abandonPrompt.check.tableId;
      const tables = (this.boardStatus && this.boardStatus.tables) || [];
      return tables.filter(t => t.isActive && !t.openCheck && t.tableId !== currentTableId);
    },
    // The table the operator tapped to raise this prompt, when there was one. Re-read from the
    // board (not trusted from the tap) so a table that got taken since the last poll falls back
    // to the full list rather than offering a move that is about to fail.
    abandonTargetTable () {
      const id = this.abandonPrompt && this.abandonPrompt.targetTableId;
      if (!id) { return null; }
      return this.abandonTables.find(t => t.tableId === id) || null;
    }
  },
  // Non-reactive bookkeeping is set up in created, NOT mounted: Vue 2 runs every child's mounted
  // before the parent's, so a child that calls pos.notify() while mounting would hit an undefined
  // _toastSeq and mint NaN toast ids — duplicate transition-group keys that cannot be dismissed.
  created () {
    // Which open checks had a Ready line at the previous poll, so a toast fires once per table
    // when it transitions into "food ready" (null = not yet seeded).
    this._readyCheckIds = null;
    this._audioCtx = null;
    // Monotonic toast key: the id must stay stable while the list splices around it, so a
    // transition-group never re-uses a key and animates the wrong toast out.
    this._toastSeq = 0;
    // Consecutive board polls in which the active check was absent, and the check they belong to
    // (see reconcileActiveCheck — the count is meaningless across a change of check).
    this._activeCheckMisses = 0;
    this._activeCheckMissId = null;
    // Board-poll bookkeeping: a request slower than the interval must not stack, and while
    // offline only every third tick probes.
    this._boardBusy = false;
    // Resolves when the in-flight poll finishes, so a forced refresh can wait for it.
    this._boardPoll = null;
    this._boardPollDone = null;
    this._offlineTicks = 0;
    // restoreActiveCheck hit a transport failure: the saved activeOrderId must survive
    // persist() until a retry settles it (attached, or confirmed gone). The retry rides the
    // board poll (bounded pacing, stops with the shell) instead of its own timer.
    this._restorePending = false;
    // Guards against two board-poll retries launching overlapping restoreActiveCheck calls.
    this._restoreInFlight = false;
  },
  mounted () {
    this.chimeEnabled = this.readChimePref();
    this.startup();
  },
  beforeDestroy () {
    this.stopPolling();
    // Leaving the page with an empty draft discards it (never blocks navigation).
    if (this.activeCheck && (this.activeCheck.items || []).length === 0) {
      this.discardCheckIfEmpty(this.activeCheck);
      this.activeCheck = null;
      this.persist();
    }
    this.toasts.forEach((t) => { if (t.timer) { clearTimeout(t.timer); } });
    this.toasts = [];
    // A prompt still pending when the shell unmounts must not leave its caller hanging.
    if (this.abandonPrompt) { this.abandonPrompt.resolve(false); this.abandonPrompt = null; }
    if (this._audioCtx && this._audioCtx.close) { this._audioCtx.close().catch(() => {}); }
  },
  methods: {
    // ---- Service accessors: stamp the operator session onto the fresh per-access instance ----
    posSvc () { const s = this._posService; s.operatorSessionId = this.sessionId; return s; },
    checkSvc () { const s = this._openCheckService; s.operatorSessionId = this.sessionId; return s; },
    drawerSvc () { const s = this._cashDrawerService; s.operatorSessionId = this.sessionId; return s; },
    operatorSvc () { const s = this._operatorService; s.operatorSessionId = this.sessionId; return s; },
    reportSvc () { const s = this._reportService; s.operatorSessionId = this.sessionId; return s; },
    // The journal read API is JWT/StoreAdmin, not operator-session scoped, so it is used as-is.
    journalSvc () { return this._journalService; },
    goodsGroupSvc () { return this._goodsGroupService; },
    openPricePresetSvc () { return this._openPricePresetService; },

    // Single owner of the "operator session expired -> drop to PIN" decision, shared by every
    // call site (errMsg, loadDay, refreshBoard). Never collapses the UI mid card payment (the
    // customer may be tapping) — the next board poll after paymentActive clears does the
    // teardown. Returns true when it ended the session.
    endSessionIfExpired (e) {
      if (this.isSessionExpired(e) && this.session && !this.paymentActive) {
        this.endSessionLocally();
        return true;
      }
      return false;
    },
    errMsg (e) {
      // Any session-scoped call answering 401 means the operator session died server-side —
      // drop to the PIN screen instead of surfacing an error the operator can't act on.
      if (this.isSessionExpired(e)) {
        this.endSessionIfExpired(e);
        return this.$i('pos_session_expired');
      }
      const raw = (e && e.response && e.response.data && e.response.data.message) || (e && e.message) || '';
      // The backend's PIN messages are English constants; map the known ones so the pad
      // speaks the operator's language.
      if (raw === 'Invalid PIN') { return this.$i('pos_pin_wrong'); }
      if (raw === 'Too many PIN attempts, try again later') { return this.$i('pos_pin_too_many'); }
      if (raw === 'Operator is temporarily locked out') { return this.$i('pos_pin_locked'); }
      if (raw.indexOf('All open checks must be settled') === 0) {
        const countMatch = raw.match(/\((\d+)\)/);
        return this.$i('pos_eod_open_checks', { count: countMatch ? countMatch[1] : '' });
      }
      return raw || this.$i('pos_generic_error');
    },

    // ---- Startup sequence ----
    async startup () {
      this.loading = true;
      this.startupError = '';
      try {
        const cps = await this._cashPointService.GetForStore(this.storeId);
        this.cashPoints = (cps || []).filter(c => c.isActive);

        const saved = this.readLocal();
        let cp = null;
        if (saved.cashPointId) {
          cp = this.cashPoints.find(c => c.cashPointId === saved.cashPointId) || null;
        }
        if (!cp && this.cashPoints.length === 1) { cp = this.cashPoints[0]; }
        this.cashPoint = cp;

        if (this.cashPoint) {
          await this.afterCashPointChosen(saved.operatorSessionId);
        }
      } catch (e) {
        this.startupError = this.errMsg(e);
      } finally {
        this.loading = false;
      }
    },

    async afterCashPointChosen (savedSessionId) {
      this.operators = await this._operatorService.GetForStore(this.storeId).catch(() => []);

      this.session = null;
      if (savedSessionId) {
        try {
          const svc = this._operatorService;
          svc.operatorSessionId = savedSessionId;
          const session = await svc.GetSession();
          if (session && session.cashPointId === this.cashPoint.cashPointId) {
            this.session = session;
          }
        } catch (e) {
          // Session ended / expired — fall back to the PIN screen.
        }
      }

      await this.loadDay();
      this.loadCatalog();
      await this.restoreActiveCheck();
      this.persist();
      this.startPolling();
    },

    // Re-attach the check that was active before the page reloaded (persisted by orderId).
    // Without this every refresh orphaned the quick-sale check, which then lingered in the
    // parked list.
    async restoreActiveCheck () {
      const saved = this.readLocal();
      if (!saved.activeOrderId || !this.session) { return; }
      // Never let two callers (login + a board-poll retry) fetch the same check at once.
      if (this._restoreInFlight) { return; }
      this._restoreInFlight = true;
      try {
        const check = await this.checkSvc().GetCheck(saved.activeOrderId);
        this._restorePending = false;
        // A check opened on another cash point must not be adopted here — settling it would
        // put the money in the wrong drawer and the sale on the wrong X/Z report.
        if (
          check &&
          check.status === 'OpenCheck' &&
          (!check.cashPointId || !this.cashPoint || check.cashPointId === this.cashPoint.cashPointId)
        ) {
          this.activeCheck = check;
        }
      } catch (e) {
        if (e && e.statusCode) {
          // The server answered: finalized / voided / gone — nothing to restore.
          this._restorePending = false;
        } else {
          // Transport failure — the check may still be live. Keep the saved reference (persist()
          // honors _restorePending); the next successful board poll retries the restore.
          this._restorePending = true;
        }
      } finally {
        this._restoreInFlight = false;
      }
    },

    // Product catalog for the sales grid: one POS-specific call returns every category with its
    // product-list items and variants (no operator session needed — a store read). catalogError
    // lets the grid tell "empty category" apart from "catalog failed to load".
    async loadCatalog () {
      this.catalogError = false;
      try {
        this.catalog = await this.posSvc().GetCatalog(this.storeId) || [];
      } catch (e) {
        this.catalog = [];
        this.catalogError = true;
      }
    },

    async loadDay () {
      if (!this.session) { this.daySession = null; return; }
      try {
        this.daySession = await this.drawerSvc().GetCurrentDay(this.cashPoint.cashPointId);
      } catch (e) {
        this.daySession = null;
        // A session that expired server-side must drop to the PIN screen, not wait for the next
        // board poll — otherwise login appears to succeed against a dead session.
        this.endSessionIfExpired(e);
      }
    },

    // ---- Operator ----
    async login ({ operatorId, pin }) {
      const session = await this._operatorService.Login({
        cashPointId: this.cashPoint.cashPointId,
        operatorId,
        pin,
        deviceInfo: 'web-pos'
      });
      this.session = session;
      // Re-attach a check saved before the previous session expired (startup's restore bails
      // without a session, so this is the first chance) — in parallel with the day load; both
      // must land before persist() so the saved reference isn't clobbered.
      await Promise.all([this.restoreActiveCheck(), this.loadDay()]);
      // loadDay may have detected an expired session and torn it down; only persist/poll the
      // fresh session if it survived (endSessionLocally already persisted the ended state).
      if (this.session) {
        this.persist();
        this.startPolling();
      }
    },

    requestSwitch () {
      this.switchError = '';
      this.showSwitch = true;
    },

    async onSwitchSubmit ({ operatorId, pin }) {
      this.switchBusy = true;
      this.switchError = '';
      try {
        const session = await this.operatorSvc().Switch({
          cashPointId: this.cashPoint.cashPointId,
          operatorId,
          pin,
          deviceInfo: 'web-pos'
        });
        this.session = session;
        this.trainingMode = false;
        this.persist();
        this.showSwitch = false;
      } catch (e) {
        this.switchError = this.errMsg(e);
      } finally {
        this.switchBusy = false;
      }
    },

    async logout () {
      try { await this.operatorSvc().Logout(); } catch (e) { /* ignore */ }
      this.session = null;
      this.daySession = null;
      this.trainingMode = false;
      this.persist();
    },
    toggleTrainingMode () {
      this.trainingMode = !this.trainingMode;
    },

    // ---- Cash point ----
    async selectCashPoint (cp) {
      // A check belongs to the cash point it was opened on — settle its fate (park/void)
      // before switching, or the sale would land in the new cash point's drawer/report. A table
      // check is asked about here too (tableNeedsDecision): leaving it on the table is allowed,
      // but it has to be the operator's stated choice, not a silent consequence of the switch.
      if (!(await this.prepareForNewActiveCheck(null, null, true))) { return; }
      this.activeCheck = null;
      this.clearSavedActiveOrder();
      this.cashPoint = cp;
      this.session = null;
      this.mode = 'sell';
      this.persist();
      this.loading = true;
      try {
        await this.afterCashPointChosen(null);
      } finally {
        this.loading = false;
      }
    },

    async requestCashPointChange () {
      // Same guard as selectCashPoint: never carry an open check across cash points.
      if (!(await this.prepareForNewActiveCheck(null, null, true))) { return; }
      this.activeCheck = null;
      this.clearSavedActiveOrder();
      this.stopPolling();
      this._readyCheckIds = null;
      this.session = null;
      this.daySession = null;
      this.cashPoint = null;
      this.persist();
    },

    // ---- Day ----
    async beginDay (startFloat) {
      this.daySession = await this.drawerSvc().BeginDay(this.cashPoint.cashPointId, { startFloat });
    },

    // ---- Active check (open check = the server-side cart, shared by Sell and Board) ----
    // Opens a new check. tableId null = quick sale without a table. deliveryType sets the VAT
    // context (TableDelivery = eat-in 25 %, SelfPickup = takeaway 15 %) and locks after finalize.
    // Leaving a check that still carries items is an explicit operator decision: park it
    // (stays open, resumable) or void it (VOIDTRANS — an abandoned started sale is an
    // "avbrutt salg" the X/Z report must count, so it can never just be deleted). An empty
    // draft is discarded silently. Resolves false when the operator backs out.
    resolvePreviousCheck (previous, targetTableId = null, tableNeedsDecision = false) {
      if (!previous) { return Promise.resolve(true); }
      const items = previous.items || [];
      if (items.length === 0) {
        this.discardCheckIfEmpty(previous);
        return Promise.resolve(true);
      }
      // A check that sits on a table already has a home: it stays open on that table and the board
      // shows it there. Walking away from it (another table, a new sale, the floor plan) is
      // navigation, not abandonment, so it asks nothing — parking it would be the one thing that
      // actually loses it, by taking it off the table and into the parked strip.
      // Only the fiscal exits (cash point change, leaving the register) still make the operator
      // decide, and they pass tableNeedsDecision so the prompt offers "keep on table" first.
      if (previous.tableId && !tableNeedsDecision) {
        // Cleared here, not left for the caller: the callers that throw on their way to the new
        // check (Resume taken by another register, OpenCheck failing) would otherwise keep
        // rendering and persisting a check the operator has already left behind.
        this.clearActiveCheck();
        return Promise.resolve(true);
      }
      return new Promise((resolve) => {
        // A prompt already pending (racing callers) must not be silently replaced — its
        // caller would hang forever; resolve it as backed-out first.
        if (this.abandonPrompt) { this.abandonPrompt.resolve(false); }
        this.abandonTablePick = false;
        this.abandonBusy = false;
        // A void confirmation left standing would re-render against the NEW prompt's check and
        // void a check the operator never picked.
        this.abandonVoidConfirm = false;
        // Carried so the park branch knows the register is being left behind (cash point change,
        // exit) and must not offer an undo it cannot honour — see onAbandonChoice.
        this.abandonPrompt = { check: previous, resolve, targetTableId, leavingRegister: tableNeedsDecision };
      });
    },

    tableLabel (t) {
      return t.name || (this.$i('pos_table') + ' ' + t.tableNumber);
    },

    // Places the abandoned check on a free table: it stays open and visible where the guests are
    // sitting, instead of going to the parked list the floor has to remember to search.
    async onAbandonPlace (table) {
      const prompt = this.abandonPrompt;
      if (!prompt || this.abandonBusy) { return; }
      this.abandonBusy = true;
      try {
        const moved = await this.checkSvc().Move(prompt.check.orderId, { tableId: table.tableId });
        this.abandonPrompt = null;
        this.abandonTablePick = false;
        this.refreshBoard();
        // Moving onto the very table the operator was opening fulfils that intent, so the pending
        // open must NOT continue — it would put a second check on the same table. It also means
        // nothing downstream adopts the check, so do it here: the operator tapped that table to
        // start ringing in, and adoptCheck lands them on the sell screen with it open. Anywhere
        // else the check is merely settled, and the caller proceeds to its own check.
        if (table.tableId === prompt.targetTableId) {
          this.adoptCheck(moved);
          prompt.resolve(false);
        } else {
          // Handed off to a different table: it is settled, not adopted. Keeping it as activeCheck
          // only works while the caller overwrites it right after — and the callers that throw
          // (Resume taken by another register, OpenCheck failing) never get that far, leaving the
          // shell rendering and persisting a check that now belongs somewhere else.
          this.clearActiveCheck();
          prompt.resolve(true);
        }
      } catch (e) {
        // Keep the prompt up on failure — the operator still has to settle this check, and the
        // table may simply have been taken by another register since the last board poll.
        this.notify(this.errMsg(e), 'error');
        this.abandonTablePick = false;
        this.refreshBoard();
      } finally {
        this.abandonBusy = false;
      }
    },

    async onAbandonChoice (choice) {
      const prompt = this.abandonPrompt;
      if (!prompt || this.abandonBusy) { return; }
      // "Keep on table": the check is already open on its table server-side, so this is purely
      // local — drop it as the active check and let the caller proceed. Nothing goes over the
      // wire, which is exactly why it is the primary answer for a seated check.
      if (choice === 'keep') {
        this.abandonPrompt = null;
        this.abandonTablePick = false;
        this.clearActiveCheck();
        prompt.resolve(true);
        return;
      }
      // Cancel settles instantly — nothing is sent, so there is nothing to wait for.
      if (choice !== 'park' && choice !== 'void') {
        this.abandonPrompt = null;
        this.abandonTablePick = false;
        prompt.resolve(false);
        return;
      }
      // Park and void go over the wire, and a void journals an irreversible VOIDTRANS. The prompt
      // stays up with its buttons disabled until the request settles, so the operator sees the
      // work happening instead of a dialog that vanishes into a silent round trip — and cannot
      // fire a second decision at the same check meanwhile.
      this.abandonBusy = true;
      try {
        if (choice === 'park') {
          await this.checkSvc().Park(prompt.check.orderId);
        } else {
          await this.voidCheckQuick(prompt.check.orderId);
        }
        this.abandonPrompt = null;
        this.abandonTablePick = false;
        this.abandonVoidConfirm = false;
        // After the dialog is down, so the confirmation (and its undo) is not raised behind it.
        // Undo is withheld on the ways out of the register: on exit the caller routes away in the
        // same tick and takes the toast with it, and after a cash point change the undo's Resume
        // would go out stamped with an operator session that no longer exists. A button that
        // cannot work is worse than no button — the notice itself still says what happened.
        if (choice === 'park') { this.notifyParked(prompt.check, !prompt.leavingRegister); }
        this.refreshBoard();
        prompt.resolve(true);
      } catch (e) {
        // Surface why it could not be settled — a silent false reads as a dead button. The prompt
        // stays up so the operator can pick another way out.
        this.notify(this.errMsg(e), 'error');
      } finally {
        this.abandonBusy = false;
        // Always: a failed void must not leave its confirmation dialog open on top of the prompt,
        // still armed to fire the irreversible call again with the error toast covering it.
        // Re-deciding to void has to be a fresh, deliberate confirmation.
        this.abandonVoidConfirm = false;
      }
    },

    // Park confirmation. Parking a check that sat on a table takes it OFF that table — the tile goes
    // free and the check moves into the parked strip — which is the one thing about park an operator
    // is not told by its name. So the seated case says what happened and offers a real undo for as
    // long as the toast lives; a table-less park keeps the plain notice it always had.
    // undoable=false for the paths that leave the register behind: the toast would either be torn
    // down before it can be read, or its Resume would go out on a dead operator session.
    notifyParked (check, undoable = true) {
      if (!check || !check.tableId) {
        this.notify(this.$i('pos_parked'), 'success');
        return;
      }
      const name = check.tableName || this.$i('pos_table');
      this.notify(this.$i('pos_parked_off_table', { name }), 'info', {
        timeout: 8000,
        actionLabel: undoable ? this.$i('pos_undo') : '',
        // Deliberately un-owned: the undo closes over nothing but the shell and the orderId, so it
        // is safe (and useful) for it to outlive the screen the park was fired from.
        onAction: undoable ? () => this.undoParkToTable(check) : null
      });
    },
    // Resume un-parks and re-seats in one call, so the undo restores exactly the prior state: the
    // check open on its table again. It is NOT adopted as the active check — the operator parked it
    // to move on, and may already be ringing into another one.
    async undoParkToTable (check) {
      try {
        await this.checkSvc().Resume(check.orderId, { tableId: check.tableId });
        this.refreshBoard();
        this.notify(this.$i('pos_back_on_table', { name: check.tableName || this.$i('pos_table') }), 'success');
      } catch (e) {
        this.notify(this.errMsg(e), 'error');
      }
    },

    // Starts the next customer's sale without touching the current check. A seated check is left
    // open on its table (resolvePreviousCheck answers silently); a table-less one still has nowhere
    // to live, so it gets the park-or-void prompt as before. This is the button that makes "Park"
    // unnecessary as a way to merely get the screen free.
    async startNewSale () {
      if (this.addsPending > 0) {
        this.notify(this.$i('pos_wait_for_adds'), 'info', { replaceKey: 'wait-busy', timeout: 2000 });
        return;
      }
      if (!(await this.prepareForNewActiveCheck(null))) { return; }
      // The prompt's park/void branches leave activeCheck standing (their callers normally
      // overwrite it); here nothing follows, so clear it explicitly. A silent keep-on-table
      // already cleared it — clearing twice is a no-op.
      this.activeCheck = null;
      this.persist();
      this.mode = 'sell';
    },

    // One-tap void: the backend journals VOIDTRANS regardless; the § 5-3-7 reason is only
    // required for returns, so an abandoned check needs no reason friction.
    async voidCheckQuick (orderId) {
      await this.checkSvc().VoidCheck(orderId, { reasonType: 'None', reasonText: '' });
      this.refreshBoard();
    },

    async openCheck ({ tableId = null, couverts = null, deliveryType }) {
      // The table being opened is passed along so an abandon prompt can offer it by name.
      if (!(await this.prepareForNewActiveCheck(null, tableId))) { return null; }
      const check = await this.checkSvc().OpenCheck({
        cashPointId: this.cashPoint.cashPointId,
        tableId,
        couverts,
        deliveryType
      });
      this.activeCheck = check;
      this.persist();
      return check;
    },

    // Stores the CheckModel returned by any check mutation so the panel re-renders from server truth.
    applyCheck (check) {
      this.activeCheck = check;
      this.persist();
      return check;
    },

    // Resolves the current active check (park-or-void prompt) ahead of adopting another one.
    // Callers that mutate server state to obtain the new check (e.g. Resume, which un-parks)
    // MUST call this first, so a cancelled prompt doesn't leave the new check dangling —
    // neither parked nor active.
    prepareForNewActiveCheck (nextOrderId, targetTableId = null, tableNeedsDecision = false) {
      // A restore that failed on transport may still reference a live check. Before adopting
      // a different one (which overwrites the saved id), park the referenced check server-side
      // (best effort) so it stays visible on the board instead of becoming an orphan.
      if (this._restorePending) {
        const saved = this.readLocal();
        if (saved.activeOrderId && saved.activeOrderId !== nextOrderId) {
          this.checkSvc().Park(saved.activeOrderId).catch(() => {});
        }
        this._restorePending = false;
      }
      const previous = this.activeCheck;
      if (previous && (!nextOrderId || previous.orderId !== nextOrderId)) {
        return this.resolvePreviousCheck(previous, targetTableId, tableNeedsDecision);
      }
      return Promise.resolve(true);
    },
    adoptCheck (check) {
      this.activeCheck = check;
      this.mode = 'sell';
      this.persist();
      return true;
    },
    async setActiveCheck (check) {
      const resolved = await this.prepareForNewActiveCheck(check ? check.orderId : null);
      if (!resolved) { return false; }
      return this.adoptCheck(check);
    },

    async reloadActiveCheck () {
      if (!this.activeCheck) { return; }
      try {
        this.activeCheck = await this.checkSvc().GetCheck(this.activeCheck.orderId);
      } catch (e) {
        // Check no longer retrievable (e.g. finalized elsewhere) — drop it.
        this.activeCheck = null;
      }
    },

    clearActiveCheck () {
      this.activeCheck = null;
      this.persist();
    },

    // Best-effort cleanup of an empty draft (a table opened but nothing rung in). The server
    // re-checks and only discards a check with no line and nothing journalled, so a call on a check
    // that turns out to hold something is a harmless no-op. Fire-and-forget: it must never block
    // navigation, and a failure just leaves the check for the day-close guard to clean up.
    discardCheckIfEmpty (check) {
      if (!check || (check.items || []).length > 0) { return; }
      this.checkSvc().DiscardEmptyCheck(check.orderId).catch(() => {});
    },

    // ---- Mode / navigation ----
    setMode (mode) {
      // Sell and Board are ONE mounted screen — only its left column swaps — so moving between them
      // tears nothing down and must trigger neither guard below. Both used to fire on any
      // mode !== 'sell', which after the merge meant a glance at the floor plan discarded the table
      // the operator had just opened (releasing it server-side) and blocked the switch mid-drain for
      // a queue that was never at risk. Only leaving the pair for Dag / Kvitteringer unmounts it.
      const leavingSellScreen = mode !== 'sell' && mode !== 'board';
      const onSellScreen = this.mode === 'sell' || this.mode === 'board';
      // The unmount takes the sell screen's add queue with it. Lines the operator already rang in
      // would never reach the check — it comes back short, and a bill settled in that state
      // undercharges. beforeDestroy reports the loss, but preventing it is better than explaining it.
      if (leavingSellScreen && this.addsPending > 0) {
        this.notify(this.$i('pos_wait_for_adds'), 'info', { replaceKey: 'wait-busy', timeout: 2000 });
        return;
      }
      // Leaving with an empty draft active (a table opened but nothing rung in) discards it so it
      // never lingers on the board or blocks the day close. Opening another check goes through
      // prepareForNewActiveCheck, which discards an empty predecessor the same way.
      if (leavingSellScreen && onSellScreen && this.activeCheck && (this.activeCheck.items || []).length === 0) {
        this.discardCheckIfEmpty(this.activeCheck);
        this.activeCheck = null;
        this.persist();
      }
      this.mode = mode;
    },

    // Confirmed void from the abandon prompt's danger row. The confirm dialog stays up (its own
    // :busy renders the wait) until onAbandonChoice settles and clears it, so the irreversible
    // VOIDTRANS never runs behind a screen that already looks finished.
    onAbandonVoidConfirmed () {
      this.onAbandonChoice('void');
    },

    // Leaving with a check that still carries items ran no guard at all, while every other way out
    // of a check (switching table, cash point, operator) prompts. An empty draft still leaves
    // silently — beforeDestroy discards it.
    requestExit () {
      // Same reason as setMode, and worse here: leaving the register tears down the shell in the
      // same tick as the sell screen, so the "lines were not added" toast is destroyed before it
      // can be read. The check would come back short with nothing on screen to say so.
      if (this.addsPending > 0) {
        this.notify(this.$i('pos_wait_for_adds'), 'info', { replaceKey: 'wait-busy', timeout: 2000 });
        return;
      }
      if (this.activeCheck && (this.activeCheck.items || []).length > 0) {
        this.exitConfirm = true;
        return;
      }
      this.exit();
    },
    async onExitConfirmed () {
      this.exitConfirm = false;
      // Same park-or-void decision as everywhere else; backing out of it cancels the exit. A table
      // check is included: walking out of the register is not navigation, and the operator should
      // see what they are leaving behind before the screen is gone.
      if (!(await this.prepareForNewActiveCheck(null, null, true))) { return; }
      this.activeCheck = null;
      this.clearSavedActiveOrder();
      this.exit();
    },
    // Every internal way out of the register funnels through here, not just the top-bar button, so
    // the queued-lines guard belongs here too. It cannot rely on SellScreen's toast: Vue 2 runs the
    // parent's beforeDestroy first, so the shell has already emptied `toasts` by the time the child
    // raises one — on a shell teardown the warning is created into nothing. Refusing to leave while
    // lines are outstanding is the only version of this the operator can actually see.
    exit () {
      if (this.addsPending > 0) {
        this.notify(this.$i('pos_wait_for_adds'), 'info', { replaceKey: 'wait-busy', timeout: 2000 });
        return;
      }
      this.$router.push('/admin?storeId=' + this.storeId);
    },

    // ---- Board polling (shared by Sell sold-out marking and Board view) ----
    startPolling () {
      this.stopPolling();
      if (!this.session) { return; }
      this.refreshBoard();
      this.boardTimer = setInterval(this.refreshBoard, 6000);
    },
    stopPolling () {
      if (this.boardTimer) { clearInterval(this.boardTimer); this.boardTimer = null; }
    },
    // The session is only considered expired when the server actually said so: a 401 whose
    // body carries the backend's operator-session message (OperatorSessionException →
    // middleware). Errors without a status are network failures, and a BARE 401 is the
    // ADMIN bearer token dying — neither is fixable from the PIN screen.
    isSessionExpired (e) {
      return !!(e && e.statusCode === 401 && /operator session/i.test(e.message || ''));
    },
    endSessionLocally () {
      // Operator session expired mid-run — drop to the PIN screen without losing the cash point.
      this.session = null;
      this.stopPolling();
      this.persist();
      // A 401 means the server answered — connectivity is fine; drop any offline pacing so
      // the next session starts at full poll speed with no stale offline banner.
      this.online = true;
      this._offlineTicks = 0;
    },
    // force = the operator asked for this one (the board's Oppdater button), as opposed to the
    // background tick. It skips the offline backoff: a hand on the screen is exactly when the
    // register should try, and the backoff would otherwise no-op two taps out of three — the
    // case the button exists for.
    async refreshBoard (force = false) {
      if (!this.session || !this.storeId) { return; }
      // During a card payment the board is hidden behind the payment overlay and its 401s are
      // deferred anyway — skip the poll so an expired session doesn't 401-spin every 6s.
      if (this.paymentActive) { return; }
      // A poll slower than the 6s interval must not stack requests, and while offline only
      // every third tick probes (≈18s) to spare the radio; the first success resets the pace.
      // A forced refresh that lands mid-poll waits for that poll instead of returning straight
      // away, so the button's spinner stops on real data rather than on nothing having happened.
      if (this._boardBusy) { return force ? this._boardPoll : undefined; }
      if (!this.online && !force) {
        this._offlineTicks++;
        if (this._offlineTicks % 3 !== 0) { return; }
      }
      this._boardBusy = true;
      this._boardPoll = new Promise((resolve) => { this._boardPollDone = resolve; });
      try {
        this.boardStatus = await this.checkSvc().BoardStatus(this.storeId);
        this.detectFoodReady(this.boardStatus);
        this.reconcileActiveCheck(this.boardStatus);
        this.online = true;
        this._offlineTicks = 0;
        // Connectivity is back: settle a restore that failed on transport earlier.
        if (this._restorePending && !this.activeCheck) {
          this.restoreActiveCheck().then(() => this.persist());
        }
      } catch (e) {
        // Expired -> drop to PIN (deferred while a payment is active); otherwise it's a network
        // error, so mark offline and let the backoff pace the retries.
        if (!this.endSessionIfExpired(e) && !this.isSessionExpired(e)) {
          this.online = false;
        }
      } finally {
        this._boardBusy = false;
        if (this._boardPollDone) { this._boardPollDone(); }
        this._boardPollDone = null;
      }
    },

    // The active check can stop being an open check without this register doing anything: another
    // terminal settles it, a bulk void catches it, the day close sweeps it. Left alone the panel
    // keeps rendering its lines and every action answers "the order is not an open check", with no
    // way out but a reload. The board is the authority on what is still open, so a check that has
    // vanished from it is dropped here.
    //
    // Two consecutive misses are required: a check opened between two polls is legitimately absent
    // from the snapshot in flight, and dropping it on the first miss would delete a live cart.
    reconcileActiveCheck (board) {
      if (!board || !this.activeCheck) { this._activeCheckMisses = 0; return; }
      // A card payment owns the check while the customer is at the terminal — never pull it away
      // mid-flow; the poll is skipped then anyway, this is the belt. The count is cleared like
      // every other early return: a miss recorded before the payment must not combine with the
      // first miss after it and drop the check on what is effectively a single stale poll.
      if (this.paymentActive) { this._activeCheckMisses = 0; return; }

      const id = this.activeCheck.orderId;
      const onBoard = (board.tables || []).some(t => t.openCheck && t.openCheck.orderId === id) ||
        (board.parkedChecks || []).some(oc => oc.orderId === id);
      if (onBoard) { this._activeCheckMisses = 0; return; }

      // The count belongs to ONE check. Without this, a miss recorded for the check that just got
      // settled elsewhere would carry over to the next check the operator opens — and a poll whose
      // server-side snapshot predates that check (it is younger than the request) reads as its
      // second miss, discarding a live check the operator is ringing into.
      if (this._activeCheckMissId !== id) {
        this._activeCheckMissId = id;
        this._activeCheckMisses = 0;
      }
      this._activeCheckMisses++;
      if (this._activeCheckMisses < 2) { return; }
      this._activeCheckMisses = 0;
      this._activeCheckMissId = null;
      this.activeCheck = null;
      this.clearSavedActiveOrder();
      this.notify(this.$i('pos_check_gone'), 'info');
    },

    // ---- Food-ready detection (floor <-> kitchen loop) ----
    // Compares this poll's set of checks that have a Ready line against the previous poll. A check
    // that newly gains a Ready line raises one calm toast (and optional chime). Tracking is per
    // check, so it fires once per ready-transition, not once per ready line — no spam. The first
    // successful poll seeds silently (prev is null) so startup does not toast pre-existing state.
    detectFoodReady (board) {
      if (!board) { return; }
      const current = {};
      const collect = (oc, fallbackName) => {
        if (oc && (oc.lines || []).some(l => l.status === 'Ready')) {
          current[oc.orderId] = oc.tableName || fallbackName || this.$i('pos_quick_sale');
        }
      };
      (board.tables || []).forEach(t => collect(t.openCheck, t.name));
      (board.parkedChecks || []).forEach(oc => collect(oc, null));

      const prev = this._readyCheckIds;
      if (prev) {
        const newly = Object.keys(current).filter(id => !prev[id]).map(id => current[id]);
        if (newly.length) { this.showFoodReady(newly); }
      }
      this._readyCheckIds = current;
    },
    showFoodReady (names) {
      this.notify(this.$i('pos_food_ready_toast', { name: names.join(', ') }), 'food', {
        position: 'bottom',
        timeout: 5000,
        // One food-ready nudge at a time: a second table going ready replaces the first rather
        // than stacking a wall of bells over the floor plan.
        replaceKey: 'food-ready'
      });
      if (this.chimeEnabled) { this.playChime(); }
    },
    // ---- Receipt printing ----
    // Single owner of "print this document". Every receipt — sale, return, refund, copy,
    // provisional bill and training sale — is rendered as ESC/POS by the backend and pushed to
    // the cash point's Surfboard terminal printer, so paper always matches the journalled
    // document. Returns false only when the cash point has no terminal (the caller then falls
    // back to the browser's 80 mm iframe print); a terminal that is configured but fails throws,
    // so the operator is told instead of silently getting a different-looking paper receipt.
    async printReceiptDoc (receipt) {
      const cashPoint = this.cashPoint;
      if (!cashPoint || !cashPoint.surfboardTerminalId || !receipt) { return false; }
      // A copy must print from the COPYREC entry: the original's id would render an unmarked
      // second original instead of the "KOPI"-marked document.
      const entryId = receipt.copyJournalEntryId || receipt.journalEntryId;
      if (!entryId) { return false; }
      await this.posSvc().PrintReceipt(entryId, cashPoint.cashPointId);
      return true;
    },
    // ---- Toasts: the single notify() every screen calls ----
    // opts.actionLabel + opts.onAction turn the toast into an undo affordance.
    // opts.replaceKey drops any earlier toast carrying the same key.
    notify (message, type = 'info', opts = {}) {
      if (opts.replaceKey) {
        this.toasts.filter(t => t.replaceKey === opts.replaceKey).forEach(t => this.dismissToast(t));
      }
      const toast = {
        id: ++this._toastSeq,
        message,
        type,
        position: opts.position || 'top',
        actionLabel: opts.actionLabel || '',
        onAction: opts.onAction || null,
        // The screen whose state the action closes over, so the toast can be pulled when that
        // screen goes away (see dropToastActionsFor). Only actionable toasts need one — a plain
        // message is safe to outlive its author, which is the point of shell-owned toasts.
        owner: opts.owner || null,
        replaceKey: opts.replaceKey || '',
        timer: null
      };
      toast.timer = setTimeout(() => this.dismissToast(toast), opts.timeout || 3500);
      this.toasts.push(toast);
      return toast;
    },
    dismissToast (toast) {
      const i = this.toasts.indexOf(toast);
      if (i === -1) { return; }
      if (toast.timer) { clearTimeout(toast.timer); toast.timer = null; }
      this.toasts.splice(i, 1);
    },
    // Called by a screen as it unmounts. An "Angre" whose closure belongs to a screen that is no
    // longer there would re-add lines from a destroyed component — onto whichever check is active
    // by then, with its progress row rendering nowhere. The toast goes with the screen.
    dropToastActionsFor (owner) {
      this.toasts.filter(t => t.owner === owner && t.onAction).forEach(t => this.dismissToast(t));
    },
    runToastAction (toast) {
      const i = this.toasts.indexOf(toast);
      if (i === -1) { return; }
      if (toast.timer) { clearTimeout(toast.timer); toast.timer = null; }
      this.toasts.splice(i, 1);
      if (toast.onAction) { toast.onAction(); }
    },
    // Opening the cash drawer is hardware-bound (printer kick pulse) and only works in the native
    // POS app; the web build keeps the button for UI parity but can only say so.
    openDrawer () {
      this.notify(this.$i('pos_open_drawer_web_unsupported'), 'info');
    },
    readChimePref () {
      try { return localStorage.getItem('okam-pos-chime-' + this.storeId) === '1'; } catch (e) { return false; }
    },
    toggleChime () {
      this.chimeEnabled = !this.chimeEnabled;
      try { localStorage.setItem('okam-pos-chime-' + this.storeId, this.chimeEnabled ? '1' : '0'); } catch (e) { /* ignore */ }
      // Turning it on previews the sound; the toggle click is the user gesture that unlocks audio.
      if (this.chimeEnabled) { this.playChime(); }
    },
    // A short, soft two-note chime via the Web Audio API — no asset to load, kept quiet on purpose.
    playChime () {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) { return; }
        if (!this._audioCtx) { this._audioCtx = new Ctx(); }
        const ctx = this._audioCtx;
        if (ctx.state === 'suspended') { ctx.resume(); }
        const now = ctx.currentTime;
        [880, 1174.66].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const start = now + i * 0.14;
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.06, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.32);
        });
      } catch (e) { /* audio unavailable */ }
    },

    // ---- Persistence (cash point + operator session per store) ----
    lsKey () { return 'okam-pos-' + this.storeId; },
    readLocal () {
      try { return JSON.parse(localStorage.getItem(this.lsKey()) || '{}') || {}; } catch (e) { return {}; }
    },
    persist () {
      try {
        let activeOrderId = this.activeCheck ? this.activeCheck.orderId : null;
        // While there is no operator session the active check cannot have been restored yet
        // (restoreActiveCheck bails without one), and while a restore retry is pending the
        // check may still be live — in both cases keep the saved reference instead of
        // clobbering it, so it can still be re-attached.
        if (!activeOrderId && (!this.session || this._restorePending)) {
          activeOrderId = this.readLocal().activeOrderId || null;
        }
        localStorage.setItem(this.lsKey(), JSON.stringify({
          cashPointId: this.cashPoint ? this.cashPoint.cashPointId : null,
          operatorSessionId: this.session ? this.session.operatorSessionId : null,
          activeOrderId
        }));
      } catch (e) { /* ignore */ }
    },

    // Deliberately drops the persisted active-check reference (the check was just parked,
    // voided or handed off) — bypasses persist()'s logged-out preservation.
    clearSavedActiveOrder () {
      this._restorePending = false;
      try {
        const saved = this.readLocal();
        if (saved.activeOrderId) {
          saved.activeOrderId = null;
          localStorage.setItem(this.lsKey(), JSON.stringify(saved));
        }
      } catch (e) { /* ignore */ }
    }
  }
};
</script>

<style scoped>
.pos-root {
  --pos-primary: #1bb776;
  --pos-primary-dark: #159f63;
  --pos-ink: #292c34;
  --pos-surface: #f8f9fa;
  position: fixed;
  inset: 0;
  /* Above any admin chrome — the register must never render behind the sidebar,
     even if a future change re-introduces header markup on this page. */
  z-index: 2000;
  display: flex;
  flex-direction: column;
  background: var(--pos-surface);
  overflow: hidden;
}

.pos-body {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.pos-boot {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: #64748b;
}
.pos-boot__spinner {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 4px solid #e2e8f0;
  border-top-color: var(--pos-primary);
  animation: pos-spin 0.8s linear infinite;
}
@keyframes pos-spin { to { transform: rotate(360deg); } }
.pos-boot__error { color: #ef4444; font-weight: 600; max-width: 420px; text-align: center; }
.pos-boot__retry {
  border: none;
  background: var(--pos-primary);
  color: #ffffff;
  font-weight: 700;
  padding: 12px 26px;
  border-radius: 10px;
  cursor: pointer;
}
.pos-boot__link { border: none; background: none; color: #64748b; cursor: pointer; text-decoration: underline; }

.pos-abandon {
  position: fixed;
  inset: 0;
  background: rgba(18, 20, 26, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100;
  padding: 16px;
}
.pos-abandon__panel {
  background: #ffffff;
  border-radius: 18px;
  padding: 24px;
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}
.pos-abandon__title { margin: 0; font-size: 1.2rem; font-weight: 700; color: var(--pos-ink, #292c34); }
.pos-abandon__text { margin: 0 0 6px; color: #64748b; }
.pos-abandon__park {
  height: 52px;
  border: none;
  border-radius: 12px;
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}
.pos-abandon__secondary {
  height: 52px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  color: var(--pos-ink, #292c34);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}
.pos-abandon__secondary:hover { background: #f8fafc; }

.pos-abandon__tables { display: flex; flex-direction: column; gap: 8px; max-height: 46vh; overflow-y: auto; }
.pos-abandon__table {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 52px;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  cursor: pointer;
}
.pos-abandon__table:hover { background: #eef2f7; }
.pos-abandon__table:disabled { opacity: 0.55; cursor: default; }
.pos-abandon__table-name { font-weight: 700; color: var(--pos-ink, #292c34); }
.pos-abandon__table-act { font-size: 0.82rem; font-weight: 600; color: var(--pos-primary, #1bb776); }

.pos-abandon__danger {
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
  display: flex;
}
.pos-abandon__void {
  flex: 1;
  min-height: 48px;
  border: none;
  border-radius: 12px;
  background: none;
  color: #dc2626;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}
.pos-abandon__void:hover:not(:disabled) { background: #fef2f2; }
.pos-abandon__void:disabled { opacity: 0.5; cursor: default; }
.pos-abandon__cancel { border: none; background: none; color: #64748b; font-weight: 600; cursor: pointer; padding: 8px; }

</style>

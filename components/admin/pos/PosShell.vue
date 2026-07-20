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
        <SellScreen v-if="mode === 'sell'" v-show="canOperate" />
        <BoardView v-else-if="mode === 'board'" />
        <DayFlow v-else-if="mode === 'day'" />
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
      <div v-if="abandonPrompt" class="pos-abandon" @click.self="onAbandonChoice('cancel')">
        <div class="pos-abandon__panel">
          <h3 class="pos-abandon__title">{{ abandonPrompt.check.tableName || $i('pos_quick_sale') }}</h3>
          <p class="pos-abandon__text">
            {{ $i('pos_abandon_prompt', { name: abandonPrompt.check.tableName || $i('pos_quick_sale'), amount: priceLabel(abandonPrompt.check.finalAmount) }) }}
          </p>
          <button type="button" class="pos-abandon__park" @click="onAbandonChoice('park')">
            {{ $i('pos_park_check') }}
          </button>
          <button type="button" class="pos-abandon__void" @click="onAbandonChoice('void')">
            {{ $i('pos_void_check') }}
          </button>
          <button type="button" class="pos-abandon__cancel" @click="onAbandonChoice('cancel')">
            {{ $i('common_cancel') }}
          </button>
        </div>
      </div>

      <!-- Calm, non-blocking "food ready" toast: the board poll detected a check whose kitchen work
           just finished (a line went to Ready). Shown across every mode; tap to dismiss. -->
      <transition name="pos-foodtoast">
        <button
          v-if="foodReadyToast.show"
          type="button"
          class="pos-foodtoast"
          @click="dismissFoodReady"
        >
          <span class="pos-foodtoast__icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </span>
          <span class="pos-foodtoast__text">{{ foodReadyToast.message }}</span>
        </button>
      </transition>

      <!-- Shell-level notice toast (park/void failures from the abandon prompt); tap to dismiss. -->
      <transition name="pos-notice">
        <button
          v-if="notice.show"
          type="button"
          class="pos-notice"
          :class="'pos-notice--' + notice.type"
          @click="dismissNotice"
        >
          {{ notice.message }}
        </button>
      </transition>
    </template>
  </div>
</template>

<script>
import PosTopBar from '~/components/admin/pos/PosTopBar.vue';
import SellScreen from '~/components/admin/pos/SellScreen.vue';
import BoardView from '~/components/admin/pos/BoardView.vue';
import DayFlow from '~/components/admin/pos/DayFlow.vue';
import CashPointPicker from '~/components/admin/pos/CashPointPicker.vue';
import OperatorLoginScreen from '~/components/admin/pos/OperatorLoginScreen.vue';
import BeginDayModal from '~/components/admin/pos/BeginDayModal.vue';
import PinPadModal from '~/components/admin/pos/PinPadModal.vue';

// PosShell owns the whole POS session: cash point, operator session, open trading day, active mode
// and the polled board status. It is provided to every descendant as `pos`, and it is the single
// place that stamps the X-Operator-Session header onto the (per-access) core service instances.
export default {
  name: 'PosShell',
  components: {
    PosTopBar,
    SellScreen,
    BoardView,
    DayFlow,
    CashPointPicker,
    OperatorLoginScreen,
    BeginDayModal,
    PinPadModal
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
      showSwitch: false,
      switchBusy: false,
      switchError: '',
      boardTimer: null,
      // "Food ready" toast surfaced when the board poll sees a check newly gain a Ready line.
      foodReadyToast: { show: false, message: '' },
      foodReadyToastTimer: null,
      // Shell-level toast for failures raised from shell-owned flows (park/void on abandon).
      notice: { show: false, message: '', type: 'info' },
      noticeTimer: null,
      // Soft chime on food-ready. Off by default (no autoplay surprises); persisted per store and
      // toggled from the top bar.
      chimeEnabled: false,
      // Leaving a non-empty check prompts park-or-void; resolves the pending switch.
      abandonPrompt: null
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
    needsDay () { return !!this.cashPoint && !!this.session && !this.dayOpen && this.mode !== 'day'; },
    canOperate () { return !!this.cashPoint && !!this.session && this.dayOpen; }
  },
  mounted () {
    // Non-reactive tracking of which open checks had a Ready line at the previous poll, so a toast
    // fires once per table when it transitions into "food ready" (null = not yet seeded).
    this._readyCheckIds = null;
    this._audioCtx = null;
    // Board-poll bookkeeping: a request slower than the interval must not stack, and while
    // offline only every third tick probes.
    this._boardBusy = false;
    this._offlineTicks = 0;
    // restoreActiveCheck hit a transport failure: the saved activeOrderId must survive
    // persist() until a retry settles it (attached, or confirmed gone). The retry rides the
    // board poll (bounded pacing, stops with the shell) instead of its own timer.
    this._restorePending = false;
    // Guards against two board-poll retries launching overlapping restoreActiveCheck calls.
    this._restoreInFlight = false;
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
    if (this.foodReadyToastTimer) { clearTimeout(this.foodReadyToastTimer); }
    if (this.noticeTimer) { clearTimeout(this.noticeTimer); this.noticeTimer = null; }
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
      // before switching, or the sale would land in the new cash point's drawer/report.
      if (!(await this.prepareForNewActiveCheck(null))) { return; }
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
      if (!(await this.prepareForNewActiveCheck(null))) { return; }
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
    resolvePreviousCheck (previous) {
      if (!previous) { return Promise.resolve(true); }
      const items = previous.items || [];
      if (items.length === 0) {
        this.discardCheckIfEmpty(previous);
        return Promise.resolve(true);
      }
      return new Promise((resolve) => {
        // A prompt already pending (racing callers) must not be silently replaced — its
        // caller would hang forever; resolve it as backed-out first.
        if (this.abandonPrompt) { this.abandonPrompt.resolve(false); }
        this.abandonPrompt = { check: previous, resolve };
      });
    },

    async onAbandonChoice (choice) {
      const prompt = this.abandonPrompt;
      this.abandonPrompt = null;
      if (!prompt) { return; }
      if (choice === 'park') {
        try {
          await this.checkSvc().Park(prompt.check.orderId);
          this.refreshBoard();
          prompt.resolve(true);
        } catch (e) {
          // Surface why the check could not be parked — a silent false reads as a dead button.
          this.notify(this.errMsg(e), 'error');
          prompt.resolve(false);
        }
        return;
      }
      if (choice === 'void') {
        try {
          await this.voidCheckQuick(prompt.check.orderId);
          prompt.resolve(true);
        } catch (e) {
          this.notify(this.errMsg(e), 'error');
          prompt.resolve(false);
        }
        return;
      }
      prompt.resolve(false);
    },

    // One-tap void: the backend journals VOIDTRANS regardless; the § 5-3-7 reason is only
    // required for returns, so an abandoned check needs no reason friction.
    async voidCheckQuick (orderId) {
      await this.checkSvc().VoidCheck(orderId, { reasonType: 'None', reasonText: '' });
      this.refreshBoard();
    },

    async openCheck ({ tableId = null, couverts = null, deliveryType }) {
      if (!(await this.prepareForNewActiveCheck(null))) { return null; }
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
    prepareForNewActiveCheck (nextOrderId) {
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
        return this.resolvePreviousCheck(previous);
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
      // Leaving the sell screen with an empty draft active (a table opened but nothing rung in)
      // discards it so it never lingers on the board or blocks the day close.
      if (mode !== 'sell' && this.mode === 'sell' && this.activeCheck && (this.activeCheck.items || []).length === 0) {
        this.discardCheckIfEmpty(this.activeCheck);
        this.activeCheck = null;
        this.persist();
      }
      this.mode = mode;
    },

    exit () {
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
    async refreshBoard () {
      if (!this.session || !this.storeId) { return; }
      // During a card payment the board is hidden behind the payment overlay and its 401s are
      // deferred anyway — skip the poll so an expired session doesn't 401-spin every 6s.
      if (this.paymentActive) { return; }
      // A poll slower than the 6s interval must not stack requests, and while offline only
      // every third tick probes (≈18s) to spare the radio; the first success resets the pace.
      if (this._boardBusy) { return; }
      if (!this.online) {
        this._offlineTicks++;
        if (this._offlineTicks % 3 !== 0) { return; }
      }
      this._boardBusy = true;
      try {
        this.boardStatus = await this.checkSvc().BoardStatus(this.storeId);
        this.detectFoodReady(this.boardStatus);
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
      }
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
      this.foodReadyToast = { show: true, message: this.$i('pos_food_ready_toast', { name: names.join(', ') }) };
      if (this.foodReadyToastTimer) { clearTimeout(this.foodReadyToastTimer); }
      this.foodReadyToastTimer = setTimeout(() => { this.foodReadyToast.show = false; }, 5000);
      if (this.chimeEnabled) { this.playChime(); }
    },
    // ---- Shell-level notice toast (same pattern as SellScreen/DayFlow's local notify) ----
    notify (message, type = 'info') {
      this.notice = { show: true, message, type };
      if (this.noticeTimer) { clearTimeout(this.noticeTimer); }
      this.noticeTimer = setTimeout(() => { this.notice.show = false; }, 3500);
    },
    dismissNotice () {
      this.notice.show = false;
      if (this.noticeTimer) { clearTimeout(this.noticeTimer); this.noticeTimer = null; }
    },
    dismissFoodReady () {
      this.foodReadyToast.show = false;
      if (this.foodReadyToastTimer) { clearTimeout(this.foodReadyToastTimer); this.foodReadyToastTimer = null; }
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
.pos-abandon__void {
  height: 52px;
  border: 1px solid #fecaca;
  border-radius: 12px;
  background: #fef2f2;
  color: #dc2626;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}
.pos-abandon__cancel { border: none; background: none; color: #64748b; font-weight: 600; cursor: pointer; padding: 8px; }

.pos-foodtoast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  background: #ffffff;
  border: 1px solid rgba(27, 183, 118, 0.35);
  border-left: 4px solid var(--pos-primary, #1bb776);
  color: var(--pos-ink, #292c34);
  padding: 12px 20px 12px 15px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1rem;
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.18);
  cursor: pointer;
  z-index: 2200;
}
.pos-foodtoast__icon { color: var(--pos-primary-dark, #159f63); display: inline-flex; }
.pos-foodtoast__icon svg { width: 22px; height: 22px; }
.pos-foodtoast-enter-active, .pos-foodtoast-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.pos-foodtoast-enter, .pos-foodtoast-leave-to { opacity: 0; transform: translate(-50%, 12px); }

/* Shell-level notice toast — same look as the screens' local notices, above every overlay. */
.pos-notice {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  border: none;
  padding: 12px 22px;
  border-radius: 12px;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  z-index: 2300;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}
.pos-notice--info { background: #334155; }
.pos-notice--success { background: var(--pos-primary-dark, #159f63); }
.pos-notice--error { background: #ef4444; }

.pos-notice-enter-active, .pos-notice-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.pos-notice-enter, .pos-notice-leave-to { opacity: 0; transform: translate(-50%, -8px); }
</style>

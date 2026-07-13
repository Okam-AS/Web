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
        :error="switchError"
        :busy="switchBusy"
        :confirm-label="$i('pos_switch_button')"
        @submit="onSwitchSubmit"
        @close="showSwitch = false"
      />

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
      online: true,
      showSwitch: false,
      switchBusy: false,
      switchError: '',
      boardTimer: null,
      // "Food ready" toast surfaced when the board poll sees a check newly gain a Ready line.
      foodReadyToast: { show: false, message: '' },
      foodReadyToastTimer: null,
      // Soft chime on food-ready. Off by default (no autoplay surprises); persisted per store and
      // toggled from the top bar.
      chimeEnabled: false
    };
  },
  computed: {
    storeName () {
      const stores = (this.$store.state.currentUser && this.$store.state.currentUser.adminIn) || [];
      const s = stores.find(x => String(x.id) === String(this.storeId));
      return s ? s.name : '';
    },
    sessionId () { return this.session ? this.session.operatorSessionId : ''; },
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
    this.chimeEnabled = this.readChimePref();
    this.startup();
  },
  beforeDestroy () {
    this.stopPolling();
    if (this.foodReadyToastTimer) { clearTimeout(this.foodReadyToastTimer); }
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

    errMsg (e) {
      return (e && e.response && e.response.data && e.response.data.message) || (e && e.message) || this.$i('pos_generic_error');
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
      this.persist();
      this.startPolling();
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
      this.persist();
      await this.loadDay();
      this.startPolling();
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
      this.persist();
    },

    // ---- Cash point ----
    async selectCashPoint (cp) {
      this.cashPoint = cp;
      this.session = null;
      this.mode = 'sell';
      this.loading = true;
      try {
        await this.afterCashPointChosen(null);
      } finally {
        this.loading = false;
      }
    },

    requestCashPointChange () {
      this.stopPolling();
      this._readyCheckIds = null;
      this.session = null;
      this.daySession = null;
      this.cashPoint = null;
    },

    // ---- Day ----
    async beginDay (startFloat) {
      this.daySession = await this.drawerSvc().BeginDay(this.cashPoint.cashPointId, { startFloat });
    },

    // ---- Active check (open check = the server-side cart, shared by Sell and Board) ----
    // Opens a new check. tableId null = quick sale without a table. deliveryType sets the VAT
    // context (TableDelivery = eat-in 25 %, SelfPickup = takeaway 15 %) and locks after finalize.
    async openCheck ({ tableId = null, couverts = null, deliveryType }) {
      const check = await this.checkSvc().OpenCheck({
        cashPointId: this.cashPoint.cashPointId,
        tableId,
        couverts,
        deliveryType
      });
      this.activeCheck = check;
      return check;
    },

    // Stores the CheckModel returned by any check mutation so the panel re-renders from server truth.
    applyCheck (check) {
      this.activeCheck = check;
      return check;
    },

    setActiveCheck (check) {
      this.activeCheck = check;
      this.mode = 'sell';
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
    },

    // ---- Mode / navigation ----
    setMode (mode) {
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
    async refreshBoard () {
      if (!this.session || !this.storeId) { return; }
      try {
        this.boardStatus = await this.checkSvc().BoardStatus(this.storeId);
        this.detectFoodReady(this.boardStatus);
        this.online = true;
      } catch (e) {
        if (e && e.response && e.response.status === 401) {
          // Operator session expired mid-run — drop to the PIN screen without losing the cash point.
          this.session = null;
          this.stopPolling();
          this.persist();
          return;
        }
        this.online = false;
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
        localStorage.setItem(this.lsKey(), JSON.stringify({
          cashPointId: this.cashPoint ? this.cashPoint.cashPointId : null,
          operatorSessionId: this.session ? this.session.operatorSessionId : null
        }));
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
</style>

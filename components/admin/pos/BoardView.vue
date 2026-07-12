<template>
  <div class="board">
    <div class="board__inner">
      <div class="board__head">
        <h2 class="board__title">
          {{ $i('pos_mode_board') }}
        </h2>
        <span v-if="!online" class="board__offline">{{ $i('pos_offline') }}</span>
        <div class="board__zones">
          <button
            v-for="z in zones"
            :key="z.id"
            type="button"
            class="board__zone"
            :class="{ 'is-active': zoneId === z.id }"
            @click="zoneId = z.id"
          >
            {{ z.name }}
          </button>
        </div>
      </div>

      <!-- Floor plan -->
      <div v-if="zoneTables.length" class="board__canvas">
        <svg class="board__svg" :viewBox="viewBox" preserveAspectRatio="xMidYMid meet">
          <g
            v-for="t in zoneTables"
            :key="t.id"
            class="board__table"
            @click="onTableClick(t)"
          >
            <FloorPlanTable :table="t" :status="statusOf(t)" :px-scale="1" />
            <text
              v-if="checkOf(t)"
              class="board__amount"
              text-anchor="middle"
              :x="t.x"
              :y="t.y + t.height / 2 + 26"
              font-size="15"
            >{{ priceLabel(checkOf(t).finalAmount) }}</text>
            <text
              v-else-if="reservationOf(t)"
              class="board__res"
              text-anchor="middle"
              :x="t.x"
              :y="t.y + t.height / 2 + 26"
              font-size="14"
            >{{ hhmm(reservationOf(t).startTime) }}</text>

            <!-- "Mat klar" signal: the kitchen has marked at least one line ready but it has not been
                 served yet. A pulsing green bell badge in the table's corner so a server glancing at
                 the floor knows to run food. -->
            <g
              v-if="readyOf(t)"
              class="board__ready"
              :transform="`translate(${t.x + t.width / 2 - 6}, ${t.y - t.height / 2 + 6})`"
            >
              <circle class="board__ready-pulse" r="13" />
              <circle class="board__ready-badge" r="11" />
              <path
                class="board__ready-bell"
                transform="translate(-6.6 -6.6) scale(0.55)"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </g>
          </g>
        </svg>
      </div>
      <!-- No floor plan: fall back to a list of open checks so Board is still useful. -->
      <div v-else class="board__fallback">
        <p class="board__fallback-hint">
          {{ $i('pos_board_no_floorplan') }} <a class="board__link" :href="'/admin/tables?storeId=' + pos.storeId">{{ $i('pos_board_edit_floorplan') }}</a>
        </p>
        <div v-if="openChecks.length" class="board__parked-grid">
          <button
            v-for="oc in openChecks"
            :key="oc.orderId"
            type="button"
            class="board__parked-card board__parked-card--open"
            :disabled="busy"
            @click="resumeOpenCheck(oc)"
          >
            <span class="board__parked-name">{{ oc.tableName || $i('pos_quick_sale') }}</span>
            <span v-if="checkHasReady(oc)" class="board__parked-ready">{{ $i('pos_food_ready') }}</span>
            <span class="board__parked-amount">{{ priceLabel(oc.finalAmount) }}</span>
            <span class="board__parked-resume">{{ $i('pos_board_open') }}</span>
          </button>
        </div>
      </div>

      <div class="board__legend">
        <span><i class="board__dot board__dot--free" /> {{ $i('pos_board_free') }}</span>
        <span><i class="board__dot board__dot--open" /> {{ $i('pos_board_open') }}</span>
        <span><i class="board__dot board__dot--res" /> {{ $i('pos_board_reserved') }}</span>
        <span><i class="board__dot board__dot--ready" /> {{ $i('pos_food_ready') }}</span>
      </div>

      <!-- Parked -->
      <section v-if="parked.length" class="board__parked">
        <h3 class="board__section-title">
          {{ $i('pos_board_parked') }}
        </h3>
        <div class="board__parked-grid">
          <button
            v-for="p in parked"
            :key="p.orderId"
            type="button"
            class="board__parked-card"
            :disabled="busy"
            @click="resumeParked(p)"
          >
            <span class="board__parked-name">{{ p.tableName || $i('pos_quick_sale') }}</span>
            <span v-if="parkedMeta(p)" class="board__parked-meta">{{ parkedMeta(p) }}</span>
            <span class="board__parked-amount">{{ priceLabel(p.finalAmount) }}</span>
            <span class="board__parked-resume">{{ $i('pos_board_resume') }}</span>
          </button>
        </div>
      </section>

      <transition name="board-notice">
        <div v-if="notice" class="board__notice">
          {{ notice }}
        </div>
      </transition>
    </div>

    <!-- Reservation warning before seating a walk-in on a reserved table -->
    <div v-if="reservationWarnFor" class="board__modal" @click.self="reservationWarnFor = null">
      <div class="board__modal-panel">
        <h3 class="board__modal-title">
          {{ $i('pos_board_open_table', { name: reservationWarnFor.name || ('#' + reservationWarnFor.number) }) }}
        </h3>
        <p class="board__modal-warn">
          {{ $i('pos_board_res_warn', { time: hhmm(reservationOf(reservationWarnFor).startTime) }) }}
        </p>
        <div class="board__modal-actions">
          <button type="button" class="board__modal-cancel" @click="reservationWarnFor = null">
            {{ $i('common_cancel') }}
          </button>
          <button type="button" class="board__modal-open" :disabled="busy" @click="confirmOpenReserved">
            {{ $i('pos_board_open_anyway') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import FloorPlanTable from '~/components/admin/floorplan/FloorPlanTable.vue';

const SHAPE = { Round: 'round', Square: 'square', Rectangle: 'rect' };

// Board mode: the store's floor plan with live check status per table (green = open check with its
// amount, amber = reservation due soon) plus a parked-checks strip. Tapping a free table opens a
// check (with a NextReservation walk-in warning); tapping an occupied table resumes its check.
export default {
  name: 'BoardView',
  components: { FloorPlanTable },
  inject: ['pos'],
  data () {
    return {
      floorPlan: { zones: [], tables: [] },
      zoneId: null,
      busy: false,
      notice: '',
      noticeTimer: null,
      reservationWarnFor: null
    };
  },
  computed: {
    board () { return this.pos.boardStatus; },
    online () { return this.pos.online; },
    zones () {
      return (this.floorPlan.zones || []).filter(z => z.isActive).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    },
    zoneTables () {
      const zid = this.zoneId != null ? this.zoneId : (this.zones[0] && this.zones[0].id);
      return (this.floorPlan.tables || []).filter(t => t.zoneId === zid && t.isActive);
    },
    parked () { return (this.board && this.board.parkedChecks) || []; },
    boardTables () { return (this.board && this.board.tables) || []; },
    // Seated (open, non-parked) checks — used for the no-floor-plan list fallback.
    openChecks () { return this.boardTables.map(t => t.openCheck).filter(Boolean); },
    viewBox () {
      const ts = this.zoneTables;
      if (!ts.length) { return '0 0 100 100'; }
      let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
      ts.forEach((t) => {
        const hw = t.width / 2 + 40;
        const hh = t.height / 2 + 40;
        minX = Math.min(minX, t.x - hw); maxX = Math.max(maxX, t.x + hw);
        minY = Math.min(minY, t.y - hh); maxY = Math.max(maxY, t.y + hh + 30);
      });
      const pad = 40;
      return (minX - pad) + ' ' + (minY - pad) + ' ' + (maxX - minX + pad * 2) + ' ' + (maxY - minY + pad * 2);
    }
  },
  watch: {
    zones: {
      immediate: true,
      handler (z) { if (this.zoneId == null && z.length) { this.zoneId = z[0].id; } }
    }
  },
  mounted () {
    this.loadFloorPlan();
  },
  beforeDestroy () {
    if (this.noticeTimer) { clearTimeout(this.noticeTimer); }
  },
  methods: {
    async loadFloorPlan () {
      try {
        const fp = await this.pos._tableService.GetFloorPlan(this.pos.storeId);
        this.floorPlan = {
          zones: (fp && fp.zones) || [],
          tables: ((fp && fp.tables) || []).map(t => ({
            id: t.id,
            zoneId: t.zoneId,
            number: t.tableNumber,
            name: t.name,
            shape: SHAPE[t.shape] || 'square',
            x: t.posX,
            y: t.posY,
            width: t.width,
            height: t.height,
            rotation: t.rotation,
            seats: t.seats,
            isActive: t.isActive
          }))
        };
      } catch (e) {
        this.floorPlan = { zones: [], tables: [] };
      }
    },
    checkOf (t) {
      const bt = this.boardTables.find(x => x.tableId === t.id);
      return bt ? bt.openCheck : null;
    },
    reservationOf (t) {
      const bt = this.boardTables.find(x => x.tableId === t.id);
      return bt ? bt.nextReservation : null;
    },
    statusOf (t) {
      if (this.checkOf(t)) { return 'seated'; }
      if (this.reservationOf(t)) { return 'requested'; }
      return '';
    },
    // A check has food ready to run when the kitchen has bumped at least one line to Ready and it has
    // not yet been served. Everything served (or nothing ready) shows no alert.
    checkHasReady (oc) {
      return !!(oc && oc.lines && oc.lines.some(l => l.status === 'Ready'));
    },
    readyOf (t) {
      return this.checkHasReady(this.checkOf(t));
    },
    hhmm (val) {
      const d = new Date(val);
      return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    },
    parkedMeta (p) {
      const parts = [];
      if (p.created) { parts.push(this.hhmm(p.created)); }
      if (p.lineCount != null) { parts.push(this.$i('pos_parked_lines', { count: p.lineCount })); }
      return parts.join(' · ');
    },
    flash (msg) {
      this.notice = msg;
      if (this.noticeTimer) { clearTimeout(this.noticeTimer); }
      this.noticeTimer = setTimeout(() => { this.notice = ''; }, 3000);
    },
    async onTableClick (t) {
      const oc = this.checkOf(t);
      if (oc) {
        if (this.busy) { return; }
        this.busy = true;
        try {
          const check = await this.pos.checkSvc().GetCheck(oc.orderId);
          this.pos.setActiveCheck(check);
        } catch (e) {
          this.flash(this.pos.errMsg(e));
        } finally {
          this.busy = false;
        }
      } else if (this.reservationOf(t)) {
        // Reserved soon — confirm before seating a walk-in.
        this.reservationWarnFor = t;
      } else {
        this.openTable(t);
      }
    },
    // One tap opens the check with no guest count; couverts are set later from the check panel.
    async openTable (t) {
      if (this.busy) { return; }
      this.busy = true;
      try {
        const check = await this.pos.openCheck({ tableId: t.id, couverts: null, deliveryType: 'TableDelivery' });
        this.pos.setActiveCheck(check);
      } catch (e) {
        this.flash(this.pos.errMsg(e));
      } finally {
        this.busy = false;
      }
    },
    confirmOpenReserved () {
      const t = this.reservationWarnFor;
      this.reservationWarnFor = null;
      if (t) { this.openTable(t); }
    },
    async resumeParked (p) {
      if (this.busy) { return; }
      this.busy = true;
      try {
        const check = await this.pos.checkSvc().Resume(p.orderId, { tableId: p.tableId || null });
        this.pos.setActiveCheck(check);
      } catch (e) {
        this.flash(this.pos.errMsg(e));
      } finally {
        this.busy = false;
      }
    },
    async resumeOpenCheck (oc) {
      if (this.busy) { return; }
      this.busy = true;
      try {
        const check = await this.pos.checkSvc().GetCheck(oc.orderId);
        this.pos.setActiveCheck(check);
      } catch (e) {
        this.flash(this.pos.errMsg(e));
      } finally {
        this.busy = false;
      }
    }
  }
};
</script>

<style scoped>
.board { height: 100%; overflow-y: auto; padding: 20px 24px; background: #f8f9fa; }
.board__inner { max-width: 1000px; margin: 0 auto; }
.board__head { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; flex-wrap: wrap; }
.board__title { font-size: 1.6rem; font-weight: 700; color: var(--pos-ink, #292c34); margin: 0; }
.board__offline { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: #f59e0b; background: rgba(245, 158, 11, 0.12); padding: 3px 8px; border-radius: 6px; }
.board__zones { display: flex; gap: 6px; margin-left: auto; flex-wrap: wrap; }
.board__zone { border: 1px solid #e2e8f0; background: #fff; color: #475569; padding: 6px 14px; border-radius: 18px; font-weight: 600; font-size: 0.85rem; cursor: pointer; }
.board__zone.is-active { background: var(--pos-primary, #1bb776); border-color: var(--pos-primary, #1bb776); color: #fff; }

.board__canvas { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 10px; }
.board__svg { width: 100%; height: 52vh; display: block; }
.board__table { cursor: pointer; }
.board__amount { fill: #159f63; font-weight: 700; }
.board__res { fill: #b45309; font-weight: 700; }

/* "Mat klar" badge on a table whose kitchen work is done but not yet served. */
.board__ready { pointer-events: none; }
.board__ready-badge { fill: var(--pos-primary, #1bb776); stroke: #fff; stroke-width: 1.5; }
.board__ready-bell { fill: none; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.board__ready-pulse {
  fill: var(--pos-primary, #1bb776);
  opacity: 0.5;
  transform-box: fill-box;
  transform-origin: center;
  animation: board-ready-pulse 1.7s ease-out infinite;
}
@keyframes board-ready-pulse {
  0% { transform: scale(0.7); opacity: 0.5; }
  70% { transform: scale(1.7); opacity: 0; }
  100% { transform: scale(1.7); opacity: 0; }
}
.board__empty { text-align: center; color: #94a3b8; padding: 40px 0; }
.board__fallback { padding: 8px 0; }
.board__fallback-hint { text-align: center; color: #94a3b8; padding: 8px 0 20px; }
.board__link { color: var(--pos-primary-dark, #159f63); font-weight: 600; }

.board__legend { display: flex; gap: 18px; margin: 12px 0 20px; color: #64748b; font-size: 0.85rem; }
.board__dot { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 4px; vertical-align: middle; }
.board__dot--free { background: #fff; border: 1px solid #94a3b8; }
.board__dot--open { background: #dbeafe; border: 1px solid #3b82f6; }
.board__dot--res { background: #fef3c7; border: 1px solid #f59e0b; }
.board__dot--ready { background: var(--pos-primary, #1bb776); border: 1px solid var(--pos-primary-dark, #159f63); }

.board__section-title { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; margin: 0 0 10px; }
.board__parked-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
.board__parked-card { display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; border: 1px solid #e2e8f0; border-left: 4px solid #94a3b8; border-radius: 12px; background: #fff; cursor: pointer; text-align: left; }
.board__parked-card--open { border-left-color: #3b82f6; }
.board__parked-name { font-weight: 700; color: var(--pos-ink, #292c34); }
.board__parked-ready {
  align-self: flex-start;
  font-size: 0.66rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: #fff;
  background: var(--pos-primary, #1bb776);
  padding: 2px 7px;
  border-radius: 5px;
}
.board__parked-meta { font-size: 0.75rem; color: #64748b; }
.board__parked-amount { font-weight: 800; color: var(--pos-primary-dark, #159f63); }
.board__parked-resume { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: #64748b; }

.board__notice { position: fixed; top: 80px; left: 50%; transform: translateX(-50%); background: #ef4444; color: #fff; font-weight: 600; padding: 12px 22px; border-radius: 12px; z-index: 1200; }
.board-notice-enter-active, .board-notice-leave-active { transition: opacity 0.2s ease; }
.board-notice-enter, .board-notice-leave-to { opacity: 0; }

.board__modal { position: fixed; inset: 0; background: rgba(18, 20, 26, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1150; padding: 16px; }
.board__modal-panel { background: #fff; border-radius: 16px; padding: 24px; width: 100%; max-width: 380px; }
.board__modal-title { font-size: 1.2rem; font-weight: 700; color: var(--pos-ink, #292c34); margin: 0 0 8px; }
.board__modal-warn { color: #b45309; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 8px 12px; font-size: 0.9rem; margin: 0 0 14px; }
.board__modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px; }
.board__modal-cancel { border: 1px solid #cbd5e0; background: #fff; padding: 10px 18px; border-radius: 10px; font-weight: 600; cursor: pointer; color: var(--pos-ink, #292c34); }
.board__modal-open { border: none; background: var(--pos-primary, #1bb776); color: #fff; padding: 10px 20px; border-radius: 10px; font-weight: 700; cursor: pointer; }
.board__modal-open:disabled { background: #cbd5e0; cursor: not-allowed; }
</style>

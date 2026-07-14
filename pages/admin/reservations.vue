<template>
  <AdminPage @login-success="handleLoginSuccess">
    <div class="reservations-page">
      <div class="page-header">
        <h1>{{ $i('res_page_title') }}</h1>
        <p class="page-description">
          {{ $i('res_page_description') }}
        </p>
      </div>

      <div class="tabs">
        <button :class="{ active: tab === 'timeline' }" @click="tab = 'timeline'">
          {{ $i('res_tab_timeline') }}
        </button>
        <button :class="{ active: tab === 'floor' }" @click="tab = 'floor'">
          {{ $i('res_tab_floor') }}
        </button>
        <button :class="{ active: tab === 'list' }" @click="tab = 'list'">
          {{ $i('res_tab_list') }}
        </button>
        <button :class="{ active: tab === 'settings' }" @click="tab = 'settings'">
          {{ $i('res_tab_settings') }}
        </button>
      </div>

      <template v-if="tab !== 'settings'">
        <div v-if="!flatTables.length" class="empty-state">
          <h3>{{ $i('res_empty_title') }}</h3>
          <p>{{ $i('res_empty_desc') }}</p>
          <NuxtLink class="btn-primary" to="/admin/tables">
            {{ $i('res_empty_open_plan') }}
          </NuxtLink>
        </div>

        <template v-else>
          <div class="toolbar">
            <div class="toolbar-date">
              <button class="tool" :title="$i('res_prev_day')" @click="shiftDate(-1)">
                ‹
              </button>
              <input v-model="dateKey" type="date" class="date-input">
              <button class="tool" :title="$i('res_next_day')" @click="shiftDate(1)">
                ›
              </button>
              <button class="tool today" :disabled="isToday" @click="goToday">
                {{ $i('res_today') }}
              </button>
            </div>
            <div class="toolbar-summary">
              {{ daySummary }}
            </div>
            <div class="toolbar-actions">
              <template v-if="tab === 'timeline'">
                <button class="tool" :title="$i('res_zoom_out')" @click="zoom(-30)">
                  −
                </button>
                <button class="tool" :title="$i('res_zoom_in')" @click="zoom(30)">
                  +
                </button>
              </template>
              <button class="btn-outline" @click="openWalkIn">
                {{ $i('res_walkin') }}
              </button>
              <button class="btn-primary" @click="openCreate()">
                + {{ $i('res_modal_new') }}
              </button>
            </div>
          </div>

          <ReservationTimeline
            v-if="tab === 'timeline'"
            :key="dateKey"
            :zone-groups="zoneGroups"
            :reservations="timelineReservations"
            :range-start="range.start"
            :range-end="range.end"
            :px-per-hour="pxPerHour"
            :now-min="isToday ? nowMin : null"
            :check-conflict="conflictForDay"
            @block-click="openEdit"
            @block-move="moveReservation"
            @block-resize="resizeReservation"
            @cell-click="openCreateAt"
            @conflict="showToast($i('res_toast_conflict'), 'error')"
          />

          <ReservationFloorView
            v-if="tab === 'floor'"
            :key="dateKey + '-floor'"
            :zone-groups="zoneGroups"
            :reservations="timelineReservations"
            :range-start="range.start"
            :range-end="range.end"
            :now-min="isToday ? nowMin : null"
            @table-click="onFloorTableClick"
            @edit-floorplan="$router.push('/admin/tables')"
          />

          <ReservationList
            v-if="tab === 'list'"
            :reservations="listReservations"
            :tables="flatTables"
            :selected-date-key="dateKey"
            @select="openEdit"
            @status-change="setStatus"
            @search="onListSearch"
          />
        </template>
      </template>

      <ReservationSettingsPanel v-if="tab === 'settings'" :store-id="storeId" @saved="onSettingsSaved" />

      <ReservationModal
        v-if="modal.show"
        :reservation="modal.draft"
        :is-new="modal.isNew"
        :zone-groups="zoneGroups"
        :tables="flatTables"
        :check-conflict="checkConflict"
        @save="saveReservation"
        @status-change="setStatus"
        @close="modal.show = false"
      />

      <transition name="toast">
        <div v-if="toast.show" class="toast" :class="'toast--' + toast.type">
          {{ toast.message }}
        </div>
      </transition>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import ReservationTimeline from '~/components/admin/reservations/ReservationTimeline.vue';
import ReservationList from '~/components/admin/reservations/ReservationList.vue';
import ReservationFloorView from '~/components/admin/reservations/ReservationFloorView.vue';
import ReservationModal from '~/components/admin/reservations/ReservationModal.vue';
import ReservationSettingsPanel from '~/components/admin/reservations/ReservationSettingsPanel.vue';

const ACTIVE_STATUSES = ['requested', 'confirmed', 'seated'];
const DAY_LABELS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
// Status casing bridge: the API is PascalCase, the block/UI form is lower-case.
const STATUS_API_TO_BLOCK = { Requested: 'requested', Confirmed: 'confirmed', Seated: 'seated', Completed: 'completed', NoShow: 'noshow', Cancelled: 'cancelled' };
const STATUS_BLOCK_TO_API = { requested: 'Requested', confirmed: 'Confirmed', seated: 'Seated', completed: 'Completed', noshow: 'NoShow', cancelled: 'Cancelled' };
const SHAPE_API_TO_LOCAL = { Round: 'round', Square: 'square', Rectangle: 'rect' };

let uidCounter = 0;
function uid () {
  uidCounter += 1;
  return `r${Date.now().toString(36)}-${uidCounter}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function dateKeyOf (date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Parses the API's local "yyyy-MM-ddTHH:mm:ss" into a local Date plus its hour/minute.
function parseLocalDateTime (iso) {
  const [datePart, timePart = '00:00'] = (iso || '').split('T');
  const [y, mo, d] = datePart.split('-').map(Number);
  const [h, mi] = timePart.split(':').map(Number);
  return { date: new Date(y, (mo || 1) - 1, d || 1, h || 0, mi || 0), h: h || 0, m: mi || 0 };
}

export default {
  name: 'AdminReservations',
  components: { AdminPage, ReservationTimeline, ReservationList, ReservationFloorView, ReservationModal, ReservationSettingsPanel },
  data () {
    return {
      tab: 'timeline',
      dateKey: dateKeyOf(new Date()),
      zones: [],
      tables: [],
      reservations: [],
      settings: null,
      pxPerHour: 140,
      nowMin: 0,
      nowTimer: null,
      pollTimer: null,
      lastInteraction: 0,
      saving: false,
      overrideCapacityNext: false,
      listQuery: '',
      searchResults: [],
      searchTimer: null,
      modal: { show: false, isNew: false, draft: null },
      toast: { show: false, message: '', type: 'success' }
    };
  },
  computed: {
    storeId () {
      const selected = this.$store.state.selectedAdminStore;
      if (selected) { return selected; }
      const stores = this.$store.state.currentUser?.adminIn || [];
      return stores.length ? stores[0].id : '';
    },
    listReservations () {
      return this.listQuery.trim() ? this.searchResults : this.reservations;
    },
    zoneGroups () {
      return this.zones
        .filter(z => z.isActive)
        .slice()
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map(zone => ({
          zone,
          tables: this.tables
            .filter(t => t.zoneId === zone.id && t.isActive)
            .slice()
            .sort((a, b) => (a.number || 0) - (b.number || 0))
        }))
        .filter(g => g.tables.length);
    },
    flatTables () {
      return this.zoneGroups.reduce((acc, g) => acc.concat(g.tables), []);
    },
    isToday () {
      return this.dateKey === dateKeyOf(new Date());
    },
    timelineReservations () {
      return this.reservations.filter(
        r => r.dateKey === this.dateKey && ACTIVE_STATUSES.includes(r.status)
      );
    },
    range () {
      let from = 11 * 60;
      let to = 23 * 60;
      const s = this.settings;
      if (s && !s.useStoreHours && Array.isArray(s.days)) {
        const [y, m, d] = this.dateKey.split('-').map(Number);
        const jsDay = new Date(y, m - 1, d).getDay();
        const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1;
        const day = s.days.find(x => x.key === dayOfWeek);
        if (day && day.open && day.from && day.to) {
          from = this.toMinutes(day.from);
          to = this.toMinutes(day.to);
          if (to <= from) { to = 24 * 60; }
        }
      }
      // Never let reservations exist outside the visible window: widen the
      // range to cover everything booked on the selected day.
      this.timelineReservations.forEach((r) => {
        from = Math.min(from, r.startMin);
        to = Math.max(to, r.startMin + r.durationMin);
      });
      const start = Math.max(0, Math.floor(from / 60) * 60 - 60);
      const end = Math.min(24 * 60, Math.ceil(to / 60) * 60 + 60);
      return { start, end };
    },
    daySummary () {
      const active = this.timelineReservations;
      const covers = active.reduce((sum, r) => sum + (r.partySize || 0), 0);
      const noshows = this.reservations.filter(
        r => r.dateKey === this.dateKey && r.status === 'noshow'
      ).length;
      let text = this.$i('res_summary', { res: active.length, covers });
      if (noshows) { text += this.$i('res_summary_noshow', { count: noshows }); }
      return text;
    }
  },
  watch: {
    storeId () {
      this.loadAll();
    },
    dateKey () {
      this.fetchDay();
    },
    tab (value) {
      // Leaving the list clears any active search so the timeline shows the day again.
      if (value !== 'list' && this.listQuery) {
        this.listQuery = '';
        this.searchResults = [];
      }
    }
  },
  mounted () {
    if (!this.$store.getters.userIsLoggedIn) { return; }
    if (!this.$store.state.currentUser?.isPowerUser) {
      this.$router.push('/admin');
      return;
    }
    this.loadAll();
    this.tickNow();
    this.nowTimer = setInterval(this.tickNow, 60000);
    this.pollTimer = setInterval(this.pollTick, 7000);
  },
  beforeDestroy () {
    if (this.nowTimer) { clearInterval(this.nowTimer); }
    if (this.pollTimer) { clearInterval(this.pollTimer); }
    if (this.searchTimer) { clearTimeout(this.searchTimer); }
  },
  methods: {
    handleLoginSuccess () {
      if (!this.$store.state.currentUser?.isPowerUser) {
        this.$router.push('/admin');
      } else {
        this.loadAll();
      }
    },
    tickNow () {
      const now = new Date();
      this.nowMin = now.getHours() * 60 + now.getMinutes();
    },
    toMinutes (hhmm) {
      const parts = (hhmm || '').split(':');
      return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
    },
    async loadAll () {
      const storeId = this.storeId;
      if (!storeId) { return; }
      try {
        const [floorPlan, settings, dayReservations] = await Promise.all([
          this._tableService.GetFloorPlan(storeId),
          this._tableService.GetReservationSettings(storeId),
          this._reservationService.GetForDay(storeId, this.dateKey)
        ]);
        this.zones = (floorPlan && floorPlan.zones) || [];
        this.tables = ((floorPlan && floorPlan.tables) || []).map(this.mapTable);
        this.settings = this.mapSettings(settings);
        this.reservations = (dayReservations || []).map(this.fromApi);
      } catch (e) {
        this.showToast(this.$i('res_toast_load_error'), 'error');
      }
    },
    async fetchDay () {
      const storeId = this.storeId;
      if (!storeId) { return; }
      try {
        const day = await this._reservationService.GetForDay(storeId, this.dateKey);
        this.reservations = (day || []).map(this.fromApi);
      } catch (e) {
        // Keep the current view; a transient failure should not wipe the timeline.
      }
    },
    pollTick () {
      // Live refresh, but never while the operator is mid-interaction.
      if (this.tab === 'settings') { return; }
      if (this.modal.show || this.saving) { return; }
      if (Date.now() - this.lastInteraction < 3000) { return; }
      this.fetchDay();
    },
    mapTable (t) {
      return {
        id: t.id,
        zoneId: t.zoneId,
        number: t.tableNumber,
        name: t.name,
        shape: SHAPE_API_TO_LOCAL[t.shape] || 'square',
        // FloorPlanTable/ReservationFloorView render from x/y (cm, center point), so the API's
        // posX/posY must be renamed here — same mapping as FloorPlanEditor and BoardView.
        x: t.posX,
        y: t.posY,
        width: t.width,
        height: t.height,
        rotation: t.rotation,
        seats: t.seats,
        seatsAuto: t.seatsAuto,
        minCapacity: t.minCapacity,
        maxCapacity: t.maxCapacity,
        isActive: t.isActive
      };
    },
    mapSettings (s) {
      if (!s) { return null; }
      return {
        enabled: s.enabled,
        allowGuestCancellation: s.allowGuestCancellation,
        useStoreHours: s.useStoreHours,
        slotMinutes: s.slotMinutes,
        seatingMinutes: s.seatingMinutes,
        bufferMinutes: s.bufferMinutes,
        leadMinutes: s.leadMinutes,
        maxDaysAhead: s.maxDaysAhead,
        maxGuests: s.maxGuests,
        days: (s.days || []).map(d => ({ key: d.dayOfWeek, label: DAY_LABELS[d.dayOfWeek] || '', open: d.open, from: d.from, to: d.to }))
      };
    },
    fromApi (r) {
      const start = parseLocalDateTime(r.startTime);
      const end = parseLocalDateTime(r.endTime);
      // L3c table combinations: a reservation may span several tables (r.tables). The primary is
      // r.tableId; the extras drive the multi-table booking form and the timeline/floor rendering.
      const allTableIds = (r.tables && r.tables.length)
        ? r.tables.map(x => x.tableId).filter(Boolean)
        : (r.tableId ? [r.tableId] : []);
      const primary = r.tableId || allTableIds[0] || null;
      return {
        id: r.reservationId,
        tableId: primary,
        tableIds: allTableIds.length ? allTableIds : (primary ? [primary] : []),
        extraTableIds: allTableIds.filter(id => id !== primary),
        dateKey: (r.startTime || '').slice(0, 10),
        startMin: start.h * 60 + start.m,
        durationMin: Math.max(15, Math.round((end.date - start.date) / 60000)),
        partySize: r.partySize,
        name: r.customerName || '',
        phone: r.customerPhone || '',
        comment: r.comment || '',
        status: STATUS_API_TO_BLOCK[r.status] || 'confirmed',
        isWalkIn: !!r.isWalkIn,
        createdByAdmin: !!r.createdByAdmin,
        createdAt: r.createdAt ? new Date(r.createdAt).getTime() : Date.now()
      };
    },
    toApi (b, overrideCapacity = false) {
      const hh = String(Math.floor(b.startMin / 60) % 24).padStart(2, '0');
      const mm = String(b.startMin % 60).padStart(2, '0');
      const primary = b.tableId || null;
      const tableIds = [primary, ...(b.extraTableIds || [])].filter((v, i, a) => v && a.indexOf(v) === i);
      return {
        tableId: primary,
        tableIds,
        startTime: `${b.dateKey}T${hh}:${mm}:00`,
        durationMinutes: b.durationMin,
        partySize: b.partySize,
        customerName: b.name || '',
        customerPhone: b.phone || '',
        comment: b.comment || '',
        status: STATUS_BLOCK_TO_API[b.status] || 'Confirmed',
        isWalkIn: !!b.isWalkIn,
        overrideCapacity: !!overrideCapacity
      };
    },
    replaceBlock (block) {
      const index = this.reservations.findIndex(r => r.id === block.id);
      if (index >= 0) { this.reservations.splice(index, 1, block); }
    },
    onListSearch (query) {
      this.listQuery = query || '';
      if (this.searchTimer) { clearTimeout(this.searchTimer); }
      const term = (query || '').trim();
      if (!term) { this.searchResults = []; return; }
      this.searchTimer = setTimeout(async () => {
        try {
          const hits = await this._reservationService.Search(this.storeId, term);
          this.searchResults = (hits || []).map(this.fromApi);
        } catch (e) {
          this.searchResults = [];
        }
      }, 250);
    },

    // --- date & zoom ------------------------------------------------------
    shiftDate (days) {
      const [y, m, d] = this.dateKey.split('-').map(Number);
      this.dateKey = dateKeyOf(new Date(y, m - 1, d + days));
    },
    goToday () {
      this.dateKey = dateKeyOf(new Date());
    },
    zoom (delta) {
      this.pxPerHour = Math.min(300, Math.max(60, this.pxPerHour + delta));
    },

    // --- conflicts ----------------------------------------------------------
    checkConflict (excludeId, tableId, startMin, durationMin, dateKey) {
      const end = startMin + durationMin;
      return this.reservations.some((r) => {
        if (r.id === excludeId) { return false; }
        if (r.tableId !== tableId || r.dateKey !== dateKey) { return false; }
        if (!ACTIVE_STATUSES.includes(r.status)) { return false; }
        return r.startMin < end && startMin < r.startMin + r.durationMin;
      });
    },
    conflictForDay (excludeId, tableId, startMin, durationMin) {
      return this.checkConflict(excludeId, tableId, startMin, durationMin, this.dateKey);
    },

    // --- CRUD -----------------------------------------------------------------
    // Server-side suggestion (same engine the guest flow uses). Returns a table id or null.
    async suggestTable (partySize, startMin, durationMin, dateKey) {
      const storeId = this.storeId;
      if (!storeId) { return null; }
      const hh = String(Math.floor(startMin / 60) % 24).padStart(2, '0');
      const mm = String(startMin % 60).padStart(2, '0');
      try {
        const res = await this._reservationService.Suggest(storeId, {
          startTime: `${dateKey}T${hh}:${mm}:00`,
          durationMinutes: durationMin,
          partySize
        });
        return res && res.tableId ? res.tableId : null;
      } catch (e) {
        return null;
      }
    },
    baseDraft () {
      const seatingMinutes = (this.settings && this.settings.seatingMinutes) || 90;
      let startMin = 18 * 60;
      if (this.isToday) {
        startMin = Math.min(this.range.end - seatingMinutes, Math.ceil((this.nowMin + 30) / 15) * 15);
      }
      startMin = Math.max(this.range.start, startMin);
      return {
        id: uid(),
        tableId: null,
        tableIds: [],
        extraTableIds: [],
        dateKey: this.dateKey,
        startMin,
        durationMin: seatingMinutes,
        partySize: 2,
        name: '',
        phone: '',
        comment: '',
        status: 'confirmed',
        isWalkIn: false,
        createdAt: Date.now()
      };
    },
    async openCreate () {
      const draft = this.baseDraft();
      this.overrideCapacityNext = false;
      this.modal = { show: true, isNew: true, draft };
      const tableId = await this.suggestTable(draft.partySize, draft.startMin, draft.durationMin, draft.dateKey);
      if (this.modal.show && this.modal.draft === draft) { draft.tableId = tableId; }
    },
    openCreateAt ({ tableId, startMin }) {
      const draft = this.baseDraft();
      draft.startMin = Math.max(this.range.start, Math.min(startMin, this.range.end - draft.durationMin));
      draft.tableId = tableId;
      this.overrideCapacityNext = false;
      this.modal = { show: true, isNew: true, draft };
    },
    onFloorTableClick ({ table, timeMin, reservation }) {
      if (reservation) {
        this.openEdit(reservation);
      } else {
        this.openCreateAt({ tableId: table.id, startMin: Math.floor(timeMin / 15) * 15 });
      }
    },
    async openWalkIn () {
      const draft = this.baseDraft();
      draft.isWalkIn = true;
      draft.status = 'seated';
      draft.dateKey = dateKeyOf(new Date());
      draft.startMin = Math.max(this.range.start, Math.floor(this.nowMin / 15) * 15);
      this.overrideCapacityNext = false;
      this.modal = { show: true, isNew: true, draft };
      const tableId = await this.suggestTable(draft.partySize, draft.startMin, draft.durationMin, draft.dateKey);
      if (this.modal.show && this.modal.draft === draft) { draft.tableId = tableId; }
    },
    openEdit (reservation) {
      this.overrideCapacityNext = false;
      this.modal = { show: true, isNew: false, draft: { ...reservation } };
    },
    async saveReservation (draft) {
      const storeId = this.storeId;
      if (!storeId || this.saving) { return; }
      const isNew = this.modal.isNew;
      this.saving = true;
      try {
        const payload = this.toApi(draft, this.overrideCapacityNext);
        const saved = isNew
          ? await this._reservationService.CreateAdmin(storeId, payload)
          : await this._reservationService.UpdateAdmin(storeId, draft.id, payload);
        const block = this.fromApi(saved);
        this.overrideCapacityNext = false;
        this.modal.show = false;
        if (block.dateKey !== this.dateKey) {
          this.dateKey = block.dateKey; // watch → fetchDay loads the target day
        } else {
          const index = this.reservations.findIndex(r => r.id === block.id);
          if (index >= 0) { this.reservations.splice(index, 1, block); } else { this.reservations.push(block); }
        }
        this.showToast(isNew ? this.$i('res_toast_created') : this.$i('res_toast_updated'));
      } catch (e) {
        const message = (e && e.message ? e.message : '').toLowerCase();
        if (message.includes('does not fit')) {
          // Capacity mismatch: keep the modal open; the next save overrides the capacity.
          this.overrideCapacityNext = true;
          this.showToast(this.$i('res_toast_capacity'), 'error');
        } else if (message.includes('no longer available') || message.includes('no free table')) {
          this.modal.show = false;
          this.showToast(this.$i('res_toast_not_available'), 'error');
          this.fetchDay();
        } else {
          this.showToast(e && e.message ? e.message : this.$i('res_toast_save_error'), 'error');
        }
      } finally {
        this.saving = false;
      }
    },
    async moveReservation ({ id, tableId, startMin }) {
      const r = this.reservations.find(x => x.id === id);
      if (!r) { return; }
      r.tableId = tableId;
      r.startMin = startMin;
      this.lastInteraction = Date.now();
      await this.persistUpdate(r, this.$i('res_toast_move_error'));
    },
    async resizeReservation ({ id, startMin, durationMin }) {
      const r = this.reservations.find(x => x.id === id);
      if (!r) { return; }
      r.startMin = startMin;
      r.durationMin = durationMin;
      this.lastInteraction = Date.now();
      await this.persistUpdate(r, this.$i('res_toast_resize_error'));
    },
    // Persists an optimistic block edit; on rejection reload the day (the server is authoritative).
    async persistUpdate (block, failMessage) {
      try {
        const saved = await this._reservationService.UpdateAdmin(this.storeId, block.id, this.toApi(block, true));
        this.replaceBlock(this.fromApi(saved));
      } catch (e) {
        this.showToast(e && e.message ? e.message : failMessage, 'error');
        this.fetchDay();
      }
    },
    async setStatus ({ id, status }) {
      const r = this.reservations.find(x => x.id === id);
      if (!r) { return; }
      const previous = r.status;
      r.status = status;
      try {
        const saved = await this._reservationService.UpdateAdmin(this.storeId, id, this.toApi(r, true));
        this.replaceBlock(this.fromApi(saved));
        this.showToast(this.$i('res_toast_status_updated'));
      } catch (e) {
        r.status = previous;
        this.showToast(e && e.message ? e.message : this.$i('res_toast_status_error'), 'error');
        this.fetchDay();
      }
    },
    onSettingsSaved (settings) {
      this.settings = settings;
    },
    showToast (message, type = 'success') {
      this.toast = { show: true, message, type };
      setTimeout(() => {
        this.toast.show = false;
      }, 3000);
    }
  }
};
</script>

<style lang="scss" scoped>
.reservations-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }
}

.page-header {
  margin-bottom: 20px;

  h1 {
    font-size: 2em;
    font-weight: 600;
    color: #292c34;
    margin: 0 0 8px;

    @media (max-width: 768px) {
      font-size: 1.5em;
    }
  }

  .page-description {
    color: #64748b;
    margin: 0;
    font-size: 0.95em;
  }
}

.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 18px;

  button {
    padding: 9px 20px;
    border: 2px solid #e2e8f0;
    border-radius: 999px;
    background: #fff;
    color: #64748b;
    font-weight: 600;
    font-size: 0.88em;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: #cbd5e0;
    }

    &.active {
      border-color: #1bb776;
      background: #f0fdf7;
      color: #159f63;
    }
  }
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.toolbar-date {
  display: flex;
  align-items: center;
  gap: 6px;
}

.date-input {
  padding: 8px 10px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9em;
  color: #292c34;

  &:focus {
    outline: none;
    border-color: #1bb776;
  }
}

.tool {
  min-width: 34px;
  height: 36px;
  padding: 0 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  color: #292c34;
  font-size: 1em;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #f8f9fa;
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }

  &.today {
    font-size: 0.82em;
    font-weight: 600;
  }
}

.toolbar-summary {
  font-size: 0.85em;
  color: #64748b;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  color: #fff;
  border: none;
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.88em;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;

  &:hover {
    box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);
  }
}

.btn-outline {
  background: #fff;
  color: #292c34;
  border: 2px solid #e2e8f0;
  padding: 9px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.88em;
  cursor: pointer;

  &:hover {
    border-color: #1bb776;
    color: #159f63;
  }
}

.empty-state {
  text-align: center;
  padding: 64px 24px;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);

  h3 {
    font-size: 1.4em;
    color: #292c34;
    margin: 0 0 8px;
  }

  p {
    color: #64748b;
    margin: 0 0 20px;
  }
}

.toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  z-index: 1200;

  &--success {
    background: #10b981;
  }

  &--error {
    background: #ef4444;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.3s ease;
}

.toast-enter,
.toast-leave-to {
  opacity: 0;
}
</style>

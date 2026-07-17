<template>
  <div class="fp-editor">
    <div class="fp-toolbar">
      <div class="fp-zones">
        <button
          v-for="z in zones"
          :key="z.id"
          class="fp-zone-tab"
          :class="{ active: z.id === activeZoneId, off: !z.isActive }"
          @click="selectZone(z.id)"
        >
          {{ z.name }}<span v-if="!z.isActive" class="fp-zone-off">av</span>
        </button>
        <button class="fp-zone-add" title="Ny sone" @click="addZone">
          + Legg til sone
        </button>
      </div>
      <div class="fp-tools">
        <button class="fp-tool" :disabled="!canUndo" title="Angre (Ctrl+Z)" @click="undo">
          ↶
        </button>
        <button class="fp-tool" :disabled="!canRedo" title="Gjør om (Ctrl+Y)" @click="redo">
          ↷
        </button>
        <span class="fp-sep" />
        <button class="fp-tool" title="Zoom ut" @click="zoomBy(1.25)">
          −
        </button>
        <span class="fp-zoom">{{ zoomPct }}%</span>
        <button class="fp-tool" title="Zoom inn" @click="zoomBy(0.8)">
          +
        </button>
        <button class="fp-tool" title="Tilpass visning" @click="fitView">
          ⛶
        </button>
        <span v-if="lastSavedAt" class="fp-saved">Lagret {{ lastSavedAt }}</span>
      </div>
    </div>

    <div class="fp-body">
      <div ref="wrap" class="fp-canvas-wrap">
        <svg
          ref="svg"
          class="fp-svg"
          :viewBox="viewBoxStr"
          preserveAspectRatio="xMidYMid slice"
          @pointerdown.capture="trackPointerDown"
          @pointerdown="onCanvasPointerDown"
          @wheel.prevent="onWheel"
        >
          <defs>
            <pattern id="fpGrid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path
                d="M 25 0 V 100 M 50 0 V 100 M 75 0 V 100 M 0 25 H 100 M 0 50 H 100 M 0 75 H 100"
                fill="none"
                stroke="#f1f5f9"
                :stroke-width="1 / pxScale"
              />
              <path d="M 100 0 H 0 V 100" fill="none" stroke="#e4e9f0" :stroke-width="1 / pxScale" />
            </pattern>
          </defs>
          <rect
            class="fp-grid"
            :x="vb.x"
            :y="vb.y"
            :width="vb.w"
            :height="vbH"
            fill="url(#fpGrid)"
          />

          <FloorPlanTable
            v-for="t in activeTables"
            :key="t.id"
            :table="t"
            :selected="t.id === selectedId"
            :px-scale="pxScale"
            @table-pointerdown="startMove(t, $event)"
            @resize-pointerdown="startResize(t, $event)"
            @rotate-pointerdown="startRotate(t, $event)"
          />

          <line
            v-if="guides.v"
            class="fp-guide"
            :x1="guides.v.pos"
            :x2="guides.v.pos"
            :y1="guides.v.from"
            :y2="guides.v.to"
            :stroke-width="1 / pxScale"
          />
          <line
            v-if="guides.h"
            class="fp-guide"
            :y1="guides.h.pos"
            :y2="guides.h.pos"
            :x1="guides.h.from"
            :x2="guides.h.to"
            :stroke-width="1 / pxScale"
          />

          <g v-if="ghost && ghost.visible" class="fp-ghost" :transform="`translate(${ghost.x} ${ghost.y})`">
            <circle v-if="ghost.shape === 'round'" :r="ghost.w / 2" />
            <rect
              v-else
              :x="-ghost.w / 2"
              :y="-ghost.h / 2"
              :width="ghost.w"
              :height="ghost.h"
              rx="8"
            />
          </g>
        </svg>

        <div class="fp-palette">
          <button class="fp-add-table" title="Legg til bord — klikk, eller dra det dit du vil ha det" @pointerdown.prevent="startPalette('rect', $event)">
            <span class="fp-add-plus">+</span>
            <span>Legg til bord</span>
          </button>
        </div>

        <div class="fp-statusbar">
          {{ activeTables.length }} bord · {{ totalSeats }} plasser
        </div>

        <div v-if="!activeTables.length && !ghost" class="fp-empty">
          <div class="fp-empty-card">
            <h3>Tegn opp {{ activeZone ? activeZone.name.toLowerCase() : "lokalet" }}</h3>
            <p>Trykk «+ Legg til bord» oppe til venstre — eller kom raskt i gang:</p>
            <div class="fp-empty-quick">
              <input v-model.number="quickCount" type="number" min="1" max="60">
              <button class="btn-primary" @click="quickGenerate">
                Generer {{ quickCount }} bord
              </button>
            </div>
          </div>
        </div>
      </div>

      <aside class="fp-panel">
        <template v-if="selectedTable">
          <h3>Bord {{ selectedTable.number }}</h3>

          <label class="fp-field">
            <span>Navn (valgfritt)</span>
            <input v-model="selectedTable.name" type="text" :placeholder="`Bord ${selectedTable.number}`" @change="commitDebounced">
          </label>

          <label class="fp-field">
            <span>Bordnummer</span>
            <input v-model.number="selectedTable.number" type="number" min="1" @change="normalizeSelected">
          </label>

          <div class="fp-field">
            <span>Plasser (stoler)</span>
            <div class="fp-stepper">
              <button @click="setSeats(-1)">
                −
              </button>
              <b>{{ selectedTable.seats }}</b>
              <button @click="setSeats(1)">
                +
              </button>
              <button
                class="fp-auto"
                :class="{ active: selectedTable.seatsAuto }"
                title="Antall stoler følger bordets størrelse"
                @click="toggleSeatsAuto"
              >
                Auto
              </button>
            </div>
            <p v-if="selectedTable.seatsAuto" class="fp-field-note">
              Følger bordets størrelse
            </p>
          </div>

          <div class="fp-field fp-field-split">
            <label>
              <span>Min. gjester</span>
              <input v-model.number="selectedTable.minCapacity" type="number" min="1" @change="normalizeSelected">
            </label>
            <label>
              <span>Maks gjester</span>
              <input v-model.number="selectedTable.maxCapacity" type="number" min="1" @change="normalizeSelected">
            </label>
          </div>

          <div v-if="selectedTable.shape === 'rect'" class="fp-field fp-field-split">
            <label>
              <span>Bredde (cm)</span>
              <input v-model.number="selectedTable.width" type="number" step="5" min="40" @change="normalizeSelected">
            </label>
            <label>
              <span>Dybde (cm)</span>
              <input v-model.number="selectedTable.height" type="number" step="5" min="40" @change="normalizeSelected">
            </label>
          </div>
          <label v-else class="fp-field">
            <span>{{ selectedTable.shape === "round" ? "Diameter (cm)" : "Størrelse (cm)" }}</span>
            <input v-model.number="selectedTable.width" type="number" step="5" min="40" @change="normalizeSelected">
          </label>

          <div class="fp-field">
            <span>Rotasjon</span>
            <div class="fp-rotate-row">
              <b>{{ selectedTable.rotation }}°</b>
              <button @click="rotate45">
                Roter 45°
              </button>
            </div>
          </div>

          <label class="fp-check">
            <input v-model="selectedTable.isActive" type="checkbox" @change="commit">
            <span>Aktivt bord</span>
          </label>

          <div class="fp-panel-actions">
            <button class="btn-secondary" @click="duplicateTable(selectedTable)">
              Dupliser
            </button>
            <button class="btn-destructive" @click="removeSelected">
              Slett
            </button>
          </div>
          <p v-if="deleteWarning" class="fp-warning">
            {{ deleteWarning }}
          </p>
          <p class="fp-hint">
            Tips: alt + dra for å duplisere, piltaster for å dytte, Delete for å slette.
          </p>
        </template>

        <template v-else-if="activeZone">
          <h3>Sone</h3>
          <label class="fp-field">
            <span>Navn</span>
            <input v-model="activeZone.name" type="text" @change="commitDebounced">
          </label>
          <label class="fp-check">
            <input v-model="activeZone.isActive" type="checkbox" @change="commit">
            <span>Aktiv sone</span>
          </label>
          <p class="fp-zone-stats">
            {{ activeTables.length }} bord · {{ totalSeats }} plasser
          </p>
          <div class="fp-panel-actions">
            <button
              class="btn-destructive"
              :disabled="zones.length <= 1 || activeTables.length > 0"
              :title="activeTables.length ? 'Flytt eller slett bordene først' : ''"
              @click="removeZone"
            >
              Slett sone
            </button>
          </div>
          <p class="fp-hint">
            Klikk på et bord for å redigere det. Deaktiver sonen (f.eks. terrassen om vinteren) i stedet for å slette den.
          </p>
        </template>
      </aside>
    </div>
  </div>
</template>

<script>
import FloorPlanTable from './FloorPlanTable.vue';

const GRID_SNAP = 5; // cm
const MIN_SIZE = 40;
const MAX_SIZE = 600;
const MIN_VIEW = 200;
const MAX_VIEW = 24000;
const HISTORY_LIMIT = 50;

const TABLE_DEFAULTS = {
  round: { width: 90, height: 90 },
  square: { width: 80, height: 80 },
  rect: { width: 140, height: 80 }
};

// How many chairs fit around a table of the given size (space per chair
// along the edge: ~55-60 cm). Drives seat defaults that follow resizing.
function autoSeatsFor (shape, width, height) {
  if (shape === 'round') {
    return clampSeats(Math.floor((Math.PI * width) / 60));
  }
  return clampSeats(2 * Math.floor(width / 55) + 2 * Math.floor(height / 55));
}

function clampSeats (n) {
  return Math.min(30, Math.max(1, n));
}

let uidCounter = 0;
function uid (prefix) {
  uidCounter += 1;
  return `${prefix}${Date.now().toString(36)}-${uidCounter}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function snapTo (value, step) {
  return Math.round(value / step) * step;
}

function clamp (value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// The editor works in its own lower-case shapes; the API persists PascalCase strings.
const SHAPE_API_TO_LOCAL = { Round: 'round', Square: 'square', Rectangle: 'rect' };
const SHAPE_LOCAL_TO_API = { round: 'Round', square: 'Square', rect: 'Rectangle' };

export default {
  name: 'FloorPlanEditor',
  components: { FloorPlanTable },
  props: {
    storeId: { type: [String, Number], default: '' }
  },
  data () {
    return {
      zones: [],
      tables: [],
      activeZoneId: null,
      selectedId: null,
      vb: { x: -850, y: -500, w: 1700 },
      containerW: 1,
      containerH: 1,
      interaction: null,
      guides: { v: null, h: null },
      ghost: null,
      pointers: {},
      undoStack: [],
      redoStack: [],
      lastSavedAt: null,
      quickCount: 8,
      commitTimer: null,
      saveTimer: null,
      // Maps the editor's stable local ids ('z..'/'t..') to server ids, filled from the
      // clientId the API echoes back on save. Local ids never change, so undo/redo snapshots
      // stay valid; only this map is updated on a save response.
      idMap: {},
      deleteWarning: '',
      deleteWarningTimer: null
    };
  },
  computed: {
    vbH () {
      return this.containerW > 0 ? (this.vb.w * this.containerH) / this.containerW : this.vb.w;
    },
    viewBoxStr () {
      return `${this.vb.x} ${this.vb.y} ${this.vb.w} ${this.vbH}`;
    },
    pxScale () {
      return this.containerW > 0 ? this.containerW / this.vb.w : 1;
    },
    zoomPct () {
      return Math.round(this.pxScale * 100);
    },
    activeZone () {
      return this.zones.find(z => z.id === this.activeZoneId) || null;
    },
    activeTables () {
      return this.tables.filter(t => t.zoneId === this.activeZoneId);
    },
    selectedTable () {
      return this.tables.find(t => t.id === this.selectedId) || null;
    },
    totalSeats () {
      return this.activeTables.reduce((sum, t) => sum + (t.seats || 0), 0);
    },
    canUndo () {
      return this.undoStack.length > 1;
    },
    canRedo () {
      return this.redoStack.length > 0;
    }
  },
  watch: {
    storeId () {
      this.loadState();
      this.$nextTick(this.fitView);
    }
  },
  mounted () {
    this.measure();
    window.addEventListener('resize', this.measure);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
    this.loadState();
    this.$nextTick(this.fitView);
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.measure);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    if (this.commitTimer) { clearTimeout(this.commitTimer); }
    if (this.saveTimer) { clearTimeout(this.saveTimer); }
    if (this.deleteWarningTimer) { clearTimeout(this.deleteWarningTimer); }
  },
  methods: {
    // --- persistence & history -------------------------------------------
    async loadState () {
      const storeId = this.storeId;
      let plan = null;
      if (storeId) {
        try {
          plan = await this._tableService.GetFloorPlan(storeId);
        } catch (e) {
          plan = null;
        }
      }

      this.idMap = {};

      if (plan && Array.isArray(plan.zones) && plan.zones.length) {
        const zoneServerToLocal = {};
        this.zones = plan.zones.map((z) => {
          const localId = uid('z');
          this.idMap[localId] = z.id;
          zoneServerToLocal[z.id] = localId;
          return { id: localId, name: z.name, sortOrder: z.sortOrder, isActive: z.isActive };
        });
        this.tables = (plan.tables || []).map((t) => {
          const localId = uid('t');
          this.idMap[localId] = t.id;
          return {
            id: localId,
            zoneId: zoneServerToLocal[t.zoneId] || (this.zones[0] && this.zones[0].id) || null,
            number: t.tableNumber,
            name: t.name || '',
            shape: SHAPE_API_TO_LOCAL[t.shape] || 'square',
            x: t.posX,
            y: t.posY,
            width: t.width,
            height: t.height,
            rotation: t.rotation,
            seats: t.seats,
            // Auto is the default: legacy rows saved before the seatsAuto
            // field (stored as false) load as auto when their seat count
            // already matches the auto value, so seats keep scaling with the
            // table. An explicitly deviating manual count is respected.
            seatsAuto: t.seatsAuto || t.seats === autoSeatsFor(SHAPE_API_TO_LOCAL[t.shape] || 'square', t.width, t.height),
            minCapacity: t.minCapacity,
            maxCapacity: t.maxCapacity,
            isActive: t.isActive
          };
        });
      } else {
        this.zones = [
          { id: uid('z'), name: 'Inne', sortOrder: 1, isActive: true },
          { id: uid('z'), name: 'Terrasse', sortOrder: 2, isActive: true }
        ];
        this.tables = [];
      }

      this.activeZoneId = this.zones[0].id;
      this.selectedId = null;
      this.undoStack = [this.serialize()];
      this.redoStack = [];
      this.$nextTick(this.fitView);
    },
    serialize () {
      return JSON.stringify({ zones: this.zones, tables: this.tables });
    },
    // Persistence is a debounced bulk upsert to the server (SaveFloorPlan). Omitted elements
    // are deleted server-side by the bulk rule; the response's clientId echo updates idMap.
    persist () {
      if (this.saveTimer) { clearTimeout(this.saveTimer); }
      this.saveTimer = setTimeout(() => this.saveToServer(), 800);
    },
    async saveToServer () {
      const storeId = this.storeId;
      if (!storeId) { return; }
      try {
        const response = await this._tableService.SaveFloorPlan(storeId, this.toPayload());
        this.applyEcho(response);
        this.lastSavedAt = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        this.showDeleteWarning(e && e.message ? e.message : 'Kunne ikke lagre bordkartet.');
      }
    },
    // Builds the bulk-upsert payload, translating local ids through idMap: a mapped id is an
    // existing server row ({id}); an unmapped id is new ({id:0, clientId}). Tables in a new
    // zone reference it by zoneClientId.
    toPayload () {
      const zones = this.zones.map((z) => {
        const serverId = this.idMap[z.id];
        const base = { name: z.name, sortOrder: z.sortOrder, isActive: z.isActive };
        if (serverId) { base.id = serverId; } else { base.id = 0; base.clientId = z.id; }
        return base;
      });
      const tables = this.tables.map((t) => {
        const serverId = this.idMap[t.id];
        const zoneServerId = this.idMap[t.zoneId];
        const base = {
          tableNumber: t.number,
          name: t.name || '',
          shape: SHAPE_LOCAL_TO_API[t.shape] || 'Square',
          posX: Math.round(t.x),
          posY: Math.round(t.y),
          width: Math.round(t.width),
          height: Math.round(t.height),
          rotation: Math.round(t.rotation),
          seats: t.seats,
          seatsAuto: t.seatsAuto,
          minCapacity: t.minCapacity,
          maxCapacity: t.maxCapacity,
          isActive: t.isActive
        };
        if (serverId) { base.id = serverId; } else { base.id = 0; base.clientId = t.id; }
        if (zoneServerId) { base.zoneId = zoneServerId; } else { base.zoneClientId = t.zoneId; }
        return base;
      });
      return { zones, tables };
    },
    // Records the server ids for rows created in this save (matched by the echoed clientId).
    applyEcho (response) {
      if (!response) { return; }
      (response.zones || []).forEach((z) => {
        if (z.clientId && z.id) { this.idMap[z.clientId] = z.id; }
      });
      (response.tables || []).forEach((t) => {
        if (t.clientId && t.id) { this.idMap[t.clientId] = t.id; }
      });
    },
    commit () {
      if (this.commitTimer) {
        clearTimeout(this.commitTimer);
        this.commitTimer = null;
      }
      const snapshot = this.serialize();
      if (this.undoStack[this.undoStack.length - 1] === snapshot) { return; }
      this.undoStack.push(snapshot);
      if (this.undoStack.length > HISTORY_LIMIT) { this.undoStack.shift(); }
      this.redoStack = [];
      this.persist();
    },
    commitDebounced () {
      if (this.commitTimer) { clearTimeout(this.commitTimer); }
      this.commitTimer = setTimeout(() => this.commit(), 400);
    },
    undo () {
      if (!this.canUndo) { return; }
      this.redoStack.push(this.undoStack.pop());
      this.applySnapshot(this.undoStack[this.undoStack.length - 1]);
    },
    redo () {
      if (!this.canRedo) { return; }
      const snapshot = this.redoStack.pop();
      this.undoStack.push(snapshot);
      this.applySnapshot(snapshot);
    },
    applySnapshot (snapshot) {
      const data = JSON.parse(snapshot);
      this.zones = data.zones;
      this.tables = data.tables;
      if (!this.zones.find(z => z.id === this.activeZoneId)) {
        this.activeZoneId = this.zones.length ? this.zones[0].id : null;
      }
      if (!this.tables.find(t => t.id === this.selectedId)) { this.selectedId = null; }
      this.persist();
    },

    // --- geometry helpers -------------------------------------------------
    measure () {
      const wrap = this.$refs.wrap;
      if (!wrap) { return; }
      this.containerW = wrap.clientWidth || 1;
      this.containerH = wrap.clientHeight || 1;
    },
    toWorld (clientX, clientY) {
      const svg = this.$refs.svg;
      if (!svg) { return { x: 0, y: 0 }; }
      const rect = svg.getBoundingClientRect();
      return {
        x: this.vb.x + ((clientX - rect.left) / rect.width) * this.vb.w,
        y: this.vb.y + ((clientY - rect.top) / rect.height) * this.vbH
      };
    },
    isInsideCanvas (clientX, clientY) {
      const svg = this.$refs.svg;
      if (!svg) { return false; }
      const rect = svg.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    },
    viewCenter () {
      return { x: this.vb.x + this.vb.w / 2, y: this.vb.y + this.vbH / 2 };
    },
    // Rotation-aware axis-aligned half extents. Margin widens the box (e.g. chair ring).
    bboxHalf (t, margin) {
      const rad = (t.rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      const w = t.width + (margin || 0);
      const h = t.height + (margin || 0);
      return { hw: (w * cos + h * sin) / 2, hh: (w * sin + h * cos) / 2 };
    },

    // --- zoom & fit ---------------------------------------------------------
    setZoom (newW, anchorWorld, anchorFrac) {
      const w = clamp(newW, MIN_VIEW, MAX_VIEW);
      const h = (w * this.containerH) / this.containerW;
      this.vb = { x: anchorWorld.x - anchorFrac.fx * w, y: anchorWorld.y - anchorFrac.fy * h, w };
    },
    zoomBy (factor) {
      this.setZoom(this.vb.w * factor, this.viewCenter(), { fx: 0.5, fy: 0.5 });
    },
    onWheel (e) {
      const svg = this.$refs.svg;
      if (!svg) { return; }
      const rect = svg.getBoundingClientRect();
      const fx = (e.clientX - rect.left) / rect.width;
      const fy = (e.clientY - rect.top) / rect.height;
      this.setZoom(this.vb.w * Math.exp(e.deltaY * 0.0015), this.toWorld(e.clientX, e.clientY), { fx, fy });
    },
    fitView () {
      this.measure();
      const list = this.activeTables;
      if (!list.length) {
        const w = 1700;
        this.vb = { x: -w / 2, y: -((w * this.containerH) / this.containerW) / 2, w };
        return;
      }
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      list.forEach((t) => {
        const { hw, hh } = this.bboxHalf(t, 60);
        minX = Math.min(minX, t.x - hw);
        maxX = Math.max(maxX, t.x + hw);
        minY = Math.min(minY, t.y - hh);
        maxY = Math.max(maxY, t.y + hh);
      });
      const pad = 90;
      minX -= pad;
      maxX += pad;
      minY -= pad;
      maxY += pad;
      const bw = maxX - minX;
      const bh = maxY - minY;
      const aspect = this.containerW / this.containerH;
      const w = clamp(Math.max(bw, bh * aspect, 500), MIN_VIEW, MAX_VIEW);
      this.vb = { x: minX + bw / 2 - w / 2, y: minY + bh / 2 - w / aspect / 2, w };
    },

    // --- tables -------------------------------------------------------------
    nextNumber () {
      return this.tables.reduce((max, t) => Math.max(max, t.number || 0), 0) + 1;
    },
    makeTable (shape, x, y) {
      const d = TABLE_DEFAULTS[shape] || TABLE_DEFAULTS.rect;
      const seats = autoSeatsFor(shape, d.width, d.height);
      return {
        id: uid('t'),
        zoneId: this.activeZoneId,
        number: this.nextNumber(),
        name: '',
        shape,
        x: snapTo(x, GRID_SNAP),
        y: snapTo(y, GRID_SNAP),
        width: d.width,
        height: d.height,
        rotation: 0,
        seats,
        seatsAuto: true,
        minCapacity: 1,
        maxCapacity: seats,
        isActive: true
      };
    },
    // Keeps seats in sync with table size while seatsAuto is on. MaxCapacity
    // follows along only when it has not been decoupled from the seat count.
    applyAutoSeats (t) {
      const auto = autoSeatsFor(t.shape, t.width, t.height);
      if (t.maxCapacity === t.seats) {
        t.maxCapacity = auto;
      }
      t.seats = auto;
    },
    addTableAt (shape, x, y) {
      const t = this.makeTable(shape, x, y);
      this.tables.push(t);
      this.selectedId = t.id;
      this.commit();
      return t;
    },
    duplicateTable (src, commitNow) {
      const copy = { ...src, id: uid('t'), number: this.nextNumber(), x: src.x + 40, y: src.y + 40 };
      this.tables.push(copy);
      this.selectedId = copy.id;
      if (commitNow !== false) { this.commit(); }
      return copy;
    },
    async removeSelected () {
      const t = this.selectedTable;
      if (!t) { return; }
      const serverId = this.idMap[t.id];

      // A table already on the server goes through DeleteTable so the delete rule (deactivate
      // when referenced by an open check or upcoming reservation) is honoured with feedback.
      if (serverId) {
        if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; }
        try {
          const result = await this._tableService.DeleteTable(this.storeId, serverId);
          if (result && result.deactivated) {
            t.isActive = false;
            this.selectedId = null;
            this.showDeleteWarning(`Bord ${t.number} er i bruk (åpen regning eller kommende reservasjon) og ble deaktivert i stedet for slettet.`);
            this.commit();
            return;
          }
        } catch (e) {
          this.showDeleteWarning(e && e.message ? e.message : 'Kunne ikke slette bordet.');
          return;
        }
        delete this.idMap[t.id];
      }

      this.tables = this.tables.filter(x => x.id !== t.id);
      this.selectedId = null;
      this.commit();
    },
    showDeleteWarning (message) {
      this.deleteWarning = message;
      if (this.deleteWarningTimer) { clearTimeout(this.deleteWarningTimer); }
      this.deleteWarningTimer = setTimeout(() => {
        this.deleteWarning = '';
      }, 5000);
    },
    quickGenerate () {
      const n = clamp(Math.floor(this.quickCount) || 1, 1, 60);
      const cols = Math.ceil(Math.sqrt(n));
      const spacing = 180;
      for (let i = 0; i < n; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        this.tables.push(this.makeTable('rect', col * spacing, row * spacing));
      }
      this.selectedId = null;
      this.commit();
      this.fitView();
    },

    // --- panel actions --------------------------------------------------------
    setSeats (delta) {
      const t = this.selectedTable;
      if (!t) { return; }
      t.seatsAuto = false;
      const next = clamp(t.seats + delta, 0, 30);
      // Max guests follows the seat count as long as it has not been decoupled
      // by a manual edit (same coupling rule as applyAutoSeats).
      if (t.maxCapacity === t.seats) {
        t.maxCapacity = next;
      }
      t.seats = next;
      if (t.maxCapacity < t.seats) { t.maxCapacity = t.seats; }
      this.commit();
    },
    toggleSeatsAuto () {
      const t = this.selectedTable;
      if (!t) { return; }
      t.seatsAuto = !t.seatsAuto;
      if (t.seatsAuto) {
        this.applyAutoSeats(t);
      }
      this.commit();
    },
    rotate45 () {
      const t = this.selectedTable;
      if (!t) { return; }
      t.rotation = (t.rotation + 45) % 360;
      this.commit();
    },
    normalizeSelected () {
      const t = this.selectedTable;
      if (!t) { return; }
      t.number = Math.max(1, Math.round(t.number) || 1);
      t.width = clamp(Math.round(t.width) || MIN_SIZE, MIN_SIZE, MAX_SIZE);
      t.height = clamp(Math.round(t.height) || MIN_SIZE, MIN_SIZE, MAX_SIZE);
      if (t.shape !== 'rect') { t.height = t.width; }
      if (t.seatsAuto) { this.applyAutoSeats(t); }
      t.seats = clamp(Math.round(t.seats) || 0, 0, 30);
      t.minCapacity = Math.max(1, Math.round(t.minCapacity) || 1);
      t.maxCapacity = Math.max(t.minCapacity, Math.round(t.maxCapacity) || t.minCapacity);
      t.rotation = ((Math.round(t.rotation) % 360) + 360) % 360;
      this.commitDebounced();
    },

    // --- zones ---------------------------------------------------------------
    selectZone (id) {
      this.activeZoneId = id;
      this.selectedId = null;
      this.$nextTick(this.fitView);
    },
    addZone () {
      const zone = { id: uid('z'), name: `Sone ${this.zones.length + 1}`, sortOrder: this.zones.length + 1, isActive: true };
      this.zones.push(zone);
      this.activeZoneId = zone.id;
      this.selectedId = null;
      this.commit();
      this.$nextTick(this.fitView);
    },
    removeZone () {
      if (this.zones.length <= 1 || this.activeTables.length) { return; }
      this.zones = this.zones.filter(z => z.id !== this.activeZoneId);
      this.activeZoneId = this.zones[0].id;
      this.commit();
      this.$nextTick(this.fitView);
    },

    // --- pointer interactions --------------------------------------------------
    trackPointerDown (e) {
      this.pointers = { ...this.pointers, [e.pointerId]: { x: e.clientX, y: e.clientY } };
      const ids = Object.keys(this.pointers);
      if (ids.length === 2) {
        // A second finger switches to pinch zoom; abort any in-progress gesture.
        if (this.interaction && this.interaction.type === 'move') { this.restoreMove(); }
        this.ghost = null;
        this.guides = { v: null, h: null };
        const [a, b] = ids.map(id => this.pointers[id]);
        this.interaction = {
          type: 'pinch',
          startDist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          startW: this.vb.w,
          startMidWorld: this.toWorld((a.x + b.x) / 2, (a.y + b.y) / 2)
        };
      }
    },
    restoreMove () {
      const it = this.interaction;
      const t = this.tables.find(x => x.id === it.id);
      if (t) {
        t.x = it.origX;
        t.y = it.origY;
      }
    },
    onCanvasPointerDown (e) {
      if (this.interaction) { return; }
      this.interaction = {
        type: 'pan',
        startClientX: e.clientX,
        startClientY: e.clientY,
        startVb: { ...this.vb },
        moved: false
      };
    },
    startMove (table, e) {
      if (this.interaction) { return; }
      this.selectedId = table.id;
      let target = table;
      let created = false;
      if (e.altKey) {
        target = this.duplicateTable(table, false);
        target.x = table.x;
        target.y = table.y;
        created = true;
      }
      const world = this.toWorld(e.clientX, e.clientY);
      this.interaction = {
        type: 'move',
        id: target.id,
        grabDx: world.x - target.x,
        grabDy: world.y - target.y,
        origX: target.x,
        origY: target.y,
        moved: false,
        created
      };
    },
    startResize (table, payload) {
      if (this.interaction) { return; }
      this.selectedId = table.id;
      this.interaction = { type: 'resize', id: table.id, changed: false };
      if (payload && payload.event && payload.event.preventDefault) { payload.event.preventDefault(); }
    },
    startRotate (table, e) {
      if (this.interaction) { return; }
      this.selectedId = table.id;
      this.interaction = { type: 'rotate', id: table.id, changed: false };
      if (e && e.preventDefault) { e.preventDefault(); }
    },
    startPalette (shape, e) {
      if (this.interaction) { return; }
      const d = TABLE_DEFAULTS[shape];
      this.interaction = {
        type: 'palette',
        shape,
        startClientX: e.clientX,
        startClientY: e.clientY,
        moved: false
      };
      this.ghost = { shape, w: d.width, h: d.height, x: 0, y: 0, visible: false };
    },
    onPointerMove (e) {
      const p = this.pointers[e.pointerId];
      if (p) {
        p.x = e.clientX;
        p.y = e.clientY;
      }
      const it = this.interaction;
      if (!it) { return; }

      if (it.type === 'pinch') {
        const pts = Object.keys(this.pointers).map(id => this.pointers[id]);
        if (pts.length < 2) { return; }
        const [a, b] = pts;
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const svg = this.$refs.svg;
        if (!svg) { return; }
        const rect = svg.getBoundingClientRect();
        const fx = ((a.x + b.x) / 2 - rect.left) / rect.width;
        const fy = ((a.y + b.y) / 2 - rect.top) / rect.height;
        this.setZoom(it.startW * (it.startDist / dist), it.startMidWorld, { fx, fy });
        return;
      }

      if (it.type === 'pan') {
        const scale = it.startVb.w / this.containerW;
        if (Math.abs(e.clientX - it.startClientX) + Math.abs(e.clientY - it.startClientY) > 4) { it.moved = true; }
        this.vb = {
          x: it.startVb.x - (e.clientX - it.startClientX) * scale,
          y: it.startVb.y - (e.clientY - it.startClientY) * scale,
          w: it.startVb.w
        };
        return;
      }

      if (it.type === 'move') {
        const t = this.tables.find(x => x.id === it.id);
        if (!t) { return; }
        const world = this.toWorld(e.clientX, e.clientY);
        const cx = snapTo(world.x - it.grabDx, GRID_SNAP);
        const cy = snapTo(world.y - it.grabDy, GRID_SNAP);
        const aligned = this.alignSnap(t, cx, cy);
        t.x = aligned.x;
        t.y = aligned.y;
        it.moved = true;
        return;
      }

      if (it.type === 'resize') {
        const t = this.tables.find(x => x.id === it.id);
        if (!t) { return; }
        const world = this.toWorld(e.clientX, e.clientY);
        const rad = (t.rotation * Math.PI) / 180;
        const dx = world.x - t.x;
        const dy = world.y - t.y;
        const lx = dx * Math.cos(rad) + dy * Math.sin(rad);
        const ly = -dx * Math.sin(rad) + dy * Math.cos(rad);
        let w = clamp(snapTo(2 * Math.abs(lx), GRID_SNAP), MIN_SIZE, MAX_SIZE);
        let h = clamp(snapTo(2 * Math.abs(ly), GRID_SNAP), MIN_SIZE, MAX_SIZE);
        if (t.shape !== 'rect') {
          const s = Math.max(w, h);
          w = s;
          h = s;
        }
        t.width = w;
        t.height = h;
        if (t.seatsAuto) {
          this.applyAutoSeats(t);
        }
        it.changed = true;
        return;
      }

      if (it.type === 'rotate') {
        const t = this.tables.find(x => x.id === it.id);
        if (!t) { return; }
        const world = this.toWorld(e.clientX, e.clientY);
        const deg = (Math.atan2(world.y - t.y, world.x - t.x) * 180) / Math.PI + 90;
        t.rotation = ((Math.round(deg / 15) * 15) % 360 + 360) % 360;
        it.changed = true;
        return;
      }

      if (it.type === 'palette') {
        if (Math.abs(e.clientX - it.startClientX) + Math.abs(e.clientY - it.startClientY) > 5) { it.moved = true; }
        const world = this.toWorld(e.clientX, e.clientY);
        this.ghost = {
          ...this.ghost,
          x: snapTo(world.x, GRID_SNAP),
          y: snapTo(world.y, GRID_SNAP),
          visible: this.isInsideCanvas(e.clientX, e.clientY)
        };
      }
    },
    onPointerUp (e) {
      if (this.pointers[e.pointerId]) {
        const remaining = { ...this.pointers };
        delete remaining[e.pointerId];
        this.pointers = remaining;
      }
      const it = this.interaction;
      if (!it) { return; }

      if (it.type === 'pinch') {
        if (Object.keys(this.pointers).length < 2) { this.interaction = null; }
        return;
      }

      if (it.type === 'pan') {
        if (!it.moved) { this.selectedId = null; }
      } else if (it.type === 'move') {
        if (it.moved || it.created) { this.commit(); }
      } else if (it.type === 'resize' || it.type === 'rotate') {
        if (it.changed) { this.commit(); }
      } else if (it.type === 'palette') {
        if (this.ghost && this.isInsideCanvas(e.clientX, e.clientY)) {
          this.addTableAt(it.shape, this.ghost.x, this.ghost.y);
        } else if (!it.moved) {
          const c = this.viewCenter();
          this.addTableAt(it.shape, c.x, c.y);
        }
        this.ghost = null;
      }
      this.guides = { v: null, h: null };
      this.interaction = null;
    },
    // Figma-style alignment: snap the moving table's center/edges to other
    // tables' centers/edges and show guide lines while snapped.
    alignSnap (t, cx, cy) {
      const threshold = 8 / this.pxScale;
      const mine = this.bboxHalf(t, 0);
      let bestV = null;
      let bestH = null;
      this.activeTables.forEach((o) => {
        if (o.id === t.id) { return; }
        const theirs = this.bboxHalf(o, 0);
        [o.x - theirs.hw, o.x, o.x + theirs.hw].forEach((cand) => {
          [cx - mine.hw, cx, cx + mine.hw].forEach((probe) => {
            const d = Math.abs(cand - probe);
            if (d < threshold && (!bestV || d < bestV.d)) { bestV = { d, dx: cand - probe, pos: cand, other: o }; }
          });
        });
        [o.y - theirs.hh, o.y, o.y + theirs.hh].forEach((cand) => {
          [cy - mine.hh, cy, cy + mine.hh].forEach((probe) => {
            const d = Math.abs(cand - probe);
            if (d < threshold && (!bestH || d < bestH.d)) { bestH = { d, dy: cand - probe, pos: cand, other: o }; }
          });
        });
      });
      const x = bestV ? cx + bestV.dx : cx;
      const y = bestH ? cy + bestH.dy : cy;
      this.guides = {
        v: bestV ? { pos: bestV.pos, from: Math.min(y, bestV.other.y) - 150, to: Math.max(y, bestV.other.y) + 150 } : null,
        h: bestH ? { pos: bestH.pos, from: Math.min(x, bestH.other.x) - 150, to: Math.max(x, bestH.other.x) + 150 } : null
      };
      return { x, y };
    },

    // --- keyboard ----------------------------------------------------------------
    onKeyDown (e) {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') { return; }
      const meta = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (meta && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) { this.redo(); } else { this.undo(); }
        return;
      }
      if (meta && key === 'y') {
        e.preventDefault();
        this.redo();
        return;
      }
      if (meta && key === 'd') {
        if (this.selectedTable) {
          e.preventDefault();
          this.duplicateTable(this.selectedTable);
        }
        return;
      }
      const t = this.selectedTable;
      if (!t) { return; }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        this.removeSelected();
        return;
      }
      if (e.key === 'Escape') {
        this.selectedId = null;
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowLeft') { t.x -= step; } else if (e.key === 'ArrowRight') { t.x += step; } else if (e.key === 'ArrowUp') { t.y -= step; } else if (e.key === 'ArrowDown') { t.y += step; } else { return; }
      e.preventDefault();
      this.commitDebounced();
    }
  }
};
</script>

<style lang="scss" scoped>
.fp-editor {
  display: flex;
  flex-direction: column;
  height: clamp(520px, calc(100vh - 260px), 900px);
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.fp-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid #eef1f5;
}

.fp-zones {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.fp-zone-tab {
  padding: 8px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 999px;
  background: #fff;
  color: #64748b;
  font-weight: 600;
  font-size: 0.85em;
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
  &.off {
    opacity: 0.6;
  }
}

.fp-zone-off {
  margin-left: 6px;
  font-size: 0.8em;
  font-weight: 500;
  color: #94a3b8;
}

.fp-zone-add {
  height: 34px;
  padding: 0 14px;
  border: 2px dashed #cbd5e0;
  border-radius: 999px;
  background: #fff;
  color: #64748b;
  font-size: 0.85em;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #1bb776;
    color: #1bb776;
  }
}

.fp-tools {
  display: flex;
  align-items: center;
  gap: 4px;
}

.fp-tool {
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  color: #292c34;
  font-size: 1em;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #f8f9fa;
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

.fp-sep {
  width: 1px;
  height: 20px;
  background: #e2e8f0;
  margin: 0 6px;
}

.fp-zoom {
  min-width: 44px;
  text-align: center;
  font-size: 0.85em;
  color: #64748b;
  font-variant-numeric: tabular-nums;
}

.fp-saved {
  margin-left: 10px;
  font-size: 0.8em;
  color: #94a3b8;
}

.fp-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.fp-canvas-wrap {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-width: 0;
}

.fp-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  background: #fbfcfe;
  touch-action: none;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.fp-guide {
  stroke: #ec4899;
  pointer-events: none;
}

.fp-ghost {
  circle,
  rect {
    fill: rgba(27, 183, 118, 0.15);
    stroke: #1bb776;
    stroke-width: 2;
    stroke-dasharray: 8 6;
  }
  pointer-events: none;
}

.fp-palette {
  position: absolute;
  top: 12px;
  left: 12px;
}

.fp-add-table {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 999px;
  background: #1bb776;
  color: #fff;
  font-size: 0.85em;
  font-weight: 700;
  cursor: grab;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
  touch-action: none;

  &:hover {
    background: #159f63;
  }

  .fp-add-plus {
    font-size: 1.4em;
    font-weight: 600;
    line-height: 1;
  }
}

.fp-statusbar {
  position: absolute;
  bottom: 10px;
  left: 12px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  font-size: 0.78em;
  color: #64748b;
  pointer-events: none;
}

.fp-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.fp-empty-card {
  pointer-events: auto;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 28px 32px;
  text-align: center;
  max-width: 340px;

  h3 {
    margin: 0 0 8px;
    font-size: 1.15em;
    color: #292c34;
  }
  p {
    margin: 0 0 16px;
    font-size: 0.9em;
    color: #64748b;
  }
}

.fp-empty-quick {
  display: flex;
  gap: 8px;
  justify-content: center;

  input {
    width: 64px;
    padding: 10px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.95em;
    text-align: center;

    &:focus {
      outline: none;
      border-color: #1bb776;
    }
  }
}

.btn-primary {
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  color: #fff;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9em;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);
  }
}

.fp-panel {
  width: 272px;
  flex-shrink: 0;
  border-left: 1px solid #eef1f5;
  padding: 16px;
  overflow-y: auto;
  background: #fff;

  h3 {
    margin: 0 0 14px;
    font-size: 1.05em;
    font-weight: 600;
    color: #292c34;
  }
}

.fp-field {
  display: block;
  margin-bottom: 12px;

  > span,
  label > span {
    display: block;
    margin-bottom: 5px;
    font-size: 0.72em;
    font-weight: 600;
    color: #292c34;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  input[type="text"],
  input[type="number"] {
    width: 100%;
    padding: 9px 10px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9em;
    color: #292c34;
    transition: border-color 0.2s ease;

    &:focus {
      outline: none;
      border-color: #1bb776;
      box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
    }
  }
}

.fp-field-split {
  display: flex;
  gap: 8px;

  label {
    flex: 1;
    min-width: 0;
  }
}

.fp-stepper {
  display: flex;
  align-items: center;
  gap: 10px;

  button {
    width: 34px;
    height: 34px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
    font-size: 1.1em;
    color: #292c34;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: #1bb776;
      color: #159f63;
    }
  }

  b {
    min-width: 28px;
    text-align: center;
    font-size: 1.05em;
    color: #292c34;
  }
}

// Scoped under .fp-stepper to out-rank its `button` sizing rule — the auto
// toggle is a text pill, not a fixed 34px +/- square.
.fp-stepper .fp-auto {
  width: auto;
  height: auto;
  margin-left: auto;
  padding: 6px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 999px;
  background: #fff;
  font-size: 0.72em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #94a3b8;
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

.fp-field-note {
  margin: 6px 0 0;
  font-size: 0.72em;
  color: #94a3b8;
  font-style: italic;
}

.fp-rotate-row {
  display: flex;
  align-items: center;
  justify-content: space-between;

  b {
    color: #292c34;
    font-variant-numeric: tabular-nums;
  }

  button {
    padding: 7px 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
    font-size: 0.8em;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: #1bb776;
      color: #159f63;
    }
  }
}

.fp-check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 14px 0;
  font-size: 0.88em;
  color: #292c34;
  cursor: pointer;

  input {
    width: 18px;
    height: 18px;
    accent-color: #1bb776;
  }
}

.fp-panel-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;

  button {
    flex: 1;
    padding: 10px 8px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.85em;
    cursor: pointer;
    transition: all 0.2s ease;
  }
}

.btn-secondary {
  background: #fff;
  color: #292c34;
  border: 2px solid #e2e8f0;

  &:hover {
    background: #f8f9fa;
    border-color: #cbd5e0;
  }
}

.btn-destructive {
  background: #fff;
  color: #ef4444;
  border: 2px solid #ef4444;

  &:hover:not(:disabled) {
    background: #ef4444;
    color: #fff;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.fp-warning {
  margin-top: 10px;
  font-size: 0.78em;
  color: #92400e;
  background: #fef3c7;
  padding: 9px 11px;
  border-radius: 8px;
  line-height: 1.4;
}

.fp-hint {
  margin-top: 14px;
  font-size: 0.75em;
  color: #94a3b8;
  line-height: 1.5;
}

.fp-zone-stats {
  font-size: 0.88em;
  color: #64748b;
  margin: 4px 0 8px;
}

@media (max-width: 900px) {
  .fp-body {
    flex-direction: column;
  }
  .fp-panel {
    width: auto;
    border-left: none;
    border-top: 1px solid #eef1f5;
    max-height: 42%;
  }
}
</style>

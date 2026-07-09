<template>
  <div class="fv">
    <div class="fv-top">
      <div class="fv-zones">
        <button
          v-for="g in zoneGroups"
          :key="g.zone.id"
          :class="{ active: zoneId === g.zone.id }"
          @click="zoneId = g.zone.id"
        >
          {{ g.zone.name }}
        </button>
      </div>
      <button class="fv-edit" @click="$emit('edit-floorplan')">
        Rediger bordkart →
      </button>
    </div>

    <div class="fv-scrub">
      <button class="fv-now" :disabled="nowMin === null" @click="goNow">
        Nå
      </button>
      <input
        v-model.number="timeMin"
        type="range"
        :min="rangeStart"
        :max="rangeEnd - 15"
        :step="15"
      >
      <span class="fv-time">{{ hhmm(timeMin) }}</span>
    </div>

    <div class="fv-canvas">
      <svg class="fv-svg" :viewBox="viewBoxStr" preserveAspectRatio="xMidYMid meet">
        <g v-for="t in zoneTables" :key="t.id" class="fv-table" @pointerdown="onTable(t)">
          <FloorPlanTable :table="t" :status="statusOf(t)" :px-scale="1" />
          <text
            class="fv-badge"
            text-anchor="middle"
            :x="t.x"
            :y="badgeY(t)"
            font-size="16"
          >{{ badgeText(t) }}</text>
        </g>
      </svg>
    </div>

    <div class="fv-legend">
      <span><i class="dot dot-free" /> Ledig</span>
      <span><i class="dot dot-requested" /> Forespurt</span>
      <span><i class="dot dot-confirmed" /> Bekreftet</span>
      <span><i class="dot dot-seated" /> Ankommet</span>
      <span class="fv-legend-hint">Trykk på et bord for å booke eller åpne reservasjonen</span>
    </div>
  </div>
</template>

<script>
import FloorPlanTable from '~/components/admin/floorplan/FloorPlanTable.vue';

export default {
  name: 'ReservationFloorView',
  components: { FloorPlanTable },
  props: {
    zoneGroups: { type: Array, default: () => [] },
    reservations: { type: Array, default: () => [] },
    rangeStart: { type: Number, default: 660 },
    rangeEnd: { type: Number, default: 1380 },
    nowMin: { type: Number, default: null }
  },
  data () {
    const first = this.zoneGroups[0];
    const initial = this.nowMin !== null ? this.nowMin : 19 * 60;
    return {
      zoneId: first ? first.zone.id : null,
      timeMin: this.clampTime(Math.round(initial / 15) * 15)
    };
  },
  computed: {
    zoneTables () {
      const g = this.zoneGroups.find(x => x.zone.id === this.zoneId) || this.zoneGroups[0];
      return g ? g.tables : [];
    },
    viewBoxStr () {
      const tables = this.zoneTables;
      if (!tables.length) { return '0 0 100 100'; }
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      tables.forEach((t) => {
        const { hw, hh } = this.bboxHalf(t);
        minX = Math.min(minX, t.x - hw);
        maxX = Math.max(maxX, t.x + hw);
        minY = Math.min(minY, t.y - hh);
        maxY = Math.max(maxY, t.y + hh + 40); // room for the badge text
      });
      const pad = 60;
      return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
    }
  },
  methods: {
    clampTime (v) {
      return Math.min(this.rangeEnd - 15, Math.max(this.rangeStart, v));
    },
    hhmm (min) {
      const h = Math.floor(min / 60) % 24;
      const m = min % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    },
    bboxHalf (t) {
      const rad = (t.rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      const w = t.width + 60;
      const h = t.height + 60;
      return { hw: (w * cos + h * sin) / 2, hh: (w * sin + h * cos) / 2 };
    },
    goNow () {
      if (this.nowMin === null) { return; }
      this.timeMin = this.clampTime(Math.round(this.nowMin / 15) * 15);
    },
    currentRes (t) {
      return this.reservations.find(
        r => r.tableId === t.id && r.startMin <= this.timeMin && this.timeMin < r.startMin + r.durationMin
      ) || null;
    },
    nextRes (t) {
      return this.reservations
        .filter(r => r.tableId === t.id && r.startMin > this.timeMin)
        .sort((a, b) => a.startMin - b.startMin)[0] || null;
    },
    statusOf (t) {
      const r = this.currentRes(t);
      return r ? r.status : '';
    },
    badgeY (t) {
      return t.y + this.bboxHalf(t).hh + 26;
    },
    badgeText (t) {
      const current = this.currentRes(t);
      if (current) {
        return `${current.name || 'Walk-in'} · til ${this.hhmm(current.startMin + current.durationMin)}`;
      }
      const next = this.nextRes(t);
      return next ? `Ledig til ${this.hhmm(next.startMin)}` : 'Ledig';
    },
    onTable (t) {
      this.$emit('table-click', {
        table: t,
        timeMin: this.timeMin,
        reservation: this.currentRes(t)
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.fv-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.fv-zones {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;

  button {
    padding: 7px 16px;
    border: 2px solid #e2e8f0;
    border-radius: 999px;
    background: #fff;
    color: #64748b;
    font-weight: 600;
    font-size: 0.82em;
    cursor: pointer;
    transition: all 0.2s ease;

    &.active {
      border-color: #1bb776;
      background: #f0fdf7;
      color: #159f63;
    }
  }
}

.fv-edit {
  border: none;
  background: none;
  color: #64748b;
  font-size: 0.82em;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: #159f63;
  }
}

.fv-scrub {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  background: #fff;
  border: 1px solid #eef1f5;
  border-radius: 10px;
  padding: 10px 14px;

  input[type="range"] {
    flex: 1;
    accent-color: #1bb776;
  }
}

.fv-now {
  padding: 7px 14px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  font-size: 0.8em;
  font-weight: 600;
  color: #292c34;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: #1bb776;
    color: #159f63;
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
}

.fv-time {
  font-weight: 700;
  font-size: 0.95em;
  color: #292c34;
  min-width: 48px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.fv-canvas {
  background: #fbfcfe;
  border: 1px solid #eef1f5;
  border-radius: 12px;
  overflow: hidden;
}

.fv-svg {
  display: block;
  width: 100%;
  height: clamp(340px, calc(100vh - 460px), 640px);
}

.fv-table {
  cursor: pointer;
}

.fv-badge {
  fill: #64748b;
  font-weight: 600;
  paint-order: stroke;
  stroke: #fbfcfe;
  stroke-width: 4px;
  pointer-events: none;
  user-select: none;
}

.fv-legend {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 10px;
  font-size: 0.78em;
  color: #64748b;

  .dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 5px;
    vertical-align: middle;
  }

  .dot-free { background: #fff; border: 2px solid #94a3b8; }
  .dot-requested { background: #f59e0b; }
  .dot-confirmed { background: #1bb776; }
  .dot-seated { background: #3b82f6; }

  .fv-legend-hint {
    margin-left: auto;
    color: #94a3b8;
  }
}
</style>

<template>
  <div ref="scroll" class="tl-scroll">
    <div class="tl-canvas" :style="{ width: canvasWidth + 'px' }">
      <div class="tl-header">
        <div class="tl-corner" />
        <div class="tl-hours" :style="{ width: gridWidth + 'px' }">
          <span
            v-for="h in hourMarks"
            :key="h.min"
            class="tl-hour"
            :style="{ left: xOf(h.min) + 'px' }"
          >{{ h.label }}</span>
        </div>
      </div>

      <template v-for="group in zoneGroups">
        <div :key="'z' + group.zone.id" class="tl-zone-row">
          <div class="tl-zone-label">
            {{ group.zone.name }}
          </div>
        </div>
        <div v-for="t in group.tables" :key="'t' + t.id" class="tl-row">
          <div class="tl-row-head">
            <b>{{ t.name || $i('res_table_number', { number: t.number }) }}</b>
            <span>{{ $i('res_capacity_range', { min: t.minCapacity, max: t.maxCapacity }) }}</span>
          </div>
          <div
            class="tl-track"
            :style="trackStyle"
            @click="onTrackClick(t, $event)"
          >
            <div
              v-for="r in blocksFor(t.id)"
              :key="r.id"
              class="tl-block"
              :class="blockClasses(r)"
              :style="blockStyle(r)"
              @pointerdown="startDrag(r, 'move', $event)"
              @click.stop
            >
              <div class="tl-grip tl-grip--l" @pointerdown.stop="startDrag(r, 'resize-l', $event)" />
              <div class="tl-block-text">
                <b>{{ r.name || $i('res_walkin') }}</b>
                <span>{{ $i('res_persons_count', { count: r.partySize }) }} · {{ hhmm(dispStart(r)) }}</span>
              </div>
              <div class="tl-grip tl-grip--r" @pointerdown.stop="startDrag(r, 'resize-r', $event)" />
            </div>
          </div>
        </div>
      </template>

      <div v-if="nowX !== null" class="tl-now" :style="{ left: nowX + 'px' }">
        <span class="tl-now-dot" />
      </div>
    </div>
  </div>
</template>

<script>
const LEFT_W = 150;
const HEADER_H = 34;
const ROW_H = 52;
const ZONE_H = 30;
const SNAP = 15;
const MIN_DURATION = 30;

export default {
  name: 'ReservationTimeline',
  props: {
    zoneGroups: { type: Array, default: () => [] },
    reservations: { type: Array, default: () => [] },
    rangeStart: { type: Number, default: 660 },
    rangeEnd: { type: Number, default: 1380 },
    pxPerHour: { type: Number, default: 140 },
    nowMin: { type: Number, default: null },
    checkConflict: { type: Function, required: true }
  },
  data () {
    return {
      drag: null,
      shakeId: null,
      justDragged: false
    };
  },
  computed: {
    gridWidth () {
      return ((this.rangeEnd - this.rangeStart) / 60) * this.pxPerHour;
    },
    canvasWidth () {
      return LEFT_W + this.gridWidth;
    },
    hourMarks () {
      const marks = [];
      for (let m = Math.ceil(this.rangeStart / 60) * 60; m <= this.rangeEnd; m += 60) {
        marks.push({ min: m, label: this.hhmm(m) });
      }
      return marks;
    },
    trackStyle () {
      const px = this.pxPerHour;
      return {
        width: this.gridWidth + 'px',
        backgroundImage:
          `repeating-linear-gradient(to right, #e4e9f0 0, #e4e9f0 1px, transparent 1px, transparent ${px}px),` +
          `repeating-linear-gradient(to right, #f1f4f8 0, #f1f4f8 1px, transparent 1px, transparent ${px / 2}px)`
      };
    },
    rowLayout () {
      const rows = [];
      this.zoneGroups.forEach((group) => {
        rows.push({ h: ZONE_H, table: null });
        group.tables.forEach((t) => {
          rows.push({ h: ROW_H, table: t });
        });
      });
      return rows;
    },
    nowX () {
      if (this.nowMin === null || this.nowMin < this.rangeStart || this.nowMin > this.rangeEnd) { return null; }
      return LEFT_W + this.xOf(this.nowMin);
    }
  },
  mounted () {
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    this.$nextTick(this.scrollToNow);
  },
  beforeDestroy () {
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
  },
  methods: {
    hhmm (min) {
      const h = Math.floor(min / 60) % 24;
      const m = min % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    },
    xOf (min) {
      return ((min - this.rangeStart) / 60) * this.pxPerHour;
    },
    scrollToNow () {
      const el = this.$refs.scroll;
      if (!el) { return; }
      if (this.nowX !== null) {
        el.scrollLeft = Math.max(0, this.nowX - LEFT_W - 220);
      }
    },
    dispStart (r) {
      const d = this.drag;
      return d && d.id === r.id ? d.curStart : r.startMin;
    },
    dispDuration (r) {
      const d = this.drag;
      return d && d.id === r.id ? d.curDur : r.durationMin;
    },
    blocksFor (tableId) {
      const d = this.drag;
      return this.reservations
        .filter((r) => {
          // While dragging, follow the temp table. Otherwise a reservation shows on every table of
          // its L3c combination (tableIds), falling back to the single primary table.
          if (d && d.id === r.id) { return d.curTable === tableId; }
          const tids = (r.tableIds && r.tableIds.length) ? r.tableIds : [r.tableId];
          return tids.includes(tableId);
        })
        .sort((a, b) => this.dispStart(a) - this.dispStart(b));
    },
    blockClasses (r) {
      const d = this.drag;
      return [
        'st-' + r.status,
        {
          'is-dragging': d && d.id === r.id && d.moved,
          'is-conflict': d && d.id === r.id && d.conflict,
          'is-shake': this.shakeId === r.id
        }
      ];
    },
    blockStyle (r) {
      const left = this.xOf(this.dispStart(r));
      const width = Math.max(24, (this.dispDuration(r) / 60) * this.pxPerHour - 2);
      return { left: left + 'px', width: width + 'px' };
    },
    startDrag (r, mode, e) {
      if (this.drag) { return; }
      e.preventDefault();
      this.drag = {
        id: r.id,
        res: r,
        mode,
        startX: e.clientX,
        startY: e.clientY,
        origStart: r.startMin,
        origDur: r.durationMin,
        origTable: r.tableId,
        curStart: r.startMin,
        curDur: r.durationMin,
        curTable: r.tableId,
        moved: false,
        conflict: false
      };
    },
    onPointerMove (e) {
      const d = this.drag;
      if (!d) { return; }
      const dxMin = Math.round((((e.clientX - d.startX) / this.pxPerHour) * 60) / SNAP) * SNAP;
      const moved = d.moved || Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) > 4;
      let { curStart, curDur, curTable } = d;
      if (d.mode === 'move') {
        curStart = this.clamp(d.origStart + dxMin, this.rangeStart, this.rangeEnd - d.origDur);
        curTable = this.tableIdAtY(e.clientY) || curTable;
      } else if (d.mode === 'resize-r') {
        curDur = this.clamp(d.origDur + dxMin, MIN_DURATION, this.rangeEnd - d.curStart);
      } else {
        const newStart = this.clamp(d.origStart + dxMin, this.rangeStart, d.origStart + d.origDur - MIN_DURATION);
        curDur = d.origDur + (d.origStart - newStart);
        curStart = newStart;
      }
      const conflict = this.checkConflict(d.id, curTable, curStart, curDur);
      this.drag = { ...d, moved, curStart, curDur, curTable, conflict };
    },
    onPointerUp () {
      const d = this.drag;
      if (!d) { return; }
      this.drag = null;
      if (!d.moved) {
        this.$emit('block-click', d.res);
        return;
      }
      this.justDragged = true;
      setTimeout(() => {
        this.justDragged = false;
      }, 150);
      if (d.conflict) {
        this.shakeId = d.id;
        setTimeout(() => {
          this.shakeId = null;
        }, 500);
        this.$emit('conflict');
        return;
      }
      if (d.mode === 'move') {
        this.$emit('block-move', { id: d.id, tableId: d.curTable, startMin: d.curStart });
      } else {
        this.$emit('block-resize', { id: d.id, startMin: d.curStart, durationMin: d.curDur });
      }
    },
    tableIdAtY (clientY) {
      const el = this.$refs.scroll;
      if (!el) { return null; }
      const rect = el.getBoundingClientRect();
      let y = clientY - rect.top + el.scrollTop - HEADER_H;
      for (const row of this.rowLayout) {
        if (y < row.h) { return row.table ? row.table.id : null; }
        y -= row.h;
      }
      return null;
    },
    onTrackClick (table, e) {
      if (this.drag || this.justDragged) { return; }
      const raw = this.rangeStart + (e.offsetX / this.pxPerHour) * 60;
      const startMin = Math.floor(raw / SNAP) * SNAP;
      this.$emit('cell-click', { tableId: table.id, startMin });
    },
    clamp (v, min, max) {
      return Math.min(max, Math.max(min, v));
    }
  }
};
</script>

<style lang="scss" scoped>
.tl-scroll {
  overflow: auto;
  border: 1px solid #eef1f5;
  border-radius: 12px;
  background: #fff;
  max-height: calc(100vh - 320px);
  min-height: 320px;
}

.tl-canvas {
  position: relative;
  min-width: 100%;
}

.tl-header {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  height: 34px;
  background: #fff;
  border-bottom: 1px solid #e4e9f0;
}

.tl-corner {
  position: sticky;
  left: 0;
  z-index: 31;
  width: 150px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e4e9f0;
}

.tl-hours {
  position: relative;
}

.tl-hour {
  position: absolute;
  top: 8px;
  transform: translateX(-50%);
  font-size: 11px;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
}

.tl-zone-row {
  display: flex;
  height: 30px;
  background: #f8fafc;
  border-bottom: 1px solid #eef1f5;
}

.tl-zone-label {
  position: sticky;
  left: 0;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #64748b;
  background: #f8fafc;
  z-index: 20;
}

.tl-row {
  display: flex;
  height: 52px;
  border-bottom: 1px solid #f1f4f8;
}

.tl-row-head {
  position: sticky;
  left: 0;
  z-index: 20;
  width: 150px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1px;
  padding: 0 12px;
  background: #fff;
  border-right: 1px solid #e4e9f0;

  b {
    font-size: 13px;
    color: #292c34;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  span {
    font-size: 11px;
    color: #94a3b8;
  }
}

.tl-track {
  position: relative;
  height: 100%;
  cursor: copy;
}

.tl-block {
  position: absolute;
  top: 6px;
  height: 40px;
  display: flex;
  align-items: stretch;
  border-radius: 8px;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
  z-index: 10;
  border-left: 3px solid transparent;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  user-select: none;

  &.is-dragging {
    z-index: 25;
    opacity: 0.9;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
    cursor: grabbing;
  }

  &.is-conflict {
    background: #fee2e2 !important;
    border-left-color: #ef4444 !important;
  }

  &.is-shake {
    animation: tl-shake 0.4s ease;
  }
}

.tl-block-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 4px;
  pointer-events: none;

  b {
    font-size: 12px;
    color: #292c34;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  span {
    font-size: 10px;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
  }
}

.tl-grip {
  width: 8px;
  flex-shrink: 0;
  cursor: ew-resize;
  touch-action: none;
}

.st-requested {
  background: #fef3c7;
  border-left-color: #f59e0b;
}

.st-confirmed {
  background: #d9f4e7;
  border-left-color: #1bb776;
}

.st-seated {
  background: #dbeafe;
  border-left-color: #3b82f6;
}

.tl-now {
  position: absolute;
  top: 34px;
  bottom: 0;
  width: 2px;
  background: #ef4444;
  z-index: 8;
  pointer-events: none;
}

.tl-now-dot {
  position: absolute;
  top: -4px;
  left: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}

@keyframes tl-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-3px); }
}
</style>

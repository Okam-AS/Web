<template>
  <g
    class="fp-table"
    :class="[{ 'is-selected': selected, 'is-inactive': !table.isActive }, status ? 'rs-' + status : '']"
    :transform="`translate(${table.x} ${table.y}) rotate(${table.rotation})`"
    @pointerdown.stop="$emit('table-pointerdown', $event)"
  >
    <rect
      v-for="(c, i) in chairs"
      :key="'chair' + i"
      class="fp-chair"
      :x="-chairWidth / 2"
      :y="-chairDepth / 2"
      :width="chairWidth"
      :height="chairDepth"
      :rx="chairDepth / 2"
      :transform="`translate(${c.x} ${c.y}) rotate(${c.angle})`"
    />

    <circle v-if="table.shape === 'round'" class="fp-top" :r="table.width / 2" />
    <rect
      v-else
      class="fp-top"
      :x="-table.width / 2"
      :y="-table.height / 2"
      :width="table.width"
      :height="table.height"
      rx="8"
    />

    <g class="fp-label" :transform="`rotate(${-table.rotation})`">
      <text class="fp-number" text-anchor="middle" :y="-2" dy="0.35em" :font-size="numberSize">
        {{ table.number }}
      </text>
      <text class="fp-seats" text-anchor="middle" :y="numberSize * 0.62 + 8" font-size="13">
        {{ table.seats }} pl
      </text>
    </g>

    <template v-if="selected">
      <rect
        class="fp-outline"
        :x="-table.width / 2 - pad"
        :y="-table.height / 2 - pad"
        :width="table.width + pad * 2"
        :height="table.height + pad * 2"
        :stroke-width="1.5 / pxScale"
        :stroke-dasharray="`${5 / pxScale} ${4 / pxScale}`"
      />
      <line
        class="fp-rotate-line"
        x1="0"
        :y1="-table.height / 2 - pad"
        x2="0"
        :y2="rotateHandleY"
        :stroke-width="1.5 / pxScale"
      />
      <circle
        class="fp-rotate-handle"
        cx="0"
        :cy="rotateHandleY"
        :r="8 / pxScale"
        @pointerdown.stop="$emit('rotate-pointerdown', $event)"
      />
      <rect
        v-for="h in resizeHandles"
        :key="h.id"
        class="fp-handle"
        :x="h.x - handleSize / 2"
        :y="h.y - handleSize / 2"
        :width="handleSize"
        :height="handleSize"
        :rx="2 / pxScale"
        :style="{ cursor: h.cursor }"
        @pointerdown.stop="$emit('resize-pointerdown', { handle: h.id, event: $event })"
      />
    </template>
  </g>
</template>

<script>
const CHAIR_WIDTH = 40;
const CHAIR_DEPTH = 15;
const CHAIR_GAP = 7;

export default {
  name: 'FloorPlanTable',
  props: {
    table: { type: Object, required: true },
    selected: { type: Boolean, default: false },
    // Screen pixels per world cm, used to keep selection chrome a constant screen size.
    pxScale: { type: Number, default: 1 },
    // Reservation status for map mode ('requested' | 'confirmed' | 'seated');
    // empty means free/plain rendering (editor mode).
    status: { type: String, default: '' }
  },
  computed: {
    chairWidth: () => CHAIR_WIDTH,
    chairDepth: () => CHAIR_DEPTH,
    pad () {
      return 7 / this.pxScale;
    },
    handleSize () {
      return 11 / this.pxScale;
    },
    rotateHandleY () {
      return -this.table.height / 2 - this.pad - 30 / this.pxScale;
    },
    numberSize () {
      const s = Math.min(this.table.width, this.table.height);
      return Math.max(18, Math.min(34, s * 0.38));
    },
    resizeHandles () {
      const hw = this.table.width / 2 + this.pad;
      const hh = this.table.height / 2 + this.pad;
      return [
        { id: 'nw', x: -hw, y: -hh, cursor: 'nwse-resize' },
        { id: 'ne', x: hw, y: -hh, cursor: 'nesw-resize' },
        { id: 'se', x: hw, y: hh, cursor: 'nwse-resize' },
        { id: 'sw', x: -hw, y: hh, cursor: 'nesw-resize' }
      ];
    },
    chairs () {
      const t = this.table;
      const n = Math.max(0, Math.floor(t.seats));
      if (!n) { return []; }
      const offset = CHAIR_GAP + CHAIR_DEPTH / 2;
      const out = [];
      if (t.shape === 'round') {
        const r = t.width / 2 + offset;
        for (let i = 0; i < n; i++) {
          const deg = -90 + (360 / n) * i;
          const rad = (deg * Math.PI) / 180;
          out.push({ x: Math.cos(rad) * r, y: Math.sin(rad) * r, angle: deg + 90 });
        }
        return out;
      }
      // Rectangular: distribute over the four sides, long sides first,
      // capped by how many chairs physically fit along each side.
      const w = t.width;
      const h = t.height;
      const caps = {
        top: Math.max(1, Math.floor(w / 55)),
        bottom: Math.max(1, Math.floor(w / 55)),
        right: Math.max(1, Math.floor(h / 55)),
        left: Math.max(1, Math.floor(h / 55))
      };
      const order = w >= h ? ['top', 'bottom', 'right', 'left'] : ['right', 'left', 'top', 'bottom'];
      const counts = { top: 0, bottom: 0, right: 0, left: 0 };
      let placed = 0;
      while (placed < n) {
        let advanced = false;
        for (const side of order) {
          if (placed >= n) { break; }
          if (counts[side] < caps[side]) {
            counts[side]++;
            placed++;
            advanced = true;
          }
        }
        if (!advanced) {
          order.forEach(side => caps[side]++);
        }
      }
      const pushSide = (side, count) => {
        for (let i = 0; i < count; i++) {
          const frac = (i + 0.5) / count;
          if (side === 'top') { out.push({ x: -w / 2 + frac * w, y: -h / 2 - offset, angle: 0 }); }
          if (side === 'bottom') { out.push({ x: -w / 2 + frac * w, y: h / 2 + offset, angle: 180 }); }
          if (side === 'right') { out.push({ x: w / 2 + offset, y: -h / 2 + frac * h, angle: 90 }); }
          if (side === 'left') { out.push({ x: -w / 2 - offset, y: -h / 2 + frac * h, angle: 270 }); }
        }
      };
      ['top', 'bottom', 'right', 'left'].forEach(side => pushSide(side, counts[side]));
      return out;
    }
  }
};
</script>

<style scoped>
.fp-table {
  cursor: move;
}
.fp-table.is-inactive {
  opacity: 0.4;
}
.fp-top {
  fill: #ffffff;
  stroke: #94a3b8;
  stroke-width: 2;
  transition: fill 0.15s ease, stroke 0.15s ease;
}
.fp-table.is-selected .fp-top {
  fill: #f0fdf7;
  stroke: #1bb776;
  stroke-width: 2.5;
}
.fp-table.is-inactive .fp-top {
  stroke-dasharray: 8 6;
}
.fp-table.rs-requested .fp-top {
  fill: #fef3c7;
  stroke: #f59e0b;
}
.fp-table.rs-confirmed .fp-top {
  fill: #d9f4e7;
  stroke: #1bb776;
}
.fp-table.rs-seated .fp-top {
  fill: #dbeafe;
  stroke: #3b82f6;
}
.fp-chair {
  fill: #d8dfe9;
  stroke: #b9c4d3;
  stroke-width: 1;
  transition: fill 0.15s ease;
}
.fp-table.is-selected .fp-chair {
  fill: #bfe8d6;
  stroke: #8fd4b5;
}
.fp-label {
  pointer-events: none;
  user-select: none;
}
.fp-number {
  fill: #292c34;
  font-weight: 700;
}
.fp-seats {
  fill: #64748b;
  font-weight: 500;
}
.fp-outline {
  fill: none;
  stroke: #1bb776;
  pointer-events: none;
}
.fp-rotate-line {
  stroke: #1bb776;
  pointer-events: none;
}
.fp-rotate-handle {
  fill: #1bb776;
  stroke: #ffffff;
  cursor: grab;
}
.fp-handle {
  fill: #ffffff;
  stroke: #1bb776;
  stroke-width: 1.5;
}
</style>

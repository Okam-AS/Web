<template>
  <div class="sigpad">
    <canvas
      ref="canvas"
      class="sigpad__canvas"
      @mousedown="start"
      @mousemove="move"
      @mouseup="end"
      @mouseleave="end"
      @touchstart.prevent="start"
      @touchmove.prevent="move"
      @touchend.prevent="end"
    />
    <div class="sigpad__bar">
      <span class="sigpad__hint">{{ $i('pos_return_sign_hint') }}</span>
      <button type="button" class="sigpad__clear" @click="clear">
        {{ $i('pos_return_sign_clear') }}
      </button>
    </div>
  </div>
</template>

<script>
// On-screen signature capture for a § 5-3-7 cash-refund customer signature. Draws finger/mouse
// strokes on a canvas and emits the trimmed drawing as a data URL (empty string when blank). The
// bitmap is intentionally small so the stored signature stays a few KB.
export default {
  name: 'SignaturePad',
  data () {
    return {
      drawing: false,
      hasInk: false,
      last: null
    };
  },
  mounted () {
    this.setup();
  },
  methods: {
    setup () {
      const canvas = this.$refs.canvas;
      // Fixed backing resolution keeps the exported data URL small and consistent across screens.
      canvas.width = 600;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      this.ctx = ctx;
    },
    point (e) {
      const canvas = this.$refs.canvas;
      const rect = canvas.getBoundingClientRect();
      const source = e.touches && e.touches.length ? e.touches[0] : e;
      return {
        x: (source.clientX - rect.left) * (canvas.width / rect.width),
        y: (source.clientY - rect.top) * (canvas.height / rect.height)
      };
    },
    start (e) {
      this.drawing = true;
      this.last = this.point(e);
    },
    move (e) {
      if (!this.drawing) { return; }
      const p = this.point(e);
      this.ctx.beginPath();
      this.ctx.moveTo(this.last.x, this.last.y);
      this.ctx.lineTo(p.x, p.y);
      this.ctx.stroke();
      this.last = p;
      this.hasInk = true;
    },
    end () {
      if (!this.drawing) { return; }
      this.drawing = false;
      this.emit();
    },
    emit () {
      this.$emit('input', this.hasInk ? this.$refs.canvas.toDataURL('image/png') : '');
    },
    clear () {
      this.setup();
      this.hasInk = false;
      this.emit();
    }
  }
};
</script>

<style scoped>
.sigpad { border: 1px solid #cbd5e0; border-radius: 10px; overflow: hidden; background: #fff; }
.sigpad__canvas { display: block; width: 100%; height: 150px; touch-action: none; cursor: crosshair; }
.sigpad__bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-top: 1px solid #eef1f5; }
.sigpad__hint { font-size: 0.78rem; color: #94a3b8; }
.sigpad__clear { border: none; background: none; color: #64748b; font-weight: 600; cursor: pointer; text-decoration: underline; font-size: 0.85rem; }
</style>

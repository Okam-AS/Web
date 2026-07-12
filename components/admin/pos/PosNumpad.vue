<template>
  <div class="pos-numpad">
    <button
      v-for="n in keys"
      :key="n.k"
      type="button"
      class="pos-numpad__key"
      :class="n.cls"
      @click="press(n)"
    >
      <span v-if="n.icon" class="pos-numpad__icon" v-html="n.icon" />
      <template v-else>
        {{ n.label }}
      </template>
    </button>
  </div>
</template>

<script>
// Shared touch numeric pad. Deliberately "dumb": it emits key presses and the parent owns the
// value, so the same pad drives the PIN pad, cash tendered, opening float and open-price entry.
const BACK_ICON = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10l4 4m0-4l-4 4m8-8H9.914a2 2 0 00-1.414.586l-4.5 4.5a1 1 0 000 1.414l4.5 4.5A2 2 0 009.914 18H20a2 2 0 002-2V8a2 2 0 00-2-2z" /></svg>';

export default {
  name: 'PosNumpad',
  props: {
    // Show a "00" key in the lower-left instead of a clear ("C") key. Used for amount entry.
    doubleZero: { type: Boolean, default: false }
  },
  computed: {
    keys () {
      const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => ({ k: d, label: d, type: 'digit', value: d }));
      const lower = this.doubleZero
        ? { k: '00', label: '00', type: 'digit', value: '00' }
        : { k: 'clear', label: 'C', type: 'clear', cls: 'pos-numpad__key--muted' };
      return [
        ...digits,
        lower,
        { k: '0', label: '0', type: 'digit', value: '0' },
        { k: 'back', type: 'back', cls: 'pos-numpad__key--muted', icon: BACK_ICON }
      ];
    }
  },
  methods: {
    press (n) {
      if (n.type === 'digit') {
        this.$emit('key', n.value);
      } else if (n.type === 'back') {
        this.$emit('backspace');
      } else if (n.type === 'clear') {
        this.$emit('clear');
      }
    }
  }
};
</script>

<style scoped>
.pos-numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  width: 100%;
}

.pos-numpad__key {
  height: 68px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  border-radius: 12px;
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--pos-ink, #292c34);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s ease, transform 0.05s ease;
  user-select: none;
}

.pos-numpad__key:hover { background: #f1f5f9; }
.pos-numpad__key:active { transform: translateY(1px); background: #e2e8f0; }

.pos-numpad__key--muted {
  background: #f8f9fa;
  color: #64748b;
}

.pos-numpad__icon { display: inline-flex; }
.pos-numpad__icon svg { width: 28px; height: 28px; }
</style>

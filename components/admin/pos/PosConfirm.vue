<template>
  <div class="pos-confirm" @click.self="$emit('cancel')">
    <div class="pos-confirm__panel" role="alertdialog" aria-modal="true">
      <h3 class="pos-confirm__title">
        {{ title }}
      </h3>
      <p v-if="text" class="pos-confirm__text">
        {{ text }}
      </p>
      <div class="pos-confirm__actions">
        <button type="button" class="pos-confirm__cancel" :disabled="busy" @click="$emit('cancel')">
          {{ cancelLabel || $i('common_cancel') }}
        </button>
        <button
          type="button"
          class="pos-confirm__ok"
          :class="{ 'is-danger': danger }"
          :disabled="busy"
          @click="$emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
// The register's confirmation dialog. It replaces window.confirm on the touch paths: the native
// dialog renders at desktop size with targets far under 44px, ignores the POS theme, and — the
// reason it actually mattered — blocks the JS thread, which stalls the card-terminal poll while it
// is open.

// How many confirms are on screen. Window keydown listeners fire in REGISTRATION order, so a
// screen that mounted earlier (SellScreen) receives Esc before the dialog rendered on top of it —
// stopping propagation from in here is too late to help. Those screens ask this instead and leave
// the key to whatever is on top.
let openConfirms = 0;
export function confirmIsOpen () { return openConfirms > 0; }

export default {
  name: 'PosConfirm',
  props: {
    title: { type: String, required: true },
    text: { type: String, default: '' },
    confirmLabel: { type: String, required: true },
    cancelLabel: { type: String, default: '' },
    // Renders the confirm button in the destructive treatment (void, discard).
    danger: { type: Boolean, default: false },
    busy: { type: Boolean, default: false }
  },
  mounted () {
    openConfirms++;
    window.addEventListener('keydown', this.onKeydown);
  },
  beforeDestroy () {
    openConfirms = Math.max(0, openConfirms - 1);
    window.removeEventListener('keydown', this.onKeydown);
  },
  methods: {
    // Esc cancels; Enter is deliberately NOT bound to confirm — this dialog only ever guards
    // destructive work, and a stray Enter must not be the thing that voids a check.
    onKeydown (e) {
      if (e.key === 'Escape') {
        // Both buttons go disabled while the confirmed work runs; Esc has to follow the same rule,
        // or the dialog can be dismissed out from under a request that is already in flight.
        if (this.busy) { return; }
        e.stopPropagation();
        this.$emit('cancel');
      }
    }
  }
};
</script>

<style scoped>
.pos-confirm {
  position: fixed;
  inset: 0;
  background: rgba(18, 20, 26, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  /* Above the sheets and modals it is raised from, below the toast host (2300). */
  z-index: 2250;
}
.pos-confirm__panel {
  background: #ffffff;
  border-radius: 18px;
  padding: 24px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}
.pos-confirm__title { margin: 0 0 8px; font-size: 1.2rem; font-weight: 700; color: var(--pos-ink, #292c34); }
.pos-confirm__text { margin: 0 0 20px; color: #64748b; line-height: 1.5; }

.pos-confirm__actions { display: flex; gap: 10px; }
.pos-confirm__actions > button {
  flex: 1;
  min-height: 52px;
  padding: 0 16px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}
.pos-confirm__actions > button:disabled { opacity: 0.55; cursor: default; }

.pos-confirm__cancel {
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: var(--pos-ink, #292c34);
}
.pos-confirm__cancel:hover:not(:disabled) { background: #f8fafc; }

.pos-confirm__ok {
  border: none;
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
}
.pos-confirm__ok.is-danger { background: #ef4444; }
</style>

<template>
  <div class="pos-toasts" aria-live="polite">
    <!-- Top stack: ordinary notices (info / success / error). Newest on top. -->
    <transition-group name="pos-toast" tag="div" class="pos-toasts__stack pos-toasts__stack--top">
      <div
        v-for="t in topToasts"
        :key="t.id"
        class="pos-toast"
        :class="'pos-toast--' + t.type"
        role="status"
      >
        <span class="pos-toast__text">{{ t.message }}</span>
        <!-- An action (e.g. "Angre") is the reason the toast exists; it must be a real 44px
             target, not a word squeezed next to the message. -->
        <button
          v-if="t.actionLabel"
          type="button"
          class="pos-toast__action"
          @click="$emit('action', t)"
        >
          {{ t.actionLabel }}
        </button>
        <button
          type="button"
          class="pos-toast__close"
          :aria-label="$i('common_close')"
          @click="$emit('dismiss', t)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </transition-group>

    <!-- Bottom stack: the calm "food ready" signal. Deliberately anchored away from the top
         notices so a kitchen signal never covers an error the operator has to read. -->
    <transition-group name="pos-toast" tag="div" class="pos-toasts__stack pos-toasts__stack--bottom">
      <button
        v-for="t in bottomToasts"
        :key="t.id"
        type="button"
        class="pos-toast pos-toast--food"
        @click="$emit('dismiss', t)"
      >
        <span class="pos-toast__icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        </span>
        <span class="pos-toast__text">{{ t.message }}</span>
      </button>
    </transition-group>
  </div>
</template>

<script>
// The single toast host for the whole register. Before this, four screens each owned their own
// notice element with its own styling, position and z-index — two could overlap, and a toast
// raised on the sell screen vanished when the operator switched mode. Everything now goes through
// pos.notify(); this component only renders what the shell owns.
export default {
  name: 'PosToast',
  props: {
    toasts: { type: Array, default: () => [] }
  },
  computed: {
    topToasts () { return this.toasts.filter(t => t.position !== 'bottom'); },
    bottomToasts () { return this.toasts.filter(t => t.position === 'bottom'); }
  }
};
</script>

<style scoped>
/* The host itself never intercepts taps — only the toasts inside it do, so the register stays
   fully usable while a notice is up. Everything lives in the bottom-left corner: it is the one
   part of the register no screen puts a primary control in, so a toast there never lands on the
   product grid, the check panel or the pay button. The safe-area insets keep it clear of the home
   indicator on a tablet running full screen. */
.pos-toasts {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2300;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-start;
  gap: 10px;
  padding: 16px calc(16px + env(safe-area-inset-right)) calc(20px + env(safe-area-inset-bottom)) calc(16px + env(safe-area-inset-left));
}

.pos-toasts__stack {
  /* Relative so a leaving toast (taken out of flow by the transition) resolves against its own
     stack instead of jumping to the far corner of the full-screen host. */
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: max-content;
  max-width: min(100%, 420px);
}
/* Notices sit closest to the corner — the fixed spot the operator learns to look at. The calm
   food-ready nudge stacks above them, so a kitchen signal can never push an error out of place. */
.pos-toasts__stack--bottom { order: -1; }

/* Phone-width: a toast that has to wrap reads better spanning the column than shrink-wrapped. */
@media (max-width: 560px) {
  .pos-toasts { padding: 12px calc(12px + env(safe-area-inset-right)) calc(14px + env(safe-area-inset-bottom)) calc(12px + env(safe-area-inset-left)); }
  .pos-toasts__stack { width: 100%; max-width: 100%; }
}
/* Short landscape (a POS tablet on its side): trim the vertical breathing room so a two-toast
   stack cannot reach the working area. */
@media (max-height: 520px) {
  .pos-toasts { gap: 6px; padding-bottom: calc(10px + env(safe-area-inset-bottom)); }
  .pos-toasts__stack { gap: 6px; }
}

.pos-toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 10px 10px 10px 20px;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  color: #ffffff;
  text-align: left;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}
.pos-toast__text { flex: 1; min-width: 0; }

.pos-toast--info { background: #334155; }
.pos-toast--success { background: var(--pos-primary-dark, #159f63); }
.pos-toast--error { background: #ef4444; }

.pos-toast__action {
  flex-shrink: 0;
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.14);
  color: inherit;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.pos-toast__action:hover { background: rgba(255, 255, 255, 0.26); }

.pos-toast__close {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 10px;
  background: none;
  color: inherit;
  opacity: 0.75;
  cursor: pointer;
}
.pos-toast__close:hover { opacity: 1; background: rgba(255, 255, 255, 0.14); }
.pos-toast__close svg { width: 18px; height: 18px; }

/* Food-ready keeps its own calm light treatment — it is a nudge, not a notice. */
.pos-toast--food {
  background: #ffffff;
  border: 1px solid rgba(27, 183, 118, 0.35);
  border-left: 4px solid var(--pos-primary, #1bb776);
  color: var(--pos-ink, #292c34);
  font-weight: 700;
  padding: 12px 20px 12px 15px;
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.18);
  cursor: pointer;
}
.pos-toast__icon { color: var(--pos-primary-dark, #159f63); display: inline-flex; flex-shrink: 0; }
.pos-toast__icon svg { width: 22px; height: 22px; }

/* In from the edge it is anchored to: a short slide from the left reads as "this arrived from the
   corner", where the old drop-from-above now would read as falling out of the working area. */
.pos-toast-enter-active, .pos-toast-leave-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.pos-toast-leave-active { position: absolute; }
.pos-toast-enter, .pos-toast-leave-to { opacity: 0; transform: translateX(-14px); }
@media (prefers-reduced-motion: reduce) {
  .pos-toast-enter, .pos-toast-leave-to { transform: none; }
}
</style>

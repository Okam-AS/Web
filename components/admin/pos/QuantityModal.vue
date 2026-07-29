<template>
  <div class="qty-modal" @click.self="$emit('close')">
    <div class="qty-modal__panel">
      <header class="qty-modal__head">
        <h2 class="qty-modal__title">
          {{ $i('pos_quantity_title') }}<template v-if="targetName">
            · {{ targetName }}
          </template>
        </h2>
        <button type="button" class="qty-modal__close" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>

      <div class="qty-modal__body">
        <!-- The value the row will end up at, not a delta: the operator reads the row, decides
             "there should be six", and types six. Working out 6 − 1 = 5 more is the register's
             job, not theirs. -->
        <div class="qty-modal__value" :class="{ 'is-zero': quantity === 0 }">
          {{ display }}
        </div>
        <p class="qty-modal__hint">
          {{ quantity === 0 ? $i('pos_quantity_removes') : $i('pos_quantity_hint', { was: effectiveInitial }) }}
        </p>

        <!-- Says what going up actually does before the operator commits to it, rather than leaving
             them to work it out from a bill that did not do what the button promised. -->
        <p v-if="raising && discounted" class="qty-modal__note qty-modal__note--block">
          {{ $i('pos_quantity_discounted') }}
        </p>
        <p v-else-if="raising && addsAsNew" class="qty-modal__note">
          {{ $i('pos_quantity_adds_new') }}
        </p>

        <!-- Common counts in one tap; the pad is there for everything else. -->
        <div class="qty-modal__presets">
          <button
            v-for="n in presets"
            :key="n"
            type="button"
            class="qty-modal__preset"
            :class="{ 'is-active': quantity === n }"
            @click="setQuantity(n)"
          >
            {{ n }}
          </button>
        </div>

        <PosNumpad @key="onKey" @backspace="onBackspace" @clear="onClear" />
      </div>

      <footer class="qty-modal__foot">
        <button
          type="button"
          class="qty-modal__confirm"
          :class="{ 'qty-modal__confirm--remove': quantity === 0 }"
          :disabled="busy || blocked || quantity === effectiveInitial"
          @click="confirm"
        >
          {{ quantity === 0 ? $i('pos_quantity_remove_row') : $i('pos_quantity_set', { count: quantity }) }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script>
import PosNumpad from '~/components/admin/pos/PosNumpad.vue';

// The register has no quantity mode. A tile tap always rings in one; the quantity of a row is then
// changed on the row itself, where the operator can see what they are changing. This replaced an
// armed "×n then tap a tile" prefix, which looked like the (sticky) course and guest chips beside
// it but self-cleared after one tap — so ×6 either leaked into the wrong item or was silently gone.
//
// Confirm emits the absolute quantity the row should end at; the parent works out how many lines to
// add or remove. Zero is a legitimate answer and means "remove this row", so it is spelled out on
// the button rather than being a surprise.
const MAX_QUANTITY = 99;

export default {
  name: 'QuantityModal',
  components: { PosNumpad },
  props: {
    // The row's current quantity, and where the pad starts.
    initialQuantity: { type: Number, default: 1 },
    targetName: { type: String, default: '' },
    busy: { type: Boolean, default: false },
    // The row has already gone to the kitchen. Extra copies are rung in as new ("Ny") lines and the
    // check therefore shows them as a second row — the kitchen must see them as a fresh order, and
    // the row above must keep saying what was actually sent. Going down still peels off this row.
    addsAsNew: { type: Boolean, default: false },
    // The row carries a line discount. The backend grants a discount to named lines, and nothing in
    // the check tells us which discount it was, so copies of the row would be rung in at full price
    // — a different price on a row that reads as one. Raising is refused rather than half-applied.
    discounted: { type: Boolean, default: false }
  },
  data () {
    return {
      // Held as a string so typing reads left-to-right the way a till does; `typed` marks the first
      // keypress, which replaces the starting value instead of appending to it.
      raw: String(Math.min(MAX_QUANTITY, Math.max(0, this.initialQuantity || 0))),
      typed: false,
      presets: [1, 2, 3, 4, 6, 12]
    };
  },
  computed: {
    quantity () {
      const n = parseInt(this.raw, 10);
      if (isNaN(n)) { return 0; }
      return Math.min(MAX_QUANTITY, Math.max(0, n));
    },
    display () { return this.raw === '' ? '0' : String(this.quantity); },
    // What the pad can actually represent for this row. A row above the pad's ceiling opens showing
    // 99, and comparing that against the raw initial quantity left Confirm enabled reading "Sett til
    // 99" — one tap would have peeled the difference off the bill without the operator asking for
    // anything. Compared against the clamped value it is correctly a no-op until they type.
    effectiveInitial () { return Math.min(MAX_QUANTITY, Math.max(0, this.initialQuantity || 0)); },
    raising () { return this.quantity > this.effectiveInitial; },
    // Confirm is dead while the answer cannot be honoured, with the reason above it — the
    // alternative was a button that rang in undiscounted copies and split the row in two.
    blocked () { return this.raising && this.discounted; }
  },
  methods: {
    onKey (digit) {
      // The first digit replaces what was there. Appending to it instead turned "this row is 1, make
      // it 6" into 16 — the single most likely mis-ring on a pad that opens pre-filled.
      const base = this.typed ? this.raw : '';
      const next = (base + digit).replace(/^0+(?=\d)/, '');
      if (parseInt(next, 10) > MAX_QUANTITY) { return; }
      this.raw = next;
      this.typed = true;
    },
    // Deletes a digit, including on the first press. Wiping the whole starting value instead turned
    // one backspace on a row of 12 into "Fjern linjen" — a red button where the operator expected 1.
    onBackspace () {
      this.raw = this.raw.slice(0, -1);
      this.typed = true;
    },
    onClear () {
      this.raw = '';
      this.typed = true;
    },
    setQuantity (n) {
      this.raw = String(n);
      this.typed = true;
    },
    confirm () {
      if (this.blocked || this.quantity === this.effectiveInitial) { return; }
      this.$emit('confirm', this.quantity);
    }
  }
};
</script>

<style scoped>
.qty-modal {
  position: fixed;
  inset: 0;
  background: rgba(18, 20, 26, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1150;
  padding: 16px;
}
.qty-modal__panel {
  background: #ffffff;
  border-radius: 18px;
  width: 100%;
  max-width: 380px;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}
.qty-modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 12px;
  border-bottom: 1px solid #eef1f5;
}
.qty-modal__title { font-size: 1.15rem; font-weight: 700; color: var(--pos-ink, #292c34); margin: 0; }
.qty-modal__close { border: none; background: none; cursor: pointer; color: #94a3b8; padding: 4px; }
.qty-modal__close svg { width: 24px; height: 24px; }

.qty-modal__body { flex: 1; overflow-y: auto; padding: 16px 20px; }

/* The number is the subject of this screen, so it is sized like one. */
.qty-modal__value {
  text-align: center;
  font-size: 3.2rem;
  font-weight: 700;
  line-height: 1.1;
  color: var(--pos-ink, #292c34);
  font-variant-numeric: tabular-nums;
}
.qty-modal__value.is-zero { color: #ef4444; }
.qty-modal__hint {
  text-align: center;
  margin: 2px 0 14px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #64748b;
}

.qty-modal__note {
  margin: -8px 0 12px;
  padding: 8px 10px;
  border-radius: 10px;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
}
/* The refusal reads as a refusal, not as a footnote. */
.qty-modal__note--block {
  background: #fef2f2;
  color: #b91c1c;
}

.qty-modal__presets {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}
.qty-modal__preset {
  height: 42px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  color: #475569;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
}
.qty-modal__preset:hover { border-color: #cbd5e0; }
.qty-modal__preset.is-active {
  background: var(--pos-primary, #1bb776);
  border-color: var(--pos-primary, #1bb776);
  color: #ffffff;
}

.qty-modal__foot { padding: 14px 20px 18px; border-top: 1px solid #eef1f5; }
.qty-modal__confirm {
  width: 100%;
  height: 54px;
  border: none;
  border-radius: 12px;
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
}
/* Confirming zero deletes the row, so the button stops looking like a save. */
.qty-modal__confirm--remove { background: #ef4444; }
.qty-modal__confirm:disabled { background: #cbd5e0; cursor: not-allowed; }
</style>

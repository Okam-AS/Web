<template>
  <div class="reason-picker">
    <label class="reason-picker__label">{{ label }}</label>
    <div class="reason-picker__grid">
      <button
        v-for="opt in options"
        :key="opt.type"
        type="button"
        class="reason-picker__btn"
        :class="{ 'reason-picker__btn--active': value.reasonType === opt.type }"
        @click="pick(opt.type)"
      >
        {{ opt.label }}
      </button>
    </div>
    <input
      v-if="value.reasonType === 'Annet'"
      :value="value.reasonText"
      type="text"
      class="reason-picker__text"
      :placeholder="otherPlaceholder"
      @input="onText($event.target.value)"
    >
  </div>
</template>

<script>
// One-tap reason picker for POS corrections (bokføringsforskriften § 5-3-7). Replaces free-text
// entry: the operator taps a predefined reason. "Annet" reveals a free-text field for the rare case
// a fixed reason does not fit. Emits input with { reasonType, reasonText } (v-model compatible).
// The reason sets mirror the backend PosReasonType so the journal classification is identical.
const REASON_SETS = {
  return: [
    { type: 'AngretKjop', label: 'Angret kjøp' },
    { type: 'FeilVare', label: 'Feil vare' },
    { type: 'Reklamasjon', label: 'Reklamasjon' },
    { type: 'Feilslag', label: 'Feilslag' },
    { type: 'Annet', label: 'Annet' }
  ],
  void: [
    { type: 'Feilslag', label: 'Feilslag' },
    { type: 'KundeAvbrot', label: 'Kunde avbrøt' },
    { type: 'Annet', label: 'Annet' }
  ],
  eod: [
    { type: 'Tellefeil', label: 'Tellefeil' },
    { type: 'FeilVekselGitt', label: 'Feil veksel gitt' },
    { type: 'Ukjent', label: 'Ukjent avvik' },
    { type: 'Annet', label: 'Annet' }
  ]
};

export default {
  name: 'ReasonPicker',
  props: {
    // 'return' | 'void' | 'eod'
    context: { type: String, required: true },
    label: { type: String, default: 'Årsak' },
    otherPlaceholder: { type: String, default: 'Beskriv årsak' },
    value: { type: Object, default: () => ({ reasonType: 'None', reasonText: '' }) }
  },
  computed: {
    options () { return REASON_SETS[this.context] || []; }
  },
  methods: {
    pick (type) {
      this.$emit('input', { reasonType: type, reasonText: type === 'Annet' ? (this.value.reasonText || '') : '' });
    },
    onText (text) {
      this.$emit('input', { reasonType: 'Annet', reasonText: text });
    }
  }
};
</script>

<style scoped>
.reason-picker__label { display: block; font-size: 0.8rem; font-weight: 700; color: #64748b; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.03em; }
.reason-picker__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.reason-picker__btn {
  min-height: 52px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  color: var(--pos-ink, #292c34);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  padding: 8px 10px;
}
.reason-picker__btn--active { border-color: #2563eb; background: #eff6ff; color: #1d4ed8; }
.reason-picker__text {
  width: 100%;
  margin-top: 10px;
  height: 48px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.95rem;
  font-family: inherit;
  color: var(--pos-ink, #292c34);
}
.reason-picker__text:focus { outline: none; border-color: #2563eb; }
</style>

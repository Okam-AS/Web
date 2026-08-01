<template>
  <div class="line-note" @click.self="$emit('close')">
    <div class="line-note__panel">
      <header class="line-note__head">
        <h2 class="line-note__title">
          {{ $i('pos_note_title') }}<template v-if="targetName">
            · {{ targetName }}
          </template>
        </h2>
        <button type="button" class="line-note__close" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>

      <div class="line-note__body">
        <textarea
          ref="input"
          v-model="note"
          class="line-note__input"
          rows="3"
          :placeholder="$i('pos_note_placeholder')"
        />

        <!-- Quick picks append a common note to the free-text field rather than replacing it, so an
             operator can stack several ("uten løk", "glutenfri") with one tap each. -->
        <div class="line-note__chips">
          <button
            v-for="chip in quickPicks"
            :key="chip.key"
            type="button"
            class="line-note__chip"
            @click="append(chip.label)"
          >
            {{ chip.label }}
          </button>
        </div>
      </div>

      <footer class="line-note__foot">
        <button type="button" class="line-note__confirm" :disabled="busy" @click="confirm">
          {{ $i('pos_note_save') }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script>
import bodyScrollLock from '~/utils/body-scroll-lock'
// A free-text note per check line, with quick-pick chips for the common cases (allergies,
// modifiers). The note is descriptive and available on every check (quick sale and table), not just
// coursing. Confirm emits the trimmed note string; the parent persists it over the group's lines.
export default {
  name: 'LineNoteModal',
  mixins: [bodyScrollLock],
  props: {
    initialNote: { type: String, default: '' },
    targetName: { type: String, default: '' },
    busy: { type: Boolean, default: false }
  },
  data () {
    return { note: this.initialNote || '' };
  },
  computed: {
    quickPicks () {
      return [
        { key: 'noonion', label: this.$i('pos_note_quick_noonion') },
        { key: 'spicy', label: this.$i('pos_note_quick_spicy') },
        { key: 'glutenfree', label: this.$i('pos_note_quick_glutenfree') },
        { key: 'allergy', label: this.$i('pos_note_quick_allergy') },
        { key: 'share', label: this.$i('pos_note_quick_share') }
      ];
    }
  },
  mounted () {
    this.$nextTick(() => {
      if (this.$refs.input) { this.$refs.input.focus(); }
    });
  },
  methods: {
    // Append a quick pick, comma-separated, skipping one that is already present.
    append (label) {
      const current = this.note.trim();
      if (!current) { this.note = label; return; }
      const parts = current.split(',').map(p => p.trim());
      if (parts.includes(label)) { return; }
      this.note = current + ', ' + label;
    },
    confirm () {
      this.$emit('confirm', this.note.trim());
    }
  }
};
</script>

<style scoped>
.line-note {
  position: fixed;
  inset: 0;
  background: rgba(18, 20, 26, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1150;
  padding: 16px;
}
.line-note__panel {
  background: #ffffff;
  border-radius: 18px;
  width: 100%;
  max-width: 440px;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}
.line-note__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 12px;
  border-bottom: 1px solid #eef1f5;
}
.line-note__title { font-size: 1.25rem; font-weight: 700; color: var(--pos-ink, #292c34); margin: 0; }
.line-note__close { border: none; background: none; cursor: pointer; color: #94a3b8; padding: 4px; }
.line-note__close svg { width: 24px; height: 24px; }

.line-note__body { flex: 1; overflow-y: auto; padding: 16px 20px; }
.line-note__input {
  width: 100%;
  min-height: 84px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
  font-size: 1rem;
  font-family: inherit;
  color: var(--pos-ink, #292c34);
  background: #ffffff;
  resize: vertical;
}
.line-note__input:focus { outline: none; border-color: var(--pos-primary, #1bb776); }

.line-note__chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.line-note__chip {
  border: 1px solid #cbd5e0;
  background: #f8fafc;
  color: #475569;
  padding: 8px 14px;
  border-radius: 18px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}
.line-note__chip:hover { border-color: var(--pos-primary, #1bb776); color: var(--pos-primary-dark, #159f63); }

.line-note__foot { padding: 14px 20px 18px; border-top: 1px solid #eef1f5; }
.line-note__confirm {
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
.line-note__confirm:disabled { background: #cbd5e0; cursor: not-allowed; }
</style>

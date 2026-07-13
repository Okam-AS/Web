<template>
  <div class="seat-pick" @click.self="$emit('close')">
    <div class="seat-pick__panel">
      <header class="seat-pick__head">
        <h2 class="seat-pick__title">
          {{ $i('pos_seat_pick_title') }}<template v-if="targetName">
            · {{ targetName }}
          </template>
        </h2>
        <button type="button" class="seat-pick__close" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>

      <!-- Single-tap flow: picking a chip assigns the line's guest immediately, no confirm step. -->
      <div class="seat-pick__body">
        <button
          type="button"
          class="seat-pick__chip"
          :class="{ 'is-active': initialSeat === null }"
          :disabled="busy"
          @click="pick(null)"
        >
          {{ $i('pos_seat_shared') }}
        </button>
        <button
          v-for="n in chipCount"
          :key="n"
          type="button"
          class="seat-pick__chip"
          :class="{ 'is-active': initialSeat === n }"
          :disabled="busy"
          @click="pick(n)"
        >
          {{ n }}
        </button>
        <!-- Add an unexpected extra guest beyond the current count. -->
        <button
          type="button"
          class="seat-pick__chip seat-pick__chip--add"
          :disabled="busy"
          @click="addGuest"
        >
          +
        </button>
      </div>
    </div>
  </div>
</template>

<script>
// Assigns a check line group to a guest (seat), mirroring the note modal's overlay/panel pattern.
// The chip grid runs [Felles] [1] .. [N] [+]; a tap confirms straight away. The parent persists the
// choice on every member line of the group so the row stays together.
export default {
  name: 'SeatPickerModal',
  props: {
    targetName: { type: String, default: '' },
    busy: { type: Boolean, default: false },
    // The group's current guest, highlighted so the operator sees what is set (null = Felles).
    initialSeat: { type: Number, default: null },
    // Guests already expected at the table; a floor of 4 keeps the grid useful on small checks.
    couverts: { type: Number, default: 0 },
    // Highest guest already tagged on the check, so the grid always reaches every used guest.
    maxSeat: { type: Number, default: 0 }
  },
  computed: {
    chipCount () {
      return Math.max(this.couverts || 0, this.maxSeat || 0, 4);
    }
  },
  methods: {
    pick (n) {
      if (this.busy) { return; }
      this.$emit('confirm', n);
    },
    // "+" tags the line to a brand-new guest one past the current count (UI cap 20).
    addGuest () {
      const next = this.chipCount + 1;
      if (next > 20) { return; }
      this.pick(next);
    }
  }
};
</script>

<style scoped>
.seat-pick {
  position: fixed;
  inset: 0;
  background: rgba(18, 20, 26, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1150;
  padding: 16px;
}
.seat-pick__panel {
  background: #ffffff;
  border-radius: 18px;
  width: 100%;
  max-width: 440px;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}
.seat-pick__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 12px;
  border-bottom: 1px solid #eef1f5;
}
.seat-pick__title { font-size: 1.25rem; font-weight: 700; color: var(--pos-ink, #292c34); margin: 0; }
.seat-pick__close { border: none; background: none; cursor: pointer; color: #94a3b8; padding: 4px; }
.seat-pick__close svg { width: 24px; height: 24px; }

.seat-pick__body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px 22px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.seat-pick__chip {
  min-width: 56px;
  height: 56px;
  padding: 0 16px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: var(--pos-ink, #292c34);
  border-radius: 12px;
  font-weight: 700;
  font-size: 1.05rem;
  cursor: pointer;
}
.seat-pick__chip:hover { border-color: var(--pos-primary, #1bb776); }
.seat-pick__chip.is-active { background: var(--pos-primary, #1bb776); border-color: var(--pos-primary, #1bb776); color: #ffffff; }
.seat-pick__chip:disabled { opacity: 0.5; cursor: not-allowed; }
.seat-pick__chip--add { border-style: dashed; color: #64748b; }
</style>

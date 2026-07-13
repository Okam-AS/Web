<template>
  <div class="mdc">
    <div class="mdc__head">
      <button type="button" class="mdc__nav" aria-label="Forrige måned" @click="shiftMonth(-1)">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
      </button>
      <span class="mdc__title">{{ monthLabel }}</span>
      <button type="button" class="mdc__nav" aria-label="Neste måned" @click="shiftMonth(1)">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>

    <div class="mdc__weekdays">
      <span v-for="w in weekdays" :key="w">{{ w }}</span>
    </div>

    <div v-for="(week, wi) in weeks" :key="wi" class="mdc__week">
      <button
        v-for="dayCell in week"
        :key="dayCell.iso"
        type="button"
        class="mdc__day"
        :class="{ 'is-muted': !dayCell.inMonth, 'is-today': dayCell.isToday, 'is-selected': isSelected(dayCell.iso), 'is-past': dayCell.isPast }"
        :disabled="!dayCell.inMonth || dayCell.isPast"
        @click="toggle(dayCell)"
      >
        {{ dayCell.dayNum }}
      </button>
    </div>
  </div>
</template>

<script>
// A lightweight month calendar for picking several dates at once (Monday-first, Norwegian). v-model
// is an array of ISO date strings (YYYY-MM-DD). Past dates and days outside the shown month are not
// selectable. No dependency — the app has no date-picker library.
const WEEKDAYS = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'];
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

export default {
  name: 'MultiDateCalendar',
  props: {
    value: { type: Array, default: () => [] }
  },
  data () {
    const now = new Date();
    return {
      weekdays: WEEKDAYS,
      viewYear: now.getFullYear(),
      viewMonth: now.getMonth()
    };
  },
  computed: {
    monthLabel () {
      return MONTHS[this.viewMonth].charAt(0).toUpperCase() + MONTHS[this.viewMonth].slice(1) + ' ' + this.viewYear;
    },
    weeks () {
      const first = new Date(this.viewYear, this.viewMonth, 1);
      const firstDow = (first.getDay() + 6) % 7; // Monday = 0
      const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
      const cells = [];
      for (let i = firstDow; i > 0; i--) {
        cells.push(this.cell(new Date(this.viewYear, this.viewMonth, 1 - i), false));
      }
      for (let d = 1; d <= daysInMonth; d++) {
        cells.push(this.cell(new Date(this.viewYear, this.viewMonth, d), true));
      }
      while (cells.length % 7 !== 0) {
        const last = cells[cells.length - 1];
        cells.push(this.cell(new Date(last.year, last.month, last.dayNum + 1), false));
      }
      const weeks = [];
      for (let i = 0; i < cells.length; i += 7) {
        weeks.push(cells.slice(i, i + 7));
      }
      return weeks;
    }
  },
  methods: {
    pad (n) { return n < 10 ? '0' + n : '' + n; },
    cell (date, inMonth) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const iso = date.getFullYear() + '-' + this.pad(date.getMonth() + 1) + '-' + this.pad(date.getDate());
      return {
        iso,
        dayNum: date.getDate(),
        year: date.getFullYear(),
        month: date.getMonth(),
        inMonth,
        isToday: date.getTime() === today.getTime(),
        isPast: date.getTime() < today.getTime()
      };
    },
    isSelected (iso) {
      return this.value.includes(iso);
    },
    toggle (cell) {
      if (!cell.inMonth || cell.isPast) { return; }
      const next = this.value.slice();
      const i = next.indexOf(cell.iso);
      if (i === -1) { next.push(cell.iso); } else { next.splice(i, 1); }
      next.sort();
      this.$emit('input', next);
    },
    shiftMonth (delta) {
      const d = new Date(this.viewYear, this.viewMonth + delta, 1);
      this.viewYear = d.getFullYear();
      this.viewMonth = d.getMonth();
    }
  }
};
</script>

<style scoped>
.mdc { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.6rem; padding: 0.75rem; user-select: none; }
.mdc__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.6rem; }
.mdc__title { font-weight: 700; color: #292c34; font-size: 0.95rem; }
.mdc__nav { border: none; background: none; color: #64748b; cursor: pointer; padding: 0.25rem; border-radius: 0.4rem; display: inline-flex; }
.mdc__nav:hover { background: #f1f3f5; color: #292c34; }
.mdc__nav svg { width: 1.1rem; height: 1.1rem; }
.mdc__weekdays { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.2rem; margin-bottom: 0.3rem; }
.mdc__weekdays span { text-align: center; font-size: 0.68rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
.mdc__week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.2rem; }
.mdc__day {
  aspect-ratio: 1 / 1;
  border: 1px solid transparent;
  background: none;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #292c34;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}
.mdc__day:hover:not(:disabled) { background: #eef1f5; }
.mdc__day.is-muted { color: transparent; cursor: default; }
.mdc__day.is-past { color: #cbd5e0; cursor: not-allowed; }
.mdc__day.is-today { border-color: #cbd5e0; }
.mdc__day.is-selected { background: #292c34; color: #fff; }
.mdc__day.is-selected:hover { background: #292c34; }
</style>

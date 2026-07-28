<template>
  <div class="wf-month">
    <div class="wf-month__scroll">
      <table class="wf-month__table">
        <thead>
          <tr>
            <th class="wf-month__head wf-month__head--week">
              {{ $i('wf_col_week') }}
            </th>
            <th
              v-for="column in grid.weekdayColumns"
              :key="column.weekday"
              class="wf-month__head wf-month__head--day"
            >
              {{ weekdayName(column.weekday) }}
            </th>
            <th class="wf-month__head wf-month__head--num">
              {{ $i('wf_col_hours') }}
            </th>
            <th class="wf-month__head wf-month__head--num">
              {{ $i('wf_col_shifts') }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="week in grid.weeks" :key="week.index" class="wf-month__row">
            <th class="wf-month__weekcell" scope="row">
              <span class="wf-month__weeknum">{{ $i('wf_week_short', { week: week.isoWeek.week }) }}</span>
              <span class="wf-month__weekstate" :class="'is-' + week.dataState">{{ stateLabel(week.dataState) }}</span>
            </th>
            <td
              v-for="(day, slot) in daysOfWeek(week)"
              :key="week.index + '-' + slot"
              class="wf-month__cell"
              :class="{
                'is-blank': !day,
                'is-conflict': day && day.hasConflict,
                'is-unknown': day && day.dataState === 'unknown',
                'is-noplan': day && day.dataState === 'no-plan'
              }"
            >
              <!-- Days outside the month are structurally blank, which is not a data state and must
                   not be styled like one. -->
              <template v-if="day">
                <span class="wf-month__daynum">{{ day.day }}</span>
                <span class="wf-month__dayhours" :class="{ 'is-unknown': day.minutes === null }">
                  {{ hours(day.minutes) }}
                </span>
                <span class="wf-month__daycount" :class="{ 'is-unknown': day.shiftCount === null }">
                  {{ shiftCountLabel(day.shiftCount) }}
                </span>
              </template>
            </td>
            <td class="wf-month__num">
              {{ tallyHours(week) }}
            </td>
            <td class="wf-month__num">
              {{ tallyCount(week) }}
            </td>
          </tr>
        </tbody>

        <!-- THE WEEKDAY COLUMNS. Every Monday of the month summed, every Tuesday, and so on — the
             question the week grid structurally cannot answer because it only ever holds one of
             each. The denominator is per column: a month has five of some weekdays and four of the
             rest, so `4 av 5` is rendered beside any column that is not whole. -->
        <tfoot>
          <tr class="wf-month__band">
            <th class="wf-month__weekcell" scope="row">
              {{ $i('wf_month_weekday_total') }}
            </th>
            <td
              v-for="column in grid.weekdayColumns"
              :key="column.weekday"
              class="wf-month__colcell"
              :class="{ 'is-partial': !column.isComplete }"
              :title="columnTitle(column)"
            >
              <span class="wf-month__coltotal" :class="{ 'is-unknown': column.minutes === null }">
                {{ hours(column.minutes) }}
              </span>
              <span class="wf-month__colcount" :class="{ 'is-unknown': column.shiftCount === null }">
                {{ shiftCountLabel(column.shiftCount) }}
              </span>
              <!-- Never a bare number over a partial month: the denominator travels with it. -->
              <span v-if="!column.isComplete" class="wf-month__coldenom">
                {{ $i('wf_month_of_days', { counted: column.countedDays, total: column.dayCount }) }}
              </span>
              <span v-else class="wf-month__colavg">{{ $i('wf_month_average', { time: averageLabel(column) }) }}</span>
            </td>
            <td class="wf-month__num">
              {{ tallyHours(grid.totals) }}
            </td>
            <td class="wf-month__num">
              {{ tallyCount(grid.totals) }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Three sentences, never collapsed. A month is fetched one week at a time, so it can be part
         counted, part unplanned and part unread all at once — and the totals above say so. -->
    <p v-if="grid.anyUnknown" class="wf-month__caveat">
      {{ $i('wf_month_unknown_weeks', { count: unknownWeekCount }) }}
    </p>
    <p v-else-if="!grid.allCounted" class="wf-month__caveat">
      {{ $i('wf_month_unplanned_weeks', { count: noPlanWeekCount }) }}
    </p>
    <p v-if="!grid.totals.isComplete && grid.totals.countedDays > 0" class="wf-month__caveat">
      {{ $i('wf_month_partial_total', { counted: grid.totals.countedDays, total: grid.totals.dayCount }) }}
    </p>
  </div>
</template>

<script>
import { formatMinutes } from '~/utils/workforce/week-grid';

// The month view: one row per ISO week, seven weekday columns, per-day totals in the cells and a
// per-weekday total across the whole month in the band.
//
// Purely presentational. Every number it renders was computed by `buildMonthGrid`, including the
// decision about whether a number may be shown at all — this component's only job on that front is
// to keep the denominator attached whenever a column is not whole.
export default {
  name: 'WorkforceMonthGrid',
  props: {
    grid: {
      type: Object,
      required: true
    },
    locale: {
      type: String,
      default: 'no'
    }
  },
  data () {
    return {
      unknownMark: '—'
    };
  },
  computed: {
    unknownWeekCount () {
      return this.grid.weekStates.filter(state => state === 'unknown').length;
    },
    noPlanWeekCount () {
      return this.grid.weekStates.filter(state => state === 'no-plan').length;
    }
  },
  methods: {
    // Seven slots per row, Monday first. A slot outside the month is null — a structural blank, not
    // a day we know nothing about.
    daysOfWeek (week) {
      const slots = [];
      const inWeek = this.grid.days.filter(day => day.weekIndex === week.index);
      for (let weekday = 1; weekday <= 7; weekday++) {
        slots.push(inWeek.find(day => day.weekday === weekday) || null);
      }
      return slots;
    },
    // A fixed reference week (Mon 2024-01-01 … Sun 2024-01-07) purely to name weekdays in the
    // viewer's locale. Formatted as UTC so the name cannot shift by a zone.
    weekdayName (weekday) {
      return new Intl.DateTimeFormat(this.locale, { weekday: 'long', timeZone: 'UTC' })
        .format(new Date(Date.UTC(2024, 0, weekday)));
    },
    // A week's badge says only whether it RESOLVED, not which lifecycle state its revision is in —
    // the month read does not carry that per week, and borrowing the week grid's Draft/Validated/
    // Published wording here would claim something this view never asked for.
    stateLabel (dataState) {
      switch (dataState) {
      case 'counted': return this.$i('wf_month_state_planned');
      case 'no-plan': return this.$i('wf_state_none');
      default: return this.$i('wf_state_unknown');
      }
    },
    shiftCountLabel (shiftCount) {
      if (shiftCount === null || shiftCount === undefined) { return this.unknownMark; }
      return shiftCount === 1 ? this.$i('wf_shift_count_one') : this.$i('wf_shift_count', { count: shiftCount });
    },
    hours (minutes) {
      return formatMinutes(minutes) || this.unknownMark;
    },
    tallyHours (tally) {
      return this.hours(tally.minutes);
    },
    tallyCount (tally) {
      return tally.shiftCount === null || tally.shiftCount === undefined
        ? this.unknownMark
        : String(tally.shiftCount);
    },
    averageLabel (column) {
      return formatMinutes(column.averageMinutes) || this.unknownMark;
    },
    // Spells out the arithmetic behind the column, including WHICH kind of gap it has: days with no
    // schedule and days we could not read are different facts and get different words.
    columnTitle (column) {
      const parts = [this.$i('wf_month_col_days', { counted: column.countedDays, total: column.dayCount })];
      if (column.noPlanDays) { parts.push(this.$i('wf_month_col_noplan', { count: column.noPlanDays })); }
      if (column.unknownDays) { parts.push(this.$i('wf_month_col_unknown', { count: column.unknownDays })); }
      return parts.join(' · ');
    }
  }
};
</script>

<style scoped>
.wf-month__scroll { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
.wf-month__table { width: 100%; border-collapse: collapse; min-width: 900px; }

.wf-month__head { text-align: left; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; }
.wf-month__head--week { min-width: 110px; }
.wf-month__head--day { min-width: 108px; text-transform: capitalize; color: #292c34; font-size: 0.78rem; letter-spacing: 0; }
.wf-month__head--num { text-align: right; white-space: nowrap; }

.wf-month__row { border-bottom: 1px solid #f1f5f9; }
.wf-month__weekcell { text-align: left; padding: 10px 12px; vertical-align: top; }
.wf-month__weeknum { display: block; color: #292c34; font-size: 0.88rem; font-weight: 600; }
.wf-month__weekstate { display: inline-block; margin-top: 3px; padding: 1px 7px; border-radius: 999px; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.02em; background: #f1f5f9; color: #64748b; }
.wf-month__weekstate.is-no-plan { background: #f8f9fa; color: #94a3b8; border: 1px dashed #cbd5e0; }
.wf-month__weekstate.is-unknown { background: #fffbeb; color: #92400e; border: 1px dashed #fde68a; }

.wf-month__cell { padding: 8px 10px; vertical-align: top; border-left: 1px solid #f1f5f9; height: 62px; }
.wf-month__cell.is-blank { background: repeating-linear-gradient(135deg, #fbfcfd, #fbfcfd 6px, #f6f8fa 6px, #f6f8fa 12px); }
.wf-month__cell.is-noplan { background: #fcfcfd; }
.wf-month__cell.is-unknown { background: #fffdf5; }
.wf-month__cell.is-conflict { background: rgba(239, 68, 68, 0.08); }
.wf-month__daynum { display: block; color: #292c34; font-size: 0.82rem; font-weight: 700; }
.wf-month__dayhours { display: block; margin-top: 2px; color: #159f63; font-size: 0.8rem; font-weight: 600; }
.wf-month__dayhours.is-unknown { color: #cbd5e0; font-weight: 500; }
.wf-month__daycount { display: block; color: #94a3b8; font-size: 0.7rem; }
.wf-month__daycount.is-unknown { color: #cbd5e0; }

.wf-month__num { text-align: right; padding: 10px 12px; color: #292c34; font-size: 0.86rem; white-space: nowrap; border-left: 1px solid #f1f5f9; }

.wf-month__band { background: #f8f9fa; border-top: 2px solid #e2e8f0; }
.wf-month__band th { color: #292c34; font-weight: 700; font-size: 0.82rem; }
.wf-month__band .wf-month__num { font-weight: 700; }
.wf-month__colcell { padding: 10px; vertical-align: top; border-left: 1px solid #e2e8f0; }
.wf-month__colcell.is-partial { background: #fffdf5; }
.wf-month__coltotal { display: block; color: #292c34; font-size: 0.92rem; font-weight: 700; }
.wf-month__coltotal.is-unknown { color: #cbd5e0; }
.wf-month__colcount { display: block; color: #64748b; font-size: 0.72rem; }
.wf-month__colcount.is-unknown { color: #cbd5e0; }
.wf-month__coldenom { display: block; margin-top: 2px; color: #92400e; font-size: 0.68rem; font-weight: 600; }
.wf-month__colavg { display: block; margin-top: 2px; color: #94a3b8; font-size: 0.68rem; }

.wf-month__caveat { margin: 10px 2px 0; color: #94a3b8; font-size: 0.78rem; }
</style>

<template>
  <div class="wf-grid">
    <div class="wf-grid__scroll">
      <table class="wf-grid__table" :class="{ 'wf-grid__table--unresolved': !isCounted }">
        <thead>
          <tr>
            <th class="wf-grid__head wf-grid__head--person">
              {{ $i('wf_col_employee') }}
            </th>
            <th
              v-for="day in grid.days"
              :key="day.isoDate"
              class="wf-grid__head wf-grid__head--day"
            >
              <span class="wf-grid__day-name">{{ weekdayLabel(day) }}</span>
              <span class="wf-grid__day-date">{{ dayLabel(day) }}</span>
              <span
                class="wf-grid__day-count"
                :class="{ 'is-unknown': day.shiftCount === null }"
              >{{ shiftCountLabel(day.shiftCount) }}</span>
            </th>
            <th class="wf-grid__head wf-grid__head--num">
              {{ $i('wf_col_hours') }}
            </th>
            <th class="wf-grid__head wf-grid__head--num">
              {{ $i('wf_col_shifts') }}
            </th>
            <!-- The wage column is built by the rates lane. It holds its place so the grid does not
                 reflow when money arrives, and shows the unknown mark until then — never a 0. -->
            <th class="wf-grid__head wf-grid__head--num wf-grid__head--cost">
              {{ $i('wf_col_cost') }}
            </th>
          </tr>
        </thead>

        <tbody>
          <!-- Pinned first: an unassigned shift is a first-class object, not a gap in someone's row. -->
          <tr class="wf-grid__row wf-grid__row--open">
            <th class="wf-grid__person" scope="row">
              <span class="wf-grid__person-name">{{ $i('wf_open_shifts') }}</span>
              <span class="wf-grid__person-meta">{{ $i('wf_open_shifts_hint') }}</span>
            </th>
            <td
              v-for="cell in grid.openRow.cells"
              :key="cell.isoDate"
              class="wf-grid__cell"
              :class="{ 'is-conflict': cell.hasConflict }"
            >
              <span
                v-for="shift in cell.shifts"
                :key="shift.id"
                class="wf-grid__shift wf-grid__shift--open"
                :class="{ 'is-conflict': shift.isConflicting }"
                :title="shiftTitle(shift)"
              >
                <span class="wf-grid__shift-time">{{ shiftTime(shift) }}</span>
                <span v-if="shift.roleName" class="wf-grid__shift-role">{{ shift.roleName }}</span>
              </span>
            </td>
            <td class="wf-grid__num">
              {{ hours(grid.openRow.totals.minutes) }}
            </td>
            <td class="wf-grid__num">
              {{ count(grid.openRow.totals.shiftCount) }}
            </td>
            <td class="wf-grid__num wf-grid__num--cost">
              {{ unknownMark }}
            </td>
          </tr>

          <tr
            v-for="row in grid.rows"
            :key="row.key"
            class="wf-grid__row"
            :class="{ 'is-conflict': row.hasConflict, 'is-inactive': row.isActive === false }"
          >
            <th class="wf-grid__person" scope="row">
              <span class="wf-grid__person-name">{{ row.name }}</span>
              <span v-if="!row.isRostered" class="wf-grid__person-flag">{{ $i('wf_off_roster') }}</span>
              <span v-else-if="row.isActive === false" class="wf-grid__person-flag">{{ $i('wf_inactive') }}</span>
              <span v-else-if="row.employmentNumber" class="wf-grid__person-meta">{{ row.employmentNumber }}</span>
            </th>
            <td
              v-for="cell in row.cells"
              :key="cell.isoDate"
              class="wf-grid__cell"
              :class="{ 'is-conflict': cell.hasConflict, 'is-external-clash': cell.hasExternalClash }"
            >
              <span
                v-for="shift in cell.shifts"
                :key="shift.id"
                class="wf-grid__shift"
                :class="{ 'is-conflict': shift.isConflicting, 'is-external-clash': shift.hasExternalClash }"
                :title="shiftTitle(shift)"
              >
                <span class="wf-grid__shift-time">{{ shiftTime(shift) }}</span>
                <span v-if="shift.roleName" class="wf-grid__shift-role">{{ shift.roleName }}</span>
              </span>
              <span
                v-for="marker in cell.markers"
                :key="marker"
                class="wf-grid__marker"
                :class="'wf-grid__marker--' + marker"
              >{{ markerLabel(marker) }}</span>
              <!-- The cross-store overlay. It says a commitment EXISTS elsewhere and when — never
                   where. The response carries no store id, name or assignment id for exactly this
                   reason (the write path's refusal names none either), so there is nothing here to
                   render a store from, and nothing may be inferred to stand in for one. -->
              <span
                v-for="item in cell.external"
                :key="item.key"
                class="wf-grid__external"
                :class="{ 'is-clash': item.isClashing }"
                :title="externalTitle(item)"
              >
                <span class="wf-grid__external-time">{{ externalTime(item) }}</span>
                <span class="wf-grid__external-label">{{ externalLabel(item) }}</span>
              </span>
            </td>
            <td class="wf-grid__num">
              {{ hours(row.totals.minutes) }}
            </td>
            <td class="wf-grid__num">
              {{ count(row.totals.shiftCount) }}
            </td>
            <td class="wf-grid__num wf-grid__num--cost">
              {{ unknownMark }}
            </td>
          </tr>

          <tr v-if="!grid.rows.length" class="wf-grid__row wf-grid__row--empty">
            <td :colspan="grid.days.length + 4">
              {{ grid.rosterKnown ? $i('wf_roster_empty') : $i('wf_roster_unknown') }}
            </td>
          </tr>
        </tbody>

        <!-- The band. TIMER is real. LØNN and LØNNSPROSENT belong to the rates lane and show the
             unknown mark until it lands; no target or revenue figure is invented here. -->
        <tfoot>
          <tr class="wf-grid__band">
            <th class="wf-grid__person" scope="row">
              {{ $i('wf_band_total') }}
            </th>
            <td :colspan="grid.days.length" class="wf-grid__band-note">
              {{ $i('wf_band_note') }}
            </td>
            <td class="wf-grid__num">
              {{ hours(grid.totals.minutes) }}
            </td>
            <td class="wf-grid__num">
              {{ count(grid.totals.shiftCount) }}
            </td>
            <td class="wf-grid__num wf-grid__num--cost">
              {{ unknownMark }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <p v-if="!grid.markersKnown" class="wf-grid__caveat">
      {{ $i('wf_markers_unknown') }}
    </p>
    <!-- Three separate sentences, never collapsed: the check did not answer / it answered but some
         rows could not be placed / it answered and everything is on screen (which says nothing). -->
    <p v-if="!grid.externalKnown" class="wf-grid__caveat">
      {{ $i('wf_external_unknown') }}
    </p>
    <p v-else-if="grid.externalUnplaced" class="wf-grid__caveat">
      {{ externalUnplacedLabel }}
    </p>
  </div>
</template>

<script>
import { DATA_COUNTED, EXTERNAL_PUBLISHED_SHIFT, formatMinutes } from '~/utils/workforce/week-grid';

// The week grid: seven store-local day columns, one row per employee, the open-shift row pinned on
// top, and a totals band. Purely presentational — it renders the model `buildWeekGrid` produced and
// owns no fetching, so every placement rule it draws is unit-testable without a network.
export default {
  name: 'WorkforceWeekGrid',
  props: {
    grid: {
      type: Object,
      required: true
    },
    // BCP-47 tag for the weekday/date labels; the page passes the admin locale.
    locale: {
      type: String,
      default: 'no'
    }
  },
  data () {
    return {
      // One mark for every unknown in the grid, so "we do not know" never looks like a number.
      unknownMark: '—'
    };
  },
  computed: {
    isCounted () {
      return this.grid.dataState === DATA_COUNTED;
    },
    externalUnplacedLabel () {
      const count = this.grid.externalUnplaced;
      return count === 1
        ? this.$i('wf_external_unplaced_one')
        : this.$i('wf_external_unplaced', { count });
    }
  },
  methods: {
    // The day columns are civil dates, so they are formatted as UTC — formatting them in the
    // viewer's zone would relabel the store's Monday for anyone reading from another country.
    civilDate (day) {
      return new Date(Date.UTC(day.year, day.month - 1, day.day));
    },
    weekdayLabel (day) {
      return new Intl.DateTimeFormat(this.locale, { weekday: 'short', timeZone: 'UTC' })
        .format(this.civilDate(day));
    },
    dayLabel (day) {
      return new Intl.DateTimeFormat(this.locale, { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
        .format(this.civilDate(day));
    },
    // Null is the unknown mark, never "0 vakter": a week with no resolved revision does not tell us
    // that nobody works on Wednesday, only that nothing has been planned to read.
    shiftCountLabel (shiftCount) {
      if (shiftCount === null || shiftCount === undefined) { return this.unknownMark; }
      return shiftCount === 1 ? this.$i('wf_shift_count_one') : this.$i('wf_shift_count', { count: shiftCount });
    },
    shiftTime (shift) {
      if (!shift.start || !shift.end) { return this.unknownMark; }
      return shift.start + '–' + shift.end + (shift.crossesMidnight ? '⁺' : '');
    },
    shiftTitle (shift) {
      const parts = [];
      if (shift.roleName) { parts.push(shift.roleName); }
      const paid = formatMinutes(shift.paidMinutes);
      if (paid) { parts.push(this.$i('wf_paid_time', { time: paid })); }
      if (shift.crossesMidnight) { parts.push(this.$i('wf_overnight')); }
      if (shift.note) { parts.push(shift.note); }
      if (shift.isConflicting) { parts.push(this.$i('wf_conflict_shift')); }
      if (shift.hasExternalClash) { parts.push(this.$i('wf_external_clash')); }
      return parts.join(' · ');
    },

    // --- the cross-store overlay -------------------------------------------------------------
    // Every string below describes a commitment's KIND and TIME. None of them has a store to name,
    // and none may acquire one: the backend withholds the other store's identity on this read
    // because its refusal on the write path withholds it too.

    externalTime (item) {
      if (!item.start || !item.end) { return this.unknownMark; }
      return item.start + '–' + item.end + (item.crossesMidnight ? '⁺' : '');
    },
    externalLabel (item) {
      return item.isClashing ? this.$i('wf_external_busy_clash') : this.$i('wf_external_busy');
    },
    externalTitle (item) {
      const parts = [];
      // A closed vocabulary server-side: an unrecognised kind gets the vaguer sentence rather than
      // being described as a published shift we have not been told it is.
      parts.push(item.kind === EXTERNAL_PUBLISHED_SHIFT
        ? this.$i('wf_external_kind_shift')
        : this.$i('wf_external_kind_unknown'));
      parts.push(this.$i('wf_external_no_store'));
      if (item.crossesMidnight) { parts.push(this.$i('wf_external_spans')); }
      if (item.isClashing) { parts.push(this.$i('wf_external_clash')); }
      return parts.join(' ');
    },
    markerLabel (marker) {
      return this.$i('wf_marker_' + marker.replace(/-/g, '_'));
    },
    hours (minutes) {
      return formatMinutes(minutes) || this.unknownMark;
    },
    count (value) {
      return value === null || value === undefined ? this.unknownMark : String(value);
    }
  }
};
</script>

<style scoped>
.wf-grid__scroll { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
.wf-grid__table { width: 100%; border-collapse: collapse; min-width: 900px; }
.wf-grid__table--unresolved tbody { opacity: 0.72; }

.wf-grid__head { text-align: left; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: bottom; font-weight: 600; }
.wf-grid__head--person { min-width: 190px; }
.wf-grid__head--day { min-width: 120px; }
.wf-grid__head--num { text-align: right; white-space: nowrap; }
.wf-grid__head--cost { color: #cbd5e0; }
.wf-grid__day-name { display: block; color: #292c34; font-size: 0.82rem; text-transform: capitalize; }
.wf-grid__day-date { display: block; color: #64748b; font-size: 0.74rem; text-transform: none; }
.wf-grid__day-count { display: block; margin-top: 4px; color: #159f63; font-size: 0.7rem; text-transform: none; letter-spacing: 0; }
.wf-grid__day-count.is-unknown { color: #94a3b8; }

.wf-grid__row { border-bottom: 1px solid #f1f5f9; }
.wf-grid__row--open { background: #f8f9fa; }
.wf-grid__row--open .wf-grid__person-name { color: #159f63; }
.wf-grid__row.is-conflict { background: rgba(239, 68, 68, 0.06); }
.wf-grid__row.is-inactive .wf-grid__person-name { color: #94a3b8; }
.wf-grid__row--empty td { padding: 22px 12px; color: #94a3b8; text-align: center; }

.wf-grid__person { text-align: left; padding: 10px 12px; vertical-align: top; font-weight: 500; }
.wf-grid__person-name { display: block; color: #292c34; font-size: 0.92rem; font-weight: 600; }
.wf-grid__person-meta { display: block; color: #94a3b8; font-size: 0.74rem; font-weight: 400; }
.wf-grid__person-flag { display: inline-block; margin-top: 3px; padding: 1px 6px; border-radius: 6px; background: #fef3c7; color: #92400e; font-size: 0.68rem; font-weight: 600; }

.wf-grid__cell { padding: 8px; vertical-align: top; border-left: 1px solid #f1f5f9; }
.wf-grid__cell.is-external-clash { background: #fffbeb; }
.wf-grid__cell.is-conflict { background: rgba(239, 68, 68, 0.1); }

.wf-grid__shift { display: block; margin-bottom: 4px; padding: 5px 8px; border-radius: 6px; background: rgba(27, 183, 118, 0.12); border-left: 3px solid #1bb776; }
.wf-grid__shift--open { background: #fff; border: 1px dashed #cbd5e0; border-left: 3px dashed #94a3b8; }
.wf-grid__shift.is-external-clash { border-left-color: #d97706; }
.wf-grid__shift.is-conflict { background: rgba(239, 68, 68, 0.14); border-left-color: #ef4444; }
.wf-grid__shift-time { display: block; color: #292c34; font-size: 0.82rem; font-weight: 600; }
.wf-grid__shift-role { display: block; color: #64748b; font-size: 0.72rem; }

.wf-grid__marker { display: block; margin-bottom: 4px; padding: 4px 8px; border-radius: 6px; font-size: 0.74rem; font-weight: 600; }
.wf-grid__marker--unavailable { background: #f1f5f9; color: #64748b; border-left: 3px solid #94a3b8; }
.wf-grid__marker--prefer-not { background: #f8f9fa; color: #94a3b8; border-left: 3px solid #cbd5e0; }
.wf-grid__marker--time-off { background: #fef3c7; color: #92400e; border-left: 3px solid #d97706; }
.wf-grid__marker--time-off-pending { background: #fffbeb; color: #92400e; border-left: 3px dashed #d97706; }

/* Advisory, not a refusal: a muted chip, and the amber of a warning only when it collides with a
   shift planned here. It carries no store, so it is styled as a fact about the person's time. */
.wf-grid__external { display: block; margin-bottom: 4px; padding: 4px 8px; border-radius: 6px; background: #f8f9fa; border-left: 3px dotted #94a3b8; }
.wf-grid__external.is-clash { background: #fef3c7; border-left: 3px solid #d97706; }
.wf-grid__external-time { display: block; color: #64748b; font-size: 0.78rem; font-weight: 600; }
.wf-grid__external.is-clash .wf-grid__external-time { color: #92400e; }
.wf-grid__external-label { display: block; color: #94a3b8; font-size: 0.7rem; }
.wf-grid__external.is-clash .wf-grid__external-label { color: #92400e; }

.wf-grid__num { text-align: right; padding: 10px 12px; color: #292c34; font-size: 0.86rem; white-space: nowrap; border-left: 1px solid #f1f5f9; }
.wf-grid__num--cost { color: #cbd5e0; }

.wf-grid__band { background: #f8f9fa; border-top: 2px solid #e2e8f0; }
.wf-grid__band .wf-grid__person-name,
.wf-grid__band th { color: #292c34; font-weight: 700; font-size: 0.86rem; }
.wf-grid__band .wf-grid__num { font-weight: 700; }
.wf-grid__band-note { padding: 10px 12px; color: #94a3b8; font-size: 0.76rem; }

.wf-grid__caveat { margin: 10px 2px 0; color: #94a3b8; font-size: 0.78rem; }
</style>

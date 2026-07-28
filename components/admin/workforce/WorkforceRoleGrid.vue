<template>
  <div class="wf-roles">
    <div class="wf-roles__scroll">
      <table class="wf-roles__table" :class="{ 'wf-roles__table--unresolved': !isCounted }">
        <thead>
          <tr>
            <th class="wf-roles__head wf-roles__head--role">
              {{ $i('wf_col_role') }}
            </th>
            <th
              v-for="day in grid.days"
              :key="day.isoDate"
              class="wf-roles__head wf-roles__head--day"
            >
              <span class="wf-roles__day-name">{{ weekdayLabel(day) }}</span>
              <span class="wf-roles__day-date">{{ dayLabel(day) }}</span>
              <span
                class="wf-roles__day-count"
                :class="{ 'is-unknown': day.shiftCount === null }"
              >{{ shiftCountLabel(day.shiftCount) }}</span>
            </th>
            <th class="wf-roles__head wf-roles__head--num">
              {{ $i('wf_col_hours') }}
            </th>
            <th class="wf-roles__head wf-roles__head--num">
              {{ $i('wf_col_shifts') }}
            </th>
            <th class="wf-roles__head wf-roles__head--num">
              {{ $i('wf_col_people') }}
            </th>
            <!-- THERE IS NO WAGE COLUMN HERE, and its absence is the decision. The cost overlay
                 totals per shift, per day and for the range — never per role — so a role's wage
                 could only be built by adding that role's rounded shift chips, which is the one sum
                 the backend forbids and which would disagree with the employee tab's footer for the
                 same week. A column of nothing but em dashes would be a promise that can never be
                 kept, so the caveat below says where the wage sum lives instead. -->
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="row in grid.rows"
            :key="row.key"
            class="wf-roles__row"
            :class="{ 'is-conflict': row.hasConflict, 'is-unlisted': row.isListed === false }"
          >
            <th class="wf-roles__role" scope="row">
              <span class="wf-roles__swatch" :style="swatchStyle(row)" />
              <span class="wf-roles__role-text">
                <!-- An unresolved role may have no name at all. It is NOT labelled with its id, and
                     it is NOT quietly folded into "no role" — it says what it is. -->
                <span class="wf-roles__role-name" :class="{ 'is-unknown': !row.name }">
                  {{ row.name || $i('wf_role_unnamed') }}
                </span>
                <!-- `=== false` on purpose: `null` means the role list never answered, and the row
                     must not claim the role is missing from a list nobody read. -->
                <span v-if="row.isListed === false" class="wf-roles__role-flag">{{ $i('wf_role_unlisted') }}</span>
                <span v-else-if="row.isEffective === false" class="wf-roles__role-flag">{{ $i('wf_role_retired') }}</span>
                <span v-else-if="row.station" class="wf-roles__role-meta">{{ row.station }}</span>
              </span>
            </th>
            <td
              v-for="cell in row.cells"
              :key="cell.isoDate"
              class="wf-roles__cell"
              :class="{ 'is-conflict': cell.hasConflict, 'is-external-clash': cell.hasExternalClash }"
            >
              <span
                v-for="shift in cell.shifts"
                :key="shift.id"
                class="wf-roles__shift"
                :class="{
                  'is-open': shift.isOpen,
                  'is-conflict': shift.isConflicting,
                  'is-external-clash': shift.hasExternalClash
                }"
                :title="shiftTitle(shift)"
              >
                <span class="wf-roles__shift-time">{{ shiftTime(shift) }}</span>
                <!-- The pivot is by role, so the cell labels the PERSON — the one thing the row
                     header no longer says. -->
                <span class="wf-roles__shift-who">{{ shift.isOpen ? $i('wf_open_shifts') : (shift.staffName || $i('wf_role_unknown_person')) }}</span>
              </span>
            </td>
            <td class="wf-roles__num">
              {{ hours(row.totals.minutes) }}
            </td>
            <td class="wf-roles__num">
              {{ count(row.totals.shiftCount) }}
            </td>
            <td class="wf-roles__num">
              {{ count(row.totals.staffCount) }}
            </td>
          </tr>

          <!-- Pinned last and shown only when it holds something: "no role" is not a role a manager
               defined, so an empty one is noise — unlike an empty listed role, which is signal. -->
          <tr v-if="grid.noRoleRow" class="wf-roles__row wf-roles__row--norole">
            <th class="wf-roles__role" scope="row">
              <span class="wf-roles__swatch wf-roles__swatch--none" />
              <span class="wf-roles__role-text">
                <span class="wf-roles__role-name">{{ $i('wf_role_none') }}</span>
                <span class="wf-roles__role-meta">{{ $i('wf_role_none_hint') }}</span>
              </span>
            </th>
            <td
              v-for="cell in grid.noRoleRow.cells"
              :key="cell.isoDate"
              class="wf-roles__cell"
              :class="{ 'is-conflict': cell.hasConflict, 'is-external-clash': cell.hasExternalClash }"
            >
              <span
                v-for="shift in cell.shifts"
                :key="shift.id"
                class="wf-roles__shift"
                :class="{ 'is-open': shift.isOpen, 'is-conflict': shift.isConflicting }"
                :title="shiftTitle(shift)"
              >
                <span class="wf-roles__shift-time">{{ shiftTime(shift) }}</span>
                <span class="wf-roles__shift-who">{{ shift.isOpen ? $i('wf_open_shifts') : (shift.staffName || $i('wf_role_unknown_person')) }}</span>
              </span>
            </td>
            <td class="wf-roles__num">
              {{ hours(grid.noRoleRow.totals.minutes) }}
            </td>
            <td class="wf-roles__num">
              {{ count(grid.noRoleRow.totals.shiftCount) }}
            </td>
            <td class="wf-roles__num">
              {{ count(grid.noRoleRow.totals.staffCount) }}
            </td>
          </tr>

          <tr v-if="!grid.rows.length && !grid.noRoleRow" class="wf-roles__row wf-roles__row--empty">
            <td :colspan="grid.days.length + 4">
              {{ grid.rolesKnown ? $i('wf_roles_empty') : $i('wf_roles_unknown') }}
            </td>
          </tr>
        </tbody>

        <tfoot>
          <tr class="wf-roles__band">
            <th class="wf-roles__role" scope="row">
              {{ $i('wf_band_total') }}
            </th>
            <!-- The employee band's note (`wf_band_note`) is deliberately NOT repeated here. It says
                 the wage percentage, revenue and variance to target are still to come, which is a
                 promise about a band that HAS a wage figure. Repeating it under a pivot with no wage
                 column would imply a wage percentage is coming to this table; it is not. -->
            <td :colspan="grid.days.length" class="wf-roles__band-note" />
            <td class="wf-roles__num">
              {{ hours(grid.totals.minutes) }}
            </td>
            <td class="wf-roles__num">
              {{ count(grid.totals.shiftCount) }}
            </td>
            <!-- People. A week's distinct headcount is NOT the sum of the rows' — one person can
                 cover two roles — so the band declines it rather than double-counting them. -->
            <td class="wf-roles__num">
              {{ unknownMark }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Each caveat is a different sentence about a different fact, and none of them is "0". -->
    <!-- Unconditional, because it is a property of the API and not of this week's data: the wage sum
         is a per-shift/per-day/per-range figure, so it is answerable on the employee view and not
         here. Saying so is what keeps the missing column from reading as a load that failed. -->
    <p class="wf-roles__caveat">
      {{ $i('wf_roles_cost_elsewhere') }}
    </p>
    <p v-if="!grid.rolesKnown" class="wf-roles__caveat">
      {{ $i('wf_roles_list_unknown') }}
    </p>
    <p v-if="grid.unresolvedCount" class="wf-roles__caveat">
      {{ unresolvedLabel }}
    </p>
    <p v-if="grid.hiddenRetiredCount" class="wf-roles__caveat">
      {{ hiddenRetiredLabel }}
    </p>
    <p v-if="!grid.externalKnown" class="wf-roles__caveat">
      {{ $i('wf_external_unknown') }}
    </p>
  </div>
</template>

<script>
import { DATA_COUNTED, formatMinutes } from '~/utils/workforce/week-grid';

// The role pivot: the same week as the employee grid, grouped by `WorkforceRole` instead of by
// person. Purely presentational — it renders what `buildRoleGrid` produced and owns no fetching.
//
// The row that is NOT here is as deliberate as the ones that are: Planday's middle tab is
// "Personalgrupper", a staff-group axis parallel to the role a shift is scheduled as. Okam does not
// mint one, because a venue would then be keeping two lists aligned by hand and the schedule and the
// group totals would describe different things the first day they drifted.
export default {
  name: 'WorkforceRoleGrid',
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
      unknownMark: '—'
    };
  },
  computed: {
    isCounted () {
      return this.grid.dataState === DATA_COUNTED;
    },
    unresolvedLabel () {
      const count = this.grid.unresolvedCount;
      return count === 1 ? this.$i('wf_role_unresolved_one') : this.$i('wf_role_unresolved', { count });
    },
    hiddenRetiredLabel () {
      const count = this.grid.hiddenRetiredCount;
      return count === 1 ? this.$i('wf_role_hidden_one') : this.$i('wf_role_hidden', { count });
    }
  },
  methods: {
    // Civil dates, formatted as UTC — formatting them in the viewer's zone would relabel the
    // store's Monday for anyone reading from another country.
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
    shiftCountLabel (shiftCount) {
      if (shiftCount === null || shiftCount === undefined) { return this.unknownMark; }
      return shiftCount === 1 ? this.$i('wf_shift_count_one') : this.$i('wf_shift_count', { count: shiftCount });
    },
    // The role's own colour, used as the row accent. Null-safe: a role without one gets the
    // neutral border rather than an inline style of "undefined".
    swatchStyle (row) {
      return row.color ? { backgroundColor: row.color } : {};
    },
    shiftTime (shift) {
      if (!shift.start || !shift.end) { return this.unknownMark; }
      return shift.start + '–' + shift.end + (shift.crossesMidnight ? '⁺' : '');
    },
    shiftTitle (shift) {
      const parts = [];
      if (shift.isOpen) {
        parts.push(this.$i('wf_open_shifts'));
      } else {
        parts.push(shift.staffName || this.$i('wf_role_unknown_person'));
      }
      const paid = formatMinutes(shift.paidMinutes);
      if (paid) { parts.push(this.$i('wf_paid_time', { time: paid })); }
      if (shift.crossesMidnight) { parts.push(this.$i('wf_overnight')); }
      if (shift.note) { parts.push(shift.note); }
      if (shift.isConflicting) { parts.push(this.$i('wf_conflict_shift')); }
      if (shift.hasExternalClash) { parts.push(this.$i('wf_external_clash')); }
      return parts.join(' · ');
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
.wf-roles__scroll { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
.wf-roles__table { width: 100%; border-collapse: collapse; min-width: 960px; }
.wf-roles__table--unresolved tbody { opacity: 0.72; }

.wf-roles__head { text-align: left; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: bottom; font-weight: 600; }
.wf-roles__head--role { min-width: 200px; }
.wf-roles__head--day { min-width: 120px; }
.wf-roles__head--num { text-align: right; white-space: nowrap; }
.wf-roles__day-name { display: block; color: #292c34; font-size: 0.82rem; text-transform: capitalize; }
.wf-roles__day-date { display: block; color: #64748b; font-size: 0.74rem; text-transform: none; }
.wf-roles__day-count { display: block; margin-top: 4px; color: #159f63; font-size: 0.7rem; text-transform: none; letter-spacing: 0; }
.wf-roles__day-count.is-unknown { color: #94a3b8; }

.wf-roles__row { border-bottom: 1px solid #f1f5f9; }
.wf-roles__row.is-conflict { background: rgba(239, 68, 68, 0.06); }
.wf-roles__row--norole { background: #f8f9fa; }
.wf-roles__row--empty td { padding: 22px 12px; color: #94a3b8; text-align: center; }

/* Kept as a real table cell — `display: flex` on a `th` drops it out of the table layout and the
   seven day columns stop lining up with the header. The row header lays itself out inline instead. */
.wf-roles__role { text-align: left; padding: 10px 12px; vertical-align: top; font-weight: 500; }
.wf-roles__swatch { display: inline-block; vertical-align: top; width: 10px; height: 10px; margin: 4px 8px 0 0; border-radius: 3px; background: #cbd5e0; }
.wf-roles__swatch--none { background: transparent; border: 1px dashed #cbd5e0; }
.wf-roles__role-text { display: inline-block; vertical-align: top; max-width: calc(100% - 20px); }
.wf-roles__role-name { display: block; color: #292c34; font-size: 0.92rem; font-weight: 600; }
.wf-roles__role-name.is-unknown { color: #94a3b8; font-style: italic; font-weight: 500; }
.wf-roles__role-meta { display: block; color: #94a3b8; font-size: 0.74rem; font-weight: 400; }
.wf-roles__role-flag { display: inline-block; margin-top: 3px; padding: 1px 6px; border-radius: 6px; background: #fef3c7; color: #92400e; font-size: 0.68rem; font-weight: 600; }

.wf-roles__cell { padding: 8px; vertical-align: top; border-left: 1px solid #f1f5f9; }
.wf-roles__cell.is-external-clash { background: #fffbeb; }
.wf-roles__cell.is-conflict { background: rgba(239, 68, 68, 0.1); }

.wf-roles__shift { display: block; margin-bottom: 4px; padding: 5px 8px; border-radius: 6px; background: rgba(27, 183, 118, 0.12); border-left: 3px solid #1bb776; }
.wf-roles__shift.is-open { background: #fff; border: 1px dashed #cbd5e0; border-left: 3px dashed #94a3b8; }
.wf-roles__shift.is-external-clash { border-left-color: #d97706; }
.wf-roles__shift.is-conflict { background: rgba(239, 68, 68, 0.14); border-left-color: #ef4444; }
.wf-roles__shift-time { display: block; color: #292c34; font-size: 0.82rem; font-weight: 600; }
.wf-roles__shift-who { display: block; color: #64748b; font-size: 0.72rem; }

.wf-roles__num { text-align: right; padding: 10px 12px; color: #292c34; font-size: 0.86rem; white-space: nowrap; border-left: 1px solid #f1f5f9; }

.wf-roles__band { background: #f8f9fa; border-top: 2px solid #e2e8f0; }
.wf-roles__band th { color: #292c34; font-weight: 700; font-size: 0.86rem; }
.wf-roles__band .wf-roles__num { font-weight: 700; }
.wf-roles__band-note { padding: 10px 12px; color: #94a3b8; font-size: 0.76rem; }

.wf-roles__caveat { margin: 10px 2px 0; color: #94a3b8; font-size: 0.78rem; }
</style>

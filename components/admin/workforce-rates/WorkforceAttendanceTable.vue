<template>
  <section class="wfrt-att">
    <header class="wfrt-att__head">
      <div>
        <h2 class="wfrt-att__title">
          {{ $i('wfrt_att_title') }}
        </h2>
        <p class="wfrt-att__range">
          {{ rangeLabel || dash }}
        </p>
      </div>
      <div class="wfrt-att__nav">
        <button class="wfrt-att__btn" :disabled="busy" @click="$emit('step', -1)">
          {{ $i('wfrt_att_prev') }}
        </button>
        <button class="wfrt-att__btn" :disabled="busy" @click="$emit('step', 0)">
          {{ $i('wfrt_att_this_week') }}
        </button>
        <button class="wfrt-att__btn" :disabled="busy" @click="$emit('step', 1)">
          {{ $i('wfrt_att_next') }}
        </button>
      </div>
    </header>

    <!-- The endpoint's own scope, stated up front. Planned minutes come from PUBLISHED assignments
         only, so a week left in draft contributes nothing to the planned column and every hour
         clocked against it reads as unplanned. -->
    <p class="wfrt-att__law">
      {{ $i('wfrt_att_published_only') }}
    </p>

    <p v-if="isUnknown" class="wfrt-att__unknown">
      {{ $i('wfrt_att_unknown') }}
    </p>

    <p v-else-if="isEmpty" class="wfrt-att__empty">
      {{ $i('wfrt_att_empty') }}
    </p>

    <template v-else>
      <p v-if="attendance.missingPunchCount > 0" class="wfrt-att__flagged">
        {{ $i('wfrt_att_missing_punches', { count: attendance.missingPunchCount }) }}
      </p>

      <table class="wfrt-att__table">
        <thead>
          <tr>
            <th>{{ $i('wfrt_att_col_person') }}</th>
            <th>{{ $i('wfrt_att_col_day') }}</th>
            <th class="wfrt-att__num">
              {{ $i('wfrt_att_col_planned') }}
            </th>
            <th class="wfrt-att__num">
              {{ $i('wfrt_att_col_actual') }}
            </th>
            <th class="wfrt-att__num">
              {{ $i('wfrt_att_col_variance') }}
            </th>
            <th>{{ $i('wfrt_att_col_flags') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in attendance.rows" :key="row.staffMemberId + '|' + row.businessDate">
            <!-- A row whose engagement could not be named shows a dash, never the raw id: an id
                 rendered where a name belongs looks like a person nobody recognises. -->
            <td>{{ row.displayName || dash }}</td>
            <td>{{ row.businessDate || dash }}</td>
            <td class="wfrt-att__num">
              {{ minutes(row.plannedMinutes) }}
            </td>
            <td class="wfrt-att__num">
              {{ minutes(row.actualMinutes) }}
            </td>
            <td class="wfrt-att__num">
              {{ minutes(row.varianceMinutes) }}
            </td>
            <td class="wfrt-att__flags">
              <span v-if="row.openSessionCount > 0" class="wfrt-att__flag wfrt-att__flag--open">
                {{ $i('wfrt_att_flag_open', { count: row.openSessionCount }) }}
              </span>
              <span v-else-if="row.missingPunch" class="wfrt-att__flag wfrt-att__flag--missing">
                {{ $i('wfrt_att_flag_missing') }}
              </span>
              <span v-if="row.adjustmentCount > 0" class="wfrt-att__flag wfrt-att__flag--adjusted">
                {{ $i('wfrt_att_flag_adjusted', { approved: row.approvedAdjustmentCount, total: row.adjustmentCount }) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- The honest end of this surface. A correction is `POST /attendance/adjustments`, which
           names a CLOCK SESSION — and no manager-reachable read on the whole API returns a clock
           session id, so the correction cannot be addressed from here. The counts above come from
           the attendance read itself. Offering a button that could only ever fail would be worse
           than saying this. -->
      <p v-if="attendance.adjustedRowCount > 0 || attendance.missingPunchCount > 0" class="wfrt-att__gap">
        {{ $i('wfrt_att_no_correction_ui') }}
      </p>
    </template>
  </section>
</template>

<script>
import { ATTENDANCE_EMPTY, ATTENDANCE_UNKNOWN, formatMinutes } from '~/utils/workforce-rates/attendance-view';

// Planned against clocked, per person per venue business day — the read behind the week grid's
// "Mangler sats", shown as the numbers rather than as a colour.
export default {
  name: 'WorkforceAttendanceTable',
  props: {
    attendance: {
      type: Object,
      required: true
    },
    /** The window on screen, already rendered by the page in the STORE's zone. */
    rangeLabel: {
      type: String,
      default: null
    },
    busy: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return { dash: '—' };
  },
  computed: {
    isUnknown () {
      return this.attendance.state === ATTENDANCE_UNKNOWN;
    },
    isEmpty () {
      return this.attendance.state === ATTENDANCE_EMPTY;
    }
  },
  methods: {
    minutes (value) {
      return formatMinutes(value, this.dash);
    }
  }
};
</script>

<style scoped>
.wfrt-att { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
.wfrt-att__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 10px; }
.wfrt-att__title { font-size: 1.1rem; font-weight: 600; color: #292c34; margin: 0 0 4px; }
.wfrt-att__range { font-size: 0.85rem; color: #64748b; margin: 0; }
.wfrt-att__nav { display: flex; gap: 8px; }
.wfrt-att__btn { background: #fff; border: 2px solid #e2e8f0; border-radius: 8px; padding: 8px 14px; font-size: 0.85rem; color: #292c34; cursor: pointer; }
.wfrt-att__btn:disabled { opacity: 0.5; cursor: not-allowed; }

.wfrt-att__law { font-size: 0.82rem; color: #64748b; background: #f8f9fa; border-radius: 8px; padding: 10px; margin: 0 0 14px; }
.wfrt-att__unknown { font-size: 0.9rem; color: #92400e; background: #fffbeb; border-radius: 8px; padding: 12px; margin: 0; }
.wfrt-att__empty { font-size: 0.9rem; color: #64748b; background: #f8f9fa; border-radius: 8px; padding: 12px; margin: 0; }
.wfrt-att__flagged { font-size: 0.85rem; color: #92400e; margin: 0 0 10px; }

.wfrt-att__table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
.wfrt-att__table th { text-align: left; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.3px; color: #64748b; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
.wfrt-att__table td { padding: 8px; border-bottom: 1px solid #f1f5f9; color: #292c34; }
.wfrt-att__num { text-align: right; font-variant-numeric: tabular-nums; }
.wfrt-att__flags { display: flex; gap: 6px; flex-wrap: wrap; }
.wfrt-att__flag { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 600; }
.wfrt-att__flag--open { background: #fef2f2; color: #b91c1c; }
.wfrt-att__flag--missing { background: #fffbeb; color: #92400e; }
.wfrt-att__flag--adjusted { background: #eff6ff; color: #1d4ed8; }

.wfrt-att__gap { font-size: 0.82rem; color: #64748b; margin: 12px 0 0; font-style: italic; }
</style>

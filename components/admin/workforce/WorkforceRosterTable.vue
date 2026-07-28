<template>
  <div class="wfr-table">
    <!-- The three answers, kept apart. A read that did not answer says so; a store that really has
         nobody says something else entirely. Collapsing them would invite a manager to add someone
         who is already on the roster, or to conclude the venue is empty because a token expired. -->
    <div v-if="isUnknown" class="wfr-table__state wfr-table__state--unknown">
      {{ $i('wfr_roster_unknown') }}
    </div>

    <div v-else-if="isEmpty" class="wfr-table__state wfr-table__state--empty">
      {{ $i('wfr_roster_empty') }}
    </div>

    <table v-else class="wfr-table__grid">
      <thead>
        <tr>
          <th>{{ $i('wfr_col_person') }}</th>
          <th>{{ $i('wfr_col_capabilities') }}</th>
          <th>{{ $i('wfr_col_employment_number') }}</th>
          <th>{{ $i('wfr_col_status') }}</th>
          <th>{{ $i('wfr_col_from') }}</th>
          <th>{{ $i('wfr_col_to') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in roster.rows"
          :key="row.staffMemberId"
          class="wfr-table__row"
          :class="{ 'is-ended': !row.isActive, 'is-selected': row.staffMemberId === selectedId }"
          @click="$emit('select', row)"
        >
          <td class="wfr-table__person">
            <span class="wfr-table__name">{{ orDash(row.displayName) }}</span>
            <span class="wfr-table__person-state" :class="'is-' + String(row.personState || 'unknown').toLowerCase()">
              {{ personStateLabel(row.personState) }}
            </span>
            <!-- One human, several engagements. Same-store only: how many engagements this person
                 holds at OTHER stores is not knowable here and is never implied. -->
            <span v-if="row.engagementCount > 1" class="wfr-table__multi">
              {{ $i('wfr_multi_engagement', { count: row.engagementCount }) }}
            </span>
          </td>

          <td class="wfr-table__caps">
            <!-- CAPABILITIES, not roles. These are the only things that authorise anything in this
                 module; the job roles below the fold grant nothing at all. -->
            <span v-if="row.capabilities === null" class="wfr-table__cap wfr-table__cap--unknown">
              {{ $i('wfr_cap_unknown') }}
            </span>
            <span v-else-if="!row.capabilities.length" class="wfr-table__cap wfr-table__cap--none">
              {{ $i('wfr_cap_none') }}
            </span>
            <span
              v-for="capability in (row.capabilities || [])"
              :key="capability"
              class="wfr-table__cap"
            >{{ capabilityLabel(capability) }}</span>
          </td>

          <td>{{ orDash(row.employmentNumber) }}</td>

          <td>
            <span class="wfr-table__badge" :class="row.isActive ? 'is-active' : 'is-ended'">
              {{ row.isActive ? $i('wfr_status_active') : $i('wfr_status_ended') }}
            </span>
          </td>

          <td>{{ orDash(date(row.activeFromUtc)) }}</td>
          <td>{{ orDash(date(row.activeToUtc)) }}</td>
        </tr>
      </tbody>
    </table>

    <!-- Counted, and worth saying out loud: the module's only route back into a store is an active
         engagement that already holds WorkforceManager. There is no administrative override. -->
    <p v-if="isCounted && roster.activeManagerCount === 0" class="wfr-table__warn">
      {{ $i('wfr_no_manager_left') }}
    </p>
  </div>
</template>

<script>
import { ROSTER_UNKNOWN, ROSTER_EMPTY, ROSTER_COUNTED, formatDate, orDash } from '~/utils/workforce/roster';

// The roster, one row per ENGAGEMENT. Two rows can be the same human: a person re-engaged after an
// earlier engagement ended, or engaged under two legal employers. The table shows the engagement
// because that is what carries the capabilities, the dates and the store — the person is the thing
// the rows have in common, not the thing being listed.
export default {
  name: 'WorkforceRosterTable',
  props: {
    roster: { type: Object, required: true },
    timeZoneId: { type: String, default: null },
    locale: { type: String, default: 'no' },
    selectedId: { type: String, default: null }
  },
  computed: {
    isUnknown () { return this.roster.state === ROSTER_UNKNOWN; },
    isEmpty () { return this.roster.state === ROSTER_EMPTY; },
    isCounted () { return this.roster.state === ROSTER_COUNTED; }
  },
  methods: {
    orDash,
    date (instant) {
      return formatDate(instant, this.timeZoneId, this.locale);
    },
    capabilityLabel (capability) {
      return this.$i('wfr_cap_' + capability.replace('Workforce', '').toLowerCase());
    },
    personStateLabel (state) {
      return state ? this.$i('wfr_person_' + String(state).toLowerCase()) : this.$i('wfr_person_unknown');
    }
  }
};
</script>

<style scoped>
.wfr-table__state { padding: 24px 20px; border-radius: 12px; text-align: center; font-size: 0.9rem; }
/* An unanswered read and an empty store must not look alike either — the dashed, muted panel is the
   module's "unknown" treatment, the solid one is a real answer. */
.wfr-table__state--unknown { background: #f8f9fa; border: 1px dashed #cbd5e0; color: #64748b; }
.wfr-table__state--empty { background: #fff; border: 1px solid #e2e8f0; color: #64748b; }

.wfr-table__grid { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05); }
.wfr-table__grid th { text-align: left; padding: 10px 14px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; background: #f8f9fa; border-bottom: 1px solid #e2e8f0; }
.wfr-table__grid td { padding: 12px 14px; font-size: 0.86rem; color: #292c34; border-bottom: 1px solid #f1f5f9; vertical-align: top; }

.wfr-table__row { cursor: pointer; }
.wfr-table__row:hover { background: #f8f9fa; }
.wfr-table__row.is-selected { background: rgba(27, 183, 118, 0.08); }
.wfr-table__row.is-ended .wfr-table__name { color: #94a3b8; }

.wfr-table__person { display: flex; flex-direction: column; gap: 3px; }
.wfr-table__name { font-weight: 600; }
.wfr-table__person-state { font-size: 0.72rem; color: #94a3b8; }
.wfr-table__person-state.is-archived { color: #92400e; }
.wfr-table__multi { font-size: 0.72rem; color: #64748b; }

.wfr-table__caps { display: flex; flex-wrap: wrap; gap: 4px; }
.wfr-table__cap { display: inline-block; padding: 2px 8px; border-radius: 6px; background: #f1f5f9; color: #64748b; font-size: 0.72rem; font-weight: 600; }
.wfr-table__cap--none { background: #fff; border: 1px solid #e2e8f0; color: #94a3b8; }
.wfr-table__cap--unknown { background: #fff; border: 1px dashed #cbd5e0; color: #94a3b8; }

.wfr-table__badge { padding: 3px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
.wfr-table__badge.is-active { background: rgba(27, 183, 118, 0.14); color: #159f63; }
.wfr-table__badge.is-ended { background: #f1f5f9; color: #64748b; }

.wfr-table__warn { margin: 12px 0 0; padding: 10px 16px; border-radius: 10px; background: rgba(239, 68, 68, 0.1); color: #b91c1c; font-size: 0.84rem; }
</style>

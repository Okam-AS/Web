<template>
  <div class="ev-pipeline">
    <!-- The four ways a listing can carry no rows are four different sentences. Only the last of them
         is "this venue has no enquiries", and it is the only one reached with an array in hand. -->
    <p v-if="listing.state === READ_UNKNOWN" class="ev-pipeline__notice ev-pipeline__notice--warn">
      {{ $i('ev_pipeline_unknown') }}<span v-if="listing.detail"> {{ listing.detail }}</span>
    </p>
    <p v-else-if="listing.state === READ_DISABLED" class="ev-pipeline__notice">
      {{ $i('ev_pipeline_disabled') }}
    </p>
    <p v-else-if="listing.state === READ_FORBIDDEN" class="ev-pipeline__notice ev-pipeline__notice--warn">
      {{ $i('ev_pipeline_forbidden') }}
    </p>
    <p v-else-if="!listing.rows.length" class="ev-pipeline__notice">
      {{ $i('ev_pipeline_empty') }}
    </p>

    <table v-else class="ev-pipeline__table">
      <thead>
        <tr>
          <th>{{ $i('ev_col_date') }}</th>
          <th>{{ $i('ev_col_title') }}</th>
          <th>{{ $i('ev_col_status') }}</th>
          <th class="ev-pipeline__num">
            {{ $i('ev_col_guests') }}
          </th>
          <th>{{ $i('ev_col_contact') }}</th>
          <th class="ev-pipeline__num">
            {{ $i('ev_col_version') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in listing.rows"
          :key="row.id"
          class="ev-pipeline__row"
          :class="{ 'ev-pipeline__row--selected': row.id === selectedId }"
          @click="$emit('select', row.id)"
        >
          <td class="ev-pipeline__date">
            {{ dayLabel(row.eventDate) }}
          </td>
          <td>{{ row.title || unknownMark }}</td>
          <td>
            <span class="ev-pipeline__status" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
          </td>
          <td class="ev-pipeline__num">
            {{ count(row.guestCountPlanned) }}
          </td>
          <td>{{ row.contactName || unknownMark }}</td>
          <td class="ev-pipeline__num">
            {{ count(row.acceptedProposalVersionNo) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import {
  READ_UNKNOWN,
  READ_DISABLED,
  READ_FORBIDDEN,
  READ_ANSWERED,
  STATUS_REPORTED,
  STATUS_UNRECOGNISED,
  STATUS_ABSENT,
  eventDateKey,
  readEventStatus
} from '~/utils/events/journey';

// The pipeline list. Purely presentational: it renders the `readListing` result the page produced and
// owns no fetching, so the "unknown is not empty" rule it draws is testable without a network.
//
// It shows no money, because `EventsEventListItemView` carries none — no total, no deposit, no
// balance. A pipeline value column would have to be assembled from the detail reads of every row, and
// that would be this surface computing money.
export default {
  name: 'EventsPipeline',
  props: {
    // The `readListing` shape: `{ state, rows, code, detail }`. `rows` is null unless the read answered.
    listing: {
      type: Object,
      required: true
    },
    // BCP-47 tag for the date labels; the page passes the admin locale.
    locale: {
      type: String,
      default: 'no'
    },
    selectedId: {
      type: Number,
      default: null
    }
  },
  data () {
    return {
      // One mark for every unknown in the table, so "we do not know" never looks like a value.
      unknownMark: '—',
      READ_UNKNOWN,
      READ_DISABLED,
      READ_FORBIDDEN,
      READ_ANSWERED
    };
  },
  methods: {
    count (value) {
      return value === null || value === undefined ? this.unknownMark : String(value);
    },

    /**
     * The event's day, formatted from its day KEY.
     *
     * `timeZone: 'UTC'` against a `Date.UTC` construction is the only pairing that cannot move a civil
     * date: the key is sliced out of the wire string, so no zone was ever applied to it, and none is
     * applied here either. The same pairing the workforce grid uses for its day columns.
     */
    dayLabel (value) {
      const key = eventDateKey(value);
      if (!key) { return this.unknownMark; }
      const parts = key.split('-');
      const date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
      if (isNaN(date.getTime())) { return this.unknownMark; }
      return new Intl.DateTimeFormat(this.locale, {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
      }).format(date);
    },

    // A status this surface does not know is shown VERBATIM rather than mapped to the nearest phase —
    // a new `EventStatus` on the server must read as an unknown word, not as a wrong one.
    statusLabel (status) {
      const read = readEventStatus(status);
      if (read.state === STATUS_ABSENT) { return this.$i('ev_status_absent'); }
      if (read.state === STATUS_UNRECOGNISED) { return this.$i('ev_status_unrecognised', { status: read.status }); }
      return this.$i('ev_status_' + read.status);
    },
    statusClass (status) {
      const read = readEventStatus(status);
      if (read.state !== STATUS_REPORTED) { return 'ev-pipeline__status--unknown'; }
      if (read.isOffRamp) { return 'ev-pipeline__status--offramp'; }
      return null;
    }
  }
};
</script>

<style scoped>
.ev-pipeline__notice { margin: 0; padding: 16px; background: #f8f9fa; border-radius: 8px; color: #64748b; font-size: 0.9em; }
.ev-pipeline__notice--warn { background: #fff7ed; color: #92400e; }
.ev-pipeline__table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
.ev-pipeline__table th { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.3px; }
.ev-pipeline__table td { padding: 10px; border-bottom: 1px solid #f1f5f9; color: #292c34; }
.ev-pipeline__num { text-align: right; }
.ev-pipeline__row { cursor: pointer; }
.ev-pipeline__row:hover { background: #f8f9fa; }
.ev-pipeline__row--selected { background: #ecfdf5; }
.ev-pipeline__date { white-space: nowrap; }
.ev-pipeline__status { display: inline-block; padding: 2px 8px; border-radius: 6px; background: #f1f5f9; font-size: 0.85em; }
.ev-pipeline__status--offramp { background: #fee2e2; color: #991b1b; }
.ev-pipeline__status--unknown { background: #fef3c7; color: #92400e; }
</style>

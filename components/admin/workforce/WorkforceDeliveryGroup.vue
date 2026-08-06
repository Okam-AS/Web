<template>
  <div class="wf-dgroup" :class="'wf-dgroup--' + tone" :data-testid="testid">
    <div class="wf-dgroup__head">
      <h3 class="wf-dgroup__title">
        {{ title }}
      </h3>
      <!-- The count belongs to THIS group and nowhere else. There is no panel-wide total on
           purpose; see WorkforceDeliveryPanel. -->
      <span class="wf-dgroup__count" :data-testid="testid + '-count'">{{ rows.length }}</span>
    </div>
    <p class="wf-dgroup__body">
      {{ body }}
    </p>

    <!-- A stacked list rather than a table. A table here would need its own horizontal scroll on a
         laptop, and a table that overflows its track lets the neighbouring column win the hit test
         on the controls beside it — found on a sibling surface at 1280 today. Rows wrap instead. -->
    <ul class="wf-dgroup__rows">
      <li v-for="row in rows" :key="row.id" class="wf-dgroup__row" data-testid="wf-delivery-row">
        <div class="wf-dgroup__who">
          <span class="wf-dgroup__name" data-testid="wf-delivery-row-name">{{ nameOf(row) }}</span>
          <span v-if="row.channel" class="wf-dgroup__chip">{{ row.channel }}</span>
        </div>

        <!-- WHY. Never provider prose: the backend redacts this to a code precisely so a Notification
             Hubs message (which quotes the tag expression, and on an auth failure the SAS credential)
             cannot reach this screen. An unexplained code is shown verbatim and SAID to be
             unexplained rather than guessed at. -->
        <p class="wf-dgroup__why" data-testid="wf-delivery-row-why">
          {{ reasonOf(row) }}
        </p>

        <div class="wf-dgroup__facts">
          <span v-if="row.attemptCount !== null && row.maxAttempts !== null">
            {{ $i('wf_delivery_attempts', { count: row.attemptCount, max: row.maxAttempts }) }}
          </span>
          <span v-if="row.terminal && row.deadLetteredAtUtc">
            {{ $i('wf_delivery_gaveup_at', { time: stamp(row.deadLetteredAtUtc) }) }}
          </span>
          <span v-else-if="!row.terminal && row.nextAttemptUtc">
            {{ $i('wf_delivery_next_attempt', { time: stamp(row.nextAttemptUtc) }) }}
          </span>
          <!-- Presence, never the address itself. `[none]` is the backend saying it holds no
               delivery address at all for this recipient, which is a different problem from a
               send that failed and is worth saying out loud. -->
          <span v-if="isAddressless(row)">{{ $i('wf_delivery_no_address') }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
/**
 * One tier's worth of undelivered notifications. Presentation only: the grouping and the tier
 * judgement were made in `~/utils/workforce/delivery-failures` before this component saw a row.
 */
export default {
  name: 'WorkforceDeliveryGroup',
  props: {
    title: { type: String, required: true },
    body: { type: String, required: true },
    /** `stop` (nobody will retry this), `warn` (still retrying), `wait` (nothing was attempted). */
    tone: { type: String, default: 'warn' },
    testid: { type: String, required: true },
    rows: { type: Array, required: true }
  },
  methods: {
    /**
     * The roster could not name this recipient. Says so, rather than printing "Unknown" — which
     * reads like a worker whose name is Unknown.
     */
    nameOf (row) {
      return row.staffLabel || this.$i('wf_delivery_unnamed');
    },

    reasonOf (row) {
      return row.reasonKey
        ? this.$i(row.reasonKey)
        : this.$i('wf_delivery_reason_unrecognised', { code: row.lastError || '—' });
    },

    isAddressless (row) {
      return String(row.targetLabel || '').toLowerCase() === '[none]';
    },

    /**
     * A UTC stamp in the reader's locale. The backend sends `DateTime` without a designator on this
     * model, so a bare parse would be read as LOCAL time and a next-attempt an hour away would print
     * as one an hour ago. `Z` is appended when nothing else says the zone.
     */
    stamp (value) {
      if (!value) { return ''; }
      const text = String(value);
      const utc = /[Zz]|[+-]\d{2}:?\d{2}$/.test(text) ? text : text + 'Z';
      const parsed = new Date(utc);
      if (isNaN(parsed.getTime())) { return text; }
      return parsed.toLocaleString();
    }
  }
};
</script>

<style lang="scss" scoped>
.wf-dgroup {
  margin-top: 16px;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #cbd5e0;
  background: #f8f9fa;

  // Tone carries the tier, and the three are visibly different. `wait` is deliberately NEUTRAL —
  // a store whose credential has not landed has not failed at anything, and colouring it like a
  // fault is the flattening this panel exists to avoid.
  &--stop { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.06); }
  &--warn { border-left-color: #92400e; background: rgba(146, 64, 14, 0.06); }
  &--wait { border-left-color: #94a3b8; background: #f8f9fa; }

  &__head {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__title {
    font-size: 0.95em;
    font-weight: 600;
    color: #292c34;
    margin: 0;
  }

  &__count {
    font-size: 0.8em;
    font-weight: 600;
    color: #292c34;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 2px 8px;
  }

  &__body {
    font-size: 0.85em;
    color: #64748b;
    margin: 6px 0 12px 0;
  }

  &__rows { list-style: none; margin: 0; padding: 0; }

  &__row {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px;

    & + & { margin-top: 8px; }
  }

  &__who {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__name { font-weight: 600; color: #292c34; font-size: 0.95em; }

  &__chip {
    font-size: 0.75em;
    color: #64748b;
    background: #f8f9fa;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 2px 8px;
  }

  &__why { font-size: 0.9em; color: #292c34; margin: 6px 0 0 0; }

  &__facts {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 6px;
    font-size: 0.8em;
    color: #64748b;
  }
}
</style>

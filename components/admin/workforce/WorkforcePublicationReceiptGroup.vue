<template>
  <div class="wf-recgroup" :class="'wf-recgroup--' + tone" :data-testid="testid">
    <div class="wf-recgroup__head">
      <h3 class="wf-recgroup__title">
        {{ title }}
      </h3>
      <!-- The count belongs to THIS bucket and is rendered inside it. There is no count anywhere on
           the panel that spans buckets, because no honest single number exists here. -->
      <span class="wf-recgroup__count" :data-testid="testid + '-count'">{{ rows.length }}</span>
    </div>

    <p class="wf-recgroup__body">
      {{ body }}
    </p>

    <ul class="wf-recgroup__rows">
      <li v-for="row in rows" :key="row.id" class="wf-recgroup__row" :data-testid="testid + '-row'">
        <span class="wf-recgroup__who">
          <!-- Null, never "Unknown": the backend joins a person to get this name, and a placeholder
               that looks like a name invites the reader to believe in a worker called Unknown. -->
          {{ row.staffLabel || $i('wf_pub_rec_unnamed') }}
        </span>

        <span class="wf-recgroup__facts">
          <span v-if="stamp(row)">{{ stamp(row) }}</span>

          <!-- A worker who had not claimed a login could not have confirmed from a screen. Without
               this, their empty row reads as somebody who ignored the plan. -->
          <span v-if="!row.claimed" class="wf-recgroup__flag" :data-testid="testid + '-unclaimed'">
            {{ $i('wf_pub_rec_unclaimed') }}
          </span>

          <!-- The send's own word, labelled as such and never promoted to a receipt. An unrecognised
               value is shown verbatim and marked, rather than defaulted into a state this build
               understands. -->
          <span v-if="row.deliveryState" class="wf-recgroup__send">
            {{ $i('wf_pub_rec_send') }}
            {{ row.deliveryStateKnown ? $i(sendKey(row.deliveryState)) : row.deliveryState }}
            <em v-if="!row.deliveryStateKnown">{{ $i('wf_pub_rec_send_unrecognised') }}</em>
          </span>
        </span>
      </li>
    </ul>
  </div>
</template>

<script>
import { parseApiInstant } from '~/utils/workforce/week-range';

const SEND_KEYS = {
  pending: 'wf_pub_rec_send_pending',
  delivered: 'wf_pub_rec_send_delivered',
  failed: 'wf_pub_rec_send_failed',
  manuallydelivered: 'wf_pub_rec_send_manual'
};

/**
 * One attestation bucket. Presentational only — the bucket a row belongs to was decided by
 * `~/utils/workforce/publication-receipts` and nothing here re-decides it.
 *
 * The timestamp shown is the one that PUT the row in this bucket, not whichever is newest: a
 * confirmed row shows its acknowledgement, an opened row shows when it was opened, a hand-delivered
 * row shows when the manager recorded it. Showing the wrong one would quietly restate the claim.
 */
export default {
  props: {
    tone: { type: String, required: true },
    testid: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    rows: { type: Array, required: true }
  },
  methods: {
    sendKey (state) {
      return SEND_KEYS[String(state || '').toLowerCase()] || 'wf_pub_rec_send_pending';
    },
    stamp (row) {
      // Strongest-first, matching `attestationOf` exactly, so the timestamp always explains the
      // bucket the row is in.
      const at = row.acknowledgedAtUtc || row.seenAtUtc || row.manuallyDeliveredAtUtc;
      const parsed = parseApiInstant(at);
      return parsed ? parsed.toLocaleString() : null;
    }
  }
};
</script>

<style lang="scss" scoped>
.wf-recgroup {
  margin-top: 16px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  padding: 14px 16px;

  &--good { background: #ecfdf5; border-color: #a7f3d0; }
  &--soft { background: #f8fafc; border-color: #e2e8f0; }
  &--stop { background: #fef2f2; border-color: #fecaca; }

  &__head {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__title {
    font-size: 0.98em;
    font-weight: 700;
    color: #292c34;
    margin: 0;
  }

  &__count {
    background: #fff;
    border: 1px solid #cbd5e0;
    border-radius: 999px;
    padding: 1px 10px;
    font-size: 0.78rem;
    font-weight: 700;
    color: #292c34;
  }

  &__body {
    color: #64748b;
    font-size: 0.86em;
    margin: 6px 0 0 0;
  }

  &__rows {
    list-style: none;
    margin: 10px 0 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__row {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 12px;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__who {
    font-weight: 600;
    color: #292c34;
    font-size: 0.9em;
  }

  &__facts {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    color: #64748b;
    font-size: 0.82em;
    align-items: baseline;
  }

  &__flag {
    color: #9a3412;
    font-weight: 600;
  }

  &__send em { font-style: normal; color: #9a3412; font-weight: 600; }
}
</style>

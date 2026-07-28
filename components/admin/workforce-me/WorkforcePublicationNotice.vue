<template>
  <section v-if="items && items.length" class="wfme-pub">
    <h2 class="wfme-pub__title">
      {{ items.length === 1 ? $i('wfme_pub_title_one') : $i('wfme_pub_title_many', { count: items.length }) }}
    </h2>
    <p class="wfme-pub__lede">
      {{ $i('wfme_pub_lede') }}
    </p>

    <ul class="wfme-pub__list">
      <li v-for="item in items" :key="item.inboxItemId" class="wfme-pub__item">
        <div class="wfme-pub__when">
          <span class="wfme-pub__dot" aria-hidden="true" />
          {{ $i('wfme_pub_published', { time: publishedLabel(item) }) }}
        </div>

        <p v-if="receipts[item.schedulePublicationId]" class="wfme-pub__receipt">
          {{ receiptLabel(receipts[item.schedulePublicationId]) }}
        </p>

        <div class="wfme-pub__actions">
          <button
            class="wfme-pub__btn wfme-pub__btn--ghost"
            :disabled="busyId === item.inboxItemId"
            @click="$emit('mark-read', item)"
          >
            {{ $i('wfme_pub_mark_read') }}
          </button>
          <button
            v-if="item.schedulePublicationId"
            class="wfme-pub__btn"
            :disabled="busyId === item.inboxItemId"
            @click="$emit('acknowledge', item)"
          >
            {{ $i('wfme_pub_acknowledge') }}
          </button>
        </div>
      </li>
    </ul>

    <!-- The receipt is informational, never legal acceptance — the backend is explicit about that and
         the worker is told the same thing rather than being asked to "approve" a roster. -->
    <p class="wfme-pub__disclaimer">
      {{ $i('wfme_pub_disclaimer') }}
    </p>
  </section>
</template>

<script>
import { parseApiInstant } from '~/utils/workforce/week-range';

// Unread schedule publications from the worker's own inbox (#34), with the read marker (#35) and the
// acknowledgement receipt (#44).
//
// A publication records, per recipient, whether it was read. That is a real asset and it is surfaced
// rather than hidden. What is NOT surfaced is a persistent "acknowledged" state: the inbox row
// carries only `isRead` (the recipient's seenAtUtc), and acknowledging implies seen while marking
// read does not imply acknowledged. So this component may say "lest" from server state, but may only
// say "bekreftet" about a receipt it was handed in this session.
export default {
  name: 'WorkforcePublicationNotice',
  props: {
    // Unread publication items, or null when the inbox has not loaded. Null renders nothing — the
    // page carries the unknown-inbox message itself.
    items: { type: Array, default: null },
    // Acknowledgement receipts returned during this session, keyed by publication id.
    receipts: { type: Object, default: () => ({}) },
    busyId: { type: String, default: null },
    locale: { type: String, default: 'nb-NO' }
  },
  methods: {
    publishedLabel (item) {
      return this.formatInstant(item.createdAtUtc);
    },
    receiptLabel (receipt) {
      const time = this.formatInstant(receipt.occurredAtUtc);
      return receipt.alreadyAcknowledged
        ? this.$i('wfme_pub_receipt_already', { time })
        : this.$i('wfme_pub_receipt_new', { time });
    },
    // The inbox carries no store zone, so these instants are RENDERED in the reader's own zone. That
    // is honest for "when did this arrive" — unlike a shift time, it is not a rostered wall clock.
    //
    // Rendering local and PARSING local are different things. `createdAtUtc` and `occurredAtUtc` are
    // column-loaded, so they arrive bare (`Unspecified` + Newtonsoft `RoundtripKind`), and
    // `new Date(bare)` reads them as local — which would print the UTC wall clock while calling it
    // the reader's local time, off by the reader's own offset. Parse as UTC, then render local.
    formatInstant (iso) {
      if (!iso) { return ''; }
      const date = parseApiInstant(iso);
      if (!date) { return ''; }
      return new Intl.DateTimeFormat(this.locale, {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false
      }).format(date);
    }
  }
};
</script>

<style scoped>
.wfme-pub {
  background: #fff;
  border: 1px solid #1bb776;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.wfme-pub__title {
  margin: 0 0 4px;
  font-size: 1.1em;
  font-weight: 600;
  color: #292c34;
}

.wfme-pub__lede {
  margin: 0 0 12px;
  font-size: 0.88em;
  color: #64748b;
}

.wfme-pub__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.wfme-pub__item {
  border-top: 1px solid #e2e8f0;
  padding-top: 12px;
  margin-top: 12px;
}

.wfme-pub__item:first-child {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}

.wfme-pub__when {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  color: #292c34;
}

.wfme-pub__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1bb776;
  flex-shrink: 0;
}

.wfme-pub__receipt {
  margin: 6px 0 0;
  font-size: 0.82em;
  color: #159f63;
}

.wfme-pub__actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.wfme-pub__btn {
  min-height: 44px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  background: #1bb776;
  color: #fff;
  font-weight: 600;
  font-size: 0.88em;
  cursor: pointer;
  transition: background 0.2s ease;
}

.wfme-pub__btn:hover:not(:disabled) {
  background: #159f63;
}

.wfme-pub__btn--ghost {
  background: #fff;
  color: #292c34;
  border: 1px solid #cbd5e0;
}

.wfme-pub__btn--ghost:hover:not(:disabled) {
  background: #f8f9fa;
}

.wfme-pub__btn:disabled {
  background: #cbd5e0;
  color: #fff;
  border-color: #cbd5e0;
  cursor: not-allowed;
}

.wfme-pub__disclaimer {
  margin: 12px 0 0;
  font-size: 0.78em;
  color: #94a3b8;
}

@media (max-width: 768px) {
  .wfme-pub__actions {
    flex-direction: column;
  }

  .wfme-pub__btn {
    width: 100%;
  }
}
</style>

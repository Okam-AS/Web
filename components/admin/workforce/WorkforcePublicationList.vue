<template>
  <section class="wf-publist" data-testid="wf-publist">
    <div class="wf-publist__header">
      <h2 class="wf-publist__title">
        {{ $i('wf_pub_list_title') }}
      </h2>
      <button
        class="wf-publist__refresh"
        type="button"
        data-testid="wf-publist-refresh"
        :disabled="loading"
        @click="$emit('reload')"
      >
        {{ loading ? $i('wf_pub_loading') : $i('wf_pub_refresh') }}
      </button>
    </div>

    <p class="wf-publist__intro">
      {{ $i('wf_pub_list_intro') }}
    </p>

    <!-- THE READ COULD NOT RUN. Deliberately NOT the empty state: a store whose history failed to
         load has not been shown that it never published, and must never read as if it had. -->
    <div v-if="!history.known" class="wf-publist__state wf-publist__state--unknown" data-testid="wf-publist-unknown">
      <strong>{{ $i('wf_pub_unknown_title') }}</strong>
      <span>{{ $i('wf_pub_unknown_body') }}</span>
    </div>

    <!-- ANSWERED, AND THIS STORE HAS NEVER PUBLISHED. Only reachable when the read actually ran. -->
    <div v-else-if="history.empty" class="wf-publist__state wf-publist__state--empty" data-testid="wf-publist-empty">
      <strong>{{ $i('wf_pub_empty_title') }}</strong>
      <span>{{ $i('wf_pub_empty_body') }}</span>
    </div>

    <ul v-else class="wf-publist__rows" data-testid="wf-publist-rows">
      <li v-for="row in history.rows" :key="row.id" class="wf-publist__row">
        <!-- A button, not a div with a click handler: this is the only control that opens the
             recipient roster, and it has to be reachable by keyboard and nameable by a test. -->
        <button
          type="button"
          class="wf-publist__pick"
          :class="{ 'wf-publist__pick--on': row.id === selectedId }"
          :data-testid="'wf-publist-pick-' + row.id"
          :aria-pressed="String(row.id === selectedId)"
          @click="$emit('select', row.id)"
        >
          <span class="wf-publist__line">
            <span class="wf-publist__range">{{ rangeLabel(row) }}</span>
            <!-- SUPERSEDED IS NOT A STYLING CHOICE. A later publication replaced this one, so its
                 acknowledgements are confirmations of a plan that no longer stands. Saying so is the
                 difference between evidence and a screenshot of an old week. -->
            <span v-if="row.superseded" class="wf-publist__tag wf-publist__tag--old" data-testid="wf-publist-superseded">
              {{ $i('wf_pub_superseded') }}
            </span>
            <span v-else class="wf-publist__tag wf-publist__tag--now">
              {{ $i('wf_pub_current') }}
            </span>
          </span>

          <span class="wf-publist__meta">
            <span>{{ $i('wf_pub_number') }} {{ row.number === null ? $i('wf_pub_unknown_value') : row.number }}</span>
            <span>{{ publishedLabel(row) }}</span>
            <!-- C4: the publish transaction froze who caused it, and that name is shown rather than
                 folded into a generic "system". A publication nobody is named for is not evidence,
                 and this says which of the two it is. -->
            <span :data-testid="'wf-publist-actor-' + row.id">
              {{ row.publishedBy ? $i('wf_pub_by') + ' ' + row.publishedBy : $i('wf_pub_by_nobody') }}
            </span>
            <span :data-testid="'wf-publist-addressed-' + row.id">
              {{ addressedLabel(row) }}
            </span>
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>

<script>
import { parseApiInstant } from '~/utils/workforce/week-range';

/**
 * THE STORE'S PUBLICATION HISTORY, AS A LIST YOU CAN OPEN.
 *
 * It holds no judgement: `~/utils/workforce/publication-receipts` decides which publications have
 * been superseded and which fields the history read is allowed to speak for, and this renders that
 * answer. Two things it must never do, both of which the reader already refuses and this must not
 * quietly reintroduce: print `noticeLeadDays` (the history projection does not set it, so its zero is
 * a default) and print a cost (null by design on this endpoint).
 *
 * The row ORDER is the server's and is never re-sorted here — published-desc, revision-desc,
 * number-desc, which is what puts a same-tick republish ahead of the rows it supersedes.
 */
export default {
  props: {
    // The shape `listPublications` returns: `{ known, rows, empty }`.
    history: { type: Object, required: true },
    selectedId: { type: String, default: null },
    loading: { type: Boolean, default: false }
  },
  methods: {
    instant (value) {
      const parsed = parseApiInstant(value);
      return parsed ? parsed.toLocaleString() : null;
    },
    day (value) {
      const parsed = parseApiInstant(value);
      return parsed ? parsed.toLocaleDateString() : null;
    },
    rangeLabel (row) {
      const from = this.day(row.rangeStartUtc);
      const to = this.day(row.rangeEndUtc);
      // An unreadable range is said out loud rather than rendered as a blank or a dash, which would
      // read as a publication covering nothing.
      if (!from || !to) { return this.$i('wf_pub_range_unknown'); }
      return from + ' – ' + to;
    },
    publishedLabel (row) {
      const at = this.instant(row.publishedAtUtc);
      return at ? this.$i('wf_pub_published') + ' ' + at : this.$i('wf_pub_published_unknown');
    },
    addressedLabel (row) {
      if (row.addressed === null) { return this.$i('wf_pub_addressed_unknown'); }
      // "Addressed to N" — how many recipient rows the publish wrote. Deliberately NOT "reached N"
      // or "sent to N": writing a row is not reaching a person, and the roster behind this list is
      // where that difference is settled.
      return this.$i('wf_pub_addressed') + ' ' + row.addressed;
    }
  }
};
</script>

<style lang="scss" scoped>
.wf-publist {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  margin-top: 24px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__title {
    font-size: 1.15em;
    font-weight: 600;
    color: #292c34;
    margin: 0;
  }

  &__refresh {
    border: 1px solid #cbd5e0;
    background: #fff;
    color: #292c34;
    font-weight: 600;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
    min-height: 38px;

    &:disabled { color: #a0aec0; cursor: not-allowed; }
  }

  &__intro {
    color: #64748b;
    margin: 8px 0 0 0;
    font-size: 0.9em;
  }

  &__state {
    margin-top: 16px;
    padding: 16px;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;

    strong { color: #292c34; }
    span { color: #64748b; font-size: 0.9em; }

    &--unknown { background: #fff7ed; border: 1px solid #fed7aa; }
    &--empty { background: #f8f9fa; border: 1px dashed #cbd5e0; }
  }

  &__rows {
    list-style: none;
    margin: 16px 0 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__pick {
    width: 100%;
    text-align: left;
    background: #f8f9fa;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    /* A comfortable hit target: the whole row is the control, and it stays tappable at 320px. */
    padding: 12px 14px;
    min-height: 44px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 6px;

    &:hover { border-color: #cbd5e0; }
    &--on { background: #ecfdf5; border-color: #1bb776; }
  }

  &__line {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  &__range {
    font-weight: 600;
    color: #292c34;
    font-size: 0.95em;
  }

  &__tag {
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.02em;

    &--now { background: #d1fae5; color: #065f46; }
    &--old { background: #e2e8f0; color: #475569; }
  }

  &__meta {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    color: #64748b;
    font-size: 0.82em;
  }
}
</style>

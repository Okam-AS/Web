<template>
  <section class="wf-pubrec" data-testid="wf-pubrec">
    <h2 class="wf-pubrec__title">
      {{ $i('wf_pub_rec_title') }}
    </h2>

    <!-- NOTHING PICKED YET. Not an empty roster and not a failure — the reader has not asked a
         question yet, and the panel says which of the three it is rather than showing zeroes. -->
    <div v-if="!publication" class="wf-pubrec__state wf-pubrec__state--idle" data-testid="wf-pubrec-idle">
      <strong>{{ $i('wf_pub_rec_idle_title') }}</strong>
      <span>{{ $i('wf_pub_rec_idle_body') }}</span>
    </div>

    <template v-else>
      <p class="wf-pubrec__for" data-testid="wf-pubrec-for">
        {{ $i('wf_pub_rec_for') }} {{ rangeLabel }}
      </p>

      <!-- A SUPERSEDED PUBLICATION'S CONFIRMATIONS ARE ABOUT A PLAN THAT NO LONGER STANDS. Shown
           before the buckets, because reading the roster first and the caveat afterwards is how a
           venue ends up producing last week's confirmations as this week's evidence. -->
      <div v-if="publication.superseded" class="wf-pubrec__note wf-pubrec__note--old" data-testid="wf-pubrec-superseded">
        {{ $i('wf_pub_rec_superseded') }}
      </div>

      <div v-if="loading" class="wf-pubrec__state wf-pubrec__state--idle" data-testid="wf-pubrec-loading">
        <strong>{{ $i('wf_pub_loading') }}</strong>
      </div>

      <!-- THE READ COULD NOT RUN. Never the empty roster: "we could not find out who was told" and
           "nobody was told" are opposite facts. -->
      <div
        v-else-if="!summary.known"
        class="wf-pubrec__state wf-pubrec__state--unknown"
        data-testid="wf-pubrec-unknown"
      >
        <strong>{{ $i('wf_pub_rec_unknown_title') }}</strong>
        <span>{{ $i('wf_pub_rec_unknown_body') }}</span>
      </div>

      <div
        v-else-if="summary.empty"
        class="wf-pubrec__state wf-pubrec__state--empty"
        data-testid="wf-pubrec-empty"
      >
        <strong>{{ $i('wf_pub_rec_empty_title') }}</strong>
        <span>{{ $i('wf_pub_rec_empty_body') }}</span>
      </div>

      <template v-else>
        <!-- THE TWO COUNTS, SIDE BY SIDE AND NEVER RECONCILED SILENTLY. `addressed` is how many
             recipient rows the publish wrote; `listed` is how many this read could name. The
             recipients query inner-joins the staff member and the person, so a recipient whose staff
             member is gone drops out and the roster is simply shorter. A shorter roster presented as
             the answer to "who was told" is the exact failure this surface exists to refuse. -->
        <div
          v-if="summary.shortBy"
          class="wf-pubrec__note wf-pubrec__note--gap"
          data-testid="wf-pubrec-short"
        >
          {{ $i('wf_pub_rec_short_a') }} {{ summary.addressed }} {{ $i('wf_pub_rec_short_b') }}
          {{ summary.listed }} {{ $i('wf_pub_rec_short_c') }}
        </div>

        <!-- FOUR GROUPS, FOUR HEADINGS, NO COMBINED FIGURE. There is deliberately no "3 of 4
             reached" anywhere on this panel: a worker's confirmation, a worker merely opening it, a
             manager's own note that they delivered it by hand, and a transport that accepted a
             message are four different claims, and any single number would be read as the strongest
             of them. -->
        <WorkforcePublicationReceiptGroup
          v-if="summary.confirmed.length"
          tone="good"
          testid="wf-pubrec-confirmed"
          :title="$i('wf_pub_rec_confirmed_title')"
          :body="$i('wf_pub_rec_confirmed_body')"
          :rows="summary.confirmed"
        />
        <WorkforcePublicationReceiptGroup
          v-if="summary.opened.length"
          tone="soft"
          testid="wf-pubrec-opened"
          :title="$i('wf_pub_rec_opened_title')"
          :body="$i('wf_pub_rec_opened_body')"
          :rows="summary.opened"
        />
        <WorkforcePublicationReceiptGroup
          v-if="summary.byHand.length"
          tone="soft"
          testid="wf-pubrec-byhand"
          :title="$i('wf_pub_rec_byhand_title')"
          :body="$i('wf_pub_rec_byhand_body')"
          :rows="summary.byHand"
        />
        <WorkforcePublicationReceiptGroup
          v-if="summary.noReceipt.length"
          tone="stop"
          testid="wf-pubrec-none"
          :title="$i('wf_pub_rec_none_title')"
          :body="$i('wf_pub_rec_none_body')"
          :rows="summary.noReceipt"
        />
      </template>
    </template>
  </section>
</template>

<script>
import WorkforcePublicationReceiptGroup from '~/components/admin/workforce/WorkforcePublicationReceiptGroup.vue';
import { parseApiInstant } from '~/utils/workforce/week-range';

/**
 * WHO A PUBLICATION WAS ADDRESSED TO, AND WHAT EACH OF THEM DID ABOUT IT.
 *
 * The panel holds NO judgement of its own: `~/utils/workforce/publication-receipts` decides which of
 * the four attestations a row is in, and this renders the answer. The one thing it must never do is
 * merge them — see that module's header for why a `Delivered` send belongs with the rows that have
 * no receipt at all, and why a manager's manual-delivery note is never counted as a confirmation.
 */
export default {
  components: { WorkforcePublicationReceiptGroup },
  props: {
    // The decorated history row that was picked, or null when nothing has been picked yet.
    publication: { type: Object, default: null },
    // The shape `summariseRecipients` returns.
    summary: { type: Object, required: true },
    loading: { type: Boolean, default: false }
  },
  computed: {
    rangeLabel () {
      const from = parseApiInstant(this.publication && this.publication.rangeStartUtc);
      const to = parseApiInstant(this.publication && this.publication.rangeEndUtc);
      if (!from || !to) { return this.$i('wf_pub_range_unknown'); }
      return from.toLocaleDateString() + ' – ' + to.toLocaleDateString();
    }
  }
};
</script>

<style lang="scss" scoped>
.wf-pubrec {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  margin-top: 16px;

  &__title {
    font-size: 1.15em;
    font-weight: 600;
    color: #292c34;
    margin: 0;
  }

  &__for {
    color: #64748b;
    font-size: 0.9em;
    margin: 8px 0 0 0;
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

    &--idle { background: #f8f9fa; border: 1px dashed #cbd5e0; }
    &--empty { background: #f8f9fa; border: 1px dashed #cbd5e0; }
    &--unknown { background: #fff7ed; border: 1px solid #fed7aa; }
  }

  &__note {
    margin-top: 12px;
    padding: 12px 14px;
    border-radius: 10px;
    font-size: 0.88em;

    &--old { background: #e2e8f0; color: #334155; }
    &--gap { background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; }
  }
}
</style>

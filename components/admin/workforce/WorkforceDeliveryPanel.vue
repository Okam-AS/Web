<template>
  <section class="wf-delivery" data-testid="wf-delivery">
    <div class="wf-delivery__header">
      <h2 class="wf-delivery__title">
        {{ $i('wf_delivery_title') }}
      </h2>
      <button
        class="wf-delivery__refresh"
        type="button"
        data-testid="wf-delivery-refresh"
        :disabled="loading"
        @click="$emit('reload')"
      >
        {{ loading ? $i('wf_delivery_loading') : $i('wf_delivery_refresh') }}
      </button>
    </div>

    <p class="wf-delivery__intro">
      {{ $i('wf_delivery_intro') }}
    </p>

    <!-- THE READ COULD NOT RUN. Deliberately NOT the empty state: a store whose delivery report
         failed to load has not been shown that nothing is wrong, and must never read as if it had. -->
    <div v-if="!summary.known" class="wf-delivery__state wf-delivery__state--unknown" data-testid="wf-delivery-unknown">
      <strong>{{ $i('wf_delivery_unknown_title') }}</strong>
      <span>{{ $i('wf_delivery_unknown_body') }}</span>
    </div>

    <!-- ANSWERED, AND NOTHING IS OUTSTANDING. Only reachable when the read actually ran. -->
    <div v-else-if="summary.clean" class="wf-delivery__state wf-delivery__state--clean" data-testid="wf-delivery-clean">
      <strong>{{ $i('wf_delivery_clean_title') }}</strong>
      <span>{{ $i('wf_delivery_clean_body') }}</span>
    </div>

    <template v-else>
      <!-- The three groups are rendered as three SEPARATE blocks with their own headings, counts and
           tones, and there is no combined total anywhere on this panel. That is the whole point:
           "waiting for this store's push credential" and "this worker was never told" are the same
           silence on the wire and must never be the same line on a screen. -->
      <WorkforceDeliveryGroup
        v-if="summary.gaveUp.length"
        tone="stop"
        testid="wf-delivery-gaveup"
        :title="$i('wf_delivery_gaveup_title')"
        :body="$i('wf_delivery_gaveup_body')"
        :rows="summary.gaveUp"
      />
      <WorkforceDeliveryGroup
        v-if="summary.retrying.length"
        tone="warn"
        testid="wf-delivery-retrying"
        :title="$i('wf_delivery_retrying_title')"
        :body="$i('wf_delivery_retrying_body')"
        :rows="summary.retrying"
      />
      <WorkforceDeliveryGroup
        v-if="summary.waiting.length"
        tone="wait"
        testid="wf-delivery-waiting"
        :title="$i('wf_delivery_waiting_title')"
        :body="$i('wf_delivery_waiting_body')"
        :rows="summary.waiting"
      />
      <WorkforceDeliveryGroup
        v-if="summary.unrecognised.length"
        tone="warn"
        testid="wf-delivery-unrecognised"
        :title="$i('wf_delivery_unrecognised_title')"
        :body="$i('wf_delivery_unrecognised_body')"
        :rows="summary.unrecognised"
      />
    </template>
  </section>
</template>

<script>
import WorkforceDeliveryGroup from '~/components/admin/workforce/WorkforceDeliveryGroup.vue';

/**
 * The store's undelivered schedule notifications, grouped by what an operator can do about them.
 *
 * It renders a SUMMARY it is handed (`~/utils/workforce/delivery-failures` builds it) rather than a
 * wire list, so the tier judgement is testable without a browser and cannot be re-decided here.
 */
export default {
  name: 'WorkforceDeliveryPanel',
  components: { WorkforceDeliveryGroup },
  props: {
    /** The output of `summarise()`. Its `known: false` shape is what a failed read looks like. */
    summary: { type: Object, required: true },
    loading: { type: Boolean, default: false }
  }
};
</script>

<style lang="scss" scoped>
.wf-delivery {
  margin-top: 32px;
  padding: 24px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__title {
    font-size: 1.1em;
    font-weight: 600;
    color: #292c34;
    margin: 0;
  }

  &__refresh {
    background: #fff;
    color: #292c34;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    // A 44px floor so the control is not a coin-toss on a touch screen, and so it cannot be
    // crowded out of its own row by the heading beside it.
    min-height: 44px;

    &:hover:not(:disabled) { background: #f8f9fa; border-color: #cbd5e0; }
    &:focus-visible { outline: none; border-color: #1bb776; box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1); }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
  }

  &__intro {
    font-size: 0.9em;
    color: #64748b;
    margin: 8px 0 16px 0;
  }

  &__state {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px;
    border-radius: 8px;
    font-size: 0.9em;

    strong { color: #292c34; }
    span { color: #64748b; }

    &--clean { background: rgba(27, 183, 118, 0.08); }
    &--unknown { background: #f8f9fa; border: 1px dashed #cbd5e0; }
  }
}
</style>

<template>
  <section class="growth-run">
    <header class="growth-run__head">
      <h2 class="growth-run__title">
        {{ $i('growth_run_title') }}
      </h2>
      <span v-if="run.runState" class="growth-run__state">{{ run.runState }}</span>
    </header>

    <dl class="growth-run__figures">
      <div class="growth-run__figure">
        <dt>{{ $i('growth_run_final_eligible') }}</dt>
        <dd>{{ figure(run.finalEligible) }}</dd>
      </div>
      <div class="growth-run__figure">
        <dt>{{ $i('growth_run_suppressed') }}</dt>
        <dd>{{ figure(run.suppressedAtDispatch) }}</dd>
      </div>
      <!-- Accepted and delivered are two columns and never one. Folding the first into the second is
           the precise misreport GRW-TRUTH-001 forbids: the provider taking a message for sending is
           not the message arriving. -->
      <div class="growth-run__figure">
        <dt>{{ $i('growth_run_accepted') }}</dt>
        <dd>{{ figure(run.providerAccepted) }}</dd>
      </div>
      <div class="growth-run__figure">
        <dt>{{ $i('growth_run_delivered') }}</dt>
        <dd>{{ figure(run.delivered) }}</dd>
      </div>
      <div class="growth-run__figure">
        <dt>{{ $i('growth_run_failed') }}</dt>
        <dd>{{ figure(run.failed) }}</dd>
      </div>
      <div class="growth-run__figure">
        <dt>{{ $i('growth_run_ambiguous') }}</dt>
        <dd>{{ figure(run.ambiguous) }}</dd>
      </div>
    </dl>

    <p class="growth-run__note">
      {{ $i('growth_run_truth_note') }}
    </p>

    <div class="growth-run__opens">
      <div class="growth-run__figure">
        <dt>{{ $i('growth_run_opened') }}</dt>
        <dd>{{ figure(run.opened) }}</dd>
      </div>
      <div class="growth-run__figure">
        <dt>{{ $i('growth_run_open_rate') }}</dt>
        <!-- Null until something was delivered. A 0% here would read as "nobody opened it" when the
             truth is "nothing has been delivered to open". -->
        <dd :class="{ 'is-unknown': run.openRate === null }">
          {{ openRateLabel }}
        </dd>
      </div>
    </div>
    <p v-if="run.openRateLabel" class="growth-run__note">
      {{ run.openRateLabel }}
    </p>

    <dl class="growth-run__meta">
      <div>
        <dt>{{ $i('growth_run_started') }}</dt>
        <dd>{{ stamp(run.startedAt) }}</dd>
      </div>
      <div>
        <dt>{{ $i('growth_run_completed') }}</dt>
        <dd>{{ stamp(run.completedAt) }}</dd>
      </div>
    </dl>
  </section>
</template>

<script>
/**
 * The dispatch run's truthful outcome (#14 `run` / #18).
 *
 * Every count is reported separately, exactly as the backend reports it. This component performs NO
 * arithmetic on the figures — it does not sum them, does not derive a percentage, and does not
 * reconcile them against each other. A client-side total would be a second, competing account of a
 * send that only the server witnessed.
 */
export default {
  name: 'GrowthRunOutcome',
  props: {
    /** The `readRun` projection. */
    run: { type: Object, required: true },
    /** BCP-47 tag for the run stamps. */
    locale: { type: String, default: 'nb-NO' }
  },
  data () {
    return { unknownMark: '—' };
  },
  computed: {
    // The rate arrives as a fraction and is rendered as a percentage. It is NOT recomputed from
    // opened/delivered here: the server's figure is event-deduped in a way the two counts on screen
    // cannot reproduce, so dividing them would quietly print a different number.
    openRateLabel () {
      if (this.run.openRate === null || this.run.openRate === undefined) { return this.unknownMark; }
      return (this.run.openRate * 100).toFixed(1) + ' %';
    }
  },
  methods: {
    figure (value) {
      return value === null || value === undefined ? this.unknownMark : String(value);
    },
    stamp (value) {
      if (!value) { return this.unknownMark; }
      return new Intl.DateTimeFormat(this.locale, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      }).format(value);
    }
  }
};
</script>

<style scoped>
.growth-run { border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background: #fff; }
.growth-run__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.growth-run__title { font-size: 16px; font-weight: 600; color: #292c34; margin: 0; }
.growth-run__state { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; background: #f1f5f9; color: #64748b; border-radius: 999px; padding: 4px 10px; }
.growth-run__figures { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin: 0 0 8px; }
.growth-run__opens { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin: 16px 0 0; }
.growth-run__figure { border: 1px solid #f1f5f9; border-radius: 8px; padding: 12px; background: #f8f9fa; }
.growth-run__figure dt { font-size: 12px; color: #64748b; margin-bottom: 6px; }
.growth-run__figure dd { font-size: 20px; font-weight: 600; color: #292c34; margin: 0; font-variant-numeric: tabular-nums; }
.growth-run__figure dd.is-unknown { color: #94a3b8; font-weight: 400; }
.growth-run__meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 16px 0 0; }
.growth-run__meta dt { font-size: 12px; color: #64748b; margin-bottom: 4px; }
.growth-run__meta dd { font-size: 13px; color: #292c34; margin: 0; }
.growth-run__note { font-size: 12px; color: #64748b; margin: 8px 0 0; line-height: 1.5; }
</style>

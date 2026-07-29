<template>
  <section class="wfrt-exp">
    <header class="wfrt-exp__head">
      <h2 class="wfrt-exp__title">
        {{ $i('wfrt_exp_title') }}
      </h2>
      <p class="wfrt-exp__intro">
        {{ $i('wfrt_exp_intro') }}
      </p>
    </header>

    <p v-if="!canExport" class="wfrt-exp__blocked">
      {{ $i('wfrt_exp_no_capability') }}
    </p>

    <template v-else>
      <div class="wfrt-exp__fields">
        <label class="wfrt-exp__field">
          <span>{{ $i('wfrt_exp_field_from') }}</span>
          <!-- The VENUE's calendar dates, inclusive at both ends. `type="date"` yields exactly the
               `yyyy-MM-dd` the endpoint parses with `DateOnly.TryParseExact`; the attendance read
               above takes UTC INSTANTS instead, and sending either shape to the other endpoint is a
               400. The two ranges are therefore separate inputs, never one shared value. -->
          <input :value="from" type="date" :disabled="busy" @input="$emit('update:from', $event.target.value)">
        </label>
        <label class="wfrt-exp__field">
          <span>{{ $i('wfrt_exp_field_to') }}</span>
          <input :value="to" type="date" :disabled="busy" @input="$emit('update:to', $event.target.value)">
        </label>
        <button class="wfrt-exp__btn" :disabled="busy || !!rangeError" @click="$emit('run')">
          {{ busy ? $i('wfrt_exp_running') : $i('wfrt_exp_run') }}
        </button>
      </div>

      <p v-if="rangeError" class="wfrt-exp__error">
        {{ rangeErrorLabel }}
      </p>

      <template v-if="result">
        <!-- A preamble this parser does not know is not silently interpreted: a later version could
             have renamed the very fields payroll relies on, and reading them as "not stated" would
             show an unknown file as merely uninformative. -->
        <p v-if="!understood" class="wfrt-exp__unknown-version">
          {{ $i('wfrt_exp_unknown_version', { version: result.meta.version || dash }) }}
        </p>

        <template v-else>
          <p :class="['wfrt-exp__verdict', verdictClass]">
            {{ verdictLabel }}
          </p>

          <dl class="wfrt-exp__facts">
            <div>
              <dt>{{ $i('wfrt_exp_fact_rows') }}</dt>
              <dd>{{ show(result.meta.rowCount) }}</dd>
            </div>
            <div>
              <dt>{{ $i('wfrt_exp_fact_incomplete') }}</dt>
              <dd>{{ show(result.meta.incompleteRowCount) }}</dd>
            </div>
            <div>
              <dt>{{ $i('wfrt_exp_fact_range') }}</dt>
              <dd>{{ show(result.meta.fromBusinessDate) }} – {{ show(result.meta.toBusinessDate) }}</dd>
            </div>
            <div>
              <dt>{{ $i('wfrt_exp_fact_zone') }}</dt>
              <dd>{{ show(result.meta.timeZoneId) }}</dd>
            </div>
          </dl>

          <!-- The file carries hours and nothing else: no rate, no wage, no loaded cost. Payroll
               must not be told this is a cost file. -->
          <p class="wfrt-exp__basis">
            {{ $i('wfrt_exp_hours_only') }}
          </p>
        </template>

        <button class="wfrt-exp__btn wfrt-exp__btn--ghost" @click="$emit('download')">
          {{ $i('wfrt_exp_download') }}
        </button>
      </template>
    </template>
  </section>
</template>

<script>
import {
  MAX_EXPORT_DAYS,
  RANGE_MISSING,
  RANGE_REVERSED,
  RANGE_TOO_LONG,
  metaIsUnderstood
} from '~/utils/workforce-rates/hours-export';

// The payroll hours file: ask for a range, see what the returned file says about ITSELF, then take
// it. The completeness verdict is read off the server's own preamble and never recounted from the
// rows — two counts that could disagree would leave nobody able to say which one payroll believes.
export default {
  name: 'WorkforceHoursExportPanel',
  props: {
    from: {
      type: String,
      default: ''
    },
    to: {
      type: String,
      default: ''
    },
    /** `{ meta, fileName, text }` once a file has been fetched; null before that. */
    result: {
      type: Object,
      default: null
    },
    rangeError: {
      type: String,
      default: null
    },
    canExport: {
      type: Boolean,
      default: false
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
    understood () {
      return !!this.result && metaIsUnderstood(this.result.meta);
    },
    verdictClass () {
      if (!this.result) { return ''; }
      switch (this.result.meta.complete) {
      case true: return 'wfrt-exp__verdict--complete';
      case false: return 'wfrt-exp__verdict--incomplete';
      // The file did not state it. Unknown is its own answer and is never collapsed into either
      // boolean: a file that never claimed to be complete must not be shown as complete.
      default: return 'wfrt-exp__verdict--unstated';
      }
    },
    verdictLabel () {
      if (!this.result) { return ''; }
      switch (this.result.meta.complete) {
      case true: return this.$i('wfrt_exp_complete');
      case false: return this.$i('wfrt_exp_incomplete', { count: this.show(this.result.meta.incompleteRowCount) });
      default: return this.$i('wfrt_exp_completeness_unstated');
      }
    },
    rangeErrorLabel () {
      switch (this.rangeError) {
      case RANGE_MISSING: return this.$i('wfrt_exp_range_missing');
      case RANGE_REVERSED: return this.$i('wfrt_exp_range_reversed');
      case RANGE_TOO_LONG: return this.$i('wfrt_exp_range_too_long', { max: MAX_EXPORT_DAYS });
      default: return '';
      }
    }
  },
  methods: {
    /** A figure the preamble did not carry is a dash. Never a zero — "no rows" and "did not say" differ. */
    show (value) {
      return value === null || value === undefined || value === '' ? this.dash : value;
    }
  }
};
</script>

<style scoped>
.wfrt-exp { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
.wfrt-exp__head { margin-bottom: 14px; }
.wfrt-exp__title { font-size: 1.1rem; font-weight: 600; color: #292c34; margin: 0 0 4px; }
.wfrt-exp__intro { font-size: 0.85rem; color: #64748b; margin: 0; }

.wfrt-exp__blocked { font-size: 0.9rem; color: #92400e; background: #fffbeb; border-radius: 8px; padding: 12px; margin: 0; }

.wfrt-exp__fields { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 10px; }
.wfrt-exp__field { display: flex; flex-direction: column; gap: 6px; }
.wfrt-exp__field span { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: #292c34; }
.wfrt-exp__field input { padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; color: #292c34; }
.wfrt-exp__field input:focus { outline: none; border-color: #1bb776; }

.wfrt-exp__btn { background: linear-gradient(135deg, #1bb776 0%, #159f63 100%); color: #fff; border: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; cursor: pointer; }
.wfrt-exp__btn:disabled { background: #cbd5e0; cursor: not-allowed; opacity: 0.6; }
.wfrt-exp__btn--ghost { background: #fff; color: #292c34; border: 2px solid #e2e8f0; margin-top: 12px; }

.wfrt-exp__error { font-size: 0.85rem; color: #b91c1c; margin: 0 0 8px; }
.wfrt-exp__unknown-version { font-size: 0.85rem; color: #92400e; background: #fffbeb; border-radius: 8px; padding: 10px; margin: 8px 0 0; }

.wfrt-exp__verdict { font-size: 0.9rem; font-weight: 600; margin: 12px 0 8px; }
.wfrt-exp__verdict--complete { color: #159f63; }
.wfrt-exp__verdict--incomplete { color: #b91c1c; }
.wfrt-exp__verdict--unstated { color: #92400e; }

.wfrt-exp__facts { display: flex; gap: 20px; flex-wrap: wrap; margin: 0 0 10px; }
.wfrt-exp__facts dt { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.3px; color: #64748b; margin-bottom: 2px; }
.wfrt-exp__facts dd { font-size: 0.9rem; color: #292c34; margin: 0; font-variant-numeric: tabular-nums; }

.wfrt-exp__basis { font-size: 0.8rem; color: #64748b; margin: 0; font-style: italic; }
</style>

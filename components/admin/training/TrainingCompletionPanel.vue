<template>
  <section class="trn-completions">
    <h2 class="trn-completions__title">
      {{ $i('trn_completions_title') }}
    </h2>

    <p v-if="listing.state === 'unknown'" class="trn-note trn-note--unknown" data-test="completions-unknown">
      {{ $i('trn_completions_unknown') }}
    </p>
    <p v-else-if="listing.state === 'refused'" class="trn-note trn-note--refused" data-test="completions-refused">
      {{ $i('trn_completions_refused') }}
    </p>
    <p v-else-if="!rows.length" class="trn-note" data-test="completions-empty">
      {{ $i('trn_completions_empty') }}
    </p>
    <table v-else class="trn-table" data-test="completions-table">
      <thead>
        <tr>
          <th>{{ $i('trn_col_person') }}</th>
          <th>{{ $i('trn_col_score') }}</th>
          <th>{{ $i('trn_col_result') }}</th>
          <th>{{ $i('trn_col_source') }}</th>
          <th>{{ $i('trn_col_hash') }}</th>
          <th>{{ $i('trn_col_completed') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.completionId" data-test="completion-row">
          <td>
            <span class="trn-ref">{{ row.personRef || dash }}</span>
          </td>
          <!-- A score of 0 is a score, not a missing value; only a null prints as a dash. -->
          <td>{{ row.scorePercent === null ? dash : row.scorePercent + '%' }}</td>
          <td>
            <span v-if="row.passed === null" :title="$i('trn_result_unknown')">{{ dash }}</span>
            <span v-else class="trn-badge" :class="row.passed ? 'trn-badge--on' : 'trn-badge--off'">
              {{ row.passed ? $i('trn_result_passed') : $i('trn_result_failed') }}
            </span>
          </td>
          <td>{{ sourceLabel(row.source) }}</td>
          <td>
            <span class="trn-ref" :title="row.versionContentHash">{{ shortHash(row.versionContentHash) }}</span>
          </td>
          <td>{{ stamp(row.completed) }}</td>
        </tr>
      </tbody>
    </table>

    <form class="trn-form" data-test="completion-form" @submit.prevent="submit">
      <h3 class="trn-form__title">
        {{ $i('trn_completion_new_title') }}
      </h3>

      <p v-if="!versions.length" class="trn-note" data-test="completion-no-frozen">
        {{ $i('trn_completion_no_frozen') }}
      </p>
      <template v-else>
        <label class="trn-form__label">
          {{ $i('trn_completion_person') }}
          <input v-model="form.personRef" class="trn-form__input" type="text" data-test="completion-person">
        </label>
        <p class="trn-form__hint">
          {{ $i('trn_reference_by_value') }}
        </p>
        <label class="trn-form__label">
          {{ $i('trn_completion_version') }}
          <select v-model="form.courseVersionId" class="trn-form__select" data-test="completion-version">
            <option value="">
              {{ $i('trn_assign_version_pick') }}
            </option>
            <option v-for="v in versions" :key="v.courseVersionId" :value="v.courseVersionId">
              {{ label(v) }}
            </option>
          </select>
        </label>
        <label class="trn-form__label">
          {{ $i('trn_completion_score') }}
          <input
            v-model="form.scorePercent"
            class="trn-form__input"
            type="number"
            min="0"
            max="100"
            data-test="completion-score"
          >
        </label>
        <label class="trn-form__check">
          <input v-model="form.passed" type="checkbox" data-test="completion-passed">
          {{ $i('trn_completion_passed') }}
        </label>
        <!-- TR-B1, stated to the person filling the form in. The pass box and the score are two
             separate assertions on the wire and the server keeps them that way. -->
        <p class="trn-form__hint" data-test="completion-grading-note">
          {{ $i('trn_completion_grading_note') }}
        </p>
        <button class="trn-btn trn-btn--primary" type="submit" :disabled="!canSubmit" data-test="completion-submit">
          {{ $i('trn_completion_submit') }}
        </button>
      </template>

      <p v-if="writeBlocked" class="trn-note trn-note--blocked" data-test="completion-write-blocked">
        {{ writeBlocked }}
      </p>
    </form>
  </section>
</template>

<script>
import { completionRow, versionLabel, instantLabel } from '~/utils/training/journey';

const SHORT_HASH = 12;

/**
 * The completion ledger, and the one write that appends to it.
 *
 * THIS PANEL DOES NOT GRADE, AND THE REFUSAL IS DELIBERATE. `TrainingCompletionService` writes
 * `Passed = request.Passed` and never compares the score against the version's
 * `passThresholdPercent` — TR-B1, an open ruling on Sven's list. The tempting fix is to tick the box
 * from the score in the browser. That would be worse than the gap it papers over: the ledger is
 * append-only, so a pass written from a client-side rule can never be corrected, and the rule itself
 * would live where no inspection could find it. So the box is the manager's own assertion, the hint
 * says exactly that, and nothing here compares the two numbers.
 *
 * NOR DOES THE TABLE. A row shows the score and the result side by side and draws no conclusion from
 * their combination; the version's threshold is rendered one panel up, on the version that carries
 * it, and the two are never brought together.
 *
 * WHY BOTH PUBLISHED AND RETIRED VERSIONS ARE OFFERED: what a completion needs is a frozen content
 * hash to be stamped against, and retiring a version freezes it further. A venue that withdraws a
 * course must still be able to file the completions of the people who took it.
 */
export default {
  name: 'TrainingCompletionPanel',
  props: {
    /** `readListing(payload, error, 'completions')`. */
    listing: { type: Object, required: true },
    /** `recordableVersions(detail)` — Published or Retired. */
    versions: { type: Array, default: () => [] },
    locale: { type: String, default: 'no' },
    zoneId: { type: String, default: null },
    /** `training.assignments`: true, false, or null for UNKNOWN. Null never disables a control. */
    assignmentsFlag: { type: Boolean, default: null },
    busy: { type: Boolean, default: false }
  },
  data () {
    return { form: { personRef: '', courseVersionId: '', scorePercent: '', passed: false } };
  },
  computed: {
    dash () { return '—'; },
    rows () {
      return (this.listing.rows || []).map(completionRow);
    },
    writeBlocked () {
      return this.assignmentsFlag === false ? this.$i('trn_writes_blocked_assignments') : '';
    },
    /** The server refuses a score outside 0–100 with a 400; the form does not send one. */
    scoreValue () {
      if (this.form.scorePercent === '') { return null; }
      const parsed = Number(this.form.scorePercent);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) { return null; }
      return parsed;
    },
    canSubmit () {
      return !this.busy &&
        !!this.form.personRef.trim() &&
        !!this.form.courseVersionId &&
        this.scoreValue !== null;
    }
  },
  methods: {
    label (version) { return versionLabel(version) || this.dash; },
    stamp (instant) {
      return instantLabel(instant, this.locale, this.zoneId) || this.dash;
    },
    /**
     * The only two sources the enum has. `ManagerRecorded` is the only one this surface can produce
     * — `Quiz` requires the §5.2 worker self-service surface, which does not exist in this wave — so
     * a `Quiz` row appearing here would mean something changed on the backend, and it is labelled
     * rather than silently folded into "recorded".
     */
    sourceLabel (source) {
      if (source === 'ManagerRecorded') { return this.$i('trn_source_manager'); }
      if (source === 'Quiz') { return this.$i('trn_source_quiz'); }
      return source || this.dash;
    },
    shortHash (hash) {
      if (!hash) { return this.dash; }
      return hash.length > SHORT_HASH ? hash.slice(0, SHORT_HASH) + '…' : hash;
    },
    submit () {
      if (!this.canSubmit) { return; }
      this.$emit('record-completion', {
        personRef: this.form.personRef.trim(),
        courseVersionId: this.form.courseVersionId,
        scorePercent: this.scoreValue,
        passed: this.form.passed === true
      });
    }
  }
};
</script>

<style lang="scss" scoped>
@import './training-panel';

.trn-completions__title {
  @extend %trn-panel-title;
}
</style>

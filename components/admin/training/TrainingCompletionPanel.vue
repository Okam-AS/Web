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
          <th>{{ $i('trn_col_course') }}</th>
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
          <td data-test="completion-course">
            {{ row.courseTitle || dash }}
            <span v-if="row.versionNo !== null" class="trn-flag">v{{ row.versionNo }}</span>
          </td>
          <td>
            <span class="trn-ref" :title="row.personRef">{{ personName(row.personRef) }}</span>
          </td>
          <!-- A score of 0 is a score, not a missing value; only a null prints as a dash. -->
          <td>{{ row.scorePercent === null ? dash : row.scorePercent + '%' }}</td>
          <td>
            <span v-if="row.passed === null" :title="$i('trn_result_unknown')">{{ dash }}</span>
            <span v-else class="trn-badge" :class="row.passed ? 'trn-badge--on' : 'trn-badge--off'">
              {{ row.passed ? $i('trn_result_passed') : $i('trn_result_failed') }}
            </span>
          </td>
          <td>
            <span :title="sourceTitle(row.source)">{{ sourceLabel(row.source) }}</span>
          </td>
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
        <TrainingReferenceField
          v-model="form.personRef"
          :label="$i('trn_completion_person')"
          :directory="peopleDirectory"
          kind="person"
          test-id="completion-person"
          :disabled="busy"
        />
        <p class="trn-form__hint" data-test="completion-person-note">
          {{ $i('trn_completion_person_known') }}
        </p>
        <p v-if="referenceMalformed" class="trn-note trn-note--blocked" data-test="completion-person-malformed">
          {{ $i('trn_reference_malformed') }}
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
        <!-- The rule the SERVER runs, stated to the person filling the form in. There is no verdict
             control here to contradict it — see the panel note. -->
        <p class="trn-form__hint" data-test="completion-grading-note">
          {{ $i('trn_completion_grading_note') }}
        </p>
        <p v-if="selectedThreshold !== null" class="trn-form__hint" data-test="completion-threshold-note">
          {{ $i('trn_completion_threshold_note', { threshold: selectedThreshold }) }}
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
import TrainingReferenceField from '~/components/admin/training/TrainingReferenceField.vue';
import { completionRow, versionLabel, instantLabel, directoryMatch, isReferenceId } from '~/utils/training/journey';

const SHORT_HASH = 12;

/**
 * The completion ledger, and the one write that appends to it.
 *
 * THERE IS NO PASS CHECKBOX, AND ITS ABSENCE IS THE POINT. TR-B1 is settled in the server's favour:
 * `RecordTrainingCompletionRequest` carries `PersonRef`, `CourseVersionId` and `ScorePercent` and NO
 * verdict field, and `TrainingCompletionService` writes
 * `Passed = TrainingGrading.IsPass(request.ScorePercent, version.PassThresholdPercent)` against the
 * frozen version the attempt is stamped to. This panel used to render a «Passed» box whose value the
 * server discarded, under a hint that said the opposite — so a manager could tick it, enter 55
 * against a threshold of 80, and get «Not passed» back in the row they had just filed.
 *
 * Deriving the tick client-side would have been the wrong repair, and so would sending it: the ledger
 * is append-only under a SQL trigger, so a verdict a client could assert is a permanent false
 * qualification that no correction can reach. A manager states the observation — the score — and the
 * published threshold decides what it means. What the form owes the operator instead is the rule and
 * the selected version's own threshold, both stated before they submit.
 *
 * THE TABLE STILL DRAWS NO CONCLUSION. `passed` is printed as the server derived it and is never
 * recomputed here: the threshold that graded a row is the one frozen into ITS version, and a browser
 * comparing the score against a later version's threshold — or rounding where the server's exact
 * decimal comparison does not — would be a second opinion about the same statutory record.
 *
 * WHY BOTH PUBLISHED AND RETIRED VERSIONS ARE OFFERED: what a completion needs is a frozen content
 * hash to be stamped against, and retiring a version freezes it further. A venue that withdraws a
 * course must still be able to file the completions of the people who took it.
 *
 * THE ROW NAMES WHAT WAS COMPLETED, AND THE NAME COMES OFF THE WIRE. This table is store-WIDE — the
 * page reads every completion in the venue, not the selected course's — so before the title and
 * version number were carried it listed scores and pass/fail verdicts against nothing at all. The
 * page could not have filled that in: `detail` is whichever course is expanded, so naming rows from
 * it would name most of them wrong, and resolving a title from the course list would print what the
 * catalogue holds TODAY rather than what the person was tested against. The server projects both off
 * the exact version the attempt is stamped to, and an unresolvable one prints as a dash.
 */
export default {
  name: 'TrainingCompletionPanel',
  components: { TrainingReferenceField },
  props: {
    /** `readListing(payload, error, 'completions')`. */
    listing: { type: Object, required: true },
    /** `recordableVersions(detail)` — Published or Retired. */
    versions: { type: Array, default: () => [] },
    /** `personDirectory(...)` — an assist for the reference field, never a gate on it. */
    peopleDirectory: { type: Object, default: () => ({ state: 'unknown', options: [] }) },
    locale: { type: String, default: 'no' },
    zoneId: { type: String, default: null },
    /** `training.assignments`: true, false, or null for UNKNOWN. Null never disables a control. */
    assignmentsFlag: { type: Boolean, default: null },
    busy: { type: Boolean, default: false }
  },
  data () {
    return { form: { personRef: '', courseVersionId: '', scorePercent: '' } };
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
    /**
     * Something has been typed, and it is not a GUID. `PersonRef` binds to a `Guid`, so this would
     * fail MODEL BINDING — a framework 400 carrying no `training.*` code, which the page could not
     * explain. Said here, where the cause is known, rather than sent and mistranslated.
     */
    referenceMalformed () {
      const typed = this.form.personRef.trim();
      return !!typed && !isReferenceId(typed);
    },
    /**
     * The selected version's OWN authored threshold — the number the server will compare against.
     * Read off the same document the picker was built from; never carried over from another version.
     */
    selectedThreshold () {
      const version = this.versions.find(v => v.courseVersionId === this.form.courseVersionId);
      return version && typeof version.passThresholdPercent === 'number' ? version.passThresholdPercent : null;
    },
    canSubmit () {
      return !this.busy &&
        isReferenceId(this.form.personRef) &&
        !!this.form.courseVersionId &&
        this.scoreValue !== null;
    }
  },
  methods: {
    label (version) { return versionLabel(version) || this.dash; },
    stamp (instant) {
      return instantLabel(instant, this.locale, this.zoneId) || this.dash;
    },
    /** A filed reference named, when the directory can name it. The id stays on the title either way. */
    personName (personRef) {
      const match = directoryMatch(this.peopleDirectory, personRef);
      return match ? match.label : (personRef || this.dash);
    },
    /**
     * The two sources the enum has, of which only one can be produced anywhere.
     * `TrainingCompletionService` hardcodes `ManagerRecorded`, and NO production code writes `Quiz` —
     * the §5.2 worker self-service surface where somebody would take one does not exist in this wave.
     * A `Quiz` row therefore means the backend changed, so it is labelled plainly and the title says
     * what this build knows, rather than being folded into "recorded" or dressed up as an app feature.
     */
    sourceLabel (source) {
      if (source === 'ManagerRecorded') { return this.$i('trn_source_manager'); }
      if (source === 'Quiz') { return this.$i('trn_source_quiz'); }
      return source || this.dash;
    },
    sourceTitle (source) {
      return source === 'Quiz' ? this.$i('trn_source_quiz_note') : null;
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
        scorePercent: this.scoreValue
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

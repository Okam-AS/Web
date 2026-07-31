<template>
  <section class="trn-versions">
    <h2 class="trn-versions__title">
      {{ $i('trn_versions_title') }}
    </h2>

    <p v-if="!selectedCourseId" class="trn-note" data-test="versions-no-course">
      {{ $i('trn_versions_pick_course') }}
    </p>
    <template v-else>
      <p v-if="detail.state === 'unknown'" class="trn-note trn-note--unknown" data-test="versions-unknown">
        {{ $i('trn_versions_unknown') }}
      </p>
      <p v-else-if="detail.state === 'refused'" class="trn-note trn-note--refused" data-test="versions-refused">
        {{ $i('trn_versions_refused') }}
      </p>
      <template v-else>
        <p v-if="!detail.versions.length" class="trn-note" data-test="versions-empty">
          {{ $i('trn_versions_empty') }}
        </p>
        <table v-else class="trn-table" data-test="versions-table">
          <thead>
            <tr>
              <th>{{ $i('trn_col_version') }}</th>
              <th>{{ $i('trn_col_state') }}</th>
              <th>{{ $i('trn_col_threshold') }}</th>
              <th>{{ $i('trn_col_hash') }}</th>
              <th>{{ $i('trn_col_published') }}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="version in detail.versions" :key="version.courseVersionId" data-test="version-row">
              <td>v{{ version.versionNo }}</td>
              <td>
                <span class="trn-badge" :class="stateTone(version.state)">{{ stateLabel(version.state) }}</span>
              </td>
              <!-- The version's OWN authored threshold. It is shown here, on the thing that carries
                   it, and nowhere near a completion's score — see the note under the record form. -->
              <td>{{ version.passThresholdPercent }}%</td>
              <td>
                <span class="trn-ref" :title="version.contentHash">{{ shortHash(version.contentHash) }}</span>
              </td>
              <td>{{ stamp(instant(version.publishedAtUtc)) }}</td>
              <td>
                <button
                  v-if="version.state === 'Draft'"
                  class="trn-btn trn-btn--small"
                  type="button"
                  :disabled="busy"
                  data-test="version-publish"
                  @click="$emit('publish', version.versionNo)"
                >
                  {{ $i('trn_version_publish') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="trn-form__hint">
          {{ $i('trn_version_publish_note') }}
        </p>
      </template>

      <form class="trn-form" data-test="version-form" @submit.prevent="submit">
        <h3 class="trn-form__title">
          {{ $i('trn_version_new_title') }}
        </h3>
        <label class="trn-form__label">
          {{ $i('trn_version_content') }}
          <textarea v-model="form.contentPagesJson" class="trn-form__area" data-test="version-content" />
        </label>
        <!-- The quiz is NOT authored here, and the absence is stated rather than left to be
             noticed. See the panel note. -->
        <p class="trn-form__hint" data-test="version-quiz-absent">
          {{ $i('trn_version_quiz_absent') }}
        </p>
        <label class="trn-form__label">
          {{ $i('trn_version_threshold') }}
          <input
            v-model="form.passThresholdPercent"
            class="trn-form__input"
            type="number"
            min="0"
            max="100"
            data-test="version-threshold"
          >
        </label>
        <button class="trn-btn trn-btn--primary" type="submit" :disabled="!canSubmit" data-test="version-submit">
          {{ $i('trn_version_new_submit') }}
        </button>
        <p v-if="writeBlocked" class="trn-note trn-note--blocked" data-test="version-write-blocked">
          {{ writeBlocked }}
        </p>
      </form>
    </template>
  </section>
</template>

<script>
import { instantOf, instantLabel } from '~/utils/training/journey';

const SHORT_HASH = 12;

/**
 * The selected course's versions, and the two writes that move one along: cut a draft, publish it.
 *
 * PUBLISHING IS THE HINGE OF THE WHOLE JOURNEY, which is why it is a button on this panel rather
 * than a step buried in a wizard. Until a version is published it is authoring; the moment it is,
 * the backend freezes its content, mints a content hash over the exact snapshot, and that hash is
 * what every completion recorded afterwards is stamped with. That is the mechanism by which a
 * completion means "this person passed THIS material", and it is the only thing on this surface a
 * later inspection could check.
 *
 * There is deliberately no edit and no retire here: the first is authoring convenience and the
 * second is the end of a lifecycle. Neither is on the path from a course to a person's evidence.
 *
 * THE QUIZ IS NOT AUTHORED HERE, AND THAT IS A RULING RATHER THAN AN OMISSION. This panel used to
 * carry a «Quiz (JSON)» textarea. Nothing could ever take what it produced: `TrainingCompletionSource
 * .Quiz` is written by ZERO production code — `TrainingCompletionService` hardcodes `ManagerRecorded`
 * — and the §5.2 worker self-service surface, the one place somebody would sit a quiz, is explicitly
 * not in this wave.
 *
 * Left in place it would have been worse than merely useless, because `QuizJson` IS NOT INERT. It is
 * one of the three inputs to `TrainingContentHash.Compute(contentPagesJson, quizJson,
 * passThresholdPercent)`, and publishing freezes the version under both the EF `GuardAppendOnly` and
 * a SQL trigger. So a schema guessed today is minted into the content hash that every completion
 * against that version is stamped with — permanently, on statutory evidence, in a shape the eventual
 * quiz reader would then have to honour or invalidate. The content contract is an open design
 * question and this is not the surface entitled to settle it by typing into a box.
 *
 * `quizJson` therefore goes on the wire as null, which is what an empty box already sent and exactly
 * what the hash computes over (`quizJson ?? string.Empty`) — so no version's hash changes. When the
 * contract is decided and a worker surface exists, authoring belongs on a screen that can show what
 * it will produce.
 */
export default {
  name: 'TrainingVersionPanel',
  props: {
    /** `readCourseDetail(payload, error)`. */
    detail: { type: Object, required: true },
    selectedCourseId: { type: String, default: null },
    locale: { type: String, default: 'no' },
    zoneId: { type: String, default: null },
    /** `training.setup`: true, false, or null for UNKNOWN. Null never disables a control. */
    setupFlag: { type: Boolean, default: null },
    busy: { type: Boolean, default: false }
  },
  data () {
    return { form: { contentPagesJson: '', passThresholdPercent: '80' } };
  },
  computed: {
    dash () { return '—'; },
    writeBlocked () {
      return this.setupFlag === false ? this.$i('trn_writes_blocked_setup') : '';
    },
    canSubmit () {
      return !this.busy && !!this.selectedCourseId && this.thresholdValue !== null;
    },
    /** The server refuses anything outside 0–100 with a 400; the form does not send one. */
    thresholdValue () {
      const parsed = Number(this.form.passThresholdPercent);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) { return null; }
      return parsed;
    }
  },
  methods: {
    instant (value) { return instantOf(value); },
    stamp (value) {
      return instantLabel(value, this.locale, this.zoneId) || this.dash;
    },
    stateLabel (state) {
      const key = { Draft: 'trn_state_draft', Published: 'trn_state_published', Retired: 'trn_state_retired' }[state];
      // An unrecognised state is shown verbatim rather than mapped to a friendly word we made up.
      return key ? this.$i(key) : (state || this.dash);
    },
    stateTone (state) {
      if (state === 'Published') { return 'trn-badge--on'; }
      if (state === 'Retired') { return 'trn-badge--off'; }
      return '';
    },
    /**
     * The hash is shown truncated with the whole value on the title, because its purpose here is
     * recognition — matching a completion's stamp against the version it claims — not transcription.
     */
    shortHash (hash) {
      if (!hash) { return this.dash; }
      return hash.length > SHORT_HASH ? hash.slice(0, SHORT_HASH) + '…' : hash;
    },
    submit () {
      if (!this.canSubmit) { return; }
      this.$emit('create-version', {
        contentPagesJson: this.form.contentPagesJson || null,
        // Sent explicitly rather than omitted: `CreateTrainingCourseVersionRequest.QuizJson` is a
        // string the hash reads through `?? string.Empty`, so null and absent mean the same thing on
        // the wire — but a named null says at the call site that this surface authors no quiz.
        quizJson: null,
        passThresholdPercent: this.thresholdValue
      });
    }
  }
};
</script>

<style lang="scss" scoped>
@import './training-panel';

.trn-versions__title {
  @extend %trn-panel-title;
}
</style>

<template>
  <section class="trn-courses">
    <h2 class="trn-courses__title">
      {{ $i('trn_courses_title') }}
    </h2>

    <!-- STEP 1 of the journey. A version can only be cut on a course that exists, so nothing below
         this panel is reachable until the store has one. -->
    <p v-if="listing.state === 'unknown'" class="trn-note trn-note--unknown" data-test="courses-unknown">
      {{ $i('trn_courses_unknown') }}
    </p>
    <p v-else-if="listing.state === 'refused'" class="trn-note trn-note--refused" data-test="courses-refused">
      {{ $i('trn_courses_refused') }}
    </p>
    <p v-else-if="!rows.length" class="trn-note" data-test="courses-empty">
      {{ $i('trn_courses_empty') }}
    </p>
    <div v-else class="trn-table-scroll">
      <table class="trn-table" data-test="courses-table">
        <thead>
          <tr>
            <th>{{ $i('trn_col_title') }}</th>
            <th>{{ $i('trn_col_category') }}</th>
            <th>{{ $i('trn_col_competency') }}</th>
            <th>{{ $i('trn_col_versions') }}</th>
            <th>{{ $i('trn_col_created') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.courseId"
            class="trn-table__row"
            :class="{ 'is-selected': row.courseId === selectedCourseId }"
            data-test="course-row"
            @click="$emit('select', row.courseId)"
          >
            <td>
              <span class="trn-courses__name">{{ row.title || dash }}</span>
              <span v-if="!row.isActive" class="trn-flag">{{ $i('trn_course_inactive') }}</span>
            </td>
            <td>{{ row.category || dash }}</td>
            <td>
              <!-- No competency key is a real, authored choice: the course teaches something without
                   conferring a competence. It is a dash with a title, never an empty cell. -->
              <span :title="row.competencyKey ? null : $i('trn_course_no_competency')">
                {{ row.competencyKey || dash }}
              </span>
            </td>
            <td>
              {{ row.versionCount === null ? dash : row.versionCount }}
              <span v-if="row.hasPublishedVersion" class="trn-badge trn-badge--on">{{ $i('trn_course_has_published') }}</span>
            </td>
            <td>{{ stamp(row.created) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <form class="trn-form" data-test="course-form" @submit.prevent="submit">
      <h3 class="trn-form__title">
        {{ $i('trn_course_new_title') }}
      </h3>
      <label class="trn-form__label">
        {{ $i('trn_course_new_title_label') }}
        <input v-model="form.title" class="trn-form__input" type="text" data-test="course-title">
      </label>
      <label class="trn-form__label">
        {{ $i('trn_course_new_category') }}
        <input v-model="form.category" class="trn-form__input" type="text" data-test="course-category">
      </label>
      <label class="trn-form__label">
        {{ $i('trn_course_new_competency') }}
        <input v-model="form.competencyKey" class="trn-form__input" type="text" data-test="course-competency">
      </label>
      <p class="trn-form__hint">
        {{ $i('trn_course_competency_hint') }}
      </p>
      <button class="trn-btn trn-btn--primary" type="submit" :disabled="!canSubmit" data-test="course-submit">
        {{ $i('trn_course_new_submit') }}
      </button>
      <p v-if="writeBlocked" class="trn-note trn-note--blocked" data-test="course-write-blocked">
        {{ writeBlocked }}
      </p>
    </form>
  </section>
</template>

<script>
import { courseRow, instantLabel } from '~/utils/training/journey';

/**
 * The store's course envelopes, and the form that makes one.
 *
 * The list is rendered off `readListing`'s three states rather than off `rows.length`, so a refused
 * or unanswered read can never reach the screen as "this store has no courses" — which on a module
 * whose whole job is proving what training happened would be the single most damaging thing this
 * panel could say.
 */
export default {
  name: 'TrainingCourseList',
  props: {
    /** `readListing(payload, error, 'courses')`. */
    listing: { type: Object, required: true },
    selectedCourseId: { type: String, default: null },
    locale: { type: String, default: 'no' },
    /** The store zone from `GET /context`; null renders instants in UTC and the caller says so. */
    zoneId: { type: String, default: null },
    /** `training.setup`: true, false, or null for UNKNOWN. Null never disables a control. */
    setupFlag: { type: Boolean, default: null },
    busy: { type: Boolean, default: false }
  },
  data () {
    return { form: { title: '', category: '', competencyKey: '' } };
  },
  computed: {
    dash () { return '—'; },
    rows () {
      return (this.listing.rows || []).map(courseRow);
    },
    /**
     * The write is offered unless the server SAID the flag is off. An unknown flag leaves the button
     * live: refusing on an unanswered read would tell a venue their module is switched off on the
     * strength of a read that never came back, and the server's own 409/404 is the honest refusal.
     */
    writeBlocked () {
      return this.setupFlag === false ? this.$i('trn_writes_blocked_setup') : '';
    },
    canSubmit () {
      return !this.busy && !!this.form.title.trim();
    }
  },
  methods: {
    stamp (instant) {
      return instantLabel(instant, this.locale, this.zoneId) || this.dash;
    },
    submit () {
      if (!this.canSubmit) { return; }
      this.$emit('create', {
        title: this.form.title.trim(),
        category: this.form.category.trim() || null,
        // Empty is sent as null rather than as "": the backend trims and null-collapses it anyway,
        // and "" would read as a competency key that is the empty string.
        competencyKey: this.form.competencyKey.trim() || null
      });
      this.form.title = '';
      this.form.category = '';
      this.form.competencyKey = '';
    }
  }
};
</script>

<style lang="scss" scoped>
@import './training-panel';

.trn-courses__title {
  @extend %trn-panel-title;
}

.trn-courses__name {
  font-weight: 600;
}
</style>

<template>
  <section class="trn-assign">
    <h2 class="trn-assign__title">
      {{ $i('trn_assign_title') }}
    </h2>

    <p v-if="listing.state === 'unknown'" class="trn-note trn-note--unknown" data-test="assignments-unknown">
      {{ $i('trn_assign_unknown') }}
    </p>
    <p v-else-if="listing.state === 'refused'" class="trn-note trn-note--refused" data-test="assignments-refused">
      {{ $i('trn_assign_refused') }}
    </p>
    <p v-else-if="!rows.length" class="trn-note" data-test="assignments-empty">
      {{ $i('trn_assign_empty') }}
    </p>
    <table v-else class="trn-table" data-test="assignments-table">
      <thead>
        <tr>
          <th>{{ $i('trn_col_course') }}</th>
          <th>{{ $i('trn_col_scope') }}</th>
          <th>{{ $i('trn_col_reference') }}</th>
          <th>{{ $i('trn_col_due') }}</th>
          <th>{{ $i('trn_col_created') }}</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.assignmentId" data-test="assignment-row">
          <td>
            {{ row.courseTitle || dash }}
            <span v-if="row.versionNo !== null" class="trn-flag">v{{ row.versionNo }}</span>
          </td>
          <td>{{ scopeLabel(row.scope) }}</td>
          <td>
            <span class="trn-ref">{{ row.reference || dash }}</span>
          </td>
          <!-- Sliced from the wire, never converted: an assignment due "on the 1st" is due on the
               1st in every reader's browser. -->
          <td>{{ row.dueDate || dash }}</td>
          <td>{{ stamp(row.created) }}</td>
          <td>
            <button
              class="trn-btn trn-btn--small trn-btn--danger"
              type="button"
              :disabled="busy"
              data-test="assignment-revoke"
              @click="$emit('revoke', row.assignmentId)"
            >
              {{ $i('trn_assign_revoke') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <form class="trn-form" data-test="assignment-form" @submit.prevent="submit">
      <h3 class="trn-form__title">
        {{ $i('trn_assign_new_title') }}
      </h3>

      <p v-if="!versions.length" class="trn-note" data-test="assignment-no-published">
        {{ $i('trn_assign_no_published') }}
      </p>
      <template v-else>
        <label class="trn-form__label">
          {{ $i('trn_assign_version') }}
          <select v-model="form.courseVersionId" class="trn-form__select" data-test="assignment-version">
            <option value="">
              {{ $i('trn_assign_version_pick') }}
            </option>
            <option v-for="v in versions" :key="v.courseVersionId" :value="v.courseVersionId">
              {{ label(v) }}
            </option>
          </select>
        </label>
        <label class="trn-form__label">
          {{ $i('trn_assign_scope') }}
          <select v-model="form.scope" class="trn-form__select" data-test="assignment-scope">
            <option value="Role">
              {{ $i('trn_assign_scope_role') }}
            </option>
            <option value="Person">
              {{ $i('trn_assign_scope_person') }}
            </option>
          </select>
        </label>
        <label class="trn-form__label">
          {{ form.scope === 'Role' ? $i('trn_assign_role_ref') : $i('trn_assign_person_ref') }}
          <input v-model="form.reference" class="trn-form__input" type="text" data-test="assignment-reference">
        </label>
        <p class="trn-form__hint">
          {{ $i('trn_reference_by_value') }}
        </p>
        <label class="trn-form__label">
          {{ $i('trn_assign_due') }}
          <input v-model="form.dueDate" class="trn-form__input" type="date" data-test="assignment-due">
        </label>
        <button class="trn-btn trn-btn--primary" type="submit" :disabled="!canSubmit" data-test="assignment-submit">
          {{ $i('trn_assign_submit') }}
        </button>
      </template>

      <p v-if="writeBlocked" class="trn-note trn-note--blocked" data-test="assignment-write-blocked">
        {{ writeBlocked }}
      </p>
    </form>
  </section>
</template>

<script>
import { assignmentRow, versionLabel, instantLabel, toApiDate } from '~/utils/training/journey';

/**
 * Assigning a published version to a role or to one person — and revoking it.
 *
 * WHAT A REFERENCE IS HERE, AND WHY IT IS TYPED RATHER THAN PICKED. `roleRef` and `personRef` are
 * `Workforce*` ids carried BY VALUE: Training holds no foreign key to them, performs no cross-module
 * read, and validates nothing beyond "exactly one of the two is set for the chosen scope"
 * (`TrainingAssignmentService.ValidateScope`). There is no route on the Training surface that lists
 * this store's people or roles, so there is nothing honest to populate a picker from. A picker built
 * off another module's staff read would imply a check this module does not perform and would break
 * wherever that module is off. The field is a reference, the hint says so, and the gap is reported
 * rather than papered over.
 *
 * ONLY PUBLISHED VERSIONS ARE OFFERED. `assignableVersions` filters them; a draft or a retired
 * version is a 400 from the server, and a control whose only outcome is a refusal is not a control.
 */
export default {
  name: 'TrainingAssignmentPanel',
  props: {
    /** `readListing(payload, error, 'assignments')`. */
    listing: { type: Object, required: true },
    /** `assignableVersions(detail)` — Published only. */
    versions: { type: Array, default: () => [] },
    locale: { type: String, default: 'no' },
    zoneId: { type: String, default: null },
    /** `training.assignments`: true, false, or null for UNKNOWN. Null never disables a control. */
    assignmentsFlag: { type: Boolean, default: null },
    busy: { type: Boolean, default: false }
  },
  data () {
    return { form: { courseVersionId: '', scope: 'Role', reference: '', dueDate: '' } };
  },
  computed: {
    dash () { return '—'; },
    rows () {
      return (this.listing.rows || []).map(assignmentRow);
    },
    writeBlocked () {
      return this.assignmentsFlag === false ? this.$i('trn_writes_blocked_assignments') : '';
    },
    canSubmit () {
      return !this.busy && !!this.form.courseVersionId && !!this.form.reference.trim();
    }
  },
  methods: {
    label (version) { return versionLabel(version) || this.dash; },
    stamp (instant) {
      return instantLabel(instant, this.locale, this.zoneId) || this.dash;
    },
    scopeLabel (scope) {
      if (scope === 'Role') { return this.$i('trn_assign_scope_role'); }
      if (scope === 'Person') { return this.$i('trn_assign_scope_person'); }
      return scope || this.dash;
    },
    submit () {
      if (!this.canSubmit) { return; }
      const reference = this.form.reference.trim();
      const isRole = this.form.scope === 'Role';
      this.$emit('create-assignment', {
        courseVersionId: this.form.courseVersionId,
        scope: this.form.scope,
        // Exactly one of the two, and the OTHER is null rather than absent: the server refuses a
        // body carrying both, and a `undefined` property would be dropped by JSON.stringify and read
        // as absent, which is the same thing here but not obviously so at the call site.
        roleRef: isRole ? reference : null,
        personRef: isRole ? null : reference,
        dueDateUtc: toApiDate(this.form.dueDate)
      });
    }
  }
};
</script>

<style lang="scss" scoped>
@import './training-panel';

.trn-assign__title {
  @extend %trn-panel-title;
}
</style>

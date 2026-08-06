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
    <div v-else class="trn-table-scroll">
      <table class="trn-table" data-test="assignments-table">
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
              <span class="trn-ref" :title="row.reference">{{ referenceName(row) }}</span>
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
    </div>

    <form class="trn-form" data-test="assignment-form" @submit.prevent="submit">
      <h3 class="trn-form__title">
        {{ $i('trn_assign_new_title') }}
      </h3>

      <p v-if="versionsUnknown" class="trn-note trn-note--unknown" data-test="assignment-versions-unknown">
        {{ $i('trn_store_versions_unknown') }}
      </p>
      <p v-else-if="!versions.length" class="trn-note" data-test="assignment-no-published">
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
        <TrainingReferenceField
          v-model="form.reference"
          :label="form.scope === 'Role' ? $i('trn_assign_role_ref') : $i('trn_assign_person_ref')"
          :directory="form.scope === 'Role' ? rolesDirectory : peopleDirectory"
          :kind="form.scope === 'Role' ? 'role' : 'person'"
          test-id="assignment-reference"
          :disabled="busy"
        />
        <p class="trn-form__hint" data-test="assignment-reference-note">
          {{ $i('trn_reference_by_value') }}
        </p>
        <p v-if="referenceMalformed" class="trn-note trn-note--blocked" data-test="assignment-reference-malformed">
          {{ $i('trn_reference_malformed') }}
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
import TrainingReferenceField from '~/components/admin/training/TrainingReferenceField.vue';
import { assignmentRow, versionLabel, instantLabel, toApiDate, directoryMatch, isReferenceId } from '~/utils/training/journey';

/**
 * Assigning a published version to a role or to one person — and revoking it.
 *
 * NEITHER REFERENCE ON THIS WRITE IS CHECKED, AND THAT IS WHAT SEPARATES IT FROM THE OTHER TWO.
 * `TrainingAssignmentService.ValidateScope` verifies only that exactly one of `roleRef`/`personRef`
 * is set for the chosen scope; there is no `TrainingPersonBinding` call on this path, unlike the
 * completion and certificate writes, which DO require the person to exist. So the by-value hint here
 * still says what it always said, and it must not be reworded to match the other two panels — an
 * assignment naming a person who does not exist is accepted today.
 *
 * THE PICKER DOES NOT IMPLY THE CHECK THAT IS MISSING. It suggests from the Workforce roster and role
 * catalogue and never constrains the field: `TrainingReferenceField` keeps its text input under every
 * state of the directory, including the 403 a Training manager with no Workforce capability receives.
 * The earlier position — that a picker off another module's read would imply a validation Training
 * does not perform — was answered by keeping the hint rather than by leaving operators to copy GUIDs
 * from another screen.
 *
 * ONLY PUBLISHED VERSIONS ARE OFFERED. `assignableVersions` filters them; a draft or a retired
 * version is a 400 from the server, and a control whose only outcome is a refusal is not a control.
 *
 * THE SET IS THE STORE'S, AND THE NOTE BELOW IT SAYS ONLY WHAT IT KNOWS. This form has no course
 * scope — `POST /assignments` takes a `courseVersionId` and nothing else — so it offers every
 * published version the venue holds, each labelled with its course. It used to be handed the
 * expanded course's versions, which meant that with nothing expanded it announced that no published
 * version existed, to an operator looking at a catalogue full of them. An empty picker now says
 * "publish one first" only when the course list ANSWERED and held none; when the list was refused or
 * has not arrived, it says that instead.
 */
export default {
  name: 'TrainingAssignmentPanel',
  components: { TrainingReferenceField },
  props: {
    /** `readListing(payload, error, 'assignments')`. */
    listing: { type: Object, required: true },
    /** `assignableVersions(storeVersions(coursesListing))` — the STORE's Published versions, not the selection's. */
    versions: { type: Array, default: () => [] },
    /** True when the course list could not be read, so an empty picker means unread and not empty. */
    versionsUnknown: { type: Boolean, default: false },
    /** `personDirectory(...)` / `roleDirectory(...)` — assists, never gates. */
    peopleDirectory: { type: Object, default: () => ({ state: 'unknown', options: [] }) },
    rolesDirectory: { type: Object, default: () => ({ state: 'unknown', options: [] }) },
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
    /**
     * Typed, and not a GUID. Both `RoleRef` and `PersonRef` are `Guid?` on the request, so a
     * non-GUID fails MODEL BINDING — a framework 400 with no `training.*` code, which this page
     * could not attribute to anything. Refused here, where the cause is known.
     */
    referenceMalformed () {
      const typed = this.form.reference.trim();
      return !!typed && !isReferenceId(typed);
    },
    canSubmit () {
      return !this.busy && !!this.form.courseVersionId && isReferenceId(this.form.reference);
    }
  },
  watch: {
    /**
     * A role id left standing after a switch to person scope would be POSTED as a `personRef`, and
     * this is the one write that checks neither reference — so the server would accept it and file
     * an assignment against a person who does not exist. The two scopes name different things, so
     * the field starts empty for the new one.
     */
    'form.scope' () { this.form.reference = ''; }
  },
  methods: {
    label (version) { return versionLabel(version) || this.dash; },
    stamp (instant) {
      return instantLabel(instant, this.locale, this.zoneId) || this.dash;
    },
    /**
     * A filed reference named, when the matching directory can name it. The row's scope decides
     * WHICH directory is consulted — a role id looked up among people would silently find nothing
     * and print as unnamed, which reads as "unknown person" for something that is not a person.
     */
    referenceName (row) {
      if (!row.reference) { return this.dash; }
      const directory = row.scope === 'Role' ? this.rolesDirectory : this.peopleDirectory;
      const match = directoryMatch(directory, row.reference);
      return match ? match.label : row.reference;
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

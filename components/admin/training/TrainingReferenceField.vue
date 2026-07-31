<template>
  <div class="trn-ref-field">
    <label class="trn-form__label">
      {{ label }}
      <input
        :value="value"
        class="trn-form__input"
        type="text"
        :disabled="disabled"
        :data-test="testId"
        @input="$emit('input', $event.target.value)"
      >
    </label>

    <label v-if="options.length" class="trn-form__label trn-ref-field__pick">
      {{ $i(kind === 'role' ? 'trn_pick_role' : 'trn_pick_person') }}
      <select
        class="trn-form__select"
        :value="matchedId"
        :disabled="disabled"
        :data-test="testId + '-picker'"
        @change="pick($event.target.value)"
      >
        <option value="">
          {{ $i('trn_pick_placeholder') }}
        </option>
        <option v-for="option in options" :key="option.id" :value="option.id">
          {{ optionLabel(option) }}
        </option>
      </select>
    </label>

    <p class="trn-form__hint" :data-test="testId + '-directory'">
      {{ directoryNote }}
    </p>
  </div>
</template>

<script>
import { DIRECTORY_ANSWERED, DIRECTORY_REFUSED, directoryMatch, isReferenceId } from '~/utils/training/journey';

/**
 * A `personRef` / `roleRef` field: a text input, plus the Workforce directory as an ASSIST.
 *
 * WHY THE TEXT INPUT NEVER GOES AWAY, under any state of the directory. Three separate reasons, and
 * each on its own is enough:
 *
 *   1. THE DIRECTORY IS ANOTHER MODULE'S READ, WITH ANOTHER MODULE'S AUTHORIZATION. `GET /staff` and
 *      `GET /roles` require the caller's own active engagement to hold `WorkforceScheduler`, which
 *      `WorkforceAuthorizationService` resolves ONLY from engagement grant bits — StoreAdmin does not
 *      satisfy it and PowerUser is explicitly forbidden from standing in. The manager who administers
 *      this store and files its evidence may hold nothing in Workforce at all.
 *   2. THE SUGGESTIONS ARE NOT THE ACCEPTED SET. `TrainingPersonBinding.RequireKnownPersonAsync`
 *      checks that the person EXISTS, estate-wide, in every person state — deliberately not an
 *      employment check. Someone engaged at another store in the chain, or still `Invited`, is
 *      accepted and can never appear in this store's roster.
 *   3. A ROLE REFERENCE IS NOT CHECKED AT ALL. `TrainingAssignmentService.ValidateScope` verifies
 *      only that exactly one of the two references is set for the chosen scope.
 *
 * A picker that closed the field would therefore refuse writes the server accepts, on the strength of
 * a read the caller may not even be allowed to make.
 *
 * WHAT THE SELECT IS BOUND TO IS THE TYPED VALUE, not a separate selection. It shows the matching
 * person when the id in the box is one of them and falls back to the placeholder when it is not, so
 * it doubles as the confirmation that a pasted GUID names somebody — and cannot drift out of step
 * with the field it is helping fill.
 */
export default {
  name: 'TrainingReferenceField',
  props: {
    /** The already-translated field label. */
    label: { type: String, required: true },
    value: { type: String, default: '' },
    /** `personDirectory(...)` / `roleDirectory(...)` — three-state, never collapsed to a list. */
    directory: { type: Object, default: () => ({ state: 'unknown', options: [] }) },
    kind: { type: String, default: 'person' },
    /** The `data-test` of the input; the picker and the note derive theirs from it. */
    testId: { type: String, required: true },
    disabled: { type: Boolean, default: false }
  },
  computed: {
    options () {
      return (this.directory && this.directory.state === DIRECTORY_ANSWERED && this.directory.options) || [];
    },
    matchedId () {
      const match = directoryMatch(this.directory, this.value);
      return match ? match.id : '';
    },
    /**
     * One sentence about the DIRECTORY, and nothing about the rule the reference is subject to —
     * that belongs to the panel, because it differs per write (a completion binds the person, an
     * assignment checks neither reference).
     */
    directoryNote () {
      const state = this.directory && this.directory.state;
      // Refused is a POSITIVE claim — the server declined — so it is asserted only on that exact
      // state. Anything else, an absent prop included, falls through to "we do not know".
      if (state === DIRECTORY_REFUSED) {
        return this.$i(this.kind === 'role' ? 'trn_directory_roles_refused' : 'trn_directory_people_refused');
      }
      if (state !== DIRECTORY_ANSWERED) {
        return this.$i(this.kind === 'role' ? 'trn_directory_roles_unknown' : 'trn_directory_people_unknown');
      }
      if (!this.options.length) {
        return this.$i(this.kind === 'role' ? 'trn_directory_roles_empty' : 'trn_directory_people_empty');
      }

      const match = directoryMatch(this.directory, this.value);
      if (match) { return this.$i('trn_directory_match', { name: match.label }); }

      // Only once something GUID-shaped has been typed. Warning about an id that is still being
      // typed — or one the form is already refusing as malformed — would fire on every keystroke.
      if (isReferenceId(this.value)) {
        return this.$i(this.kind === 'role' ? 'trn_directory_roles_no_match' : 'trn_directory_people_no_match');
      }
      return this.$i(this.kind === 'role' ? 'trn_directory_roles_pick' : 'trn_directory_people_pick');
    }
  },
  methods: {
    /** An empty pick is the placeholder being re-selected; it must not wipe a typed reference. */
    pick (id) {
      if (id) { this.$emit('input', id); }
    },
    optionLabel (option) {
      return option.ended
        ? this.$i(this.kind === 'role' ? 'trn_directory_role_retired' : 'trn_directory_person_ended', { name: option.label })
        : option.label;
    }
  }
};
</script>

<style lang="scss" scoped>
@import './training-panel';

.trn-ref-field__pick {
  margin-top: -4px;
}
</style>

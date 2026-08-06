<template>
  <section class="meals-programs">
    <h2 class="mls-title">
      {{ $i('meals_programs_title') }}
    </h2>

    <p v-if="programsUnknown" class="mls-note mls-note--warn">
      {{ $i(programsRefusalKey) }}
    </p>

    <p v-else-if="programs.isEmpty" class="mls-note">
      {{ $i('meals_programs_none') }}
    </p>

    <table v-else class="mls-table">
      <thead>
        <tr>
          <th scope="col">
            {{ $i('meals_col_program') }}
          </th>
          <th scope="col">
            {{ $i('meals_col_venue') }}
          </th>
          <th scope="col">
            {{ $i('meals_col_currency') }}
          </th>
          <th scope="col">
            {{ $i('meals_col_policy_version') }}
          </th>
          <th scope="col">
            {{ $i('meals_col_enrolled') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in programs.rows"
          :key="row.programId"
          class="mls-row"
          :class="{ 'is-selected': row.programId === selectedProgramId }"
          tabindex="0"
          @click="$emit('select-program', row.programId)"
          @keyup.enter="$emit('select-program', row.programId)"
        >
          <td>
            {{ row.name || dash }}
            <span v-if="row.status !== 'Active'" class="mls-badge mls-badge--off">{{ row.status || dash }}</span>
          </td>
          <!-- A company can hold corridors at several venues, and this read returns ALL its
               programmes. A programme belonging to another store is named as such rather than left
               to look like one of this venue's — publishing a policy against the wrong one is not
               undoable, because a policy version is immutable. -->
          <td>
            {{ row.storeId === null ? dash : row.storeId }}
            <span v-if="!isHere(row)" class="mls-badge mls-badge--warn">{{ $i('meals_program_other_venue') }}</span>
          </td>
          <td>{{ row.currency || dash }}</td>
          <td>{{ row.currentPolicyVersion === null ? $i('meals_policy_none') : row.currentPolicyVersion }}</td>
          <td>{{ row.enrolledMemberCount === null ? dash : row.enrolledMemberCount }}</td>
        </tr>
      </tbody>
    </table>

    <!-- CREATE A PROGRAMME. It hangs off the corridor agreement, not off the store: the programme's
         store, currency and seller all resolve through `agreementId`, and the server refuses an
         agreement that is not Active. -->
    <form v-if="canCreateProgram" class="mls-form" @submit.prevent="submitProgram">
      <h3 class="mls-form__title">
        {{ $i('meals_program_create_title') }}
      </h3>
      <p class="mls-hint">
        {{ $i('meals_program_create_intro') }}
      </p>
      <label class="mls-label">
        {{ $i('meals_field_program_name') }}
        <input v-model="programName" class="mls-input" type="text" :disabled="busy">
      </label>
      <p v-if="programError" class="mls-error">
        {{ $i(programError) }}
      </p>
      <MealsWriteFailure :failure-key="programFailureKey" :detail="programFailureDetail" />
      <button class="mls-btn mls-btn--primary" type="submit" :disabled="busy">
        {{ busy ? $i('meals_saving') : $i('meals_program_create_action') }}
      </button>
    </form>

    <p v-else class="mls-note">
      {{ $i('meals_program_needs_corridor') }}
    </p>

    <!-- PUBLISH A POLICY VERSION. Everything about it is immutable once issued: there is no edit
         route and no delete, and a change is always a new version. -->
    <div v-if="selectedProgram">
      <h3 class="mls-subtitle">
        {{ $i('meals_policy_title', { program: selectedProgram.name || dash }) }}
      </h3>

      <p class="mls-note">
        {{ $i('meals_policy_immutable_note') }}
      </p>

      <!-- The module exposes no route that reads a policy version back: a programme carries its
           LATEST version NUMBER and nothing else. So this panel can say which version is current and
           never what that version says, which is a limit worth naming before somebody supersedes a
           policy they cannot see. -->
      <p class="mls-note mls-note--warn">
        {{ $i('meals_policy_no_read_note') }}
      </p>

      <form class="mls-form" @submit.prevent="submitPolicy">
        <dl class="mls-facts">
          <div>
            <dt>{{ $i('meals_col_currency') }}</dt>
            <dd>{{ selectedProgram.currency || dash }}</dd>
          </div>
          <div>
            <dt>{{ $i('meals_policy_supersedes') }}</dt>
            <dd>
              {{ selectedProgram.currentPolicyVersion === null
                ? $i('meals_policy_none')
                : selectedProgram.currentPolicyVersion }}
            </dd>
          </div>
          <div>
            <dt>{{ $i('meals_policy_new_version') }}</dt>
            <dd>{{ selectedProgram.expectedCurrentVersion + 1 }}</dd>
          </div>
        </dl>
        <p class="mls-hint">
          {{ $i('meals_policy_currency_note') }}
        </p>

        <div class="mls-grid">
          <label class="mls-label">
            {{ $i('meals_field_allowance') }}
            <input v-model="policy.allowance" class="mls-input" type="text" inputmode="decimal" :disabled="busy">
          </label>
          <label class="mls-label">
            {{ $i('meals_field_period') }}
            <select v-model="policy.periodKind" class="mls-select" :disabled="busy">
              <option value="IsoWeek">{{ $i('meals_period_week') }}</option>
              <option value="CalendarMonth">{{ $i('meals_period_month') }}</option>
            </select>
          </label>
        </div>
        <p v-if="allowancePreview" class="mls-hint">
          {{ $i('meals_allowance_preview', { amount: allowancePreview, period: periodLabel }) }}
        </p>

        <fieldset class="mls-fieldset">
          <legend class="mls-label">
            {{ $i('meals_field_weekdays') }}
          </legend>
          <div class="mls-weekdays">
            <label v-for="key in weekdayKeys" :key="key" class="mls-weekday">
              <input v-model="policy.weekdays[key]" type="checkbox" :disabled="busy">
              <span>{{ $i('meals_weekday_' + key) }}</span>
            </label>
          </div>

          <div class="mls-grid">
            <label class="mls-label">
              {{ $i('meals_field_window_start') }}
              <input v-model="policy.windowStart" class="mls-input" type="time" :disabled="busy">
            </label>
            <label class="mls-label">
              {{ $i('meals_field_window_end') }}
              <input v-model="policy.windowEnd" class="mls-input" type="time" :disabled="busy">
            </label>
            <label class="mls-label">
              {{ $i('meals_field_timezone') }}
              <input v-model="policy.timeZoneId" class="mls-input" type="text" list="meals-zone-list" :disabled="busy">
              <datalist id="meals-zone-list">
                <option v-for="zone in zoneOptions" :key="zone" :value="zone" />
              </datalist>
            </label>
          </div>
          <p class="mls-hint">
            {{ $i('meals_policy_zone_note') }}
          </p>
        </fieldset>

        <label class="mls-label">
          {{ $i('meals_field_effective_from') }}
          <input v-model="policy.effectiveFromLocal" class="mls-input" type="datetime-local" :disabled="busy">
        </label>
        <p class="mls-hint">
          {{ $i('meals_policy_effective_note') }}
        </p>

        <p v-if="policyError" class="mls-error">
          {{ $i(policyError) }}
        </p>

        <MealsWriteFailure :failure-key="policyFailureKey" :detail="policyFailureDetail" />

        <button class="mls-btn mls-btn--primary" type="submit" :disabled="busy">
          {{ busy ? $i('meals_saving') : $i('meals_policy_publish_action') }}
        </button>
      </form>
    </div>
  </section>
</template>

<script>
import MealsWriteFailure from '~/components/admin/meals/MealsWriteFailure.vue';
import { DATA_UNKNOWN, WEEKDAY_KEYS, minutesFromClock, weekdayMaskFrom } from '~/utils/meals/admin-view';
import { refusalKey, SCOPE_COMPANY } from '~/utils/meals/refusal-copy';
import { zoneSuggestions } from '~/utils/store-market/market-view';
import { parseRateAmount } from '~/utils/workforce-rates/rate-amount';
import { crossCurrencyLabel } from '~/utils/cross-currency';

/**
 * A company's meal programmes, and the immutable policy versions that price them.
 *
 * NOTHING HERE CAN BE EDITED AFTERWARDS, which is the fact that shapes the whole panel. A policy
 * change is always a NEW version (`CreateMealsPolicyVersionRequest` has no counterpart update
 * route), and `expectedCurrentVersion` is a compare-and-swap against the version the caller believes
 * is latest — a mismatch is `meals.stale-policy-version` (409) rather than a silent renumber. So the
 * form states which version it supersedes and which it will create, before it is submitted.
 *
 * THE CURRENCY IS NOT A CHOICE. It must equal the programme's corridor agreement currency
 * (`meals.currency-mismatch` otherwise), and the server stores the agreement's value regardless of
 * what was sent. It is therefore read off the programme and displayed, never typed.
 *
 * THE ALLOWANCE GOES THROUGH THE SHARED MINOR-UNIT PARSER, with `allowZero` — the Meals server
 * validates `AllowanceMinor >= 0`, unlike the workforce rate that parser was written for, and a
 * client refusing a zero the server accepts would be inventing a rule.
 *
 * THERE IS NO POLICY-VERSION READ. The module exposes no route that lists or fetches a policy
 * version; a programme carries only its LATEST version NUMBER. So this panel can say which version
 * is current and never what that version says — see `meals_policy_no_read_note`.
 */
export default {
  name: 'MealsProgramPanel',
  components: { MealsWriteFailure },
  props: {
    programs: { type: Object, required: true },
    /** The selected company row from the picker, or null. */
    selected: { type: Object, default: null },
    selectedProgramId: { type: String, default: null },
    /** The venue whose corridor a new programme would hang off. */
    storeId: { type: [Number, String], default: null },
    /** The store market's zone, prefilled into the policy window. Null when unknown. */
    defaultTimeZone: { type: String, default: null },
    /** The ISO code this admin's money formatter prints — for the allowance preview only. */
    currency: { type: String, default: null },
    busy: { type: Boolean, default: false },
    programFailureKey: { type: String, default: null },
    programFailureDetail: { type: String, default: null },
    policyFailureKey: { type: String, default: null },
    policyFailureDetail: { type: String, default: null }
  },
  data () {
    return {
      dash: '—',
      weekdayKeys: WEEKDAY_KEYS,
      programName: '',
      programError: null,
      policyError: null,
      policy: {
        allowance: '',
        periodKind: 'CalendarMonth',
        // Monday to Friday: the shape a staff-lunch programme takes by default. Every day is one
        // click away and nothing is hidden — this is a starting point, not a constraint.
        weekdays: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
        windowStart: '11:00',
        windowEnd: '14:00',
        timeZoneId: '',
        effectiveFromLocal: ''
      }
    };
  },
  computed: {
    programsUnknown () {
      return this.programs.state === DATA_UNKNOWN;
    },
    programsRefusalKey () {
      return refusalKey(this.programs.refusal, SCOPE_COMPANY);
    },
    /** A programme can only be created against an ACTIVE corridor of this company at this venue. */
    canCreateProgram () {
      return !!(this.selected && this.selected.agreementId && this.selected.agreementStatus === 'Active');
    },
    selectedProgram () {
      return this.programs.rows.find(row => row.programId === this.selectedProgramId) || null;
    },
    zoneOptions () {
      return zoneSuggestions(this.defaultTimeZone);
    },
    periodLabel () {
      return this.policy.periodKind === 'IsoWeek' ? this.$i('meals_period_week') : this.$i('meals_period_month');
    },
    /**
     * What the typed allowance will be sent as, formatted by the rule the venue page already uses:
     * the admin's own money formatter when the programme's currency IS this market's, and digits
     * plus the ISO code when it is not, because printing "kr" over a franc relabels money.
     */
    allowancePreview () {
      const parsed = parseRateAmount(this.policy.allowance, { allowZero: true });
      if (parsed.error) { return null; }
      const wire = this.selectedProgram && this.selectedProgram.currency;
      if (wire && this.currency && wire !== this.currency) {
        return crossCurrencyLabel(parsed.minor, wire, this);
      }
      return this.priceLabel(parsed.minor);
    }
  },
  watch: {
    defaultTimeZone: {
      immediate: true,
      handler (value) {
        if (value && !this.policy.timeZoneId) { this.policy.timeZoneId = value; }
      }
    },
    // The effective instant is prefilled with NOW when a programme is opened, rather than left blank
    // and defaulted server-side: an omitted `EffectiveFromUtc` binds to `default(DateTime)`, which is
    // year 1 — a policy silently effective since the beginning of time. Prefilled it is visible and
    // editable; blank it would be a trap.
    selectedProgramId: {
      immediate: true,
      handler (value) {
        if (value) { this.policy.effectiveFromLocal = this.nowLocalInput(); }
      }
    }
  },
  methods: {
    isHere (row) {
      return String(row.storeId) === String(this.storeId);
    },

    /** `YYYY-MM-DDTHH:mm` in the reader's own zone, which is what `datetime-local` holds. */
    nowLocalInput () {
      const now = new Date();
      const pad = value => String(value).padStart(2, '0');
      return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) +
        'T' + pad(now.getHours()) + ':' + pad(now.getMinutes());
    },

    submitProgram () {
      this.programError = null;
      if (!String(this.programName || '').trim()) { this.programError = 'meals_err_program_name_required'; return; }
      if (!this.canCreateProgram) { this.programError = 'meals_err_no_active_corridor'; return; }

      this.$emit('create-program', {
        agreementId: this.selected.agreementId,
        name: String(this.programName).trim()
      });
    },

    /**
     * Every guard here is one the server also makes, so a typo costs a sentence rather than a round
     * trip — and none of them relaxes a server rule.
     */
    submitPolicy () {
      this.policyError = null;
      const program = this.selectedProgram;
      if (!program) { return; }

      const parsed = parseRateAmount(this.policy.allowance, { allowZero: true });
      if (parsed.error) { this.policyError = 'meals_err_allowance_' + parsed.error.replace(/-/g, '_'); return; }

      const mask = weekdayMaskFrom(this.policy.weekdays);
      if (mask === 0) { this.policyError = 'meals_err_weekdays_required'; return; }

      const start = minutesFromClock(this.policy.windowStart);
      const end = minutesFromClock(this.policy.windowEnd);
      if (start === null || end === null) { this.policyError = 'meals_err_window_invalid'; return; }
      if (start >= end) { this.policyError = 'meals_err_window_order'; return; }

      const zone = String(this.policy.timeZoneId || '').trim();
      if (!zone) { this.policyError = 'meals_err_timezone_required'; return; }

      // Local wall clock in, UTC instant out. `new Date('2026-08-01T09:30')` — the datetime-local
      // form, with no offset — is read as the READER's own zone by every runtime, and `toISOString`
      // is the only conversion. Nothing here derives a zone for the venue; that is the policy's own
      // `timeZoneId` field and a separate question.
      const effectiveFrom = new Date(this.policy.effectiveFromLocal);
      if (isNaN(effectiveFrom.getTime())) { this.policyError = 'meals_err_effective_from_required'; return; }

      this.$emit('create-policy', {
        programId: program.programId,
        request: {
          expectedCurrentVersion: program.expectedCurrentVersion,
          allowanceMinor: parsed.minor,
          currency: program.currency,
          periodKind: this.policy.periodKind,
          eligibleWeekdaysMask: mask,
          localWindowStartMinutes: start,
          localWindowEndMinutes: end,
          timeZoneId: zone,
          effectiveFromUtc: effectiveFrom.toISOString()
        }
      });
    },

    /** Called by the page once a programme has landed, so the next one starts from a blank name. */
    resetProgram () {
      this.programName = '';
      this.programError = null;
    }
  }
};
</script>

<style lang="scss" scoped>
@import './meals-admin';

.meals-programs {
  margin-bottom: 32px;
}
</style>

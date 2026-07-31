<template>
  <section class="meals-company">
    <h2 class="mls-title">
      {{ $i('meals_company_title') }}
    </h2>

    <!-- CREATE — concierge only. Rendered as a stated refusal rather than a disabled form when this
         account does not hold the authority: a form nobody here can submit is a menu of dead ends,
         and the sentence names which authority is missing instead of leaving a 403 to explain it. -->
    <p v-if="!canConcierge" class="mls-note">
      {{ $i('meals_concierge_only') }}
    </p>

    <form v-else class="mls-form" @submit.prevent="submitCreate">
      <h3 class="mls-form__title">
        {{ $i('meals_company_create_title') }}
      </h3>
      <p class="mls-intro">
        {{ $i('meals_company_create_intro') }}
      </p>

      <div class="mls-grid">
        <label class="mls-label">
          {{ $i('meals_field_orgnr') }}
          <input v-model="create.organizationNumber" class="mls-input" type="text" :disabled="busy">
        </label>

        <label class="mls-label">
          {{ $i('meals_field_country') }}
          <input v-model="create.countryCode" class="mls-input" type="text" maxlength="3" :disabled="busy">
        </label>

        <label class="mls-label">
          {{ $i('meals_field_legal_name') }}
          <input v-model="create.legalName" class="mls-input" type="text" :disabled="busy">
        </label>

        <label class="mls-label">
          {{ $i('meals_field_display_name') }}
          <input v-model="create.displayName" class="mls-input" type="text" :disabled="busy">
        </label>

        <label class="mls-label">
          {{ $i('meals_field_billing_name') }}
          <input v-model="create.billingContactName" class="mls-input" type="text" :disabled="busy">
        </label>

        <label class="mls-label">
          {{ $i('meals_field_billing_email') }}
          <input v-model="create.billingContactEmail" class="mls-input" type="email" :disabled="busy">
        </label>

        <label class="mls-label">
          {{ $i('meals_field_billing_phone') }}
          <input v-model="create.billingContactPhone" class="mls-input" type="tel" :disabled="busy">
        </label>
      </div>

      <!-- THE FIELD THAT DECIDES WHO CAN RUN THE ACCOUNT AFTERWARDS. Company authority resolves ONLY
           from an active CompanyAdmin membership — never from the concierge role that creates the
           company — so naming somebody else here means creating an account this operator can then
           read nothing of. Said in the copy, and defaulted to self so the common case is the safe
           one rather than the one that strands you. -->
      <fieldset class="mls-fieldset">
        <legend class="mls-label">
          {{ $i('meals_field_first_admin') }}
        </legend>
        <p class="mls-hint">
          {{ $i('meals_first_admin_help') }}
        </p>
        <label v-if="selfUserId" class="mls-check">
          <input v-model="adminIsSelf" type="checkbox" :disabled="busy">
          <span>{{ $i('meals_first_admin_self') }}</span>
        </label>
        <p v-if="adminIsSelf && selfUserId" class="mls-ref">
          {{ selfUserId }}
        </p>
        <input
          v-else
          v-model="create.adminApplicationUserId"
          class="mls-input"
          type="text"
          :placeholder="$i('meals_first_admin_placeholder')"
          :disabled="busy"
        >
      </fieldset>

      <p v-if="createError" class="mls-error">
        {{ $i(createError) }}
      </p>

      <MealsWriteFailure :failure-key="createFailureKey" :detail="createFailureDetail" />

      <button class="mls-btn mls-btn--primary" type="submit" :disabled="busy">
        {{ busy ? $i('meals_saving') : $i('meals_company_create_action') }}
      </button>
    </form>

    <!-- EDIT — a different authority plane from the create above (an active CompanyAdmin membership
         of this specific company), so it has its own read, its own refusal and its own failure line,
         and neither half may be read as the other's answer. -->
    <div v-if="selectedCompanyId">
      <h3 class="mls-subtitle">
        {{ $i('meals_company_edit_title') }}
      </h3>

      <p v-if="companyUnknown" class="mls-note mls-note--warn">
        {{ $i(companyRefusalKey) }}
      </p>

      <form v-else class="mls-form" @submit.prevent="submitUpdate">
        <dl class="mls-facts">
          <div>
            <dt>{{ $i('meals_field_legal_name') }}</dt>
            <dd>{{ company.row.legalName || dash }}</dd>
          </div>
          <div>
            <dt>{{ $i('meals_field_orgnr') }}</dt>
            <dd>{{ company.row.organizationNumber || dash }}</dd>
          </div>
          <div>
            <dt>{{ $i('meals_field_country') }}</dt>
            <dd>{{ company.row.countryCode || dash }}</dd>
          </div>
          <div>
            <dt>{{ $i('meals_col_status') }}</dt>
            <dd>{{ statusLabel }}</dd>
          </div>
        </dl>
        <p class="mls-hint">
          {{ $i('meals_company_identity_fixed') }}
        </p>

        <div class="mls-grid">
          <label class="mls-label">
            {{ $i('meals_field_display_name') }}
            <input v-model="edit.displayName" class="mls-input" type="text" :disabled="busy">
          </label>
          <label class="mls-label">
            {{ $i('meals_field_billing_name') }}
            <input v-model="edit.billingContactName" class="mls-input" type="text" :disabled="busy">
          </label>
          <label class="mls-label">
            {{ $i('meals_field_billing_email') }}
            <input v-model="edit.billingContactEmail" class="mls-input" type="email" :disabled="busy">
          </label>
          <label class="mls-label">
            {{ $i('meals_field_billing_phone') }}
            <input v-model="edit.billingContactPhone" class="mls-input" type="tel" :disabled="busy">
          </label>
        </div>

        <p v-if="editError" class="mls-error">
          {{ $i(editError) }}
        </p>

        <MealsWriteFailure :failure-key="editFailureKey" :detail="editFailureDetail" />

        <button class="mls-btn mls-btn--primary" type="submit" :disabled="busy || !hasRevision">
          {{ busy ? $i('meals_saving') : $i('meals_company_edit_action') }}
        </button>
        <p v-if="!hasRevision" class="mls-hint">
          {{ $i('meals_no_revision') }}
        </p>
      </form>
    </div>
  </section>
</template>

<script>
import MealsWriteFailure from '~/components/admin/meals/MealsWriteFailure.vue';
import { DATA_UNKNOWN } from '~/utils/meals/admin-view';
import { refusalKey, SCOPE_COMPANY } from '~/utils/meals/refusal-copy';

/**
 * The buying company account: create it (concierge) and edit what may be edited (company admin).
 *
 * TWO FORMS, TWO AUTHORITIES, ONE SUBJECT — which is why they share a panel and share nothing else.
 * Creating is a platform PowerUser operation; editing resolves from an active `CompanyAdmin`
 * membership of that specific company. The same signed-in person very often holds one and not the
 * other, so each half carries its own refusal and its own failure line.
 *
 * THE EDIT IS A COMPARE-AND-SWAP. `expectedVersion` is the opaque revision from the read above it;
 * a mismatch is a `meals.stale-revision` 409 rather than a silent overwrite. Where the server sent
 * no revision at all (SQLite has no rowversion, so the fast test suite is one such server) the
 * submit is withheld and said out loud, because an edit CAS'd against nothing is an edit that can
 * quietly lose somebody else's change.
 */
export default {
  name: 'MealsCompanyPanel',
  components: { MealsWriteFailure },
  props: {
    /** True when this account holds the platform PowerUser role the create route requires. */
    canConcierge: { type: Boolean, default: false },
    /** The signed-in account's own ApplicationUser id — the default first admin. */
    selfUserId: { type: String, default: null },
    /** The market's country, so the common case is prefilled rather than typed. */
    defaultCountryCode: { type: String, default: null },
    selectedCompanyId: { type: String, default: null },
    company: { type: Object, required: true },
    busy: { type: Boolean, default: false },
    createFailureKey: { type: String, default: null },
    createFailureDetail: { type: String, default: null },
    editFailureKey: { type: String, default: null },
    editFailureDetail: { type: String, default: null }
  },
  data () {
    return {
      dash: '—',
      adminIsSelf: true,
      createError: null,
      editError: null,
      create: {
        organizationNumber: '',
        countryCode: '',
        legalName: '',
        displayName: '',
        billingContactName: '',
        billingContactEmail: '',
        billingContactPhone: '',
        adminApplicationUserId: ''
      },
      edit: {
        displayName: '',
        billingContactName: '',
        billingContactEmail: '',
        billingContactPhone: ''
      }
    };
  },
  computed: {
    companyUnknown () {
      return this.company.state === DATA_UNKNOWN;
    },
    companyRefusalKey () {
      return refusalKey(this.company.refusal, SCOPE_COMPANY);
    },
    hasRevision () {
      return !!(this.company.row && this.company.row.revision);
    },
    statusLabel () {
      const status = this.company.row && this.company.row.status;
      switch (status) {
      case 'Active': return this.$i('meals_status_active');
      case 'Archived': return this.$i('meals_status_archived');
      // A status this client has not heard of is shown verbatim, never mapped onto one it knows.
      default: return status || this.dash;
      }
    }
  },
  watch: {
    defaultCountryCode: {
      immediate: true,
      handler (value) {
        if (value && !this.create.countryCode) { this.create.countryCode = value; }
      }
    },
    // The edit form is refilled whenever a different company is read, so it can never submit one
    // company's display name against another company's revision.
    company: {
      immediate: true,
      deep: true,
      handler (value) {
        const row = (value && value.row) || null;
        this.edit.displayName = (row && row.displayName) || '';
        this.edit.billingContactName = (row && row.billingContactName) || '';
        this.edit.billingContactEmail = (row && row.billingContactEmail) || '';
        this.edit.billingContactPhone = (row && row.billingContactPhone) || '';
      }
    }
  },
  methods: {
    /**
     * The client-side half of the server's own guards, so a missing organisation number costs a
     * sentence rather than a round trip. It never relaxes one: everything checked here is refused by
     * `MealsCompanyService.CreateAsync` too, and the server stays the authority.
     */
    submitCreate () {
      this.createError = null;
      const adminUserId = this.adminIsSelf && this.selfUserId
        ? this.selfUserId
        : String(this.create.adminApplicationUserId || '').trim();

      if (!String(this.create.organizationNumber || '').trim()) { this.createError = 'meals_err_orgnr_required'; return; }
      if (!String(this.create.legalName || '').trim()) { this.createError = 'meals_err_legal_name_required'; return; }
      const country = String(this.create.countryCode || '').trim();
      if (country.length < 2 || country.length > 3) { this.createError = 'meals_err_country_required'; return; }
      if (!adminUserId) { this.createError = 'meals_err_admin_required'; return; }

      this.$emit('create-company', {
        organizationNumber: String(this.create.organizationNumber).trim(),
        countryCode: country.toUpperCase(),
        legalName: String(this.create.legalName).trim(),
        // Omitted rather than blank: the server falls back to the legal name for a missing display
        // name, and an empty string is a value it would store.
        displayName: String(this.create.displayName || '').trim() || undefined,
        billingContactName: String(this.create.billingContactName || '').trim() || undefined,
        billingContactEmail: String(this.create.billingContactEmail || '').trim() || undefined,
        billingContactPhone: String(this.create.billingContactPhone || '').trim() || undefined,
        adminApplicationUserId: adminUserId
      });
    },

    submitUpdate () {
      this.editError = null;
      const row = this.company.row || {};
      if (!String(this.edit.displayName || '').trim()) { this.editError = 'meals_err_display_name_required'; return; }
      if (!row.revision) { this.editError = 'meals_err_no_revision'; return; }

      this.$emit('update-company', {
        displayName: String(this.edit.displayName).trim(),
        billingContactName: String(this.edit.billingContactName || '').trim() || null,
        billingContactEmail: String(this.edit.billingContactEmail || '').trim() || null,
        billingContactPhone: String(this.edit.billingContactPhone || '').trim() || null,
        expectedVersion: row.revision
      });
    },

    /** Called by the page once a create has landed, so the next company starts from a blank form. */
    resetCreate () {
      this.create.organizationNumber = '';
      this.create.legalName = '';
      this.create.displayName = '';
      this.create.billingContactName = '';
      this.create.billingContactEmail = '';
      this.create.billingContactPhone = '';
      this.createError = null;
    }
  }
};
</script>

<style lang="scss" scoped>
@import './meals-admin';

.meals-company {
  margin-bottom: 32px;
}
</style>

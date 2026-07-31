<template>
  <section class="meals-picker">
    <h2 class="mls-title">
      {{ $i('meals_picker_title') }}
    </h2>

    <p class="mls-intro">
      {{ $i('meals_picker_intro') }}
    </p>

    <!-- The read did not answer. NOT the empty state, and never the same element: the empty state
         below makes a claim about this venue, this one makes none.
         It is keyed on the REFUSAL rather than on the unknown state, because the two come apart: a
         company created a moment ago makes this list non-empty while the directory read is still a
         failure, and dropping the caveat then would present one company as though it were the
         venue's whole set. -->
    <p v-if="companies.refusal" class="mls-note mls-note--warn">
      {{ $i(refusalNotice) }}
    </p>

    <p v-if="companies.isEmpty" class="mls-note">
      {{ $i('meals_picker_none') }}
    </p>

    <table v-if="companies.rows.length" class="mls-table">
      <thead>
        <tr>
          <th scope="col">
            {{ $i('meals_col_company') }}
          </th>
          <th scope="col">
            {{ $i('meals_col_orgnr') }}
          </th>
          <th scope="col">
            {{ $i('meals_col_agreement') }}
          </th>
          <th scope="col">
            {{ $i('meals_col_currency') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in companies.rows"
          :key="row.companyId"
          class="mls-row"
          :class="{ 'is-selected': row.isSelected }"
          tabindex="0"
          @click="$emit('select', row.companyId)"
          @keyup.enter="$emit('select', row.companyId)"
        >
          <td>
            <strong>{{ row.label || dash }}</strong>
            <span v-if="row.secondaryName" class="mls-flag">{{ row.secondaryName }}</span>
            <span v-if="row.companyStatus === 'Archived'" class="mls-badge mls-badge--off">{{ $i('meals_company_archived') }}</span>
          </td>
          <td>{{ row.organizationNumber || dash }}</td>
          <td>
            <span v-if="row.hasCorridorHere" class="mls-badge" :class="row.agreementStatus === 'Active' ? 'mls-badge--on' : ''">
              {{ agreementLabel(row) }}
            </span>
            <!-- A company with no corridor at this venue is not a broken row: it is a company that
                 has been created and not yet signed. Naming that is how somebody knows the next
                 step, rather than wondering why the programme form will not appear. -->
            <span v-else class="mls-badge mls-badge--warn">{{ $i('meals_picker_no_corridor') }}</span>
          </td>
          <td>{{ row.currency || dash }}</td>
        </tr>
      </tbody>
    </table>

    <!-- THE GAP THIS FIELD EXISTS FOR. The module exposes no route that lists company accounts: the
         only list is this venue's directory, and a company appears in it only once it has an
         agreement HERE. So a company created in an earlier session and not yet signed is reachable
         by its identifier and by nothing else. Said plainly, and given the one control that recovers
         it, rather than left as a company that silently vanished. -->
    <form class="mls-form" @submit.prevent="submitById">
      <h3 class="mls-form__title">
        {{ $i('meals_picker_by_id_title') }}
      </h3>
      <p class="mls-hint">
        {{ $i('meals_picker_by_id_intro') }}
      </p>
      <label class="mls-label">
        {{ $i('meals_field_company_id') }}
        <input v-model="companyId" class="mls-input" type="text" :placeholder="placeholder">
      </label>
      <p v-if="error" class="mls-error">
        {{ $i(error) }}
      </p>
      <button class="mls-btn" type="submit">
        {{ $i('meals_picker_by_id_action') }}
      </button>
    </form>

    <p v-if="companies.unconfirmedCompanyIds.length" class="mls-note mls-note--warn">
      {{ $i('meals_picker_unconfirmed', { count: companies.unconfirmedCompanyIds.length }) }}
    </p>
  </section>
</template>

<script>
import { refusalKey } from '~/utils/meals/refusal-copy';

// A GUID as the module writes them. Checked here only so a stray paste costs a sentence rather than
// an opaque 404; the server remains the authority on whether the company exists and whether this
// caller may see it.
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Which company account the rest of the page is about.
 *
 * The list is the VENUE's own directory (`GET /v1/stores/{id}/meals/companies`, store scope) plus
 * whatever this browser session has just created — which is the whole of what the module can offer,
 * because it exposes no route that lists company accounts. The refusal therefore keys on the STORE
 * scope, not the company one: this read is gated by the per-store `meals.module` flag, unlike every
 * company-scoped read on the panels below it, and telling somebody the installation is dark when
 * their venue's flag is off would send them to the wrong person.
 */
export default {
  name: 'MealsCompanyPicker',
  props: {
    companies: { type: Object, required: true }
  },
  data () {
    return {
      dash: '—',
      companyId: '',
      error: null,
      placeholder: '00000000-0000-0000-0000-000000000000'
    };
  },
  computed: {
    refusalNotice () {
      return refusalKey(this.companies.refusal);
    }
  },
  methods: {
    agreementLabel (row) {
      switch (row.agreementStatus) {
      case 'Active': return this.$i('meals_agreement_active');
      case 'Ended': return this.$i('meals_agreement_ended');
      // A status this client has not heard of is shown verbatim, never mapped onto one it knows.
      default: return row.agreementStatus || this.dash;
      }
    },
    submitById () {
      this.error = null;
      const value = String(this.companyId || '').trim();
      if (!GUID.test(value)) { this.error = 'meals_err_company_id_invalid'; return; }
      this.$emit('select', value.toLowerCase());
      this.companyId = '';
    }
  }
};
</script>

<style lang="scss" scoped>
@import './meals-admin';

.meals-picker {
  margin-bottom: 32px;
}

.mls-flag {
  display: block;
  font-size: 0.85em;
  color: #64748b;
}
</style>

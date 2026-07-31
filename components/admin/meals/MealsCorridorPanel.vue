<template>
  <section class="meals-corridor">
    <h2 class="mls-title">
      {{ $i('meals_corridor_title') }}
    </h2>

    <p class="mls-intro">
      {{ $i('meals_corridor_intro') }}
    </p>

    <!-- The corridor this company already has AT THIS VENUE, straight off the venue directory. It is
         shown before the form because signing a second ACTIVE corridor for the same company, store
         and currency is refused by a unique index — the fix is to end the first one, and there is no
         route on this surface that can. -->
    <dl v-if="selected && selected.hasCorridorHere" class="mls-facts">
      <div>
        <dt>{{ $i('meals_col_agreement') }}</dt>
        <dd class="mls-ref">
          {{ selected.agreementId }}
        </dd>
      </div>
      <div>
        <dt>{{ $i('meals_col_status') }}</dt>
        <dd>
          <span class="mls-badge" :class="agreementBadgeClass">{{ agreementStatusLabel }}</span>
        </dd>
      </div>
      <div>
        <dt>{{ $i('meals_col_currency') }}</dt>
        <dd>{{ selected.currency || dash }}</dd>
      </div>
    </dl>

    <p v-if="hasActiveCorridor" class="mls-note">
      {{ $i('meals_corridor_exists') }}
    </p>

    <!-- Signing is a concierge operation. Same treatment as the company create: a stated refusal
         rather than a form this account cannot submit. -->
    <p v-if="!canConcierge" class="mls-note">
      {{ $i('meals_concierge_only') }}
    </p>

    <!-- THE CURRENCY IS NOT A FIELD, and that is the market-authority law rather than a shortcut.
         The corridor's currency is part of its identity `(company, store, currency)` and every
         policy version under it must match; a corridor signed in the wrong currency cannot be
         edited, only ended and re-signed. The store's market is the single source for what this
         venue sells in, so it is derived and shown — and when the market has not answered, signing
         is withheld rather than guessed. -->
    <p v-else-if="!currency" class="mls-note mls-note--warn">
      {{ $i('meals_corridor_no_currency') }}
    </p>

    <form v-else class="mls-form" @submit.prevent="submit">
      <h3 class="mls-form__title">
        {{ $i('meals_corridor_sign_title') }}
      </h3>

      <dl class="mls-facts">
        <div>
          <dt>{{ $i('meals_col_currency') }}</dt>
          <dd>{{ currency }}</dd>
        </div>
        <div>
          <dt>{{ $i('meals_corridor_effective_from') }}</dt>
          <dd>{{ $i('meals_corridor_effective_now') }}</dd>
        </div>
      </dl>
      <p class="mls-hint">
        {{ $i('meals_corridor_currency_note') }}
      </p>

      <div class="mls-grid">
        <label class="mls-label">
          {{ $i('meals_field_seller_legal_name') }}
          <input v-model="form.sellerLegalName" class="mls-input" type="text" :disabled="busy">
        </label>
        <label class="mls-label">
          {{ $i('meals_field_seller_orgnr') }}
          <input v-model="form.sellerOrganizationNumber" class="mls-input" type="text" :disabled="busy">
        </label>
        <label class="mls-label">
          {{ $i('meals_field_seller_vat') }}
          <input v-model="form.sellerVatStatus" class="mls-input" type="text" :disabled="busy">
        </label>
        <label class="mls-label">
          {{ $i('meals_field_seller_address') }}
          <input v-model="form.sellerAddress" class="mls-input" type="text" :disabled="busy">
        </label>
      </div>

      <label class="mls-label">
        {{ $i('meals_field_price_terms') }}
        <input v-model="form.pilotPriceTerms" class="mls-input" type="text" :disabled="busy">
      </label>

      <p class="mls-hint">
        {{ $i('meals_corridor_immutable_note') }}
      </p>

      <p v-if="error" class="mls-error">
        {{ $i(error) }}
      </p>

      <MealsWriteFailure :failure-key="failureKey" :detail="failureDetail" />

      <!-- Gated on the company IDENTIFIER, not on the directory row. Signing is a concierge
           operation and reading the company is a company-admin one, so a concierge who is not this
           company's admin gets a 403 on the read and may still sign — gating on `selected` would
           have made exactly that person unable to do the only thing they are here for. -->
      <button class="mls-btn mls-btn--primary" type="submit" :disabled="busy || !companyId">
        {{ busy ? $i('meals_saving') : $i('meals_corridor_sign_action') }}
      </button>
    </form>
  </section>
</template>

<script>
import MealsWriteFailure from '~/components/admin/meals/MealsWriteFailure.vue';

/**
 * Signing the `(company, store, currency)` corridor agreement the whole module hangs off.
 *
 * WHY THE STORE IS NEVER A FIELD HERE. The route is
 * `POST /v1/stores/{storeId}/meals/companies/{companyId}/agreements` and the request model carries
 * no store at all: the store in the path is both what the per-store `meals.module` gate is resolved
 * from and what the row is written against, so there is exactly one place the corridor's store can
 * come from. This panel takes the venue the admin has selected and nothing else.
 *
 * WHY `effectiveFromUtc` IS NOT SENT. The field is optional and the server resolves the signing
 * instant INSIDE the idempotency envelope, precisely so a retry replays rather than hashing a fresh
 * clock reading into a different command. A client that filled it from `Date.now()` would move that
 * hazard back out to where it cannot be fixed, so the corridor takes effect at signing and the form
 * says so instead of offering a date it has no reason to vary.
 *
 * THE SELLER SNAPSHOT IS IMMUTABLE. There is no update route for an agreement — superseding one is
 * Ended-then-sign — and no route on this surface can end one. So the four seller fields are stated
 * once and permanently, which is what the note above the button says out loud.
 */
export default {
  name: 'MealsCorridorPanel',
  components: { MealsWriteFailure },
  props: {
    /** The selected company's identifier — all the signing route needs. */
    companyId: { type: String, default: null },
    /** Its directory row, when the venue has one. Used ONLY to show the corridor that exists. */
    selected: { type: Object, default: null },
    canConcierge: { type: Boolean, default: false },
    /** The store market's currency — the single source, never typed here. Null when unknown. */
    currency: { type: String, default: null },
    busy: { type: Boolean, default: false },
    failureKey: { type: String, default: null },
    failureDetail: { type: String, default: null }
  },
  data () {
    return {
      dash: '—',
      error: null,
      form: {
        sellerLegalName: '',
        sellerOrganizationNumber: '',
        sellerVatStatus: '',
        sellerAddress: '',
        pilotPriceTerms: ''
      }
    };
  },
  computed: {
    hasActiveCorridor () {
      return !!(this.selected && this.selected.agreementStatus === 'Active');
    },
    agreementStatusLabel () {
      const status = this.selected && this.selected.agreementStatus;
      switch (status) {
      case 'Active': return this.$i('meals_agreement_active');
      case 'Ended': return this.$i('meals_agreement_ended');
      default: return status || this.dash;
      }
    },
    agreementBadgeClass () {
      return this.hasActiveCorridor ? 'mls-badge--on' : 'mls-badge';
    }
  },
  methods: {
    submit () {
      this.error = null;
      if (!this.companyId) { return; }
      if (!String(this.form.sellerLegalName || '').trim()) { this.error = 'meals_err_seller_name_required'; return; }
      if (!String(this.form.sellerOrganizationNumber || '').trim()) { this.error = 'meals_err_seller_orgnr_required'; return; }
      if (!this.currency) { this.error = 'meals_err_currency_required'; return; }

      this.$emit('sign-agreement', {
        currency: this.currency,
        sellerLegalName: String(this.form.sellerLegalName).trim(),
        sellerOrganizationNumber: String(this.form.sellerOrganizationNumber).trim(),
        sellerVatStatus: String(this.form.sellerVatStatus || '').trim() || null,
        sellerAddress: String(this.form.sellerAddress || '').trim() || null,
        pilotPriceTerms: String(this.form.pilotPriceTerms || '').trim() || null
      });
    }
  }
};
</script>

<style lang="scss" scoped>
@import './meals-admin';

.meals-corridor {
  margin-bottom: 32px;
}
</style>

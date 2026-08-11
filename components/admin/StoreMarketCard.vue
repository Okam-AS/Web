<template>
  <!-- The root keeps the dashboard's `store-card` class so this sits in the Butikkinformasjon grid
       with the same frame as its siblings (Vue 2 applies the PARENT's scope id to a child's root
       element, so the grid's card frame is inherited rather than copied). Everything inside is this
       component's own. -->
  <section class="store-card market-card">
    <div class="market-card__header">
      <div class="market-card__icon-wrapper">
        <svg class="market-card__icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c2.485 0 4.5-4.03 4.5-9s-2.015-9-4.5-9m0 18c-2.485 0-4.5-4.03-4.5-9s2.015-9 4.5-9m0 0a9 9 0 019 9" />
        </svg>
      </div>
      <h3 class="market-card__title">
        {{ $i('sm_card_title') }}
      </h3>
    </div>

    <div class="market-card__body">
      <p v-if="loading" class="market-card__muted">
        {{ $i('sm_loading') }}
      </p>

      <p v-else-if="!storeId" class="market-card__muted">
        {{ $i('sm_no_store') }}
      </p>

      <p v-else-if="!market" class="market-card__refusal market-card__refusal--blocked">
        {{ $i('sm_read_failed') }}
      </p>

      <template v-else>
        <dl class="market-card__facts">
          <div class="market-card__fact">
            <dt>{{ $i('sm_field_country') }}</dt>
            <dd>{{ market.country || $i('sm_not_set') }}</dd>
          </div>
          <div class="market-card__fact">
            <dt>{{ $i('sm_field_currency') }}</dt>
            <!-- The EFFECTIVE currency, badged when nobody chose it — the same treatment the zone row
                 below gets, and it was not getting it. This showed `currencyCode` alone, which is the
                 STORED choice and is null on a store that has never been configured: a live NO store
                 rendered its currency as "not set" while the platform was charging it in NOK. Neither
                 half alone is the truth. What it trades in is money, so the figure it is trading in
                 has to be on screen, and whether anyone chose it has to be on screen beside it. -->
            <dd>
              {{ market.currencyCode || market.effectiveCurrencyCode || $i('sm_not_set') }}
              <span v-if="facts.usesPlatformDefaultCurrency" class="market-card__badge">{{ $i('sm_zone_is_platform_default') }}</span>
              <span class="market-card__hint">{{ $i('sm_currency_is_derived') }}</span>
            </dd>
          </div>
          <div class="market-card__fact">
            <dt>{{ $i('sm_field_zone') }}</dt>
            <dd>
              {{ market.timeZone || market.effectiveTimeZone || $i('sm_not_set') }}
              <span v-if="facts.usesPlatformDefaultZone" class="market-card__badge">{{ $i('sm_zone_is_platform_default') }}</span>
              <!-- The platform reports that it does not read this column. Saying so ON the value,
                   rather than only in the warning below, is the point: the row otherwise reads as a
                   setting that governs something. -->
              <span v-if="facts.zoneIsIgnored" class="market-card__badge">{{ $i('sm_zone_ignored_badge') }}</span>
            </dd>
          </div>
        </dl>

        <!-- A self-contradicting market row is the most serious thing this card can be looking at:
             every consumer money read throws until it is repaired. It goes ABOVE the other warnings
             because it is the one an operator must act on, and it names the repair. -->
        <p v-if="facts.rowIsInconsistent" class="market-card__refusal market-card__refusal--blocked">
          {{ $i('sm_row_inconsistent_warning', { currency: market.effectiveCurrencyCode || $i('sm_not_set') }) }}
        </p>

        <p v-if="!facts.hasCountry" class="market-card__warning">
          {{ $i('sm_no_country_warning') }}
        </p>

        <p v-else-if="!facts.countryHasRulePack" class="market-card__warning">
          {{ $i('sm_no_rulepack_warning', { country: market.country }) }}
        </p>

        <p v-if="facts.usesPlatformDefaultZone" class="market-card__warning">
          {{ $i('sm_zone_fallback_warning', { zone: market.effectiveTimeZone }) }}
        </p>

        <!-- Not the same warning as the one above, and both can be true at once. That one says
             nobody CHOSE a zone; this one says the platform does not READ the zone at all. An
             operator who fixes the first and is not told the second has changed nothing and has
             every reason to believe they have. -->
        <p v-if="facts.zoneIsIgnored" class="market-card__warning">
          {{ $i('sm_zone_ignored_warning') }}
        </p>

        <p v-if="saved" class="market-card__saved">
          {{ $i('sm_saved') }}
        </p>

        <button v-if="!editing" type="button" class="market-card__action" @click="startEdit">
          {{ $i('common_edit') }}
        </button>

        <form v-else class="market-card__form" @submit.prevent="save">
          <div class="market-card__field">
            <label class="market-card__label" for="store-market-country">{{ $i('sm_field_country') }}</label>
            <select id="store-market-country" v-model="draft.country" class="market-card__input">
              <option value="">
                {{ $i('sm_choose') }}
              </option>
              <option v-for="option in countryChoices" :key="option.country" :value="option.country">
                <template v-if="option.offered">
                  {{ option.country }}
                </template>
                <template v-else>
                  {{ $i('sm_country_not_offered', { country: option.country }) }}
                </template>
              </option>
            </select>
            <p class="market-card__hint">
              {{ $i('sm_country_help') }}
            </p>
            <!-- The point of choosing. A country with no seeded rule pack saves cleanly and then
                 refuses every schedule from the draft onward; that is said HERE rather than being
                 discovered two screens away. -->
            <p v-if="chosenOption && !chosenOption.hasRulePack" class="market-card__warning">
              {{ $i('sm_choice_no_rulepack_warning', { country: chosenOption.country }) }}
            </p>
          </div>

          <!-- The currency is a CONSEQUENCE, never a field: under the market-authority law the market
               is the source and `Store.CurrencyCode` derives from it. What is shown here is this
               page's EXPECTATION, and it is submitted as `expectedCurrencyCode` so the platform
               refuses a disagreement loudly instead of this page quietly being believed. -->
          <p class="market-card__consequence">
            <template v-if="expectedCurrency">
              {{ $i('sm_currency_consequence', { currency: expectedCurrency }) }}
            </template>
            <template v-else>
              {{ $i('sm_currency_consequence_unknown') }}
            </template>
          </p>

          <div class="market-card__field">
            <label class="market-card__label" for="store-market-zone">{{ $i('sm_field_zone') }}</label>
            <input
              id="store-market-zone"
              v-model="draft.timeZone"
              class="market-card__input"
              type="text"
              autocomplete="off"
              spellcheck="false"
              list="store-market-zones"
              :placeholder="$i('sm_zone_placeholder')"
            >
            <datalist id="store-market-zones">
              <option v-for="zone in zoneChoices" :key="zone" :value="zone" />
            </datalist>
            <p class="market-card__hint">
              {{ $i('sm_zone_help') }}
            </p>
            <p v-if="facts.usesPlatformDefaultZone" class="market-card__hint">
              {{ $i('sm_zone_help_current_default', { zone: market.effectiveTimeZone }) }}
            </p>
          </div>

          <div class="market-card__actions">
            <button type="submit" class="market-card__btn market-card__btn--primary" :disabled="saving">
              {{ saving ? $i('sm_saving') : $i('common_save') }}
            </button>
            <button type="button" class="market-card__btn" :disabled="saving" @click="cancelEdit">
              {{ $i('common_cancel') }}
            </button>
          </div>
        </form>

        <div
          v-if="refusal"
          class="market-card__refusal"
          :class="isOperatingRefusal ? 'market-card__refusal--operating' : 'market-card__refusal--blocked'"
        >
          <p class="market-card__refusal-heading">
            {{ $i(refusalHeading) }}
          </p>
          <p class="market-card__refusal-body">
            {{ $i(refusal.key, refusal.params) }}
            <template v-if="refusal.params.currentIsFallback">
              ({{ $i('sm_zone_is_platform_default') }})
            </template>
          </p>
          <p class="market-card__refusal-note">
            {{ $i('sm_unchanged_note') }}
          </p>
          <p v-if="refusal.platformDetail" class="market-card__refusal-detail">
            <span class="market-card__refusal-detail-label">{{ $i('sm_platform_said') }}</span>
            {{ refusal.platformDetail }}
          </p>
        </div>
      </template>
    </div>
  </section>
</template>

<script>
import { StoreMarketService } from '~/utils/store-market/market-client';
import {
  classifyRefusal,
  countryOptions,
  marketFacts,
  optionFor,
  zoneSuggestions,
  REFUSAL_OPERATING
} from '~/utils/store-market/market-view';
import { markets } from '~/config/edition';

// The market card on the dashboard's Butikkinformasjon grid: `Store.Country`, the currency that
// market implies, and the time zone this venue's business dates are cut in.
//
// WHY IT IS A CARD AND NOT A PAGE. The three values are store settings in exactly the sense the
// address and the opening hours are, and the dashboard already gathers those. A venue owner whose
// Workforce publish is refused for want of a country has no reason to go looking for a separate
// page; the setting belongs where they already edit the venue's other facts.
//
// WHAT IT DELIBERATELY DOES NOT DO. It offers no currency input, because there is nothing to input:
// the currency derives from the market on the server. And it blocks no save of its own — an empty
// zone or a country the platform will not accept is SENT and the platform's refusal is rendered,
// rather than being pre-empted by a second copy of the same rule that could drift from it. The only
// thing that disables the button is a save already in flight.
export default {
  name: 'StoreMarketCard',
  props: {
    // `[Number, String]` matching every other admin panel that takes one: the selected store comes
    // from a Vuex value that is a number when rehydrated and can arrive as a select's string value.
    storeId: {
      type: [Number, String],
      default: null
    }
  },
  data () {
    return {
      market: null,
      loading: false,
      editing: false,
      saving: false,
      saved: false,
      refusal: null,
      draft: { country: '', timeZone: '' }
    };
  },
  computed: {
    _marketService () {
      return new StoreMarketService(this._coreInitializer);
    },
    facts () {
      return marketFacts(this.market);
    },
    // The platform's own `offeredCountries` is the offer; the registry supplies the currency each of
    // them means. Passing it is what makes Switzerland selectable — before this the card intersected
    // the registry with the Workforce rule-pack list and silently dropped every market but Norway.
    countryChoices () {
      return countryOptions(
        markets,
        this.market && this.market.country,
        this.market && this.market.offeredCountries
      );
    },
    chosenOption () {
      return optionFor(this.countryChoices, this.draft.country);
    },
    // The currency the chosen market implies, as this page understands it. Null when the choice is
    // the store's own out-of-registry country: the page holds no expectation for it, and the
    // platform's derivation stands alone.
    expectedCurrency () {
      return this.chosenOption ? this.chosenOption.expectedCurrencyCode : null;
    },
    zoneChoices () {
      return zoneSuggestions(this.market && this.market.timeZone);
    },
    // A 409 says the store is OPERATING; everything else says the save did not happen. The two get
    // different headings and different colours because they are different events, and one of them is
    // not something the operator can fix by typing anything else.
    isOperatingRefusal () {
      return !!this.refusal && this.refusal.kind === REFUSAL_OPERATING;
    },
    refusalHeading () {
      return this.isOperatingRefusal ? 'sm_operating_heading' : 'sm_not_saved_heading';
    }
  },
  watch: {
    storeId: {
      immediate: true,
      handler (storeId) {
        this.editing = false;
        this.refusal = null;
        this.saved = false;
        this.market = null;
        if (storeId) {
          this.load(storeId);
        }
      }
    }
  },
  methods: {
    async load (storeId) {
      this.loading = true;
      try {
        this.market = await this._marketService.Get(storeId);
      } catch (error) {
        // A failed READ leaves `market` null, which the template renders as "we could not read it" —
        // deliberately not as "this store has no market". The two are different facts.
        this.market = null;
      } finally {
        this.loading = false;
      }
    },

    startEdit () {
      this.refusal = null;
      this.saved = false;
      this.draft = {
        country: (this.market && this.market.country) || '',
        // Seeded from the CHOSEN zone only. `effectiveTimeZone` is what the platform falls back to
        // when nobody chose one, and pre-filling it would let a save turn the platform's default
        // into this venue's decision without anybody making it — the exact thing the backend refuses
        // to do on the caller's behalf.
        timeZone: (this.market && this.market.timeZone) || ''
      };
      this.editing = true;
    },

    cancelEdit () {
      this.editing = false;
      this.refusal = null;
    },

    async save () {
      const attempted = {
        country: this.draft.country,
        timeZone: this.draft.timeZone,
        expectedCurrencyCode: this.expectedCurrency
      };

      this.saving = true;
      this.refusal = null;
      this.saved = false;
      try {
        // The PUT answers with the market as it now stands, so the card shows the new state without
        // a re-read and without a manual refresh.
        this.market = await this._marketService.Update(this.storeId, attempted);
        this.editing = false;
        this.saved = true;
      } catch (error) {
        // A refusal carries the store's UNCHANGED market. Adopting it keeps the facts above the form
        // true, and it is the same state the two 409 sentences quote, so what the operator reads and
        // what the card displays cannot disagree.
        if (error && error.market) {
          this.market = error.market;
        }
        this.refusal = classifyRefusal(error, attempted, this.market);
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.market-card {
  display: flex;
  flex-direction: column;
}

.market-card__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.market-card__icon-wrapper {
  background-color: rgba(41, 44, 52, 0.1);
  border-radius: 0.5rem;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.market-card__icon {
  width: 1.5rem;
  height: 1.5rem;
  color: #292c34;
}

.market-card__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #292c34;
  margin: 0;
}

.market-card__body {
  padding: 1.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.market-card__muted {
  margin: 0;
  color: #64748b;
  font-size: 0.95em;
}

.market-card__facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.market-card__fact {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  dt {
    font-size: 0.8em;
    font-weight: 600;
    color: #292c34;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  dd {
    margin: 0;
    font-size: 0.95em;
    color: #292c34;
  }
}

.market-card__hint {
  display: block;
  font-size: 0.8em;
  color: #64748b;
  font-style: italic;
  margin-top: 0.25rem;
}

.market-card__badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.125rem 0.5rem;
  border-radius: 6px;
  background: #fef3c7;
  color: #92400e;
  font-size: 0.75em;
  font-weight: 600;
  font-style: normal;
}

.market-card__warning {
  margin: 0;
  padding: 0.75rem;
  border-radius: 8px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  font-size: 0.85em;
}

.market-card__saved {
  margin: 0;
  padding: 0.75rem;
  border-radius: 8px;
  background: rgba(27, 183, 118, 0.08);
  border: 1px solid rgba(27, 183, 118, 0.35);
  color: #159f63;
  font-size: 0.85em;
  font-weight: 600;
}

.market-card__action {
  align-self: flex-start;
  background: white;
  color: #292c34;
  border: 2px solid #e2e8f0;
  padding: 0.625rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.9em;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f8f9fa;
    border-color: #cbd5e0;
  }
}

.market-card__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.market-card__field {
  display: flex;
  flex-direction: column;
}

.market-card__label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.8em;
  font-weight: 600;
  color: #292c34;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.market-card__input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  font-size: 0.95em;
  color: #292c34;
  transition: all 0.2s ease;

  &:hover {
    border-color: #cbd5e0;
  }

  &:focus {
    outline: none;
    border-color: #1bb776;
    box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
  }
}

.market-card__consequence {
  margin: 0;
  padding: 0.75rem;
  border-radius: 8px;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  color: #292c34;
  font-size: 0.9em;
  font-weight: 600;
}

.market-card__actions {
  display: flex;
  gap: 0.75rem;
}

.market-card__btn {
  background: white;
  color: #292c34;
  border: 2px solid #e2e8f0;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.9em;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #f8f9fa;
    border-color: #cbd5e0;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.market-card__btn--primary {
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  border-color: transparent;
  color: white;
  font-weight: 600;

  &:hover:not(:disabled) {
    box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);
  }

  &:disabled {
    background: #cbd5e0;
    box-shadow: none;
  }
}

.market-card__refusal {
  margin: 0;
  padding: 0.875rem;
  border-radius: 8px;
  font-size: 0.85em;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* A 400, a denial, or no answer at all: the save did not happen and the values are the place to
   look. Red, because it reads as a validation failure and it is one. */
.market-card__refusal--blocked {
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #b91c1c;
}

/* A 409: the shape was fine and the store is OPERATING. Deliberately NOT red — nothing in the form
   is wrong, and a red box here would send a venue owner hunting for a typo that does not exist. */
.market-card__refusal--operating {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #78350f;
}

.market-card__refusal-heading {
  margin: 0;
  font-weight: 700;
  font-size: 1em;
}

.market-card__refusal-body,
.market-card__refusal-note,
.market-card__refusal-detail {
  margin: 0;
}

.market-card__refusal-note {
  font-weight: 600;
}

.market-card__refusal-detail {
  font-size: 0.95em;
  opacity: 0.85;
}

.market-card__refusal-detail-label {
  font-weight: 600;
  margin-right: 0.25rem;
}
</style>

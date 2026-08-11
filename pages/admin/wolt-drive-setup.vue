<template>
  <AdminPage>
    <div class="wds">
      <div class="page-header">
        <h1>{{ $i('woltDriveSetup_title') }}</h1>
        <p class="page-description">{{ $i('woltDriveSetup_pageDescription') }}</p>
      </div>

      <!-- Step 1: pick the store by its Okam ID (the partner_venue_id given to Wolt) -->
      <section class="card">
        <h2>{{ $i('woltDriveSetup_step1') }}</h2>
        <form
          class="store-lookup"
          @submit.prevent="fetchStore"
        >
          <div class="field">
            <label for="store-id">{{ $i('woltDriveSetup_storeIdLabel') }}</label>
            <input
              id="store-id"
              v-model.number="storeIdInput"
              type="number"
              min="1"
              step="1"
              inputmode="numeric"
              :placeholder="$i('woltDriveSetup_storeIdPlaceholder')"
            />
          </div>
          <button
            class="btn btn-primary"
            type="submit"
            :disabled="!storeIdInput || isFetching"
          >
            {{ isFetching ? $i('woltDriveSetup_fetching') : $i('woltDriveSetup_fetch') }}
          </button>
        </form>

        <div
          v-if="lookupError"
          class="notification notification--error"
        >
          {{ lookupError }}
        </div>

        <div
          v-if="store"
          class="store-summary"
        >
          <div class="store-summary__name">
            <span class="store-summary__id">#{{ store.id }}</span>
            {{ store.name }}
          </div>
          <div
            v-if="store.address"
            class="store-summary__address"
          >
            {{ store.address.fullAddress }}, {{ store.address.zipCode }} {{ store.address.city }}
          </div>
          <div class="badges">
            <span :class="['badge', store.woltDriveIsConfigured ? 'badge--ok' : 'badge--missing']">
              {{ store.woltDriveIsConfigured ? $i('woltDriveSetup_driveConfigured') : $i('woltDriveSetup_driveNotConfigured') }}
            </span>
            <span :class="['badge', store.woltDriveEnabled ? 'badge--ok' : 'badge--neutral']">
              {{ store.woltDriveEnabled ? $i('woltDriveSetup_driveEnabled') : $i('woltDriveSetup_driveDisabled') }}
            </span>
            <span :class="['badge', marketplaceConnected ? 'badge--ok' : 'badge--neutral']">
              {{ marketplaceConnected ? $i('woltDriveSetup_marketplaceConnected') : $i('woltDriveSetup_marketplaceNotConnected') }}
            </span>
          </div>
          <div
            v-if="marketplaceVenueId"
            class="store-summary__marketplace"
          >
            {{ $i('woltDriveSetup_marketplaceVenueId') }}: <code>{{ marketplaceVenueId }}</code>
          </div>
        </div>
      </section>

      <!-- Step 2: the three Wolt Drive credentials -->
      <section
        v-if="store"
        class="card"
      >
        <h2>{{ $i('woltDriveSetup_step2') }}</h2>

        <form @submit.prevent="save">
          <div class="field">
            <label for="venue-id">{{ $i('woltDriveSetup_venueIdLabel') }}</label>
            <input
              id="venue-id"
              v-model.trim="form.venueId"
              type="text"
              autocomplete="off"
              spellcheck="false"
              placeholder="6a71ca4d85091e2714dc4774"
            />
            <button
              v-if="marketplaceVenueId && form.venueId !== marketplaceVenueId"
              class="link-btn"
              type="button"
              @click="form.venueId = marketplaceVenueId"
            >
              {{ $i('woltDriveSetup_useMarketplaceVenueId') }}
            </button>
          </div>

          <div class="field">
            <label for="merchant-id">{{ $i('woltDriveSetup_merchantIdLabel') }}</label>
            <input
              id="merchant-id"
              v-model.trim="form.merchantId"
              type="text"
              autocomplete="off"
              spellcheck="false"
            />
            <p class="field-hint">{{ $i('woltDriveSetup_sharedCredentialsHint') }}</p>
          </div>

          <div class="field">
            <label for="merchant-key">{{ $i('woltDriveSetup_merchantKeyLabel') }}</label>
            <input
              id="merchant-key"
              v-model.trim="form.merchantKey"
              type="password"
              autocomplete="off"
              spellcheck="false"
            />
            <p
              v-if="prefilledFromEnv"
              class="field-hint"
            >
              {{ $i('woltDriveSetup_prefilledFromEnv') }}
            </p>
          </div>

          <h2 class="section-divider">{{ $i('woltDriveSetup_step3') }}</h2>
          <p class="field-hint">{{ $i('woltDriveSetup_feesHint') }}</p>

          <div class="field">
            <label for="fee-percent">{{ $i('woltDriveSetup_deliveryFeePercentLabel') }}</label>
            <input
              id="fee-percent"
              v-model.number="fees.woltDeliveryFeePercent"
              type="number"
              min="0"
              step="0.1"
            />
          </div>

          <div class="field">
            <label for="customer-fee">{{ $i('woltDriveSetup_customerDeliveryFeeLabel') }}</label>
            <input
              id="customer-fee"
              v-model.number="fees.woltCustomerDeliveryFeeAmount"
              type="number"
              min="0"
              step="100"
            />
            <p class="field-hint">{{ $i('woltDriveSetup_oreHint', { kroner: formatKroner(fees.woltCustomerDeliveryFeeAmount) }) }}</p>
          </div>

          <div class="field">
            <label for="service-fee">{{ $i('woltDriveSetup_serviceFeeLabel') }}</label>
            <input
              id="service-fee"
              v-model.number="fees.woltServiceFeeAmount"
              type="number"
              min="0"
              step="100"
            />
            <p class="field-hint">{{ $i('woltDriveSetup_oreHint', { kroner: formatKroner(fees.woltServiceFeeAmount) }) }}</p>
          </div>

          <div class="notification notification--warning">
            {{ $i('woltDriveSetup_webhookWarning') }}
          </div>

          <div class="form-actions">
            <button
              class="btn btn-primary"
              type="submit"
              :disabled="!canSave || isSaving"
            >
              {{ isSaving ? $i('woltDriveSetup_saving') : $i('woltDriveSetup_save') }}
            </button>
          </div>

          <div
            v-if="saveError"
            class="notification notification--error"
          >
            {{ saveError }}
          </div>
          <div
            v-if="saveSuccess"
            class="notification notification--success"
          >
            {{ $i('woltDriveSetup_saved') }}
          </div>
        </form>
      </section>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from "~/components/organisms/AdminPage.vue";

// The merchant id is shared across all Okam venues, so it is worth remembering between visits.
// The merchant key is a secret and is deliberately never persisted in the browser.
const MERCHANT_ID_STORAGE_KEY = "okam.woltDrive.merchantId";

// Both credentials are identical for every Okam store, so a local run can prefill them from the
// shell environment (WOLT_DRIVE_MERCHANT_ID / WOLT_DRIVE_MERCHANT_KEY). They are never committed
// and are absent from the production build, where the fields stay empty.
const ENV_MERCHANT_ID = process.env.WOLT_DRIVE_MERCHANT_ID || "";
const ENV_MERCHANT_KEY = process.env.WOLT_DRIVE_MERCHANT_KEY || "";

// Standard Wolt fees for a new venue. Amounts are in øre, matching the backend. A store that already
// has non-zero values keeps them; these only fill in the blanks.
const DEFAULT_FEES = {
  woltDeliveryFeePercent: 17.5,
  woltCustomerDeliveryFeeAmount: 7500,
  woltServiceFeeAmount: 1000,
};

export default {
  name: "WoltDriveSetup",
  components: { AdminPage },
  data() {
    return {
      storeIdInput: null,
      store: null,
      isFetching: false,
      lookupError: "",
      form: {
        venueId: "",
        merchantId: "",
        merchantKey: "",
      },
      fees: { ...DEFAULT_FEES },
      // Full Dintero configuration read back from the API. The update endpoint overwrites every
      // field, so it is sent back untouched apart from the three Wolt fees.
      dinteroConfig: null,
      isSaving: false,
      saveError: "",
      saveSuccess: false,
    };
  },
  computed: {
    isPowerUser() {
      return this.$store.state.currentUser?.isPowerUser;
    },
    prefilledFromEnv() {
      return !!ENV_MERCHANT_ID && !!ENV_MERCHANT_KEY;
    },
    marketplaceVenueId() {
      return this.store?.woltMarketplaceConfiguration?.venueId || "";
    },
    marketplaceConnected() {
      return !!this.marketplaceVenueId;
    },
    canSave() {
      return !!this.store && !!this.form.venueId && !!this.form.merchantId && !!this.form.merchantKey;
    },
  },
  watch: {
    "$store.getters.userIsLoggedIn": {
      immediate: true,
      handler(isLoggedIn) {
        if (isLoggedIn && !this.isPowerUser) {
          this.$router.push("/admin");
        }
      },
    },
  },
  mounted() {
    // AUTHENTICATION IS THE SHELL'S ANSWER, NOT THIS PAGE'S. With nobody signed in this returns and
    // lets <AdminPage> put the sign-in door on the page that keeps it, which is what every other
    // admin page here does.
    //
    // The compound guard this replaces (`loggedIn && !isPowerUser`) already declined to BOUNCE an
    // anonymous visitor, so the redirect was never the bug. What it did instead was fall through to
    // the prefill below — reading localStorage and, with a ?storeId in the URL, issuing fetchStore()
    // while signed out. Splitting the two conditions makes the anonymous case return before any of
    // that, and the privilege bounce stays exactly as it was for someone who IS signed in.
    if (!this.$store.getters.userIsLoggedIn) {
      return;
    }
    if (!this.isPowerUser) {
      this.$router.push("/admin");
      return;
    }

    // Environment prefill wins; otherwise fall back to the merchant id remembered locally.
    const remembered = window.localStorage.getItem(MERCHANT_ID_STORAGE_KEY);
    this.form.merchantId = ENV_MERCHANT_ID || remembered || "";
    this.form.merchantKey = ENV_MERCHANT_KEY;

    const queryStoreId = parseInt(this.$route.query.storeId, 10);
    if (queryStoreId > 0) {
      this.storeIdInput = queryStoreId;
      this.fetchStore();
    }
  },
  methods: {
    async fetchStore() {
      if (!this.storeIdInput) {
        return;
      }
      this.isFetching = true;
      this.lookupError = "";
      this.saveError = "";
      this.saveSuccess = false;
      try {
        this.store = await this._storeService.Get(this.storeIdInput);
      } catch (error) {
        this.store = null;
        this.lookupError = this.$i("woltDriveSetup_storeNotFound", { id: this.storeIdInput });
        this.isFetching = false;
        return;
      }

      // The Wolt fees live on the store's Dintero configuration. Read the whole thing so the update
      // can be sent back complete, and keep any fee the store already has.
      try {
        this.dinteroConfig = await this._storeService.GetDinteroConfig(this.store.id);
      } catch (error) {
        this.dinteroConfig = null;
        this.lookupError = this.$i("woltDriveSetup_feesReadFailed");
      }
      const existing = this.dinteroConfig || {};
      this.fees = {
        woltDeliveryFeePercent: Number(existing.woltDeliveryFeePercent) || DEFAULT_FEES.woltDeliveryFeePercent,
        woltCustomerDeliveryFeeAmount: Number(existing.woltCustomerDeliveryFeeAmount) || DEFAULT_FEES.woltCustomerDeliveryFeeAmount,
        woltServiceFeeAmount: Number(existing.woltServiceFeeAmount) || DEFAULT_FEES.woltServiceFeeAmount,
      };
      this.isFetching = false;
    },
    formatKroner(ore) {
      return ((Number(ore) || 0) / 100).toFixed(2).replace(".", ",");
    },
    async save() {
      if (!this.canSave) {
        return;
      }
      const confirmed = window.confirm(
        this.$i("woltDriveSetup_confirm", { name: this.store.name, id: this.store.id })
      );
      if (!confirmed) {
        return;
      }

      this.isSaving = true;
      this.saveError = "";
      this.saveSuccess = false;
      try {
        await this._storeService.ConfigureWoltDrive(this.store.id, {
          merchantId: this.form.merchantId,
          merchantKey: this.form.merchantKey,
          venueId: this.form.venueId,
        });
        window.localStorage.setItem(MERCHANT_ID_STORAGE_KEY, this.form.merchantId);
        this.form.merchantKey = ENV_MERCHANT_KEY;
        await this.saveFees();
        // Re-read the store so the badges reflect what the backend actually stored.
        await this.fetchStore();
        this.saveSuccess = true;
      } catch (error) {
        this.saveError = error?.message || this.$i("woltDriveSetup_saveFailed");
      } finally {
        this.isSaving = false;
      }
    },
    // The Dintero endpoint replaces the whole configuration, so every field read in fetchStore is
    // sent back verbatim and only the three Wolt fees are taken from the form. dinteroEnabled is not
    // part of that payload, so it comes from the store itself to avoid switching Dintero off.
    async saveFees() {
      const config = this.dinteroConfig || {};
      const ok = await this._storeService.UpdateDinteroConfig(this.store.id, {
        dinteroEnabled: !!this.store.dinteroEnabled,
        dinteroAccountId: config.dinteroAccountId || "",
        clientId: config.clientId || "",
        clientSecret: config.clientSecret || "",
        vippsEnabled: !!config.vippsEnabled,
        applePayEnabled: !!config.applePayEnabled,
        creditCardEnabled: !!config.creditCardEnabled,
        googlePayEnabled: !!config.googlePayEnabled,
        klarnaEnabled: !!config.klarnaEnabled,
        billieEnabled: !!config.billieEnabled,
        kraviaEnabled: !!config.kraviaEnabled,
        kraviaMessage: config.kraviaMessage || "",
        commissionPercentage: Number(config.commissionPercentage) || 0,
        splitSellerId: config.splitSellerId || "",
        woltDeliveryFeePercent: Number(this.fees.woltDeliveryFeePercent) || 0,
        woltCustomerDeliveryFeeAmount: Number(this.fees.woltCustomerDeliveryFeeAmount) || 0,
        woltServiceFeeAmount: Number(this.fees.woltServiceFeeAmount) || 0,
      });
      if (!ok) {
        throw new Error(this.$i("woltDriveSetup_feesSaveFailed"));
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.wds {
  max-width: 720px;
}

.page-header {
  margin-bottom: 1.5rem;

  h1 {
    margin-bottom: 0.25rem;
  }
}

.page-description {
  color: #6b7280;
}

.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.25rem 1.5rem 1.5rem;
  margin-bottom: 1.5rem;

  h2 {
    font-size: 1.05rem;
    margin-bottom: 1rem;
  }
}

.store-lookup {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;

  .field {
    margin-bottom: 0;
    flex: 0 0 180px;
  }
}

.field {
  margin-bottom: 1rem;

  label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.35rem;
  }

  input {
    width: 100%;
    padding: 0.6rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
  }
}

.section-divider {
  margin-top: 1.75rem;
  padding-top: 1.25rem;
  border-top: 1px solid #f0f1f4;
}

.field-hint {
  margin-top: 0.35rem;
  font-size: 0.85rem;
  color: #6b7280;
}

.link-btn {
  margin-top: 0.35rem;
  background: none;
  border: none;
  padding: 0;
  color: #2563eb;
  cursor: pointer;
  font-size: 0.85rem;
  text-decoration: underline;
}

.store-summary {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid #f0f1f4;

  &__name {
    font-size: 1.1rem;
    font-weight: 600;
  }

  &__id {
    color: #9ca3af;
    margin-right: 0.35rem;
  }

  &__address {
    color: #6b7280;
    margin-top: 0.15rem;
  }

  &__marketplace {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    color: #6b7280;
  }
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.badge {
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;

  &--ok {
    background: #dcfce7;
    color: #166534;
  }

  &--missing {
    background: #fee2e2;
    color: #991b1b;
  }

  &--neutral {
    background: #f3f4f6;
    color: #4b5563;
  }
}

.notification {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;

  &--error {
    background: #fee2e2;
    color: #991b1b;
  }

  &--success {
    background: #dcfce7;
    color: #166534;
  }

  &--warning {
    background: #fef3c7;
    color: #92400e;
  }
}

.form-actions {
  margin-top: 1.25rem;
}
</style>

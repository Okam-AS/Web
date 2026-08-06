<template>
  <AdminPage @login-success="handleLoginSuccess">
    <div class="delivery-page">
      <div class="page-header">
        <div>
          <h1>{{ $i('delivery_title') }}</h1>
          <p>{{ $i('delivery_subtitle') }}</p>
        </div>
      </div>

      <Loading
        v-if="isLoading"
        :loading="true"
      />

      <div
        v-else-if="!selectedStore"
        class="empty-state"
      >
        <span class="material-icons">storefront</span>
        <h3>{{ $i('delivery_noStoreSelectedTitle') }}</h3>
        <p>{{ $i('delivery_noStoreSelectedText') }}</p>
      </div>

      <div
        v-else
        class="delivery-layout"
      >
        <section class="settings-panel">
          <div class="settings-row">
            <div>
              <h2>{{ $i('delivery_selfPickUpTitle') }}</h2>
              <p>{{ $i('delivery_selfPickUpText') }}</p>
            </div>
            <label class="toggle-switch">
              <input
                v-model="localSelfPickUp"
                type="checkbox"
                :disabled="isSaving"
                @change="selfPickUpChange"
              />
              <span class="toggle-slider" />
            </label>
          </div>

          <div class="settings-row">
            <div>
              <h2>{{ $i('delivery_dineInTitle') }}</h2>
              <p>{{ $i('delivery_dineInText') }}</p>
            </div>
            <label class="toggle-switch">
              <input
                v-model="localTableDeliveryEnabled"
                type="checkbox"
                :disabled="isSaving"
                @change="tableDeliveryEnabledChange"
              />
              <span class="toggle-slider" />
            </label>
          </div>

          <div class="settings-row">
            <div>
              <h2>{{ $i('delivery_homeDeliveryTitle') }}</h2>
              <p>{{ $i('delivery_homeDeliveryText') }}</p>
            </div>
            <label class="toggle-switch">
              <input
                v-model="localDeliveryEnabled"
                type="checkbox"
                :disabled="isSaving"
                @change="deliveryEnabledChange"
              />
              <span class="toggle-slider" />
            </label>
          </div>

          <div
            v-if="localDeliveryEnabled"
            class="delivery-type-section"
          >
            <div class="section-heading">
              <h2>{{ $i('delivery_homeDeliveryTypeTitle') }}</h2>
              <span>{{ selectedDeliveryTypeLabel }}</span>
            </div>
            <div class="delivery-type-options">
              <button
                type="button"
                class="delivery-type-option"
                :class="{ active: localInstantHomeDeliveryEnabled }"
                :disabled="isSaving"
                @click="changeDeliveryType('own')"
              >
                <span class="material-icons">delivery_dining</span>
                {{ $i('delivery_ownDriving') }}
              </button>
              <button
                type="button"
                class="delivery-type-option"
                :class="{ active: localWoltDeliveryEnabled }"
                :disabled="isSaving"
                @click="changeDeliveryType('wolt')"
              >
                <span class="material-icons">local_shipping</span>
                Wolt
              </button>
            </div>
          </div>

          <div
            v-if="localWoltDeliveryEnabled && currentStore && !currentStore.woltDriveIsConfigured"
            class="warning-message"
          >
            {{ $i('delivery_woltNotConfiguredWarning') }}
          </div>
        </section>

        <section
          v-if="localInstantHomeDeliveryEnabled"
          class="delivery-methods-panel"
        >
          <div class="section-heading">
            <div>
              <h2>{{ $i('delivery_shippingPricesTitle') }}</h2>
              <p>{{ $i('delivery_shippingPricesText') }}</p>
            </div>
            <button
              class="btn btn-secondary"
              type="button"
              @click="createDeliveryMethod"
            >
              <span class="material-icons">add</span>
              {{ $i('delivery_addShippingPrice') }}
            </button>
          </div>

          <div
            v-if="deliveryMethods.length === 0"
            class="empty-card"
          >
            {{ $i('delivery_noShippingPrices') }}
          </div>

          <div
            v-else
            class="delivery-method-list"
          >
            <button
              v-for="(deliveryMethod, index) in deliveryMethods"
              :key="deliveryMethod.id || index"
              type="button"
              class="delivery-method-row"
              @click="editDeliveryMethod(deliveryMethod)"
            >
              <div>
                <span>{{ $i('delivery_drivingDistance') }}</span>
                <strong>{{ distanceLabel(deliveryMethod) }}</strong>
              </div>
              <div>
                <span>{{ $i('common_price') }}</span>
                <strong>{{ priceLabel(deliveryMethod.amount) }}</strong>
              </div>
              <span class="material-icons">chevron_right</span>
            </button>
          </div>
        </section>

        <section
          v-if="localDeliveryEnabled"
          class="address-panel"
        >
          <div class="section-heading">
            <div>
              <h2>{{ $i('delivery_deliveryFromAddressTitle') }}</h2>
              <p>{{ $i('delivery_deliveryFromAddressText') }}</p>
            </div>
            <button
              v-if="showSaveButton"
              class="btn btn-primary"
              :disabled="isSaving"
              @click="saveChanges"
            >
              <span class="material-icons">save</span>
              {{ $i('common_save') }}
            </button>
          </div>

          <div class="form-grid">
            <div class="form-group form-group-full">
              <label>{{ $i('delivery_address') }}</label>
              <input
                v-model="localDeliveryFullAddress"
                type="text"
                maxlength="150"
              />
            </div>
            <div class="form-group">
              <label>{{ $i('delivery_zipCode') }}</label>
              <input
                v-model="localDeliveryZipCode"
                type="text"
                inputmode="numeric"
                maxlength="4"
              />
            </div>
            <div class="form-group">
              <label>{{ $i('delivery_city') }}</label>
              <input
                v-model="localDeliveryCity"
                type="text"
                maxlength="20"
              />
            </div>
            <div class="form-group">
              <label>{{ $i('delivery_minimumOrderKroner') }}</label>
              <!-- The stored minimum is ØRE, so a single whole-kroner box could not show one. This is
                   the same kroner/øre pair the delivery-method editor further down this file already
                   uses, for the same reason: it is the only shape that can render what the column
                   holds. -->
              <div class="amount-inputs">
                <input
                  v-model="localMinimumWholeAmount"
                  type="text"
                  inputmode="numeric"
                  maxlength="7"
                  :placeholder="$i('delivery_kroner')"
                  @blur="normalizeMinimumAmountField"
                />
                <input
                  v-model="localMinimumFractionAmount"
                  type="text"
                  inputmode="numeric"
                  maxlength="2"
                  :placeholder="$i('delivery_ore')"
                  @blur="normalizeMinimumAmountField"
                />
              </div>
            </div>
          </div>
        </section>

        <div
          v-if="notification.show"
          class="notification"
          :class="`notification--${notification.type}`"
        >
          {{ notification.message }}
        </div>
      </div>

      <div
        v-if="editingDeliveryMethod"
        class="modal-backdrop"
        @click.self="closeDeliveryMethodEditor"
      >
        <div class="delivery-method-modal">
          <div class="modal-header">
            <div>
              <h2>{{ creatingDeliveryMethod ? $i('delivery_newShippingPrice') : $i('delivery_shippingPrice') }}</h2>
              <p>{{ deliveryMethodSummary }}</p>
            </div>
            <button
              type="button"
              class="icon-button"
              @click="closeDeliveryMethodEditor"
            >
              <span class="material-icons">close</span>
            </button>
          </div>

          <div
            v-if="editorError"
            class="error-message"
          >
            {{ editorError }}
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>{{ $i('delivery_drivingDistanceKm') }}</label>
              <div class="distance-input">
                <span>{{ editorMinimumKm }} -</span>
                <input
                  v-model="editorDeliveryMethod.km"
                  type="text"
                  inputmode="numeric"
                  maxlength="2"
                  :class="{ error: editorErrorFields.includes('km') }"
                  @blur="updateDeliveryMethodSummary"
                />
                <span>km</span>
              </div>
            </div>

            <div class="form-group">
              <label>{{ $i('common_price') }}</label>
              <div class="amount-inputs">
                <input
                  v-model="editorDeliveryMethod.wholeAmount"
                  type="text"
                  inputmode="numeric"
                  :placeholder="$i('delivery_kroner')"
                  :class="{ error: editorErrorFields.includes('wholeAmount') }"
                  @blur="updateDeliveryMethodSummary"
                />
                <input
                  v-model="editorDeliveryMethod.fractionAmount"
                  type="text"
                  inputmode="numeric"
                  maxlength="2"
                  :placeholder="$i('delivery_ore')"
                  :class="{ error: editorErrorFields.includes('fractionAmount') }"
                  @blur="updateDeliveryMethodSummary"
                />
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button
              v-if="!creatingDeliveryMethod"
              class="btn btn-danger"
              type="button"
              :disabled="editorLoading"
              @click="deleteDeliveryMethod"
            >
              {{ $i('common_delete') }}
            </button>
            <div class="modal-action-spacer" />
            <button
              class="btn btn-secondary"
              type="button"
              :disabled="editorLoading"
              @click="closeDeliveryMethodEditor"
            >
              {{ $i('common_cancel') }}
            </button>
            <button
              class="btn btn-primary"
              type="button"
              :disabled="editorLoading"
              @click="saveDeliveryMethod"
            >
              {{ creatingDeliveryMethod ? $i('common_create') : $i('common_save') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from "~/components/organisms/AdminPage.vue";
import Loading from "~/components/atoms/Loading.vue";

export default {
  components: { AdminPage, Loading },
  data: () => ({
    isLoading: false,
    isSaving: false,
    currentStore: null,
    deliveryMethods: [],
    localSelfPickUp: false,
    localTableDeliveryEnabled: false,
    localDeliveryEnabled: false,
    localInstantHomeDeliveryEnabled: false,
    localWoltDeliveryEnabled: false,
    localDeliveryFullAddress: "",
    localDeliveryZipCode: "",
    localDeliveryCity: "",
    localMinimumWholeAmount: "0",
    localMinimumFractionAmount: "00",
    editingDeliveryMethod: false,
    creatingDeliveryMethod: false,
    editorDeliveryMethod: {},
    editorError: "",
    editorErrorFields: [],
    editorLoading: false,
    deliveryMethodSummary: "",
    notification: {
      show: false,
      message: "",
      type: "success",
      timeout: null,
    },
  }),
  computed: {
    selectedStore() {
      return this.$store.state.selectedAdminStore;
    },
    defaultDeliveryAddress() {
      return (
        this.currentStore?.homeDeliveryFromAddress ||
        this.currentStore?.address || {
          fullAddress: "",
          zipCode: "",
          city: "",
        }
      );
    },
    selectedDeliveryTypeLabel() {
      if (this.currentStore?.dineHomeDeliveryEnabled && !this.localInstantHomeDeliveryEnabled && !this.localWoltDeliveryEnabled) {
        return "DineHome";
      }
      if (this.localInstantHomeDeliveryEnabled) {
        return this.$i("delivery_ownDriving");
      }
      if (this.localWoltDeliveryEnabled) {
        return "Wolt";
      }
      return this.$i("delivery_selectDeliveryType");
    },
    // "Dirty" has to mean THE OPERATOR CHANGED SOMETHING, and the only way to mean that is to put
    // both sides through the same conversion. These compared a normalised local (`|| ""` in
    // setLocalVariables) against the raw stored value, so a store whose address came back with a
    // null city compared `null !== ""` forever: Save was offered on a page nobody had touched, and
    // pressing it posted the address anyway.
    hasDeliveryAddressChanges() {
      const saved = this.defaultDeliveryAddress;
      return (
        this.addressField(saved.fullAddress) !== this.addressField(this.localDeliveryFullAddress) ||
        this.addressField(saved.zipCode) !== this.addressField(this.localDeliveryZipCode) ||
        this.addressField(saved.city) !== this.addressField(this.localDeliveryCity)
      );
    },
    // The same asymmetry, in money. The field held whole kroner and setLocalVariables FLOORED the
    // stored øre into it, but this read the stored øre raw: a store on 150,50 kr compared 15050
    // against 15000 forever, so Save never went away and pressing it wrote the rounded-down 15000
    // the operator never asked for. Both sides go through the field's own representation.
    //
    // That representation is now LOSSLESS, which is the second half of the same defect. Putting
    // both sides through a lossy one stopped the unasked-for write, but it also meant the øre were
    // not on the screen at all AND could not be removed: the operator typed 150 over a stored
    // 150,50, both sides read 15000, no change was detected and no Save appeared. A field that
    // cannot express what the column holds cannot correct it either.
    hasMinimumAmountChanges() {
      return this.minimumOrderAmountInOre !== this.storedMinimumOrderAmountInOre;
    },
    // What the two boxes currently say, in øre — the number Save would post.
    minimumOrderAmountInOre() {
      return this.minimumAmountFieldsToOre(this.localMinimumWholeAmount, this.localMinimumFractionAmount);
    },
    // What the server holds, put through the same two boxes and read back out. For every value the
    // column can hold this is the stored number itself; it is written as a round trip rather than
    // read raw so that the day the field stops being able to express something, the dirty check
    // notices instead of quietly offering to overwrite it.
    storedMinimumOrderAmountInOre() {
      const stored = this.minimumAmountFields(this.currentStore?.minimumOrderPriceForHomeDelivery);
      return this.minimumAmountFieldsToOre(stored.whole, stored.fraction);
    },
    hasChanges() {
      return this.hasDeliveryAddressChanges || this.hasMinimumAmountChanges;
    },
    showSaveButton() {
      return !!this.currentStore && !this.isLoading && this.hasChanges;
    },
    editorMinimumKm() {
      return Math.round((this.editorDeliveryMethod.minimumDistance || 0) / 1000);
    },
  },
  watch: {
    selectedStore(storeId) {
      if (storeId && this.$store.getters.userIsLoggedIn) {
        this.fetchDeliverySettings(storeId);
      } else {
        this.resetDeliverySettings();
      }
    },
  },
  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      return;
    }

    if (this.selectedStore) {
      this.fetchDeliverySettings(this.selectedStore);
    }
  },
  beforeDestroy() {
    // showNotification arms a 3.5s timer that writes component state. Leaving the page inside that
    // window left the timer holding a destroyed component.
    if (this.notification.timeout) {
      clearTimeout(this.notification.timeout);
      this.notification.timeout = null;
    }
  },
  methods: {
    async fetchDeliverySettings(storeId) {
      this.isLoading = true;
      this.resetDeliverySettings();
      try {
        const store = await this._storeService.Get(storeId);

        if (String(this.selectedStore) !== String(storeId)) {
          return;
        }

        this.currentStore = store;
        this.setLocalVariables();

        if (store.homeDeliveryEnabled) {
          await this.loadDeliveryMethods(storeId);
        }
      } catch (error) {
        this.showNotification(error.message || this.$i("delivery_loadSettingsError"), "error");
      } finally {
        this.isLoading = false;
      }
    },
    resetDeliverySettings() {
      this.currentStore = null;
      this.deliveryMethods = [];
      this.editingDeliveryMethod = false;
      this.creatingDeliveryMethod = false;
      this.editorDeliveryMethod = {};
      this.editorError = "";
      this.editorErrorFields = [];
    },
    captureUnsavedFormValues() {
      return {
        hasDeliveryAddressChanges: this.hasDeliveryAddressChanges,
        hasMinimumAmountChanges: this.hasMinimumAmountChanges,
        deliveryFullAddress: this.localDeliveryFullAddress,
        deliveryZipCode: this.localDeliveryZipCode,
        deliveryCity: this.localDeliveryCity,
        minimumWholeAmount: this.localMinimumWholeAmount,
        minimumFractionAmount: this.localMinimumFractionAmount,
      };
    },
    restoreUnsavedFormValues(unsavedFormValues) {
      if (!unsavedFormValues) {
        return;
      }
      if (unsavedFormValues.hasDeliveryAddressChanges) {
        this.localDeliveryFullAddress = unsavedFormValues.deliveryFullAddress;
        this.localDeliveryZipCode = unsavedFormValues.deliveryZipCode;
        this.localDeliveryCity = unsavedFormValues.deliveryCity;
      }
      if (unsavedFormValues.hasMinimumAmountChanges) {
        this.localMinimumWholeAmount = unsavedFormValues.minimumWholeAmount;
        this.localMinimumFractionAmount = unsavedFormValues.minimumFractionAmount;
      }
    },
    setLocalVariables(options = {}) {
      const unsavedFormValues = options.unsavedFormValues ||
        (options.preserveUnsavedFormChanges ? this.captureUnsavedFormValues() : null);
      const store = this.currentStore || {};
      this.localDeliveryFullAddress = this.defaultDeliveryAddress.fullAddress || "";
      this.localDeliveryZipCode = this.defaultDeliveryAddress.zipCode || "";
      this.localDeliveryCity = this.defaultDeliveryAddress.city || "";
      this.localSelfPickUp = !!store.selfPickUp;
      this.localTableDeliveryEnabled = !!store.tableDeliveryEnabled;
      this.localInstantHomeDeliveryEnabled = !!store.homeDeliveryEnabled;
      this.localWoltDeliveryEnabled = !!store.woltDriveEnabled;
      this.localDeliveryEnabled = !!(store.homeDeliveryEnabled || store.woltDriveEnabled || store.dineHomeDeliveryEnabled);
      this.setMinimumAmountFields(store.minimumOrderPriceForHomeDelivery);
      this.restoreUnsavedFormValues(unsavedFormValues);
    },
    async refreshStore(options = {}) {
      if (!this.selectedStore) {
        return;
      }
      const unsavedFormValues = options.preserveUnsavedFormChanges
        ? this.captureUnsavedFormValues()
        : null;
      const store = await this._storeService.Get(this.selectedStore);
      this.currentStore = store;
      this.setLocalVariables({ unsavedFormValues });
    },
    async selfPickUpChange() {
      if (!this.currentStore || this.isSaving || this.localSelfPickUp === this.currentStore.selfPickUp) {
        return;
      }
      await this.updateToggle(() => this._storeService.UpdateSelfPickUp(this.selectedStore, this.localSelfPickUp), this.$i("delivery_selfPickUpUpdated"));
    },
    async tableDeliveryEnabledChange() {
      if (!this.currentStore || this.isSaving || this.localTableDeliveryEnabled === this.currentStore.tableDeliveryEnabled) {
        return;
      }
      await this.updateToggle(
        () => this._storeService.UpdateTableDelivery(this.selectedStore, this.localTableDeliveryEnabled),
        this.localTableDeliveryEnabled ? this.$i("delivery_dineInActivated") : this.$i("delivery_dineInDeactivated")
      );
    },
    async deliveryEnabledChange() {
      if (!this.currentStore || this.isSaving) {
        return;
      }
      this.isSaving = true;
      try {
        if (!this.localDeliveryEnabled) {
          this.localInstantHomeDeliveryEnabled = false;
          this.localWoltDeliveryEnabled = false;
          // Three writes, three booleans. Discarding them announced a deactivation the server had
          // refused — the same lie as the silent one on the toggles above, only louder.
          this.requireSaved(await Promise.all([
            this._storeService.UpdateHomeDelivery(this.selectedStore, false),
            this._storeService.UpdateDineHomeDelivery(this.selectedStore, false),
            this._storeService.UpdateWoltDelivery(this.selectedStore, false),
          ]), "delivery_updateHomeDeliveryError");
          this.showNotification(this.$i("delivery_homeDeliveryDeactivated"));
        } else {
          this.localInstantHomeDeliveryEnabled = true;
          this.localWoltDeliveryEnabled = false;
          this.requireSaved(await Promise.all([
            this._storeService.UpdateHomeDelivery(this.selectedStore, true),
            this._storeService.UpdateDineHomeDelivery(this.selectedStore, false),
            this._storeService.UpdateWoltDelivery(this.selectedStore, false),
          ]), "delivery_updateHomeDeliveryError");
          this.showNotification(this.$i("delivery_homeDeliveryActivatedOwn"));
        }
        await this.refreshStore({ preserveUnsavedFormChanges: true });
        await this.loadDeliveryMethods();
      } catch (error) {
        await this.recoverFromFailedSave(error.message || this.$i("delivery_updateHomeDeliveryError"));
      } finally {
        this.isSaving = false;
      }
    },
    async changeDeliveryType(type) {
      if (this.isSaving) {
        return;
      }
      const useOwnDelivery = type === "own";
      const useWolt = type === "wolt";

      if (this.localInstantHomeDeliveryEnabled === useOwnDelivery && this.localWoltDeliveryEnabled === useWolt) {
        return;
      }

      this.isSaving = true;
      try {
        this.requireSaved(await Promise.all([
          this._storeService.UpdateHomeDelivery(this.selectedStore, useOwnDelivery),
          this._storeService.UpdateDineHomeDelivery(this.selectedStore, false),
          this._storeService.UpdateWoltDelivery(this.selectedStore, useWolt),
        ]), "delivery_changeHomeDeliveryTypeError");
        this.localDeliveryEnabled = true;
        this.localInstantHomeDeliveryEnabled = useOwnDelivery;
        this.localWoltDeliveryEnabled = useWolt;
        this.showNotification(this.$i("delivery_homeDeliveryTypeChanged", { type: useOwnDelivery ? this.$i("delivery_ownDrivingLower") : "Wolt" }));
        await this.refreshStore({ preserveUnsavedFormChanges: true });
        if (useOwnDelivery) {
          await this.loadDeliveryMethods();
        } else {
          this.deliveryMethods = [];
        }
      } catch (error) {
        await this.recoverFromFailedSave(error.message || this.$i("delivery_changeHomeDeliveryTypeError"));
      } finally {
        this.isSaving = false;
      }
    },
    // A store-service write does NOT throw when it does not land. RequestService.TryParseResponse
    // returns undefined for a 204, for any non-200 and for a body it cannot parse, and every toggle
    // in core/services/store-service.ts turns that into a plain `false`. This page used to treat
    // that `false` as "nothing to do": no message, no error, no re-read — so the switch stayed in
    // the position the operator moved it to while the server still held the old value, and a failed
    // "turn off self-pickup" was indistinguishable from a successful one. Turning the `false` into
    // a throw routes every call site to the one recovery path below.
    requireSaved(results, messageKey = "delivery_saveChangeError") {
      const outcomes = Array.isArray(results) ? results : [results];
      if (outcomes.some(saved => !saved)) {
        throw new Error(this.$i(messageKey));
      }
    },
    // Both halves, always. Saying it failed while leaving the switch flipped still leaves the screen
    // reporting a state the venue is not in, so the re-read is not a nicety — it is the correction.
    // If the re-read fails too, fall back to the last store the server gave us rather than leaving
    // the un-saved position on screen, and keep the failure message rather than replacing it with
    // one about reading.
    async recoverFromFailedSave(message) {
      this.showNotification(message, "error");
      try {
        await this.refreshStore({ preserveUnsavedFormChanges: true });
      } catch (readError) {
        this.setLocalVariables({ preserveUnsavedFormChanges: true });
      }
    },
    async updateToggle(action, successMessage) {
      this.isSaving = true;
      try {
        this.requireSaved(await action());
        this.showNotification(successMessage);
        await this.refreshStore({ preserveUnsavedFormChanges: true });
      } catch (error) {
        await this.recoverFromFailedSave(error.message || this.$i("delivery_saveChangeError"));
      } finally {
        this.isSaving = false;
      }
    },
    async loadDeliveryMethods(storeId = this.selectedStore) {
      if (!storeId) {
        return;
      }
      const deliveryMethods = await this._deliveryMethodService.Get(storeId);
      if (String(this.selectedStore) !== String(storeId)) {
        return;
      }
      this.deliveryMethods = Array.isArray(deliveryMethods)
        ? deliveryMethods.sort((a, b) => (a.minimumDistance || 0) - (b.minimumDistance || 0))
        : [];
    },
    async saveChanges() {
      if (!this.currentStore || this.isSaving) {
        return;
      }
      this.isSaving = true;
      try {
        const tasks = [];
        if (this.hasDeliveryAddressChanges) {
          tasks.push(
            this._storeService.CreateOrUpdateHomeDeliveryFromAddress(this.selectedStore, {
              id: this.currentStore?.homeDeliveryFromAddress?.id || "",
              fullAddress: this.localDeliveryFullAddress,
              zipCode: this.localDeliveryZipCode,
              city: this.localDeliveryCity,
            })
          );
        }
        if (this.hasMinimumAmountChanges) {
          tasks.push(
            this._storeService.SetMinimumAmountForDelivery(
              this.selectedStore,
              // The SAME computed the dirty check compares and the same one the boxes normalise to,
              // so the number posted is the number on screen. A field that displayed øre and posted
              // kroner would be worse than the floor it replaced, because it would look right.
              this.minimumOrderAmountInOre
            )
          );
        }

        this.requireSaved(await Promise.all(tasks), "delivery_saveSettingsError");
        this.showNotification(this.$i("delivery_settingsSaved"));
        await this.refreshStore();
      } catch (error) {
        await this.recoverFromFailedSave(error.message || this.$i("delivery_saveSettingsError"));
      } finally {
        this.isSaving = false;
      }
    },
    createDeliveryMethod() {
      let minimumDistance = 0;
      if (this.deliveryMethods.length > 0) {
        minimumDistance = this.deliveryMethods[this.deliveryMethods.length - 1].maxDistance || 0;
      }

      this.openDeliveryMethodEditor({
        storeId: this.selectedStore,
        minimumDistance,
        maxDistance: 0,
        amount: 0,
      }, true);
    },
    editDeliveryMethod(deliveryMethod) {
      this.openDeliveryMethodEditor(deliveryMethod, false);
    },
    openDeliveryMethodEditor(deliveryMethod, createNew) {
      const local = JSON.parse(JSON.stringify(deliveryMethod));
      local.wholeAmount = createNew ? "" : this.wholeAmount(local.amount).replace(/\s/g, "");
      local.fractionAmount = createNew ? "" : this.fractionAmount(local.amount);
      local.km = createNew ? "" : Math.round((local.maxDistance || 0) / 1000);
      this.editorDeliveryMethod = local;
      this.creatingDeliveryMethod = createNew;
      this.editingDeliveryMethod = true;
      this.editorError = "";
      this.editorErrorFields = [];
      this.$nextTick(this.updateDeliveryMethodSummary);
    },
    closeDeliveryMethodEditor() {
      this.editingDeliveryMethod = false;
      this.editorDeliveryMethod = {};
      this.editorError = "";
      this.editorErrorFields = [];
    },
    updateDeliveryMethodSummary() {
      const minKm = this.editorMinimumKm;
      const maxKm = this.editorDeliveryMethod.km || "0";
      const wholeAmount = this.editorDeliveryMethod.wholeAmount || "0";
      const fractionAmount = this.editorDeliveryMethod.fractionAmount || "00";
      this.deliveryMethodSummary = this.$i("delivery_methodSummary", {
        minKm,
        maxKm,
        wholeAmount,
        fractionAmount,
      });
    },
    numericInputValue(value) {
      return String(value ?? "").trim();
    },
    isDigits(value) {
      return /^\d+$/.test(this.numericInputValue(value));
    },
    prepareDeliveryMethodRequest() {
      const wholeAmount = this.numericInputValue(this.editorDeliveryMethod.wholeAmount);
      const fractionAmount = this.numericInputValue(this.editorDeliveryMethod.fractionAmount);
      this.editorDeliveryMethod.amount =
        (!wholeAmount ? "0" : wholeAmount) +
        "" +
        (!fractionAmount || fractionAmount.length < 2 ? "00" : fractionAmount);
      this.editorDeliveryMethod.amount = parseInt(this.editorDeliveryMethod.amount, 10);
      this.editorDeliveryMethod.maxDistance = parseInt(this.numericInputValue(this.editorDeliveryMethod.km), 10) * 1000;
    },
    validateDeliveryMethod() {
      this.editorError = "";
      this.editorErrorFields = [];
      const method = this.editorDeliveryMethod;

      if (!this.isDigits(method.km)) {
        this.editorErrorFields.push("km");
        this.editorError = this.$i("delivery_kmRequired");
      }
      if (
        !/^\d{2}$/.test(this.numericInputValue(method.fractionAmount))
      ) {
        this.editorErrorFields.push("fractionAmount");
        this.editorError = this.$i("delivery_fractionAmountRange");
      }
      if (!this.isDigits(method.wholeAmount)) {
        this.editorErrorFields.push("wholeAmount");
        this.editorError = this.$i("delivery_priceRequired");
      }

      if (this.editorErrorFields.length === 0 && parseInt(this.numericInputValue(method.km), 10) <= this.editorMinimumKm) {
        this.editorErrorFields.push("km");
        this.editorError = this.$i("delivery_kmMustBeGreaterThan", { minimumKm: this.editorMinimumKm });
      }

      return this.editorErrorFields.length === 0;
    },
    async saveDeliveryMethod() {
      if (this.editorLoading || !this.validateDeliveryMethod()) {
        return;
      }
      this.editorLoading = true;
      try {
        this.prepareDeliveryMethodRequest();
        if (this.creatingDeliveryMethod) {
          await this._deliveryMethodService.Create(this.editorDeliveryMethod);
        } else {
          await this._deliveryMethodService.Update(this.editorDeliveryMethod);
        }
        await this.loadDeliveryMethods();
        this.showNotification(this.creatingDeliveryMethod ? this.$i("delivery_shippingPriceCreated") : this.$i("delivery_shippingPriceSaved"));
        this.closeDeliveryMethodEditor();
      } catch (error) {
        this.editorError = error.message || this.$i("delivery_saveShippingPriceError");
      } finally {
        this.editorLoading = false;
      }
    },
    async deleteDeliveryMethod() {
      if (this.editorLoading || !window.confirm(this.$i("delivery_confirmDeleteShippingPrice"))) {
        return;
      }
      this.editorLoading = true;
      try {
        await this._deliveryMethodService.Delete(this.editorDeliveryMethod.id);
        await this.loadDeliveryMethods();
        this.showNotification(this.$i("delivery_shippingPriceDeleted"));
        this.closeDeliveryMethodEditor();
      } catch (error) {
        this.editorError = error.message || this.$i("delivery_deleteShippingPriceError");
      } finally {
        this.editorLoading = false;
      }
    },
    distanceLabel(deliveryMethod) {
      return `${Math.round((deliveryMethod.minimumDistance || 0) / 1000)}-${Math.round((deliveryMethod.maxDistance || 0) / 1000)} km`;
    },
    // One conversion each way between the stored øre and the two boxes, used by BOTH the dirty
    // check and the load, so the two can no longer drift apart. They are exact inverses over every
    // integer the column can hold, which is the property the objective actually asks for: an amount
    // that cannot survive the trip to the screen and back is an amount the screen is lying about.
    //
    // Written as integer arithmetic rather than through the `wholeAmount`/`fractionAmount` mixin
    // helpers the delivery-method editor uses. Those decompose by slicing the DECIMAL STRING, which
    // is exact for the non-negative amounts a shipping price is, and is not for this column: it is
    // a signed int with no validation on its route, and -50 øre slices to a whole part of "-" that
    // reads back as +50 — a sign flip, offered to the operator as a Save.
    minimumAmountFields(ore) {
      const parsed = parseInt(ore, 10);
      const amount = isNaN(parsed) ? 0 : parsed;
      const absolute = Math.abs(amount);
      return {
        whole: (amount < 0 ? "-" : "") + String(Math.floor(absolute / 100)),
        fraction: String(absolute % 100).padStart(2, "0"),
      };
    },
    minimumAmountFieldsToOre(whole, fraction) {
      const wholeText = this.numericInputValue(whole);
      const kroner = parseInt(wholeText, 10);
      const ore = parseInt(this.numericInputValue(fraction), 10);
      // Clamped, not taken modulo 100. `maxlength="2"` keeps a person from reaching this, but were
      // it ever reached, folding 150 øre down to 50 would look like a digit had been eaten, and the
      // blur below would then put that eaten number on screen as though it had been typed.
      const safeOre = isNaN(ore) ? 0 : Math.min(Math.abs(ore), 99);
      const safeKroner = isNaN(kroner) ? 0 : Math.abs(kroner);
      // From the TEXT, because `parseInt("-0")` is `-0` and `-0 < 0` is false — the one negative
      // whole part that cannot be recognised from the number alone.
      const negative = wholeText.startsWith("-");
      const amount = safeKroner * 100 + safeOre;
      return negative ? -amount : amount;
    },
    setMinimumAmountFields(ore) {
      const fields = this.minimumAmountFields(ore);
      this.localMinimumWholeAmount = fields.whole;
      this.localMinimumFractionAmount = fields.fraction;
    },
    // What the field SHOWS has to be what Save would WRITE. Both boxes are free text, so `150,5`,
    // `150.5`, `to hundre` and a bare `5` in the øre box all looked accepted and would otherwise
    // silently become something else — the same shape of lie as the switch that stayed flipped.
    // Normalising on blur puts the written number on screen while the operator can still see it.
    normalizeMinimumAmountField() {
      this.setMinimumAmountFields(this.minimumOrderAmountInOre);
    },
    addressField(value) {
      return String(value ?? "");
    },
    showNotification(message, type = "success") {
      if (this.notification.timeout) {
        clearTimeout(this.notification.timeout);
      }
      this.notification = {
        show: true,
        message,
        type,
        timeout: setTimeout(() => {
          this.notification.show = false;
        }, 3500),
      };
    },
    handleLoginSuccess() {
      if (this.selectedStore) {
        this.fetchDeliverySettings(this.selectedStore);
      }
    },
  },
};
</script>

<style scoped>
.delivery-page {
  min-height: calc(100vh - 60px);
  padding: 2rem;
  background: #f8f9fa;
  color: #292c34;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.page-header h1 {
  margin: 0 0 0.35rem;
  font-size: 2rem;
  font-weight: 700;
}

.page-header p,
.section-heading p,
.settings-row p,
.modal-header p {
  margin: 0;
  color: #6b7280;
  line-height: 1.5;
}

.delivery-layout {
  display: grid;
  gap: 1rem;
}

.settings-panel,
.delivery-methods-panel,
.address-panel,
.delivery-method-modal {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.25rem;
  border-bottom: 1px solid #eef0f3;
}

.settings-row:last-child {
  border-bottom: 0;
}

.settings-row h2,
.section-heading h2,
.modal-header h2 {
  margin: 0 0 0.25rem;
  font-size: 1.05rem;
  font-weight: 700;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  flex: 0 0 auto;
  width: 52px;
  height: 30px;
}

.toggle-switch input {
  width: 0;
  height: 0;
  opacity: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  cursor: pointer;
  border-radius: 999px;
  background: #d1d5db;
  transition: background 0.2s ease;
}

.toggle-slider::before {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 22px;
  height: 22px;
  content: "";
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
  transition: transform 0.2s ease;
}

.toggle-switch input:checked + .toggle-slider {
  background: #14b8a6;
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(22px);
}

.delivery-type-section,
.warning-message {
  padding: 1.25rem;
  border-top: 1px solid #eef0f3;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem;
}

.section-heading > span {
  flex: 0 0 auto;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  background: #eefdf9;
  color: #0f766e;
  font-size: 0.85rem;
  font-weight: 700;
}

.delivery-type-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.delivery-type-option,
.delivery-method-row,
.btn,
.icon-button {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.delivery-type-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 48px;
  padding: 0.75rem 1rem;
  border: 1px solid #d7dce2;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  font-weight: 700;
}

.delivery-type-option.active {
  border-color: #14b8a6;
  background: #eefdf9;
  color: #0f766e;
}

.warning-message,
.error-message {
  margin: 0 1.25rem 1.25rem;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  background: #fff7ed;
  color: #9a3412;
  line-height: 1.5;
}

.warning-message {
  margin-top: 0;
}

.error-message {
  background: #fef2f2;
  color: #991b1b;
}

.delivery-method-list {
  display: grid;
  gap: 0.75rem;
  padding: 0 1.25rem 1.25rem;
}

.delivery-method-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: inherit;
  text-align: left;
}

.delivery-method-row:hover {
  border-color: #14b8a6;
}

.delivery-method-row span:not(.material-icons) {
  display: block;
  margin-bottom: 0.25rem;
  color: #6b7280;
  font-size: 0.85rem;
}

.delivery-method-row strong {
  font-size: 1.2rem;
}

.empty-card,
.empty-state {
  padding: 1.25rem;
  color: #6b7280;
}

.empty-state {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  text-align: center;
}

.empty-state .material-icons {
  color: #9ca3af;
  font-size: 2.5rem;
}

.empty-state h3 {
  margin: 0;
  color: #292c34;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  padding: 0 1.25rem 1.25rem;
}

.form-group {
  display: grid;
  gap: 0.35rem;
}

.form-group-full {
  grid-column: 1 / -1;
}

.form-group label {
  color: #374151;
  font-size: 0.9rem;
  font-weight: 700;
}

.form-group input {
  width: 100%;
  min-height: 42px;
  padding: 0.65rem 0.75rem;
  border: 1px solid #d7dce2;
  border-radius: 8px;
  background: #fff;
  color: #111827;
  font: inherit;
}

.form-group input:focus {
  border-color: #14b8a6;
  outline: none;
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.12);
}

.form-group input.error {
  border-color: #dc2626;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 42px;
  padding: 0.65rem 1rem;
  border-radius: 8px;
  font-weight: 700;
}

.btn:disabled,
.delivery-type-option:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-primary {
  background: #14b8a6;
  color: #fff;
}

.btn-secondary {
  border: 1px solid #d7dce2;
  background: #fff;
  color: #374151;
}

.btn-danger {
  background: #dc2626;
  color: #fff;
}

.notification {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  z-index: 30;
  max-width: min(420px, calc(100vw - 3rem));
  padding: 0.85rem 1rem;
  border-radius: 8px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
  font-weight: 700;
}

.notification--success {
  background: #ecfdf5;
  color: #047857;
}

.notification--error {
  background: #fef2f2;
  color: #991b1b;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.45);
}

.delivery-method-modal {
  width: min(620px, 100%);
  max-height: calc(100vh - 2rem);
  overflow: auto;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem;
  border-bottom: 1px solid #eef0f3;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: #f3f4f6;
  color: #374151;
}

.distance-input,
.amount-inputs {
  display: grid;
  align-items: center;
  gap: 0.5rem;
}

.distance-input {
  grid-template-columns: auto 90px auto;
}

.amount-inputs {
  grid-template-columns: 1fr 1fr;
}

.modal-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem;
  border-top: 1px solid #eef0f3;
}

.modal-action-spacer {
  flex: 1;
}

@media (max-width: 720px) {
  .delivery-page {
    padding: 1rem;
  }

  .page-header,
  .settings-row,
  .section-heading,
  .modal-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .delivery-type-options,
  .form-grid,
  .delivery-method-row {
    grid-template-columns: 1fr;
  }

  .modal-action-spacer {
    display: none;
  }
}
</style>

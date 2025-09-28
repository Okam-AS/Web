<template>
  <div :class="{ 'loading-cursor': isLoading }">
    <AdminPage>
      <!-- Loading spinner -->
      <div
        v-if="isLoading"
        class="publishing-container"
      >
        <div class="spinner" />
      </div>

      <div
        v-else
        class="onboarding-container"
      >
        <!-- Page title -->
        <div class="onboarding-title">
          <h1 v-if="storeName">
            Oppsett av
            <span
              v-if="storeSelectorAvailable"
              class="store-name-dropdown"
              @click="toggleStoreSelector"
            >
              {{ storeName }} <span class="dropdown-arrow">▼</span>
            </span>
            <span v-else>{{ storeName }}</span>
          </h1>

          <!-- Dropdown for store selection -->
          <div
            v-if="showStoreSelector && $store.state.currentUser && $store.state.currentUser.adminIn && ($store.state.currentUser.adminIn.length > 1 || $store.state.currentUser.isKeyAccountManager)"
            class="store-dropdown-menu"
          >
            <div
              v-for="store in $store.state.currentUser.adminIn"
              :key="store.id"
              class="store-dropdown-item"
              :class="{ active: storeId === store.id }"
              @click="selectStore(store.id)"
            >
              {{ store.name }}
            </div>
          </div>
        </div>

        <!-- Store selector (hidden, using the dropdown in title instead) -->
        <div
          v-if="false"
          class="store-selector"
        >
          <div
            v-if="$store.state.currentUser && $store.state.currentUser.adminIn && $store.state.currentUser.adminIn.length > 1"
            class="select-wrapper"
          >
            <select
              v-model="storeId"
              @change="loadStoreData"
            >
              <option
                v-for="store in $store.state.currentUser.adminIn"
                :key="store.id"
                :value="store.id"
              >
                {{ store.name }} ({{ store.id }})
              </option>
            </select>
          </div>
          <div
            v-else-if="$store.state.currentUser && $store.state.currentUser.adminIn && $store.state.currentUser.adminIn.length === 1"
            class="store-name"
          >
            <h2>{{ $store.state.currentUser.adminIn[0].name }}</h2>
          </div>
        </div>

        <!-- Progress indicator -->
        <div
          v-if="!storeApproved"
          class="progress-indicator"
        >
          <div class="progress-steps">
            <div
              v-for="(step, index) in steps"
              :key="index"
              :class="{
                step: true,
                active: currentStep >= index,
                completed: currentStep > index,
              }"
              @click="goToStep(index)"
            >
              <div class="step-number">
                <template v-if="currentStep > index">
                  <span class="checkmark">✓</span>
                </template>
                <template v-else>
                  {{ index + 1 }}
                </template>
              </div>
              <div class="step-label">
                {{ step.label }}
              </div>
              <div
                v-if="index < steps.length - 1"
                class="step-connector"
              />
            </div>
          </div>
        </div>

        <!-- Approved store view -->
        <div
          v-if="storeApproved"
          class="approved-store-container"
        >
          <h1>{{ storeName }} er publisert!</h1>

          <a
            :href="`https://shop.okam.no/store/${storeSlug}`"
            target="_blank"
            class="shop-url"
          >
            https://shop.okam.no/store/{{ storeSlug }}
          </a>
        </div>

        <!-- Step content -->
        <div
          v-else
          class="step-content"
        >
          <h1 class="step-title">
            {{ steps[currentStep].title }}
          </h1>

          <!-- Step 1 content - Logo Upload -->
          <div
            v-if="currentStep === 0"
            class="step-body"
          >
            <OnboardingLogoUpload
              :store-id="storeId"
              @has-logo="hasLogo = $event"
              @logo-updated="logoUpdated"
            />
          </div>

          <!-- Step 2 content -->
          <div
            v-else-if="currentStep === 1"
            class="step-body"
          >
            <OnboardingAIImport
              :store-id="storeId"
              :store-name="storeName"
              @products-imported="handleProductsImported"
              @import-completed="handleImportCompleted"
              @go-to-next-step="handleGoToNextStep"
              @loading="isLoading = $event"
            />
          </div>

          <!-- Step 3 content -->
          <div
            v-else-if="currentStep === 2"
            class="step-body"
          >
            <OnboardingProductImages
              :store-id="storeId"
              @products-loaded="handleProductsLoaded"
              @image-uploaded="handleImageUploaded"
            />
          </div>

          <!-- Step 4 content -->
          <div
            v-else-if="currentStep === 3"
            class="step-body"
          >
            <!-- Final step content with summary and publish button -->
            <div
              v-if="!isPublishing"
              class="final-step-container"
            >
              <div class="publish-explanation">
                <p>Ved å klikke på knappen nedenfor, vil butikken din bli publisert og tilgjengelig for kunder. Du kan fortsatt gjøre endringer i butikken din etter publisering.</p>
              </div>

              <div class="publish-button-container">
                <button
                  class="btn publish-btn"
                  @click="publishStore"
                >
                  Publiser {{ storeName }}
                </button>
              </div>
            </div>
            <div
              v-else
              class="publishing-container"
            >
              <div class="spinner" />
            </div>
          </div>

          <!-- Navigation buttons -->
          <div
            v-if="currentStep !== 1"
            class="step-navigation"
          >
            <div>
              <button
                v-if="currentStep > 0"
                class="btn btn-secondary"
                @click="prevStep"
              >
                Tilbake
              </button>
            </div>
            <div>
              <button
                v-if="currentStep < steps.length - 1"
                class="btn btn-primary"
                @click="nextStep"
              >
                Fortsett
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminPage>
    <LoginModal
      v-if="showLogin"
      @close="closeLoginModal"
    />
  </div>
</template>

<script>
import AdminPage from "@/components/organisms/AdminPage.vue";
import OnboardingLogoUpload from "@/components/onboarding/OnboardingLogoUpload.vue";
import OnboardingAIImport from "@/components/onboarding/OnboardingAIImport.vue";
import OnboardingProductImages from "@/components/onboarding/OnboardingProductImages.vue";
import LoginModal from "~/components/molecules/LoginModal.vue";

export default {
  components: {
    AdminPage,
    OnboardingLogoUpload,
    OnboardingAIImport,
    OnboardingProductImages,
    LoginModal,
  },
  data() {
    return {
      currentStep: 0,
      steps: [
        {
          label: "Logo",
          title: "Last opp butikklogo",
        },
        {
          label: "Meny",
          title: "Importer meny",
        },
        {
          label: "Bilder",
          title: "Last opp produktbilder",
        },
        {
          label: "Publiser",
          title: "Publiser butikk",
        },
      ],
      storeId: null,
      storeName: "butikk",
      storeApproved: false,
      storeSlug: "",
      isPublishing: false,
      hasLogo: false,
      hasProducts: false,
      productCount: 0,
      productsWithImages: [],
      importStats: {
        created: 0,
        deleted: 0,
      },
      showLogin: false,
      isLoading: true,
      showStoreSelector: false,
    };
  },
  computed: {
    storeSelectorAvailable() {
      return this.storeName !== "butikk" && this.$store.state.currentUser && this.$store.state.currentUser.adminIn && this.$store.state.currentUser.adminIn.length > 1;
    },
  },
  watch: {
    storeId(newVal) {
      if (newVal) {
        // Reset logo when store changes
        this.hasLogo = false;

        // Check if the store already has a logo
        this.loadStoreData();
      }
    },
  },
  mounted() {
    // Check if user is logged in
    if (!this.$store.getters.userIsLoggedIn) {
      this.showLogin = true;
      this.isLoading = false;
      return;
    }

    // Reload user data to ensure we have the latest adminIn list
    this._userService
      .Reload()
      .then((success) => {
        console.log("User data reloaded:", success);
        if (!success) {
          this.showLogin = true;
          this.isLoading = false;
          return;
        }

        // Get the store ID from the current user's admin stores
        if (this.$store.state.currentUser && this.$store.state.currentUser.adminIn) {
          // Check if there's an onboarding in progress in localStorage
          const onboardingData = localStorage.getItem("onboardingInProgress");
          if (onboardingData) {
            try {
              const data = JSON.parse(onboardingData);
              // Set the store ID from localStorage if it exists in the user's admin stores
              const storeExists = this.$store.state.currentUser.adminIn.some((store) => store.id === data.storeId);
              if (storeExists) {
                this.storeId = data.storeId;
                // Set the current step from localStorage
                if (data.currentStep !== undefined && data.currentStep >= 0 && data.currentStep < this.steps.length) {
                  this.currentStep = data.currentStep;
                }
              }
            } catch (error) {
              // If there's an error parsing the data, remove it
              localStorage.removeItem("onboardingInProgress");
            }
          }

          // If no valid onboarding data was found, use the last store
          if (!this.storeId) {
            const adminStores = this.$store.state.currentUser.adminIn;
            this.storeId = adminStores[adminStores.length - 1].id;
          }

          // Load the store data and check for logo
          this.loadStoreData();

          // Save onboarding state to localStorage
          this.saveOnboardingState();
        } else {
          this.isLoading = false;
        }
      })
      .catch((error) => {
        console.error("Error fetching user data:", error);
        this.showLogin = true;
        this.isLoading = false;
      });
  },
  methods: {
    nextStep() {
      if (this.currentStep < this.steps.length - 1) {
        this.currentStep++;
        this.saveOnboardingState();
      }
    },
    prevStep() {
      if (this.currentStep > 0) {
        this.currentStep--;
        this.saveOnboardingState();
      }
    },
    goToStep(stepIndex) {
      if (stepIndex >= 0 && stepIndex < this.steps.length) {
        // Allow free navigation between steps
        this.currentStep = stepIndex;
        this.saveOnboardingState();
      }
    },
    publishStore() {
      // Log the publication of the store

      // Show loading spinner
      this.isPublishing = true;

      this._storeService
        .Publish(this.storeId, {
          publish: true,
        })
        .then(() => {
          // Complete the onboarding process
          localStorage.removeItem("onboardingInProgress");

          // reload store
          this.loadStoreData();
        })
        .catch((error) => {
          // Hide spinner on error
          this.isPublishing = false;
          alert(error);
        });
    },
    logoUpdated() {
      // Handle logo updated event
    },
    handleProductsImported(products) {
      // Handle imported products
    },
    handleImportCompleted(stats) {
      // Handle import completion
      this.hasProducts = true;
      this.importStats = stats;
    },
    handleGoToNextStep() {
      this.nextStep();
      const stepContent = document.querySelector(".step-content");
      stepContent.scrollIntoView({ behavior: "smooth" });
    },
    handleProductsLoaded(count) {
      // Update the product count
      this.productCount = count;
      this.hasProducts = count > 0;
    },
    handleImageUploaded(productId) {
      // Track the number of products with images
      if (!this.productsWithImages.includes(productId)) {
        this.productsWithImages.push(productId);
      }

      // Emit an event to update the parent state if needed
      this.$emit("product-image-uploaded", {
        productId,
        count: this.productsWithImages.length,
        total: this.productCount,
      });
    },
    loadStoreData() {
      // Get store data using the StoreService
      this._storeService
        .Get(this.storeId)
        .then((store) => {
          // If the store has a logoUrl property, update hasLogo
          this.hasLogo = !!store.logoUrl;
          this.storeName = store.name;
          this.storeApproved = store.approved;
          this.storeSlug = store.slug;
          this.saveOnboardingState();
          this.isLoading = false;
          this.isPublishing = false;
        })
        .catch((_error) => {
          alert("Feil ved lasting av butikkdata. Vennligst prøv igjen.");
          this.isLoading = false;
          this.isPublishing = false;
        });
    },
    saveOnboardingState() {
      this.isLoading = false;
      // Save onboarding progress to localStorage
      if (this.storeId && !this.storeApproved) {
        const onboardingState = {
          storeId: this.storeId,
          storeName: this.storeName,
          currentStep: this.currentStep,
          timestamp: new Date().getTime(),
        };

        localStorage.setItem("onboardingInProgress", JSON.stringify(onboardingState));
      } else {
        localStorage.removeItem("onboardingInProgress");
      }
    },
    closeLoginModal(isLoggedIn) {
      this.showLogin = !isLoggedIn;
      if (isLoggedIn) {
        // Reload the page to start fresh with the new user
        window.location.reload();
      }
    },
    toggleStoreSelector() {
      this.showStoreSelector = !this.showStoreSelector;
    },

    selectStore(id) {
      this.storeId = id;
      this.loadStoreData();
      this.showStoreSelector = false;
    },
  },
};
</script>

<style lang="scss" scoped>
.onboarding-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* Store selector styles */
.store-selector {
  margin-bottom: 2rem;
  text-align: center;

  .select-wrapper {
    position: relative;
    display: inline-block;

    select {
      appearance: none;
      background-color: #292c34;
      color: white;
      padding: 0.75rem 2rem 0.75rem 1rem;
      font-size: 1.2rem;
      border: 1px solid #444;
      border-radius: 4px;
      cursor: pointer;
      min-width: 250px;

      &:focus {
        outline: none;
        border-color: #d5f6e5;
      }
    }

    &::after {
      content: "▼";
      font-size: 0.8rem;
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: #d5f6e5;
    }
  }

  .store-name {
    h2 {
      color: #292c34;
      font-size: 1.5rem;
      margin: 0;
      padding: 0.5rem 0;
      font-weight: 600;
    }
  }
}

/* Progress indicator styles */
.progress-indicator {
  margin-bottom: 2rem;
}

.progress-steps {
  display: flex;
  justify-content: space-between;
  position: relative;
  margin-bottom: 1rem;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
  cursor: pointer;

  &.active {
    .step-number {
      background-color: #292c34;
      color: #d5f6e5;
    }

    .step-label {
      font-weight: 600;
      color: #292c34;
    }
  }

  &.completed {
    .step-number {
      background-color: #292c34;
      color: #d5f6e5;
    }

    .step-connector {
      background-color: #292c34;
    }
  }

  &:hover {
    .step-number {
      transform: scale(1.05);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .step-label {
      color: #292c34;
    }
  }
}

.step-number {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #e2e8f0;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 0.5rem;
  position: relative;
  z-index: 2;

  .checkmark {
    color: white;
    font-size: 14px;
    font-weight: bold;
  }
}

.step-label {
  font-size: 14px;
  color: #64748b;
  text-align: center;
}

.step-connector {
  position: absolute;
  top: 16px;
  right: calc(-50% + 16px);
  width: calc(100% - 32px);
  height: 2px;
  background-color: #e2e8f0;
  z-index: 1;
}

.step-content {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  padding: 1.5rem;
}

.step-title {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: #292c34;
  font-weight: 600;
}

.step-body {
  min-height: 250px;
  margin-bottom: 1.5rem;
}

.step-navigation {
  display: flex;
  justify-content: space-between;
  margin-top: 1.5rem;

  button {
    padding: 0.75rem 1.5rem;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;

    &.btn-primary {
      background-color: #292c34;
      color: #d5f6e5;

      &:hover {
        background-color: #1e2026;
      }

      &:disabled {
        background-color: #a0aec0;
        cursor: not-allowed;
      }
    }

    &.btn-secondary {
      background-color: #f8f9fa;
      color: #292c34;
      border-color: #e2e8f0;

      &:hover {
        background-color: #f0f2f5;
      }
    }

    &.btn-large {
      font-size: 1.25rem;
      padding: 1.25rem 2.5rem;
    }
  }
}

.publish-button-container {
  display: flex;
  justify-content: center;
  margin: 1rem;
}

.publish-explanation {
  margin: 1rem;
  text-align: center;
  color: #64748b;
}

.final-step-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  background-color: #f8f9fa;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.publish-btn {
  background-color: #292c34;
  color: #d5f6e5;
  padding: 1.25rem 2.5rem;
  font-size: 1.25rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #1e2026;
  }
}

.approved-store-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  text-align: center;

  h1 {
    font-size: 2.5rem;
    margin-bottom: 2rem;
    color: #292c34;
  }

  .shop-url {
    display: inline-block;
    margin: 20px 0;
    font-size: 1.2rem;
    color: #292c34;
    text-decoration: none;
    border: 2px solid #292c34;
    text-decoration: underline;
    border-radius: 8px;
    padding: 12px 20px;
    transition: all 0.3s ease;

    &:hover {
      background-color: #292c34;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
  }
}

.publishing-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 250px;
}

.spinner {
  width: 60px;
  height: 60px;
  border: 6px solid #f3f3f3;
  border-top: 6px solid #292c34;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.loading-cursor {
  cursor: wait;
}

.onboarding-title {
  margin-bottom: 5rem;
  text-align: center;
  position: relative;

  h1 {
    font-size: 2rem;
    margin: 0;
    padding: 0;
    font-weight: 600;
    color: #292c34;
  }

  .store-name-dropdown {
    cursor: pointer;
    border-bottom: 2px dotted #292c34;
    padding-bottom: 2px;
    transition: all 0.2s ease;

    &:hover {
      color: #4a5568;
    }

    .dropdown-arrow {
      font-size: 0.8rem;
      margin-left: 4px;
      vertical-align: middle;
    }
  }

  .store-dropdown-menu {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    width: auto;
    min-width: 200px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10;
    margin-top: 8px;
    padding: 8px 0;

    .store-dropdown-item {
      padding: 10px 16px;
      cursor: pointer;
      transition: background-color 0.2s ease;
      text-align: left;

      &:hover {
        background-color: #f7fafc;
      }

      &.active {
        background-color: #f0f2f5;
        color: #292c34;
        font-weight: 500;
      }
    }
  }
}
</style>

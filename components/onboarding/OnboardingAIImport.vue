<template>
  <div class="ai-import-container">
    <div
      v-if="importedProducts.length === 0"
      class="form-section add-more-section"
    >
      <div class="form-group">
        <label>{{ $i('import_aiPasteMenu') }}</label>
        <textarea
          v-model="aiMenuText"
          rows="10"
          class="form-control"
          :placeholder="$i('onboardingAI_menuPlaceholder')"
        />
        <div class="form-hint">{{ $i('import_aiTruncateNote') }}</div>
      </div>

      <div class="form-group">
        <label>{{ $i('import_aiExtraInstructions') }}</label>
        <textarea
          v-model="aiExtraInstructions"
          rows="4"
          class="form-control"
          :placeholder="$i('onboardingAI_extraInstructionsPlaceholder')"
        />
      </div>

      <div class="button-group">
        <button
          :disabled="isAILoading || !storeId"
          class="btn btn-primary"
          @click="runAIImport()"
        >
          <span v-if="!isAILoading">🤖 {{ $i('onboardingAI_importWithAI') }}</span>
          <span v-else>{{ $i('onboardingAI_importing') }}</span>
        </button>
      </div>
    </div>

    <div
      v-if="importedProducts.length > 0"
      class="results-section"
    >
      <h3>{{ $i('onboardingAI_foundProducts', { count: importedProducts.length }) }}</h3>
      <div class="products-table-container">
        <table class="products-table">
          <thead>
            <tr>
              <th>{{ $i('onboardingAI_tableCategory') }}</th>
              <th>{{ $i('onboardingAI_tableProduct') }}</th>
              <th>{{ $i('onboardingAI_tableDescription') }}</th>
              <th>{{ $i('import_colPrice') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(product, index) in importedProducts"
              :key="index"
            >
              <td>{{ product.categoryName }}</td>
              <td>{{ product.name }}</td>
              <td>{{ product.description }}</td>
              <td>{{ formatPrice(product.priceModel) }} {{ marketConfig.currencySymbol }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="importCompleted"
        class="import-results"
      >
        <div class="import-messages">
          <p>{{ importMessage }}</p>
          <p v-if="importResponse.createdProductCount">
            <span class="bold">{{ $i('import_createdProductCount') }}</span>
            <span>{{ importResponse.createdProductCount }}</span>
          </p>
          <p v-if="importResponse.deletedProductCount">
            <span class="bold">{{ $i('import_deletedProductCount') }}</span>
            <span>{{ importResponse.deletedProductCount }}</span>
          </p>
        </div>
      </div>

      <div class="button-group">
        <button
          class="btn btn-secondary"
          @click="resetComponent"
        >
          🔃 {{ $i('onboardingAI_startOver') }}
        </button>
        <button
          class="btn btn-secondary"
          @click="showInputForm"
        >
          ➕ {{ $i('onboardingAI_addMoreProducts') }}
        </button>
        <button
          class="btn btn-primary"
          :disabled="importCompleted || isLoading"
          @click="runImport()"
        >
          💾 {{ $i('onboardingAI_importToStore', { count: importedProducts.length, storeName }) }}
        </button>
      </div>
    </div>

    <div
      v-if="showAddMoreForm"
      class="form-section add-more-section"
    >
      <h4>{{ $i('onboardingAI_addMoreProducts') }}</h4>
      <div class="form-group">
        <label>{{ $i('import_aiPasteMenu') }}</label>
        <textarea
          v-model="aiMenuText"
          rows="10"
          class="form-control"
          :placeholder="$i('onboardingAI_menuPlaceholder')"
        />
      </div>

      <div class="form-group">
        <label>{{ $i('import_aiExtraInstructions') }}</label>
        <textarea
          v-model="aiExtraInstructions"
          rows="4"
          class="form-control"
          :placeholder="$i('onboardingAI_extraInstructionsPlaceholder')"
        />
      </div>

      <div class="button-group">
        <button
          :disabled="isAILoading || !storeId"
          class="btn btn-primary"
          @click="runAIImport(true)"
        >
          <span v-if="!isAILoading">🤖 {{ $i('onboardingAI_importWithAI') }}</span>
          <span v-else>{{ $i('onboardingAI_importing') }}</span>
        </button>
        <button
          class="btn btn-secondary"
          @click="showAddMoreForm = false"
        >
          {{ $i('common_cancel') }}
        </button>
      </div>
    </div>

    <div
      v-if="isAILoading"
      class="loading-overlay"
    >
      <div class="loading-spinner" />
      <div class="loading-message">
        {{ aiImportMessage }}
      </div>
    </div>

    <div
      v-if="isLoading"
      class="loading-overlay"
    >
      <div class="loading-spinner" />
      <div class="loading-message">{{ $i('onboardingAI_importingProducts') }}</div>
    </div>

    <div
      v-if="showReplaceConfirmation"
      class="replace-confirmation-dialog"
    >
      <div class="dialog-content">
        <h4>{{ $i('onboardingAI_existingProductsTitle') }}</h4>
        <p>{{ $i('onboardingAI_existingProductsQuestion') }}</p>
        <div class="confirmation-buttons">
          <button
            class="btn btn-primary"
            @click="confirmReplaceProducts(true)"
          >
            {{ $i('onboardingAI_deleteExistingAddNew') }}
          </button>
          <button
            class="btn btn-secondary"
            @click="confirmReplaceProducts(false)"
          >
            {{ $i('onboardingAI_keepExistingAddNew') }}
          </button>
          <button
            class="btn btn-outline-secondary cancel-btn"
            @click="cancelReplaceConfirmation()"
          >
            {{ $i('common_cancel') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "OnboardingAIImport",
  props: {
    storeId: {
      type: Number,
      required: true,
    },
    storeName: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      aiMenuText: "",
      aiExtraInstructions: "",
      aiImportMessage: "",
      isAILoading: false,
      importedProducts: [],
      showAddMoreForm: false,
      messageInterval: null,

      // Import related data
      importMessage: "",
      importCompleted: false,
      isLoading: false,
      hasExistingProducts: true,
      showReplaceConfirmation: false,
      replaceExisting: false,
      importResponse: {
        createdProductCount: 0,
        deletedProductCount: 0,
        failed: [],
      },
    };
  },
  watch: {
    storeId() {
      this.checkForExistingProducts();
    },
  },
  beforeDestroy() {
    if (this.messageInterval) {
      clearInterval(this.messageInterval);
    }
  },
  mounted() {
    // Check if store has existing products
    if (this.storeId) {
      this.checkForExistingProducts();
    }
  },
  methods: {
    checkForExistingProducts() {
      this._productService
        .GetAll(this.storeId)
        .then((products) => {
          this.hasExistingProducts = products && products.length > 0;
        })
        .catch((_error) => {
          // Silently fail, assume has products
          this.hasExistingProducts = true;
        });
    },
    runAIImport(appendProducts = false) {

      if (!this.storeId) {
        this.aiImportMessage = this.$i("onboardingAI_storeIdMissing");
        return;
      }

      if (!this.aiMenuText || this.aiMenuText.trim() === "") {
        this.aiImportMessage = this.$i("import_aiPasteMenuRequired");
        return;
      }


      this.isAILoading = true;
      this.aiImportMessage = this.$i("import_aiStarting");

      // Only reset products if not appending
      if (!appendProducts) {
        this.importedProducts = [];
      }

      this.resetImportState();
      this.showAddMoreForm = false;

      // Set up progress messages
      let messageIndex = 0;
      const progressMessages = [this.$i("import_aiProgressReading"), this.$i("import_aiProgressAnalyzing"), this.$i("import_aiProgressStructuring"), this.$i("import_aiProgressExtracting"), this.$i("import_aiProgressFormatting"), this.$i("import_aiProgressAlmostDone")];
      this.messageInterval = setInterval(() => {
        if (!this.isAILoading) {
          clearInterval(this.messageInterval);
          return;
        }

        this.aiImportMessage = progressMessages[messageIndex % progressMessages.length];
        messageIndex++;
      }, 4000); // Change message every 4 seconds

      // Call the AI service

      this._aiService
        .MenuToJson(this.storeId, this.aiMenuText, this.aiExtraInstructions)
        .then((res) => {

          clearInterval(this.messageInterval);

          this.isAILoading = false;

          // If the response contains rows, process them
          if (res && Array.isArray(res.rows) && res.rows.length > 0) {
            this.aiImportMessage = this.$i("onboardingAI_foundProducts", { count: res.rows.length });

            // If appending, add to existing products, otherwise replace
            if (appendProducts) {
              this.importedProducts = [...this.importedProducts, ...res.rows];
            } else {
              this.importedProducts = res.rows;
            }

            // Clear the input fields
            this.aiMenuText = "";
            this.aiExtraInstructions = "";

            // Emit event to notify parent component
            this.$emit("products-imported", this.importedProducts);
          } else {
            // Show error if no rows were found
            this.aiImportMessage = this.$i("import_aiNoProducts");
          }
        })
        .catch((error) => {

          clearInterval(this.messageInterval);

          alert(this.$i("import_aiError", { message: error.message || this.$i("import_aiUnknownError") }));

          this.isAILoading = false;

          this.aiImportMessage = this.$i("import_aiError", { message: error.message || this.$i("import_aiUnknownError") });
        });

    },
    formatPrice(price) {
      if (!price) {
        return "0";
      }
      return parseFloat(price).toFixed(2);
    },
    resetComponent() {
      this.clearData();
    },
    showInputForm() {
      this.showAddMoreForm = true;
      this.aiMenuText = "";
      this.aiExtraInstructions = "";
    },
    clearData() {
      this.aiMenuText = "";
      this.aiExtraInstructions = "";
      this.aiImportMessage = "";
      this.importedProducts = [];
      this.showAddMoreForm = false;
      this.resetImportState();
    },
    resetImportState() {
      this.importMessage = "";
      this.importCompleted = false;
      this.isLoading = false;
      this.importResponse = {
        createdProductCount: 0,
        deletedProductCount: 0,
        failed: [],
      };
    },
    runImport() {
      if (this.importCompleted) {
        return;
      }

      // If there are existing products and we're not just verifying, ask for confirmation
      if (this.hasExistingProducts && !this.showReplaceConfirmation) {
        this.showReplaceConfirmation = true;
        return;
      }

      this.isLoading = true;
      this.importMessage = "";

      // Reset the confirmation dialog state
      this.showReplaceConfirmation = false;

      // Call the product service to import the products
      this._productService
        .BulkImport({
          storeId: this.storeId,
          currency: "NOK",
          verifyOnly: false,
          replaceAll: this.replaceExisting === true, // Use the user's choice
          rows: JSON.parse(JSON.stringify(this.importedProducts)),
        })
        .then((res) => {
          this.importResponse = res;

          if (Array.isArray(this.importResponse.failed) && this.importResponse.failed.length === 0) {
            // Instead of showing success message, emit events and go to next step
            this.importCompleted = true;

            // Emit event to notify parent that import is complete
            this.$emit("import-completed", {
              created: this.importResponse.createdProductCount,
              deleted: this.importResponse.deletedProductCount,
            });

            // Emit event to notify parent of imported products
            this.$emit("products-imported", this.importedProducts);

            // Emit a new event to trigger navigation to next step
            this.$emit("go-to-next-step");
          } else {
            this.importMessage = this.$i("onboardingAI_importPartialError");
          }
        })
        .catch((error) => {
          this.importMessage = this.$i("import_aiError", { message: error.message || this.$i("import_aiUnknownError") });
        })
        .finally(() => {
          this.isLoading = false;
        });
    },
    confirmReplaceProducts(replace) {
      this.replaceExisting = replace;
      this.runImport();
    },
    cancelReplaceConfirmation() {
      this.showReplaceConfirmation = false;
    },
  },
};
</script>

<style lang="scss" scoped>
.ai-import-container {
  position: relative;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.form-section {
  margin-bottom: 2rem;
}

.add-more-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background-color: #f8f9fa;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}

.form-group {
  margin-bottom: 1.5rem;

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .form-control {
    width: 100%;
    padding: 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid #e2e8f0;
    font-family: inherit;
    line-height: 1.5;

    &:focus {
      outline: none;
      border-color: #3182ce;
      box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
    }
  }

  textarea.form-control {
    resize: vertical;
    min-height: 100px;
  }

  .form-hint {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    color: #718096;
  }
}

.button-group {
  margin: 1.5rem 0;
  display: flex;
  flex-direction: row;
  gap: 0.5rem;

  button {
    margin-right: 0;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

.import-message {
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 0.375rem;
  margin: 1rem 0;
}

.results-section {
  margin-top: 2rem;

  h3 {
    margin-bottom: 1rem;
  }
}

.products-table-container {
  overflow-x: auto;
  margin-bottom: 1.5rem;
}

.products-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
  }

  th {
    background-color: #f7fafc;
    font-weight: 600;
  }

  tr:hover td {
    background-color: #f7fafc;
  }
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3182ce;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.loading-message {
  font-weight: 500;
}

.import-results {
  margin-top: 2rem;
}

.import-messages {
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 0.375rem;
}

.bold {
  font-weight: bold;
}

button {
  padding: 0.5rem 1rem;
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

  &.btn-outline-secondary {
    background-color: transparent;
    color: #292c34;
    border-color: #e2e8f0;

    &:hover {
      background-color: #f0f2f5;
    }
  }
}

.replace-confirmation-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;

  .dialog-content {
    padding: 2rem;
    background-color: #f8f9fa;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
    width: 500px;
    max-width: 90%;

    h4 {
      margin-top: 0;
      margin-bottom: 1rem;
    }

    p {
      margin-bottom: 1.5rem;
    }
  }

  .confirmation-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    button {
      width: 100%;
      padding: 0.75rem 1rem;
      white-space: normal;
      height: auto;
      line-height: 1.2;
      text-align: center;
    }
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>

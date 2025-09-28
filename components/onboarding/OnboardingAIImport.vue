<template>
  <div class="ai-import-container">
    <div
      v-if="importedProducts.length === 0"
      class="form-section add-more-section"
    >
      <div class="form-group">
        <label>Lim inn menyen som tekst</label>
        <textarea
          v-model="aiMenuText"
          rows="10"
          class="form-control"
          placeholder="Lim inn menytekst her..."
        />
        <div class="form-hint">Merk: For lange menyer kan bli avkortet. Importer 2-3 kategorier av gangen for best resultat.</div>
      </div>

      <div class="form-group">
        <label>Ekstra instruksjoner (valgfritt)</label>
        <textarea
          v-model="aiExtraInstructions"
          rows="4"
          class="form-control"
          placeholder="F.eks. 'Alle priser er inkl. MVA', 'Kategoriser etter type mat', etc."
        />
      </div>

      <div class="button-group">
        <button
          :disabled="isAILoading || !storeId"
          class="btn btn-primary"
          @click="runAIImport()"
        >
          <span v-if="!isAILoading">🤖 Importer med AI</span>
          <span v-else>Importerer...</span>
        </button>
      </div>
    </div>

    <div
      v-if="importedProducts.length > 0"
      class="results-section"
    >
      <h3>Fant {{ importedProducts.length }} produkter</h3>
      <div class="products-table-container">
        <table class="products-table">
          <thead>
            <tr>
              <th>Kategori</th>
              <th>Produkt</th>
              <th>Beskrivelse</th>
              <th>Pris</th>
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
              <td>{{ formatPrice(product.priceModel) }} kr</td>
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
            <span class="bold">Antall import av produkter: </span>
            <span>{{ importResponse.createdProductCount }}</span>
          </p>
          <p v-if="importResponse.deletedProductCount">
            <span class="bold">Antall sletting av produkter: </span>
            <span>{{ importResponse.deletedProductCount }}</span>
          </p>
        </div>
      </div>

      <div class="button-group">
        <button
          class="btn btn-secondary"
          @click="resetComponent"
        >
          🔃 Start på nytt
        </button>
        <button
          class="btn btn-secondary"
          @click="showInputForm"
        >
          ➕ Legg til flere produkter
        </button>
        <button
          class="btn btn-primary"
          :disabled="importCompleted || isLoading"
          @click="runImport()"
        >
          💾 Importer {{ importedProducts.length }} produkter til {{ storeName }}
        </button>
      </div>
    </div>

    <div
      v-if="showAddMoreForm"
      class="form-section add-more-section"
    >
      <h4>Legg til flere produkter</h4>
      <div class="form-group">
        <label>Lim inn menyen som tekst</label>
        <textarea
          v-model="aiMenuText"
          rows="10"
          class="form-control"
          placeholder="Lim inn menytekst her..."
        />
      </div>

      <div class="form-group">
        <label>Ekstra instruksjoner (valgfritt)</label>
        <textarea
          v-model="aiExtraInstructions"
          rows="4"
          class="form-control"
          placeholder="F.eks. 'Alle priser er inkl. MVA', 'Kategoriser etter type mat', etc."
        />
      </div>

      <div class="button-group">
        <button
          :disabled="isAILoading || !storeId"
          class="btn btn-primary"
          @click="runAIImport(true)"
        >
          <span v-if="!isAILoading">🤖 Importer med AI</span>
          <span v-else>Importerer...</span>
        </button>
        <button
          class="btn btn-secondary"
          @click="showAddMoreForm = false"
        >
          Avbryt
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
      <div class="loading-message">Importerer produkter...</div>
    </div>

    <div
      v-if="showReplaceConfirmation"
      class="replace-confirmation-dialog"
    >
      <div class="dialog-content">
        <h4>Denne butikken har eksisterende produkter</h4>
        <p>Hva ønsker du å gjøre?</p>
        <div class="confirmation-buttons">
          <button
            class="btn btn-primary"
            @click="confirmReplaceProducts(true)"
          >
            Slett eksisterende og legg til nye
          </button>
          <button
            class="btn btn-secondary"
            @click="confirmReplaceProducts(false)"
          >
            Behold eksisterende og legg til nye
          </button>
          <button
            class="btn btn-outline-secondary cancel-btn"
            @click="cancelReplaceConfirmation()"
          >
            Avbryt
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
      progressMessages: ["Leser gjennom menyoppføringer...", "Analyserer priser og kategorier...", "Strukturerer menyelementer...", "Henter ut produktdetaljer...", "Formaterer data for import...", "Nesten ferdig..."],
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
      console.log("1. Starting runAIImport method, appendProducts:", appendProducts);

      if (!this.storeId) {
        console.log("2. Error: Missing storeId");
        this.aiImportMessage = "Butikk-ID mangler";
        return;
      }

      if (!this.aiMenuText || this.aiMenuText.trim() === "") {
        console.log("3. Error: Missing menu text");
        this.aiImportMessage = "Vennligst lim inn menytekst";
        return;
      }

      console.log("4. Input validation passed, storeId:", this.storeId);
      console.log("5. Menu text length:", this.aiMenuText.length);
      console.log("6. Extra instructions:", this.aiExtraInstructions);

      this.isAILoading = true;
      this.aiImportMessage = "Starter import...";
      console.log("7. Set isAILoading to true, starting import process");

      // Only reset products if not appending
      if (!appendProducts) {
        console.log("8. Not appending, resetting importedProducts array");
        this.importedProducts = [];
      } else {
        console.log("8. Appending mode, keeping existing importedProducts:", this.importedProducts.length);
      }

      this.resetImportState();
      this.showAddMoreForm = false;
      console.log("9. Reset import state and hid add more form");

      // Set up progress messages
      let messageIndex = 0;
      console.log("10. Setting up progress message interval");
      this.messageInterval = setInterval(() => {
        if (!this.isAILoading) {
          console.log("11. isAILoading is false, clearing message interval");
          clearInterval(this.messageInterval);
          return;
        }

        this.aiImportMessage = this.progressMessages[messageIndex % this.progressMessages.length];
        console.log("12. Updated progress message:", this.aiImportMessage);
        messageIndex++;
      }, 4000); // Change message every 4 seconds

      // Call the AI service
      console.log("13. About to call AI service MenuToJson method");
      console.log("14. Parameters - storeId:", this.storeId);
      console.log("15. Parameters - menuText length:", this.aiMenuText.length);
      console.log("16. Parameters - extraInstructions:", this.aiExtraInstructions);

      this._aiService
        .MenuToJson(this.storeId, this.aiMenuText, this.aiExtraInstructions)
        .then((res) => {
          console.log("17. AI service MenuToJson call succeeded");
          console.log("18. Response received:", res);

          clearInterval(this.messageInterval);
          console.log("19. Cleared message interval");

          this.isAILoading = false;
          console.log("20. Set isAILoading to false");

          // If the response contains rows, process them
          if (res && Array.isArray(res.rows) && res.rows.length > 0) {
            console.log("21. Response contains rows, count:", res.rows.length);
            this.aiImportMessage = `Fant ${res.rows.length} produkter.`;

            // If appending, add to existing products, otherwise replace
            if (appendProducts) {
              console.log("22. Appending new products to existing ones");
              this.importedProducts = [...this.importedProducts, ...res.rows];
            } else {
              console.log("22. Replacing all products with new ones");
              this.importedProducts = res.rows;
            }
            console.log("23. Updated importedProducts, new count:", this.importedProducts.length);

            // Clear the input fields
            this.aiMenuText = "";
            this.aiExtraInstructions = "";
            console.log("24. Cleared input fields");

            // Emit event to notify parent component
            console.log("25. Emitting products-imported event");
            this.$emit("products-imported", this.importedProducts);
            console.log("26. Event emitted successfully");
          } else {
            // Show error if no rows were found
            console.log("21. Error: No products found in response", res);
            this.aiImportMessage = "Feil ved import: Ingen produkter ble funnet i menyteksten. Prøv å omformulere eller legg til mer detaljer.";
          }
        })
        .catch((error) => {
          console.log("17. AI service MenuToJson call failed with error:", error);
          console.log("18. Error details:", error.message || "No error message");

          clearInterval(this.messageInterval);
          console.log("19. Cleared message interval");

          alert("Error running AI import: " + (error.message || "Ukjent feil"));
          console.log("20. Displayed error alert");

          this.isAILoading = false;
          console.log("21. Set isAILoading to false");

          this.aiImportMessage = `Feil ved import: ${error.message || "Ukjent feil"}`;
          console.log("22. Updated aiImportMessage with error");
        });

      console.log("27. AI service call initiated, method execution complete");
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
            this.importMessage = "Noen produkter kunne ikke importeres. Vennligst sjekk listen over feilede produkter.";
          }
        })
        .catch((error) => {
          this.importMessage = `Feil ved import: ${error.message || "Ukjent feil"}`;
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

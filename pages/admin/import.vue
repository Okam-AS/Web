<template>
  <AdminPage>
    <div class="container">
      <div class="table-wrapper">
        <div style="margin: 1em">
          <h1 style="margin-bottom: 0.5em">
            Import
          </h1>
          <p style="margin-bottom: 1.5em">
            Et nyttig verktøy for førstegangsimport av varer, for å opprette produkter og kategorier
          </p>
          <div class="store-categories-wrapper">
            <div class="select-wrapper">
              <select v-model="selectedStore">
                <option v-for="option in $store.state.currentUser.adminIn" :key="option.id" :value="option.id">
                  {{ option.name }} ({{ option.id }})
                </option>
              </select>
            </div>
            <div class="button-group">
              <input class="emoji-btn" type="button" value="👓 Verifiser og importer" @click="showModal = true">
              <input class="emoji-btn" type="button" value="🤖 AI Import" @click="showAIModal = true">
              <input class="emoji-btn" type="button" value="🆑 Tøm alle rader" @click="showClearRowsModal = true">
              <input class="emoji-btn" type="button" value="💾 Eksport/Import" @click="showExportModal = true">
            </div>
          </div>
          <div v-if="selectedStore > 0" class="categories-section">
            <h3>Kategorier</h3>
            <div class="categories-list">
              <div class="categories-inline">
                <span v-for="category in categories" :key="category.id" class="category-tag">
                  {{ category.name }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <template>
          <div style="margin: 1em" />
          <table>
            <tbody>
              <tr>
                <th />
                <th>Kategorinavn</th>
                <th>Produktnavn</th>
                <th style="min-width: 300px">
                  Produktbeskrivelse
                </th>
                <th>Allergener</th>
                <th>Pris</th>
                <th>Take away MVA (%)</th>
                <th>Tillegg for spis inne</th>
                <th>Spis inne MVA (%)</th>
                <th>Pant</th>
                <th>Utsolgt</th>
              </tr>
              <tr v-for="(row, index) in rows" :key="index">
                <td class="row-count">
                  {{ index !== rows.length - 1 ? index + 1 : "" }}
                </td>
                <td>
                  <autocomplete-input v-model="row.categoryName" class="full-width" :suggestions="allCategoryNames"
                    type="text" :server-error-message="getFailedMessage(index, 'categoryName')" />
                </td>
                <td>
                  <autocomplete-input v-model="row.name" class="full-width" :suggestions="allProductNames" type="text"
                    :server-error-message="getFailedMessage(index, 'name')" />
                </td>
                <td>
                  <autocomplete-input v-model="row.description" class="full-width" :suggestions="allProductDescriptions"
                    :min-length="0" :max-length="400" :multiline="true" type="text"
                    :server-error-message="getFailedMessage(index, 'description')" />
                </td>
                <td>
                  <autocomplete-input v-model="row.otherInformation" class="full-width"
                    :suggestions="allProductOtherInformations" :min-length="0" type="text"
                    :server-error-message="getFailedMessage(index, 'otherInformation')" />
                </td>
                <td>
                  <currency-input v-model="row.priceModel" currency="NOK" style="width: 80px"
                    @change="amountChange(index, 'price', $event)" />
                </td>
                <td>
                  <input v-model="row.tax" class="full-width" type="number" pattern="[0-9]{2}" min="0" max="99"
                    @change="taxChange($event, 'tax', index)">
                </td>
                <td>
                  <currency-input v-model="row.tableAdditionalModel" currency="NOK" style="width: 90px"
                    @change="amountChange(index, 'tableAdditional', $event)" />
                </td>
                <td>
                  <input v-model="row.tableTax" class="full-width" type="number" pattern="[0-9]{2}" min="0" max="99"
                    @change="taxChange($event, 'tableTax', index)">
                </td>
                <td>
                  <currency-input v-model="row.depositModel" currency="NOK" style="width: 60px"
                    @change="amountChange(index, 'deposit', $event)" />
                </td>
                <td>
                  <input v-model="row.soldOut" style="margin-left: 1.5em" type="checkbox">
                </td>
                <td v-if="index !== rows.length - 1 || rows.length < 2">
                  <input class="emoji-btn" type="button" value="🔂 Dupliser rad" @click="copyRow(index)">
                  <input class="emoji-btn" type="button" value="➖ Fjern rad" @click="deleteRow(index)">
                </td>
              </tr>
            </tbody>
          </table>
        </template>
        <Modal v-if="showModal" @close="closeModal">
          <h1 style="margin-bottom: 1em">
            Importer
          </h1>
          <div v-if="!importCompleted" style="margin: 1em 0 1em 0">
            <label><input v-model="replaceAll" type="checkbox">
              Slett alle eksisterende produkter før import</label>
          </div>
          <div v-if="importMessage" class="import-messages">
            <p>
              {{ importMessage }}
            </p>
            <p v-if="importResponse.createdProductCount">
              <span style="font-weight: bold">Antall import av produkter: </span>
              <span>{{ importResponse.createdProductCount }}</span>
            </p>
            <p v-if="importResponse.deletedProductCount">
              <span style="font-weight: bold">Antall sletting av produkter: </span>
              <span>{{ importResponse.deletedProductCount }}</span>
            </p>
          </div>

          <div class="modal-buttons">
            <input v-if="isVerified" class="emoji-btn" type="button" value="✅ Godkjenn og importer"
              :style="{ opacity: importCompleted ? 0.5 : 1 }" :disabled="importCompleted" @click="runImport(false)">
            <input v-if="!importCompleted" class="emoji-btn" type="button" value="👓 Verifiser"
              @click="runImport(true)">
            <input class="emoji-btn" type="button" value="Lukk" @click="closeModal">
          </div>
          <Loading :loading="isLoading" />
        </Modal>
        <Modal v-if="showAIModal" @close="closeAIModal">
          <div style="width: 100%; min-width: 500px">
            <h1 style="margin-bottom: 1.5em">
              AI Import
            </h1>
            <div v-if="!aiImportCompleted" style="margin: 1em 0 1em 0">
              <div class="form-group" style="margin-bottom: 1.5em">
                <label style="display: block; margin-bottom: 0.5em">Lim inn menyen som tekst</label>
                <textarea v-model="aiMenuText" rows="10" class="form-control"
                  style="width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.375rem; border: 1px solid #e2e8f0; min-height: 200px; resize: vertical; font-family: inherit; line-height: 1.5" />
                <div style="margin-top: 0.5em; font-size: 0.85em; color: #718096">
                  Merk: For lange menyer kan bli avkortet. Importer 2-3 kategorier av gangen for best resultat.
                </div>
              </div>
              <div class="form-group" style="margin-bottom: 1.5em">
                <label style="display: block; margin-bottom: 0.5em">Ekstra instruksjoner (valgfritt)</label>
                <textarea v-model="aiExtraInstructions" rows="4" class="form-control"
                  style="width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.375rem; border: 1px solid #e2e8f0; resize: vertical; font-family: inherit; line-height: 1.5" />
              </div>
              <div class="button-group" style="margin-top: 2em; margin-bottom: 1.5em">
                <input :disabled="isAILoading || selectedStore <= 0" class="emoji-btn" type="button" value="🚀 Importer"
                  @click="runAIImport">
                <input class="emoji-btn" type="button" value="Lukk" @click="closeAIModal">
              </div>
              <div v-if="aiImportMessage" class="import-message"
                style="margin-top: 1.5em; padding: 1em; background-color: #f8f9fa; border-radius: 0.375rem">
                {{ aiImportMessage }}
              </div>
              <Loading v-if="isAILoading" />
            </div>
            <div v-else>
              <div class="import-message"
                style="margin: 1.5em 0; padding: 1em; background-color: #f8f9fa; border-radius: 0.375rem">
                {{ aiImportMessage }}
              </div>
              <div class="button-group" style="margin-top: 2em">
                <input class="emoji-btn" type="button" value="Lukk" @click="closeAIModal">
              </div>
            </div>
          </div>
        </Modal>
        <Modal v-if="showAIConfirmModal" @close="showAIConfirmModal = false">
          <h1 style="margin-bottom: 1em">
            Bekreft AI-import
          </h1>
          <p>Du har allerede eksisterende rader. Ønsker du å erstatter disse med nye rader eller legge dem til?</p>
          <p style="margin-top: 0.5em; font-size: 0.9em;">
            {{ aiImportData ? aiImportData.length : 0 }} nye produkter er klare for import.
          </p>
          <div class="modal-buttons">
            <input class="emoji-btn" type="button" value="Erstatt eksisterende rader" @click="handleAIConfirm(true)">
            <input class="emoji-btn" type="button" value="Legg til nye rader" @click="handleAIConfirm(false)">
            <input class="emoji-btn" type="button" value="Avbryt" @click="showAIConfirmModal = false">
          </div>
        </Modal>
        <LoginModal v-if="showLogin" @close="closeLoginModal" />
        <Modal v-if="showClearRowsModal" @close="showClearRowsModal = false">
          <p>
            Er du sikker på at du ønsker å fjerne alle rader fra denne tabellen? Produkter som allerede er importert
            vil ikke
            bli berørt.
          </p>
          <div class="modal-buttons">
            <input class="emoji-btn" type="button" value="🆑 Tøm alle rader" @click="clearRows">
            <input class="emoji-btn" type="button" value="Lukk" @click="showClearRowsModal = false">
          </div>
        </Modal>
        <Modal v-if="showExportModal" @close="showExportModal = false">
          <h1 style="margin-bottom: 1em">
            Eksport/Import Data
          </h1>
          <div v-if="!importMode" class="export-container">
            <p>Kopier denne dataen for å lagre din nåværende importkonfigurasjon:</p>
            <textarea v-model="exportData" readonly class="export-textarea" @focus="$event.target.select()" />
            <div class="modal-buttons">
              <input class="emoji-btn" type="button" value="📋 Kopier til utklippstavle" @click="copyToClipboard">
              <input class="emoji-btn" type="button" value="📥 Bytt til import" @click="importMode = true">
              <input class="emoji-btn" type="button" value="Lukk" @click="showExportModal = false">
            </div>
          </div>
          <div v-else class="import-container">
            <p>Lim inn din lagrede importkonfigurasjon her:</p>
            <textarea v-model="importData" class="export-textarea" placeholder="Lim inn importdata her..." />
            <div class="modal-buttons">
              <input class="emoji-btn" type="button" value="📥 Importer data" @click="importSavedData">
              <input class="emoji-btn" type="button" value="📤 Bytt til eksport" @click="importMode = false">
              <input class="emoji-btn" type="button" value="Lukk" @click="showExportModal = false">
            </div>
          </div>
        </Modal>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import Loading from '~/components/atoms/Loading.vue';
import AdminPage from '~/components/organisms/AdminPage.vue';
import Modal from '~/components/atoms/Modal.vue';
import AutocompleteInput from '~/components/atoms/AutocompleteInput.vue';
import LoginModal from '~/components/molecules/LoginModal.vue';

export default {
  components: { AdminPage, Modal, AutocompleteInput, LoginModal, Loading },
  data() {
    return {
      isLoading: false,
      showModal: false,
      showLogin: false,
      selectedStore: null,
      replaceAll: false,
      rows: [],
      importResponse: {},
      importMessage: '',
      isVerified: false,
      showClearRowsModal: false,
      categories: [],
      showExportModal: false,
      importMode: true,
      exportData: '',
      importData: '',
      importCompleted: false,
      aiImportMessage: '',
      isAILoading: false,
      aiMenuText: '',
      aiExtraInstructions: '',
      aiImportCompleted: false,
      showAIModal: false,
      showAIConfirmModal: false,
      aiImportData: null
    };
  },
  computed: {
    allCategoryNames() {
      const fromRows = this.getAllDisctinct('categoryName');
      const fromCategories = this.categories.map(c => c.name);
      return [...new Set([...fromRows, ...fromCategories])];
    },
    allProductNames() {
      return this.getAllDisctinct('name');
    },
    allProductDescriptions() {
      return this.getAllDisctinct('description');
    },
    allProductOtherInformations() {
      return this.getAllDisctinct('otherInformation');
    },
    emptyRow() {
      return {
        categoryName: '',
        name: '',
        description: '',
        otherInformation: '',
        priceModel: 0,
        priceAmount: 0,
        tax: 15,
        tableAdditionalModel: 0,
        tableAdditionalAmount: 0,
        tableTax: 25,
        depositModel: 0,
        depositAmount: 0,
        soldOut: false
      };
    }
  },
  watch: {
    rows: {
      handler(val) {
        if (!Array.isArray(val) || val.length < 1) {
          this.rows = [this.emptyRow];
        } else if (val.length === 1 || !this.isEmptyRow(val[val.length - 1])) {
          this.addEmptyRow();
        }
        if (window && window.localStorage) {
          localStorage.setItem('importRows', JSON.stringify(val));
        }
      },
      deep: true
    },
    selectedStore(newVal) {
      if (newVal > 0) {
        this.getCategories();
      } else {
        this.categories = [];
      }
      if (window && window.localStorage) {
        localStorage.setItem('importSelectedStore', newVal);
      }
    },
    showExportModal(val) {
      if (val) {
        this.exportData = JSON.stringify(
          {
            storeId: this.selectedStore,
            replaceAll: this.replaceAll,
            rows: this.rows.slice(0, -1) // Remove empty row
          },
          null,
          2
        );
      }
    }
  },
  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      this.showLogin = true;
      return;
    }
    this.init();
    if (!this.selectedStore && this.$store.state.currentUser.adminIn?.length) {
      this.selectedStore = this.$store.state.currentUser.adminIn[0].id;
    }
  },
  methods: {
    init() {
      if (window && window.localStorage) {
        const storedRows = localStorage.getItem('importRows');
        const storedStore = localStorage.getItem('importSelectedStore');

        if (storedRows) {
          this.$set(this, 'rows', JSON.parse(storedRows));
        } else {
          this.clearRows();
        }

        if (storedStore) {
          this.selectedStore = parseInt(storedStore);
        }
      }
    },
    closeLoginModal(isLoggedIn) {
      this.showLogin = !isLoggedIn;
      if (isLoggedIn) {
        this.init();
      }
    },
    clearRows() {
      this.replaceAll = false;
      this.rows = [JSON.parse(JSON.stringify(this.emptyRow)), JSON.parse(JSON.stringify(this.emptyRow))];
      this.showClearRowsModal = false;
      this.importResponse = {};
      if (window && window.localStorage) {
        localStorage.removeItem('importRows');
      }
    },
    amountChange(rowIndex, rowKey, newValue) {
      if (isNaN(parseInt(newValue)) || !Number.isInteger(parseInt(newValue)) || parseInt(newValue) < 0 || parseInt(newValue) > 10000) {
        this.rows[rowIndex][rowKey + 'Model'] = 0;
        this.rows[rowIndex][rowKey + 'Amount'] = 0;
      } else {
        this.rows[rowIndex][rowKey + 'Amount'] = Math.trunc((newValue ?? 0) * 100);
      }
    },
    taxChange(event, keyName, index) {
      if (!event || !event.target || isNaN(parseInt(event.target.value)) || !Number.isInteger(parseInt(event.target.value))) {
        this.rows[index][keyName] = 0;
      }
      if (event.target.value > 99) {
        this.rows[index][keyName] = 99;
      }
      if (event.target.value < 0) {
        this.rows[index][keyName] = 0;
      }
      this.rows[index][keyName] = parseInt(event.target.value);
    },
    getAllDisctinct(rowKey) {
      return this.rows.map(x => x[rowKey]).filter((value, index, self) => self.indexOf(value) === index && !!value);
    },
    isEmptyRow(row) {
      if (!row) {
        return true;
      }
      const _this = this;
      let isEmptyRow = true;
      Object.keys(this.emptyRow).forEach((key) => {
        if (row[key] !== _this.emptyRow[key]) {
          isEmptyRow = false;
        }
      });
      return isEmptyRow;
    },
    deleteRow(index) {
      this.$delete(this.rows, index);
    },
    addEmptyRow() {
      this.rows.push(JSON.parse(JSON.stringify(this.emptyRow)));
    },
    copyRow(index) {
      const copiedRow = JSON.parse(JSON.stringify(this.rows[index]));
      this.rows.splice(index, 0, copiedRow);
    },
    closeModal() {
      this.isVerified = false;
      this.showModal = false;
      this.importMessage = '';
      this.importCompleted = false;
    },
    closeAIModal() {
      this.showAIModal = false;
      this.aiImportCompleted = false;
      this.aiImportMessage = '';
      this.isAILoading = false;
      this.aiImportData = null;
    },
    getFailedMessage(index, key) {
      if (!this.importResponse || !Array.isArray(this.importResponse.failed)) {
        return '';
      }
      const fail = this.importResponse.failed.find(x => x.rowNumber === index + 1 && x.rowKey.toLowerCase() === key.toLowerCase());
      return fail ? fail.reason : '';
    },
    getCategories() {
      this._categoryService
        .GetAll(this.selectedStore, true)
        .then((res) => {
          this.categories = res;
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error('Failed to load categories:', err);
        });
    },
    runImport(verifyOnly) {
      const _this = this;
      _this.importMessage = '';

      if (_this.importCompleted && !verifyOnly) {
        return;
      }

      if (_this.selectedStore <= 0) {
        _this.importMessage = 'Velg butikk først';
      } else {
        _this.isLoading = true;
        _this._productService
          .BulkImport({
            storeId: this.selectedStore,
            currency: 'NOK',
            verifyOnly,
            replaceAll: _this.replaceAll,
            rows: JSON.parse(JSON.stringify(_this.rows)).slice(0, _this.rows.length - 1) // Remove last item as it is an empty row
          })
          .then((res) => {
            _this.importResponse = res;
            if (Array.isArray(_this.importResponse.failed) && _this.importResponse.failed.length === 0) {
              _this.isVerified = true;
              _this.importMessage = verifyOnly ? 'Dette ser bra ut! Ønsker du å gjennomføre denne handlingen:' : 'Ferdig! Dette ble gjennomført:';
              if (!verifyOnly) {
                _this.importCompleted = true;
                _this.getCategories();
              }
            } else {
              _this.importMessage = 'Ser ut noen felter er feil. Lukk denne modalen for å se gjennom feltene som er markert med rødt';
              _this.isVerified = false;
              _this.importResponse.createdProductCount = 0;
              _this.importResponse.deletedProductCount = 0;
              // eslint-disable-next-line no-console
              console.log(res);
            }
          })
          .catch((err) => {
            _this.importMessage = 'Noe gikk galt her. Mest sannsynlig var det noen produkter som ikke kunne slettes. Kontakt systemansvarlig for mer hjelp.';
            _this.isVerified = false;
            _this.importResponse.createdProductCount = 0;
            _this.importResponse.deletedProductCount = 0;
            // eslint-disable-next-line no-console
            console.log(err);
          })
          .finally(() => {
            _this.isLoading = false;
          });
      }
    },
    runAIImport() {
      const _this = this;
      _this.aiImportMessage = 'Starter import...';

      if (_this.selectedStore <= 0) {
        _this.aiImportMessage = 'Velg butikk først';
        return;
      }

      if (!_this.aiMenuText || _this.aiMenuText.trim() === '') {
        _this.aiImportMessage = 'Vennligst lim inn menytekst';
        return;
      }

      _this.isAILoading = true;

      // Set up progress messages
      let messageIndex = 0;
      const progressMessages = ['Leser gjennom menyoppføringer...', 'Analyserer priser og kategorier...', 'Strukturerer menyelementer...', 'Henter ut produktdetaljer...', 'Formaterer data for import...', 'Nesten ferdig...'];

      // Show progress messages while waiting
      const messageInterval = setInterval(() => {
        if (!_this.isAILoading) {
          clearInterval(messageInterval);
          return;
        }

        _this.aiImportMessage = progressMessages[messageIndex % progressMessages.length];
        messageIndex++;
      }, 4000); // Change message every 4 seconds

      _this._aiService
        .MenuToJson(_this.selectedStore, _this.aiMenuText, _this.aiExtraInstructions)
        .then((res) => {
          clearInterval(messageInterval);
          _this.isAILoading = false;

          // If the response contains rows, check if we need to confirm before replacing
          if (res && Array.isArray(res.rows) && res.rows.length > 0) {
            _this.aiImportMessage = 'Menyen er konvertert til JSON format.';
            _this.aiImportCompleted = true;

            // Make sure each row has all required properties initialized
            const processedRows = res.rows || [];

            // If there are existing rows, ask for confirmation
            if (_this.rows.some(row => row.name || row.description)) {
              _this.aiImportData = processedRows;
              _this.showAIConfirmModal = true;
            } else {
              // No existing rows, just set them directly
              _this.rows = processedRows;
              _this.closeAIModal();
            }
          } else {
            // Show error if no rows were found
            _this.aiImportMessage = 'Feil ved import: Ingen produkter ble funnet i menyteksten. Prøv å omformulere eller legg til mer detaljer.';
            _this.aiImportCompleted = false;
          }
        })
        .catch((error) => {
          clearInterval(messageInterval);
          // eslint-disable-next-line no-console
          console.error('Error running AI import:', error);
          _this.isAILoading = false;
          _this.aiImportMessage = `Feil ved import: ${error.message || 'Ukjent feil'}`;
          _this.aiImportCompleted = false;
        });
    },
    handleAIConfirm(replace) {
      if (replace) {
        // Replace all existing rows
        this.rows = this.aiImportData;
      } else {
        // Add new rows to existing ones
        // Remove the last empty row before adding new rows
        const currentRows = [...this.rows];
        if (currentRows.length > 0 && this.isEmptyRow(currentRows[currentRows.length - 1])) {
          currentRows.pop();
        }
        this.rows = [...currentRows, ...this.aiImportData];
      }
      this.showAIConfirmModal = false;
      this.closeAIModal();
    },
    copyToClipboard() {
      navigator.clipboard.writeText(this.exportData);
    },
    importSavedData() {
      try {
        const data = JSON.parse(this.importData);
        if (data.rows && Array.isArray(data.rows)) {
          this.rows = data.rows;
          this.selectedStore = data.storeId || 0;
          this.replaceAll = data.replaceAll || false;
          this.showExportModal = false;
          this.importData = '';
        }
      } catch (e) {
        // eslint-disable-next-line no-alert
        alert('Invalid import data format');
      }
    }
  }
};
</script>
<style lang="scss">
.admin__content.admin__wrapper {
  margin: 0;
  max-width: 100%;
  padding: 0;
}

.container {
  max-width: 100%;
  margin: 0;
  padding: 0;
  overflow-x: auto;
}

.table-wrapper {
  padding: 0;
}

.modal-buttons {
  margin-top: 1.5rem;
  display: flex;
  gap: 0.75rem;
}

input {
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
}

select {
  padding: 0.5rem 2.5rem 0.5rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid #e2e8f0;
  background-color: white;
  appearance: none;
  position: relative;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
}

.select-wrapper {
  position: relative;
  display: inline-block;

  &::after {
    content: "🏠";
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }
}

.emoji-btn {
  cursor: pointer;
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }
}

table {
  width: 100%;
  min-width: 1200px;
  border-collapse: separate;
  border-spacing: 0;
  margin: 1.5rem 0;

  th {
    background: #f8fafc;
    padding: 0.75rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
    text-align: left;
    border-bottom: 2px solid #e2e8f0;
  }

  td {
    padding: 0.75rem;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: middle;
    width: 1%;

    &:nth-child(2) {
      width: 12%;
      min-width: 120px;
    }

    &:nth-child(3) {
      width: 15%;
      min-width: 150px;
    }

    &:nth-child(4) {
      width: 20%;
      min-width: 200px;
    }

    &:nth-child(5) {
      width: 12%;
      min-width: 120px;
    }

    &:nth-child(6) {
      width: 80px;
      min-width: 80px;
    }

    &:nth-child(7),
    &:nth-child(9) {
      width: 90px;
      min-width: 90px;
    }

    &:nth-child(8) {
      width: 90px;
      min-width: 90px;
    }

    &:nth-child(10) {
      width: 60px;
      min-width: 60px;
    }

    &:nth-child(11) {
      width: 60px;
      min-width: 60px;
    }
  }
}

.store-categories-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;

  .button-group {
    display: flex;
    gap: 0.5rem;
  }
}

.categories-list {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  span {
    font-size: 0.875rem;
    margin: 0;
  }
}

.categories-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.category-tag {
  background: #f1f5f9;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  color: #475569;
  border: 1px solid #e2e8f0;
  white-space: nowrap;
}

.export-textarea {
  width: 100%;
  min-height: 300px;
  margin: 1rem 0;
  padding: 1rem;
  font-family: ui-monospace, monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  background: #f8fafc;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
}

.import-messages {
  background: #fefce8;
  border: 1px solid #fef08a;
  border-radius: 0.375rem;
  padding: 1rem;
  margin: 1rem 0;
  color: #854d0e;
}

.container {
  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;

    &:hover {
      background: #94a3b8;
    }
  }
}

.full-width {
  width: 100%;
  min-width: 100%;
  box-sizing: border-box;
}

.categories-section {
  margin-top: 2rem;

  h3 {
    margin-bottom: 0.5rem;
    font-size: 1rem;
    color: #475569;
  }
}
</style>

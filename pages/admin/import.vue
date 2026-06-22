<template>
  <AdminPage @login-success="handleLoginSuccess">
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
                <th>Varianter</th>
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
                <td>
                  <input v-if="index !== rows.length - 1" class="emoji-btn" type="button"
                    :value="`🎛️ ${(row.variants && row.variants.length) || 0}`" @click="openRowVariants(index)">
                </td>
                <td v-if="index !== rows.length - 1 || rows.length < 2">
                  <input class="emoji-btn" type="button" value="🔂 Dupliser rad" @click="copyRow(index)">
                  <input class="emoji-btn" type="button" value="➖ Fjern rad" @click="deleteRow(index)">
                </td>
              </tr>
            </tbody>
          </table>
        </template>
        <div class="category-variants-section" style="margin: 1em">
          <div class="section-header">
            <h3>Felles tilbehør per kategori</h3>
            <input class="emoji-btn" type="button" value="➕ Legg til kategori-tilbehør"
              @click="addCategoryVariantGroup">
          </div>
          <p class="helper-text">Tilbehør som gjelder alle produkter i en kategori</p>
          <div v-if="categoryVariants.length === 0" class="empty-hint">
            Ingen felles tilbehør lagt til
          </div>
          <div v-else class="category-variants-list">
            <div v-for="(group, groupIndex) in categoryVariants" :key="groupIndex" class="category-variant-group">
              <div class="category-variant-group-header">
                <SuggestInput v-model="group.categoryName" class="category-variant-name"
                  :suggestions="allCategoryNames" placeholder="Kategorinavn" />
                <button class="delete-btn-small" type="button" title="Fjern kategori"
                  @click="removeCategoryVariantGroup(groupIndex)">
                  <span class="material-icons">close</span>
                </button>
              </div>

              <div v-if="group.variants.length" class="variants-list">
                <div v-for="(variant, vIndex) in group.variants" :key="variant.id || vIndex"
                  class="variant-item clickable" @click="editCategoryVariant(groupIndex, vIndex)">
                  <div class="variant-info">
                    <div class="variant-name">{{ variant.name }}</div>
                    <div class="variant-meta">
                      <span v-if="variant.multiselect" class="badge">Flervalg</span>
                      <span v-if="variant.required" class="badge badge-required">Obligatorisk</span>
                      <span class="variant-options-preview">{{ formatOptionsPreview(variant.options) }}</span>
                    </div>
                  </div>
                  <button class="delete-btn-small" type="button" title="Fjern tilbehør"
                    @click.stop="removeCategoryVariant(groupIndex, vIndex)">
                    <span class="material-icons">close</span>
                  </button>
                </div>
              </div>
              <div v-else class="empty-hint group-empty">
                Ingen tilbehør lagt til
              </div>

              <button class="btn-add-variant" type="button" @click="addCategoryVariant(groupIndex)">
                <span class="material-icons">add</span>
                Legg til tilbehør
              </button>
            </div>
          </div>
        </div>

        <!-- Variant manager (compact modal for produkt-/rad-varianter) -->
        <div v-if="showVariantsManager" class="vm-overlay" @click.self="showVariantsManager = false">
          <div class="vm-container">
            <div class="vm-header">
              <h2>{{ variantsManagerTitle }}</h2>
              <button class="vm-close" type="button" @click="showVariantsManager = false">
                <span class="material-icons">close</span>
              </button>
            </div>
            <div class="vm-body">
              <div v-if="variantsManagerTarget && variantsManagerTarget.length" class="variants-list">
                <div v-for="(variant, vIndex) in variantsManagerTarget" :key="variant.id || vIndex"
                  class="variant-item clickable" @click="editVariantInTarget(vIndex)">
                  <div class="variant-info">
                    <div class="variant-name">{{ variant.name }}</div>
                    <div class="variant-meta">
                      <span v-if="variant.multiselect" class="badge">Flervalg</span>
                      <span v-if="variant.required" class="badge badge-required">Obligatorisk</span>
                      <span class="variant-options-preview">{{ formatOptionsPreview(variant.options) }}</span>
                    </div>
                  </div>
                  <button class="delete-btn-small" type="button" title="Fjern tilbehør"
                    @click.stop="removeVariantFromTarget(vIndex)">
                    <span class="material-icons">close</span>
                  </button>
                </div>
              </div>
              <div v-else class="empty-hint">
                Ingen tilbehør lagt til
              </div>

              <button class="btn-add-variant" type="button" @click="addVariantToTarget">
                <span class="material-icons">add</span>
                Legg til tilbehør
              </button>
            </div>
          </div>
        </div>
        <VariantEditorModal ref="variantEditor" />
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
import VariantEditorModal from '~/components/admin/VariantEditorModal.vue';
import SuggestInput from '~/components/admin/SuggestInput.vue';

export default {
  components: { AdminPage, Modal, AutocompleteInput, Loading, VariantEditorModal, SuggestInput },
  data() {
    return {
      isLoading: false,
      showModal: false,
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
      aiImportData: null,
      aiImportCategoryVariants: [],
      categoryVariants: [],
      showVariantsManager: false,
      variantsManagerTitle: '',
      variantsManagerTarget: null
    };
  },
  computed: {
    selectedStore() {
      return this.$store.state.selectedAdminStore;
    },
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
    categoryVariants: {
      handler(val) {
        if (window && window.localStorage) {
          localStorage.setItem('importCategoryVariants', JSON.stringify(val || []));
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
    },
    showExportModal(val) {
      if (val) {
        this.exportData = JSON.stringify(
          {
            storeId: this.selectedStore,
            replaceAll: this.replaceAll,
            rows: this.rows.slice(0, -1), // Remove empty row
            categoryVariants: this.categoryVariants
          },
          null,
          2
        );
      }
    }
  },
  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      return;
    }
    this.init();
    if (this.selectedStore > 0) {
      this.getCategories();
    }
  },
  methods: {
    init() {
      if (window && window.localStorage) {
        const storedRows = localStorage.getItem('importRows');
        const storedCategoryVariants = localStorage.getItem('importCategoryVariants');

        if (storedCategoryVariants) {
          this.$set(this, 'categoryVariants', JSON.parse(storedCategoryVariants));
        }

        if (storedRows) {
          this.$set(this, 'rows', JSON.parse(storedRows));
        } else {
          this.clearRows();
        }
      }
    },
    handleLoginSuccess() {
      this.init();
    },
    clearRows() {
      this.replaceAll = false;
      this.rows = [JSON.parse(JSON.stringify(this.emptyRow)), JSON.parse(JSON.stringify(this.emptyRow))];
      this.categoryVariants = [];
      this.showClearRowsModal = false;
      this.importResponse = {};
      if (window && window.localStorage) {
        localStorage.removeItem('importRows');
        localStorage.removeItem('importCategoryVariants');
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
            rows: JSON.parse(JSON.stringify(_this.rows)).slice(0, _this.rows.length - 1), // Remove last item as it is an empty row
            categoryVariants: JSON.parse(JSON.stringify(_this.categoryVariants || []))
              .filter(group => group.categoryName && group.variants && group.variants.length)
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
            processedRows.forEach((row) => {
              row.variants = _this.mapAiVariants(row.variants);
            });

            const mappedCategoryVariants = (res.categoryVariants || []).map(cv => ({
              categoryName: cv.categoryName,
              variants: _this.mapAiVariants(cv.variants)
            }));

            // If there are existing rows, ask for confirmation
            if (_this.rows.some(row => row.name || row.description)) {
              _this.aiImportData = processedRows;
              _this.aiImportCategoryVariants = mappedCategoryVariants;
              _this.showAIConfirmModal = true;
            } else {
              // No existing rows, just set them directly
              _this.rows = processedRows;
              _this.categoryVariants = mappedCategoryVariants;
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
        this.categoryVariants = this.aiImportCategoryVariants;
      } else {
        // Add new rows to existing ones
        // Remove the last empty row before adding new rows
        const currentRows = [...this.rows];
        if (currentRows.length > 0 && this.isEmptyRow(currentRows[currentRows.length - 1])) {
          currentRows.pop();
        }
        this.rows = [...currentRows, ...this.aiImportData];
        this.mergeCategoryVariants(this.aiImportCategoryVariants);
      }
      this.aiImportCategoryVariants = [];
      this.showAIConfirmModal = false;
      this.closeAIModal();
    },
    mapAiVariant(aiVariant, orderIndex) {
      return {
        id: null,
        name: (aiVariant.name || '').trim(),
        multiselect: !!aiVariant.multiselect,
        required: !!aiVariant.required,
        orderIndex,
        options: (aiVariant.options || []).map((opt, idx) => {
          const amountInOre = Math.max(0, parseInt(opt.priceAmount, 10) || 0);
          return {
            id: null,
            name: (opt.name || '').trim(),
            amount: amountInOre,
            wholeAmount: Math.floor(amountInOre / 100),
            fractionAmount: String(amountInOre % 100).padStart(2, '0'),
            orderIndex: idx,
            negativeAmount: !!opt.negativeAmount,
            otherInformation: ''
          };
        })
      };
    },
    mapAiVariants(aiVariants) {
      return (aiVariants || []).map((v, i) => this.mapAiVariant(v, i));
    },
    mergeCategoryVariants(incoming) {
      (incoming || []).forEach((group) => {
        const existing = this.categoryVariants.find(
          g => (g.categoryName || '').toLowerCase() === (group.categoryName || '').toLowerCase()
        );
        if (existing) {
          existing.variants.push(...group.variants);
        } else {
          this.categoryVariants.push(group);
        }
      });
    },
    openRowVariants(index) {
      const row = this.rows[index];
      if (!row.variants) {
        this.$set(row, 'variants', []);
      }
      this.variantsManagerTarget = row.variants;
      this.variantsManagerTitle = row.name ? `Varianter: ${row.name}` : 'Varianter';
      this.showVariantsManager = true;
    },
    async addCategoryVariant(groupIndex) {
      const variant = await this.$refs.variantEditor.open(null);
      if (!variant) {
        return;
      }
      this.categoryVariants[groupIndex].variants.push(variant);
    },
    async editCategoryVariant(groupIndex, vIndex) {
      const group = this.categoryVariants[groupIndex];
      const variant = await this.$refs.variantEditor.open(group.variants[vIndex]);
      if (!variant) {
        return;
      }
      this.$set(group.variants, vIndex, variant);
    },
    removeCategoryVariant(groupIndex, vIndex) {
      if (!confirm('Er du sikker på at du vil fjerne dette tilbehøret?')) {
        return;
      }
      this.categoryVariants[groupIndex].variants.splice(vIndex, 1);
    },
    async addVariantToTarget() {
      const variant = await this.$refs.variantEditor.open(null);
      if (!variant || !this.variantsManagerTarget) {
        return;
      }
      this.variantsManagerTarget.push(variant);
    },
    async editVariantInTarget(index) {
      const variant = await this.$refs.variantEditor.open(this.variantsManagerTarget[index]);
      if (!variant) {
        return;
      }
      this.$set(this.variantsManagerTarget, index, variant);
    },
    removeVariantFromTarget(index) {
      if (!confirm('Er du sikker på at du vil fjerne dette tilbehøret?')) {
        return;
      }
      this.variantsManagerTarget.splice(index, 1);
    },
    addCategoryVariantGroup() {
      this.categoryVariants.push({ categoryName: '', variants: [] });
    },
    removeCategoryVariantGroup(index) {
      this.categoryVariants.splice(index, 1);
    },
    formatOptionsPreview(options) {
      if (!options || options.length === 0) return 'Ingen alternativer';
      const names = options.map(o => o.name).filter(n => n);
      if (names.length === 0) return 'Ingen alternativer';
      if (names.length <= 3) return names.join(', ');
      return `${names.slice(0, 2).join(', ')}, +${names.length - 2} mer`;
    },
    copyToClipboard() {
      navigator.clipboard.writeText(this.exportData);
    },
    importSavedData() {
      try {
        const data = JSON.parse(this.importData);
        if (data.rows && Array.isArray(data.rows)) {
          this.rows = data.rows;
          this.categoryVariants = Array.isArray(data.categoryVariants) ? data.categoryVariants : [];
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

.category-variants-section {
  margin-top: 2rem;

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;

    h3 {
      font-size: 1rem;
      color: #475569;
    }
  }

  .helper-text {
    font-size: 0.85rem;
    color: #718096;
    margin: 0.25rem 0 1rem 0;
  }

  .empty-hint {
    font-size: 0.875rem;
    color: #94a3b8;
    font-style: italic;
  }
}

.category-variants-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 1rem;
}

.category-variant-group {
  padding: 16px;
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;

  .category-variant-group-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;

    .category-variant-name {
      flex: 1;
      min-width: 0;
    }
  }

  .variants-list {
    margin: 0 0 12px 0;
  }

  .group-empty {
    margin-bottom: 12px;
  }

  .delete-btn-small {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    color: #9ca3af;
    border-radius: 4px;
    flex-shrink: 0;
    transition: all 0.2s;

    &:hover {
      background: #fee2e2;
      color: #ef4444;
    }

    .material-icons {
      font-size: 20px;
    }
  }

  .btn-add-variant {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    background: #f3f4f6;
    color: #374151;
    border: none;
    border-radius: 8px;
    font-size: 0.9em;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #e5e7eb;
    }

    .material-icons {
      font-size: 18px;
    }
  }
}

.variants-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 1rem 0;
}

.variant-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.15s ease;

  &.clickable {
    cursor: pointer;

    &:hover {
      border-color: #cbd5e0;
      background: #f1f5f9;
    }
  }

  &:hover {
    border-color: #cbd5e0;
  }

  .variant-info {
    flex: 1;
    min-width: 0;

    .variant-name {
      font-weight: 600;
      color: #292c34;
      margin-bottom: 4px;
    }

    .variant-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;

      .badge {
        padding: 2px 8px;
        background: #dbeafe;
        color: #1e40af;
        border-radius: 4px;
        font-size: 0.8em;
        font-weight: 600;
        flex-shrink: 0;
      }

      .badge-required {
        background: #fef3c7;
        color: #92400e;
      }

      .variant-options-preview {
        font-size: 0.85em;
        color: #6b7280;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 200px;
      }
    }
  }

  .delete-btn-small {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    color: #9ca3af;
    border-radius: 4px;
    flex-shrink: 0;
    transition: all 0.2s;

    &:hover {
      background: #fee2e2;
      color: #ef4444;
    }

    .material-icons {
      font-size: 20px;
    }
  }
}

// Compact variant-manager modal (produkt-/rad-varianter)
.vm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9990;
  padding: 20px;
}

.vm-container {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.vm-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    margin: 0;
    font-size: 1.25em;
    font-weight: 600;
    color: #292c34;
  }

  .vm-close {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    color: #6b7280;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
      color: #292c34;
      background: #f3f4f6;
    }

    .material-icons {
      font-size: 24px;
    }
  }
}

.vm-body {
  padding: 24px;
  flex: 1;
  overflow-y: auto;

  .variants-list {
    margin: 0 0 16px 0;
  }

  .empty-hint {
    margin-bottom: 16px;
    font-size: 0.875rem;
    color: #94a3b8;
    font-style: italic;
  }

  .btn-add-variant {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    background: #f3f4f6;
    color: #374151;
    border: none;
    border-radius: 8px;
    font-size: 0.9em;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #e5e7eb;
    }

    .material-icons {
      font-size: 18px;
    }
  }
}
</style>

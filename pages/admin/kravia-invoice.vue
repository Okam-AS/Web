<template>
  <AdminPage @login-success="handleLoginSuccess">
    <Loading v-if="initialLoading" :loading="true" />
    <div v-else class="kravia-page">
      <div class="kravia-header">
        <div>
          <h1>{{ $i('kraviaInvoice_pageTitle') }}</h1>
          <p>{{ $i('kraviaInvoice_pageSubtitle') }}</p>
        </div>
      </div>

      <section class="invoice-section">
        <h2>{{ $i('kraviaInvoice_customerInfo') }}</h2>
        <div class="form-grid">
          <div v-if="adminStores.length > 1" class="form-group">
            <label for="storeId">{{ $i('kraviaInvoice_sendFromStore') }}</label>
            <select id="storeId" v-model.number="selectedStoreId" @change="storeChanged">
              <option v-for="store in adminStores" :key="store.id" :value="store.id">
                {{ store.name }}
              </option>
            </select>
          </div>
          <div v-else class="form-group">
            <label>{{ $i('kraviaInvoice_sendFromStore') }}</label>
            <div class="static-field">{{ selectedStoreObject ? selectedStoreObject.name : "-" }}</div>
          </div>

          <div class="form-group form-group--lookup">
            <label for="organizationNumber">{{ $i('kraviaInvoice_recipientOrgNumber') }}</label>
            <div class="company-lookup">
              <div class="lookup-row">
                <input
                  id="organizationNumber"
                  v-model="form.organizationNumber"
                  inputmode="numeric"
                  placeholder="999999999"
                  @focus="focusCompanyLookup"
                  @blur="blurCompanyLookup"
                  @input="handleCompanyInput"
                  @keyup.enter="lookupCompany"
                />
                <button type="button" class="btn btn-secondary" :disabled="companyLoading" @click="lookupCompany">
                  {{ companyLoading ? $i('kraviaInvoice_fetching') : $i('kraviaInvoice_fetch') }}
                </button>
              </div>
              <div v-if="companyAutocompleteOpen" class="company-history-suggestions">
                <div v-if="companyHistoryLoading" class="company-history-state">
                  {{ $i('kraviaInvoice_loadingPreviousCompanies') }}
                </div>
                <template v-else-if="companyHistorySuggestions.length">
                  <button
                    v-for="company in companyHistorySuggestions"
                    :key="company.organizationNumber"
                    type="button"
                    @mousedown.prevent="selectHistoricalCompany(company)"
                  >
                    <span>
                      <strong>{{ company.companyName }}</strong>
                      <small>{{ company.organizationNumber }}</small>
                    </span>
                    <small>{{ company.companyAddress }}, {{ company.companyZipCode }} {{ company.companyCity }}</small>
                  </button>
                </template>
                <div v-else class="company-history-state">
                  {{ $i('kraviaInvoice_noPreviousCompanies') }}
                </div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="companyName">{{ $i('kraviaInvoice_companyName') }}</label>
            <input id="companyName" v-model="form.companyName" type="text" />
          </div>
          <div class="form-group">
            <label for="companyAddress">{{ $i('kraviaInvoice_address') }}</label>
            <input id="companyAddress" v-model="form.companyAddress" type="text" />
          </div>
          <div class="form-group">
            <label for="companyZipCode">{{ $i('kraviaInvoice_zipCode') }}</label>
            <input id="companyZipCode" v-model="form.companyZipCode" type="text" />
          </div>
          <div class="form-group">
            <label for="companyCity">{{ $i('kraviaInvoice_city') }}</label>
            <input id="companyCity" v-model="form.companyCity" type="text" />
          </div>
          <div class="form-group">
            <label for="referenceFirstName">{{ $i('kraviaInvoice_firstName') }}</label>
            <input id="referenceFirstName" v-model="form.referenceFirstName" type="text" />
          </div>
          <div class="form-group">
            <label for="referenceLastName">{{ $i('kraviaInvoice_lastName') }}</label>
            <input id="referenceLastName" v-model="form.referenceLastName" type="text" />
          </div>
          <div class="form-group">
            <label for="phone">{{ $i('kraviaInvoice_phone') }}</label>
            <input id="phone" v-model="form.phone" type="tel" />
          </div>
          <div class="form-group">
            <label for="email">{{ $i('kraviaInvoice_email') }}</label>
            <input id="email" v-model="form.email" type="email" />
          </div>
        </div>
      </section>

      <section class="invoice-section invoice-section--lines">
        <div class="section-heading">
          <h2>{{ $i('kraviaInvoice_lineItems') }}</h2>
        </div>

        <div class="line-table">
          <div class="line-row line-row--header">
            <div>{{ $i('kraviaInvoice_product') }}</div>
            <div>{{ $i('kraviaInvoice_quantity') }}</div>
            <div>{{ $i('kraviaInvoice_unitPriceExVat') }}</div>
            <div>{{ $i('kraviaInvoice_discount') }}</div>
            <div>{{ $i('kraviaInvoice_vatRate') }}</div>
            <div>{{ $i('kraviaInvoice_amountInclVat') }}</div>
          </div>

          <div v-for="(line, index) in lines" :key="line.localId" class="line-row">
            <div class="line-field line-field--product">
              <span class="mobile-label">{{ $i('kraviaInvoice_product') }}</span>
              <div class="product-cell">
                <input
                  v-model="line.productName"
                  type="text"
                  :placeholder="$i('kraviaInvoice_productSearchPlaceholder')"
                  @input="line.productId = null"
                  @focus="focusProductLine(index)"
                  @blur="blurProductLine"
                />
                <div v-if="activeSuggestionIndex === index && productSuggestions(line).length" class="suggestions">
                  <button
                    v-for="product in productSuggestions(line)"
                    :key="product.id"
                    type="button"
                    @mousedown.prevent="selectProduct(line, product)"
                  >
                    <span>{{ product.name }}</span>
                    <small>{{ $i('kraviaInvoice_priceInclVatSuffix', { price: priceLabel(product.amount) }) }}</small>
                  </button>
                </div>
              </div>
            </div>
            <div class="line-field">
              <span class="mobile-label">{{ $i('kraviaInvoice_quantity') }}</span>
              <input v-model.number="line.quantity" type="number" min="1" step="1" />
            </div>
            <div class="line-field">
              <span class="mobile-label">{{ $i('kraviaInvoice_unitPriceExVat') }}</span>
              <input v-model.number="line.unitPriceExVat" type="number" min="0" step="0.01" />
            </div>
            <div class="line-field">
              <span class="mobile-label">{{ $i('kraviaInvoice_discount') }}</span>
              <div class="percent-input">
                <input v-model.number="line.discountPercent" type="number" min="0" max="100" step="0.01" />
                <span>%</span>
              </div>
            </div>
            <div class="line-field">
              <span class="mobile-label">{{ $i('kraviaInvoice_vatRate') }}</span>
              <select v-model.number="line.vatRate">
                <option :value="25">25%</option>
                <option :value="15">15%</option>
                <option :value="12">12%</option>
                <option :value="0">0%</option>
              </select>
            </div>
            <div class="line-field">
              <span class="mobile-label">{{ $i('kraviaInvoice_amountInclVat') }}</span>
              <div class="readonly-amount">{{ priceLabel(lineAmountInclVat(line)) }}</div>
            </div>
            <div class="line-actions">
              <button type="button" :title="$i('kraviaInvoice_moveUp')" :disabled="index === 0" @click="moveLine(index, -1)">{{ $i('kraviaInvoice_up') }}</button>
              <button type="button" :title="$i('kraviaInvoice_moveDown')" :disabled="index === lines.length - 1" @click="moveLine(index, 1)">{{ $i('kraviaInvoice_down') }}</button>
              <button type="button" :title="$i('kraviaInvoice_copy')" @click="copyLine(index)">{{ $i('kraviaInvoice_copyShort') }}</button>
              <button type="button" :title="$i('kraviaInvoice_remove')" :disabled="lines.length === 1" @click="removeLine(index)">{{ $i('common_delete') }}</button>
            </div>
          </div>

          <div
            v-if="!manualInvoice"
            class="line-row line-row--fee"
            tabindex="0"
            role="button"
            :aria-label="$i('kraviaInvoice_invoiceFeeAriaLabel')"
            @click="toggleInvoiceFeeInfo"
            @blur="hideInvoiceFeeInfo"
          >
            <div class="line-field line-field--product line-field--fee-product">
              <span class="mobile-label">{{ $i('kraviaInvoice_product') }}</span>
              <div class="fee-text fee-name">
                <span>{{ $i('kraviaInvoice_invoiceFee') }}</span>
                <span class="help-icon" aria-hidden="true">?</span>
                <div :class="['fee-tooltip', { 'fee-tooltip--visible': showInvoiceFeeInfo }]">
                  {{ $i('kraviaInvoice_invoiceFeeTooltip') }}
                </div>
              </div>
            </div>
            <div class="line-field">
              <span class="mobile-label">{{ $i('kraviaInvoice_quantity') }}</span>
              <div class="fee-text">1</div>
            </div>
            <div class="line-field">
              <span class="mobile-label">{{ $i('kraviaInvoice_unitPriceExVat') }}</span>
              <div class="fee-text">{{ priceLabel(invoiceFeeExVat) }}</div>
            </div>
            <div class="line-field">
              <span class="mobile-label">{{ $i('kraviaInvoice_discount') }}</span>
              <div class="fee-text">0 %</div>
            </div>
            <div class="line-field">
              <span class="mobile-label">{{ $i('kraviaInvoice_vatRate') }}</span>
              <div class="fee-text">25%</div>
            </div>
            <div class="line-field">
              <span class="mobile-label">{{ $i('kraviaInvoice_amountInclVat') }}</span>
              <div class="fee-text fee-text--amount">{{ priceLabel(invoiceFeeAmount) }}</div>
            </div>
          </div>
        </div>

        <button type="button" class="btn btn-secondary add-line-button" @click="addLine">{{ $i('kraviaInvoice_addLineItem') }}</button>

        <div class="totals">
          <div><span>{{ $i('kraviaInvoice_net') }}</span><strong>{{ priceLabel(totalExVat) }}</strong></div>
          <div><span>{{ $i('kraviaInvoice_vat') }}</span><strong>{{ priceLabel(totalVat) }}</strong></div>
          <div><span>{{ $i('kraviaInvoice_total') }}</span><strong>{{ priceLabel(totalInclVat) }}</strong></div>
        </div>
      </section>

      <section v-if="isPreorder" class="invoice-section preorder-section">
        <h2>{{ $i('kraviaInvoice_deliveryTime') }}</h2>
        <div class="form-grid form-grid--compact">
          <div class="form-group">
            <label for="preorderDate">{{ $i('kraviaInvoice_date') }}</label>
            <input id="preorderDate" v-model="preorderDate" type="date" :min="todayInputValue" />
          </div>
          <div class="form-group">
            <label for="preorderTime">{{ $i('kraviaInvoice_time') }}</label>
            <input id="preorderTime" v-model="preorderTime" type="time" />
          </div>
        </div>
      </section>

      <div class="submit-bar">
        <div class="submit-options">
          <label :class="['invoice-option', { 'invoice-option--active': isPreorder }]">
            <input v-model="isPreorder" type="checkbox" @change="handlePreorderToggle" />
            <span class="invoice-option-copy">
              <strong>{{ $i('kraviaInvoice_preorder') }}</strong>
              <small>{{ $i('kraviaInvoice_preorderDescription') }}</small>
            </span>
          </label>
          <label :class="['invoice-option', { 'invoice-option--active': manualInvoice }]">
            <input v-model="manualInvoice" type="checkbox" />
            <span class="invoice-option-copy">
              <strong>{{ $i('kraviaInvoice_manualInvoice') }}</strong>
              <small>{{ $i('kraviaInvoice_manualInvoiceDescription') }}</small>
            </span>
          </label>
          <div v-if="notification.show" :class="['notification', 'submit-notification', `notification--${notification.type}`]">
            {{ notification.message }}
          </div>
        </div>
        <button type="button" class="btn btn-primary submit-button" @click="openConfirm">
          {{ submitButtonLabel }}
        </button>
      </div>

      <Modal v-if="showConfirmModal" :hide-close-btn="true" @close="showConfirmModal = false">
        <div class="confirm-modal">
          <h2>{{ confirmTitle }}</h2>
          <p v-if="manualInvoice">
            <span v-html="$i('kraviaInvoice_confirmManual', { amount: priceLabel(totalInclVat), company: form.companyName })" />
          </p>
          <p v-else-if="isPreorder">
            <span v-html="$i('kraviaInvoice_confirmPreorder', { amount: priceLabel(totalInclVat), company: form.companyName })" />
          </p>
          <p v-else>
            <span v-html="$i('kraviaInvoice_confirmInvoice', { amount: priceLabel(totalInclVat), company: form.companyName })" />
          </p>
          <div v-if="sendError" class="notification notification--error">
            {{ sendError }}
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" :disabled="isSending" @click="showConfirmModal = false">{{ $i('common_cancel') }}</button>
            <button type="button" class="btn btn-primary" :disabled="isSending" @click="sendInvoice">
              {{ isSending ? $i('kraviaInvoice_sending') : submitButtonLabel }}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from "~/components/organisms/AdminPage.vue";
import Loading from "~/components/atoms/Loading.vue";
import Modal from "~/components/atoms/Modal.vue";

export default {
  components: { AdminPage, Loading, Modal },
  data: () => ({
    initialLoading: true,
    companyLoading: false,
    companyHistoryLoading: false,
    companyHistoryLoadedForStoreId: null,
    companyHistory: [],
    companyAutocompleteOpen: false,
    companyAutocompleteCloseTimer: null,
    productsLoading: false,
    isSending: false,
    showConfirmModal: false,
    activeSuggestionIndex: null,
    suggestionCloseTimer: null,
    showInvoiceFeeInfo: false,
    sendError: "",
    selectedStoreId: null,
    isPreorder: false,
    manualInvoice: false,
    preorderDate: "",
    preorderTime: "",
    products: [],
    form: {
      organizationNumber: "",
      companyName: "",
      companyAddress: "",
      companyZipCode: "",
      companyCity: "",
      referenceFirstName: "",
      referenceLastName: "",
      phone: "",
      email: "",
    },
    lines: [],
    notification: {
      show: false,
      message: "",
      type: "success",
      timeout: null,
    },
  }),
  computed: {
    adminStores() {
      return this.$store.state.currentUser?.adminIn || [];
    },
    selectedStoreObject() {
      return this.adminStores.find((store) => store.id === this.selectedStoreId) || null;
    },
    companyHistorySuggestions() {
      const query = (this.form.organizationNumber || "").trim().toLowerCase();
      const normalizedQuery = this.normalizeOrgNo(query);
      return (this.companyHistory || [])
        .filter((company) => {
          if (!query) return true;
          const orgNo = this.normalizeOrgNo(company.organizationNumber || "");
          const name = (company.companyName || "").toLowerCase();
          return orgNo.includes(normalizedQuery) || name.includes(query);
        })
        .slice(0, 12);
    },
    totalExVat() {
      return this.lines.reduce((sum, line) => sum + this.lineExVat(line), 0) + this.invoiceFeeExVat;
    },
    totalInclVat() {
      return this.lines.reduce((sum, line) => sum + this.lineAmountInclVat(line), 0) + this.invoiceFeeAmount;
    },
    totalVat() {
      return Math.max(0, this.totalInclVat - this.totalExVat);
    },
    invoiceFeeAmount() {
      return this.manualInvoice ? 0 : 2000;
    },
    invoiceFeeExVat() {
      return Math.round(this.invoiceFeeAmount / 1.25);
    },
    todayInputValue() {
      return this.formatDateInput(new Date());
    },
    submitButtonLabel() {
      if (this.manualInvoice) {
        return this.isPreorder ? this.$i("kraviaInvoice_submitManualPreorder") : this.$i("kraviaInvoice_submitManual");
      }
      return this.isPreorder ? this.$i("kraviaInvoice_submitPreorder") : this.$i("kraviaInvoice_submitInvoice");
    },
    confirmTitle() {
      if (this.manualInvoice) {
        return this.isPreorder ? this.$i("kraviaInvoice_confirmTitleManualPreorder") : this.$i("kraviaInvoice_confirmTitleManual");
      }
      return this.isPreorder ? this.$i("kraviaInvoice_confirmTitlePreorder") : this.$i("kraviaInvoice_confirmTitleInvoice");
    },
  },
  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      this.initialLoading = false;
      return;
    }
    this.initialize();
  },
  methods: {
    handleLoginSuccess() {
      this.initialize();
    },
    initialize() {
      this.selectedStoreId = this.$store.state.selectedAdminStore || this.adminStores[0]?.id || null;
      if (this.selectedStoreId) {
        this.loadProducts();
      }
      if (!this.lines.length) {
        this.addLine();
      }
      this.setDefaultPreorderDateTime();
      this.initialLoading = false;
    },
    storeChanged() {
      this.$store.dispatch("SetSelectedAdminStore", this.selectedStoreId);
      this.products = [];
      this.lines = [];
      this.companyHistory = [];
      this.companyHistoryLoading = false;
      this.companyHistoryLoadedForStoreId = null;
      this.companyAutocompleteOpen = false;
      this.addLine();
      this.loadProducts();
    },
    handlePreorderToggle() {
      if (this.isPreorder && (!this.preorderDate || !this.preorderTime)) {
        this.setDefaultPreorderDateTime();
      }
    },
    focusCompanyLookup() {
      if (this.companyAutocompleteCloseTimer) clearTimeout(this.companyAutocompleteCloseTimer);
      this.companyAutocompleteOpen = true;
      this.loadCompanyHistory();
    },
    blurCompanyLookup() {
      this.companyAutocompleteCloseTimer = setTimeout(() => {
        this.companyAutocompleteOpen = false;
      }, 150);
    },
    handleCompanyInput() {
      this.companyAutocompleteOpen = true;
      this.loadCompanyHistory();
    },
    loadCompanyHistory() {
      if (!this.selectedStoreId || this.companyHistoryLoading || this.companyHistoryLoadedForStoreId === this.selectedStoreId) return;
      const storeId = this.selectedStoreId;
      this.companyHistoryLoading = true;
      this._kraviaInvoiceService.GetCompanyHistory(storeId)
        .then((companies) => {
          if (this.selectedStoreId !== storeId) return;
          this.companyHistory = Array.isArray(companies) ? companies : [];
          this.companyHistoryLoadedForStoreId = storeId;
        })
        .catch(() => {
          if (this.selectedStoreId !== storeId) return;
          this.companyHistory = [];
          this.showNotification(this.$i("kraviaInvoice_errorLoadCompanyHistory"), "error");
        })
        .finally(() => {
          if (this.selectedStoreId === storeId) {
            this.companyHistoryLoading = false;
          }
        });
    },
    selectHistoricalCompany(company) {
      this.form.organizationNumber = company.organizationNumber || "";
      this.form.companyName = company.companyName || "";
      this.form.companyAddress = company.companyAddress || "";
      this.form.companyZipCode = company.companyZipCode || "";
      this.form.companyCity = company.companyCity || "";
      this.form.referenceFirstName = company.referenceFirstName || "";
      this.form.referenceLastName = company.referenceLastName || "";
      this.form.phone = company.phone || "";
      this.form.email = company.email || "";
      this.companyAutocompleteOpen = false;
      this.showNotification(this.$i("kraviaInvoice_companySelected"), "success");
    },
    normalizeOrgNo(value) {
      return (value || "").toString().toLowerCase().replace(/\s|-/g, "").replace("mva", "").trim();
    },
    loadProducts() {
      if (!this.selectedStoreId) return;
      this.productsLoading = true;
      this._productService.GetAll(this.selectedStoreId)
        .then((products) => {
          this.products = Array.isArray(products) ? products : [];
        })
        .catch(() => this.showNotification(this.$i("kraviaInvoice_errorLoadProducts"), "error"))
        .finally(() => {
          this.productsLoading = false;
        });
    },
    lookupCompany() {
      if (!this.form.organizationNumber) {
        this.showNotification(this.$i("kraviaInvoice_errorEnterOrgNumber"), "error");
        return;
      }
      this.companyLoading = true;
      this._kraviaInvoiceService.GetCompany(this.form.organizationNumber)
        .then((company) => {
          this.form.organizationNumber = company.organizationNumber || this.form.organizationNumber;
          this.form.companyName = company.name || "";
          this.form.companyAddress = company.fullAddress || "";
          this.form.companyZipCode = company.zipCode || "";
          this.form.companyCity = company.city || "";
          this.showNotification(this.$i("kraviaInvoice_companyInfoFetched"), "success");
        })
        .catch((error) => this.showNotification(error.message || this.$i("kraviaInvoice_companyNotFound"), "error"))
        .finally(() => {
          this.companyLoading = false;
        });
    },
    addLine() {
      this.lines.push({
        localId: Date.now() + Math.random(),
        productId: null,
        productName: "",
        quantity: 1,
        unitPriceExVat: 0,
        discountPercent: 0,
        vatRate: 25,
      });
    },
    removeLine(index) {
      if (this.lines.length === 1) return;
      this.lines.splice(index, 1);
    },
    copyLine(index) {
      this.lines.splice(index + 1, 0, {
        ...this.lines[index],
        localId: Date.now() + Math.random(),
      });
    },
    moveLine(index, direction) {
      const target = index + direction;
      if (target < 0 || target >= this.lines.length) return;
      const line = this.lines.splice(index, 1)[0];
      this.lines.splice(target, 0, line);
    },
    focusProductLine(index) {
      if (this.suggestionCloseTimer) clearTimeout(this.suggestionCloseTimer);
      this.activeSuggestionIndex = index;
    },
    blurProductLine() {
      this.suggestionCloseTimer = setTimeout(() => {
        this.activeSuggestionIndex = null;
      }, 150);
    },
    productSuggestions(line) {
      const query = (line.productName || "").trim().toLowerCase();
      if (!query) return this.products.slice(0, 8);
      return this.products
        .filter((product) => (product.name || "").toLowerCase().includes(query))
        .slice(0, 8);
    },
    selectProduct(line, product) {
      line.productId = product.id;
      line.productName = product.name;
      line.vatRate = product.tax || 25;
      line.unitPriceExVat = this.roundMoney((product.amount || 0) / (1 + (line.vatRate / 100)) / 100);
      this.activeSuggestionIndex = null;
    },
    toggleInvoiceFeeInfo() {
      this.showInvoiceFeeInfo = !this.showInvoiceFeeInfo;
    },
    hideInvoiceFeeInfo() {
      setTimeout(() => {
        this.showInvoiceFeeInfo = false;
      }, 120);
    },
    lineExVat(line) {
      const discountFactor = 1 - ((Number(line.discountPercent) || 0) / 100);
      return Math.round((Number(line.unitPriceExVat) || 0) * 100 * (Number(line.quantity) || 0) * discountFactor);
    },
    lineAmountInclVat(line) {
      return Math.round(this.lineExVat(line) * (1 + ((Number(line.vatRate) || 0) / 100)));
    },
    priceLabel(amountOre) {
      return new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK" }).format((amountOre || 0) / 100);
    },
    roundMoney(value) {
      return Math.round((Number(value) || 0) * 100) / 100;
    },
    formatDateInput(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },
    formatTimeInput(date) {
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    },
    setDefaultPreorderDateTime() {
      const date = new Date();
      date.setMinutes(date.getMinutes() + 30);
      date.setSeconds(0, 0);
      this.preorderDate = this.formatDateInput(date);
      this.preorderTime = this.formatTimeInput(date);
    },
    getRequestedCompletion() {
      if (!this.isPreorder || !this.preorderDate || !this.preorderTime) return null;
      const [year, month, day] = this.preorderDate.split("-").map(Number);
      const [hours, minutes] = this.preorderTime.split(":").map(Number);
      return new Date(year, month - 1, day, hours, minutes, 0, 0);
    },
    getRequestedCompletionPayload() {
      if (!this.isPreorder || !this.preorderDate || !this.preorderTime) return null;
      const time = this.preorderTime.length === 5 ? `${this.preorderTime}:00` : this.preorderTime;
      return `${this.preorderDate}T${time}`;
    },
    getValidationError() {
      if (!this.selectedStoreId) return this.$i("kraviaInvoice_validationSelectStore");
      if (!this.form.organizationNumber) return this.$i("kraviaInvoice_validationEnterOrgNumber");
      if (!/^\d{9}$/.test((this.form.organizationNumber || "").replace(/\D/g, ""))) return this.$i("kraviaInvoice_validationOrgNumberFormat");
      if (!this.form.companyName) return this.$i("kraviaInvoice_validationCompanyNameMissing");
      if (!this.form.companyAddress) return this.$i("kraviaInvoice_validationAddressMissing");
      if (!this.form.companyZipCode) return this.$i("kraviaInvoice_validationZipCodeMissing");
      if (!this.form.companyCity) return this.$i("kraviaInvoice_validationCityMissing");
      if (!this.form.referenceFirstName) return this.$i("kraviaInvoice_validationFirstNameMissing");
      if (!this.form.referenceLastName) return this.$i("kraviaInvoice_validationLastNameMissing");
      if (!this.form.phone) return this.$i("kraviaInvoice_validationPhoneMissing");
      if (!/^\+?\d{5,15}$/.test((this.form.phone || "").replace(/[\s\-()]/g, ""))) return this.$i("kraviaInvoice_validationPhoneFormat");
      if (!this.form.email) return this.$i("kraviaInvoice_validationEmailMissing");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email)) return this.$i("kraviaInvoice_validationEmailInvalid");
      if (!this.lines.length) return this.$i("kraviaInvoice_validationAddLineItem");
      if (this.isPreorder) {
        const requestedCompletion = this.getRequestedCompletion();
        if (!requestedCompletion || isNaN(requestedCompletion.getTime())) return this.$i("kraviaInvoice_validationSelectDateTime");
        if (requestedCompletion < new Date(Date.now() + 20 * 60000)) return this.$i("kraviaInvoice_validationPreorderMinTime");
      }

      const invalidLineIndex = this.lines.findIndex((line) =>
        !line.productName ||
        Number(line.quantity) <= 0 ||
        Number(line.unitPriceExVat) < 0 ||
        Number(line.discountPercent) < 0 ||
        Number(line.discountPercent) > 100 ||
        Number(line.vatRate) < 0 ||
        this.lineAmountInclVat(line) <= 0
      );

      if (invalidLineIndex >= 0) {
        const lineNumber = invalidLineIndex + 1;
        const line = this.lines[invalidLineIndex];
        if (!line.productName) return this.$i("kraviaInvoice_validationLineProductName", { line: lineNumber });
        if (Number(line.quantity) <= 0) return this.$i("kraviaInvoice_validationLineQuantity", { line: lineNumber });
        if (Number(line.unitPriceExVat) < 0) return this.$i("kraviaInvoice_validationLineNegativePrice", { line: lineNumber });
        if (Number(line.discountPercent) < 0 || Number(line.discountPercent) > 100) return this.$i("kraviaInvoice_validationLineDiscount", { line: lineNumber });
        if (Number(line.vatRate) < 0) return this.$i("kraviaInvoice_validationLineVatRate", { line: lineNumber });
        return this.$i("kraviaInvoice_validationLineAmount", { line: lineNumber });
      }

      return "";
    },
    openConfirm() {
      const validationError = this.getValidationError();
      if (validationError) {
        this.showNotification(validationError, "error");
        return;
      }
      this.sendError = "";
      this.showConfirmModal = true;
    },
    sendInvoice() {
      this.isSending = true;
      this.sendError = "";
      const payload = {
        storeId: this.selectedStoreId,
        ...this.form,
        manualInvoice: this.manualInvoice,
        requestedCompletion: this.getRequestedCompletionPayload(),
        lines: this.lines.map((line) => ({
          productId: line.productId,
          productName: line.productName,
          quantity: Number(line.quantity) || 0,
          unitPriceExVat: Number(line.unitPriceExVat) || 0,
          discountPercent: Number(line.discountPercent) || 0,
          vatRate: Number(line.vatRate) || 0,
        })),
      };
      this._kraviaInvoiceService.SendInvoice(payload)
        .then((result) => {
          this.showConfirmModal = false;
          const orderId = result.friendlyOrderId || result.orderId;
          if (this.manualInvoice && this.isPreorder) {
            this.showNotification(this.$i("kraviaInvoice_successManualPreorder", { orderId }), "success");
          } else if (this.manualInvoice) {
            this.showNotification(this.$i("kraviaInvoice_successManual", { orderId }), "success");
          } else if (this.isPreorder) {
            this.showNotification(this.$i("kraviaInvoice_successPreorder", { orderId }), "success");
          } else {
            this.showNotification(this.$i("kraviaInvoice_successInvoice", { orderId }), "success");
          }
          this.resetForm();
        })
        .catch((error) => {
          this.sendError = error.message || this.$i("kraviaInvoice_errorSendInvoice");
          this.showNotification(this.sendError, "error");
        })
        .finally(() => {
          this.isSending = false;
        });
    },
    resetForm() {
      this.form = {
        organizationNumber: "",
        companyName: "",
        companyAddress: "",
        companyZipCode: "",
        companyCity: "",
        referenceFirstName: "",
        referenceLastName: "",
        phone: "",
        email: "",
      };
      this.isPreorder = false;
      this.manualInvoice = false;
      this.setDefaultPreorderDateTime();
      this.lines = [];
      this.addLine();
    },
    showNotification(message, type) {
      if (this.notification.timeout) clearTimeout(this.notification.timeout);
      this.notification = { show: true, message, type, timeout: null };
      this.notification.timeout = setTimeout(() => {
        this.notification.show = false;
      }, 5000);
    },
  },
};
</script>

<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.kravia-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.kravia-header,
.section-heading,
.submit-bar,
.modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.kravia-header {
  margin-bottom: 24px;

  h1 {
    margin: 0 0 6px;
    color: #292c34;
    font-size: 2em;
  }

  p {
    margin: 0;
    color: #64748b;
  }
}

.invoice-section {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.invoice-section {
  padding: 20px;
  margin-bottom: 20px;

  h2 {
    margin: 0 0 16px;
    color: #292c34;
    font-size: 1.1em;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.form-grid--compact {
  grid-template-columns: repeat(2, minmax(160px, 240px));
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    color: #292c34;
    font-size: 0.85em;
    font-weight: 600;
    text-transform: uppercase;
  }
}

.preorder-section {
  margin-top: -8px;
}

.invoice-option {
  display: inline-flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  border: 1px solid #cbd5e0;
  border-radius: 8px;
  background: #fff;
  box-sizing: border-box;
  color: #292c34;
  cursor: pointer;
  padding: 10px 12px;
}

.invoice-option--active {
  border-color: #1bb776;
  background: #f0fdf4;
}

.invoice-option input {
  width: 18px;
  min-height: 18px;
  height: 18px;
  flex: 0 0 18px;
  margin: 2px 0 0;
  padding: 0;
}

.invoice-option-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.invoice-option-copy strong {
  font-size: 0.95em;
}

.invoice-option-copy small {
  color: #64748b;
  font-size: 0.82em;
  font-weight: 500;
  line-height: 1.35;
}

input,
select,
.static-field {
  width: 100%;
  min-height: 42px;
  box-sizing: border-box;
  border: 1px solid #cbd5e0;
  border-radius: 8px;
  padding: 10px 12px;
  font: inherit;
}

select {
  appearance: none;
  background-color: #fff;
  background-image:
    linear-gradient(45deg, transparent 50%, #292c34 50%),
    linear-gradient(135deg, #292c34 50%, transparent 50%);
  background-position:
    calc(100% - 18px) 50%,
    calc(100% - 12px) 50%;
  background-repeat: no-repeat;
  background-size: 6px 6px;
  color: #292c34;
  cursor: pointer;
  padding-right: 34px;
}

.static-field,
.readonly-amount {
  background: #f8f9fa;
  color: #292c34;
}

.static-field {
  display: flex;
  align-items: center;
}

.lookup-row,
.percent-input,
.line-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lookup-row input {
  flex: 1;
}

.company-lookup {
  position: relative;
}

.company-history-suggestions {
  position: absolute;
  z-index: 55;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 300px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
}

.company-history-suggestions button {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  border: 0;
  background: #fff;
  color: #292c34;
  cursor: pointer;
  padding: 10px 12px;
  text-align: left;
}

.company-history-suggestions button:hover {
  background: #f8f9fa;
}

.company-history-suggestions span,
.company-history-suggestions small {
  min-width: 0;
}

.company-history-suggestions span {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.company-history-suggestions small {
  color: #64748b;
  line-height: 1.35;
}

.company-history-suggestions button > small {
  max-width: 48%;
  text-align: right;
}

.company-history-state {
  color: #64748b;
  padding: 12px;
}

.btn {
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  min-height: 42px;
  padding: 10px 16px;
}

.btn-primary {
  background: #1bb776;
  color: #fff;
}

.btn-secondary {
  background: #fff;
  border: 1px solid #cbd5e0;
  color: #292c34;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.line-table {
  overflow: visible;
}

.line-row {
  display: grid;
  grid-template-columns:
    minmax(220px, 2fr)
    minmax(76px, 0.55fr)
    minmax(130px, 0.9fr)
    minmax(96px, 0.6fr)
    minmax(104px, 0.7fr)
    minmax(130px, 0.8fr);
  gap: 10px 12px;
  align-items: end;
  padding: 12px 0;
  border-bottom: 1px solid #eef2f7;
}

.line-row--header {
  align-items: center;
  color: #292c34;
  font-weight: 700;
  padding-bottom: 10px;
}

.line-row--fee {
  background: #f1f5f9;
  border-bottom: 0;
  border-radius: 8px;
  color: #64748b;
  cursor: help;
  margin-top: 8px;
  padding: 12px;
}

.line-row--fee:hover,
.line-row--fee:focus {
  background: #e8eef6;
  outline: none;
}

.line-row--fee:hover .fee-tooltip,
.line-row--fee:focus .fee-tooltip,
.line-row--fee:focus-within .fee-tooltip {
  display: block;
}

.line-field {
  min-width: 0;
}

.line-field--product {
  position: relative;
}

.line-field--fee-product {
  z-index: 2;
}

.mobile-label {
  display: none;
  color: #64748b;
  font-size: 0.78em;
  font-weight: 700;
  margin-bottom: 6px;
  text-transform: uppercase;
}

.product-cell {
  position: relative;
}

.fee-name {
  gap: 8px;
  overflow: visible;
  position: relative;
}

.fee-text {
  min-height: 42px;
  display: flex;
  align-items: center;
  color: #475569;
  font-weight: 600;
}

.fee-text--amount {
  justify-content: flex-end;
  color: #292c34;
  font-weight: 700;
}

.help-icon {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  border: 1px solid #cbd5e0;
  border-radius: 50%;
  background: #fff;
  color: #64748b;
  font-size: 0.85em;
  font-weight: 700;
  line-height: 20px;
  padding: 0;
  text-align: center;
}

.fee-tooltip--visible {
  display: block;
}

.fee-tooltip {
  position: absolute;
  display: none;
  z-index: 60;
  top: calc(100% + 8px);
  left: 0;
  width: min(360px, 76vw);
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
  color: #292c34;
  font-size: 0.9em;
  font-weight: 500;
  line-height: 1.45;
  padding: 12px 14px;
}

.suggestions {
  position: absolute;
  z-index: 50;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 280px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
}

.suggestions button {
  display: flex;
  justify-content: space-between;
  width: 100%;
  border: 0;
  background: #fff;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
}

.suggestions button:hover {
  background: #f8f9fa;
}

.readonly-amount {
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0 12px;
  font-weight: 700;
}

.line-actions {
  grid-column: 1 / -1;
  justify-content: flex-end;
}

.line-actions button {
  min-width: 52px;
  height: 32px;
  border: 1px solid #cbd5e0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  white-space: nowrap;
}

.add-line-button {
  margin-top: 12px;
}

.totals {
  display: flex;
  justify-content: flex-end;
  gap: 24px;
  margin-top: 18px;
}

.totals div {
  display: flex;
  flex-direction: column;
  min-width: 120px;
  text-align: right;
}

.totals span {
  color: #64748b;
  font-size: 0.85em;
}

.totals strong {
  color: #292c34;
  font-size: 1.1em;
}

.submit-bar {
  align-items: flex-end;
  gap: 24px;
  justify-content: space-between;
}

.submit-options {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: repeat(2, minmax(280px, 1fr));
  gap: 16px;
  min-width: 0;
}

.submit-button {
  min-width: 170px;
  min-height: 64px;
  padding: 14px 28px;
  font-size: 1.05em;
  line-height: 1.2;
}

.notification {
  border-radius: 8px;
  margin-bottom: 16px;
  padding: 12px 16px;
  font-weight: 600;
}

.submit-notification {
  box-shadow: none;
  grid-column: 1 / -1;
  margin: 0;
  min-height: 42px;
  display: flex;
  align-items: center;
}

.notification--success {
  background: #dcfce7;
  color: #166534;
}

.notification--error {
  background: #fee2e2;
  color: #991b1b;
}

.confirm-modal {
  width: 520px;
  max-width: 82vw;
}

@media (max-width: 1100px) {
  .line-row {
    grid-template-columns:
      minmax(220px, 1.7fr)
      minmax(76px, 0.6fr)
      minmax(130px, 1fr)
      minmax(96px, 0.7fr);
  }

  .line-row--header div:nth-child(5),
  .line-row--header div:nth-child(6) {
    display: none;
  }

  .line-field:nth-child(5),
  .line-field:nth-child(6) {
    grid-column: span 2;
  }
}

@media (max-width: 900px) {
  .kravia-header,
  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-grid--compact {
    grid-template-columns: 1fr;
  }

  .invoice-section {
    padding: 16px;
  }

  .line-row--header {
    display: none;
  }

  .line-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    align-items: start;
    padding: 16px 0;
  }

  .line-field--product,
  .line-actions {
    grid-column: 1 / -1;
  }

  .line-field:nth-child(5),
  .line-field:nth-child(6) {
    grid-column: auto;
  }

  .mobile-label {
    display: block;
  }

  .totals {
    flex-direction: column;
    gap: 8px;
  }

  .submit-bar {
    align-items: stretch;
    flex-direction: column;
    justify-content: stretch;
  }

  .submit-button {
    align-self: flex-end;
  }
}

@media (max-width: 560px) {
  .kravia-page {
    padding: 12px;
  }

  .line-row {
    grid-template-columns: 1fr;
  }

  .line-field:nth-child(5),
  .line-field:nth-child(6) {
    grid-column: 1;
  }

  .line-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .line-actions button,
  .add-line-button,
  .submit-bar .btn {
    width: 100%;
  }

  .company-history-suggestions button {
    flex-direction: column;
    gap: 4px;
  }

  .company-history-suggestions button > small {
    max-width: 100%;
    text-align: left;
  }

  .submit-bar {
    align-items: stretch;
    justify-content: stretch;
  }

  .submit-options {
    grid-template-columns: 1fr;
  }

  .submit-button {
    align-self: stretch;
  }

  .modal-actions {
    align-items: stretch;
    flex-direction: column-reverse;
  }
}
</style>

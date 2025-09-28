<template>
  <AdminPage>
    <div class="container">
      <div>
        <h1 style="margin-bottom: 0.5em">Produkter</h1>
        <p style="margin-bottom: 1.5em">Et verktøy for å enkelt kunne redigere produkter på PC</p>
      </div>
      <div class="store-selector">
        <div class="selector-container">
          <div class="select-wrapper">
            <select v-model="selectedStore">
              <option
                v-for="option in $store.state.currentUser.adminIn"
                :key="option.id"
                :value="option.id"
              >
                {{ option.name }} ({{ option.id }})
              </option>
            </select>
          </div>
          <div class="filter-wrapper">
            <div class="search-input">
              <span class="search-icon">🔍</span>
              <input
                v-model="productFilter"
                type="text"
                placeholder="Filtrer produkter..."
                class="product-filter"
              />
              <button
                v-if="productFilter"
                class="clear-button"
                @click="productFilter = ''"
              >
                ✕
              </button>
            </div>
          </div>
          <div class="select-wrapper items-per-page">
            <select v-model="itemsPerPage">
              <option
                v-for="n in [10, 25, 50, 100, 200]"
                :key="n"
                :value="n"
              >
                {{ n }} per side
              </option>
            </select>
          </div>
          <button
            class="new-product-btn"
            @click="createNewProduct"
          >
            <i class="fas fa-plus" /> Nytt produkt
          </button>
        </div>
      </div>

      <div class="results-count">
        Viser {{ paginatedProducts.length }} av {{ products.length }} produkter
        <button
          v-if="productFilter"
          class="clear-filter-btn"
          @click="productFilter = ''"
        >
          Fjern filter på '{{ productFilter }}'
        </button>
      </div>

      <div class="products-grid">
        <div
          v-for="product in paginatedProducts"
          :key="product.id"
          class="product-card"
        >
          <div
            class="product-image"
            :class="{ dragging: draggingProducts[product.id] }"
            @dragover.prevent="draggingProducts[product.id] = true"
            @dragleave.prevent="draggingProducts[product.id] = false"
            @drop.prevent="
              handleDrop($event, product.id);
              draggingProducts[product.id] = false;
            "
            @click="triggerFileInput(product.id)"
          >
            <input
              :ref="`fileInput-${product.id}`"
              type="file"
              class="hidden-file-input"
              accept="image/jpeg,image/png"
              @change="handleFileSelect($event, product.id)"
            />
            <div
              v-if="uploadingFor === product.id"
              class="loading-overlay"
            >
              <i class="fas fa-spinner fa-spin" />
            </div>
            <div v-if="product.image?.imageUrl">
              <img
                :src="product.image.imageUrl"
                :alt="product.name"
              />
              <div
                v-if="imageDimensions[product.id]"
                class="dimension-tag"
              >
                {{ imageDimensions[product.id] }}
              </div>
            </div>
            <div
              v-else
              class="no-image"
            >
              <i class="fas fa-cloud-upload-alt" />
              <span>Slipp bilde her</span>
            </div>
          </div>
          <div class="product-info">
            <h3>{{ product.name }}</h3>
            <p>{{ product.description }}</p>
            <div class="price-container">
              <div class="price">{{ (product.amount / 100).toFixed(2) }} {{ product.currency }}</div>
              <div
                v-if="product.tablePriceEnabled"
                class="table-price"
              >
                <span class="table-label">Spis inne:</span>
                {{ ((product.amount + product.tableAdditionalAmount) / 100).toFixed(2) }} {{ product.currency }}
              </div>
            </div>
            <button
              class="edit-btn"
              @click="editProduct(product)"
            >
              <i class="fas fa-edit" /> Rediger
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="totalPages > 1"
        class="pagination"
      >
        <button
          :disabled="currentPage === 1"
          class="pagination-btn"
          @click="changePage(currentPage - 1)"
        >
          Forrige
        </button>

        <div class="page-numbers">
          <button
            v-for="page in totalPages"
            :key="page"
            :class="['page-number', { active: page === currentPage }]"
            @click="changePage(page)"
          >
            {{ page }}
          </button>
        </div>

        <button
          :disabled="currentPage === totalPages"
          class="pagination-btn"
          @click="changePage(currentPage + 1)"
        >
          Neste
        </button>
      </div>

      <LoginModal
        v-if="showLogin"
        @close="closeLoginModal"
      />

      <div
        class="product-editor"
        :class="{ 'is-open': selectedProduct }"
      >
        <div
          v-if="selectedProduct"
          class="editor-content"
        >
          <div class="editor-header">
            <h2>Rediger produkt</h2>
            <button
              class="close-btn"
              @click="selectedProduct = null"
            >
              ✕
            </button>
          </div>

          <div class="editor-body">
            <div class="editor-image">
              <div class="image-container">
                <div
                  class="product-image"
                  :class="{ dragging: draggingProducts[selectedProduct.id] }"
                  @dragover.prevent="draggingProducts[selectedProduct.id] = true"
                  @dragleave.prevent="draggingProducts[selectedProduct.id] = false"
                  @drop.prevent="
                    handleDrop($event, selectedProduct.id);
                    draggingProducts[selectedProduct.id] = false;
                  "
                  @click="triggerFileInput(selectedProduct.id)"
                >
                  <input
                    :ref="`fileInput-editor-${selectedProduct.id}`"
                    type="file"
                    class="hidden-file-input"
                    accept="image/jpeg,image/png"
                    @change="handleFileSelect($event, selectedProduct.id)"
                  />
                  <div
                    v-if="uploadingFor === selectedProduct.id"
                    class="loading-overlay"
                  >
                    <i class="fas fa-spinner fa-spin" />
                  </div>
                  <div v-if="selectedProduct.image?.imageUrl">
                    <img
                      :src="selectedProduct.image.imageUrl"
                      :alt="selectedProduct.name"
                    />
                    <div
                      v-if="imageDimensions[selectedProduct.id]"
                      class="dimension-tag"
                    >
                      {{ imageDimensions[selectedProduct.id] }}
                    </div>
                  </div>
                  <div
                    v-else
                    class="no-image"
                  >
                    <i class="fas fa-cloud-upload-alt" />
                    <span>Slipp bilde her</span>
                  </div>
                </div>
                <button
                  v-if="selectedProduct.image?.imageUrl"
                  class="remove-image-btn"
                  @click.stop="removeImage(selectedProduct.id)"
                >
                  Slett bilde
                </button>
              </div>
            </div>
            <div class="form-group">
              <label>Navn</label>
              <input
                v-model="selectedProduct.name"
                type="text"
              />
            </div>
            <div class="form-group">
              <label>Beskrivelse</label>
              <textarea
                v-model="selectedProduct.description"
                rows="3"
              />
            </div>
            <div class="form-group">
              <label>Allergener</label>
              <textarea
                v-model="selectedProduct.otherInformation"
                rows="2"
                placeholder="F.eks: Inneholder gluten, melk, egg"
              />
            </div>
            <div class="form-group">
              <label>Pris (NOK)</label>
              <input
                :value="priceDisplay"
                type="text"
                inputmode="decimal"
                placeholder="0.00"
                @input="handlePriceInput"
                @blur="formatPrice"
              />
            </div>
            <div class="form-group">
              <label>MVA (%)</label>
              <input
                v-model.number="selectedProduct.tax"
                type="number"
                min="0"
                max="100"
                placeholder="15"
              />
              <span class="helper-text">Vanligvis 15% for takeaway</span>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input
                  v-model="selectedProduct.tablePriceEnabled"
                  type="checkbox"
                />
                Egen pris for 'Spis inne'
              </label>
              <div v-if="selectedProduct.tablePriceEnabled">
                <label>Spis inne pris (NOK)</label>
                <input
                  :value="finalTablePriceDisplay"
                  type="text"
                  inputmode="decimal"
                  placeholder="0.00"
                  @input="handleFinalTablePriceInput"
                  @blur="formatFinalTablePrice"
                />
                <label class="mt-4">Spis inne MVA (%)</label>
                <input
                  v-model.number="selectedProduct.tableTax"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="25"
                />
                <span class="helper-text">Vanligvis 25% for spis inne</span>
              </div>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input
                  v-model="selectedProduct.deliveryPriceEnabled"
                  type="checkbox"
                />
                Egen pris for 'Hjemlevering'
              </label>
              <div v-if="selectedProduct.deliveryPriceEnabled">
                <label>Hjemlevering pris (NOK)</label>
                <input
                  :value="finalDeliveryPriceDisplay"
                  type="text"
                  inputmode="decimal"
                  placeholder="0.00"
                  @input="handleFinalDeliveryPriceInput"
                  @blur="formatFinalDeliveryPrice"
                />
                <label class="mt-4">Hjemlevering MVA (%)</label>
                <input
                  v-model.number="selectedProduct.deliveryTax"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="15"
                />
                <span class="helper-text">Vanligvis 15% for hjemlevering</span>
              </div>
            </div>

            <p class="results-count">For andre produktendringer (som f.eks varianter), vennligst bruk Okam Admin appen.</p>
          </div>

          <div class="editor-actions">
            <button
              class="save-btn"
              :disabled="isSaving || !canSave"
              @click="saveProduct"
            >
              <span>{{ isSaving ? "Lagrer..." : "Lagre endringer" }}</span>
            </button>
            <button
              class="cancel-btn"
              @click="selectedProduct = null"
            >
              Avbryt
            </button>
            <button
              v-if="selectedProduct.id"
              class="delete-btn"
              :disabled="isSaving"
              @click="confirmDelete"
            >
              Slett
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from "~/components/organisms/AdminPage.vue";
import axios from "axios";
import dayjs from "dayjs";
import LoginModal from "~/components/molecules/LoginModal.vue";
import $config from "~/core/helpers/configuration";

export default {
  components: { AdminPage, LoginModal },
  data: () => ({
    showLogin: false,
    selectedStore: null,
    products: [],
    draggingProducts: {},
    uploadingFor: null,
    productFilter: "",
    imageDimensions: {},
    currentPage: 1,
    itemsPerPage: 10,
    selectedProduct: null,
    isSaving: false,
  }),

  computed: {
    filteredProducts() {
      if (!this.productFilter) {
        return this.sortProductsByDate(this.products);
      }
      const filter = this.productFilter.toLowerCase();
      return this.sortProductsByDate(this.products.filter((p) => p.name.toLowerCase().includes(filter)));
    },

    paginatedProducts() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.filteredProducts.slice(start, end);
    },

    totalPages() {
      return Math.ceil(this.filteredProducts.length / this.itemsPerPage);
    },

    priceDisplay() {
      return this.selectedProduct?.amount ? (this.selectedProduct.amount / 100).toFixed(2) : "";
    },

    finalTablePriceDisplay() {
      if (!this.selectedProduct?.tablePriceEnabled) {
        return "";
      }
      return ((this.selectedProduct.amount + this.selectedProduct.tableAdditionalAmount) / 100).toFixed(2);
    },

    finalDeliveryPriceDisplay() {
      if (!this.selectedProduct?.deliveryPriceEnabled) {
        return "";
      }
      return ((this.selectedProduct.amount + this.selectedProduct.deliveryAdditionalAmount) / 100).toFixed(2);
    },

    canSave() {
      return this.selectedProduct?.name?.trim();
    },
  },

  watch: {
    selectedStore(newVal) {
      if (window && window.localStorage) {
        localStorage.setItem("selectedStore", newVal);
      }
      if (newVal > 0) {
        this.currentPage = 1;
        this.loadProducts();
      } else {
        this.products = [];
      }
    },

    productFilter() {
      this.currentPage = 1;
    },

    itemsPerPage() {
      this.currentPage = 1;
    },

    selectedProduct(newVal) {
      // Only lock body scroll on mobile
      if (window.innerWidth <= 768) {
        document.body.style.overflow = newVal ? "hidden" : "";
      }

      // Toggle class for container adjustment
      const container = document.querySelector(".container");
      if (container) {
        container.classList.toggle("editor-open", !!newVal);
      }
    },
  },

  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      this.showLogin = true;
      return;
    }

    // Try to get stored selection first
    const storedStore = localStorage.getItem("selectedStore");
    if (storedStore && this.$store.state.currentUser.adminIn?.find((store) => store.id === parseInt(storedStore))) {
      this.selectedStore = parseInt(storedStore);
    }
    // Otherwise default to first store
    else if (this.$store.state.currentUser.adminIn?.length > 0) {
      this.selectedStore = this.$store.state.currentUser.adminIn[0].id;
    }
  },

  methods: {
    closeLoginModal(isLoggedIn) {
      this.showLogin = !isLoggedIn;

      // If login successful, set store selection
      if (isLoggedIn) {
        const storedStore = localStorage.getItem("selectedStore");
        if (storedStore && this.$store.state.currentUser.adminIn?.find((store) => store.id === parseInt(storedStore))) {
          this.selectedStore = parseInt(storedStore);
        }
        // Otherwise default to first store
        else if (this.$store.state.currentUser.adminIn?.length > 0) {
          this.selectedStore = this.$store.state.currentUser.adminIn[0].id;
        }
      }
    },

    async loadProducts() {
      try {
        const products = await this._productService.GetAll(this.selectedStore);
        this.products = this.sortProductsByDate(products);
        this.imageDimensions = {};
        products.forEach((p) => this.updateImageDimension(p));
      } catch (err) {
        console.error("Failed to load products:", err);
      }
    },

    async handleDrop(event, productId) {
      const file = event.dataTransfer.files[0];

      if (!file.type.match(/image\/(jpeg|png)/)) {
        alert("Only JPG and PNG files are allowed");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        return;
      }

      this.uploadingFor = productId;

      try {
        const resizedBlob = await this.processImage(file);
        await this.uploadImage(productId, resizedBlob);
      } catch (error) {
        console.error("Failed to upload image:", error);
        alert("Failed to upload image");
      } finally {
        this.uploadingFor = null;
      }
    },

    triggerFileInput(productId) {
      const editorRef = this.$refs[`fileInput-editor-${productId}`];
      const gridRef = this.$refs[`fileInput-${productId}`];

      if (editorRef?.[0]) {
        editorRef[0].click();
      } else if (gridRef?.[0]) {
        gridRef[0].click();
      }
    },

    handleFileSelect(event, productId) {
      const file = event.target.files[0];
      if (!file) {
        return;
      }

      // Create a fake drop event to reuse existing logic
      const fakeDropEvent = { dataTransfer: { files: [file] } };
      this.handleDrop(fakeDropEvent, productId);

      // Reset the input so the same file can be selected again
      event.target.value = "";
    },

    async resizeAndUpload(productId, imageUrl) {
      this.uploadingFor = productId;

      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const resizedBlob = await this.processImage(blob);
        await this.uploadImage(productId, resizedBlob);
      } catch (error) {
        console.error("Failed to resize and upload image:", error);
        alert("Failed to resize and upload image");
      } finally {
        this.uploadingFor = null;
      }
    },

    async processImage(file) {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objectUrl;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Set fixed dimensions
      canvas.width = 500;
      canvas.height = 500;

      // Calculate crop dimensions
      const size = Math.min(img.width, img.height);
      const startX = (img.width - size) / 2;
      const startY = (img.height - size) / 2;

      // Draw the centered square crop
      ctx.drawImage(
        img,
        startX,
        startY,
        size,
        size, // Source crop
        0,
        0,
        500,
        500 // Destination dimensions
      );

      URL.revokeObjectURL(objectUrl);

      return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    },

    async uploadImage(productId, blob) {
      const formData = new FormData();
      formData.append("image", blob, "image.jpg");
      formData.append("guidId", productId);

      await axios.post(`${$config.okamApiBaseUrl}/products/image`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${this.$store.state.currentUser.token}`,
        },
      });

      // Get the updated product data
      const products = await this._productService.GetAll(this.selectedStore);
      this.products = products;

      // Update the selected product's image if we're editing
      if (this.selectedProduct?.id === productId) {
        const updatedProduct = products.find((p) => p.id === productId);
        if (updatedProduct) {
          this.selectedProduct.image = updatedProduct.image;
        }
      }

      this.$set(this.imageDimensions, productId, "500x500");
    },

    updateImageDimension(product) {
      if (!product.image?.imageUrl) {
        return;
      }

      const img = new Image();
      img.onload = () => {
        this.$set(this.imageDimensions, product.id, `${img.width}x${img.height}`);
      };
      img.src = product.image.imageUrl;
    },

    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
      }
    },

    editProduct(product) {
      this.selectedProduct = JSON.parse(JSON.stringify(product));
    },

    async saveProduct() {
      if (this.isSaving || !this.canSave) {
        return;
      }
      this.isSaving = true;

      try {
        const productData = {
          ...this.selectedProduct,
          name: this.selectedProduct.name.trim(),
        };
        await this._productService.CreateOrUpdate(productData);
        await this.loadProducts();
        this.productFilter = productData.name;
        this.selectedProduct = null;
      } catch (err) {
        console.error("Failed to save product:", err);
        alert("Failed to save product");
      } finally {
        this.isSaving = false;
      }
    },

    handlePriceInput(event) {
      const input = event.target;
      const cursorPos = input.selectionStart;
      const oldValue = input.value;

      let value = input.value.replace(/[^\d.,]/g, "");
      value = value.replace(/[.,](?=.*[.,])/g, "");
      value = value.replace(",", ".");

      if (value === "") {
        this.selectedProduct.amount = 0;
        return;
      }

      const kronerValue = parseFloat(value);
      if (!isNaN(kronerValue)) {
        this.selectedProduct.amount = Math.round(kronerValue * 100);

        // Calculate new cursor position
        const newPos = cursorPos + (input.value.length - oldValue.length);
        // Set it after Vue updates the DOM
        this.$nextTick(() => {
          input.setSelectionRange(newPos, newPos);
        });
      }
    },

    formatPrice() {
      // Format on blur to show proper decimal places
      const formatted = (this.selectedProduct.amount / 100).toFixed(2);
      event.target.value = formatted;
    },

    handleFinalTablePriceInput(event) {
      const input = event.target;
      const cursorPos = input.selectionStart;
      const oldValue = input.value;

      let value = input.value.replace(/[^\d.,]/g, "");
      value = value.replace(/[.,](?=.*[.,])/g, "");
      value = value.replace(",", ".");

      if (value === "") {
        this.selectedProduct.tableAdditionalAmount = 0;
        return;
      }

      const finalPrice = parseFloat(value);
      if (!isNaN(finalPrice)) {
        // Calculate additional amount as difference between final price and base price
        const additionalAmount = Math.round(finalPrice * 100) - this.selectedProduct.amount;
        this.selectedProduct.tableAdditionalAmount = Math.max(0, additionalAmount);

        const newPos = cursorPos + (input.value.length - oldValue.length);
        this.$nextTick(() => {
          input.setSelectionRange(newPos, newPos);
        });
      }
    },

    formatFinalTablePrice() {
      const finalPrice = ((this.selectedProduct.amount + this.selectedProduct.tableAdditionalAmount) / 100).toFixed(2);
      event.target.value = finalPrice;
    },

    handleFinalDeliveryPriceInput(event) {
      const input = event.target;
      const cursorPos = input.selectionStart;
      const oldValue = input.value;

      let value = input.value.replace(/[^\d.,]/g, "");
      value = value.replace(/[.,](?=.*[.,])/g, "");
      value = value.replace(",", ".");

      if (value === "") {
        this.selectedProduct.deliveryAdditionalAmount = 0;
        return;
      }

      const finalPrice = parseFloat(value);
      if (!isNaN(finalPrice)) {
        const additionalAmount = Math.round(finalPrice * 100) - this.selectedProduct.amount;
        this.selectedProduct.deliveryAdditionalAmount = Math.max(0, additionalAmount);

        const newPos = cursorPos + (input.value.length - oldValue.length);
        this.$nextTick(() => {
          input.setSelectionRange(newPos, newPos);
        });
      }
    },

    formatFinalDeliveryPrice() {
      const finalPrice = ((this.selectedProduct.amount + this.selectedProduct.deliveryAdditionalAmount) / 100).toFixed(2);
      event.target.value = finalPrice;
    },

    async confirmDelete() {
      if (!confirm("Er du sikker på at du vil slette dette produktet?")) {
        return;
      }

      this.isSaving = true;
      try {
        await this._productService.Delete(this.selectedProduct.id);
        await this.loadProducts();
        this.selectedProduct = null;
      } catch (err) {
        console.error("Failed to delete product:", err);
        alert("Kunne ikke slette produktet");
      } finally {
        this.isSaving = false;
      }
    },

    createNewProduct() {
      this.selectedProduct = {
        name: "",
        storeId: this.selectedStore,
        description: "",
        otherInformation: "",
        amount: 0,
        currency: "NOK",
        tax: 15,
        tablePriceEnabled: false,
        tableAdditionalAmount: 0,
        tableTax: 25,
        deliveryPriceEnabled: false,
        deliveryAdditionalAmount: 0,
        deliveryTax: 15,
      };
    },

    async removeImage(productId) {
      try {
        await this._productService.DeleteImage(productId);
        // Update products list
        const products = await this._productService.GetAll(this.selectedStore);
        this.products = products;

        // Update selected product
        if (this.selectedProduct?.id === productId) {
          const updatedProduct = products.find((p) => p.id === productId);
          if (updatedProduct) {
            this.selectedProduct.image = null;
          }
        }

        // Clear dimension
        this.$delete(this.imageDimensions, productId);
      } catch (err) {
        console.error("Failed to remove image:", err);
      }
    },

    sortProductsByDate(products) {
      // Check if any products have a valid creation date (not the default 0001-01-01T00:00:00)
      const hasValidDates = products.some((p) => p.createdAt && p.createdAt !== "0001-01-01T00:00:00");

      // If we have valid dates, sort by them (oldest first)
      if (hasValidDates) {
        return [...products].sort((a, b) => {
          // Use the full ISO string for comparison to preserve millisecond precision
          const dateA = a.createdAt && a.createdAt !== "0001-01-01T00:00:00" ? a.createdAt : "9999-12-31T23:59:59.9999999";
          const dateB = b.createdAt && b.createdAt !== "0001-01-01T00:00:00" ? b.createdAt : "9999-12-31T23:59:59.9999999";
          
          // Direct string comparison works for ISO dates and preserves millisecond precision
          return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
        });
      }

      // Otherwise return the original array
      return products;
    },
  },
};
</script>

<style lang="scss">
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  padding-top: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  @media (min-width: 769px) {
    &.editor-open {
      margin-right: 500px; // Match editor width
      max-width: calc(100% - 500px);
    }
  }

  @media (max-width: 768px) {
    padding: 1rem;
    &.editor-open {
      overflow: hidden;
      height: 100vh;
    }
  }
}

.store-selector {
  margin-bottom: 2rem;

  .selector-container {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;

    @media (max-width: 768px) {
      gap: 0.5rem;
    }
  }

  .filter-wrapper {
    flex: 1;
    min-width: 200px;

    @media (max-width: 768px) {
      width: 100%;
      max-width: none;
    }
  }
}

.select-wrapper {
  position: relative;
  display: inline-block;

  select {
    padding: 0.5rem 2.5rem 0.5rem 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid #e2e8f0;
    background-color: white;
    appearance: none;
    min-width: 200px;
  }

  &::after {
    content: "🏠";
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }

  &.items-per-page::after {
    content: "𝍬";
  }
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.75rem;

  @media (max-width: 480px) {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  }
}

.product-card {
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 0.625rem;
  background: white;
  transition: all 0.2s;
  width: 100%;

  &:hover {
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    transform: translateY(-2px);
  }
}

.product-image {
  position: relative;
  background: #f8fafc;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  border: 2px dashed transparent;
  width: 100%;
  padding-bottom: 85%;
  height: 0;
  margin: 0 auto;

  img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 0.375rem;
  }

  .no-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #94a3b8;

    i {
      font-size: 1.25rem;
      margin-bottom: 0.375rem;
    }

    span {
      font-size: 0.75rem;
    }
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;

    i {
      color: #3b82f6;
      font-size: 1.5rem;
    }
  }

  &.dragging {
    border-color: #3b82f6;
    background-color: #f0f9ff;
  }

  .dimension-tag {
    position: absolute;
    bottom: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 2px 6px;
    font-size: 0.675rem;
    z-index: 5;
    border-top-left-radius: 4px;
  }
}

.product-info {
  text-align: center;
  margin-top: 0.75rem;

  h3 {
    margin: 0 0 0.375rem;
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.25;
  }

  p {
    margin: 0 0 0.375rem;
    font-size: 0.75rem;
    color: #64748b;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .price-container {
    margin: 0.5rem 0;

    .price {
      font-weight: 600;
      color: #0f172a;
      font-size: 0.875rem;
    }

    .table-price {
      margin-top: 0.25rem;
      font-size: 0.75rem;
      color: #64748b;

      .table-label {
        color: #94a3b8;
        margin-right: 0.25rem;
      }
    }
  }
}

.results-count {
  margin: 1rem 0;
  color: #64748b;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  .clear-filter-btn {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.25rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #dc2626;
    }
  }
}

.hidden-file-input {
  display: none;
}

.pagination {
  margin-top: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;

  .pagination-btn {
    padding: 0.5rem 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    background: white;
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &:not(:disabled):hover {
      background: #f8fafc;
    }
  }

  .page-numbers {
    display: flex;
    gap: 0.5rem;

    .page-number {
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      background: white;
      cursor: pointer;

      &:hover {
        background: #f8fafc;
      }

      &.active {
        background: #334155;
        color: white;
        border-color: #334155;
      }
    }
  }

  @media (max-width: 480px) {
    .page-numbers {
      display: none;
    }

    .pagination-btn {
      flex: 1;
    }
  }
}

.items-per-page {
  select {
    min-width: 120px;
  }
}

.product-editor {
  position: fixed;
  top: 0;
  right: -500px;
  width: 500px;
  height: 100vh;
  background: white;
  box-shadow: -5px 0 30px rgba(0, 0, 0, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;

  &.is-open {
    right: 0;

    @media (max-width: 768px) {
      &::before {
        content: "";
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: -1;
      }
    }
  }

  @media (max-width: 768px) {
    width: 100%;
    right: -100%;
  }

  .editor-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #f8fafc;
  }

  .editor-header {
    padding: 1.5rem;
    background: white;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

    h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #1e293b;
    }

    .close-btn {
      background: #f1f5f9;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 0.5rem;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;

      &:hover {
        background: #e2e8f0;
        color: #ef4444;
      }
    }
  }

  .editor-body {
    padding: 1.5rem;
    flex: 1;
    overflow-y: auto;

    @media (max-width: 768px) {
      padding: 1rem;
    }
  }

  .editor-actions {
    background: white;
    padding: 1.25rem;
    border-top: 1px solid #e2e8f0;
    display: flex;
    gap: 1rem;
    box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);

    button {
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.875rem;
      transition: all 0.2s;
      flex: 1;
    }

    .delete-btn {
      background: white;
      color: #ef4444;
      border: 1px solid #ef4444;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.875rem;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &:not(:disabled):hover {
        background: #f8fafc;
        border-color: #cbd5e1;
      }
    }
  }
}

.edit-btn {
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-left: auto;
  margin-right: auto;
  min-width: 80px;

  &:hover {
    background: #f1f5f9;
  }
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  input[type="checkbox"] {
    width: auto;
  }
}

.save-btn {
  background: #334155;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #94a3b8;
  }

  &:not(:disabled):hover {
    background: #1e293b;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.search-input {
  position: relative;
  width: 100%;

  .search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
  }

  input {
    width: 100%;
    padding: 0.5rem 2rem 0.5rem 2.5rem;
    border-radius: 0.375rem;
    border: 1px solid #e2e8f0;
    background-color: white;

    &:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &::placeholder {
      color: #94a3b8;
    }
  }

  .clear-button {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 0.25rem;

    &:hover {
      color: #64748b;
    }
  }
}

// Form styling
.form-group {
  margin-bottom: 1.25rem;

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #334155;
  }

  input[type="text"],
  input[type="number"],
  textarea {
    width: 100%;
    padding: 0.625rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    background: white;
    font-size: 0.875rem;
    transition: all 0.2s;

    &:focus {
      outline: none;
      border-color: #334155;
      box-shadow: 0 0 0 3px rgba(51, 65, 85, 0.1);
    }

    &::placeholder {
      color: #94a3b8;
    }
  }

  textarea {
    resize: vertical;
    min-height: 80px;
  }
}

// Checkbox styling
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  margin-bottom: 0.75rem;

  input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
    border-radius: 0.25rem;
    border: 1px solid #e2e8f0;
    cursor: pointer;

    &:checked {
      background-color: #334155;
      border-color: #334155;
    }
  }
}

// Button styling
.save-btn {
  background: #334155;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #94a3b8;
  }

  &:not(:disabled):hover {
    background: #1e293b;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

.cancel-btn,
.edit-btn,
.pagination-btn {
  background: white;
  color: #334155;
  border: 1px solid #e2e8f0;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #f8fafc;
    border-color: #cbd5e1;
  }
}

// Search input styling
.search-input {
  position: relative;
  width: 100%;

  .search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
  }

  input {
    width: 100%;
    padding: 0.5rem 2rem 0.5rem 2.5rem;
    border-radius: 0.375rem;
    border: 1px solid #e2e8f0;
    background-color: white;
    font-size: 0.875rem;

    &:focus {
      outline: none;
      border-color: #334155;
      box-shadow: 0 0 0 3px rgba(51, 65, 85, 0.1);
    }

    &::placeholder {
      color: #94a3b8;
    }
  }

  .clear-button {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 0.25rem;

    &:hover {
      color: #64748b;
    }
  }
}

// Select styling
.select-wrapper {
  select {
    width: 100%;
    padding: 0.5rem 2.5rem 0.5rem 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid #e2e8f0;
    background-color: white;
    appearance: none;
    font-size: 0.875rem;
    color: #334155;
    cursor: pointer;
    transition: all 0.2s;

    &:focus {
      outline: none;
      border-color: #334155;
      box-shadow: 0 0 0 3px rgba(51, 65, 85, 0.1);
    }
  }
}

// Pagination styling
.pagination {
  .page-number {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    background: white;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #f8fafc;
    }

    &.active {
      background: #334155;
      color: white;
      border-color: #334155;
    }
  }
}

.selector-container {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;

  .new-product-btn {
    margin-left: auto;
    background: #334155;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s;

    &:hover {
      background: #1e293b;
      transform: translateY(-1px);
    }

    i {
      font-size: 0.75rem;
    }
  }
}

.save-btn,
.cancel-btn,
.delete-btn {
  text-align: center;
  justify-content: center;
}

.edit-btn {
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.clear-filter-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;

  &:hover {
    color: #64748b;
  }
}

.helper-text {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.25rem;
}

.mt-4 {
  margin-top: 1rem;
}

.editor-image {
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: center;

  .image-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    max-width: 300px;
    width: 100%;
  }

  .remove-image-btn {
    background: none;
    border: none;
    color: #ef4444;
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s;

    &:hover {
      color: #dc2626;
      text-decoration: underline;
    }

    i {
      font-size: 0.75rem;
    }
  }
}
</style>

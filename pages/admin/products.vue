<template>
  <AdminPage @login-success="handleLoginSuccess">
    <div class="products-page">
      <div class="page-header">
        <h1>Produkter</h1>
        <p>Et verktøy for å enkelt kunne redigere produkter på PC</p>
      </div>
      <div class="controls-section">
        <div class="store-selector">
        <div class="selector-container">
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
      </div>

      <div class="results-count" v-if="!isLoading && products.length > 0">
        Viser {{ paginatedProducts.length }} av {{ products.length }} produkter
        <button
          v-if="productFilter"
          class="clear-filter-btn"
          @click="productFilter = ''"
        >
          Fjern filter på '{{ productFilter }}'
        </button>
      </div>

      <LoadingSkeleton v-if="isLoading" />

      <div v-else-if="products.length === 0 && !productFilter" class="empty-state">
        <span class="material-icons">inventory_2</span>
        <h3>Ingen produkter enda</h3>
        <p>Kom i gang ved å legge til ditt første produkt</p>
        <button class="create-first-btn" @click="createNewProduct">
          <i class="fas fa-plus" /> Opprett første produkt
        </button>
      </div>

      <div v-else-if="paginatedProducts.length > 0" class="products-grid">
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
              <Loading :loading="true" :size="30" />
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
                    <Loading :loading="true" :size="30" />
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

            <!-- Categories Section -->
            <div v-if="selectedProduct.id" class="form-group categories-section">
              <label>Kategorier</label>
              <div class="multi-select-dropdown" :class="{ open: categoryDropdownOpen }">
                <div class="dropdown-trigger" @click.stop="categoryDropdownOpen = !categoryDropdownOpen">
                  <span v-if="selectedProductCategoryIds.length === 0" class="placeholder">
                    Velg kategorier...
                  </span>
                  <span v-else class="selected-names">
                    {{ selectedCategoryNames }}
                  </span>
                  <i class="fas fa-chevron-down dropdown-arrow" />
                </div>
                <div v-if="categoryDropdownOpen" class="dropdown-menu">
                  <div
                    v-for="category in categories"
                    :key="category.id"
                    class="dropdown-item"
                    :class="{ selected: selectedProductCategoryIds.includes(category.id) }"
                    @click="toggleCategory(category)"
                  >
                    <input
                      type="checkbox"
                      :checked="selectedProductCategoryIds.includes(category.id)"
                      @click.stop="toggleCategory(category)"
                    />
                    <span>{{ category.name }}</span>
                  </div>
                  <div v-if="categories.length === 0" class="dropdown-empty">
                    Ingen kategorier funnet
                  </div>
                </div>
              </div>
              <p class="helper-text">Produktet vil vises i de valgte kategoriene</p>
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

            <!-- Product Variants Section -->
            <div v-if="selectedProduct.id" class="form-group variants-section">
              <div class="section-header-inline">
                <label>Tilbehør / Varianter</label>
                <button
                  class="btn-add-variant"
                  type="button"
                  @click="openVariantEditor"
                >
                  <i class="fas fa-plus" /> Legg til
                </button>
              </div>
              <p class="helper-text">Varianter som er spesifikke for dette produktet</p>

              <div v-if="selectedProduct.productVariants && selectedProduct.productVariants.length > 0" class="variants-list-compact">
                <div
                  v-for="(variant, index) in selectedProduct.productVariants"
                  :key="variant.id || index"
                  class="variant-item-compact"
                  @click="editVariant(index)"
                >
                  <div class="variant-info-compact">
                    <div class="variant-name-compact">{{ variant.name }}</div>
                    <div class="variant-meta-compact">
                      <span v-if="variant.multiselect" class="badge-compact">Flervalg</span>
                      <span v-if="variant.required" class="badge-compact badge-required-compact">Obligatorisk</span>
                      <span class="variant-options-preview-compact">
                        {{ formatOptionsPreview(variant.options) }}
                      </span>
                    </div>
                  </div>
                  <button class="delete-btn-variant" type="button" @click.stop="removeVariant(index)">
                    <i class="fas fa-trash" />
                  </button>
                </div>
              </div>
              <div v-else class="empty-hint-compact">
                Ingen varianter lagt til
              </div>
            </div>
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

      <!-- Modals -->
      <VariantEditorModal ref="variantEditor" />

      <!-- New Product Name Modal -->
      <div v-if="showNewProductModal" class="modal-overlay" @click.self="closeNewProductModal">
        <div class="new-product-modal">
          <h3>Nytt produkt</h3>
          <p class="modal-description">Skriv inn produktnavn for å komme i gang</p>
          <input
            ref="newProductNameInput"
            v-model="newProductName"
            type="text"
            placeholder="Produktnavn"
            class="modal-input"
            @keyup.enter="confirmNewProduct"
            @keyup.esc="closeNewProductModal"
          />
          <div class="modal-actions">
            <button class="modal-btn-secondary" @click="closeNewProductModal">
              Avbryt
            </button>
            <button
              class="modal-btn-primary"
              :disabled="!newProductName.trim() || isCreatingProduct"
              @click="confirmNewProduct"
            >
              {{ isCreatingProduct ? 'Oppretter...' : 'Opprett produkt' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from "~/components/organisms/AdminPage.vue";
import VariantEditorModal from "~/components/admin/VariantEditorModal.vue";
import LoadingSkeleton from "~/components/molecules/LoadingSkeleton.vue";
import Loading from "~/components/atoms/Loading.vue";
import axios from "axios";
import $config from "~/core/helpers/configuration";

export default {
  components: {
    AdminPage,
    VariantEditorModal,
    LoadingSkeleton,
    Loading
  },
  data: () => ({
    products: [],
    categories: [],
    draggingProducts: {},
    uploadingFor: null,
    productFilter: "",
    imageDimensions: {},
    currentPage: 1,
    itemsPerPage: 10,
    selectedProduct: null,
    isSaving: false,
    isLoading: false,
    loadingCategories: false,
    categoryDropdownOpen: false,
    pendingCategoryChanges: {}, // { categoryId: { add: boolean, items: [] } }
    originalCategoryIds: [], // Track original state to detect changes
    showNewProductModal: false,
    newProductName: '',
    isCreatingProduct: false,
    toast: {
      show: false,
      message: '',
      type: 'success'
    }
  }),

  computed: {
    selectedStore() {
      return this.$store.state.selectedAdminStore;
    },

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

    selectedProductCategoryIds() {
      if (!this.selectedProduct?.id) return [];

      // Start with categories that contain the product
      const categoryIds = this.categories
        .filter(cat => cat.categoryProductListItems?.some(
          item => item.productId === this.selectedProduct.id
        ))
        .map(cat => cat.id);

      // Apply pending changes
      for (const [categoryId, change] of Object.entries(this.pendingCategoryChanges)) {
        if (change.add && !categoryIds.includes(categoryId)) {
          categoryIds.push(categoryId);
        } else if (!change.add && categoryIds.includes(categoryId)) {
          const index = categoryIds.indexOf(categoryId);
          categoryIds.splice(index, 1);
        }
      }

      return categoryIds;
    },

    selectedCategoryNames() {
      return this.categories
        .filter(cat => this.selectedProductCategoryIds.includes(cat.id))
        .map(cat => cat.name)
        .join(', ');
    },
  },

  watch: {
    selectedStore(newVal) {
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

    selectedProduct(newVal, oldVal) {
      // Only lock body scroll on mobile
      if (window.innerWidth <= 768) {
        document.body.style.overflow = newVal ? "hidden" : "";
      }

      // Toggle class for container adjustment
      const container = document.querySelector(".container");
      if (container) {
        container.classList.toggle("editor-open", !!newVal);
      }

      // Reset pending changes when closing editor
      if (!newVal && oldVal) {
        this.pendingCategoryChanges = {};
        this.originalCategoryIds = [];
        this.categoryDropdownOpen = false;
      }
    },
  },

  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      return;
    }

    if (this.selectedStore > 0) {
      this.loadProducts();
    }

    document.addEventListener('click', this.handleClickOutside);
  },

  beforeDestroy() {
    document.removeEventListener('click', this.handleClickOutside);
  },

  methods: {
    handleLoginSuccess() {
      if (this.selectedStore > 0) {
        this.loadProducts();
      }
    },

    async loadProducts() {
      this.isLoading = true;
      try {
        const products = await this._productService.GetAll(this.selectedStore);
        this.products = this.sortProductsByDate(products);
        this.imageDimensions = {};
        products.forEach((p) => this.updateImageDimension(p));
        // Also load categories
        await this.loadCategories();
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        this.isLoading = false;
      }
    },

    async loadCategories() {
      this.loadingCategories = true;
      try {
        // First get basic category list
        const basicCategories = await this._categoryService.GetAll(this.selectedStore, true);

        // Then fetch each category with full details (including categoryProductListItems)
        const detailedCategories = await Promise.all(
          basicCategories.map(cat => this._categoryService.Get(cat.id, true))
        );

        this.categories = detailedCategories;
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        this.loadingCategories = false;
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

    async editProduct(product) {
      // Reset pending category changes
      this.pendingCategoryChanges = {};

      // Fetch full product details from server (includes productVariants)
      try {
        const fullProduct = await this._productService.Get(product.id);
        this.selectedProduct = JSON.parse(JSON.stringify(fullProduct));

        // Ensure productVariants is initialized
        if (!this.selectedProduct.productVariants) {
          this.selectedProduct.productVariants = [];
        }
      } catch (err) {
        console.error('Failed to load product details:', err);
        // Fallback to the product from the list
        this.selectedProduct = JSON.parse(JSON.stringify(product));
        if (!this.selectedProduct.productVariants) {
          this.selectedProduct.productVariants = [];
        }
      }

      // Store original category IDs for this product
      this.originalCategoryIds = this.categories
        .filter(cat => cat.categoryProductListItems?.some(
          item => item.productId === this.selectedProduct.id
        ))
        .map(cat => cat.id);
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

        // Save pending category changes
        await this.savePendingCategoryChanges();

        await this.loadProducts();
        this.productFilter = productData.name;
        this.pendingCategoryChanges = {};
        this.selectedProduct = null;
      } catch (err) {
        console.error("Failed to save product:", err);
        alert("Failed to save product");
      } finally {
        this.isSaving = false;
      }
    },

    async savePendingCategoryChanges() {
      const productId = this.selectedProduct.id;
      if (!productId || Object.keys(this.pendingCategoryChanges).length === 0) return;

      for (const [categoryId, change] of Object.entries(this.pendingCategoryChanges)) {
        // Fetch fresh category data to ensure we have latest items
        const freshCategory = await this._categoryService.Get(categoryId, true);
        if (!freshCategory) continue;

        const existingItems = (freshCategory.categoryProductListItems || []);

        let updatedItems;
        if (change.add) {
          // Check if product already exists (might have been added elsewhere)
          const alreadyExists = existingItems.some(item => item.productId === productId);
          if (alreadyExists) continue;

          // Add product to category at the end
          const newItem = {
            productId: productId,
            categoryId: categoryId,
            orderIndex: existingItems.length,
            isHeading: false
          };
          updatedItems = [...existingItems, newItem];
        } else {
          // Remove product from category
          updatedItems = existingItems.filter(
            item => item.productId !== productId
          );
        }

        // Update order indexes
        const itemsToSend = updatedItems.map((item, index) => ({
          ...item,
          orderIndex: index
        }));

        await this._categoryService.CreateOrUpdateCategoryProductList(
          categoryId,
          itemsToSend
        );
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
      this.newProductName = '';
      this.showNewProductModal = true;
      this.$nextTick(() => {
        this.$refs.newProductNameInput?.focus();
      });
    },

    closeNewProductModal() {
      this.showNewProductModal = false;
      this.newProductName = '';
      this.isCreatingProduct = false;
    },

    async confirmNewProduct() {
      if (!this.newProductName.trim() || this.isCreatingProduct) return;

      this.isCreatingProduct = true;
      try {
        // Create the product with just the name
        const newProduct = {
          name: this.newProductName.trim(),
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
          productVariants: []
        };

        // Save to backend
        const created = await this._productService.CreateOrUpdate(newProduct);

        // Close modal
        this.closeNewProductModal();

        // Reload products
        await this.loadProducts();

        // Open the newly created product in editor
        this.editProduct(created);
      } catch (err) {
        console.error("Failed to create product:", err);
        alert("Kunne ikke opprette produkt");
        this.isCreatingProduct = false;
      }
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

    // Variant management methods
    async openVariantEditor() {
      const newVariant = await this.$refs.variantEditor.open(null);
      if (!newVariant) return;

      if (!this.selectedProduct.productVariants) {
        this.selectedProduct.productVariants = [];
      }
      this.selectedProduct.productVariants.push(newVariant);
      await this.saveVariants();
    },

    async editVariant(index) {
      const variant = this.selectedProduct.productVariants[index];
      const editedVariant = await this.$refs.variantEditor.open(variant);
      if (!editedVariant) return;

      this.$set(this.selectedProduct.productVariants, index, editedVariant);
      await this.saveVariants();
    },

    async removeVariant(index) {
      if (!confirm('Er du sikker på at du vil fjerne dette tilbehøret?')) {
        return;
      }
      this.selectedProduct.productVariants.splice(index, 1);
      await this.saveVariants();
    },

    formatOptionsPreview(options) {
      if (!options || options.length === 0) return 'Ingen alternativer';
      const names = options.map(o => o.name).filter(n => n);
      if (names.length === 0) return 'Ingen alternativer';
      if (names.length <= 3) return names.join(', ');
      return `${names.slice(0, 2).join(', ')}, +${names.length - 2} mer`;
    },

    async saveVariants() {
      if (!this.selectedProduct.id) {
        this.showToast('Lagre produktet først', 'error');
        return;
      }

      try {
        // Assign order indexes
        this.selectedProduct.productVariants.forEach((variant, index) => {
          variant.orderIndex = index;
        });

        await this._productVariantService.CreateOrUpdate(
          this.selectedProduct.id,
          this.selectedProduct.productVariants
        );

        this.showToast('Varianter lagret!');

        // Reload the product from the server to get updated variants with IDs
        const updatedProduct = await this._productService.Get(this.selectedProduct.id);

        if (updatedProduct && updatedProduct.productVariants) {
          // Update selectedProduct with fresh data from server
          this.$set(this.selectedProduct, 'productVariants', updatedProduct.productVariants);

          // Update the product in the products list as well
          const productIndex = this.products.findIndex(p => p.id === this.selectedProduct.id);
          if (productIndex !== -1) {
            this.$set(this.products[productIndex], 'productVariants', updatedProduct.productVariants);
          }
        }
      } catch (err) {
        console.error('Failed to save variants:', err);
        this.showToast('Kunne ikke lagre varianter. Vennligst prøv igjen.', 'error');
      }
    },

    showToast(message, type = 'success') {
      this.toast = { show: true, message, type };
      setTimeout(() => {
        this.toast.show = false;
      }, 3000);
    },

    handleClickOutside(e) {
      if (this.categoryDropdownOpen && !e.target.closest('.multi-select-dropdown')) {
        this.categoryDropdownOpen = false;
      }
    },

    toggleCategory(category) {
      if (!this.selectedProduct?.id) return;

      const isCurrentlySelected = this.selectedProductCategoryIds.includes(category.id);
      const wasOriginallyInCategory = this.originalCategoryIds.includes(category.id);

      if (isCurrentlySelected) {
        // User wants to remove from category
        if (wasOriginallyInCategory) {
          // Was in category, mark for removal
          this.$set(this.pendingCategoryChanges, category.id, { add: false });
        } else {
          // Was added in this session, just remove the pending add
          this.$delete(this.pendingCategoryChanges, category.id);
        }
      } else {
        // User wants to add to category
        if (wasOriginallyInCategory) {
          // Was originally in category, just remove the pending removal
          this.$delete(this.pendingCategoryChanges, category.id);
        } else {
          // New addition
          this.$set(this.pendingCategoryChanges, category.id, { add: true });
        }
      }
    },
  },
};
</script>

<style lang="scss">
.products-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  padding-top: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  @media (min-width: 769px) {
    &.editor-open {
      margin-right: 500px;
      max-width: calc(100% - 500px);
    }
  }

  @media (max-width: 768px) {
    padding: 16px;
    &.editor-open {
      overflow: hidden;
      height: 100vh;
    }
  }
}

.page-header {
  margin-bottom: 32px;

  h1 {
    font-size: 2em;
    font-weight: 600;
    color: #292c34;
    margin: 0 0 8px 0;

    @media (max-width: 768px) {
      font-size: 1.5em;
    }
  }

  p {
    color: #64748b;
    margin: 0;
    font-size: 0.95em;
  }
}

.controls-section {
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  margin-bottom: 32px;

  @media (max-width: 768px) {
    padding: 16px;
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
    content: "𝍬";
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 20px;
  margin-bottom: 32px;

  @media (max-width: 480px) {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 16px;
  }
}

.product-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  width: 100%;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
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
  }

  &.dragging {
    border-color: #3b82f6;
    background-color: #f0f9ff;
    border-width: 3px;
  }

  .dimension-tag {
    position: absolute;
    bottom: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 4px 10px;
    font-size: 0.7em;
    font-weight: 600;
    z-index: 1;
    border-top-left-radius: 8px;
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
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.15);
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
    padding: 24px;
    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
    border-bottom: 2px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);

    h2 {
      margin: 0;
      font-size: 1.5em;
      font-weight: 600;
      color: #292c34;
    }

    .close-btn {
      background: #f8f9fa;
      border: 2px solid #e2e8f0;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 0.5rem;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;

      &:hover {
        background: #f1f5f9;
        border-color: #cbd5e0;
        transform: rotate(90deg);
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
    padding: 20px 24px;
    border-top: 2px solid #e2e8f0;
    display: flex;
    gap: 12px;
    box-shadow: 0 -4px 8px rgba(0, 0, 0, 0.05);

    button {
      padding: 14px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.875rem;
      transition: all 0.3s ease;
      flex: 1;
    }

    .delete-btn {
      background: white;
      color: #ef4444;
      border: 2px solid #ef4444;
      padding: 14px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.875rem;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &:not(:disabled):hover {
        background: #ef4444;
        color: white;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
      }
    }
  }
}

.edit-btn {
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: white;
  color: #334155;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-left: auto;
  margin-right: auto;
  min-width: 80px;
  transition: all 0.3s ease;

  &:hover {
    background: #f8fafc;
    border-color: #cbd5e0;
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
      border-color: #94a3b8;
      box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.1);
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
  margin-bottom: 24px;

  label {
    display: block;
    margin-bottom: 8px;
    font-size: 0.85em;
    font-weight: 600;
    color: #292c34;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  input[type="text"],
  input[type="number"],
  textarea {
    width: 100%;
    padding: 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    font-size: 0.95em;
    color: #292c34;
    transition: all 0.3s ease;

    &:hover {
      border-color: #cbd5e0;
    }

    &:focus {
      outline: none;
      border-color: #94a3b8;
      box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.1);
      background: #ffffff;
    }

    &::placeholder {
      color: #94a3b8;
    }
  }

  textarea {
    resize: vertical;
    min-height: 100px;
  }
}

// Checkbox styling
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  margin-bottom: 16px;
  transition: all 0.3s ease;

  &:hover {
    background: #f1f5f9;
  }

  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid #cbd5e0;
    cursor: pointer;
    transition: all 0.3s ease;

    &:checked {
      background-color: #334155;
      border-color: #334155;
    }

    &:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(51, 65, 85, 0.1);
    }
  }

  span {
    font-weight: 500;
    color: #292c34;
  }
}

// Button styling
.save-btn {
  background: #334155;
  color: white;
  border: none;
  padding: 14px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95em;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  &:disabled {
    background: #cbd5e0;
    box-shadow: none;
    cursor: not-allowed;
    opacity: 0.6;
  }

  &:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
}

.cancel-btn,
.pagination-btn {
  background: white;
  color: #292c34;
  border: 2px solid #e2e8f0;
  padding: 14px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: #f8f9fa;
    border-color: #cbd5e0;
    transform: translateY(-1px);
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

.empty-state {
  text-align: center;
  padding: 64px 24px;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  margin: 32px 0;

  .material-icons {
    font-size: 4em;
    color: #cbd5e0;
    margin-bottom: 16px;
  }

  h3 {
    font-size: 1.5em;
    color: #292c34;
    margin-bottom: 8px;
    font-weight: 600;
  }

  p {
    color: #64748b;
    margin-bottom: 24px;
    font-size: 0.95em;
  }

  .create-first-btn {
    background: #334155;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    border: none;
    font-weight: 600;
    font-size: 0.95em;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

    &:hover {
      background: #1e293b;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
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
    transition: all 0.3s ease;

    &:hover {
      background: #1e293b;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
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

// Variants section styling
.variants-section {
  border-top: 2px solid #e2e8f0;
  padding-top: 24px;
  margin-top: 32px;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.section-header-inline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;

  label {
    margin-bottom: 0 !important;
  }
}

.btn-add-variant {
  background: white;
  color: #334155;
  border: 1px solid #e2e8f0;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  transition: all 0.3s ease;

  &:hover {
    background: #f8fafc;
    border-color: #cbd5e0;
  }

  i {
    font-size: 0.625rem;
  }
}

.variants-list-compact {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.variant-item-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: #cbd5e0;
    background: #f1f5f9;
  }
}

.variant-info-compact {
  flex: 1;
  min-width: 0;
}

.variant-name-compact {
  font-weight: 600;
  color: #1e293b;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.variant-meta-compact {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.badge-compact {
  padding: 4px 10px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 6px;
  font-size: 0.75em;
  font-weight: 600;
  flex-shrink: 0;
}

.badge-required-compact {
  background: #fef3c7;
  color: #92400e;
}

.variant-options-preview-compact {
  font-size: 0.75rem;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-btn-variant {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.375rem;
  display: flex;
  align-items: center;
  color: #94a3b8;
  border-radius: 0.375rem;
  flex-shrink: 0;
  transition: all 0.3s ease;

  &:hover {
    background: #fee2e2;
    color: #ef4444;
    transform: scale(1.1);
  }

  i {
    font-size: 0.875rem;
  }
}

.empty-hint-compact {
  padding: 32px 16px;
  text-align: center;
  color: #64748b;
  font-size: 0.875rem;
  background: #f8f9fa;
  border-radius: 10px;
  border: 2px dashed #cbd5e0;
}

// Categories multi-select dropdown
.categories-section {
  margin-top: 24px;
}

.multi-select-dropdown {
  position: relative;

  .dropdown-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      border-color: #cbd5e0;
    }

    .placeholder {
      color: #94a3b8;
    }

    .selected-names {
      color: #292c34;
      font-weight: 500;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dropdown-arrow {
      color: #94a3b8;
      transition: transform 0.2s;
    }
  }

  &.open .dropdown-trigger {
    border-color: #94a3b8;

    .dropdown-arrow {
      transform: rotate(180deg);
    }
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 100;
    max-height: 250px;
    overflow-y: auto;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #f8f9fa;
    }

    &.selected {
      background: #f1f5f9;
    }

    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    span {
      color: #292c34;
      font-size: 0.95em;
    }
  }

  .dropdown-empty {
    padding: 16px;
    text-align: center;
    color: #94a3b8;
    font-size: 0.9em;
  }
}

// Toast notification styling
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  font-weight: 500;

  &.success {
    background: #10b981;
    color: #fff;
  }

  &.error {
    background: #ef4444;
    color: #fff;
  }

  .material-icons {
    font-size: 20px;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

// New Product Modal
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.new-product-modal {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);

  h3 {
    font-size: 1.25em;
    font-weight: 600;
    color: #292c34;
    margin: 0 0 8px 0;
  }

  .modal-description {
    color: #64748b;
    font-size: 0.9em;
    margin: 0 0 20px 0;
  }

  .modal-input {
    width: 100%;
    padding: 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 1em;
    color: #292c34;
    transition: all 0.3s ease;

    &:focus {
      outline: none;
      border-color: #1bb776;
      box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
    }

    &::placeholder {
      color: #94a3b8;
    }
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    margin-top: 20px;
    justify-content: flex-end;
  }

  .modal-btn-secondary {
    padding: 10px 20px;
    background: white;
    color: #292c34;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: #f8f9fa;
      border-color: #cbd5e0;
    }
  }

  .modal-btn-primary {
    padding: 10px 20px;
    background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4);
    }

    &:disabled {
      background: #cbd5e0;
      box-shadow: none;
      cursor: not-allowed;
    }
  }
}
</style>

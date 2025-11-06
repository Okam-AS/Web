<template>
  <AdminPage>
    <div class="category-editor-page">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" @click="goBack">
          <span class="material-icons">arrow_back</span>
          Tilbake
        </button>

        <div class="header-actions">
          <button
            v-if="!isNewCategory"
            class="btn btn-danger"
            @click="deleteCategory"
          >
            <span class="material-icons">delete</span>
            Slett kategori
          </button>
          <button
            v-if="hasChanges"
            class="btn btn-primary"
            @click="saveCategory"
            :disabled="isSaving"
          >
            <span class="material-icons">{{ isSaving ? 'refresh' : 'save' }}</span>
            {{ isSaving ? 'Lagrer...' : 'Lagre endringer' }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading-container">
        <span class="material-icons spinning">refresh</span>
        <p>Laster kategori...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-container">
        <span class="material-icons">error</span>
        <p>{{ error }}</p>
        <button class="btn btn-secondary" @click="goBack">
          Gå tilbake
        </button>
      </div>

      <!-- Editor Content -->
      <div v-else class="editor-content">
        <!-- Basic Info Section -->
        <div class="editor-section">
          <h2>Grunnleggende informasjon</h2>

          <div class="form-group">
            <label>Kategorinavn *</label>
            <input
              v-model="category.name"
              type="text"
              placeholder="F.eks. Pizza, Drikke, etc."
              class="form-input"
              @input="markAsChanged"
            />
          </div>

          <!-- Category Image -->
          <div class="form-group">
            <label>Kategoribilde *</label>
            <p class="field-hint">Bildet beskjæres automatisk til 500x500px</p>

            <div
              class="image-upload-area"
              :class="{ dragging: isDragging, uploading: isUploadingImage }"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleImageDrop"
              @click="triggerFileInput"
            >
              <input
                ref="fileInput"
                type="file"
                accept="image/jpeg,image/png"
                class="hidden-file-input"
                @change="handleFileSelect"
              />

              <!-- Upload Overlay -->
              <div v-if="isUploadingImage" class="upload-overlay">
                <span class="material-icons spinning">refresh</span>
                <p>Laster opp...</p>
              </div>

              <!-- Image Preview -->
              <img
                v-if="category.image && category.image.imageUrl"
                :src="category.image.imageUrl"
                alt="Category image"
                class="image-preview"
              />

              <!-- Placeholder -->
              <div v-else class="image-placeholder">
                <span class="material-icons">add_photo_alternate</span>
                <p>Klikk eller slipp bilde her</p>
                <p class="hint">JPG eller PNG, maks 5MB</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Products Section -->
        <div class="editor-section">
          <div class="section-header">
            <h2>Produkter</h2>
            <div class="section-actions">
              <button class="btn btn-secondary" @click="addHeading">
                <span class="material-icons">title</span>
                Legg til overskrift
              </button>
              <button class="btn btn-primary" @click="openProductSelector">
                <span class="material-icons">add</span>
                Velg produkter
              </button>
            </div>
          </div>

          <p class="section-description">
            {{ category.categoryProductListItems.length }} produkt{{ category.categoryProductListItems.length !== 1 ? 'er' : '' }} i denne kategorien
          </p>

          <CategoryProductList
            :items="category.categoryProductListItems"
            @reorder="handleProductsReorder"
            @delete="handleProductDelete"
          />
        </div>

        <!-- Accessories Section -->
        <div class="editor-section">
          <div class="section-header">
            <h2>Felles tilbehør (Valgfritt)</h2>
            <button class="btn btn-primary" @click="openVariantSelector">
              <span class="material-icons">add</span>
              Legg til tilbehør
            </button>
          </div>

          <p class="section-description">
            Varianter som vises på alle produkter i denne kategorien
          </p>

          <div v-if="category.productVariants && category.productVariants.length > 0" class="variants-list">
            <div
              v-for="(variant, index) in category.productVariants"
              :key="variant.id || index"
              class="variant-item"
              draggable="true"
              @dragstart="handleVariantDragStart($event, index)"
              @dragover.prevent
              @drop.prevent="handleVariantDrop($event, index)"
            >
              <span class="material-icons drag-handle">drag_indicator</span>
              <div class="variant-info">
                <div class="variant-name">{{ variant.name }}</div>
                <div class="variant-meta">
                  <span v-if="variant.multiselect" class="badge">Flervalg</span>
                  <span v-if="variant.required" class="badge">Obligatorisk</span>
                  <span class="option-count">
                    {{ variant.options ? variant.options.length : 0 }} alternativ
                  </span>
                </div>
              </div>
              <button class="delete-btn-small" @click="removeVariant(index)">
                <span class="material-icons">close</span>
              </button>
            </div>
          </div>
          <div v-else class="empty-hint">
            Ingen felles tilbehør lagt til
          </div>
        </div>

        <!-- Visibility Settings -->
        <div class="editor-section">
          <h2>Synlighet</h2>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                v-model="category.hide"
                type="checkbox"
                @change="markAsChanged"
              />
              <span>Skjul kategori</span>
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                v-model="category.soldOut"
                type="checkbox"
                @change="markAsChanged"
              />
              <span>Utsolgt</span>
            </label>
          </div>

          <div class="form-group">
            <label>Skjul fra leveringstyper</label>
            <div class="delivery-types">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  :checked="isHiddenFromDeliveryType('SelfPickup')"
                  @change="toggleDeliveryType('SelfPickup')"
                />
                <span>Hent selv</span>
              </label>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  :checked="isHiddenFromDeliveryType('TableDelivery')"
                  @change="toggleDeliveryType('TableDelivery')"
                />
                <span>Spis inne</span>
              </label>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  :checked="isHiddenFromHomeDelivery"
                  @change="toggleHomeDelivery"
                />
                <span>Hjemlevering</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Publishing Schedule -->
        <div class="editor-section">
          <h2>Publiseringsplan (Valgfritt)</h2>
          <p class="section-description">
            Sett når kategorien skal være synlig for kunder
          </p>

          <div class="form-row">
            <div class="form-group">
              <label>Start publisering</label>
              <input
                v-model="category.startPublish"
                type="datetime-local"
                class="form-input"
                @change="markAsChanged"
              />
            </div>

            <div class="form-group">
              <label>Stopp publisering</label>
              <input
                v-model="category.stopPublish"
                type="datetime-local"
                class="form-input"
                @change="markAsChanged"
              />
            </div>
          </div>
        </div>

        <!-- Advanced Publishing Rules -->
        <div class="editor-section">
          <PublishingRuleEditor
            :rules.sync="category.publishRules"
            @update:rules="markAsChanged"
          />
        </div>
      </div>

      <!-- Modals -->
      <ProductSelectorModal
        ref="productSelector"
        :defaultSelectedProductIds="[]"
      />

      <VariantSelectorModal
        ref="variantSelector"
        :categoryId="categoryId"
        :defaultSelectedVariantIds="[]"
      />
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue'
import ProductSelectorModal from '~/components/admin/ProductSelectorModal.vue'
import VariantSelectorModal from '~/components/admin/VariantSelectorModal.vue'
import CategoryProductList from '~/components/admin/CategoryProductList.vue'
import PublishingRuleEditor from '~/components/admin/PublishingRuleEditor.vue'
import axios from 'axios'
import $config from '~/core/helpers/configuration'

export default {
  components: {
    AdminPage,
    ProductSelectorModal,
    VariantSelectorModal,
    CategoryProductList,
    PublishingRuleEditor
  },

  data() {
    return {
      category: this.getEmptyCategory(),
      originalCategory: null,
      isLoading: false,
      isSaving: false,
      isUploadingImage: false,
      isDragging: false,
      error: null,
      hasChanges: false,
      draggedVariantIndex: null
    }
  },

  computed: {
    selectedStore() {
      return this.$store.state.selectedAdminStore
    },

    categoryId() {
      return this.$route.query.id
    },

    isNewCategory() {
      return !this.categoryId || this.categoryId === 'new'
    },

    isHiddenFromHomeDelivery() {
      if (!this.category.hideFromDeliveryTypes) return false
      const homeDeliveryTypes = ['InstantHomeDelivery', 'DineHomeDelivery', 'WoltDelivery']
      return homeDeliveryTypes.some(type => this.category.hideFromDeliveryTypes.includes(type))
    }
  },

  watch: {
    selectedStore(newVal) {
      if (newVal && !this.isNewCategory) {
        this.loadCategory()
      }
    }
  },

  mounted() {
    if (this.isNewCategory) {
      this.category = this.getEmptyCategory()
      this.originalCategory = JSON.stringify(this.category)
    } else if (this.selectedStore) {
      this.loadCategory()
    }
  },

  beforeRouteLeave(to, from, next) {
    if (this.hasChanges) {
      const answer = window.confirm(
        'Du har ulagrede endringer. Er du sikker på at du vil forlate siden?'
      )
      if (answer) {
        next()
      } else {
        next(false)
      }
    } else {
      next()
    }
  },

  methods: {
    getEmptyCategory() {
      return {
        id: null,
        name: '',
        storeId: this.selectedStore,
        orderIndex: 0,
        hide: false,
        soldOut: false,
        published: false,
        image: null,
        categoryProductListItems: [],
        productVariants: [],
        hideFromDeliveryTypes: [],
        publishRules: [],
        startPublish: null,
        stopPublish: null
      }
    },

    async loadCategory() {
      try {
        this.isLoading = true
        this.error = null

        const category = await this._categoryService.Get(this.categoryId, true)
        this.category = {
          ...category,
          publishRules: category.publishRules || [],
          hideFromDeliveryTypes: category.hideFromDeliveryTypes || [],
          categoryProductListItems: category.categoryProductListItems || [],
          productVariants: category.productVariants || []
        }

        this.originalCategory = JSON.stringify(this.category)
        this.hasChanges = false
      } catch (err) {
        console.error('Failed to load category:', err)
        this.error = 'Kunne ikke laste kategorien. Vennligst prøv igjen.'
      } finally {
        this.isLoading = false
      }
    },

    markAsChanged() {
      this.$nextTick(() => {
        const current = JSON.stringify(this.category)
        this.hasChanges = current !== this.originalCategory
      })
    },

    async saveCategory() {
      // Validation
      if (!this.category.name || this.category.name.trim() === '') {
        alert('Vennligst angi et kategorinavn')
        return
      }

      try {
        this.isSaving = true

        if (this.isNewCategory) {
          // Create new category
          this.category.storeId = this.selectedStore
          const created = await this._categoryService.Create(this.category)

          // Redirect to editor for the new category
          this.$router.replace({ query: { id: created.id } })
          this.category = created
          alert('Kategori opprettet!')
        } else {
          // Update existing category
          const updated = await this._categoryService.Update(this.category)
          this.category = updated
          alert('Kategori lagret!')
        }

        this.originalCategory = JSON.stringify(this.category)
        this.hasChanges = false
      } catch (err) {
        console.error('Failed to save category:', err)
        alert('Kunne ikke lagre kategorien. Vennligst prøv igjen.')
      } finally {
        this.isSaving = false
      }
    },

    async deleteCategory() {
      if (!confirm(`Er du sikker på at du vil slette kategorien "${this.category.name}"?`)) {
        return
      }

      try {
        await this._categoryService.Delete(this.categoryId)
        alert('Kategori slettet')
        this.$router.push('/admin/categories')
      } catch (err) {
        console.error('Failed to delete category:', err)
        alert('Kunne ikke slette kategorien. Vennligst prøv igjen.')
      }
    },

    goBack() {
      if (this.hasChanges) {
        if (!confirm('Du har ulagrede endringer. Er du sikker på at du vil gå tilbake?')) {
          return
        }
      }
      this.$router.push('/admin/categories')
    },

    // Image handling
    triggerFileInput() {
      this.$refs.fileInput.click()
    },

    handleFileSelect(event) {
      const file = event.target.files[0]
      if (!file) return

      const fakeDropEvent = { dataTransfer: { files: [file] } }
      this.handleImageDrop(fakeDropEvent)
      event.target.value = ''
    },

    async handleImageDrop(event) {
      this.isDragging = false
      const file = event.dataTransfer.files[0]

      if (!file.type.match(/image\/(jpeg|png)/)) {
        alert('Kun JPG og PNG filer er tillatt')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Filstørrelsen må være mindre enn 5MB')
        return
      }

      try {
        this.isUploadingImage = true
        const resizedBlob = await this.processImage(file)

        if (this.isNewCategory) {
          // For new categories, just store the blob to upload after creation
          alert('Lagre kategorien først før du laster opp bilde')
          return
        }

        await this.uploadImage(resizedBlob)
      } catch (error) {
        console.error('Failed to process/upload image:', error)
        alert('Kunne ikke laste opp bilde')
      } finally {
        this.isUploadingImage = false
      }
    },

    async processImage(file) {
      const objectUrl = URL.createObjectURL(file)
      const img = new Image()

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = objectUrl
      })

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      canvas.width = 500
      canvas.height = 500

      const size = Math.min(img.width, img.height)
      const startX = (img.width - size) / 2
      const startY = (img.height - size) / 2

      ctx.drawImage(img, startX, startY, size, size, 0, 0, 500, 500)

      URL.revokeObjectURL(objectUrl)

      return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    },

    async uploadImage(blob) {
      const formData = new FormData()
      formData.append('image', blob, 'image.jpg')
      formData.append('guidId', this.categoryId)

      try {
        await axios.post(
          `${$config.okamApiBaseUrl}/categories/${this.categoryId}/image`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${this.$store.state.currentUser.token}`
            }
          }
        )

        // Reload category to get updated image
        await this.loadCategory()
      } catch (error) {
        console.error('Error uploading image:', error)
        throw error
      }
    },

    // Product management
    async openProductSelector() {
      const existingProductIds = this.category.categoryProductListItems
        .filter(x => !x.isHeading)
        .map(x => x.productId)

      const pickedProductIds = await this.$refs.productSelector.open(existingProductIds)

      if (!pickedProductIds) return

      // Calculate diff
      const toRemove = existingProductIds.filter(id => !pickedProductIds.includes(id))
      const toAdd = pickedProductIds.filter(id => !existingProductIds.includes(id))

      // Remove deselected products
      toRemove.forEach(productId => {
        const index = this.category.categoryProductListItems.findIndex(
          x => x.productId === productId
        )
        if (index !== -1) {
          this.category.categoryProductListItems.splice(index, 1)
        }
      })

      // Add new products
      toAdd.forEach(productId => {
        this.category.categoryProductListItems.push({
          productId: productId,
          categoryId: this.categoryId || null
        })
      })

      await this.saveCategoryProductList()
    },

    async addHeading() {
      const text = prompt('Overskriftstekst (2-30 tegn):')
      if (!text || text.trim().length < 2 || text.trim().length > 30) {
        if (text !== null) {
          alert('Overskriften må være mellom 2 og 30 tegn')
        }
        return
      }

      this.category.categoryProductListItems.push({
        isHeading: true,
        heading: text.trim(),
        categoryId: this.categoryId || null
      })

      await this.saveCategoryProductList()
    },

    async handleProductsReorder(newOrder) {
      this.category.categoryProductListItems = newOrder
      await this.saveCategoryProductList()
    },

    async handleProductDelete(index) {
      this.category.categoryProductListItems.splice(index, 1)
      await this.saveCategoryProductList()
    },

    async saveCategoryProductList() {
      if (this.isNewCategory) {
        this.markAsChanged()
        return
      }

      try {
        // Assign order indexes
        this.category.categoryProductListItems.forEach((item, index) => {
          item.orderIndex = index
        })

        const updatedCategory = await this._categoryService.CreateOrUpdateCategoryProductList(
          this.categoryId,
          this.category.categoryProductListItems
        )

        this.category = updatedCategory
        this.originalCategory = JSON.stringify(this.category)
        this.hasChanges = false
      } catch (err) {
        console.error('Failed to save product list:', err)
        alert('Kunne ikke lagre produktlisten. Vennligst prøv igjen.')
        await this.loadCategory() // Rollback
      }
    },

    // Variant management
    async openVariantSelector() {
      const existingVariantIds = this.category.productVariants
        ? this.category.productVariants.map(v => v.id)
        : []

      const selectedVariants = await this.$refs.variantSelector.open(existingVariantIds)

      if (!selectedVariants) return

      this.category.productVariants = selectedVariants
      await this.saveVariants()
    },

    async saveVariants() {
      if (this.isNewCategory) {
        this.markAsChanged()
        return
      }

      try {
        // Assign order indexes
        this.category.productVariants.forEach((variant, index) => {
          variant.orderIndex = index
        })

        await this._categoryProductVariantService.CreateOrUpdate(
          this.categoryId,
          this.category.productVariants
        )

        alert('Tilbehør lagret!')
        await this.loadCategory()
      } catch (err) {
        console.error('Failed to save variants:', err)
        alert('Kunne ikke lagre tilbehør. Vennligst prøv igjen.')
        await this.loadCategory()
      }
    },

    removeVariant(index) {
      if (confirm('Er du sikker på at du vil fjerne dette tilbehøret?')) {
        this.category.productVariants.splice(index, 1)
        this.saveVariants()
      }
    },

    handleVariantDragStart(event, index) {
      this.draggedVariantIndex = index
      event.dataTransfer.effectAllowed = 'move'
    },

    async handleVariantDrop(event, index) {
      if (this.draggedVariantIndex === null || this.draggedVariantIndex === index) {
        return
      }

      const variants = [...this.category.productVariants]
      const draggedVariant = variants[this.draggedVariantIndex]

      variants.splice(this.draggedVariantIndex, 1)
      const insertIndex = this.draggedVariantIndex < index ? index - 1 : index
      variants.splice(insertIndex, 0, draggedVariant)

      this.category.productVariants = variants
      this.draggedVariantIndex = null

      await this.saveVariants()
    },

    // Delivery types
    isHiddenFromDeliveryType(type) {
      return this.category.hideFromDeliveryTypes &&
             this.category.hideFromDeliveryTypes.includes(type)
    },

    toggleDeliveryType(type) {
      if (!this.category.hideFromDeliveryTypes) {
        this.category.hideFromDeliveryTypes = []
      }

      const index = this.category.hideFromDeliveryTypes.indexOf(type)
      if (index === -1) {
        this.category.hideFromDeliveryTypes.push(type)
      } else {
        this.category.hideFromDeliveryTypes.splice(index, 1)
      }

      this.markAsChanged()
    },

    toggleHomeDelivery() {
      const homeDeliveryTypes = ['InstantHomeDelivery', 'DineHomeDelivery', 'WoltDelivery']

      if (!this.category.hideFromDeliveryTypes) {
        this.category.hideFromDeliveryTypes = []
      }

      if (this.isHiddenFromHomeDelivery) {
        // Remove all home delivery types
        this.category.hideFromDeliveryTypes = this.category.hideFromDeliveryTypes.filter(
          type => !homeDeliveryTypes.includes(type)
        )
      } else {
        // Add all home delivery types
        homeDeliveryTypes.forEach(type => {
          if (!this.category.hideFromDeliveryTypes.includes(type)) {
            this.category.hideFromDeliveryTypes.push(type)
          }
        })
      }

      this.markAsChanged()
    }
  }
}
</script>

<style lang="scss" scoped>
.category-editor-page {
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: #0066cc;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background 0.2s;

  &:hover {
    background: #f3f4f6;
  }

  .material-icons {
    font-size: 20px;
  }
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .material-icons {
    font-size: 20px;

    &.spinning {
      animation: spin 1s linear infinite;
    }
  }
}

.btn-primary {
  background: #0066cc;
  color: #fff;

  &:hover:not(:disabled) {
    background: #0052a3;
  }
}

.btn-secondary {
  background: #f3f4f6;
  color: #4b5563;

  &:hover {
    background: #e5e7eb;
  }
}

.btn-danger {
  background: #ef4444;
  color: #fff;

  &:hover {
    background: #dc2626;
  }
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;

  .material-icons {
    font-size: 64px;
    margin-bottom: 16px;
  }

  p {
    margin: 0 0 16px 0;
    font-size: 1.1em;
  }
}

.loading-container {
  .material-icons {
    color: #0066cc;

    &.spinning {
      animation: spin 1s linear infinite;
    }
  }
}

.error-container {
  .material-icons {
    color: #ef4444;
  }
}

.editor-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.editor-section {
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);

  h2 {
    margin: 0 0 16px 0;
    font-size: 1.3em;
    font-weight: 600;
    color: #292c34;
  }
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;

  h2 {
    margin: 0;
  }

  .section-actions {
    display: flex;
    gap: 8px;
  }
}

.section-description {
  margin: 0 0 16px 0;
  color: #6b7280;
  font-size: 0.95em;
}

.form-group {
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }

  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #374151;
    font-size: 0.95em;
  }
}

.field-hint {
  margin: 4px 0 8px 0;
  font-size: 0.9em;
  color: #6b7280;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1em;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #0066cc;
  }
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 500;
  color: #374151;

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
}

.delivery-types {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.image-upload-area {
  position: relative;
  width: 100%;
  max-width: 400px;
  height: 400px;
  border: 3px dashed #d1d5db;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #0066cc;
    background: #f9fafb;
  }

  &.dragging {
    border-color: #0066cc;
    background: rgba(0, 102, 204, 0.05);
  }

  &.uploading {
    pointer-events: none;
  }
}

.hidden-file-input {
  display: none;
}

.upload-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;

  .material-icons {
    font-size: 48px;
    color: #0066cc;
    margin-bottom: 12px;

    &.spinning {
      animation: spin 1s linear infinite;
    }
  }

  p {
    margin: 0;
    color: #6b7280;
  }
}

.image-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;

  .material-icons {
    font-size: 64px;
    margin-bottom: 12px;
  }

  p {
    margin: 4px 0;
    font-size: 1em;

    &.hint {
      font-size: 0.9em;
      color: #adb5bd;
    }
  }
}

.variants-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.variant-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: move;

  &:hover {
    border-color: #d1d5db;
  }

  .drag-handle {
    color: #9ca3af;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  .variant-info {
    flex: 1;

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
      }

      .option-count {
        font-size: 0.9em;
        color: #6b7280;
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
    color: #ef4444;
    border-radius: 4px;

    &:hover {
      background: #fee2e2;
    }

    .material-icons {
      font-size: 20px;
    }
  }
}

.empty-hint {
  padding: 20px;
  text-align: center;
  color: #9ca3af;
  font-size: 0.95em;
  background: #f9fafb;
  border-radius: 8px;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>

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
            class="btn btn-primary"
            @click="saveCategory"
            :disabled="isSaving || !hasChanges"
          >
            <Loading v-if="isSaving" :loading="true" :size="20" />
            <span v-else class="material-icons">save</span>
            {{ isSaving ? 'Lagrer...' : 'Lagre endringer' }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading-container">
        <Loading :loading="true" :size="48" />
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
                <Loading :loading="true" :size="48" />
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
              <button class="btn btn-secondary" @click="addHeading" :disabled="isNewCategory">
                <span class="material-icons">title</span>
                Legg til overskrift
              </button>
              <button class="btn btn-primary" @click="openProductSelector" :disabled="isNewCategory">
                <span class="material-icons">add</span>
                Velg produkter
              </button>
            </div>
          </div>

          <p class="section-description">
            <template v-if="isNewCategory">
              Lagre kategorien først for å legge til produkter
            </template>
            <template v-else>
              {{ category.categoryProductListItems.length }} produkt{{ category.categoryProductListItems.length !== 1 ? 'er' : '' }} i denne kategorien
              <span v-if="isSavingProducts" class="saving-indicator">
                <Loading :loading="true" :size="16" />
                Lagrer...
              </span>
            </template>
          </p>

          <CategoryProductList
            :items="category.categoryProductListItems"
            :currentStoreId="selectedStore"
            @reorder="handleProductsReorder"
            @delete="handleProductDelete"
          />
        </div>

        <!-- Accessories Section -->
        <div class="editor-section">
          <div class="section-header">
            <h2>Felles tilbehør (Valgfritt)</h2>
            <button class="btn btn-primary" @click="openVariantEditor" :disabled="isNewCategory">
              <span class="material-icons">add</span>
              Legg til tilbehør
            </button>
          </div>

          <p class="section-description">
            <template v-if="isNewCategory">
              Lagre kategorien først for å legge til tilbehør
            </template>
            <template v-else>
              Varianter som vises på alle produkter i denne kategorien. Klikk for å redigere.
            </template>
          </p>

          <draggable
            v-if="category.productVariants && category.productVariants.length > 0"
            v-model="category.productVariants"
            class="variants-list"
            handle=".drag-handle"
            animation="200"
            ghost-class="variant-ghost"
            @end="handleVariantReorder"
          >
            <div
              v-for="(variant, index) in category.productVariants"
              :key="variant.id || index"
              class="variant-item clickable"
              @click="editVariant(index)"
            >
              <span class="material-icons drag-handle">drag_indicator</span>
              <div class="variant-info">
                <div class="variant-name">{{ variant.name }}</div>
                <div class="variant-meta">
                  <span v-if="variant.multiselect" class="badge">Flervalg</span>
                  <span v-if="variant.required" class="badge badge-required">Obligatorisk</span>
                  <span class="variant-options-preview">
                    {{ formatOptionsPreview(variant.options) }}
                  </span>
                </div>
              </div>
              <button class="delete-btn-small" @click.stop="removeVariant(index)">
                <span class="material-icons">close</span>
              </button>
            </div>
          </draggable>
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
              <div class="datetime-input-wrapper" @click="$refs.startPublishInput.showPicker ? $refs.startPublishInput.showPicker() : $refs.startPublishInput.focus()">
                <input
                  ref="startPublishInput"
                  v-model="category.startPublish"
                  type="datetime-local"
                  class="form-input"
                  @change="markAsChanged"
                />
                <button
                  v-if="category.startPublish"
                  type="button"
                  class="clear-datetime-btn"
                  @click.stop="clearStartPublish"
                  title="Fjern dato"
                >
                  <span class="material-icons">close</span>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>Stopp publisering</label>
              <div class="datetime-input-wrapper" @click="$refs.stopPublishInput.showPicker ? $refs.stopPublishInput.showPicker() : $refs.stopPublishInput.focus()">
                <input
                  ref="stopPublishInput"
                  v-model="category.stopPublish"
                  type="datetime-local"
                  class="form-input"
                  @change="markAsChanged"
                />
                <button
                  v-if="category.stopPublish"
                  type="button"
                  class="clear-datetime-btn"
                  @click.stop="clearStopPublish"
                  title="Fjern dato"
                >
                  <span class="material-icons">close</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Advanced Publishing Rules -->
        <PublishingRuleEditor
          :rules="category.publishRules"
          @update:rules="updatePublishRules"
        />
      </div>

      <!-- Modals -->
      <ProductSelectorModal
        ref="productSelector"
        :defaultSelectedProductIds="[]"
      />

      <VariantEditorModal ref="variantEditor" />

      <!-- Toast notification -->
      <transition name="toast">
        <div v-if="toast.show" class="toast" :class="toast.type">
          <span class="material-icons">{{ toast.type === 'success' ? 'check_circle' : 'error' }}</span>
          <span>{{ toast.message }}</span>
        </div>
      </transition>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue'
import ProductSelectorModal from '~/components/admin/ProductSelectorModal.vue'
import VariantEditorModal from '~/components/admin/VariantEditorModal.vue'
import CategoryProductList from '~/components/admin/CategoryProductList.vue'
import PublishingRuleEditor from '~/components/admin/PublishingRuleEditor.vue'
import Loading from '~/components/atoms/Loading.vue'
import draggable from 'vuedraggable'
import axios from 'axios'
import $config from '~/core/helpers/configuration'

export default {
  components: {
    AdminPage,
    ProductSelectorModal,
    VariantEditorModal,
    CategoryProductList,
    PublishingRuleEditor,
    Loading,
    draggable
  },

  data() {
    return {
      category: {
        id: null,
        name: '',
        storeId: null,
        orderIndex: 0,
        hide: false,
        soldOut: false,
        published: false,
        image: null,
        categoryProductListItems: [],
        productVariants: [],
        hideFromDeliveryTypes: [],
        publishRules: [],
        handlePublishRules: true,
        startPublish: null,
        stopPublish: null
      },
      isLoading: false,
      isSaving: false,
      isUploadingImage: false,
      isDragging: false,
      error: null,
      hasChanges: false,
      isSavingProducts: false,
      saveProductsDebounceTimer: null,
      toast: {
        show: false,
        message: '',
        type: 'success'
      }
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
    selectedStore: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          if (this.isNewCategory) {
            this.category.storeId = newVal
            this.hasChanges = false
          } else if (this.categoryId) {
            this.loadCategory()
          }
        }
      }
    }
  },

  mounted() {
    // Validation is now handled by the selectedStore watcher with immediate: true
    // This ensures we wait for selectedStore to be available before loading
    if (!this.categoryId && !this.isNewCategory) {
      this.error = 'Ingen kategori-ID funnet i URL'
    }
  },

  beforeRouteLeave(_, __, next) {
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
    // Format datetime for datetime-local input (yyyy-MM-ddThh:mm)
    formatDateTimeLocal(dateTimeString) {
      if (!dateTimeString) return null
      // Remove microseconds and timezone info, keep only yyyy-MM-ddTHH:mm:ss
      const formatted = dateTimeString.substring(0, 19)
      return formatted
    },

    async loadCategory() {
      // Prevent duplicate loads
      if (this.isLoading) return
      // Don't reload if already loaded the same category
      if (this.category.id === this.categoryId) return

      try {
        this.isLoading = true
        this.error = null

        const category = await this._categoryService.Get(this.categoryId, true)

        // Freeze product data to prevent deep reactivity (improves performance)
        const items = (category.categoryProductListItems || []).map(item => {
          if (item.product) {
            item.product = Object.freeze(item.product)
          }
          return item
        })

        this.category = {
          ...category,
          publishRules: category.publishRules || [],
          handlePublishRules: true,
          hideFromDeliveryTypes: category.hideFromDeliveryTypes || [],
          categoryProductListItems: items,
          productVariants: category.productVariants || [],
          // Format datetime values for datetime-local inputs
          startPublish: this.formatDateTimeLocal(category.startPublish),
          stopPublish: this.formatDateTimeLocal(category.stopPublish)
        }

        this.hasChanges = false
      } catch (err) {
        console.error('Failed to load category:', err)
        this.error = 'Kunne ikke laste kategorien. Vennligst prøv igjen.'
      } finally {
        this.isLoading = false
      }
    },

    markAsChanged() {
      this.hasChanges = true
    },

    async saveCategory() {
      // Validation
      if (!this.category.name || this.category.name.trim() === '') {
        this.showToast('Vennligst angi et kategorinavn', 'error')
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
          this.category.id = created.id
          this.showToast('Kategori opprettet!')
        } else {
          // Update existing category - don't replace the whole object
          await this._categoryService.Update(this.category)
          this.showToast('Kategori lagret!')
        }

        this.hasChanges = false
      } catch (err) {
        console.error('Failed to save category:', err)
        this.showToast('Kunne ikke lagre kategorien. Vennligst prøv igjen.', 'error')
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
        this.showToast('Kategori slettet')
        this.$router.push('/admin/categories')
      } catch (err) {
        console.error('Failed to delete category:', err)
        this.showToast('Kunne ikke slette kategorien. Vennligst prøv igjen.', 'error')
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
        this.showToast('Kun JPG og PNG filer er tillatt', 'error')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        this.showToast('Filstørrelsen må være mindre enn 5MB', 'error')
        return
      }

      try {
        this.isUploadingImage = true
        const resizedBlob = await this.processImage(file)

        if (this.isNewCategory) {
          // For new categories, just store the blob to upload after creation
          this.showToast('Lagre kategorien først før du laster opp bilde', 'error')
          return
        }

        await this.uploadImage(resizedBlob)
      } catch (error) {
        console.error('Failed to process/upload image:', error)
        this.showToast('Kunne ikke laste opp bilde', 'error')
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

      // If no changes, just return without saving
      if (toRemove.length === 0 && toAdd.length === 0) {
        return
      }

      // Remove deselected products
      toRemove.forEach(productId => {
        const index = this.category.categoryProductListItems.findIndex(
          x => x.productId === productId
        )
        if (index !== -1) {
          this.category.categoryProductListItems.splice(index, 1)
        }
      })

      // Add new products (without product data for now)
      toAdd.forEach(productId => {
        this.category.categoryProductListItems.push({
          productId: productId,
          categoryId: this.categoryId || null
        })
      })

      await this.saveCategoryProductList()

      // Reload category to get full product data from backend
      await this.loadCategory()
    },

    async addHeading() {
      const text = prompt('Overskriftstekst (2-30 tegn):')
      if (!text || text.trim().length < 2 || text.trim().length > 30) {
        if (text !== null) {
          this.showToast('Overskriften må være mellom 2 og 30 tegn', 'error')
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

    handleProductsReorder(newOrder) {
      // Use Vue.set or spread to ensure reactivity
      this.$set(this.category, 'categoryProductListItems', [...newOrder])
      this.debouncedSaveProductList()
    },

    debouncedSaveProductList() {
      if (this.saveProductsDebounceTimer) {
        clearTimeout(this.saveProductsDebounceTimer)
      }
      this.saveProductsDebounceTimer = setTimeout(() => {
        this.saveCategoryProductList()
      }, 300)
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

      if (this.isSavingProducts) return

      try {
        this.isSavingProducts = true

        // Assign order indexes
        this.category.categoryProductListItems.forEach((item, index) => {
          item.orderIndex = index
        })

        // Just send the update, don't replace the whole category
        await this._categoryService.CreateOrUpdateCategoryProductList(
          this.categoryId,
          this.category.categoryProductListItems
        )

        this.hasChanges = false
        this.showToast('Produktliste lagret!')
      } catch (err) {
        console.error('Failed to save product list:', err)
        this.showToast('Kunne ikke lagre produktlisten. Vennligst prøv igjen.', 'error')
      } finally {
        this.isSavingProducts = false
      }
    },

    // Variant management
    async openVariantEditor() {
      const newVariant = await this.$refs.variantEditor.open(null)
      if (!newVariant) return

      if (!this.category.productVariants) {
        this.category.productVariants = []
      }
      this.category.productVariants.push(newVariant)
      await this.saveVariants()
    },

    async editVariant(index) {
      const variant = this.category.productVariants[index]
      const editedVariant = await this.$refs.variantEditor.open(variant)
      if (!editedVariant) return

      this.$set(this.category.productVariants, index, editedVariant)
      await this.saveVariants()
    },

    formatOptionsPreview(options) {
      if (!options || options.length === 0) return 'Ingen alternativer'
      const names = options.map(o => o.name).filter(n => n)
      if (names.length === 0) return 'Ingen alternativer'
      if (names.length <= 3) return names.join(', ')
      return `${names.slice(0, 2).join(', ')}, +${names.length - 2} mer`
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

        this.showToast('Tilbehør lagret!')
      } catch (err) {
        console.error('Failed to save variants:', err)
        this.showToast('Kunne ikke lagre tilbehør. Vennligst prøv igjen.', 'error')
      }
    },

    removeVariant(index) {
      if (confirm('Er du sikker på at du vil fjerne dette tilbehøret?')) {
        this.category.productVariants.splice(index, 1)
        this.saveVariants()
      }
    },

    async handleVariantReorder() {
      // vuedraggable automatically updates the array via v-model
      // We just need to save the new order
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

    showToast(message, type = 'success') {
      this.toast = { show: true, message, type }
      setTimeout(() => {
        this.toast.show = false
      }, 3000)
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
    },

    updatePublishRules(newRules) {
      // Only mark as changed if rules actually changed
      const currentRulesJson = JSON.stringify(this.category.publishRules || [])
      const newRulesJson = JSON.stringify(newRules || [])

      this.$set(this.category, 'publishRules', newRules)

      if (currentRulesJson !== newRulesJson) {
        this.markAsChanged()
      }
    },

    clearStartPublish() {
      this.category.startPublish = null
      this.markAsChanged()
    },

    clearStopPublish() {
      this.category.stopPublish = null
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

  @media (max-width: 768px) {
    padding: 0.5rem;
  }
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
  color: #64748b;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
    color: #334155;
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
  }
}

.btn-primary {
  background: #334155;
  color: #fff;

  &:hover:not(:disabled) {
    background: #1e293b;
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

// Loading component handles the spinner styling

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

  .saving-indicator {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 8px;
    color: #334155;
    font-size: 0.9em;

    .material-icons {
      font-size: 16px;
    }
  }
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
    border-color: #94a3b8;
    box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.1);
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

.datetime-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  cursor: pointer;

  .form-input {
    flex: 1;
    padding-right: 40px; // Make room for the clear button
    cursor: pointer;
  }

  .clear-datetime-btn {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
    border-radius: 4px;
    transition: all 0.2s;
    z-index: 1;

    &:hover {
      background: #fee2e2;
      color: #ef4444;
    }

    .material-icons {
      font-size: 18px;
    }
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
    border-color: #cbd5e0;
    background: #f9fafb;
  }

  &.dragging {
    border-color: #334155;
    background: rgba(51, 65, 85, 0.05);
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
    color: #334155;
    margin-bottom: 12px;
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

  .drag-handle {
    color: #9ca3af;
    cursor: grab;
    display: flex;
    align-items: center;

    &:active {
      cursor: grabbing;
    }
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

// Vuedraggable ghost class for variants
.variant-ghost {
  opacity: 0.5;
  background: #f1f5f9;
  border-color: #334155;
}

.empty-hint {
  padding: 20px;
  text-align: center;
  color: #9ca3af;
  font-size: 0.95em;
  background: #f9fafb;
  border-radius: 8px;
}

// Removed @keyframes spin - now using Loading component

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
    background: #334155;
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
</style>

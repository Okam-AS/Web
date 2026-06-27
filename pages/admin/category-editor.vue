<template>
  <AdminPage>
    <div class="category-editor-page">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" @click="goBack">
          <span class="material-icons">arrow_back</span>
          {{ $i('common_back') }}
        </button>

        <div class="header-actions">
          <button
            v-if="!isNewCategory"
            class="btn btn-danger"
            @click="deleteCategory"
          >
            <span class="material-icons">delete</span>
            {{ $i('categoryEditor_deleteCategory') }}
          </button>
          <button
            class="btn btn-primary"
            @click="saveCategory"
            :disabled="isSaving || !hasChanges"
          >
            <Loading v-if="isSaving" :loading="true" :size="20" />
            <span v-else class="material-icons">save</span>
            {{ isSaving ? $i('common_saving') : $i('categoryEditor_saveChanges') }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading-container">
        <Loading :loading="true" :size="48" />
        <p>{{ $i('categoryEditor_loadingCategory') }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-container">
        <span class="material-icons">error</span>
        <p>{{ error }}</p>
        <button class="btn btn-secondary" @click="goBack">
          {{ $i('categoryEditor_goBack') }}
        </button>
      </div>

      <!-- Editor Content -->
      <div v-else class="editor-content">
        <!-- Basic Info Section -->
        <div class="editor-section">
          <h2>{{ $i('categoryEditor_basicInfo') }}</h2>

          <div class="form-group">
            <label>{{ $i('categoryEditor_categoryNameLabel') }}</label>
            <input
              v-model="category.name"
              type="text"
              :placeholder="$i('categoryEditor_categoryNamePlaceholder')"
              class="form-input"
              @input="markAsChanged"
            />
          </div>

          <!-- Category Image -->
          <div class="form-group">
            <label>{{ $i('categoryEditor_categoryImageLabel') }}</label>
            <p class="field-hint">{{ $i('categoryEditor_imageCropHint') }}</p>

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
                <p>{{ $i('categoryEditor_uploading') }}</p>
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
                <p>{{ $i('categoryEditor_imageDropPrompt') }}</p>
                <p class="hint">{{ $i('categoryEditor_imageFormatHint') }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Products Section -->
        <div class="editor-section">
          <div class="section-header">
            <h2>{{ $i('categoryEditor_products') }}</h2>
            <div class="section-actions">
              <button class="btn btn-secondary" @click="addHeading" :disabled="isNewCategory">
                <span class="material-icons">title</span>
                {{ $i('categoryEditor_addHeading') }}
              </button>
              <button class="btn btn-primary" @click="openProductSelector" :disabled="isNewCategory">
                <span class="material-icons">add</span>
                {{ $i('categoryEditor_selectProducts') }}
              </button>
            </div>
          </div>

          <p class="section-description">
            <template v-if="isNewCategory">
              {{ $i('categoryEditor_saveFirstForProducts') }}
            </template>
            <template v-else>
              {{ $i('categoryEditor_productCount', { count: category.categoryProductListItems.length }) }}
              <span v-if="isSavingProducts" class="saving-indicator">
                <Loading :loading="true" :size="16" />
                {{ $i('common_saving') }}
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
            <h2>{{ $i('categoryEditor_sharedAccessories') }}</h2>
            <button class="btn btn-primary" @click="openVariantEditor" :disabled="isNewCategory">
              <span class="material-icons">add</span>
              {{ $i('categoryEditor_addAccessory') }}
            </button>
          </div>

          <p class="section-description">
            <template v-if="isNewCategory">
              {{ $i('categoryEditor_saveFirstForAccessories') }}
            </template>
            <template v-else>
              {{ $i('categoryEditor_accessoriesDescription') }}
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
                  <span v-if="variant.multiselect" class="badge">{{ $i('categoryEditor_multiselectBadge') }}</span>
                  <span v-if="variant.required" class="badge badge-required">{{ $i('categoryEditor_requiredBadge') }}</span>
                  <span class="variant-options-preview">
                    {{ formatOptionsPreview(variant.options) }}
                  </span>
                </div>
              </div>
              <button
                class="copy-btn-small"
                :title="$i('categoryEditor_copyToOtherCategories')"
                @click.stop="copyVariantToCategories(index)"
              >
                <span class="material-icons">content_copy</span>
              </button>
              <button class="delete-btn-small" @click.stop="removeVariant(index)">
                <span class="material-icons">close</span>
              </button>
            </div>
          </draggable>
          <div v-else class="empty-hint">
            {{ $i('categoryEditor_noAccessories') }}
          </div>
        </div>

        <!-- Visibility Settings -->
        <div class="editor-section">
          <h2>{{ $i('categoryEditor_visibility') }}</h2>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                v-model="category.hide"
                type="checkbox"
                @change="markAsChanged"
              />
              <span>{{ $i('categoryEditor_hideCategory') }}</span>
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                v-model="category.soldOut"
                type="checkbox"
                @change="markAsChanged"
              />
              <span>{{ $i('categoryEditor_soldOut') }}</span>
            </label>
          </div>

          <div class="form-group">
            <label>{{ $i('categoryEditor_hideFromDeliveryTypes') }}</label>
            <div class="delivery-types">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  :checked="isHiddenFromDeliveryType('SelfPickup')"
                  @change="toggleDeliveryType('SelfPickup')"
                />
                <span>{{ $i('categoryEditor_deliverySelfPickup') }}</span>
              </label>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  :checked="isHiddenFromDeliveryType('TableDelivery')"
                  @change="toggleDeliveryType('TableDelivery')"
                />
                <span>{{ $i('categoryEditor_deliveryTableDelivery') }}</span>
              </label>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  :checked="isHiddenFromHomeDelivery"
                  @change="toggleHomeDelivery"
                />
                <span>{{ $i('categoryEditor_deliveryHomeDelivery') }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Publishing Schedule -->
        <div class="editor-section">
          <h2>{{ $i('categoryEditor_publishingSchedule') }}</h2>
          <p class="section-description">
            {{ $i('categoryEditor_publishingScheduleDescription') }}
          </p>

          <div class="form-row">
            <div class="form-group">
              <label>{{ $i('categoryEditor_startPublish') }}</label>
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
                  :title="$i('categoryEditor_clearDate')"
                >
                  <span class="material-icons">close</span>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>{{ $i('categoryEditor_stopPublish') }}</label>
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
                  :title="$i('categoryEditor_clearDate')"
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
      <CopyVariantToTargetsModal ref="copyVariant" />

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
import CopyVariantToTargetsModal from '~/components/admin/CopyVariantToTargetsModal.vue'
import CategoryProductList from '~/components/admin/CategoryProductList.vue'
import PublishingRuleEditor from '~/components/admin/PublishingRuleEditor.vue'
import Loading from '~/components/atoms/Loading.vue'
import draggable from 'vuedraggable'
import axios from 'axios'
import $config from '~/core/helpers/configuration'
import { mergeVariantByName } from '~/core/helpers/variant-copy'

export default {
  components: {
    AdminPage,
    ProductSelectorModal,
    VariantEditorModal,
    CopyVariantToTargetsModal,
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
    // Validate URL parameters
    if (!this.categoryId && !this.isNewCategory) {
      this.error = this.$i('categoryEditor_errorNoCategoryId')
      return
    }

    // If store is already selected, load category
    // Otherwise, the watcher will handle it when store becomes available
    if (this.selectedStore) {
      if (this.isNewCategory) {
        this.category.storeId = this.selectedStore
        this.hasChanges = false
      } else if (this.categoryId) {
        this.loadCategory()
      }
    }
  },

  beforeRouteLeave(_, __, next) {
    if (this.hasChanges) {
      const answer = window.confirm(
        this.$i('categoryEditor_unsavedChangesLeavePage')
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

    parsePositiveStoreId(value) {
      const parsed = parseInt(value, 10)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null
    },

    syncSelectedStoreWithCategory(category) {
      const categoryStoreId = this.parsePositiveStoreId(category?.storeId)
      if (!categoryStoreId) return

      if (this.parsePositiveStoreId(this.selectedStore) !== categoryStoreId) {
        this.$store.dispatch('SetSelectedAdminStore', categoryStoreId)
      }

      if (String(this.$route.query?.storeId) !== String(categoryStoreId)) {
        this.$router.replace({
          query: {
            ...this.$route.query,
            storeId: categoryStoreId
          }
        })
      }
    },

    async loadCategory() {
      // Prevent duplicate loads
      if (this.isLoading) return
      // Don't reload if already loaded the same category
      if (
        this.category.id === this.categoryId &&
        this.parsePositiveStoreId(this.category.storeId) === this.parsePositiveStoreId(this.selectedStore)
      ) return

      try {
        this.isLoading = true
        this.error = null

        const category = await this._categoryService.Get(this.categoryId, true)

        // Handle case where category is not found or API returns null
        if (!category) {
          this.error = this.$i('categoryEditor_errorCategoryNotFound')
          return
        }

        this.syncSelectedStoreWithCategory(category)

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
        this.error = this.$i('categoryEditor_errorLoadFailed')
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
        this.showToast(this.$i('categoryEditor_validationNameRequired'), 'error')
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
          this.showToast(this.$i('categoryEditor_toastCategoryCreated'))
        } else {
          // Update existing category - don't replace the whole object
          await this._categoryService.Update(this.category)
          this.showToast(this.$i('categoryEditor_toastCategorySaved'))
        }

        this.hasChanges = false
      } catch (err) {
        console.error('Failed to save category:', err)
        this.showToast(this.$i('categoryEditor_toastSaveFailed'), 'error')
      } finally {
        this.isSaving = false
      }
    },

    async deleteCategory() {
      if (!confirm(this.$i('categoryEditor_confirmDeleteCategory', { name: this.category.name }))) {
        return
      }

      try {
        await this._categoryService.Delete(this.categoryId)
        this.showToast(this.$i('categoryEditor_toastCategoryDeleted'))
        this.$router.push('/admin/categories')
      } catch (err) {
        console.error('Failed to delete category:', err)
        this.showToast(this.$i('categoryEditor_toastDeleteFailed'), 'error')
      }
    },

    goBack() {
      if (this.hasChanges) {
        if (!confirm(this.$i('categoryEditor_unsavedChangesGoBack'))) {
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
        this.showToast(this.$i('categoryEditor_toastOnlyJpgPng'), 'error')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        this.showToast(this.$i('categoryEditor_toastFileTooLarge'), 'error')
        return
      }

      try {
        this.isUploadingImage = true
        const resizedBlob = await this.processImage(file)

        if (this.isNewCategory) {
          // For new categories, just store the blob to upload after creation
          this.showToast(this.$i('categoryEditor_toastSaveBeforeUpload'), 'error')
          return
        }

        await this.uploadImage(resizedBlob)
      } catch (error) {
        console.error('Failed to process/upload image:', error)
        this.showToast(this.$i('categoryEditor_toastImageUploadFailed'), 'error')
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

        // API returns true, not the image data - we need to fetch the category again
        // Reset category.id to bypass the duplicate load check in loadCategory()
        const currentCategoryId = this.category.id
        this.category.id = null
        await this.loadCategory()

        // If load failed for some reason, restore the ID
        if (!this.category.id) {
          this.category.id = currentCategoryId
        }

        this.showToast(this.$i('categoryEditor_toastImageUploaded'))
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
      const text = prompt(this.$i('categoryEditor_headingPrompt'))
      if (!text || text.trim().length < 2 || text.trim().length > 30) {
        if (text !== null) {
          this.showToast(this.$i('categoryEditor_headingValidation'), 'error')
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
        this.showToast(this.$i('categoryEditor_toastProductListSaved'))
      } catch (err) {
        console.error('Failed to save product list:', err)
        this.showToast(this.$i('categoryEditor_toastProductListSaveFailed'), 'error')
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
      if (!options || options.length === 0) return this.$i('categoryEditor_noOptions')
      const names = options.map(o => o.name).filter(n => n)
      if (names.length === 0) return this.$i('categoryEditor_noOptions')
      if (names.length <= 3) return names.join(', ')
      return this.$i('categoryEditor_optionsPreviewMore', { names: names.slice(0, 2).join(', '), count: names.length - 2 })
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

        this.showToast(this.$i('categoryEditor_toastAccessorySaved'))
      } catch (err) {
        console.error('Failed to save variants:', err)
        this.showToast(this.$i('categoryEditor_toastAccessorySaveFailed'), 'error')
      }
    },

    removeVariant(index) {
      if (confirm(this.$i('categoryEditor_confirmRemoveAccessory'))) {
        this.category.productVariants.splice(index, 1)
        this.saveVariants()
      }
    },

    async copyVariantToCategories(index) {
      const sourceVariant = this.category.productVariants[index]
      if (!sourceVariant) return

      try {
        const categories = await this._categoryService.GetAll(this.selectedStore, true)
        const targets = categories.map(c => ({ id: c.id, name: c.name }))

        const targetIds = await this.$refs.copyVariant.open({
          variantName: sourceVariant.name,
          targets,
          targetType: 'category',
          excludeId: this.categoryId
        })
        if (!targetIds || targetIds.length === 0) return

        let succeeded = 0
        const failed = []
        for (const targetId of targetIds) {
          try {
            const target = await this._categoryService.Get(targetId, true)
            const mergedList = mergeVariantByName(target.productVariants || [], sourceVariant)
            await this._categoryProductVariantService.CreateOrUpdate(targetId, mergedList)
            succeeded++
          } catch (err) {
            console.error('Failed to copy variant to category:', targetId, err)
            const target = categories.find(c => c.id === targetId)
            failed.push(target ? target.name : targetId)
          }
        }

        if (failed.length === 0) {
          this.showToast(
            succeeded === 1
              ? this.$i('categoryEditor_toastCopiedToCategory', { count: succeeded })
              : this.$i('categoryEditor_toastCopiedToCategories', { count: succeeded })
          )
        } else {
          this.showToast(
            this.$i('categoryEditor_toastCopiedPartialFailure', { count: succeeded, failed: failed.join(', ') }),
            'error'
          )
        }
      } catch (err) {
        console.error('Failed to copy variant:', err)
        this.showToast(this.$i('categoryEditor_toastCopyFailed'), 'error')
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

  .copy-btn-small {
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
      background: #dcfce7;
      color: #1bb776;
    }

    .material-icons {
      font-size: 20px;
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

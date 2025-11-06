<template>
  <AdminPage>
    <div class="container">
      <div class="page-header-section">
        <div>
          <h1 style="margin-bottom: 0.5em">Kategorier</h1>
          <p style="margin-bottom: 1.5em">Administrer kategorier for valgt butikk.</p>
        </div>
        <button class="btn btn-create" @click="createNewCategory">
          <span class="material-icons">add</span>
          Opprett kategori
        </button>
      </div>

      <div
        v-if="loading"
        class="loading-container"
      >
        <i class="fas fa-spinner fa-spin" />
        <span>Laster kategorier...</span>
      </div>

      <div
        v-else-if="error"
        class="error-container"
      >
        <p>{{ error }}</p>
      </div>

      <div
        v-else-if="categories.length === 0"
        class="no-categories"
      >
        <p>Ingen kategorier funnet for denne butikken.</p>
        <button class="btn btn-create" @click="createNewCategory" style="margin-top: 1rem">
          <span class="material-icons">add</span>
          Opprett første kategori
        </button>
      </div>

      <div
        v-else
        class="categories-container"
      >
        <div class="categories-grid">
          <div
            v-for="(category, index) in categories"
            :key="category.id"
            class="category-card"
            :class="{
              hidden: category.hide
            }"
          >
            <!-- Reorder Buttons -->
            <div class="reorder-actions">
              <button
                v-if="index > 0"
                class="action-btn reorder-btn"
                @click.stop="moveCategory(index, index - 1)"
                title="Flytt opp"
              >
                <span class="material-icons">arrow_upward</span>
              </button>
              <button
                v-if="index < categories.length - 1"
                class="action-btn reorder-btn"
                @click.stop="moveCategory(index, index + 1)"
                title="Flytt ned"
              >
                <span class="material-icons">arrow_downward</span>
              </button>
            </div>

            <!-- Action Buttons -->
            <div class="category-actions">
              <button
                class="action-btn edit-btn"
                @click.stop="editCategory(category.id)"
                title="Rediger kategori"
              >
                <span class="material-icons">edit</span>
              </button>
              <button
                class="action-btn delete-btn"
                @click.stop="deleteCategory(category)"
                title="Slett kategori"
              >
                <span class="material-icons">delete</span>
              </button>
            </div>

            <div
              class="category-image-container"
              :class="{ dragging: draggingCategories[category.id] }"
              @dragover.prevent="handleImageDragOver($event, category.id)"
              @dragleave.prevent="handleImageDragLeave(category.id)"
              @drop.prevent="handleImageDrop($event, category.id)"
              @click="triggerFileInput(category.id)"
            >
              <input
                :ref="`fileInput-${category.id}`"
                type="file"
                class="hidden-file-input"
                accept="image/jpeg,image/png"
                @change="handleFileSelect($event, category.id)"
              />
              <div
                v-if="uploadingFor === category.id"
                class="loading-overlay"
              >
                <i class="fas fa-spinner fa-spin" />
              </div>
              <img
                v-if="category.image && category.image.imageUrl"
                :src="category.image.imageUrl"
                :alt="category.name"
                class="category-image"
              />
              <div
                v-else
                class="category-image-placeholder"
                style="pointer-events: none"
              >
                <svg
                  width="50"
                  height="50"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="2"
                    stroke="#adb5bd"
                    stroke-width="2"
                  />
                  <circle
                    cx="8.5"
                    cy="8.5"
                    r="1.5"
                    fill="#adb5bd"
                  />
                  <path
                    d="M6 16L9 13L11 15L15 11L18 14V16C18 17.1046 17.1046 18 16 18H8C6.89543 18 6 17.1046 6 16Z"
                    fill="#adb5bd"
                  />
                </svg>
                <span class="upload-hint">Klikk eller slipp bilde her</span>
              </div>
              <div class="category-overlay" />
              <div class="category-status-top">
                <span
                  v-if="category.hide"
                  class="status-badge hidden"
                  >Skjult</span
                >
                <span
                  v-if="!category.published || !category.image"
                  class="status-badge unpublished"
                  >Ikke publisert</span
                >
              </div>
              <div class="category-details">
                <h3 class="category-name">
                  {{ category.name }}
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from "~/components/organisms/AdminPage.vue";
import axios from "axios";
import $config from "~/core/helpers/configuration";

export default {
  components: {
    AdminPage,
  },

  data() {
    return {
      categories: [],
      loading: false,
      error: null,
      uploadingFor: null,
      draggingCategories: {},
      imageDimensions: {},
      isReordering: false
    };
  },

  computed: {
    selectedStore() {
      return this.$store.state.selectedAdminStore;
    },
  },

  watch: {
    selectedStore(newVal) {
      if (newVal) {
        this.loadCategories();
      } else {
        this.categories = [];
      }
    },
  },

  mounted() {
    if (this.selectedStore) {
      this.loadCategories();
    }
  },

  methods: {
    async createNewCategory() {
      const name = prompt('Kategorinavn:');
      if (!name || name.trim() === '') {
        return;
      }

      try {
        const newCategory = {
          name: name.trim(),
          storeId: this.selectedStore,
          orderIndex: this.categories.length,
          hide: false,
          soldOut: false,
          published: false
        };

        const created = await this._categoryService.Create(newCategory);

        // Navigate to editor
        this.$router.push({
          path: '/admin/category-editor',
          query: { id: created.id }
        });
      } catch (err) {
        console.error('Failed to create category:', err);
        alert('Kunne ikke opprette kategorien. Vennligst prøv igjen.');
      }
    },

    editCategory(categoryId) {
      this.$router.push({
        path: '/admin/category-editor',
        query: { id: categoryId }
      });
    },

    async deleteCategory(category) {
      if (!confirm(`Er du sikker på at du vil slette kategorien "${category.name}"?`)) {
        return;
      }

      try {
        await this._categoryService.Delete(category.id);
        alert('Kategori slettet');
        this.loadCategories();
      } catch (err) {
        console.error('Failed to delete category:', err);
        alert('Kunne ikke slette kategorien. Vennligst prøv igjen.');
      }
    },

    // Category reordering
    async moveCategory(fromIndex, toIndex) {
      if (this.isReordering) return;

      try {
        this.isReordering = true;

        const newCategories = [...this.categories];
        const [movedCategory] = newCategories.splice(fromIndex, 1);
        newCategories.splice(toIndex, 0, movedCategory);

        // Update local state
        this.categories = newCategories;

        // Assign order indexes
        this.categories.forEach((category, index) => {
          category.orderIndex = index;
        });

        // Save to API
        await this._categoryService.Reorder(this.selectedStore, this.categories);
      } catch (err) {
        console.error('Failed to reorder categories:', err);
        alert('Kunne ikke lagre rekkefølgen. Vennligst last siden på nytt.');
        this.loadCategories(); // Reload to get correct order
      } finally {
        this.isReordering = false;
      }
    },

    // Image upload
    handleImageDragOver(event, categoryId) {
      if (event.dataTransfer.types.includes('Files')) {
        this.draggingCategories[categoryId] = true;
      }
    },

    handleImageDragLeave(categoryId) {
      this.draggingCategories[categoryId] = false;
    },

    async handleImageDrop(event, categoryId) {
      this.draggingCategories[categoryId] = false;

      if (!event.dataTransfer.files || event.dataTransfer.files.length === 0) {
        return;
      }

      const file = event.dataTransfer.files[0];

      if (!file.type.match(/image\/(jpeg|png)/)) {
        alert("Kun JPG og PNG filer er tillatt");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert("Filstørrelsen må være mindre enn 5MB");
        return;
      }

      this.uploadingFor = categoryId;

      try {
        const resizedBlob = await this.processImage(file);
        await this.uploadImage(categoryId, resizedBlob);
      } catch (error) {
        console.error("Failed to upload image:", error);
        alert("Kunne ikke laste opp bilde");
      } finally {
        this.uploadingFor = null;
      }
    },

    triggerFileInput(categoryId) {
      const fileInput = this.$refs[`fileInput-${categoryId}`];
      if (fileInput?.[0]) {
        fileInput[0].click();
      }
    },

    handleFileSelect(event, categoryId) {
      const file = event.target.files[0];
      if (!file) {
        return;
      }

      // Create a fake drop event to reuse existing logic
      const fakeDropEvent = { dataTransfer: { files: [file] } };
      this.handleImageDrop(fakeDropEvent, categoryId);

      // Reset the input so the same file can be selected again
      event.target.value = "";
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

    uploadImage(categoryId, blob) {
      const formData = new FormData();
      formData.append("image", blob, "image.jpg");
      formData.append("guidId", categoryId);

      return axios
        .post(`${$config.okamApiBaseUrl}/categories/${categoryId}/image`, formData, {
          headers: {
            Authorization: `Bearer ${this.$store.state.currentUser.token}`,
          },
        })
        .then(() => {
          // Reload categories to get updated image
          this.loadCategories();
          this.$set(this.imageDimensions, categoryId, "500x500");
        })
        .catch((error) => {
          console.error("Error uploading image:", error);
          alert("Kunne ikke laste opp bilde: " + (error.message || "Ukjent feil"));
        });
    },

    loadCategories() {
      this.loading = true;
      this.error = null;

      this._categoryService
        .GetAll(this.selectedStore, true)
        .then((response) => {
          this.categories = response;
          this.loading = false;
        })
        .catch((err) => {
          console.error("Error loading categories:", err);
          this.error = "Kunne ikke laste kategorier: " + (err.message || "Ukjent feil");
          this.loading = false;
        });
    },
  },
};
</script>

<style lang="scss">
.container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header-section {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
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

  .material-icons {
    font-size: 20px;
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0);
  }
}

.btn-create {
  background: #10b981;
  color: #fff;

  &:hover {
    background: #059669;
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;

  i {
    font-size: 2rem;
    margin-bottom: 1rem;
    color: #0066cc;
  }
}

.error-container {
  padding: 1rem;
  background-color: #ffebee;
  border-radius: 4px;
  color: #c62828;
  margin-bottom: 1rem;
}

.no-categories {
  padding: 3rem 2rem;
  text-align: center;
  background-color: #f5f5f5;
  border-radius: 8px;

  p {
    font-size: 1.1em;
    color: #6b7280;
    margin-bottom: 0;
  }
}

.categories-container {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
}

.category-card {
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
  position: relative;
  height: 200px;
  cursor: default;
  user-select: none;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);

    .reorder-actions {
      opacity: 1;
    }

    .category-actions {
      opacity: 1;
    }
  }

  &.hidden {
    opacity: 0.7;
  }
}

.reorder-actions {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.category-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 5;
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s;
}

.action-btn {
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 6px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

  .material-icons {
    font-size: 20px;
  }

  &:hover {
    transform: scale(1.1);
  }
}

.reorder-btn {
  color: #6b7280;

  &:hover {
    background: #f3f4f6;
    color: #111827;
  }
}

.edit-btn {
  color: #0066cc;

  &:hover {
    background: #eff6ff;
  }
}

.delete-btn {
  color: #ef4444;

  &:hover {
    background: #fee2e2;
  }
}

.category-image-container {
  height: 100%;
  width: 100%;
  position: relative;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;

  &.dragging {
    border: 2px dashed #0066cc;
    background-color: rgba(0, 102, 204, 0.1);
  }
}

.hidden-file-input {
  display: none;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;

  i {
    font-size: 2rem;
    color: #0066cc;
  }
}

.category-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.category-image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #e9ecef;
  color: #adb5bd;
  position: absolute;
  top: 0;
  left: 0;

  svg {
    width: 50px;
    height: 50px;
    margin-bottom: 8px;
  }
}

.upload-hint {
  display: block;
  margin-top: 8px;
  font-size: 0.8rem;
  color: #6c757d;
  text-align: center;
}

.category-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100%;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.7) 100%);
  pointer-events: none;
}

.category-status-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 0.75rem;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  pointer-events: none;
}

.category-details {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  z-index: 2;
  pointer-events: none;
}

.category-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;

  &.hidden {
    background-color: rgba(233, 236, 239, 0.8);
    color: #6c757d;
  }

  &.unpublished {
    background-color: rgba(255, 243, 205, 0.8);
    color: #856404;
  }
}
</style>

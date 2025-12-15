<template>
  <AdminPage>
    <div class="categories-page">
      <div class="page-header">
        <div>
          <h1>Kategorier</h1>
          <p>Administrer kategorier for valgt butikk.</p>
        </div>
        <button class="btn btn-create" @click="createNewCategory">
          <span class="material-icons">add</span>
          Opprett kategori
        </button>
      </div>

      <LoadingSkeleton v-if="loading" />

      <div
        v-else-if="error"
        class="error-container"
      >
        <p>{{ error }}</p>
      </div>

      <div v-else-if="categories.length === 0" class="empty-state">
        <span class="material-icons">inventory_2</span>
        <h3>Ingen kategorier enda</h3>
        <p>Kom i gang ved å opprette din første kategori</p>
        <button class="create-first-btn" @click="createNewCategory">
          <span class="material-icons">add</span>
          Opprett første kategori
        </button>
      </div>

      <div
        v-else
        class="categories-container"
      >
        <draggable
          v-model="categories"
          class="categories-grid"
          handle=".drag-handle"
          animation="200"
          ghost-class="category-ghost"
          drag-class="category-dragging"
          @end="handleCategoryReorder"
        >
          <div
            v-for="category in categories"
            :key="category.id"
            class="category-card"
            :class="{
              hidden: category.hide
            }"
            @click="editCategory(category.id)"
          >
            <!-- Drag Handle -->
            <div class="drag-handle-container" @click.stop>
              <div class="drag-handle" title="Dra for å endre rekkefølge">
                <span class="material-icons">drag_indicator</span>
              </div>
            </div>

            <div class="category-image-container">
              <img
                v-if="category.image && category.image.imageUrl"
                :src="category.image.imageUrl"
                :alt="category.name"
                class="category-image"
              />
              <div
                v-else
                class="category-image-placeholder"
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
        </draggable>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from "~/components/organisms/AdminPage.vue";
import LoadingSkeleton from "~/components/molecules/LoadingSkeleton.vue";
import draggable from "vuedraggable";

export default {
  components: {
    AdminPage,
    LoadingSkeleton,
    draggable,
  },

  data() {
    return {
      categories: [],
      loading: false,
      error: null,
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

    // Category reordering with drag and drop
    async handleCategoryReorder() {
      if (this.isReordering) return;

      try {
        this.isReordering = true;

        // Assign order indexes based on current array order
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
.categories-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
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
    margin: 0 0 24px 0;
    font-size: 0.95em;
  }

  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 0.95em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  .material-icons {
    font-size: 20px;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0);
  }
}

.btn-create {
  background: #334155;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  &:hover {
    background: #1e293b;
  }
}


.error-container {
  padding: 1rem;
  background-color: #ffebee;
  border-radius: 4px;
  color: #c62828;
  margin-bottom: 1rem;
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

    .material-icons {
      font-size: 20px;
      color: white;
      margin-bottom: 0;
    }
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
  cursor: pointer;
  user-select: none;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);

    .drag-handle-container {
      opacity: 1;
    }
  }

  &.hidden {
    opacity: 0.7;
  }
}

// Vuedraggable ghost and drag classes
.category-ghost {
  opacity: 0.5;
  background: #e0f2fe;
  transform: rotate(2deg);
}

.category-dragging {
  opacity: 0.9;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  transform: scale(1.05);
}

.drag-handle-container {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 5;
  opacity: 0;
  transition: opacity 0.2s;
}

.drag-handle {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 6px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;

  &:active {
    cursor: grabbing;
  }

  .material-icons {
    font-size: 20px;
    color: #6b7280;
  }

  &:hover {
    background: #f3f4f6;
    transform: scale(1.1);

    .material-icons {
      color: #111827;
    }
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
  }
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

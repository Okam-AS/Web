<template>
  <div class="onboarding-product-images">
    <div
      v-if="loading"
      class="loading-overlay"
    >
      <div class="spinner" />
      <p>Laster produkter...</p>
    </div>

    <div v-else>
      <div
        v-if="products.length === 0"
        class="no-products"
      >
        <p>Ingen produkter funnet. Vennligst gå tilbake til forrige steg for å importere produkter.</p>
      </div>

      <div v-else>
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

        <div class="results-count">
          Viser {{ filteredProducts.length }} av {{ products.length }} produkter
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
            v-for="product in filteredProducts"
            :key="product.id"
            class="product-card"
          >
            <div
              class="product-image"
              :class="{ dragging: draggingProducts[product.id] }"
              @dragenter.prevent="draggingProducts[product.id] = true"
              @dragover.prevent="draggingProducts[product.id] = true"
              @dragleave.prevent="draggingProducts[product.id] = false"
              @drop.prevent="
                handleDrop($event, product.id);
                draggingProducts[product.id] = false;
              "
              @click="triggerFileInput(product.id)"
            >
              <div
                v-if="product.image?.imageUrl"
                class="image-container"
              >
                <img
                  :src="product.image.imageUrl"
                  :alt="product.name"
                />
              </div>
              <div
                v-else
                class="upload-placeholder"
              >
                <i class="fas fa-cloud-upload-alt" />
                <p>Dra og slipp bilde her eller klikk for å velge fil</p>
              </div>
              <input
                :ref="`fileInput-${product.id}`"
                type="file"
                accept="image/*"
                class="file-input"
                @change="handleFileSelect($event, product.id)"
              />
            </div>
            <div class="product-info">
              <h3>{{ product.name }}</h3>
              <p class="product-price">{{ (product.amount / 100).toFixed(2) }} {{ product.currency }}</p>
              <p class="product-description">
                {{ product.description || "Ingen beskrivelse" }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import $config from "@/core/helpers/configuration";
import dayjs from "dayjs";

export default {
  name: "OnboardingProductImages",
  props: {
    storeId: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      loading: true,
      products: [],
      productFilter: "",
      draggingProducts: {},
      productsWithImages: [],
    };
  },
  computed: {
    filteredProducts() {
      if (!this.productFilter) {
        return this.products;
      }
      const filter = this.productFilter.toLowerCase();
      return this.products.filter((product) => product.name.toLowerCase().includes(filter) || (product.description && product.description.toLowerCase().includes(filter)));
    },
  },
  watch: {
    storeId() {
      this.loadProducts();
    },
  },
  created() {
    this.loadProducts();
  },
  methods: {
    loadProducts() {
      this.loading = true;
      this._productService
        .GetAll(this.storeId)
        .then((products) => {
          // Sort products by creation date if available
          this.products = this.sortProductsByDate(products);

          // Count products that already have images
          this.productsWithImages = products.filter((product) => product.image?.imageUrl).map((product) => product.id);

          // Emit event to update parent
          this.$emit("products-loaded", {
            count: this.productsWithImages.length,
            total: products.length,
          });

          // Update dimensions for products with images
          products.forEach((product) => {
            if (product.image?.imageUrl) {
              this.updateImageDimension(product);
            }
          });
        })
        .catch((error) => {
          // Handle error
          console.error("Failed to load products");
        })
        .finally(() => {
          this.loading = false;
        });
    },

    async loadSingleProduct(productId) {
      try {
        // Get the product by ID
        const product = await this._productService.Get(productId);

        if (product) {
          // Find the index of the product in the array
          const index = this.products.findIndex((p) => p.id === productId);

          if (index !== -1) {
            // Update the product in the array
            this.$set(this.products, index, product);

            // Update productsWithImages array if needed
            if (product.image?.imageUrl && !this.productsWithImages.includes(productId)) {
              this.productsWithImages.push(productId);
            }

            // Update image dimensions
            if (product.image?.imageUrl) {
              this.updateImageDimension(product);
            }

            return product;
          }
        }
        return null;
      } catch (error) {
        console.error("Failed to load product", error);
        return null;
      }
    },

    handleDrop(event, productId) {
      event.preventDefault();
      event.stopPropagation();

      // Reset the dragging state
      this.draggingProducts[productId] = false;

      // Check if files were dropped
      if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        const file = event.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
          this.processImage(file)
            .then((imageUrl) => {
              this.resizeAndUpload(productId, imageUrl);
            })
            .catch((error) => {
              console.error("Failed to process dropped image", error);
              alert("Det oppstod en feil ved behandling av bildet. Vennligst prøv igjen.");
            });
        } else {
          alert("Vennligst last opp et gyldig bildeformat (JPG, PNG, GIF, etc.)");
        }
      }
    },

    triggerFileInput(productId) {
      const fileInput = this.$refs[`fileInput-${productId}`];
      if (fileInput) {
        // Check if fileInput is an array and use the first element
        if (Array.isArray(fileInput)) {
          fileInput[0].click();
        } else {
          fileInput.click();
        }
      }
    },

    handleFileSelect(event, productId) {
      const file = event.target.files[0];
      if (file) {
        if (!file.type.startsWith("image/")) {
          alert("Vennligst last opp et gyldig bildeformat (JPG, PNG, GIF, etc.)");
          return;
        }
        console.log("Selected file:", file);
        this.processImage(file)
          .then((imageUrl) => {
            this.resizeAndUpload(productId, imageUrl);
          })
          .catch((error) => {
            console.error("Failed to process selected image", error);
            alert("Det oppstod en feil ved behandling av bildet. Vennligst prøv igjen.");
          });
      }
    },

    processImage(file) {
      return new Promise((resolve, reject) => {
        // Create an object URL for the file
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
          // Create a canvas for image processing
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          // Set canvas dimensions to 500x500 for a square image
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

          return canvas.toBlob(resolve, "image/jpeg", 0.9);
        };

        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Failed to load image"));
        };

        img.src = objectUrl;
      });
    },

    async uploadImage(productId, blob) {
      try {
        const formData = new FormData();
        formData.append("image", blob, "image.jpg");
        formData.append("guidId", productId);

        console.log("url", `${$config.okamApiBaseUrl}/products/image`);
        await axios
          .post(`${$config.okamApiBaseUrl}/products/image`, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${this.$store.state.currentUser.token}`,
            },
          })
          .catch((error) => {
            console.error("Upload failed", error);
            alert("Bilde-opplastingen feilet. Vennligst prøv igjen senere.");
          });

        // Load only the updated product instead of all products
        const updatedProduct = await this.loadSingleProduct(productId);

        if (updatedProduct) {
          // Add to products with images if not already there
          if (!this.productsWithImages.includes(productId)) {
            this.productsWithImages.push(productId);
          }

          // Emit event to update parent
          this.$emit("image-uploaded", {
            productId,
            count: this.productsWithImages.length,
            total: this.products.length,
          });
        }
      } catch (error) {
        console.error("Upload failed", error);
        alert("Bilde-opplastingen feilet. Vennligst prøv igjen senere.");
      }
    },

    resizeAndUpload(productId, imageUrl) {
      console.log("Starting resizeAndUpload", productId, imageUrl);

      // If imageUrl is a Blob, convert it to an object URL
      let objectUrl = null;
      if (imageUrl instanceof Blob) {
        console.log("Converting Blob to object URL");
        objectUrl = URL.createObjectURL(imageUrl);
        console.log("Created object URL:", objectUrl);
      }

      // Create an image element to get dimensions
      const img = new Image();

      img.onerror = (error) => {
        console.error("Error loading image:", error);
        console.log("Image URL that failed:", objectUrl || imageUrl);
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };

      img.onload = () => {
        console.log("Image loaded successfully");
        console.log("Original image dimensions:", img.width, "x", img.height);

        // Create a canvas to resize the image if needed
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        console.log("Canvas created");

        // Set maximum dimensions
        const maxWidth = 1200;
        const maxHeight = 1200;

        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        // Resize image
        canvas.width = width;
        canvas.height = height;
        console.log("Canvas dimensions set to:", width, "x", height);

        try {
          ctx.drawImage(img, 0, 0, width, height);
          console.log("Image drawn to canvas successfully");
        } catch (error) {
          console.error("Error drawing image to canvas:", error);
        }

        console.log("Attempting to create blob from canvas");
        // Convert to blob and upload
        canvas.toBlob(
          (blob) => {
            console.log("Blob created successfully:", blob);
            console.log("Blob size:", blob ? blob.size : "No blob created");

            // Clean up the object URL if we created one
            if (objectUrl) {
              URL.revokeObjectURL(objectUrl);
            }

            this.uploadImage(productId, blob);
          },
          "image/jpeg",
          0.9
        );
      };

      console.log("Setting image source:", objectUrl || imageUrl);
      img.src = objectUrl || imageUrl;
    },

    updateImageDimension(product) {
      if (product.image?.imageUrl) {
        const img = new Image();
        img.onload = () => {
          product.imageWidth = img.width;
          product.imageHeight = img.height;
        };
        img.src = product.image.imageUrl;
      }
    },

    sortProductsByDate(products) {
      // Check if any products have a valid creation date (not the default 0001-01-01T00:00:00)
      const hasValidDates = products.some(p => p.createdAt && p.createdAt !== '0001-01-01T00:00:00');
      
      // If we have valid dates, sort by them (oldest first)
      if (hasValidDates) {
        const sortedProducts = [...products].sort((a, b) => {
          // Use the full ISO string for comparison to preserve millisecond precision
          const dateA = a.createdAt && a.createdAt !== '0001-01-01T00:00:00' ? a.createdAt : '9999-12-31T23:59:59.9999999';
          const dateB = b.createdAt && b.createdAt !== '0001-01-01T00:00:00' ? b.createdAt : '9999-12-31T23:59:59.9999999';
          
          // Direct string comparison works for ISO dates and preserves millisecond precision
          return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
        });
        
        return sortedProducts;
      }
      
      // Otherwise return the original array
      return products;
    },
  },
};
</script>

<style lang="scss" scoped>
.onboarding-product-images {
  position: relative;
  width: 100%;
  min-height: 300px;
  /* Ensure minimum height for the container */

  .loading-overlay {
    position: fixed;
    /* Change from absolute to fixed */
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    /* Use viewport height */
    background-color: rgba(255, 255, 255, 0.8);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    /* Increase z-index to ensure it's on top */

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin-bottom: 10px;
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }

      100% {
        transform: rotate(360deg);
      }
    }
  }

  .no-products {
    text-align: center;
    padding: 40px;
    background-color: #f9f9f9;
    border-radius: 8px;
    margin: 20px 0;

    p {
      font-size: 16px;
      color: #666;
    }
  }

  .filter-wrapper {
    margin-bottom: 20px;

    .search-input {
      position: relative;
      width: 100%;

      .search-icon {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        color: #aaa;
      }

      input.product-filter {
        width: 100%;
        padding: 10px 40px 10px 35px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 16px;

        &:focus {
          outline: none;
          border-color: #3498db;
        }
      }

      .clear-button {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: #aaa;
        cursor: pointer;
        font-size: 16px;

        &:hover {
          color: #666;
        }
      }
    }
  }

  .results-count {
    margin-bottom: 15px;
    font-size: 14px;
    color: #666;
    display: flex;
    align-items: center;

    .clear-filter-btn {
      margin-left: 10px;
      background: none;
      border: none;
      cursor: pointer;
      text-decoration: underline;
      padding: 0;
      font-size: 14px;
    }
  }

  .products-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;

    @media (min-width: 768px) {
      grid-template-columns: repeat(3, 1fr);
    }

    @media (min-width: 992px) {
      grid-template-columns: repeat(4, 1fr);
    }

    @media (min-width: 1200px) {
      grid-template-columns: repeat(5, 1fr);
    }

    .product-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
      background-color: white;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

      .product-image {
        position: relative;
        cursor: pointer;
        background-color: #f9f9f9;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
        /* Make images perfectly square using aspect ratio */
        aspect-ratio: 1 / 1;
        height: auto;
        width: 100%;

        &.dragging {
          background-color: #e3f2fd;
          border: 2px dashed #2196f3;
        }

        .image-container {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
          }
        }

        .upload-placeholder {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 20px;
          text-align: center;
          width: 100%;
          height: 100%;

          i {
            font-size: 40px;
            color: #bbb;
            margin-bottom: 10px;
          }

          p {
            color: #777;
            font-size: 14px;
            margin: 0;
            width: 100%;
            text-align: center;
          }
        }

        .file-input {
          display: none;
        }
      }

      .product-info {
        padding: 10px;

        h3 {
          margin: 0 0 5px;
          font-size: 16px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .product-price {
          margin: 0 0 5px;
          font-weight: bold;
          font-size: 14px;
        }

        .product-description {
          margin: 0;
          font-size: 12px;
          color: #666;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          line-height: 1.3;
        }
      }
    }
  }
}
</style>

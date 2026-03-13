<template>
  <div class="image-uploader">
    <h4 class="section-title">Bilder</h4>

    <div
      class="drop-zone"
      :class="{ dragging: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop($event)"
      @click="triggerFileInput"
    >
      <input
        ref="fileInput"
        type="file"
        class="hidden-file-input"
        accept="image/jpeg,image/png,image/gif"
        @change="handleFileSelect"
      />
      <div v-if="isUploading" class="upload-progress">
        <span class="spinner"></span>
        <span>Laster opp...</span>
      </div>
      <div v-else class="drop-placeholder">
        <span class="material-icons">cloud_upload</span>
        <span>Dra og slipp bilde her, eller klikk for a velge</span>
        <span class="file-types">JPG, PNG, GIF - maks 5MB</span>
      </div>
    </div>

    <div v-if="images.length > 0" class="image-gallery">
      <div v-for="image in images" :key="image.emailCampaignImageId" class="image-thumb">
        <img :src="image.blobUrl" :alt="image.originalFileName" />
        <div class="image-overlay">
          <button class="delete-btn" @click.stop="deleteImage(image)" :disabled="isDeletingId === image.emailCampaignImageId">
            <span class="material-icons">delete</span>
          </button>
        </div>
        <span class="image-name">{{ image.originalFileName }}</span>
      </div>
    </div>

    <p v-if="images.length > 0" class="helper-text">
      Disse bildene er tilgjengelige for AI-generering. Nevn bildene i prompten for a inkludere dem.
    </p>
  </div>
</template>

<script>
export default {
  name: 'EmailImageUploader',
  props: {
    storeId: { type: Number, required: true },
    campaignId: { type: String, required: true },
    images: { type: Array, default: () => [] }
  },
  data() {
    return {
      isDragging: false,
      isUploading: false,
      isDeletingId: null
    }
  },
  methods: {
    triggerFileInput() {
      this.$refs.fileInput.click()
    },
    handleDrop(event) {
      this.isDragging = false
      const file = event.dataTransfer.files[0]
      if (file) this.uploadFile(file)
    },
    handleFileSelect(event) {
      const file = event.target.files[0]
      if (file) this.uploadFile(file)
      this.$refs.fileInput.value = ''
    },
    async uploadFile(file) {
      if (!file.type.match(/image\/(jpeg|png|gif)/)) {
        alert('Kun JPG, PNG og GIF er stottet')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Filen er for stor. Maks 5MB.')
        return
      }

      this.isUploading = true
      try {
        const image = await this._emailCampaignService.UploadImage(this.storeId, this.campaignId, file)
        this.$emit('image-uploaded', image)
      } catch (err) {
        console.error('Upload error:', err)
        alert('Feil ved opplasting av bilde')
      } finally {
        this.isUploading = false
      }
    },
    async deleteImage(image) {
      if (!confirm('Slette dette bildet?')) return

      this.isDeletingId = image.emailCampaignImageId
      try {
        await this._emailCampaignService.DeleteImage(this.storeId, this.campaignId, image.emailCampaignImageId)
        this.$emit('image-deleted', image.emailCampaignImageId)
      } catch (err) {
        console.error('Delete error:', err)
        alert('Feil ved sletting av bilde')
      } finally {
        this.isDeletingId = null
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.image-uploader {
  .section-title {
    font-size: 0.95em;
    font-weight: 600;
    color: #292c34;
    margin: 0 0 12px 0;
  }

  .drop-zone {
    border: 2px dashed #e2e8f0;
    border-radius: 8px;
    padding: 24px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-bottom: 16px;

    &:hover, &.dragging {
      border-color: #1bb776;
      background: #f0fdf4;
    }

    .drop-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: #64748b;

      .material-icons {
        font-size: 2em;
        color: #94a3b8;
      }

      .file-types {
        font-size: 0.8em;
        color: #94a3b8;
      }
    }

    .upload-progress {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: #1bb776;

      .spinner {
        width: 20px;
        height: 20px;
        border: 3px solid #e2e8f0;
        border-top-color: #1bb776;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
    }
  }

  .hidden-file-input {
    display: none;
  }

  .image-gallery {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 12px;
  }

  .image-thumb {
    position: relative;
    width: 100px;
    display: flex;
    flex-direction: column;

    img {
      width: 100px;
      height: 100px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .image-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100px;
      height: 100px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    &:hover .image-overlay {
      opacity: 1;
    }

    .delete-btn {
      background: white;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;

      .material-icons {
        color: #ef4444;
        font-size: 1.2em;
      }

      &:hover {
        background: #fee2e2;
      }
    }

    .image-name {
      font-size: 0.7em;
      color: #94a3b8;
      margin-top: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .helper-text {
    font-size: 0.8em;
    color: #64748b;
    font-style: italic;
    margin: 0;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

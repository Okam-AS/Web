<template>
  <div>
    <div class="step-body">
      <div class="logo-upload-container">
        <div class="logo-upload-area" :class="{
          'dragging': isDragging,
          'has-logo': storeLogoUrl
        }" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop($event); isDragging = false" @click.stop="triggerFileInput">
          <input ref="fileInput" type="file" class="hidden-file-input" accept="image/jpeg,image/png"
            @change="handleFileSelect">
          <div v-if="isUploading" class="loading-overlay">
            <div class="spinner" />
            <span>Laster opp...</span>
          </div>
          <div v-else-if="storeLogoUrl" class="logo-preview">
            <img :src="storeLogoUrl" alt="Store Logo" @error="storeLogoUrl = null">
          </div>
          <div v-else class="upload-placeholder">
            <span class="upload-icon">↑</span>
            <span>Dra og slipp logo her<br>eller klikk for å velge fil</span>
          </div>
        </div>

        <div class="logo-guidelines">
          <h3>Tips for en god logo:</h3>
          <ul>
            <li>Bruk en kvadratisk eller rund logo for best resultat</li>
            <li>Anbefalt størrelse: minst 500x500 piksler</li>
            <li>Filformater: JPG eller PNG</li>
            <li>Maksimal filstørrelse: 5MB</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import $config from '~/core/helpers/configuration'

export default {
  name: 'OnboardingLogoUpload',
  props: {
    storeId: {
      type: Number,
      required: false,
      default: null
    }
  },
  data() {
    return {
      storeLogoUrl: null,
      isUploading: false,
      isDragging: false,
      originalFile: null,
      imageDimensions: null
    }
  },
  watch: {
    storeId: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          // Reset logo when store changes
          this.storeLogoUrl = null
          // Check if the store already has a logo
          this.checkForExistingLogo()
        }
      }
    }
  },
  methods: {
    triggerFileInput() {
      // Make sure the file input exists before trying to click it
      if (this.$refs.fileInput) {
        this.$refs.fileInput.click()
      }
    },
    handleDrop(event) {
      event.preventDefault()
      this.isDragging = false

      const file = event.dataTransfer.files[0]
      if (!file) {
        return
      }

      // Check file type first
      if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
        alert('Vennligst bruk et bilde i JPEG eller PNG format.')
        return
      }

      // Check file size
      if (file.size > 5 * 1024 * 1024) {
        alert('Filen er for stor. Maksimal størrelse er 5MB.')
        return
      }

      // Process the image
      this.processImage(file)
    },
    handleFileSelect(event) {
      const file = event.target.files[0]
      if (file) {
        // Check file type first
        if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
          alert('Vennligst bruk et bilde i JPEG eller PNG format.')
          return
        }

        // Check file size
        if (file.size > 5 * 1024 * 1024) {
          alert('Filen er for stor. Maksimal størrelse er 5MB.')
          return
        }

        // Process the image
        this.processImage(file)
        // Reset the file input value so the same file can be selected again if needed
        this.$refs.fileInput.value = ''
      }
    },
    processImage(file) {
      // Size check already done in handleDrop/handleFileSelect

      // Save the original file for later use
      this.originalFile = file

      // Set up image loading with error handling
      const reader = new FileReader()

      reader.onerror = (_error) => {
        // Handle FileReader error
        alert('Det oppstod en feil ved lesing av bildet. Prøv et annet bilde eller reduser størrelsen.')
      }

      reader.onload = (e) => {
        // Make sure we have valid data
        if (!e.target || !e.target.result) {
          alert('Det oppstod en feil ved lesing av bildet. Prøv et annet bilde.')
          return
        }

        const img = new Image()

        img.onerror = () => {
          alert('Det oppstod en feil ved lasting av bildet. Prøv et annet bilde.')
        }

        // Set crossOrigin to anonymous to avoid CORS issues
        img.crossOrigin = 'anonymous'

        img.onload = () => {
          try {
            // Create a canvas to handle transparent background conversion
            const canvas = document.createElement('canvas')
            
            // Make the canvas square based on the larger dimension
            const maxDimension = Math.max(img.width, img.height)
            canvas.width = maxDimension
            canvas.height = maxDimension
            
            const ctx = canvas.getContext('2d')
            
            // Detect background color by sampling corners of the image
            let backgroundColor = 'white'
            
            // Create a small temporary canvas to analyze the image
            const tempCanvas = document.createElement('canvas')
            tempCanvas.width = img.width
            tempCanvas.height = img.height
            const tempCtx = tempCanvas.getContext('2d')
            tempCtx.drawImage(img, 0, 0)
            
            // Sample pixels from corners to determine background color
            const corners = [
              { x: 0, y: 0 }, // top-left
              { x: img.width - 1, y: 0 }, // top-right
              { x: 0, y: img.height - 1 }, // bottom-left
              { x: img.width - 1, y: img.height - 1 } // bottom-right
            ]
            
            // Get the most common color from the corners
            const colorCounts = {}
            let maxCount = 0
            let dominantColor = 'white'
            
            corners.forEach(corner => {
              try {
                const pixel = tempCtx.getImageData(corner.x, corner.y, 1, 1).data
                // Skip fully transparent pixels
                if (pixel[3] < 10) {
                  return
                }
                
                const color = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`
                colorCounts[color] = (colorCounts[color] || 0) + 1
                
                if (colorCounts[color] > maxCount) {
                  maxCount = colorCounts[color]
                  dominantColor = color
                }
              } catch (e) {
                // Ignore errors from getImageData (can happen with CORS)
              }
            })
            
            // Use the dominant color if found, otherwise use white
            backgroundColor = maxCount > 0 ? dominantColor : 'white'
            
            // Fill with detected background color
            ctx.fillStyle = backgroundColor
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            
            // Center the image on the canvas
            const xOffset = (maxDimension - img.width) / 2
            const yOffset = (maxDimension - img.height) / 2
            
            // Draw the image centered on the background
            ctx.drawImage(img, xOffset, yOffset)
            
            // Get the modified image with background
            const backgroundImage = new Image()
            backgroundImage.onload = () => {
              // The image is already square with proper background, upload directly
              this.resizeAndUploadSquare(backgroundImage, file.type)
            }
            backgroundImage.src = canvas.toDataURL(file.type)
          } catch (_error) {
            alert('Det oppstod en feil ved behandling av bildet. Prøv et annet bilde eller reduser størrelsen.')
          }
        }

        // Set source to load the image - do this last after all handlers are set up
        img.src = e.target.result
      }

      // Start reading the file
      try {
        reader.readAsDataURL(file)
      } catch (_error) {
        alert('Det oppstod en feil ved lesing av filen. Prøv et annet bilde eller reduser størrelsen.')
      }
    },
    resizeAndUploadSquare(img, fileType) {
      // Create a canvas for resizing the square image to 500x500
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      // Set the canvas size to 500x500
      canvas.width = 500
      canvas.height = 500

      // Draw the image (already square) to fit the 500x500 canvas
      ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, 500, 500)

      // Convert to blob and upload
      canvas.toBlob((blob) => {
        this.uploadLogo(blob)
      }, fileType)
    },
    uploadLogo(blob) {
      this.isUploading = true

      const formData = new FormData()
      formData.append('Image', blob, 'logo.png')
      formData.append('NumberId', this.storeId.toString())

      // Get the user's token for authentication
      const token = this.$store.state.currentUser.token

      // Use axios for the web implementation
      axios.post(`${$config.okamApiBaseUrl}/stores/logo`, formData, {
        headers: {
          Authorization: `Bearer ${token}`
          // Let axios set the Content-Type header with the correct boundary
        }
      })
        .then((_response) => {
          // Update the store data to get the latest logo URL
          this.checkForExistingLogo()
          this.isUploading = false
          this.$emit('logo-updated')
        })
        .catch((_error) => {
          this.isUploading = false
          alert('Feil ved opplasting av logo. Vennligst prøv igjen.')
        })
    },
    removeLogo() {
      this.storeLogoUrl = null
      // Note: We're not actually deleting the logo from the server,
      // just removing it from the UI. If needed, we could add an API call
      // to delete the logo from the server.
    },
    checkForExistingLogo() {
      // Get store data using the StoreService
      this._storeService.Get(this.storeId).then((store) => {
        // If the store has a logoUrl property, try to display it
        if (store.logoUrl) {
          // Use the same URL format as in the NativeScript app
          const timestamp = new Date().getTime()
          this.storeLogoUrl = `https://okamapistorage.blob.core.windows.net/storelogo/${this.storeId}?v=${timestamp}`
          this.$emit('has-logo', true)
        } else {
          this.storeLogoUrl = null
          this.$emit('has-logo', false)
        }
      })
        .catch((_error) => {
          this.storeLogoUrl = null
          this.$emit('has-logo', false)
        })
    }
  }
}
</script>

<style lang="scss" scoped>
.step-body {
  min-height: 250px;
  margin-bottom: 1.5rem;
}

.logo-upload-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.logo-upload-area {
  width: 250px;
  height: 250px;
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;

  &:hover {
    border-color: #292c34;
    background-color: #f8f9fa;
  }

  &.dragging {
    border-color: #292c34;
    background-color: #f0f2f5;
  }

  &.has-logo {
    border-style: solid;
    border-color: #e2e8f0;
  }
}

.hidden-file-input {
  position: absolute;
  width: 0.1px;
  height: 0.1px;
  opacity: 0;
  overflow: hidden;
  z-index: -1;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: #94a3b8;

  .upload-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: #cbd5e1;
  }

  span {
    font-size: 0.875rem;
    line-height: 1.4;
  }
}

.logo-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    cursor: pointer;
  }
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #292c34;

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(41, 44, 52, 0.2);
    border-radius: 50%;
    border-top-color: #292c34;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
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

.logo-hint {
  margin-top: 0.5rem;
  text-align: center;
  font-size: 0.875rem;
  color: #64748b;
}

.logo-guidelines {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  width: 100%;
  max-width: 500px;

  h3 {
    font-size: 1rem;
    margin-top: 0;
    margin-bottom: 0.75rem;
    color: #292c34;
  }

  ul {
    margin: 0;
    padding-left: 1.5rem;

    li {
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      color: #64748b;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}
</style>

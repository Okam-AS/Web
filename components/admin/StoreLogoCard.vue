<template>
  <div class="store-card store-logo-card">
    <div v-if="toast.show" class="toast" :class="`toast--${toast.type}`">
      {{ toast.message }}
    </div>

    <div class="store-card__header">
      <h3 class="store-logo-card__title">{{ $i('logo_cardTitle') }}</h3>
    </div>

    <div
      class="store-logo-card__dropzone"
      :class="{ 'is-dragging': isDragging, 'has-logo': !!logoUrl }"
      @click="triggerFileInput"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png"
        class="store-logo-card__input"
        @change="onFileChange"
      >
      <div v-if="isUploading" class="store-logo-card__status">{{ $i('logo_uploading') }}</div>
      <img v-else-if="logoUrl" :src="logoUrl" class="store-logo-card__preview" alt="" @error="logoUrl = null">
      <div v-else class="store-logo-card__placeholder">
        <span class="store-logo-card__icon">↑</span>
        <span>{{ $i('logo_dropHint') }}</span>
      </div>
    </div>

    <ul class="store-logo-card__tips">
      <li>{{ $i('logo_tipSquare') }}</li>
      <li>{{ $i('logo_tipFormats') }}</li>
      <li>{{ $i('logo_tipMaxSize') }}</li>
    </ul>
  </div>
</template>

<script>
import axios from 'axios'
import $config from '~/core/helpers/configuration'
import { validateLogoFile } from '~/utils/logo'

export default {
  name: 'StoreLogoCard',
  props: {
    storeId: { type: [Number, String], required: true }
  },
  data: () => ({
    logoUrl: null,
    isUploading: false,
    isDragging: false,
    toast: { show: false, message: '', type: 'success' }
  }),
  watch: {
    storeId: { immediate: true, handler () { this.fetchCurrentLogo() } }
  },
  methods: {
    triggerFileInput () { if (this.$refs.fileInput) this.$refs.fileInput.click() },
    onDrop (e) {
      this.isDragging = false
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]
      if (file) this.handleFile(file)
    },
    onFileChange (e) {
      const file = e.target.files && e.target.files[0]
      if (file) this.handleFile(file)
    },
    handleFile (file) {
      const { ok, errorKey } = validateLogoFile(file)
      if (!ok) { this.showToast(this.$i(errorKey), 'error'); return }
      this.cropAndUpload(file)
    },
    cropAndUpload (file) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const img = new Image()
        img.onload = () => {
          const size = 500
          const canvas = document.createElement('canvas')
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')
          const side = Math.min(img.width, img.height)
          const sx = (img.width - side) / 2
          const sy = (img.height - side) / 2
          ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
          canvas.toBlob((blob) => this.upload(blob), 'image/png')
        }
        img.src = ev.target.result
      }
      reader.readAsDataURL(file)
    },
    upload (blob) {
      this.isUploading = true
      const formData = new FormData()
      formData.append('Image', blob, 'logo.png')
      formData.append('NumberId', this.storeId.toString())
      const token = this.$store.state.currentUser && this.$store.state.currentUser.token
      axios.post(`${$config.okamApiBaseUrl}/stores/logo`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(() => {
        this.isUploading = false
        this.fetchCurrentLogo()
        this.showToast(this.$i('logo_updated'), 'success')
        this.$emit('logo-updated')
      }).catch(() => {
        this.isUploading = false
        this.showToast(this.$i('logo_errorUpload'), 'error')
      })
    },
    fetchCurrentLogo () {
      if (!this.storeId) return
      this._storeService.Get(this.storeId).then((store) => {
        if (store && store.logoUrl) {
          // Use the server-provided logoUrl (authoritative per deployment) rather than a hardcoded
          // NO storage account, so the preview also works on CH/test deployments. Append a
          // cache-buster so the freshly uploaded logo isn't served stale from cache.
          const ts = new Date().getTime()
          const sep = store.logoUrl.includes('?') ? '&' : '?'
          this.logoUrl = `${store.logoUrl}${sep}v=${ts}`
        } else {
          this.logoUrl = null
        }
      }).catch(() => { this.logoUrl = null })
    },
    showToast (message, type = 'success') {
      this.toast = { show: true, message, type }
      setTimeout(() => { this.toast.show = false }, 3000)
    }
  }
}
</script>

<style lang="scss" scoped>
.store-logo-card__title { font-size: 1.1em; font-weight: 600; color: #292c34; margin: 0 0 12px; }
.store-logo-card__dropzone {
  position: relative; display: flex; align-items: center; justify-content: center;
  min-height: 180px; border: 2px dashed #e2e8f0; border-radius: 12px; cursor: pointer;
  background: #f8f9fa; transition: all 0.3s ease; overflow: hidden;
}
.store-logo-card__dropzone:hover, .store-logo-card__dropzone.is-dragging { border-color: #1bb776; background: #f1f5f9; }
.store-logo-card__input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.store-logo-card__preview { max-width: 100%; max-height: 180px; object-fit: contain; }
.store-logo-card__placeholder { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #64748b; }
.store-logo-card__icon { font-size: 2em; color: #94a3b8; }
.store-logo-card__status { color: #1bb776; font-weight: 600; }
.store-logo-card__tips { margin: 12px 0 0; padding-left: 18px; color: #64748b; font-size: 0.85em; }
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 14px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  z-index: 1100;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}
.toast--success { background: #1bb776; color: white; }
.toast--error { background: #ef4444; color: white; }
</style>

<template>
  <div v-if="campaign" class="campaign-editor-overlay" @click.self="$emit('close')">
    <div class="editor-modal">
      <!-- Header -->
      <div class="modal-header">
        <h2>Rediger kampanje</h2>
        <button class="close-btn" @click="$emit('close')">
          <span class="material-icons">close</span>
        </button>
      </div>

      <!-- Scrollable body -->
      <div class="modal-body">
        <!-- Campaign name -->
        <div class="form-group">
          <label>Kampanjenavn</label>
          <input
            v-model="editName"
            type="text"
            placeholder="F.eks. Varkampanje 2026"
            @blur="saveField"
          />
        </div>

        <!-- Subject -->
        <div class="form-group">
          <label>Emne</label>
          <input
            v-model="editSubject"
            type="text"
            placeholder="Emnelinjen mottakerne ser"
            @blur="saveField"
          />
        </div>

        <!-- Recipients presets -->
        <div class="form-group">
          <label>Mottakere</label>
          <div class="recipient-presets">
            <label
              v-for="preset in presets"
              :key="preset.id"
              class="preset-option"
              :class="{ selected: selectedPreset === preset.id }"
            >
              <input
                type="radio"
                :value="preset.id"
                v-model="selectedPreset"
                @change="onPresetChange"
              />
              <div class="preset-text">
                <span class="preset-label">{{ preset.label }}</span>
                <span class="preset-description">{{ preset.description }}</span>
              </div>
              <span class="preset-count">
                <span v-if="preset.loading" class="mini-spinner" />
                <template v-else>({{ preset.count }})</template>
              </span>
            </label>

            <!-- Custom / test option -->
            <label
              class="preset-option"
              :class="{ selected: selectedPreset === 'custom' }"
            >
              <input
                type="radio"
                value="custom"
                v-model="selectedPreset"
                @change="onPresetChange"
              />
              <div class="preset-text">
                <span class="preset-label">Egendefinert</span>
                <span class="preset-description">Send til en enkelt e-postadresse (for testing)</span>
              </div>
              <span class="preset-count">(1)</span>
            </label>
            <div v-if="selectedPreset === 'custom'" class="custom-email-input">
              <input
                v-model="customEmail"
                type="email"
                placeholder="test@epost.no"
                @blur="onPresetChange"
                @keyup.enter="onPresetChange"
              />
            </div>
          </div>
        </div>

        <!-- Images -->
        <div class="form-group">
          <label>Bilder <span class="optional-tag">valgfritt</span></label>
          <EmailImageUploader
            :store-id="storeId"
            :campaign-id="campaign.emailCampaignId"
            :images="campaign.images || []"
            @image-uploaded="onImageUploaded"
            @image-deleted="onImageDeleted"
          />
        </div>

        <!-- AI generation -->
        <div class="form-group">
          <label>Beskriv hva e-posten skal handle om</label>
          <div class="merge-tag-hint">
            <span class="material-icons">info</span>
            <span>Tilgjengelige merge-tags: <code>{fornavn}</code>, <code>{saldo}</code>, <code>{antall_bestillinger}</code>, <code>{total_brukt}</code></span>
          </div>
          <textarea
            v-model="aiPrompt"
            placeholder="Skriv om var nye varmeny og at medlemmer far 20% rabatt denne uken..."
            rows="4"
            :disabled="isGenerating"
          />
          <button
            class="generate-btn"
            :disabled="!aiPrompt.trim() || isGenerating"
            @click="generateEmail"
          >
            <span v-if="isGenerating" class="spinner" />
            <span v-else class="material-icons">auto_awesome</span>
            {{ isGenerating ? 'Genererer...' : (campaign.htmlContent ? 'Regenerer e-post' : 'Generer e-post') }}
          </button>
        </div>

        <!-- Preview -->
        <div v-if="campaign.htmlContent" class="form-group">
          <label>Forhandsvisning</label>
          <div class="preview-frame-wrapper">
            <iframe
              ref="previewFrame"
              class="preview-frame"
              :srcdoc="campaign.htmlContent"
              sandbox="allow-same-origin"
              @load="adjustPreviewHeight"
            />
          </div>
        </div>

        <!-- Test send -->
        <div v-if="campaign.htmlContent" class="form-group">
          <label>Test</label>
          <div class="test-send-row">
            <input
              v-model="testEmail"
              type="email"
              placeholder="din@epost.no"
              :disabled="isSendingTest"
            />
            <button
              class="test-send-btn"
              :disabled="!testEmail || isSendingTest"
              @click="sendTest"
            >
              {{ isSendingTest ? 'Sender...' : 'Send test' }}
            </button>
          </div>
          <p v-if="testResult" class="test-result" :class="{ success: testResult.success, error: !testResult.success }">
            {{ testResult.message }}
          </p>
        </div>

        <!-- Send status (after sending) -->
        <div v-if="campaign.status === 'Sending' || campaign.status === 'Sent' || campaign.status === 'Failed'" class="send-status-section">
          <div class="status-message" :class="statusClass">
            <span class="material-icons">{{ statusIcon }}</span>
            <span>{{ statusMessage }}</span>
          </div>
        </div>
      </div>

      <!-- Footer with send button -->
      <div class="modal-footer">
        <button
          v-if="campaign.status === 'Draft'"
          class="send-btn"
          :disabled="!canSend || isSending"
          @click="startSending"
        >
          <span v-if="isSending" class="spinner" />
          <template v-else>
            Send til {{ recipientCount }} mottakere
          </template>
        </button>
        <p v-if="campaign.status === 'Draft' && !canSend" class="send-hint">
          Trenger emne, innhold og mottakere for a sende
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import EmailImageUploader from './EmailImageUploader.vue'

export default {
  name: 'EmailCampaignEditor',
  components: {
    EmailImageUploader
  },
  props: {
    campaign: { type: Object, default: null },
    storeId: { type: Number, required: true }
  },
  data() {
    return {
      editName: '',
      editSubject: '',
      selectedPreset: 'all',
      aiPrompt: '',
      isGenerating: false,
      testEmail: '',
      testResult: null,
      isSendingTest: false,
      isSending: false,
      recipientCount: 0,
      customEmail: '',
      presets: [
        { id: 'all', label: 'Alle medlemmer', description: 'Alle registrerte lojalitetsmedlemmer', filter: {}, count: 0, loading: true },
        { id: 'active', label: 'Aktive kunder', description: 'Bestilt noe de siste 30 dagene', filter: { maxDaysSinceLastOrder: 30 }, count: 0, loading: true },
        { id: 'inactive', label: 'Inaktive kunder', description: 'Ikke bestilt noe pa over 60 dager', filter: { minDaysSinceLastOrder: 60 }, count: 0, loading: true },
        { id: 'new', label: 'Nye medlemmer', description: 'Registrert de siste 30 dagene', filter: { registeredAfter: this.thirtyDaysAgo() }, count: 0, loading: true }
      ]
    }
  },
  computed: {
    canSend() {
      return !!this.editSubject.trim() && !!this.campaign.htmlContent && this.recipientCount > 0
    },
    statusClass() {
      return {
        sending: this.campaign.status === 'Sending',
        sent: this.campaign.status === 'Sent',
        failed: this.campaign.status === 'Failed'
      }
    },
    statusIcon() {
      const icons = { Sending: 'hourglass_top', Sent: 'check_circle', Failed: 'error' }
      return icons[this.campaign.status] || 'info'
    },
    statusMessage() {
      const messages = {
        Sending: 'Kampanjen sendes...',
        Sent: 'Kampanjen er sendt!',
        Failed: 'Sending feilet. Kontakt support.'
      }
      return messages[this.campaign.status] || ''
    }
  },
  watch: {
    campaign: {
      immediate: true,
      handler(val, oldVal) {
        if (val) {
          this.editName = val.name || ''
          this.editSubject = val.subject || ''
          // Only detect preset when opening a different campaign, not on every save
          const isNewCampaign = !oldVal || val.emailCampaignId !== oldVal.emailCampaignId
          if (isNewCampaign) {
            this.detectPresetFromFilter(val.filterCriteria)
            this.fetchAllPresetCounts()
          }
        }
      }
    }
  },
  methods: {
    thirtyDaysAgo() {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      return d.toISOString().split('T')[0]
    },

    detectPresetFromFilter(filter) {
      if (!filter || Object.keys(filter).length === 0) {
        this.selectedPreset = 'all'
        return
      }
      if (filter.customEmail) {
        this.selectedPreset = 'custom'
        this.customEmail = filter.customEmail
      } else if (filter.maxDaysSinceLastOrder && !filter.minDaysSinceLastOrder) {
        this.selectedPreset = 'active'
      } else if (filter.minDaysSinceLastOrder && !filter.maxDaysSinceLastOrder) {
        this.selectedPreset = 'inactive'
      } else if (filter.registeredAfter) {
        this.selectedPreset = 'new'
      } else {
        this.selectedPreset = 'all'
      }
    },

    async fetchAllPresetCounts() {
      // Update the 'new' preset filter with fresh date
      const newPreset = this.presets.find(p => p.id === 'new')
      if (newPreset) {
        newPreset.filter = { registeredAfter: this.thirtyDaysAgo() }
      }

      const promises = this.presets.map(async (preset) => {
        try {
          const result = await this._emailCampaignService.FilterMembers(this.storeId, preset.filter)
          preset.count = result.totalCount
        } catch {
          preset.count = 0
        } finally {
          preset.loading = false
        }
      })

      await Promise.all(promises)

      // Set initial recipient count from selected preset
      if (this.selectedPreset === 'custom') {
        this.recipientCount = this.customEmail.trim() ? 1 : 0
      } else {
        const selected = this.presets.find(p => p.id === this.selectedPreset)
        if (selected) {
          this.recipientCount = selected.count
        }
      }
    },

    onPresetChange() {
      if (this.selectedPreset === 'custom') {
        this.recipientCount = this.customEmail.trim() ? 1 : 0
        const filter = this.customEmail.trim()
          ? { customEmail: this.customEmail.trim() }
          : {}
        this._emailCampaignService.UpdateCampaign(
          this.storeId, this.campaign.emailCampaignId,
          { FilterCriteria: filter }
        ).then(updated => {
          this.$emit('updated', updated)
        }).catch(() => {})
        return
      }

      const preset = this.presets.find(p => p.id === this.selectedPreset)
      if (!preset) return

      this.recipientCount = preset.count

      // Save filter to campaign
      this._emailCampaignService.UpdateCampaign(
        this.storeId, this.campaign.emailCampaignId,
        { FilterCriteria: preset.filter }
      ).then(updated => {
        this.$emit('updated', updated)
      }).catch(() => {})
    },

    async saveField() {
      if (!this.campaign) return

      const changes = {}
      if (this.editName !== this.campaign.name) changes.Name = this.editName
      if (this.editSubject !== this.campaign.subject) changes.Subject = this.editSubject

      if (Object.keys(changes).length === 0) return

      try {
        const updated = await this._emailCampaignService.UpdateCampaign(
          this.storeId, this.campaign.emailCampaignId, changes
        )
        this.$emit('updated', updated)
      } catch (err) {
        console.error('Save error:', err)
      }
    },

    async generateEmail() {
      if (!this.aiPrompt.trim() || this.isGenerating) return

      const userPrompt = this.aiPrompt.trim()
      this.isGenerating = true

      try {
        let result
        if (this.campaign.htmlContent) {
          result = await this._emailCampaignService.RefineEmail(this.storeId, this.campaign.emailCampaignId, userPrompt)
        } else {
          result = await this._emailCampaignService.GenerateEmail(this.storeId, this.campaign.emailCampaignId, userPrompt)
        }

        this.campaign.htmlContent = result.htmlContent
        this.$emit('updated', { ...this.campaign, htmlContent: result.htmlContent })
      } catch (err) {
        console.error('AI generation error:', err)
        alert('Feil ved generering av e-post. Vennligst prov igjen.')
      } finally {
        this.isGenerating = false
      }
    },

    adjustPreviewHeight() {
      const iframe = this.$refs.previewFrame
      if (!iframe || !iframe.contentDocument || !iframe.contentDocument.body) return
      const height = iframe.contentDocument.body.scrollHeight
      iframe.style.height = Math.min(Math.max(height + 40, 200), 500) + 'px'
    },

    async sendTest() {
      this.isSendingTest = true
      this.testResult = null
      try {
        const result = await this._emailCampaignService.SendTestEmail(this.storeId, this.campaign.emailCampaignId, this.testEmail)
        this.testResult = result
      } catch {
        this.testResult = { success: false, message: 'Feil ved sending av test-epost' }
      } finally {
        this.isSendingTest = false
      }
    },

    async startSending() {
      if (!confirm(`Er du sikker pa at du vil sende e-post til ${this.recipientCount} mottakere?`)) return

      this.isSending = true
      try {
        await this._emailCampaignService.StartSending(this.storeId, this.campaign.emailCampaignId)
        this.campaign.status = 'Sending'
        this.$emit('updated', { ...this.campaign, status: 'Sending' })
      } catch (err) {
        console.error('Send error:', err)
        alert('Feil ved start av sending')
      } finally {
        this.isSending = false
      }
    },

    onImageUploaded(image) {
      if (!this.campaign.images) this.campaign.images = []
      this.campaign.images.push(image)
    },

    onImageDeleted(imageId) {
      if (this.campaign.images) {
        this.campaign.images = this.campaign.images.filter(i => i.emailCampaignImageId !== imageId)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.campaign-editor-overlay {
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
  padding: 24px;
}

.editor-modal {
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;

  @media (max-width: 768px) {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
}

.modal-header {
  padding: 20px 32px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;

  h2 {
    font-size: 1.2em;
    font-weight: 600;
    color: #292c34;
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    color: #64748b;
    transition: all 0.3s ease;

    &:hover {
      color: #292c34;
      transform: rotate(90deg);
    }
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 28px 32px;

  @media (max-width: 768px) {
    padding: 20px 16px;
  }
}

.form-group {
  margin-bottom: 24px;

  > label {
    display: block;
    margin-bottom: 8px;
    font-size: 0.85em;
    font-weight: 600;
    color: #292c34;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .optional-tag {
    font-weight: 400;
    text-transform: none;
    color: #94a3b8;
    font-style: italic;
  }

  input[type="text"],
  input[type="email"] {
    width: 100%;
    padding: 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.95em;
    color: #292c34;
    transition: all 0.3s ease;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: #1bb776;
      box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
    }

    &::placeholder {
      color: #94a3b8;
    }
  }

  textarea {
    width: 100%;
    padding: 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.95em;
    color: #292c34;
    resize: vertical;
    font-family: inherit;
    transition: all 0.3s ease;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: #1bb776;
      box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
    }

    &::placeholder {
      color: #94a3b8;
    }

    &:disabled {
      background: #f8f9fa;
      cursor: not-allowed;
    }
  }
}

// Recipient presets
.recipient-presets {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preset-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: none;
  font-weight: 400;
  font-size: 0.95em;
  letter-spacing: 0;
  margin-bottom: 0;

  &:hover {
    border-color: #cbd5e0;
    background: #f8f9fa;
  }

  &.selected {
    border-color: #1bb776;
    background: #f0fdf4;
  }

  input[type="radio"] {
    width: 18px;
    height: 18px;
    accent-color: #1bb776;
    cursor: pointer;
    flex-shrink: 0;
  }

  .preset-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .preset-label {
    color: #292c34;
    font-weight: 500;
  }

  .preset-description {
    font-size: 0.82em;
    color: #94a3b8;
  }

  .preset-count {
    color: #64748b;
    font-size: 0.9em;
    font-weight: 600;
    flex-shrink: 0;
  }
}

.custom-email-input {
  padding: 0 16px 4px 46px;

  input {
    width: 100%;
    padding: 10px 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9em;
    color: #292c34;
    box-sizing: border-box;
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
}

// Merge tag hint
.merge-tag-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: #f0fdf4;
  border-radius: 8px;
  margin-bottom: 10px;
  font-size: 0.8em;
  color: #64748b;

  .material-icons {
    font-size: 1.2em;
    color: #1bb776;
    flex-shrink: 0;
    margin-top: 1px;
  }

  code {
    background: #e2e8f0;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 0.95em;
  }
}

// Generate button
.generate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 10px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9em;
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
    opacity: 0.6;
  }

  .material-icons {
    font-size: 1.2em;
  }
}

// Preview
.preview-frame-wrapper {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.preview-frame {
  width: 100%;
  min-height: 200px;
  border: none;
  display: block;
}

// Test send
.test-send-row {
  display: flex;
  gap: 10px;

  input {
    flex: 1;
  }

  .test-send-btn {
    padding: 12px 16px;
    background: white;
    color: #292c34;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;

    &:hover:not(:disabled) {
      background: #f8f9fa;
      border-color: #cbd5e0;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.test-result {
  margin: 10px 0 0 0;
  padding: 10px;
  border-radius: 6px;
  font-size: 0.85em;

  &.success {
    background: #d1fae5;
    color: #065f46;
  }

  &.error {
    background: #fee2e2;
    color: #991b1b;
  }
}

// Send status
.send-status-section {
  margin-bottom: 24px;

  .status-message {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px;
    border-radius: 8px;
    font-weight: 500;

    &.sending {
      background: #fef3c7;
      color: #92400e;
    }

    &.sent {
      background: #d1fae5;
      color: #065f46;
    }

    &.failed {
      background: #fee2e2;
      color: #991b1b;
    }

    .material-icons {
      font-size: 1.3em;
    }
  }
}

// Footer
.modal-footer {
  padding: 16px 32px;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
  text-align: center;

  .send-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 16px;
    background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 1em;
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
      opacity: 0.6;
    }
  }

  .send-hint {
    color: #94a3b8;
    font-size: 0.8em;
    margin: 8px 0 0 0;
  }
}

// Spinners
.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

.mini-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #e2e8f0;
  border-top-color: #1bb776;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

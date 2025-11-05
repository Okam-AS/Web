<template>
  <div class="ai-query-box">
    <div class="query-header">
      <span class="material-icons">chat</span>
      <h4>Spør Okam AI om statistikken</h4>
    </div>

    <div class="query-input-wrapper">
      <input
        v-model="query"
        type="text"
        class="query-input"
        placeholder="F.eks: 'Hvor mye tjente vi i går?', 'Når er vi mest travel?'"
        @keyup.enter="submitQuery"
        :disabled="isLoading"
      />
      <button
        class="submit-btn"
        @click="submitQuery"
        :disabled="!query.trim() || isLoading"
      >
        <span v-if="!isLoading" class="material-icons">send</span>
        <div v-else class="mini-spinner"></div>
      </button>
    </div>

    <!-- Example queries -->
    <div v-if="!hasAskedQuery" class="example-queries">
      <span class="example-label">Eksempler:</span>
      <button
        v-for="(example, index) in exampleQueries"
        :key="index"
        class="example-btn"
        @click="query = example; submitQuery()"
      >
        {{ example }}
      </button>
    </div>

    <!-- Query Response -->
    <div v-if="response" class="query-response">
      <div class="response-header">
        <div class="response-header-left">
          <span class="material-icons">smart_toy</span>
          <span class="response-label">AI-svar:</span>
        </div>
        <button class="close-btn" @click="clearResponse" title="Lukk">
          <span class="material-icons">close</span>
        </button>
      </div>
      <div class="response-content">
        {{ response }}
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="query-error">
      <span class="material-icons">error_outline</span>
      <span>{{ error }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AIQueryBox',
  props: {
    selectedStoreIds: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      query: '',
      response: null,
      error: null,
      isLoading: false,
      hasAskedQuery: false,
      exampleQueries: [
        'Hvor mye tjente vi 17. mai i fjor?',
        'Hvilken kategori selger best?',
        'Hva er gjennomsnittlig ordrestørrelse per leveringstype?',
      ],
    };
  },
  methods: {
    async submitQuery() {
      if (!this.query.trim()) return;

      this.isLoading = true;
      this.error = null;
      this.response = null;
      this.hasAskedQuery = true;

      try {
        // Use the AIService to call the chat/ask endpoint
        const result = await this._aiService.AskQuestion(
          this.query,
          this.selectedStoreIds,
          'no'
        );

        if (result && result.answer) {
          this.response = result.answer;
        } else {
          this.error = 'Kunne ikke få svar fra AI';
        }
      } catch (err) {
        console.error('AI query error:', err);
        this.error = 'Det oppstod en feil ved spørring til AI';
      } finally {
        this.isLoading = false;
      }
    },
    clearResponse() {
      this.response = null;
      this.error = null;
      this.query = '';
      this.hasAskedQuery = false;
    },
  },
};
</script>

<style scoped>
.ai-query-box {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  margin-top: 48px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.query-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.query-header .material-icons {
  font-size: 24px;
  color: #667eea;
}

.query-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.query-input-wrapper {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.query-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.query-input:focus {
  outline: none;
  border-color: #667eea;
}

.query-input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.submit-btn {
  padding: 12px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
}

.submit-btn:hover:not(:disabled) {
  background: #5568d3;
}

.submit-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.mini-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.example-queries {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.example-label {
  font-size: 12px;
  color: #999;
  margin-right: 4px;
}

.example-btn {
  font-size: 12px;
  padding: 6px 12px;
  background: #f5f5f5;
  color: #667eea;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.example-btn:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.query-response {
  margin-top: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #667eea10 0%, #764ba210 100%);
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.response-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.response-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.response-header .material-icons {
  font-size: 20px;
  color: #667eea;
}

.response-label {
  font-size: 12px;
  font-weight: 600;
  color: #667eea;
  text-transform: uppercase;
}

.close-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(102, 126, 234, 0.1);
}

.close-btn .material-icons {
  font-size: 18px;
  color: #667eea;
}

.response-content {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
}

.query-error {
  margin-top: 16px;
  padding: 12px 16px;
  background: #FFF3E0;
  border-radius: 8px;
  border-left: 4px solid #FF9800;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #F57C00;
}

.query-error .material-icons {
  font-size: 20px;
}

@media (max-width: 768px) {
  .query-input-wrapper {
    flex-direction: column;
  }

  .submit-btn {
    width: 100%;
  }

  .example-queries {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

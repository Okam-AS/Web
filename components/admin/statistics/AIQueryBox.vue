<template>
  <div class="ai-query-box">
    <div class="query-header">
      <span class="material-icons">chat</span>
      <h4>{{ $i('aIQueryBox_title') }}</h4>
    </div>

    <div class="query-input-wrapper">
      <input
        v-model="query"
        type="text"
        class="query-input"
        :placeholder="$i('aIQueryBox_inputPlaceholder')"
        data-test="ai-query-input"
        @keyup.enter="submitQuery"
      >
      <button
        class="submit-btn"
        :disabled="!query.trim()"
        data-test="ai-query-send"
        @click="submitQuery"
      >
        <span class="material-icons">send</span>
      </button>
    </div>

    <!-- Example queries -->
    <div class="example-queries">
      <span class="example-label">{{ $i('aIQueryBox_examplesLabel') }}</span>
      <button
        v-for="(example, index) in exampleQueries"
        :key="index"
        class="example-btn"
        @click="query = example; submitQuery()"
      >
        {{ example }}
      </button>
    </div>

    <p class="query-handoff">
      {{ $i('aIQueryBox_handoff') }}
    </p>
  </div>
</template>

<script>
// THE BOX NO LONGER ANSWERS — IT HANDS OVER.
//
// It used to call `_aiService.AskQuestion(query, storeIds, 'no')` and render `result.answer`, and
// that had two defects, one of them silent and total:
//
//  1. `result.answer` IS ALWAYS UNDEFINED. The API serialises with Newtonsoft and registers no
//     contract resolver (`Helpers/ServiceCollectionExtensions.cs:167-171`), so ASP.NET Core's
//     `DefaultContractResolver` preserves PascalCase and `ChatAskResponseModel.Answer` arrives as
//     `Answer`. `RequestService.TryParseResponse` hands the body through untouched. So this box
//     took the `else` branch on EVERY successful turn and showed "Kunne ikke få svar fra AI" for an
//     answer it had actually received.
//  2. The `'no'` was a hard-coded literal, so an English or German operator was answered in
//     Norwegian regardless of the locale they had chosen in the sidebar.
//
// Both are fixed by not answering here. `/admin/assistant` owns the conversation, the store scope,
// the basis drawer and the approval surface; this box is the doorway on the statistics page, and a
// second half-implementation of the same call is exactly what went stale. The question rides over
// in the query string and the page asks it.
export default {
  name: 'AIQueryBox',
  props: {
    selectedStoreIds: {
      type: Array,
      default: () => []
    }
  },
  data () {
    return {
      query: ''
    };
  },
  computed: {
    exampleQueries () {
      return [
        this.$i('aIQueryBox_example1'),
        this.$i('aIQueryBox_example2'),
        this.$i('aIQueryBox_example3')
      ];
    }
  },
  methods: {
    submitQuery () {
      const question = this.query.trim();
      if (!question) { return; }
      const query = { q: question };
      // The scope the operator had already narrowed the board to travels with the question, so the
      // answer is about the same stores the numbers above it were. Without it the assistant would
      // silently widen to every store they administer and answer a different question.
      if (this.selectedStoreIds.length) {
        query.stores = this.selectedStoreIds.join(',');
      }
      // `push`, not `replace`: the operator came from the statistics board and «back» should return
      // them to it.
      const navigation = this.$router.push({ path: '/admin/assistant', query });
      if (navigation && typeof navigation.catch === 'function') { navigation.catch(() => {}); }
    }
  }
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

.query-handoff {
  margin: 12px 0 0 0;
  font-size: 12px;
  color: #999;
  font-style: italic;
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

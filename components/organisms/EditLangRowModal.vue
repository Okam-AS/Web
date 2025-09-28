<template>
  <Modal :hide-close-btn="true">
    <div>
      <label>
        Nøkkel
        <input v-model="editableKey" type="text" :disabled="!!langTranslationKey">
      </label>
    </div>
    <div v-for="editableLang in editableLangs" :key="editableLang.code" class="row">
      <label>
        {{ editableLang.nativeName }}
        <input v-model="editableLang.translations[editableKey]" type="text">
      </label>
    </div>
    <div class="modal-buttons">
      <input class="emoji-btn" type="button" value="Avbryt" @click="$emit('close')">
      <input class="emoji-btn" type="button" value="Lagre" @click="$emit('save', saved)">
    </div>
  </Modal>
</template>

<script>
import Modal from '~/components/atoms/Modal.vue'
export default {
  components: { Modal },
  props: {
    langTranslationKey: {
      type: String,
      default: ''
    },
    langs: {
      type: Array,
      default: () => []
    }
  },
  data () {
    return {
      editableKey: '',
      editableLangs: []
    }
  },
  computed: {
    saved () {
      const _this = this
      const request = []
      this.editableLangs.forEach((culture) => {
        request.push(
          {
            cultureCode: culture.code,
            key: _this.editableKey,
            value: culture.translations[_this.editableKey]
          }
        )
      })
      return request
    }
  },
  mounted () {
    this.editableLangs = JSON.parse(JSON.stringify(this.langs))
    this.editableKey = JSON.parse(JSON.stringify(this.langTranslationKey))
  }
}
</script>
<style lang="scss" scoped>
.row {
  margin-top: 1.5em;
}

label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  color: #495057;

  input {
    margin-left: 1.5em;
    padding: 0.6em 1em;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    width: 300px;
    transition: all 0.2s;

    &:disabled {
      background: #f8f9fa;
      cursor: not-allowed;
    }

    &:focus {
      outline: none;
      border-color: #4dabf7;
      box-shadow: 0 0 0 3px rgba(77, 171, 247, 0.2);
    }
  }
}

.modal-buttons {
  margin-top: 2em;
  display: flex;
  gap: 1em;
  justify-content: flex-end;

  .emoji-btn {
    min-width: 100px;
    padding: 0.6em 1em;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #f8f9fa;
      border-color: #ced4da;
    }

    &:last-child {
      background: #37b24d;
      border-color: #37b24d;
      color: white;

      &:hover {
        background: #2f9e44;
      }
    }
  }
}
</style>
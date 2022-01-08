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
      <input class="emoji-btn" type="button" value="❌ Avbryt" @click="$emit('close')">
      <input class="emoji-btn" type="button" value="✅ Lagre" @click="$emit('save', saved)">
    </div>
  </Modal>
</template>

<script>
import Modal from '@/components/atoms/Modal.vue'
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
  margin-top: 1em;
}
label input{
  float:right;
}
</style>
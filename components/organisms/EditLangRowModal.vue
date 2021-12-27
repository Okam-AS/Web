<template>
  <Modal>
    <div>
      <label>
        Nøkkel
        <input v-model="editableKey" type="text" :disabled="!!langDataKey">
      </label>
    </div>
    <div v-for="editableLang in editableLangs" :key="editableLang.code" class="row">
      <label>
        {{ editableLang.name }}
        <input v-model="editableLang.data[editableKey]" type="text">
      </label>
    </div>
    <div class="modal-buttons">
      <input class="emoji-btn" type="button" value="❌ Avbryt" @click="$emit('close')">
      <input class="emoji-btn" type="button" value="✅ Lagre" @click="$emit('save', savedData)">
    </div>
  </Modal>
</template>

<script>
import Modal from '@/components/atoms/Modal.vue'
export default {
  components: { Modal },
  props: {
    langDataKey: {
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
    savedData () {
      return { key: this.editableKey, editedLangs: this.editableLangs }
    }
  },
  mounted () {
    this.editableLangs = JSON.parse(JSON.stringify(this.langs))
    this.editableKey = JSON.parse(JSON.stringify(this.langDataKey))
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
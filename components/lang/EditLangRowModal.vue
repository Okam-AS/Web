<template>
  <Modal>
    <label>
      Nøkkel
      <input v-model="editableKey" type="text" :disabled="!!langDataKey">
    </label>
    <div v-for="editableLang in editableLangs" :key="editableLang.code">
      <label>
        {{ editableLang.name }}
        <input v-model="editableLang.data[editableKey]" type="text">
      </label>
    </div>
    <div class="modal-buttons">
      <button class="modal-default-button" @click="$emit('close')">
        Avbryt
      </button>
      <button class="modal-default-button" @click="$emit('save', savedData)">
        Lagre
      </button>
    </div>
  </Modal>
</template>

<script>
import Modal from '@/components/lang/Modal.vue'
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
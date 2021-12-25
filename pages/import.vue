<template>
  <div class="container">
    <input class="emoji-btn" type="button" value="📲 Importer" @click="showModal = true">

    <table>
      <tbody>
        <tr>
          <th>Kategorinavn</th>
          <th>Produktnavn</th>
          <th>Produktbeskrivelse</th>
          <th>Pris</th>
          <th>MVA (%)</th>
          <th>Pant</th>
          <th>Utsolgt</th>
        </tr>
        <tr v-for="(row, index) in rows" :key="index">
          <td><autocomplete-input v-model="row.categoryName" :suggestions="['drikke', 'hamburger', 'pizza']" type="text" /></td>
          <td><autocomplete-input v-model="row.name" :suggestions="['cola 0.5L', 'fanta 0.5L', 'esso burger']" type="text" /></td>
          <td><autocomplete-input v-model="row.description" :suggestions="['her kommer en lengre beskrivelse som kan ta mye plass', 'fanta 0.5L', 'esso burger']" type="text" /></td>
          <td>
            <currency-input
              v-model="row.price"
              currency="NOK"
              style="width:100px"
            />
          </td>
          <td><input v-model="row.tax" type="number" min="0" max="99"></td>
          <td>
            <currency-input
              v-model="row.depositPrice"
              currency="NOK"
              style="width:60px"
            />
          </td>
          <td><input v-model="row.isSoldOut" type="checkbox"></td>
          <td v-if="index !== rows.length-1">
            <input class="emoji-btn" type="button" value="🔂 Dupliser rad" @click="copyRow(index)">
            <input class="emoji-btn" type="button" value="❌ Fjern rad" @click="deleteRow(index)">
          </td>
        </tr>
      </tbody>
    </table>
    <Modal v-if="showModal">
      <p>Er du sikker på at du ønsker å importere?</p>
      <p>Her kommer sammendrag av import</p>
      <div class="modal-buttons">
        <input class="emoji-btn" type="button" value="✅ Kjør på" @click="showModal = false">
        <input class="emoji-btn" type="button" value="❌ Avbryt" @click="showModal = false">
      </div>
    </Modal>
  </div>
</template>
<script>
import Modal from '~/components/lang/Modal.vue'
import AutocompleteInput from '~/components/AutocompleteInput.vue'
export default {
  components: { Modal, AutocompleteInput },
  data: () => ({
    showModal: false,
    rows: [],
    tempSuggestions: ['test', 'asdas', 'sdfwfd']
  }),
  computed: {
    allKeys () {
      return ''
    },
    emptyRow () {
      return {
        categoryName: '',
        name: '',
        description: '',
        price: undefined,
        tax: 15,
        depositPrice: undefined,
        isSoldOut: false
      }
    }
  },
  watch: {
    rows: {
      handler (val) {
        if (!Array.isArray(val) || val.length < 1) {
          this.rows = [this.emptyRow]
        } else if (!this.isEmptyRow(val[val.length - 1])) {
          this.addEmptyRow()
        }
      },
      deep: true
    }
  },
  mounted () {
    this.addEmptyRow()
    this.addEmptyRow()
    // fetch(`${this.strapiBaseUrl}/about-us`)
    //   .then((res) => {
    //     res.json().then(
    //       (jsonResponse) => {
    //         this.page = jsonResponse
    //       })
    //   })
  },
  methods: {
    isEmptyRow (row) {
      if (!row) { return true }
      const _this = this
      let isEmptyRow = true
      Object.keys(this.emptyRow).forEach((key) => {
        if (row[key] !== _this.emptyRow[key]) { isEmptyRow = false }
      })
      return isEmptyRow
    },
    deleteRow (index) {
      this.$delete(this.rows, index)
    },
    addEmptyRow () {
      this.rows.push(JSON.parse(JSON.stringify(this.emptyRow)))
    },
    copyRow (index) {
      const copiedRow = JSON.parse(JSON.stringify(this.rows[index]))
      this.rows.splice(index, 0, copiedRow)
    }
  }
}
</script>
<style lang="scss">
input {
  padding:5px;
}
.emoji-btn{
  cursor: pointer;
}
tr th {
  text-align: left;
}
</style>
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
          <td><autocomplete-input v-model="row.productName" :suggestions="['cola 0.5L', 'fanta 0.5L', 'esso burger']" type="text" /></td>
          <td><autocomplete-input v-model="row.productDescription" :suggestions="['her kommer en lengre beskrivelse som kan ta mye plass', 'fanta 0.5L', 'esso burger']" type="text" /></td>
          <td>
            <currency-input
              currency="NOK"
              style="width:100px"
            />
          </td>
          <td><input type="number" min="0" max="99"></td>
          <td>
            <currency-input
              currency="NOK"
              style="width:60px"
            />
          </td>
          <td><input type="checkbox"></td>
          <td>
            <input class="emoji-btn" type="button" value="🔂 Dupliser rad" @click="deleteRow(key)">
            <input class="emoji-btn" type="button" value="❌ Fjern rad" @click="deleteRow(key)">
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
    rows: [{}, {}, {}, {}, {}, {}],
    tempSuggestions: ['test', 'asdas', 'sdfwfd']
  }),
  computed: {
    allKeys () {
      return ''
    }
  },
  mounted () {
    // fetch(`${this.strapiBaseUrl}/about-us`)
    //   .then((res) => {
    //     res.json().then(
    //       (jsonResponse) => {
    //         this.page = jsonResponse
    //       })
    //   })
  },
  methods: {
    deleteRow () {

    },
    changing (event) {
      console.log(event)
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
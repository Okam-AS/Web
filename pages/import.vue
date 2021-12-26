<template>
  <div class="container">
    <template>
      <div style="margin:1em">
        <input class="emoji-btn" type="button" value="👓 Kontroll" @click="showModal = true">
        <input class="emoji-btn" type="button" value="🧑🏻‍💻 Bytt bruker" @click="showLogin = true">
      </div>
      <table>
        <tbody>
          <tr>
            <th />
            <th>Kategorinavn</th>
            <th>Produktnavn</th>
            <th style="min-width:300px">
              Produktbeskrivelse
            </th>
            <th>Pris</th>
            <th>MVA (%)</th>
            <th>Pant</th>
            <th>Utsolgt</th>
          </tr>
          <tr v-for="(row, index) in rows" :key="index">
            <td class="row-count">
              {{ index !== rows.length-1 ? index+1 : '' }}
            </td>
            <td>
              <autocomplete-input
                ref="autocomplete-input"
                v-model="row.categoryName"
                class="full-width"
                :suggestions="allCategoryNames"
                type="text"
              />
            </td>
            <td>
              <autocomplete-input
                v-model="row.name"
                class="full-width"
                :suggestions="allProductNames"
                type="text"
              />
            </td>
            <td>
              <autocomplete-input
                v-model="row.description"
                class="full-width"
                :suggestions="allProductDescriptions"
                :min-length="0"
                type="text"
              />
            </td>
            <td>
              <currency-input
                v-model="row.priceModel"
                currency="NOK"
                style="width:100px"
                @change="amountChange(index, 'price', $event)"
              />
            </td>
            <td>
              <input
                v-model="row.tax"
                class="full-width"
                type="number"
                pattern="[0-9]{2}"
                min="0"
                max="99"
                @change="taxChange($event, index)"
              >
            </td>
            <td>
              <currency-input
                v-model="row.depositModel"
                currency="NOK"
                style="width:60px"
                @change="amountChange(index, 'deposit', $event)"
              />
            </td>
            <td><input v-model="row.isSoldOut" style="margin-left:1.5em;" type="checkbox"></td>
            <td v-if="index !== rows.length-1 || rows.length < 2">
              <input class="emoji-btn" type="button" value="🔂 Dupliser rad" @click="copyRow(index)">
              <input class="emoji-btn" type="button" value="➖ Fjern rad" @click="deleteRow(index)">
            </td>
          </tr>
        </tbody>
      </table>
    </template>
    <Modal v-if="showModal">
      <h1 style="margin-bottom:1em">
        Importer
      </h1>
      <span>{{ rows.length-1 }} produkter og {{ allCategoryNames.length }} kategorier til butikk:</span>
      <div style="margin-bottom:1em;">
        <select v-model="selectedStore">
          <option value="0">
            Velg butikk
          </option>
          <option v-for="option in $store.state.currentUser.adminIn " :key="option.id" :value="option.id">
            {{ option.name }}
          </option>
        </select>
      </div>
      <label><input type="checkbox"> Slett alle eksisterende produkter før import</label>
      <div class="modal-buttons">
        <input class="emoji-btn" type="button" value="✅ Kjør på" @click="showModal = false">
        <input class="emoji-btn" type="button" value="❌ Avbryt" @click="showModal = false">
      </div>
    </Modal>
    <LoginModal v-if="showLogin" :close-if-logged-in="closeIfLoggedIn" @loggedIn="showLogin = false; closeIfLoggedIn = false" @loggedOut="showLogin = true" />
  </div>
</template>
<script>
import Modal from '~/components/lang/Modal.vue'
import AutocompleteInput from '~/components/AutocompleteInput.vue'
import LoginModal from '~/components/LoginModal.vue'
export default {
  components: { Modal, AutocompleteInput, LoginModal },
  data: () => ({
    closeIfLoggedIn: true,
    showModal: false,
    showLogin: true,
    selectedStore: 0,
    rows: []
  }),
  computed: {
    allCategoryNames () {
      return this.getAllDisctinct('categoryName')
    },
    allProductNames () {
      return this.getAllDisctinct('name')
    },
    allProductDescriptions () {
      return this.getAllDisctinct('description')
    },
    emptyRow () {
      return {
        categoryName: '',
        name: '',
        description: '',
        priceModel: 0,
        priceAmount: 0,
        tax: 15,
        depositModel: 0,
        depositAmount: 0,
        isSoldOut: false
      }
    }
  },
  watch: {
    rows: {
      handler (val) {
        if (!Array.isArray(val) || val.length < 1) {
          this.rows = [this.emptyRow]
        } else if (val.length === 1 || !this.isEmptyRow(val[val.length - 1])) {
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
    amountChange (rowIndex, rowKey, newValue) {
      if (isNaN(parseInt(newValue)) || !Number.isInteger(parseInt(newValue)) || parseInt(newValue) < 0 || parseInt(newValue) > 10000) {
        this.rows[rowIndex][rowKey + 'Model'] = 0
        this.rows[rowIndex][rowKey + 'Amount'] = 0
      } else {
        this.rows[rowIndex][rowKey + 'Amount'] = Math.trunc((newValue ?? 0) * 100)
      }
    },
    taxChange (event, index) {
      if (!event || !event.target || isNaN(parseInt(event.target.value)) || !Number.isInteger(parseInt(event.target.value))) {
        this.rows[index].tax = 0
      }
      if (event.target.value > 99) {
        this.rows[index].tax = 99
      }
      if (event.target.value < 0) {
        this.rows[index].tax = 0
      }
      this.rows[index].tax = parseInt(event.target.value)
    },
    getAllDisctinct (rowKey) {
      return this.rows.map(x => x[rowKey]).filter((value, index, self) => self.indexOf(value) === index && !!value)
    },
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
.modal-buttons{
  margin-top: 1em;;
}
input {
  padding:5px;
  border-radius: 3px;
  border: 1px solid lightgray;
}
.full-width, .full-width input {
  width:100%
}
.emoji-btn{
  cursor: pointer;
  padding: 0 5px 0 5px;
}
tr th {
  text-align: left;
}
th {
  font-size: 14px;
}
.row-count{
  color: gray;
  padding: 5px;
  font-size: 11px;
  min-width: 25px;
  text-align: right;
}
</style>
<template>
  <AdminPage>
    <div class="container">
      <template>
        <div style="margin: 1em">
          <input
            class="emoji-btn"
            type="button"
            value="👓 Verifiser og importer"
            @click="showModal = true"
          >
          <input
            class="emoji-btn"
            type="button"
            value="🆑 Tøm alle rader"
            @click="showClearRowsModal = true"
          >
        </div>
        <table>
          <tbody>
            <tr>
              <th />
              <th>Produktnavn</th>
              <th style="min-width: 300px">
                Produktbeskrivelse
              </th>
              <th>Pris</th>
              <th>MVA (%)</th>
              <th>Pant</th>
              <th>Utsolgt</th>
            </tr>
            <tr v-for="(row, index) in rows" :key="index">
              <td class="row-count">
                {{ index !== rows.length - 1 ? index + 1 : "" }}
              </td>
              <td>
                <autocomplete-input
                  v-model="row.name"
                  class="full-width"
                  :suggestions="allProductNames"
                  type="text"
                  :server-error-message="getFailedMessage(index, 'name')"
                />
              </td>
              <td>
                <autocomplete-input
                  v-model="row.description"
                  class="full-width"
                  :suggestions="allProductDescriptions"
                  :min-length="0"
                  type="text"
                  :server-error-message="getFailedMessage(index, 'description')"
                />
              </td>
              <td>
                <currency-input
                  v-model="row.priceModel"
                  currency="NOK"
                  style="width: 100px"
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
                  style="width: 60px"
                  @change="amountChange(index, 'deposit', $event)"
                />
              </td>
              <td>
                <input
                  v-model="row.soldOut"
                  style="margin-left: 1.5em"
                  type="checkbox"
                >
              </td>
              <td v-if="index !== rows.length - 1 || rows.length < 2">
                <input
                  class="emoji-btn"
                  type="button"
                  value="🔂 Dupliser rad"
                  @click="copyRow(index)"
                >
                <input
                  class="emoji-btn"
                  type="button"
                  value="➖ Fjern rad"
                  @click="deleteRow(index)"
                >
              </td>
            </tr>
          </tbody>
        </table>
      </template>
      <Modal v-if="showModal" @close="closeModal">
        <h1 style="margin-bottom: 1em">
          Importer
        </h1>
        <div>
          <select v-model="selectedStore">
            <option value="0">
              Velg butikk
            </option>
            <option
              v-for="option in $store.state.currentUser.adminIn"
              :key="option.id"
              :value="option.id"
            >
              {{ option.name }}
            </option>
          </select>
        </div>
        <div style="margin: 1em 0 1em 0">
          <label><input v-model="replaceAll" type="checkbox"> Slett alle
            eksisterende produkter før import</label>
        </div>
        <div v-if="importMessage" class="import-messages">
          <p>
            {{ importMessage }}
          </p>
          <p v-if="importResponse.createdProductCount">
            <span style="font-weight: bold">Antall import av produkter: </span>
            <span>{{ importResponse.createdProductCount }}</span>
          </p>
          <p v-if="importResponse.deletedProductCount">
            <span
              style="font-weight: bold"
            >Antall sletting av produkter:
            </span>
            <span>{{ importResponse.deletedProductCount }}</span>
          </p>
        </div>

        <div class="modal-buttons">
          <input
            v-if="isVerified"
            class="emoji-btn"
            type="button"
            value="✅ Godkjenn og importer"
            @click="runImport(false)"
          >
          <input
            class="emoji-btn"
            type="button"
            value="👓 Verifiser"
            @click="runImport(true)"
          >
          <input
            class="emoji-btn"
            type="button"
            value="❌ Avbryt"
            @click="closeModal"
          >
        </div>
        <Loading :loading="isLoading" />
      </Modal>
      <LoginModal v-if="showLogin" @close="closeLoginModal" />
      <Modal v-if="showClearRowsModal" @close="showClearRowsModal = false">
        <p>
          Er du sikker på at du ønsker å fjerne alle rader fra denne tabellen?
          Produkter som allerede er importert vil ikke bli berørt.
        </p>
        <div class="modal-buttons">
          <input
            class="emoji-btn"
            type="button"
            value="🆑 Tøm alle rader"
            @click="clearRows"
          >
          <input
            class="emoji-btn"
            type="button"
            value="❌ Avbryt"
            @click="showClearRowsModal = false"
          >
        </div>
      </Modal>
    </div>
  </AdminPage>
</template>

<script>
import Loading from '@/components/atoms/Loading.vue'
import AdminPage from '@/components/organisms/AdminPage.vue'
import Modal from '~/components/atoms/Modal.vue'
import AutocompleteInput from '~/components/atoms/AutocompleteInput.vue'
import LoginModal from '~/components/molecules/LoginModal.vue'

export default {
  components: { AdminPage, Modal, AutocompleteInput, LoginModal, Loading },
  data: () => ({
    isLoading: false,
    showModal: false,
    showLogin: false,
    selectedStore: 0,
    replaceAll: false,
    rows: [],
    importResponse: {},
    importMessage: '',
    isVerified: false,
    showClearRowsModal: false
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
        soldOut: false
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
        if (window && window.localStorage) {
          localStorage.setItem('importRows', JSON.stringify(val))
        }
      },
      deep: true
    }
  },
  mounted () {
    if (!this.$store.getters.userIsLoggedIn) {
      this.showLogin = true
      return
    }
    this.init()
  },
  methods: {
    init () {
      let storedRows = false
      if (window && window.localStorage) {
        storedRows = localStorage.getItem('importRows') || false
      }
      if (storedRows) {
        this.$set(this, 'rows', JSON.parse(storedRows))
      } else {
        this.clearRows()
      }
    },
    closeLoginModal (isLoggedIn) {
      this.showLogin = !isLoggedIn
      if (isLoggedIn) {
        this.init()
      }
    },
    clearRows () {
      this.selectedStore = 0
      this.replaceAll = false
      this.rows = [
        JSON.parse(JSON.stringify(this.emptyRow)),
        JSON.parse(JSON.stringify(this.emptyRow))
      ]
      this.showClearRowsModal = false
      this.importResponse = {}
      if (window && window.localStorage) {
        localStorage.removeItem('importRows')
      }
    },
    amountChange (rowIndex, rowKey, newValue) {
      if (
        isNaN(parseInt(newValue)) ||
        !Number.isInteger(parseInt(newValue)) ||
        parseInt(newValue) < 0 ||
        parseInt(newValue) > 10000
      ) {
        this.rows[rowIndex][rowKey + 'Model'] = 0
        this.rows[rowIndex][rowKey + 'Amount'] = 0
      } else {
        this.rows[rowIndex][rowKey + 'Amount'] = Math.trunc(
          (newValue ?? 0) * 100
        )
      }
    },
    taxChange (event, index) {
      if (
        !event ||
        !event.target ||
        isNaN(parseInt(event.target.value)) ||
        !Number.isInteger(parseInt(event.target.value))
      ) {
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
      return this.rows
        .map(x => x[rowKey])
        .filter(
          (value, index, self) => self.indexOf(value) === index && !!value
        )
    },
    isEmptyRow (row) {
      if (!row) {
        return true
      }
      const _this = this
      let isEmptyRow = true
      Object.keys(this.emptyRow).forEach((key) => {
        if (row[key] !== _this.emptyRow[key]) {
          isEmptyRow = false
        }
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
    },
    closeModal () {
      this.isVerified = false
      this.showModal = false
      this.importMessage = ''
    },
    getFailedMessage (index, key) {
      if (!this.importResponse || !Array.isArray(this.importResponse.failed)) {
        return ''
      }
      const fail = this.importResponse.failed.find(
        x =>
          x.rowNumber === index + 1 &&
          x.rowKey.toLowerCase() === key.toLowerCase()
      )
      return fail ? fail.reason : ''
    },
    runImport (verifyOnly) {
      const _this = this
      _this.importMessage = ''
      if (_this.selectedStore <= 0) {
        _this.importMessage = 'Velg butikk først'
      } else {
        _this.isLoading = true
        _this._productService
          .BulkImport({
            storeId: this.selectedStore,
            currency: 'NOK',
            verifyOnly,
            replaceAll: _this.replaceAll,
            rows: JSON.parse(JSON.stringify(_this.rows)).slice(
              0,
              _this.rows.length - 1
            ) // Remove last item as it is an empty row
          })
          .then((res) => {
            _this.importResponse = res
            if (
              Array.isArray(_this.importResponse.failed) &&
              _this.importResponse.failed.length === 0
            ) {
              _this.isVerified = true
              _this.importMessage = verifyOnly
                ? 'Dette ser bra ut! Ønsker du å gjennomføre denne handlingen:'
                : 'Ferdig! Dette ble gjennomført:'
            } else {
              _this.importMessage =
                'Ser ut noen felter er feil. Lukk denne modalen for å se gjennom feltene som er markert med rødt'
              _this.isVerified = false
              _this.importResponse.createdProductCount = 0
              _this.importResponse.deletedProductCount = 0
              window.console.log(res)
            }
          })
          .catch((err) => {
            _this.importMessage =
              'Noe gikk galt her. Mest sannsynlig var det noen produkter som ikke kunne slettes. Kontakt systemansvarlig for mer hjelp.'
            _this.isVerified = false
            _this.importResponse.createdProductCount = 0
            _this.importResponse.deletedProductCount = 0
            window.console.log(err)
          })
          .finally(() => {
            _this.isLoading = false
          })
      }
    }
  }
}
</script>
<style lang="scss">
.modal-buttons {
  margin-top: 1em;
}
input {
  padding: 5px;
  border-radius: 3px;
  border: 1px solid lightgray;
}
.full-width,
.full-width input {
  width: 100%;
}
.emoji-btn {
  cursor: pointer;
  padding: 0 5px 0 5px;
}
tr th {
  text-align: left;
}
th {
  font-size: 14px;
}
.row-count {
  color: gray;
  padding: 5px;
  font-size: 11px;
  min-width: 25px;
  text-align: right;
}
.import-messages {
  background: cornsilk;
  border-radius: 3px;
  padding: 1em;
}
</style>
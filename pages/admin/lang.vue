<template>
  <AdminPage>
    <div class="container">
      <div class="search-container">
        <input v-model="searchInput" class="search-input" type="text">
        <span class="search-icon">🔍</span>
        <input
          class="emoji-btn add-new"
          type="button"
          value="➕ Ny rad"
          @click="addRow"
        >
      </div>
      <table>
        <tbody>
          <tr>
            <th>Nøkkel</th>
            <th v-for="lang in langs" :key="lang.code">
              {{ lang.nativeName }}
            </th>
          </tr>
          <tr v-for="key in filteredKeys" :key="key">
            <td>{{ key }}</td>
            <td v-for="lang in langs" :key="lang.code">
              {{ lang.translations[key] }}
            </td>
            <td>
              <input
                class="emoji-btn"
                type="button"
                value="✍🏻 Rediger"
                @click="editRow(key)"
              >
              <input
                class="emoji-btn"
                type="button"
                value="🗑 Slett"
                @click="deleteRow(key)"
              >
            </td>
          </tr>
        </tbody>
      </table>
      <EditRowModal
        v-if="showEditModal"
        :langs="langs"
        :lang-translation-key="editKey"
        @close="showEditModal = false"
        @save="edited"
      />
      <Modal v-if="showCantDeleteInfo" :hide-close-btn="true">
        <template>
          <p>Alle feltene må være tomme for å slette raden</p>
          <div class="modal-buttons">
            <input
              class="emoji-btn"
              type="button"
              value="Avbryt"
              @click="showCantDeleteInfo = false"
            >
          </div>
        </template>
      </Modal>
      <LoginModal v-if="showLogin" @close="closeLoginModal" />
    </div>
  </AdminPage>
</template>
<script>
import EditRowModal from '~/components/organisms/EditLangRowModal.vue'
import Modal from '~/components/atoms/Modal.vue'
import AdminPage from '~/components/organisms/AdminPage.vue'
import LoginModal from '~/components/molecules/LoginModal.vue'

export default {
  components: { AdminPage, EditRowModal, Modal, LoginModal },
  data: () => ({
    showEditModal: false,
    showCantDeleteInfo: false,
    searchInput: '',
    editKey: '',
    langs: [],
    showLogin: false
  }),
  computed: {
    allKeys () {
      const allKeys = []
      this.langs.forEach((lang) => {
        allKeys.push(...Object.keys(lang.translations))
      })
      const onlyUnique = (value, index, self) => self.indexOf(value) === index
      return allKeys.filter(onlyUnique).sort()
    },
    filteredKeys () {
      const _this = this
      if (_this.searchInput === '') {
        return _this.allKeys
      }

      return _this.allKeys.filter(
        key =>
          key.includes(_this.searchInput.toLowerCase()) ||
          _this.langs.some(x =>
            x.translations[key]
              ?.toLowerCase()
              .includes(_this.searchInput.toLowerCase())
          )
      )
    }
  },
  mounted () {
    if (!this.$store.getters.userIsLoggedIn) {
      this.showLogin = true
      return
    }
    this.loadCultures()
  },
  methods: {
    closeLoginModal (isLoggedIn) {
      this.showLogin = !isLoggedIn
      if (isLoggedIn) {
        this.loadCultures()
      }
    },
    loadCultures () {
      const _this = this
      _this._cultureService.GetAll().then((response) => {
        _this.langs = response
      })
    },
    edited (requestModel) {
      const _this = this
      _this._cultureService
        .CreateOrUpdateTranslations(requestModel)
        .then(() => {
          _this.loadCultures()
        })
      _this.showEditModal = false
    },
    editRow (key) {
      this.editKey = key
      this.showEditModal = true
    },
    deleteRow (key) {
      const _this = this
      const hasValues = _this.langs.some(lang => lang.translations[key])
      if (hasValues) {
        _this.showCantDeleteInfo = true
      } else {
        _this._cultureService.DeleteTranslation(key).then(() => {
          _this.loadCultures()
        })
      }
    },
    addRow () {
      this.editKey = ''
      this.showEditModal = true
    }
  }
}
</script>
<style lang="scss">
@import "../../assets/sass/common.scss";

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

th {
  min-width: rem(200);
  text-align: left;
  background: #f8f9fa;
  padding: 1em;
  font-weight: 600;
  border-bottom: 2px solid #dee2e6;
}

td {
  padding: 1em;
  border-bottom: 1px solid #eee;
  vertical-align: middle;
}

tr:nth-child(even) {
  background: #f8f9fa;
}

tr:hover {
  background: #f1f3f5;
}

.search-container {
  padding: 1em 0 2em 0;
  display: flex;
  align-items: center;
  gap: 1em;
}

.search-input {
  padding: 0.8em 1em;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  width: 300px;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #4dabf7;
    box-shadow: 0 0 0 3px rgba(77, 171, 247, 0.2);
  }
}

.emoji-btn {
  cursor: pointer;
  padding: 0.6em 1em;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  background: white;
  transition: all 0.2s;

  &:hover {
    background: #f8f9fa;
    border-color: #ced4da;
  }
}

.container {
  padding: 2em;
  max-width: 1200px;
  margin: 0 auto;
}

.modal-buttons {
  margin-top: 1.5em;
  display: flex;
  gap: 1em;
  justify-content: flex-end;
}
</style>

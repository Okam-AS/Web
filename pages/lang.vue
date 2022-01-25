<template>
  <div class="container">
    <div class="search-container">
      <input v-model="searchInput" class="search-input" type="text">
      <span class="search-icon">🔍</span>
      <input class="emoji-btn add-new" type="button" value="➕ Ny rad" @click="addRow">
      <input class="emoji-btn user-btn" type="button" value="🧑🏻‍💻 Bytt bruker" @click="showLogin = true">
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
            <input class="emoji-btn" type="button" value="✍🏻 Rediger" @click="editRow(key)">
            <input class="emoji-btn" type="button" value="🗑 Slett" @click="deleteRow(key)">
          </td>
        </tr>
      </tbody>
    </table>
    <EditRowModal v-if="showEditModal" :langs="langs" :lang-translation-key="editKey" @close="showEditModal = false" @save="edited" />
    <Modal v-if="showCantDeleteInfo" :hide-close-btn="true">
      <template>
        <p>Alle feltene må være tomme for å slette raden</p>
        <div class="modal-buttons">
          <input class="emoji-btn" type="button" value="❌ Avbryt" @click="showCantDeleteInfo = false">
        </div>
      </template>
    </Modal>
    <LoginModal v-if="showLogin" :close-if-logged-in="false" @close="closeLoginModal" />
  </div>
</template>
<script>
import EditRowModal from '@/components/organisms/EditLangRowModal.vue'
import Modal from '@/components/atoms/Modal.vue'
import LoginModal from '~/components/molecules/LoginModal.vue'

export default {
  components: { EditRowModal, Modal, LoginModal },
  data: () => ({
    showEditModal: false,
    showCantDeleteInfo: false,
    searchInput: '',
    editKey: '',
    langs: [],
    showLogin: true
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
      if (_this.searchInput === '') { return _this.allKeys }

      return _this.allKeys.filter(key =>
        key.includes(_this.searchInput.toLowerCase()) ||
        _this.langs.some(x => x.translations[key]?.toLowerCase().includes(_this.searchInput.toLowerCase())))
    }
  },
  mounted () {
    this.loadCultures()
  },
  methods: {
    closeLoginModal (isLoggedIn) {
      this.showLogin = !isLoggedIn
    },
    loadCultures () {
      const _this = this
      _this._cultureService.GetAll().then((response) => {
        _this.langs = response
      })
    },
    edited (requestModel) {
      const _this = this
      _this._cultureService.CreateOrUpdateTranslations(requestModel).then(() => {
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
@import "../assets/sass/common.scss";

table{
  width: 100%;
}
th {
  min-width: rem(200);
  text-align: left;
}
td {
  padding:1em;
}
tr:nth-child(even) {
  background: rgb(236, 236, 236);
}
.search-input{
  padding: 1em;
}
.search-icon{
  margin-left: -2em;
}
.container {
  padding:1em
}
.search-container{
  padding: 1em 0 1em 0
}
input {
  padding: rem(5);
}
.emoji-btn{
  cursor: pointer;
}
.add-new, .user-btn {
  float:right;
  margin-left:1em;
}
.modal-buttons{
  margin-top: 1em;;
}
</style>

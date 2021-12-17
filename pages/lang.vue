<template>
  <div class="container">
    <div class="search-container">
      <input v-model="searchInput" class="search-input" type="text">
      <span class="search-icon">🔍</span>
      <input class="emoji-btn add-new" type="button" value="➕ Ny rad" @click="addRow">
    </div>
    <table>
      <tbody>
        <tr>
          <th>Nøkkel</th>
          <th v-for="lang in langs" :key="lang.code">
            {{ lang.name }}
          </th>
        </tr>
        <tr v-for="key in filteredKeys" :key="key">
          <td>{{ key }}</td>
          <td v-for="lang in langs" :key="lang.code">
            {{ lang.data[key] }}
          </td>
          <td>
            <input class="emoji-btn" type="button" value="✍🏻 Rediger" @click="editRow(key)">
            <input class="emoji-btn" type="button" value="🗑 Slett" @click="deleteRow(key)">
          </td>
        </tr>
      </tbody>
    </table>
    <EditRowModal v-if="showEditModal" :langs="langs" :lang-data-key="editKey" @close="showEditModal = false" @save="edited" />
    <Modal v-if="showCantDeleteInfo">
      <template>
        <p>Alle feltene må være tomme for å slette raden</p>
        <div class="modal-buttons">
          <input class="emoji-btn" type="button" value="❌ Avbryt" @click="showCantDeleteInfo = false">
        </div>
      </template>
    </Modal>
  </div>
</template>
<script>
import EditRowModal from '~/components/lang/EditLangRowModal.vue'
import Modal from '~/components/lang/Modal.vue'
export default {
  components: { EditRowModal, Modal },
  data: () => ({
    showEditModal: false,
    showCantDeleteInfo: false,
    searchInput: '',
    editKey: '',
    langs: [
      {
        code: 'no',
        name: 'Norsk',
        data: {
          'best.testkey': 'hei',
          'test.asd': 'hei hei',
          'about.heading': 'Om oss',
          'xest.sss': 'okse',
          unikino: 'sdsf'
        }
      },
      {
        code: 'en',
        name: 'Engelsk',
        data:
          {
            'best.testkey': 'hei',
            'test.asd': 'hei hei',
            'about.heading': 'About us',
            'xest.sss': 'okse',
            'unik.ien': 'engelsk'
          }
      }
    ]
  }),
  computed: {
    allKeys () {
      const allKeys = []
      this.langs.forEach((lang) => {
        allKeys.push(...Object.keys(lang.data))
      })
      const onlyUnique = (value, index, self) => self.indexOf(value) === index
      return allKeys.filter(onlyUnique).sort()
    },
    filteredKeys () {
      const _this = this
      if (_this.searchInput === '') { return _this.allKeys }

      return _this.allKeys.filter(key =>
        key.includes(_this.searchInput.toLowerCase()) ||
        _this.langs.some(x => x.data[key]?.toLowerCase().includes(_this.searchInput.toLowerCase())))
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
    edited ({ key, editedLangs }) {
      const _this = this
      if (key) {
        _this.langs.forEach((lang) => {
          const editedLang = editedLangs.find(editedLang => editedLang.code === lang.code)
          _this.$set(lang.data, key, editedLang.data[key])
        })
      }
      _this.showEditModal = false
    },
    editRow (key) {
      this.editKey = key
      this.showEditModal = true
    },
    deleteRow (key) {
      const _this = this
      const hasValues = _this.langs.some(lang => lang.data[key])
      if (hasValues) {
        _this.showCantDeleteInfo = true
      } else {
        _this.langs.forEach((lang) => {
          _this.$delete(lang.data, key)
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
table{
  width: 100%;
}
th {
  min-width: 200px;
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
  padding:5px;
}
.emoji-btn{
  cursor: pointer;
}
.add-new {
  float:right
}
.modal-buttons{
  margin-top: 1em;;
}
</style>

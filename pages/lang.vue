<template>
  <div class="container">
    <div class="search-container">
      <input v-model="searchInput" class="search-input" type="text"><span class="search-icon">🔍</span>
    </div>
    <table>
      <tr>
        <th>Nøkkel</th>
        <th>Norsk</th>
        <th>Engelsk</th>
      </tr>
      <tr v-for="key in keys" :key="key">
        <td>{{ key }}</td>
        <td>{{ no[key] }}</td>
        <td>{{ en[key] }}</td>
        <td><span>✍🏻</span><span>🗑</span></td>
      </tr>
    </table>
  </div>
</template>
<script>
export default {
  data: () => ({
    searchInput: '',
    no: {
      'best.testkey': 'hei',
      'test.asd': 'hei hei',
      'about.heading': 'Om oss',
      'xest.sss': 'okse',
      unikino: 'sdsf'
    },
    en: {
      'best.testkey': 'hei',
      'test.asd': 'hei hei',
      'about.heading': 'About us',
      'xest.sss': 'okse',
      'unik.ien': 'engelsk'
    }
  }),
  computed: {
    keys () {
      const allKeys = []
      allKeys.push(...Object.keys(this.no))
      allKeys.push(...Object.keys(this.en))
      const onlyUnique = (value, index, self) => self.indexOf(value) === index && (this.searchInput === '' || value.includes(this.searchInput))
      return allKeys.filter(onlyUnique).sort()
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
  }
}
</script>
<style lang="scss" scoped>
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
</style>

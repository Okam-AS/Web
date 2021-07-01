<template>
  <div>
    <div v-if="store.id">
      <h1> {{ store.name }}</h1>
      <pre>{{ categories }}</pre>
    </div>
  </div>
</template>

<script>
import { StoreService, CategoryService } from '@/core/services'

export default {
  data: () => ({
    storeService: null,
    categoryService: null,
    storeId: 15,
    store: {},
    categories: []
  }),
  mounted () {
    this.storeServive = new StoreService()
    this.categoryService = new CategoryService()
    this.getStore()
    this.getCategories()
  },
  methods: {
    getStore () {
      this.storeServive.get(this.storeId).then((res) => {
        this.store = res
      })
    },
    getCategories () {
      this.categoryService.GetAll(this.storeId).then((res) => {
        this.categories = res
      })
    }
  }
}
</script>
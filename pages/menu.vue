<template>
  <div class="menu">
    <div v-if="store.id">
      <h1> {{ store.name }}</h1>
      <div v-for="(category, i) in categories" :key="i" class="category">
        <h2>{{ category.name }}</h2>
        <ul>
          <li v-for="(row, j) in category.categoryProductListItems" :key="j">
            <h3 v-if="row.heading">
              {{ row.heading }}
            </h3>
            <div v-else class="product">
              <img :src="row.product.image.thumbnailUrl">
              <p class="price">
                <template v-if="!row.product.soldOut">
                  {{ priceLabel(row.product.amount) }}
                </template>
                <template v-else>
                  Utsolgt
                </template>
              </p>
              <h3>{{ row.product.name }}</h3>
              <p v-if="row.product.description">
                {{ row.product.description }}
              </p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import { StoreService, CategoryService } from '@/core/services'

export default {
  data: () => ({
    storeService: null,
    categoryService: null,
    storeId: null,
    store: {},
    categories: []
  }),
  mounted () {
    this.init()
  },
  methods: {
    wholeAmount (amount) {
      if (!amount) { return '0' }
      const wholeAmount = amount.toString().slice(0, -2)
      return wholeAmount ? wholeAmount.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '0'
    },
    fractionAmount (amount) {
      if (!amount) { return '00' }
      const fractionAmount = amount.toString().slice(-2)
      return fractionAmount.length < 2 ? '00' : fractionAmount
    },
    priceLabel (totalPrice, hideFractionIfZero) {
      return (
        'kr ' + this.wholeAmount(totalPrice) + ((!hideFractionIfZero || parseInt(this.fractionAmount(totalPrice)) > 0)
          ? ',' + this.fractionAmount(totalPrice)
          : '')
      )
    },
    init () {
      const search = new URLSearchParams(window.location.search) || {}
      const storeId = search.get('store') || false

      if (storeId) {
        this.storeId = storeId
        this.storeServive = new StoreService()
        this.categoryService = new CategoryService()
        this.getStore()
        this.getCategories()
      }
    },
    getStore () {
      this.storeServive.get(this.storeId).then((res) => {
        this.store = res
      })
    },
    updateCategory (index, category) {
      this.$set(this.categories, index, category)
    },
    getCategories () {
      this.categoryService.GetAll(this.storeId).then((res) => {
        this.categories = res

        this.categories.forEach((category, index) => {
          this.categoryService.Get(category.id).then((c) => {
            this.updateCategory(index, c)
          })
        })
      })
    }
  }
}
</script>

<style lang="scss">
.menu {
  .category {
    .product {
      margin-bottom: 1rem;
      clear: both;
      .price {
        float: right;
      }
    }
  }
}
</style>
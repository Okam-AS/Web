<template>
  <div ref="container">
    <template v-if="store.id">
      <div v-for="(category, i) in categories" :key="i">
        <h2 class="category-header">
          {{ category.name }}
        </h2>

        <div class="container">
          <div v-for="(row, j) in (category.categoryProductListItems || []).filter(x => !x.heading)" :key="j" class="box">
            <template @click="openProduct(row.product.id)">
              <img v-if="row.product.image && row.product.image.thumbnailUrl" class="product-thumbnail" :src="row.product.image.thumbnailUrl">
              <div class="product-text">
                <h4>
                  {{ row.product.name }}
                </h4>
                <span v-if="row.product.description">
                  {{ row.product.description }}
                </span>
              </div>
              <div class="product-price">
                {{ priceLabel(row.product.amount) }}
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { StoreService, CategoryService, CartService } from '@/core/services'

export default {
  data: () => ({
    storeService: null,
    categoryService: null,
    cartService: null,
    storeId: null,
    store: {},
    categories: [],
    selectedProduct: {},
    timer: ''
  }),
  mounted () {
    this.init()
    this.timer = setInterval(this.iframeHeightNotify, 300)
  },
  beforeDestroy () {
    clearInterval(this.timer)
  },
  methods: {
    iframeHeightNotify () {
      window.parent.postMessage({
        height: this.$refs.container.scrollHeight
      }, 'https://www.grandpizza.no')
    },
    openProduct (productId) {
      const comp = this
      this.cartService.getCartLineItem({ product: { id: productId } }).then((result) => {
        if (result && result.product) {
          comp.selectedProduct = result.product
        }
      })
    },
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
      const nolayout = search.has('nolayout') || false

      if (storeId) {
        this.storeId = storeId
        this.storeServive = new StoreService()
        this.categoryService = new CategoryService()
        this.cartService = new CartService()
        this.getStore()
        this.getCategories()
      }

      if (nolayout && window && window.Tawk_API) {
        window.Tawk_API.onLoad = () => {
          window.Tawk_API.hideWidget()
        }
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

<style lang="scss" scoped>
.product-price{
  line-height:1em;
  white-space: nowrap;
  margin-right: 10px;
  font-size: 14px;
}
.product-text{
  padding: 10px;
  width:100%;
}
.product-text span {
  color: gray;
  font-size: 12px;
}

.product-text h4 {
  font-size: 14px;
}

.product-thumbnail{
  border-radius: 20px 0 0 20px;
  height:99%;
}

.category-header{
  font-size: 22px;
  margin-top: 20px;
}

.container {
  display: flex;
  flex-direction: column;
  justify-content: left;
  align-items: left;
}

.box {
  border-radius: 20px;
  height: 100px;
  width: calc(100% - 20px);
  margin-right: 10px;
  margin-top: 10px;
  border: 1px solid rgb(236, 236, 236);
  display: flex;
  justify-content: left;
  align-items: center;
  font-size: 1.2em;
 // cursor: pointer;
}
// .box:hover{
//   background: rgb(236, 236, 236);
// }

@media (min-width: 800px) {
  .container {
      flex-direction: row;
      flex-wrap: wrap;
  }
  .box {
      flex-basis: 45%;
      flex-direction: row;
  }
}

</style>
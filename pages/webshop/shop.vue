<template>
  <div class="shop">
    <div class="shop-menu">
      Menu
    </div>
    <div class="shop-products">
      <div v-for="(category, i) in categories" :key="i">
        <h2 class="category-header">
          {{ category.name }}
        </h2>
        <Product
          v-for="(row, j) in (category.categoryProductListItems || []).filter((x) => !x.heading)"
          :key="j"
          :product="row.product"
          :selected-line-item="selectedLineItem"
          @openProduct="openProduct"
          @openLineItem="openLineItem"
        />
      </div>
    </div>
    <div v-if="storeId" class="shop-cart">
      <Cart :store-id="storeId" :checkout-url="checkoutUrl" />
    </div>

    <Modal v-if="selectedLineItem.product" @close="selectedLineItem = {}">
      <Product
        :product="selectedLineItem.product"
      />
      <ProductConfig
        v-if="selectedLineItem &&
          selectedLineItem.product &&
          selectedLineItem.product.id
        "
        :line-item="selectedLineItem"
        @close="selectedLineItem = {}"
      />
    </Modal>
  </div>
</template>

<script>
import Product from '@/components/organisms/Product.vue'
import Cart from '@/components/organisms/Cart.vue'
import Modal from '@/components/atoms/Modal.vue'
import ProductConfig from '@/components/organisms/ProductConfig.vue'
export default {
  components: { Product, Cart, Modal, ProductConfig },
  data: () => ({
    storeId: null,
    noLayout: false,
    store: {},
    categories: [],
    selectedLineItem: {},
    timer: ''
  }),
  computed: {
    checkoutUrl () {
      return (
        '/webshop/checkout/?store=' +
        this.storeId +
        (this.noLayout ? '&nolayout=true' : '')
      )
    }
  },
  mounted () {
    this._userService.Logout() // Bug i ProductConfig når man er pålogget, jeg fikser -André
    this.init()
  },
  beforeDestroy () {
    clearInterval(this.timer)
  },
  methods: {
    openProduct (productId) {
      const comp = this
      this._cartService
        .GetCartLineItem({ product: { id: productId } })
        .then((result) => {
          if (result && result.product) {
            comp.selectedLineItem = { quantity: 1, product: result.product }
          }
        })
    },
    openLineItem (lineItem) {
      this.selectedLineItem = lineItem
    },
    init () {
      this.$store.dispatch('Load')
      this.$store.subscribe((mutation, state) => {
        if (mutation && window && window.localStorage) {
          localStorage.setItem('state', JSON.stringify(state))
        }
      })

      const search = new URLSearchParams(window.location.search) || {}
      const storeId = search.get('store') || false
      const nolayout = search.has('nolayout') || false

      if (storeId) {
        this.storeId = parseInt(storeId)
        this.noLayout = nolayout
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
      this._storeService.Get(this.storeId).then((res) => {
        this.store = res
      })
    },
    updateCategory (index, category) {
      this.$set(this.categories, index, category)
    },
    getCategories () {
      this._categoryService.GetAll(this.storeId).then((res) => {
        this.categories = res
        /*
        const firstCat = this.categories[0]
        this._categoryService.Get(firstCat.id).then((c) => {
          this.updateCategory(0, c)
        })
        */
        this.categories.forEach((category, index) => {
          this._categoryService.Get(category.id).then((c) => {
            this.updateCategory(index, c)
          })
        })
      })
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.shop {
  margin: 0 auto;
  max-width: 600px;
}
</style>

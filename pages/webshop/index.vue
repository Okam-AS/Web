<template>
  <div ref="container">
    <template v-if="store.id">
      <div v-for="(category, i) in categories" :key="i">
        <h2 class="category-header">
          {{ category.name }}
        </h2>

        <div class="container">
          <div v-for="(row, j) in (category.categoryProductListItems || []).filter(x => !x.heading)" :key="j" class="item">
            <div class="item-header" @click="openProduct(row.product.id)">
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
                <span v-if="row.product.hasDiscount" style="text-decoration:line-through;">{{ priceLabel(row.product.discountAmount+row.product.amount) }}</span>
                <span>{{ row.product.soldOut ? 'Utsolgt' : priceLabel(row.product.amount) }}</span>
              </div>
            </div>
            <template v-if="row.product && row.product.id">
              <ProductConfigFromCart :store-id="row.product.storeId" :product-id="row.product.id" />
            </template>
            <template v-if="selectedLineItem && selectedLineItem.product && selectedLineItem.product.id === row.product.id">
              <ProductConfig :line-item="selectedLineItem" />
            </template>
          </div>
        </div>
      </div>
    </template>
    <div v-if="storeId" class="sidebar-cart">
      <Cart :store-id="storeId" />
      <a class="checkout-btn" :href="checkoutUrl">Gå til kassen</a>
    </div>
  </div>
</template>

<script>
import ProductConfig from '@/components/organisms/ProductConfig.vue'
import ProductConfigFromCart from '@/components/organisms/ProductConfigFromCart.vue'
import Cart from '@/components/organisms/Cart.vue'

export default {
  components: { ProductConfig, ProductConfigFromCart, Cart },
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
      return '/webshop/checkout/?store=' + this.storeId + (this.noLayout ? '&nolayout=true' : '')
    }
  },
  mounted () {
    this.init()
    this.timer = setInterval(this.iframeHeightNotify, 300)
  },
  beforeDestroy () {
    clearInterval(this.timer)
  },
  methods: {
    iframeHeightNotify () {
      const search = new URLSearchParams(window.location.search) || {}
      const parentUrl = (search.get('parent') || '')
      if (parentUrl) {
        window.parent.postMessage({
          height: this.$refs.container.scrollHeight
        }, parentUrl)
      }
    },
    openProduct (productId) {
      const comp = this
      if (this.selectedLineItem?.product?.id === productId) {
        this.selectedLineItem = {}
      } else {
        this._cartService.GetCartLineItem({ product: { id: productId } }).then((result) => {
          if (result && result.product) {
            comp.selectedLineItem = { quantity: 1, product: result.product }
          }
        })
      }
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
        const firstCat = this.categories[0]
        this._categoryService.Get(firstCat.id).then((c) => {
          this.updateCategory(0, c)
        })
        // this.categories.forEach((category, index) => {
        //   this._categoryService.Get(category.id).then((c) => {
        //     this.updateCategory(index, c)
        //   })
        // })
      })
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

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

.item {
  display: inline-block;
  border-radius: rem(20);
  width: 35%;
  margin-right: 0;
  margin-top: rem(10);
  border: 1px solid rgb(236, 236, 236);
  font-size: 1.2em;
  cursor: pointer;
}
.item-header {
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: left;
}
.sidebar-cart {
  background:whitesmoke;
  position: fixed;
  right: 0;
  top: 0;
  height: 100%;
  width: rem(300);
  border: 1px solid black;
}
.checkout-btn{
  position: fixed;
  bottom: 0;
  width: rem(300);
  text-align: center;
  padding-top:20px;
  padding-bottom:20px;
  border-top: 1px solid black;
}
</style>
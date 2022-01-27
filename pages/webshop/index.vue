<template>
  <div class="shop">
    <div class="shop-menu">
      <span>Nettbestilling</span>
      <MyUserDropdown style="float:right" />
    </div>
    <div class="shop-products">
      <div v-for="(category, i) in categories" :key="i">
        <h2
          :class="{
            'category-header': true,
            'category-header--expanded': category.active
          }"
          tabindex="0"
          role="button"
          @click="toggleCategory(i)"
          @keyup.enter="toggleCategory(i)"
        >
          {{ category.name }}

          <div class="icon">
            <svg
              class="icon"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              fill-rule="evenodd"
              clip-rule="evenodd"
            ><path d="M23.245 4l-11.245 14.374-11.219-14.374-.781.619 12 15.381 12-15.391-.755-.609z" /></svg>
          </div>
        </h2>
        <div v-if="category.active" class="product-group">
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
    </div>
    <div v-if="storeId" class="shop-cart">
      <Cart :store-id="storeId" :checkout-url="checkoutUrl" />
    </div>

    <Modal v-if="selectedLineItem.product" @close="selectedLineItem = {}">
      <Product
        :product="selectedLineItem.product"
        :hide-line-items="true"
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
import MyUserDropdown from '@/components/atoms/MyUserDropdown.vue'
import ProductConfig from '@/components/organisms/ProductConfig.vue'

export default {
  components: { Product, Cart, Modal, MyUserDropdown, ProductConfig },
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
    this.init()
  },
  beforeDestroy () {
    clearInterval(this.timer)
  },
  methods: {
    openProduct (productId) {
      // const _this = this
      this._cartService
        .GetCartLineItem({ product: { id: productId } })
        .then((result) => {
          if (result && result.product) {
            this.selectedLineItem = { quantity: 1, product: result.product }
          }
        })
    },
    openLineItem (lineItem) {
      this._cartService
        .GetCartLineItem(lineItem)
        .then((result) => {
          if (result && result.product) {
            this.selectedLineItem = result
          }
        })
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
    closeAll () {
      const copy = JSON.parse(JSON.stringify(this.categories))
      copy.forEach((category) => {
        category.active = false
      })
      this.categories = copy
    },
    toggleCategoryActive (index) {
      if (!this.categories[index].categoryProductListItems.length) {
        this._categoryService.Get(this.categories[index].id).then((category) => {
          this.updateCategory(index, category)
          this.categories[index].active = true
        })
      } else {
        this.categories[index].active = true
      }
    },
    toggleCategory (index) {
      if (this.categories[index].active) {
        this.closeAll()
      } else {
        this.closeAll()
        this.toggleCategoryActive(index)
      }
    },
    getCategories () {
      this._categoryService.GetAll(this.storeId).then((res) => {
        this.categories = res
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

  &-menu {
    margin: rem(20) 0;
  }

  &-products {
    margin-bottom: rem(300);

    .product {
      border-bottom: 1px solid $color-neutral-light;
      margin-bottom: 0;
      padding: rem(24) rem(16);

      &:last-child {
        border-bottom: none;
      }

      &:hover,
      &:focus {
        background-color: #f6f6f6;
      }
    }
  }
  .category-header {
    background: $color-support-light;
    padding: rem(16) rem(24);
    border-bottom: rem(4) solid white;
    cursor: pointer;
    font-size: rem(20);
    font-weight: 400;

    .icon {
      float: right;
      margin-top: rem(4);

      svg {
        width: rem(20);
        height: rem(20);
        transition: transform .2s ease-in-out;
      }
    }

    &--expanded {
      .icon svg {
        transform: rotate(180deg);
      }
    }
  }

  .product-group {
    margin-bottom: rem(4);
  }
}
</style>

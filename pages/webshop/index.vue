<template>
  <div class="shop">
    <div class="shop__header">
      <div v-if="store && store.id" class="shop__header-container">
        <div class="shop__header-logo">
          <img width="50" :src="store.logoUrl" :alt="store.name + ' logo'">
        </div>
        <div class="shop__header-info">
          <h4>{{ store.name }}</h4>
          <span>{{ storeAddressOneLiner }}</span>
        </div>
      </div>
      <MyUserDropdown />
    </div>
    <Loading v-if="isLoadingInit" />
    <div v-else class="shop-products">
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
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 7.33l2.829-2.83 9.175 9.339 9.167-9.339 2.829 2.83-11.996 12.17z" /></svg>
          </div>
        </h2>
        <div v-if="category.active" class="product-group">
          <Loading v-if="isLoadingProducts" />
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

      <div
        v-if="itemsInCart.length > 0"
        class="cart-indicator"
      >
        <button
          class="cart-indicator-cart"
          @click="expandedCart = true"
          @keyup.enter="expandedCart = true"
        >
          <span class="material-icons">shopping_cart</span>
          <span>Vis handlekurv ({{ totalQuantityLabel }})</span>
        </button>
        <div class="separator" />
        <button
          class="cart-indicator-checkout"
          @click="goToCheckout"
          @keyup.enter="goToCheckout"
        >
          <span>Fortsett til betaling ({{ totalPriceLabel }})</span>
          <span class="material-icons">arrow_forward_ios</span>
        </button>
      </div>
    </div>

    <Modal v-if="storeId && itemsInCart.length > 0 && expandedCart" @close="expandedCart = false">
      <Cart :checkout-url="checkoutUrl" />
    </Modal>

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
import Loading from '@/components/atoms/Loading.vue'

export default {
  components: { Loading, Product, Cart, Modal, MyUserDropdown, ProductConfig },
  data: () => ({
    storeId: undefined,
    store: {},
    categories: [],
    selectedLineItem: {},
    timer: '',
    expandedCart: false,
    isLoadingInit: true,
    isLoadingProducts: false
  }),
  computed: {
    checkoutUrl () {
      return (
        '/webshop/checkout' + this.urlQueryStrings
      )
    },
    itemsInCart () {
      const comp = this
      const currentCart = (comp.$store.state.carts || []).find(x => x.storeId === comp.storeId) || []
      return currentCart.items || []
    },
    totalQuantityLabel () {
      const totalQuantity = this.itemsInCart
        .map(item => item.quantity)
        .reduce((a, b) => a + b, 0)
      return totalQuantity + (totalQuantity === 1 ? ' vare' : ' varer')
    },
    totalPriceLabel () {
      const totalPrice = this.itemsInCart
        .map(item => item.quantity * item.product.amount)
        .reduce((a, b) => a + b, 0)
      return this.priceLabel(totalPrice)
    },
    storeAddressOneLiner () {
      if (this.store && this.store.address) { return (this.store.address.fullAddress + ', ' + this.store.address.zipCode + ' ' + this.store.address.city) } else { return '' }
    }
  },
  watch: {
    itemsInCart () {
      if (this.itemsInCart.length === 0) {
        this.expandedCart = false
      }
    }
  },
  mounted () {
    if (this.storeId) {
      this.getStore()
      this.getCategories()
    }
  },
  beforeDestroy () {
    clearInterval(this.timer)
  },
  methods: {
    goToCheckout () {
      window.location.href = this.checkoutUrl
    },
    openProduct (productId) {
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
        this.isLoadingProducts = true
        this._categoryService.Get(this.categories[index].id).then((category) => {
          this.updateCategory(index, category)
          this.categories[index].active = true
          this.isLoadingProducts = false
        }).catch(() => {
          this.isLoadingProducts = false
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
        this.isLoadingInit = false
      }).catch(() => {
        this.isLoadingInit = false
      })
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.shop {
  &__header { 
     &-container {
      display: flex;
      align-items: stretch;
    }

    &-info {
      margin-left: rem(20);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      h4 {
        line-height: 1;
      }
      span {
        font-size: rem(12);
      }
    }

    &__title {
      font-size: rem(18);
      font-weight: 400;
      line-height: 1.3;
    }
  }

  &-products {
    padding-bottom: rem(74);
    margin-right: rem(-24);
    margin-left: rem(-24);

    .product {
      cursor: pointer;
      border-bottom: 1px solid $color-neutral-light;

      &:hover,
      &:focus {
        background-color: #f6f6f6;
      }

      &:last-child {
        border-bottom: none;
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

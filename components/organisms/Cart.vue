<template>
  <div>
    <h2 class="cart__heading">
      Handlekurv
    </h2>
    <div
      v-for="item in itemsInCart"
      :key="item.id"
      class="cart-row"
    >
      <div class="cart-row__title">
        <div class="cart-row__heading">
          {{ item.product.name }}
        </div>
        <div class="cart-row__extras">
          {{ item.product.selectedOptionNames }}
        </div>
      </div>

      <div class="cart-row__controls">
        <div class="cart-row__price">
          {{ priceLabel(item.product.amount) }}
        </div>

        <Stepper
          :quantity="item.quantity"
          class="stepper--small"
          @add="addQuantity(item, 1)"
          @subtract="addQuantity(item, -1)"
        />
      </div>
    </div>
    <div class="btn-row btn-row--right">
      <continue-button @click="checkout">
        Fortsett
      </continue-button>
    </div>
  </div>
</template>

<script>
import Stepper from '@/components/molecules/Stepper'
import ContinueButton from '@/components/atoms/ContinueButton'

export default {
  components: { ContinueButton, Stepper },
  props: {
    checkoutUrl: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      isLoading: false,
      errorMessage: '',
      expanded: false
    }
  },
  computed: {
    itemsInCart () {
      const comp = this
      const currentCart = (comp.$store.state.carts || []).find(x => x.storeId === comp.storeId) || []
      return currentCart.items || []
    }
  },
  watch: {
    expanded () {
      if (this.expanded) {
        this.addNoScroll()
      } else {
        this.removeNoScroll()
      }
    }
  },
  beforeDestroy () {
    document.body.classList.remove('noscroll')
    window.removeEventListener('keydown', this.escapeListener)
  },
  methods: {
    escapeListener (e) {
      if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
        this.expanded = false
      }
    },
    addNoScroll () {
      document.body.classList.add('noscroll')
      window.addEventListener('keydown', this.escapeListener)
    },
    removeNoScroll () {
      document.body.classList.remove('noscroll')
      window.removeEventListener('keydown', this.escapeListener)
    },
    addQuantity (lineItem, add) {
      if ((lineItem.quantity + add) === 0) {
        this._cartService.RemoveLineItem({
          storeId: this.storeId,
          lineItem
        })
      } else {
        const tempLineItem = JSON.parse(JSON.stringify(lineItem))
        tempLineItem.quantity += add
        this._cartService.SetLineItem({
          storeId: this.storeId,
          lineItem: tempLineItem
        })
      }
    },
    checkout () {
      window.location.href = this.checkoutUrl
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.cart {
  // border: 1px solid $color-support;
  background: #fff;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 100vh;
  overflow-y: auto;
  @include z-index('cart');

  &--expanded {
    top: 0;
    padding: rem(24);
  }

  &__heading {
    margin-bottom: rem(24);
  }

  &-row {
    display: flex;
    column-gap: rem(24);
    justify-content: space-between;
    padding: rem(16) rem(24);
    margin: 0 rem(-24) rem(4);
    background-color: $color-support-light;

    &__title {
      flex-grow: 1;
    }

    &__heading {
      font-weight: 700;
    }

    &__extras {
      font-size: rem(14);
    }

    &__price {
      text-align: right;
      margin-bottom: rem(8);
    }
  }

  &-content {
    max-width: rem(600);
    margin: rem(24) auto;
  }

  &-indicator {
    cursor: pointer;
    padding: rem(20);
    text-align: right;
    background-color: $color-profile-dark;
    color: #fff;
  }
}

</style>
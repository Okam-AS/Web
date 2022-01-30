<template>
  <div class="cart">
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
    <div class="btn-row btn-row--right btn-row--modal">
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
      errorMessage: ''
    }
  },
  computed: {
    itemsInCart () {
      const comp = this
      const currentCart = (comp.$store.state.carts || []).find(x => x.storeId === comp.storeId) || []
      return currentCart.items || []
    }
  },
  methods: {
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
  padding: rem(24) rem(24) rem(74);

  &--expanded {
    top: 0;
    padding: rem(24);
  }

  &__heading {
    margin-bottom: rem(24);
    font-size: rem(20);
    font-weight: 400;
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
}

</style>
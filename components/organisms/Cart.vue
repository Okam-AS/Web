<template>
  <div v-if="itemsInCart.length" class="cart">
    <div v-if="expanded">
      <button @click="expanded = false">
        Lukk
      </button>
      <h2>Handlekurv</h2>
      <div
        v-for="item in itemsInCart"
        :key="item.id"
        class="cart-row"
      >
        <div class="cart-row-title">
          <span style="font-weight:bold">{{ item.product.name }}</span><br>
          <span>{{ item.product.selectedOptionNames }}</span>
        </div>

        <div class="cart-row-controls">
          <span style="font-size:10px;color:gray;">
            {{ priceLabel(item.product.amount) }}
          </span>

          <Stepper
            :quantity="item.quantity"
            @add="addQuantity(item, 1)"
            @subtract="addQuantity(item, -1)"
          />
        </div>
      </div>

      <button
        class="checkout-button"
        @click="checkout"
      >
        Fortsett
      </button>
    </div>

    <div v-else style="cursor: pointer" @click="expanded = true">
      Handlekurv ({{ itemsInCart.length }})
    </div>
  </div>
</template>

<script>
import Stepper from '@/components/molecules/Stepper'

export default {
  components: { Stepper },
  props: {
    storeId: {
      type: Number,
      default: 0
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
      alert('TODO: Implement')
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.cart {
  background: $color-profile;
  border: 1px solid $color-support;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 100vh;
  overflow-y: auto;
  @include z-index('cart');

  &-row {
    width: 100%;
    display: flex;
    justify-content: space-between;
    padding: rem(10);

    &-title {
      flex-grow: 1;
    }
  }
}

.checkout-button {
  background: $color-support;
  color: white;
  padding: rem(10);
  border-radius: rem(20);
  border: none;
}
</style>
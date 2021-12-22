<template>
  <div class="cart">
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

        <button @click="addQuantity(item, -1)">
          -
        </button>
        <span class="cart-row-controls-quantity">{{ item.quantity }}</span>
        <button @click="addQuantity(item, 1)">
          +
        </button>
      </div>
    </div>
  </div>
</template>

<script>

export default {
  props: {
    storeId: {
      type: Number,
      default: 0
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
    }
  }
}
</script>

<style lang="scss" scoped>
.cart {
  background: #D5F6E5;
  border: 1px solid green;

  &-row {
    width: 100%;
    display: flex;
    justify-content: space-between;

    &-title {
      flex-grow: 1;
    }

    &-controls {
      &-quantity {
        display: inline-block;
        min-width: 3rem;
        text-align: center;
      }
    }
  }

  button {
    padding: 10px;
    border-radius: 5px;
  }
}
</style>
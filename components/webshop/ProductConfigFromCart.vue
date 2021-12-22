<template>
  <div v-if="itemsInCart.length" class="product-config">
    <div
      v-for="item in itemsInCart"
      :key="item.id"
      class="product-config-item"
    >
      <div class="product-config-item-description">
        <span>{{ item.product.name }}</span>
        <span>{{ item.product.selectedOptionNames }}</span>
        <span>{{ priceLabel(item.product.amount) }}</span>
      </div>
      <div class="product-config-item-controls">
        <button @click="addQuantity(item, -1)">
          -
        </button>
        <span class="product-config-item-controls-quantity">{{ item.quantity }}</span>
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
    productId: {
      type: String,
      default: ''
    },
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
      return (currentCart.items || []).filter(x => !!x.product && x.product.id === comp.productId)
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
.product-config {
  width: 100%;
  display: flex;
  flex-direction: column;
  background: #D5F6E5;
  border: 1px solid green;
  border-radius: 5px;

  &-item {
    display: flex;
    justify-content: space-between;

    &-description {
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

  &-product {
    flex-grow: 1;
  }

  button {
    padding: 10px;
    border-radius: 5px
  }
}
</style>
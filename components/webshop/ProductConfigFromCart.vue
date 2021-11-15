<template>
  <div v-if="itemsInCart.length" class="product-config">
    <div
      v-for="item in itemsInCart"
      :key="item.id"
      class="product-config"
    >
      <span>{{ item.product.name }}</span>
      <span>{{ item.product.selectedOptionNames }}</span>
      <span>{{ priceLabel(item.product.amount) }}</span>
      <button @click="addQuantity(item, -1)">-</button>
      <span>{{ item.quantity }}</span>
      <button @click="addQuantity(item, 1)">+</button>
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
          lineItemId: lineItem.id
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
  justify-content: space-between;
  background: #D5F6E5;
  border: 1px solid green;
  border-radius: 5px;

  &-product {
    flex-grow: 1;
  }

  button {
    padding: 10px;
    border-radius: 5px
  }
}
</style>
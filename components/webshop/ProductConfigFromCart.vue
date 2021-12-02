<template>
  <div v-if="itemsInCart.length" class="product-config-from-cart">
    <table class="product-config-from-cart-summary">
      <tr v-for="item in itemsInCart" :key="item.id">
        <td>{{ item.product.name }}</td>
        <td>{{ item.product.selectedOptionNames }}</td>
        <td>{{ priceLabel(item.product.amount) }}</td>

        <td @click="addQuantity(item, -1)">
          -
        </td>
        <td>{{ item.quantity }}</td>
        <td @click="addQuantity(item, 1)">
          +
        </td>
      </tr>
    </table>
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
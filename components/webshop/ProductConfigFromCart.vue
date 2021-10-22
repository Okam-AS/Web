<template>
  <table>
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
        this.$store.dispatch('RemoveLineItem', {
          storeId: this.storeId,
          lineItemId: lineItem.id
        })
      } else {
        const tempLineItem = JSON.parse(JSON.stringify(lineItem))
        tempLineItem.quantity += add
        this.$store.dispatch('SetLineItem', {
          storeId: this.storeId,
          lineItem: tempLineItem
        })
      }
    },
    wholeAmount (amount) {
      if (!amount) { return '0' }
      const wholeAmount = amount.toString().slice(0, -2)
      return wholeAmount ? wholeAmount.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '0'
    },
    fractionAmount (amount) {
      if (!amount) { return '00' }
      const fractionAmount = amount.toString().slice(-2)
      return fractionAmount.length < 2 ? '00' : fractionAmount
    },
    priceLabel (totalPrice, hideFractionIfZero) {
      return (
        'kr ' + this.wholeAmount(totalPrice) + ((!hideFractionIfZero || parseInt(this.fractionAmount(totalPrice)) > 0)
          ? ',' + this.fractionAmount(totalPrice)
          : '')
      )
    }
  }
}
</script>
<style scoped>
.selected{
  background:lightgreen
}
</style>
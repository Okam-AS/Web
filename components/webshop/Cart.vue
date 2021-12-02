<template>
  <div class="cart">
    <h2>Handlekurv</h2>
    <table>
      <tr v-for="item in itemsInCart" :key="item.id">
        <td><span style="font-weight:bold">{{ item.product.name }}</span><br><span>{{ item.product.selectedOptionNames }}</span></td>

        <td style="font-size:10px;color:gray;">
          {{ priceLabel(item.product.amount) }}
        </td>

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

<style lang="scss" scoped>
.cart {
  background: #D5F6E5;
  border: 1px solid green;
}
</style>
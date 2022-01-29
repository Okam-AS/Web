<template>
  <div v-if="itemsInCart.length" class="product-config">
    <div
      v-for="item in itemsInCart"
      :key="item.id"
      class="product-config-item"
      @click.stop="openLineItem(item)"
    >
      <div class="product-config-item-description">
        <span>{{ item.product.name }}</span>
        <span>{{ item.product.selectedOptionNames }}</span>
        <span>{{ priceLabel(item.product.amount) }}</span>
      </div>
      <span class="material-icons">
        edit
      </span>
      <Stepper
        :quantity="item.quantity"
        @add="addQuantity(item, 1)"
        @subtract="addQuantity(item, -1)"
      />
    </div>
  </div>
</template>

<script>
import Stepper from '@/components/molecules/Stepper'

export default {
  components: { Stepper },
  props: {
    productId: {
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
      return (currentCart.items || []).filter(x => !!x.product && x.product.id === comp.productId)
    }
  },
  methods: {
    openLineItem (lineItem) {
      this.$emit('openLineItem', lineItem)
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
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.product-config {
  display: flex;
  flex-direction: column;
  background: $color-profile;
  border: 1px solid $color-support;
  border-radius: rem(5);
  margin-left: rem(70);
  padding: rem(10);

  &-item {
    display: flex;
    justify-content: space-between;

    &-description {
      flex-grow: 1;
    }
  }

  &-product {
    flex-grow: 1;
  }
}
</style>
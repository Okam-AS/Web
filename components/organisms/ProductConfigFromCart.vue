<template>
  <div v-if="itemsInCart.length" class="product-config">
    <div
      v-for="item in itemsInCart"
      :key="item.id"
      class="product-config-item"
      @click.stop="openLineItem(item)"
    >
      <div class="product-config-item-description">
        <div>
          <span>{{ item.product.name }}</span>
          <span>{{ item.product.selectedOptionNames }}</span>
        </div>
        <div class="product-config-item-price">
          {{ priceLabel(item.product.amount) }}
        </div>
      </div>
      <div class="product-config-item-tools">
        <div class="product-config-item-edit">
          <span class="product-config-item-edit-icon material-icons">
            edit
          </span>
          <span>Endre</span>
        </div>
        <Stepper
          :quantity="item.quantity"
          class="stepper--small"
          @add="addQuantity(item, 1)"
          @subtract="addQuantity(item, -1)"
        />
      </div>
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
  background: $color-support-light;
  margin-top: rem(16);
  padding: rem(16);
  border-radius: rem(10);

  &-item {
    &-description {
      flex-grow: 1;
      display: flex;
      justify-content: space-between;
      column-gap: rem(24);
      line-height: 1.35;
      font-size: rem(14);
    }

    &-price {
      font-weight: 700;
      white-space: nowrap;
    }

    &-tools {
      display: flex;
      justify-content: space-between;
      margin-top: rem(16);
    }

    &-edit {
      display: flex;
      align-items: center;
      font-size: rem(14);

      &-icon {
        font-size: rem(20);
        margin-right: rem(4);
      }
    }
  }

  &-product {
    flex-grow: 1;
  }
}
</style>
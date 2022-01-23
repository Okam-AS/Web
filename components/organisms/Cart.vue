<template>
  <focus-trap>
    <div
      v-if="itemsInCart.length"
      :class="{
        'cart': true,
        'cart--expanded': expanded
      }"
    >
      <div
        v-if="expanded"
        class="cart-content"
      >
        <button
          class="close-button"
          @click="expanded = false"
        >
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

        <continue-button
          @click="checkout"
        >
          Fortsett
        </continue-button>
      </div>

      <div
        v-else
        class="cart-indicator"
        @click="expanded = true"
      >
        Handlekurv ({{ itemsInCart.length }})
      </div>
    </div>
  </focus-trap>
</template>

<script>
import Stepper from '@/components/molecules/Stepper'
import FocusTrap from '@/components/molecules/FocusTrap'
import ContinueButton from '@/components/atoms/ContinueButton'

export default {
  components: { ContinueButton, FocusTrap, Stepper },
  props: {
    storeId: {
      type: Number,
      default: 0
    },
    checkoutUrl: {
      type: String,
      default: ''
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
  watch: {
    expanded () {
      if (this.expanded) {
        this.addNoScroll()
      } else {
        this.removeNoScroll()
      }
    }
  },
  mounted () {
    document.body.classList.add('noscroll')
    window.addEventListener('keydown', this.escapeListener)
  },
  beforeDestroy () {
    document.body.classList.remove('noscroll')
    window.removeEventListener('keydown', this.escapeListener)
  },
  methods: {
    escapeListener (e) {
      if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
        this.expanded = false
      }
    },
    addNoScroll () {
      document.body.classList.add('noscroll')
      window.addEventListener('keydown', this.escapeListener)
    },
    removeNoScroll () {
      document.body.classList.remove('noscroll')
      window.removeEventListener('keydown', this.escapeListener)
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
  background: $color-profile;
  border: 1px solid $color-support;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 100vh;
  overflow-y: auto;
  @include z-index('cart');

  &--expanded {
    top: 0;
    padding: rem(20);
  }

  &-row {
    width: 100%;
    display: flex;
    justify-content: space-between;
    padding: rem(10);

    &-title {
      flex-grow: 1;
    }
  }

  &-content {
    max-width: rem(600);
    margin: rem(60) auto;
  }

  &-indicator {
    cursor: pointer;
    padding: rem(20);
    text-align: right;
  }
}

.close-button {
  float: right;
}

</style>
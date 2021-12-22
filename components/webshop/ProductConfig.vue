<template>
  <div class="product-conf">
    <div
      v-for="(variant, i) in localLineItem.product.productVariants"
      :key="i"
    >
      <div>
        <span style="font-weight:bold">{{ variant.name }}</span>
        <span style="font-size: 0.5em;color:gray;">{{ variant.required ? 'Påkrevd' : 'Valgfritt' }}</span>
      </div>
      <div>
        <div
          v-for="(option, j) in variant.options"
          :key="j"
          :class="{'selected' : selectedOptions.map(x => x.id).includes(option.id)}"
          style="font-size: 0.8em;"
          @click="optionClick(option.id)"
        >
          {{ option.name }}
        </div>
      </div>
    </div>
    <div class="product-conf-controls">
      <button @click="addQuantity(-1)">
        -
      </button>
      <span class="product-conf-controls-quantity">{{ localLineItem.quantity }}</span>
      <button @click="addQuantity(1)">
        +
      </button>

      <button @click="saveAndClose">
        {{ saveBtnText }}
      </button>
      <span>{{ priceLabel(totalAmount) }}</span>
      <span>{{ selectedOptionNames }}</span>
    </div>
  </div>
</template>

<script>

export default {
  props: {
    lineItem: {
      type: Object,
      default: () => { }
    }
  },
  data () {
    return {
      isLoading: false,
      errorMessage: '',
      localLineItem: {
        quantity: 1,
        product: {
          productVariants: []
        }
      }
    }
  },
  computed: {
    saveBtnText () {
      if (
        this.localLineItem.quantity === 0 ||
        (this.localLineItem.product.soldOut && this.localLineItem.id)
      ) { return 'Fjern fra handlevogn' }
      if (!this.localLineItem.id) { return 'Legg i handlevogn' }
      return 'Oppdater'
    },
    saveEnabled () {
      const loading = this.isLoading || this.$store.state.cartIsLoading
      const disable = this.localLineItem.product.soldOut && !this.lineItem.id
      return !loading && !disable
    },
    selectedOptionNames () {
      return this.selectedOptions.map(x => x.name).join(', ')
    },
    selectedOptionsAmount () {
      let optionsAmount = 0
      this.selectedOptions.forEach((option) => {
        optionsAmount += option.amount * (option.negativeAmount ? -1 : 1)
      })
      return optionsAmount
    },
    selectedOptions () {
      const selectedOptions = [];
      (this.localLineItem.product.productVariants || []).forEach((variant) => {
        variant.options
          .filter(y => y.selected)
          .forEach((option) => {
            selectedOptions.push(option)
          })
      })
      return selectedOptions
    },
    totalAmount () {
      const totalAmount =
        (this.localLineItem.product.baseAmount || 0) +
        this.selectedOptionsAmount -
        this.localLineItem.product.discountAmount
      return (
        (totalAmount <= 0 ? this.localLineItem.product.amount : totalAmount) *
        (this.localLineItem.quantity ? this.localLineItem.quantity : 1)
      )
    }
  },
  mounted () {
    this.localLineItem = JSON.parse(JSON.stringify(this.lineItem))
  },
  methods: {
    createGuid () {
      const _p8 = (s) => {
        const p = (Math.random().toString(16) + '000000000').substr(2, 8)
        return s ? '-' + p.substr(0, 4) + '-' + p.substr(4, 4) : p
      }
      return _p8() + _p8(true) + _p8(true) + _p8()
    },
    optionClick (optionId) {
      (this.localLineItem.product.productVariants || []).forEach((variant) => {
        const optionIsInThisVariant = variant.options.find(
          x => x.id === optionId
        )
        if (optionIsInThisVariant) {
          variant.options.forEach((option) => {
            if (!variant.multiselect && option.id !== optionId) { option.selected = false }
            if (option.id === optionId) { option.selected = !option.selected }
          })
        }
      })
    },
    valid () {
      const errorMessage = ''
      if (
        this.localLineItem.quantity === 0 ||
        this.localLineItem.product.soldOut
      ) { return true }
      // (this.localLineItem.product.productVariants || []).some((variant) => {
      //   if (
      //     variant.options &&
      //     variant.required &&
      //     (variant.options.filter(option => option.selected) || []).length ===
      //       0
      //   ) {
      //     errorMessage =
      //       'Velg \'' + variant.name + '\' for å legge vare i handlevogn'
      //     return true // Breaks loop
      //   }
      // })
      if (errorMessage) {
        window.alert(errorMessage)
      }
      return !errorMessage
    },
    addQuantity (addQuantity) {
      const comp = this
      const newQuantity = comp.localLineItem.quantity + addQuantity
      if (
        newQuantity < 0 ||
        (comp.localLineItem.product.soldOut && addQuantity > 0)
      ) { return }
      comp.localLineItem.quantity = newQuantity
    },
    saveAndClose () {
      const comp = this

      if (!comp.saveEnabled || !comp.valid()) { return }
      if (!comp.localLineItem.id) {
        if (comp.localLineItem.quantity === 0) {
          // comp.$modal.close()
          return
        }
        comp.localLineItem.id = comp.createGuid()
      }
      comp.localLineItem.product.selectedOptionNames = this.selectedOptionNames
      comp.localLineItem.product.selectedOptionsAmount = this.selectedOptionsAmount
      comp.localLineItem.product.amount =
        comp.localLineItem.product.baseAmount + this.selectedOptionsAmount
      if (comp.localLineItem.product.soldOut) { comp.localLineItem.quantity = 0 }

      if (comp.localLineItem.quantity === 0) {
        comp._cartService.RemoveLineItem({
          storeId: comp.localLineItem.product.storeId,
          lineItem: comp.localLineItem
        })
      } else {
        comp._cartService.SetLineItem({
          storeId: comp.localLineItem.product.storeId,
          lineItem: JSON.parse(JSON.stringify(comp.localLineItem))
        })
      }

      this.$emit('close')
      // comp.$modal.close(comp.localLineItem.product.id)
    }
  }
}
</script>
<style scoped>
.selected{
  background:lightgreen
}

.product-conf {
  border: 1px solid red;
}
</style>
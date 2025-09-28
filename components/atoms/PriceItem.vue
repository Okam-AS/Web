<template>
  <div class="faq-list__item">
    <div class="faq-list__question-wrapper">
      <div>
        <h3>{{ selectButtonTitle }}</h3>
        <slot />
      </div>
    </div>
  </div>
</template>

<script>

export default {
  props: {
    selected: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: ''
    },
    price: {
      type: Number,
      default: 0
    },
    oldPrice: {
      type: Number,
      default: 0
    }
  },
  computed: {
    selectButtonTitle () {
      if (!this.priceLabel) {
        return ''
      }
      if (this.price > 0) { return this.title + ' (' + this.priceLabel(this.price) + ')' }

      return this.title + ' (GRATIS)'
    }
  },
  methods: {
    selectClick (value) {
      this.$emit('change', value)
    }
  }
}
</script>
<template>
  <div>
    <Loading />
  </div>
</template>

<script type="ts">
import Loading from '@/components/atoms/Loading.vue'

export default {
  components: { Loading },
  mounted () {
    if (this.storeId) {
      this._cartService
        .Complete(this.storeId)
        .then(() => {
          this.redirectToSuccess()
        })
        .catch(() => {
          this.redirectToError()
        })
    } else {
      this.redirectToError()
    }
  },
  methods: {
    redirectToSuccess () {
      location.href = '/webshop/orders?nolayout=true&paymentStatus=success&store=' + this.storeId
    },
    redirectToError () {
      location.href = '/webshop/checkout?nolayout=true&paymentStatus=failed' + (this.storeId ? '&store=' + this.storeId : '')
    }
  }
}
</script>
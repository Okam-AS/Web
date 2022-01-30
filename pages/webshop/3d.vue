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
      this.paymentStatus = 'success'
      location.href = '/webshop/orders' + this.urlQueryStrings
    },
    redirectToError () {
      this.paymentStatus = 'failed'
      location.href = '/webshop/checkout' + this.urlQueryStrings
    }
  }
}
</script>
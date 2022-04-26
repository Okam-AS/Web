<template>
  <div>
    <Loading v-if="isLoading" />
    <div v-if="showSuccessResponse || showFailResponse">
      <span>{{ showSuccessResponse ? "Success" : "Fail" }}</span>
    </div>
  </div>
</template>

<script type="ts">
import Loading from '@/components/atoms/Loading.vue'

export default {
  components: { Loading },
  data: () => ({
    isLoading: true,
    vippsOrderId: '',
    showSuccessResponse: false,
    showFailResponse: false
  }),
  computed: {
    userIsLoggedIn () {
      return this.$store.getters.userIsLoggedIn
    }
  },
  mounted () {
    const search =
      window && window.location
        ? new URLSearchParams(window.location.search) || {}
        : {}

    this.vippsOrderId = search.has('vippsOrderId')
      ? decodeURI(search.get('vippsOrderId'))
      : ''

    if (this.vippsOrderId) {
      setTimeout(() => {
        const intervalId = setInterval(() => {
          this._vippsService
            .Verify(this.vippsOrderId)
            .then((result) => {
              // result.status: 'Waiting', 'Success', or 'Fail'
              if (result.status === 'Success') {
                clearInterval(intervalId)
                this.handleSuccess(result.storeId)
              } else if (result.status === 'Fail') {
                clearInterval(intervalId)
                this.handleError(result.storeId)
              }
            })
            .catch(() => {
              clearInterval(intervalId)
              this.handleError()
            })
        }, 2000)
      }, 3000)
    } else {
      this.handleError()
    }
  },
  methods: {
    handleSuccess (storeId) {
      if (this.userIsLoggedIn && storeId) {
        this.redirectToSuccess(storeId)
      } else {
        this.isLoading = false
        this.showSuccessResponse = true
      }
    },
    handleError (storeId) {
      if (this.userIsLoggedIn && storeId) {
        this.redirectToError(storeId)
      } else {
        this.isLoading = false
        this.showFailResponse = true
      }
    },
    redirectToSuccess (storeId) {
      window.location.href =
        '/webshop/orders?store=' + storeId + '&paymentStatus=success'
    },
    redirectToError (storeId) {
      window.location.href =
        '/webshop/checkout?store=' + storeId + '&paymentStatus=failed'
    }
  }
}
</script>
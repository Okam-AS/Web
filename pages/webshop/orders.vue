<template>
  <div class="shop">
    <div class="shop__header">
      <button v-if="storeId" class="shop__header-back" @click="goToStore">
        <span class="shop__header-back-icon material-icons">arrow_back</span>
      </button>
      <span>Mine bestillinger</span>
      <MyUserDropdown @close="loadOrders" />
    </div>
    <div v-if="successMessage && orders && orders[0]" class="message-box">
      <div>
        {{ successMessage }}
      </div>
      <div class="push-label">
        Du får en behandlingstid når bestillingen har blitt godkjent. Som oftes
        blir bestillinger godkjent innen noen få minutter, men ved stor pågang
        kan det ta noe lengre tid.
      </div>
      <div class="push-label">
        Få varsling da bestillingen er klar ved å laste ned Okam appen
      </div>
      <div class="download-links">
        <a href="https://apps.apple.com/no/app/okam/id1514296965">
          <img
            class="appstore"
            src="~/assets/UI/appstore-btn.png"
            alt="appstore"
          >
        </a>
        <a
          href="https://play.google.com/store/apps/details?id=no.okam.consumer"
        >
          <img
            class="googleplay"
            src="~/assets/UI/googleplay-btn.png"
            alt="googleplay"
          >
        </a>
      </div>
    </div>
    <div v-if="!$store.getters.userIsLoggedIn">
      Du må logge inn for å se dine bestillinger
    </div>
    <div v-else>
      <Loading v-if="isLoadingOrders" />
      <div
        v-for="order in orders"
        :key="order.id"
        class="order-item"
        @click="openOrder(order)"
      >
        <span class="order-id">{{
          order.friendlyOrderId ? order.friendlyOrderId : order.id
        }}</span>
        <span class="store-name">{{ order.storeLegalName }}</span>
        <span style="float: right">{{
          formatDate(order.created || order.pickup)
        }}</span>
      </div>
    </div>
    <OrderModal
      v-if="selectedOrder && selectedOrder.id"
      :order="selectedOrder"
      @close="closeOrder"
    />
  </div>
</template>

<script>
import OrderModal from '@/components/molecules/OrderModal.vue'
import Loading from '@/components/atoms/Loading.vue'
import MyUserDropdown from '@/components/atoms/MyUserDropdown.vue'

export default {
  components: { OrderModal, Loading, MyUserDropdown },
  data: () => ({
    storeId: undefined,
    paymentStatus: '',
    successMessage: '',
    isLoadingOrders: false,
    orders: [],
    selectedOrder: {},
    continuouslyLoadOrders: false
  }),
  mounted () {
    this.loadOrders()

    setInterval(() => {
      if (this.continuouslyLoadOrders) {
        this.loadOrders(true)
      }
    }, 10000)

    if (this.paymentStatus === 'success') {
      if (!!this.storeId && this.storeId > 0) {
        this._cartService.DeleteFromDbAndState(this.storeId)
      }
      this.successMessage = 'Takk! Bestillingen er nå sendt inn.'
      const nextUrl = window.location.href
        .replace('&paymentStatus=success', '')
        .replace('?paymentStatus=success', '')

      window.history.replaceState({}, '', nextUrl)

      this.paymentStatus = ''
    }
  },
  methods: {
    goToStore () {
      window.location.href = '/webshop' + this.urlQueryStrings
    },
    loadOrders (withoutLoadingSpinner) {
      if (!this.$store.getters.userIsLoggedIn) {
        return
      }
      this.isLoadingOrders = !withoutLoadingSpinner
      this._orderService
        .GetAll()
        .then((orders) => {
          this.orders = orders || []
          this.continuouslyLoadOrders =
            (
              this.orders.filter(
                x => x.status !== 'Completed' && x.status !== 'Canceled'
              ) || []
            ).length > 0

          if (this.selectedOrder && this.selectedOrder.id) {
            const updatedOrder = this.orders.find(
              x => x.id === this.selectedOrder.id
            )
            if (updatedOrder && updatedOrder.id) {
              this.selectedOrder = updatedOrder
            }
          }

          if (window.location.href.includes('&popopen=true')) {
            const popOpen = window.location.href.replace('&popopen=true', '')
            window.history.replaceState({}, '', popOpen)

            this.openOrder(this.orders[0])
          }

          this.isLoadingOrders = false
        })
        .catch(() => {
          this.isLoadingOrders = false
        })
    },
    openOrder (order) {
      this.selectedOrder = order
      this.successMessage = ''
    },
    closeOrder () {
      this.selectedOrder = {}
    }
  }
}
</script>
<style lang="scss" scoped>
.order-item {
  border: 1px solid black;
  border-bottom: none;
  padding: 20px;
  cursor: pointer;

  &:last-child {
    border-bottom: 1px solid black;
  }
}
.order-id {
  background: black;
  color: white;
  padding: 5px;
  border-radius: 5px;
}
.store-name {
  margin-left: 1em;
}
</style>
<template>
  <div class="shop">
    <div class="shop__header">
      <button v-if="storeId" class="shop__header-back" @click="goToStore">
        <span class="shop__header-back-icon material-icons">arrow_back</span>
      </button>
      <span>Mine bestillinger</span>
      <MyUserDropdown @close="loadOrders" />
    </div>
    <div v-if="successMessage" class="message-box">
      <div>
        {{ successMessage }}
      </div>
    </div>
    <div v-if="!$store.getters.userIsLoggedIn">
      Du må logge inn for å se dine bestillinger
    </div>
    <div v-else>
      <Loading v-if="isLoadingOrders" />
      <div v-for="order in orders" :key="order.id" class="order-item" @click="openOrder(order)">
        <span class="order-id">{{ order.id }}</span>
        <span style="float:right">{{ formatDate(order.created || order.pickup) }}</span>
      </div>
    </div>
    <OrderModal v-if="selectedOrder && selectedOrder.id" :order="selectedOrder" @close="closeOrder" />
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
    selectedOrder: {}
  }),
  mounted () {
    this.loadOrders()
    if (this.paymentStatus === 'success') {
      if (!!this.storeId && this.storeId > 0) {
        this._cartService.DeleteFromDbAndState(this.storeId)
      }
      this.successMessage = 'Takk for din bestilling!'
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
    loadOrders () {
      if (!this.$store.getters.userIsLoggedIn) { return }
      this.isLoadingOrders = true
      this._orderService.GetAll().then((orders) => {
        this.orders = orders
        this.isLoadingOrders = false
      }).catch(() => {
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
.order-item{
  border: 1px solid black;
  border-bottom: none;
  padding: 20px;
  cursor: pointer;

  &:last-child {
    border-bottom: 1px solid black;
  }
}
.order-id{
  background:black;
  color:white;
  padding:5px;
  border-radius: 5px;
}
</style>
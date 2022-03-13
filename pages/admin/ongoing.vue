<template>
  <AdminPage>
    <div class="container">
      <Loading v-if="isLoading" :loading="true" />

      <div v-for="order in filteredOrders" :key="order.id">
        <div
          style="background: lightgray; margin-bottom: 2px; padding: 1em"
          @click="
            showOrderId === order.id
              ? (showOrderId = '')
              : (showOrderId = order.id)
          "
        >
          <span>{{ order.storeLegalName }}</span>
          <span style="float: right">{{ orderStatusLabel(order.status) }}</span>
        </div>
        <div v-if="showOrderId === order.id">
          <span>Bestilit: {{ formatDate(order.created || order.pickup) }}</span>
          <br>
          <span>Klar til: {{ formatDate(order.countdownEndTime) }}</span>
          <br>
          <span>Ferdig: {{ formatDate(order.completed) }}</span>
          <br>
          <span>Totalpris: {{ priceLabel(order.finalAmount) }}</span>
          <br>
          <span>Levering: {{ deliveryTypeLabel(order.deliveryType) }}</span>
          <br>
          <span v-if="order.tableName">Bordnummer: {{ order.tableName }}</span>
          <br v-if="order.tableName">
          <span>Betaling:
            {{
              order.paymentType === "PayInStore" ? "Betal i kassen" : "Betalt"
            }}</span>
          <br>
          <span>Kommentar: {{ order.comment }}</span>
          <br>
          <br>
        </div>
      </div>
      <LoginModal v-if="showLogin" @close="closeLoginModal" />
    </div>
  </AdminPage>
</template>
<script>
import AdminPage from '@/components/organisms/AdminPage.vue'
import Loading from '@/components/atoms/Loading.vue'
import LoginModal from '~/components/molecules/LoginModal.vue'

export default {
  components: { AdminPage, LoginModal, Loading },
  data: () => ({
    showLogin: false,
    isLoading: false,
    orders: [],
    showOrderId: ''
  }),
  computed: {
    filteredOrders () {
      return this.orders || []
    }
  },
  mounted () {
    if (!this.$store.getters.userIsLoggedIn) {
      this.showLogin = true
      return
    }
    this.loadOrders()
  },
  methods: {
    closeLoginModal (isLoggedIn) {
      this.showLogin = !isLoggedIn
      if (isLoggedIn) {
        this.loadOrders()
      }
    },
    loadOrders () {
      this.isLoading = true
      this._orderService
        .GetAllOngoing()
        .then((orders) => {
          this.orders = orders
        })
        .finally(() => {
          this.isLoading = false
        })
    }
  }
}
</script>
<style lang="scss">
@import "../../assets/sass/common.scss";

table {
  width: 100%;
}
</style>

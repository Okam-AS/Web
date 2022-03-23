<template>
  <AdminPage>
    <div class="container">
      <Loading v-if="isLoading" :loading="true" />

      <div
        v-for="order in filteredOrders"
        :key="order.id"
        style="border: 1px solid gray; margin-bottom: 2px"
      >
        <div
          style="background: lightgray; padding: 1em; cursor: pointer"
          @click="
            showOrderId === order.id
              ? (showOrderId = '')
              : (showOrderId = order.id)
          "
        >
          <span>{{ order.storeLegalName }}</span>
          <span style="float: right">{{ orderStatusLabel(order.status) }}</span>
        </div>
        <div v-if="showOrderId === order.id" style="margin: 1em">
          <span>Platform: {{ order.platform }}</span>
          <br>
          <span>Bestilit: {{ formatDate(order.created || order.pickup) }}</span>
          <br>
          <span
            v-if="order.countdownEndTime"
          >Klar til: {{ formatDate(order.countdownEndTime) }}</span>
          <br v-if="order.countdownEndTime">
          <span
            v-if="order.completed"
          >Ferdig: {{ formatDate(order.completed) }}</span>
          <br v-if="order.completed">
          <span>Totalpris: {{ priceLabel(order.finalAmount) }}</span>
          <br>
          <span>Levering: {{ deliveryTypeLabel(order.deliveryType) }}</span>
          <br>
          <span v-if="order.tableName">Bordnummer: {{ order.tableName }}</span>
          <br v-if="order.tableName">
          <span>Betaling: {{ paymentTypeLabel(order.paymentType) }} </span>
          <br>
          <span>Kommentar: {{ order.comment }}</span>
          <br>
          <br>
          <div>
            <div
              style="text-decoration: underline; cursor: pointer"
              @click="
                showOrderItemsOfOrderId === order.id
                  ? (showOrderItemsOfOrderId = '')
                  : (showOrderItemsOfOrderId = order.id)
              "
            >
              {{
                showOrderItemsOfOrderId !== order.id
                  ? " 👇🏻 Vis varer "
                  : " 👆🏻 Skjul varer "
              }}
            </div>
            <div v-if="showOrderItemsOfOrderId === order.id">
              <table style="margin-top: 1em" class="receipt__table">
                <thead>
                  <tr>
                    <th class="u-left">
                      Vare
                    </th>
                    <th class="u-right">
                      Pris
                    </th>
                  </tr>
                </thead>
                <tr v-for="item in order.items" :key="item.id">
                  <td>
                    {{ item.quantity }} {{ item.name }} (Mva: {{ item.tax }}%)
                  </td>
                  <td class="u-right">
                    {{ priceLabel(item.amount) }}
                  </td>
                </tr>
              </table>
            </div>
          </div>
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
    showOrderId: '',
    showOrderItemsOfOrderId: ''
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

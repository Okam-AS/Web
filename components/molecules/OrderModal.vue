<template>
  <Modal close-btn-text="Lukk" @close="close">
    <div class="gray-container">
      <div>
        <span class="bold">Bestillingsnummer</span><span class="right">{{ order.id }}</span>
      </div>
      <div>
        <span class="bold">Leveringsmetode</span><span class="right">{{ deliveryTypeLabel(order.deliveryType) }}</span>
      </div>
      <div>
        <span class="bold">Bestilt</span><span class="right">{{ formatDate(order.created || order.pickup) }}</span>
      </div>
      <div>
        <span class="bold">Behandles til</span><span class="right">{{ formatDate(order.countdownEndTime) }}</span>
      </div>
      <div>
        <span class="bold">Status</span><span class="right">{{ orderStatusLabel(order.status) }}</span>
      </div>
      <div>
        <span class="bold">Kommentar</span><span class="right">{{ order.comment }}</span>
      </div>
    </div>
    <div class="gray-container">
      <div>{{ order.storeLegalName }}</div>
      <div>{{ order.storeVAT }}</div>
      <div>{{ order.storeFullAddress }}</div>
      <div>{{ order.storeZipCode }}</div>
      <div>{{ order.storeCity }}</div>
    </div>

    <table class="gray-container" width="100%">
      <thead>
        <tr>
          <th class="text-align-left">
            Vare
          </th>
          <th class="text-align-right">
            Antall
          </th>
          <th class="text-align-right">
            MVA
          </th>
          <th class="text-align-right">
            Pris
          </th>
        </tr>
      </thead>
      <tr v-for="item in order.items" :key="item.id">
        <td class="text-align-left">
          {{ item.name }}
        </td>
        <td class="text-align-right">
          {{ item.quantity }}
        </td>
        <td class="text-align-right">
          {{ item.tax }}%
        </td>
        <td class="text-align-right">
          {{ priceLabel(item.amount) }}
        </td>
      </tr>

      <tr style="border-top:1px solid black">
        <th class="text-align-left">
          Totalt
        </th>
        <th />
        <th />
        <th class="text-align-right">
          {{ priceLabel(order.finalAmount) }}
        </th>
      </tr>
    </table>

    <table class="gray-container" width="100%">
      <thead>
        <tr>
          <th class="text-align-left">
            MVA-sats
          </th>
          <th class="text-align-left">
            Grunnlag
          </th>
          <th class="text-align-left">
            MVA
          </th>
          <th class="text-align-left">
            Totalt ink. MVA
          </th>
        </tr>
      </thead>
      <tr v-for="(taxDetail,index) in order.taxDetails" :key="index">
        <td class="text-align-left">
          {{ taxDetail.percent }}%
        </td>
        <td class="text-align-left">
          {{ priceLabel(taxDetail.basis) }}
        </td>
        <td class="text-align-left">
          {{ priceLabel(taxDetail.amount) }}
        </td>
        <td class="text-align-left">
          {{ priceLabel(taxDetail.totalAmount) }}
        </td>
      </tr>
    </table>
  </Modal>
</template>
<script>
import Modal from '@/components/atoms/Modal.vue'

export default {
  components: { Modal },
  props: {
    order: {
      type: Object,
      default: () => {}
    }
  },
  methods: {
    close () {
      this.$emit('close')
    }
  }
}
</script>
<style lang="scss" scoped>
.bold{
  font-weight: bold;
}
.right{
  float: right;
}
.text-align-left{
text-align: left;
}
.text-align-right{
text-align: right;
}
.gray-container{
  background:lightgray;
  margin:0.5em;
  padding:0.5em;
  width:100%;
}
</style>
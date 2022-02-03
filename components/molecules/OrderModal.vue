<template>
  <Modal close-btn-text="Lukk" @close="close">
    <div class="receipt">
      <h2 class="receipt__heading">Kvittering</h2>
      <div class="receipt__group">
        <dl class="definition-list">
          <div class="definition-list__item">
            <dt>Bestillingsnummer</dt>
            <dd>{{ order.id }}</dd>
          </div>
          <div class="definition-list__item">
            <dt>Betaling</dt>
            <dd>{{ order.isWaiterOrder ? 'Betal i kassa' : 'Betalt' }}</dd>
          </div>
          <div class="definition-list__item">
            <dt>Leveringsmetode</dt>
            <dd>{{ deliveryTypeLabel(order.deliveryType) }}</dd>
          </div>
          <div class="definition-list__item">
            <dt>Bestilt</dt>
            <dd>{{ formatDate(order.created || order.pickup) }}</dd>
          </div>
          <div class="definition-list__item">
            <dt>Behandles til</dt>
            <dd>{{ formatDate(order.countdownEndTime) }}</dd>
          </div>
          <div class="definition-list__item">
            <dt>Status</dt>
            <dd>{{ orderStatusLabel(order.status) }}</dd>
          </div>
          <div class="definition-list__item">
            <dt>Kommentar</dt>
            <dd>{{ order.comment }}</dd>
          </div>
        </dl>
      </div>

      <div class="receipt__group">
        <div class="u-bold">{{ order.storeLegalName }}</div>
        <div>{{ order.storeFullAddress }}</div>
        <div>{{ order.storeZipCode }} {{ order.storeCity }}</div>
        <div class="m-t-xs">Org.nummer: {{ order.storeVAT }}</div>
      </div>

      <div class="receipt__group">
        <table class="receipt__table">
          <thead>
            <tr>
              <th class="u-left">Vare</th>
              <th class="u-right">Pris</th>
            </tr>
          </thead>
          <tr v-for="item in order.items" :key="item.id">
            <td>
              {{ item.quantity }} {{ item.name }}<br />
              Mva: {{ item.tax }}%
            </td>
            <td class="u-right">
              {{ priceLabel(item.amount) }}
            </td>
          </tr>

          <tr class="receipt__table-total">
            <td>
              Totalt
            </td>
            <td class="u-right">
              {{ priceLabel(order.finalAmount) }}
            </td>
          </tr>
        </table>
      </div>

      <div class="receipt__group">
        <table class="receipt__table" v-for="(taxDetail,index) in order.taxDetails" :key="index">
          <tr>
            <th class="u-left">Grunnlag {{ taxDetail.percent }}%</th>
            <td class="u-right">{{ priceLabel(taxDetail.basis) }}</td>
          </tr>
          <tr>
            <th class="u-left">Mva.</th>
            <td class="u-right">{{ priceLabel(taxDetail.amount) }}</td>
          </tr>
          <tr class="receipt__table-total">
            <th class="u-left">Totalt</th>
            <td class="u-right">{{ priceLabel(taxDetail.totalAmount) }}</td>
          </tr>
        </table>
      </div>
    </div>
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
@import "../../assets/sass/common.scss";

.receipt {
  padding: rem(24) rem(24) 0;

  &__heading {
    margin-bottom: rem(24);
    font-size: rem(20);
    font-weight: 400;
  }

  &__group {
    background: $color-profile;
    margin: 0 rem(-24) rem(8);
    padding: rem(24);
    font-size: rem(14);

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__table {
    width: 100%;
    border-collapse: collapse;

    td,
    th {
      vertical-align: top;
      padding-bottom: rem(8);

      &.u-right {
        white-space: nowrap;
        padding-left: rem(16);
      }
    }

    &-total td,
    &-total th {
      border-top: 1px solid $color-dark;
      padding-top: rem(8);
      padding-bottom: 0;
      font-weight: 700;
    }

    & + .receipt__table {
      margin-top: rem(24);
    }
  }
}

.definition-list {
  &__item {
    margin-bottom: rem(8);

    dt {
      font-weight: 700;
    }
  }
}

</style>
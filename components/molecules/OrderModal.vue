<template>
  <Modal :close-btn-text="$i('orderReceipt_close')" @close="close">
    <div class="receipt">
      <div class="receipt__group">
        <h2 class="receipt__heading">
          {{ $i("orderReceipt_heading", { id: order.id }) }}
        </h2>

        <div class="push-label">
          {{ $i("orderReceipt_pushPrompt") }}
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
        <dl class="definition-list">
          <div
            style="border: 1px solid white; text-align: center; padding: 1em"
            class="definition-list__item"
          >
            <dt style="font-weight: normal">
              {{
                order.deliveryType === "SelfPickup"
                  ? $i("orderReceipt_pickupCode")
                  : $i("orderReceipt_orderNumber")
              }}
            </dt>
            <dd style="font-size: 22px">
              {{ order.friendlyOrderId ? order.friendlyOrderId : order.id }}
            </dd>
          </div>
          <div class="definition-list__item">
            <dt>{{ $i("orderReceipt_payment") }}</dt>
            <dd>
              {{ paymentTypeLabel(order.paymentType) }}
            </dd>
          </div>
          <div class="definition-list__item">
            <dt>{{ $i("orderReceipt_deliveryMethod") }}</dt>
            <dd>
              {{
                deliveryTypeLabel(order.deliveryType) +
                  (order.deliveryType == "TableDelivery" && order.tableName
                    ? $i("orderReceipt_tableSuffix", { name: order.tableName })
                    : "")
              }}
            </dd>
          </div>
          <div class="definition-list__item">
            <dt>{{ $i("orderReceipt_ordered") }}</dt>
            <dd>{{ formatDate(order.created || order.pickup) }}</dd>
          </div>
          <div class="definition-list__item">
            <dt>{{ $i("orderReceipt_readyBy") }}</dt>
            <dd>
              {{
                order.status === "Accepted"
                  ? $i("orderReceipt_awaitingApproval")
                  : formatDate(order.countdownEndTime)
              }}
            </dd>
          </div>
          <div class="definition-list__item">
            <dt>{{ $i("orderReceipt_status") }}</dt>
            <dd>{{ orderStatusLabel(order.status) }}</dd>
          </div>
          <div class="definition-list__item">
            <dt>{{ $i("orderReceipt_comment") }}</dt>
            <dd>{{ order.comment }}</dd>
          </div>
        </dl>
      </div>

      <div class="receipt__group">
        <div class="u-bold">
          {{ order.storeLegalName }}
        </div>
        <div>{{ order.storeFullAddress }}</div>
        <div>{{ order.storeZipCode }} {{ order.storeCity }}</div>
        <div class="m-t-xs">
          {{ $i("orderReceipt_orgNumber") }} {{ order.storeVAT }}
        </div>
      </div>

      <div class="receipt__group">
        <table class="receipt__table">
          <thead>
            <tr>
              <th class="u-left">
                {{ $i("orderReceipt_itemColumn") }}
              </th>
              <th class="u-right">
                {{ $i("orderReceipt_priceColumn") }}
              </th>
            </tr>
          </thead>
          <tr v-for="item in order.items" :key="item.id">
            <td>
              {{ item.quantity }} {{ item.name }}<br>
              {{ $i("orderReceipt_itemVat", { tax: item.tax }) }}
            </td>
            <td class="u-right">
              {{ priceLabel(item.amount) }}
            </td>
          </tr>

          <tr class="receipt__table-total">
            <td>{{ $i("orderReceipt_total") }}</td>
            <td class="u-right">
              {{ priceLabel(order.finalAmount) }}
            </td>
          </tr>
        </table>
      </div>

      <div class="receipt__group">
        <table
          v-for="(taxDetail, index) in order.taxDetails"
          :key="index"
          class="receipt__table"
        >
          <tr>
            <th class="u-left">
              {{ $i("orderReceipt_basis") }} {{ taxDetail.percent }}%
            </th>
            <td class="u-right">
              {{ priceLabel(taxDetail.basis) }}
            </td>
          </tr>
          <tr>
            <th class="u-left">
              {{ $i("orderReceipt_vatColumn") }}
            </th>
            <td class="u-right">
              {{ priceLabel(taxDetail.amount) }}
            </td>
          </tr>
          <tr class="receipt__table-total">
            <th class="u-left">
              {{ $i("orderReceipt_total") }}
            </th>
            <td class="u-right">
              {{ priceLabel(taxDetail.totalAmount) }}
            </td>
          </tr>
        </table>
      </div>
    </div>
  </Modal>
</template>
<script>
import Modal from '~/components/atoms/Modal.vue'

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
  margin-top: 1em;
  &__item {
    margin-bottom: rem(8);

    dt {
      font-weight: 700;
    }
  }
}
</style>
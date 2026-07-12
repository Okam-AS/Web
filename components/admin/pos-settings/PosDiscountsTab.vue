<template>
  <div class="posdisc">
    <p class="posdisc__hint">
      {{ $i('posset_disc_hint') }}
      <a class="posdisc__link" href="/admin/discounts">{{ $i('posset_disc_manage') }}</a>
    </p>

    <div v-if="loading" class="posdisc__loading">
      {{ $i('common_loading') }}
    </div>

    <table v-else class="posdisc__table">
      <thead>
        <tr>
          <th>{{ $i('posset_col_name') }}</th>
          <th>{{ $i('posset_disc_col_value') }}</th>
          <th>{{ $i('posset_disc_col_pin') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!posDiscounts.length">
          <td colspan="3" class="posdisc__empty">
            {{ $i('posset_disc_none') }}
          </td>
        </tr>
        <tr v-for="d in posDiscounts" :key="d.id">
          <td>{{ d.label }}</td>
          <td>{{ valueLabel(d) }}</td>
          <td>{{ d.requiresManagerPin ? $i('common_yes') : $i('common_no') }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
// Read-only view of the store's POS-visible discounts. Discounts are the shared catalogue
// (RegularDiscount); they are created and edited on /admin/discounts, where a discount is flagged
// "show in POS". This tab lists which ones the cashier will see, and links to the editor.
export default {
  name: 'PosDiscountsTab',
  props: {
    storeId: { type: [Number, String], required: true }
  },
  data () {
    return {
      loading: true,
      discounts: []
    };
  },
  computed: {
    posDiscounts () {
      return (this.discounts || [])
        .filter(d => d.showInPos)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }
  },
  mounted () {
    this.load();
  },
  methods: {
    async load () {
      this.loading = true;
      try {
        this.discounts = await this._discountService.Get(Number(this.storeId)) || [];
      } catch (e) {
        this.discounts = [];
      } finally {
        this.loading = false;
      }
    },
    valueLabel (d) {
      return d.type === 'Percent' ? d.discount + ' %' : this.priceLabel(d.discount * 100);
    }
  }
};
</script>

<style scoped>
.posdisc__hint { color: #64748b; margin: 4px 0 16px; font-size: 0.9rem; }
.posdisc__link { color: #159f63; font-weight: 600; margin-left: 4px; }
.posdisc__loading { color: #94a3b8; padding: 20px 0; }
.posdisc__table { width: 100%; border-collapse: collapse; }
.posdisc__table th { text-align: left; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
.posdisc__table td { padding: 10px; border-bottom: 1px solid #f1f5f9; color: #292c34; }
.posdisc__empty { color: #94a3b8; text-align: center; padding: 24px 0; }
</style>

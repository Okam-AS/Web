<template>
  <div class="crud">
    <div class="crud__bar">
      <h2 class="crud__heading">
        {{ $i('posset_tab_discounts') }}
      </h2>
      <button class="crud__add" @click="startNew">
        + {{ $i('posset_disc_new') }}
      </button>
    </div>
    <p class="crud__hint">
      {{ $i('posset_disc_hint') }}
    </p>

    <div v-if="loading" class="crud__loading">
      {{ $i('common_loading') }}
    </div>

    <table v-else class="crud__table">
      <thead>
        <tr><th>{{ $i('posset_col_name') }}</th><th>{{ $i('posset_disc_col_type') }}</th><th>{{ $i('posset_disc_col_value') }}</th><th>{{ $i('posset_disc_col_pin') }}</th><th>{{ $i('posset_col_active') }}</th><th /></tr>
      </thead>
      <tbody>
        <tr v-if="!items.length">
          <td colspan="6" class="crud__empty">
            {{ $i('posset_none') }}
          </td>
        </tr>
        <tr v-for="it in items" :key="it.discountReasonId">
          <td>{{ it.name }}</td>
          <td>{{ it.discountType === 'Percent' ? $i('posset_disc_type_percent') : $i('posset_disc_type_amount') }}</td>
          <td>{{ valueLabel(it) }}</td>
          <td>{{ it.requiresManagerPin ? '✓' : '—' }}</td>
          <td>{{ it.isActive ? '✓' : '—' }}</td>
          <td class="crud__row-actions">
            <button class="crud__edit" @click="startEdit(it)">
              {{ $i('common_edit') }}
            </button>
            <button class="crud__del" @click="remove(it)">
              {{ $i('posset_disc_delete') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="form" class="crud__form">
      <h3>{{ form.discountReasonId ? $i('posset_disc_edit') : $i('posset_disc_new') }}</h3>
      <div class="crud__grid">
        <label>{{ $i('posset_col_name') }}<input v-model="form.name" type="text"></label>
        <label>{{ $i('posset_disc_col_type') }}<select v-model="form.discountType">
          <option value="Amount">{{ $i('posset_disc_type_amount') }}</option>
          <option value="Percent">{{ $i('posset_disc_type_percent') }}</option>
        </select></label>
        <label>{{ $i('posset_disc_col_value') }} ({{ form.discountType === 'Percent' ? $i('posset_disc_unit_percent') : $i('posset_disc_unit_amount') }})<input v-model.number="form.value" type="number"></label>
        <label>{{ $i('posset_disc_staff') }}<select v-model="form.staffGroup">
          <option value="">{{ $i('posset_none') }}</option>
          <option value="Staff">{{ $i('posset_disc_staff_staff') }}</option>
          <option value="Owner">{{ $i('posset_disc_staff_owner') }}</option>
          <option value="Guest">{{ $i('posset_disc_staff_guest') }}</option>
        </select></label>
        <label>{{ $i('posset_col_sort') }}<input v-model.number="form.sortOrder" type="number"></label>
        <label class="crud__check"><input v-model="form.requiresManagerPin" type="checkbox"> {{ $i('posset_disc_pin') }}</label>
        <label class="crud__check"><input v-model="form.isActive" type="checkbox"> {{ $i('posset_col_active') }}</label>
      </div>
      <div class="crud__form-actions">
        <button class="crud__cancel" @click="form = null">
          {{ $i('common_cancel') }}
        </button>
        <button class="crud__save" :disabled="saving || !form.name.trim()" @click="save">
          {{ saving ? $i('common_saving') : $i('common_save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
// Discount reasons (POS quick discounts; value is percent or øre by type). CRUD only.
export default {
  name: 'DiscountReasonsTab',
  props: { storeId: { type: [Number, String], required: true } },
  data () {
    return { items: [], loading: true, form: null, saving: false };
  },
  mounted () { this.load(); },
  methods: {
    async load () {
      this.loading = true;
      try {
        this.items = await this._discountReasonService.GetForStore(this.storeId) || [];
      } catch (e) {
        this.$emit('notify', this.errMsg(e), 'error');
      } finally {
        this.loading = false;
      }
    },
    errMsg (e) { return (e && e.response && e.response.data && e.response.data.message) || (e && e.message) || 'Feil'; },
    valueLabel (it) { return it.discountType === 'Percent' ? it.value + '%' : this.priceLabel(it.value); },
    startNew () {
      this.form = { storeId: Number(this.storeId), name: '', discountType: 'Amount', value: 0, staffGroup: '', requiresManagerPin: false, sortOrder: (this.items.length + 1), isActive: true };
    },
    startEdit (it) {
      this.form = { discountReasonId: it.discountReasonId, storeId: Number(this.storeId), name: it.name, discountType: it.discountType, value: it.value, staffGroup: it.staffGroup || '', requiresManagerPin: it.requiresManagerPin, sortOrder: it.sortOrder, isActive: it.isActive };
    },
    async remove (it) {
      if (!window.confirm(this.$i('posset_disc_confirm_delete'))) { return; }
      try {
        await this._discountReasonService.Delete(it.discountReasonId);
        this.$emit('notify', this.$i('posset_saved'), 'success');
        await this.load();
      } catch (e) {
        this.$emit('notify', this.errMsg(e), 'error');
      }
    },
    async save () {
      this.saving = true;
      try {
        const model = { storeId: Number(this.storeId), name: this.form.name.trim(), discountType: this.form.discountType, value: this.form.value, staffGroup: this.form.staffGroup || null, requiresManagerPin: this.form.requiresManagerPin, sortOrder: this.form.sortOrder, isActive: this.form.isActive };
        if (this.form.discountReasonId) {
          await this._discountReasonService.Update(this.form.discountReasonId, model);
        } else {
          await this._discountReasonService.Create(model);
        }
        this.form = null;
        this.$emit('notify', this.$i('posset_saved'), 'success');
        await this.load();
      } catch (e) {
        this.$emit('notify', this.errMsg(e), 'error');
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
.crud__bar { display: flex; align-items: center; justify-content: space-between; }
.crud__heading { font-size: 1.3rem; font-weight: 600; color: #292c34; margin: 0; }
.crud__hint { color: #64748b; margin: 4px 0 16px; font-size: 0.9rem; }
.crud__add { border: none; background: #1bb776; color: #fff; font-weight: 600; padding: 9px 16px; border-radius: 8px; cursor: pointer; }
.crud__loading { color: #94a3b8; padding: 20px 0; }
.crud__table { width: 100%; border-collapse: collapse; }
.crud__table th { text-align: left; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
.crud__table td { padding: 10px; border-bottom: 1px solid #f1f5f9; color: #292c34; }
.crud__empty { color: #94a3b8; text-align: center; padding: 20px 0; }
.crud__row-actions { text-align: right; }
.crud__edit { border: 1px solid #cbd5e0; background: #fff; color: #292c34; padding: 5px 12px; border-radius: 7px; cursor: pointer; font-weight: 600; }
.crud__form { margin-top: 22px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8f9fa; }
.crud__form h3 { margin: 0 0 14px; font-size: 1.05rem; color: #292c34; }
.crud__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
.crud__grid label { display: flex; flex-direction: column; gap: 5px; font-size: 0.8rem; font-weight: 600; color: #64748b; }
.crud__grid input[type=text], .crud__grid input[type=number] { height: 40px; border: 1px solid #cbd5e0; border-radius: 8px; padding: 0 10px; font-size: 0.95rem; color: #292c34; }
.crud__check { flex-direction: row !important; align-items: center; gap: 8px !important; }
.crud__form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
.crud__cancel { border: 1px solid #cbd5e0; background: #fff; padding: 9px 18px; border-radius: 8px; cursor: pointer; font-weight: 600; color: #292c34; }
.crud__save { border: none; background: #1bb776; color: #fff; padding: 9px 20px; border-radius: 8px; cursor: pointer; font-weight: 700; }
.crud__save:disabled { background: #cbd5e0; cursor: not-allowed; }
</style>

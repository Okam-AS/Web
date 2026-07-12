<template>
  <div class="crud">
    <div class="crud__bar">
      <div class="crud__bar-actions">
        <button class="crud__seed" :disabled="seeding" @click="seed">
          {{ $i('posset_alg_seed') }}
        </button>
        <button class="crud__add" @click="startNew">
          + {{ $i('posset_alg_new') }}
        </button>
      </div>
    </div>
    <p class="crud__hint">
      {{ $i('posset_alg_hint') }}
    </p>

    <div v-if="loading" class="crud__loading">
      {{ $i('common_loading') }}
    </div>

    <table v-else class="crud__table">
      <thead>
        <tr><th>{{ $i('posset_col_name') }}</th><th>{{ $i('posset_col_code') }}</th><th>{{ $i('posset_col_sort') }}</th><th>{{ $i('posset_col_active') }}</th><th /></tr>
      </thead>
      <tbody>
        <tr v-if="!items.length">
          <td colspan="5" class="crud__empty">
            {{ $i('posset_none') }}
          </td>
        </tr>
        <tr v-for="it in items" :key="it.allergenId">
          <td>{{ it.name }}</td>
          <td>{{ it.code }}</td>
          <td>{{ it.sortOrder }}</td>
          <td>{{ it.isActive ? '✓' : '—' }}</td>
          <td class="crud__row-actions">
            <button class="crud__edit" @click="startEdit(it)">
              {{ $i('common_edit') }}
            </button>
            <button class="crud__delete" @click="remove(it)">
              {{ $i('common_delete') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="form" class="crud__form">
      <h3>{{ form.allergenId ? $i('posset_alg_edit') : $i('posset_alg_new') }}</h3>
      <div class="crud__grid">
        <label>{{ $i('posset_col_name') }}<input v-model="form.name" type="text"></label>
        <label>{{ $i('posset_col_code') }}<input v-model="form.code" type="text" :placeholder="$i('posset_alg_code_ph')"></label>
        <label>{{ $i('posset_col_sort') }}<input v-model.number="form.sortOrder" type="number"></label>
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
// Allergen register (per store). CRUD plus a standard-set seeder. Managed on the Products/Menu
// side (/admin/allergens); allergens are a menu concern, not a POS-only one.
export default {
  name: 'AllergensManager',
  props: { storeId: { type: [Number, String], required: true } },
  data () {
    return { items: [], loading: true, form: null, saving: false, seeding: false };
  },
  mounted () { this.load(); },
  methods: {
    async load () {
      this.loading = true;
      try {
        this.items = await this._allergenService.GetForStore(this.storeId) || [];
      } catch (e) {
        this.$emit('notify', this.errMsg(e), 'error');
      } finally {
        this.loading = false;
      }
    },
    errMsg (e) { return (e && e.response && e.response.data && e.response.data.message) || (e && e.message) || 'Feil'; },
    startNew () {
      this.form = { storeId: Number(this.storeId), name: '', code: '', sortOrder: (this.items.length + 1), isActive: true };
    },
    startEdit (it) {
      this.form = { allergenId: it.allergenId, storeId: Number(this.storeId), name: it.name, code: it.code, sortOrder: it.sortOrder, isActive: it.isActive };
    },
    async save () {
      this.saving = true;
      try {
        const model = { storeId: Number(this.storeId), name: this.form.name.trim(), code: this.form.code, sortOrder: this.form.sortOrder, isActive: this.form.isActive };
        if (this.form.allergenId) {
          await this._allergenService.Update(this.form.allergenId, model);
        } else {
          await this._allergenService.Create(model);
        }
        this.form = null;
        this.$emit('notify', this.$i('posset_saved'), 'success');
        await this.load();
      } catch (e) {
        this.$emit('notify', this.errMsg(e), 'error');
      } finally {
        this.saving = false;
      }
    },
    async remove (it) {
      if (!window.confirm(this.$i('posset_alg_delete_confirm'))) { return; }
      try {
        await this._allergenService.Delete(it.allergenId);
        this.$emit('notify', this.$i('posset_saved'), 'success');
        await this.load();
      } catch (e) {
        this.$emit('notify', this.errMsg(e), 'error');
      }
    },
    async seed () {
      this.seeding = true;
      try {
        this.items = await this._allergenService.SeedStandard(this.storeId) || [];
        this.$emit('notify', this.$i('posset_alg_seeded'), 'success');
      } catch (e) {
        this.$emit('notify', this.errMsg(e), 'error');
      } finally {
        this.seeding = false;
      }
    }
  }
};
</script>

<style scoped>
.crud__bar { display: flex; align-items: center; justify-content: flex-end; }
.crud__bar-actions { display: flex; align-items: center; gap: 10px; }
.crud__heading { font-size: 1.3rem; font-weight: 600; color: #292c34; margin: 0; }
.crud__hint { color: #64748b; margin: 4px 0 16px; font-size: 0.9rem; }
.crud__add { border: none; background: #1bb776; color: #fff; font-weight: 600; padding: 9px 16px; border-radius: 8px; cursor: pointer; }
.crud__seed { border: 1px solid #cbd5e0; background: #fff; color: #292c34; font-weight: 600; padding: 9px 16px; border-radius: 8px; cursor: pointer; }
.crud__seed:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }
.crud__loading { color: #94a3b8; padding: 20px 0; }
.crud__table { width: 100%; border-collapse: collapse; }
.crud__table th { text-align: left; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
.crud__table td { padding: 10px; border-bottom: 1px solid #f1f5f9; color: #292c34; }
.crud__empty { color: #94a3b8; text-align: center; padding: 20px 0; }
.crud__row-actions { text-align: right; display: flex; gap: 8px; justify-content: flex-end; }
.crud__edit { border: 1px solid #cbd5e0; background: #fff; color: #292c34; padding: 5px 12px; border-radius: 7px; cursor: pointer; font-weight: 600; }
.crud__delete { border: 1px solid #f0c0c0; background: #fff; color: #c0392b; padding: 5px 12px; border-radius: 7px; cursor: pointer; font-weight: 600; }
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

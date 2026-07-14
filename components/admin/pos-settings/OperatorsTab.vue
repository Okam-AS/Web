<template>
  <div class="crud">
    <div class="crud__bar">
      <h2 class="crud__heading">
        {{ $i('posset_tab_operators') }}
      </h2>
      <button class="crud__add" @click="startNew">
        + {{ $i('posset_op_new') }}
      </button>
    </div>
    <p class="crud__hint">
      {{ $i('posset_op_hint') }}
      <a class="crud__xlink" href="/admin/employees">{{ $i('posset_op_employees_link') }}</a>
    </p>

    <div v-if="loading" class="crud__loading">
      {{ $i('common_loading') }}
    </div>

    <table v-else class="crud__table">
      <thead>
        <tr><th>{{ $i('posset_col_name') }}</th><th>{{ $i('posset_op_col_role') }}</th><th>{{ $i('posset_op_col_pin') }}</th><th>{{ $i('posset_op_col_locked') }}</th><th>{{ $i('posset_col_active') }}</th><th /></tr>
      </thead>
      <tbody>
        <tr v-if="!items.length">
          <td colspan="6" class="crud__empty">
            {{ $i('posset_none') }}
          </td>
        </tr>
        <tr v-for="it in items" :key="it.operatorId">
          <td>{{ it.displayName }}</td>
          <td>{{ $i('pos_role_' + it.roleLevel.toLowerCase()) }}</td>
          <td>{{ it.hasPin ? '✓' : '—' }}</td>
          <td>{{ it.isLockedOut ? $i('pos_operator_locked') : '—' }}</td>
          <td>{{ it.isActive ? '✓' : '—' }}</td>
          <td class="crud__row-actions">
            <template v-if="pinFor === it.operatorId">
              <input
                v-model="pin"
                class="crud__pin"
                type="password"
                inputmode="numeric"
                maxlength="4"
                :placeholder="$i('posset_op_pin_ph')"
              >
              <button class="crud__save" :disabled="pinSaving || !pinValid" @click="savePin(it)">
                {{ pinSaving ? $i('common_saving') : $i('common_save') }}
              </button>
              <button class="crud__cancel" @click="pinFor = null">
                {{ $i('common_cancel') }}
              </button>
            </template>
            <template v-else>
              <button class="crud__edit" @click="startEdit(it)">
                {{ $i('common_edit') }}
              </button>
              <button class="crud__edit" @click="startPin(it)">
                {{ $i('posset_op_setpin') }}
              </button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="form" class="crud__form">
      <h3>{{ form.operatorId ? $i('posset_op_edit') : $i('posset_op_new') }}</h3>
      <div class="crud__grid">
        <label>{{ $i('posset_col_name') }}<input v-model="form.displayName" type="text"></label>
        <label>{{ $i('posset_op_col_role') }}
          <select v-model="form.roleLevel">
            <option v-for="r in roles" :key="r" :value="r">{{ $i('pos_role_' + r.toLowerCase()) }}</option>
          </select>
          <span class="crud__hint">{{ $i('posset_op_role_hint') }}</span>
        </label>
        <label v-if="!form.operatorId">{{ $i('posset_op_pin') }}<input v-model="form.pin" type="password" inputmode="numeric" maxlength="4" :placeholder="$i('posset_op_pin_ph')"></label>
        <label class="crud__check"><input v-model="form.isActive" type="checkbox"> {{ $i('posset_col_active') }}</label>
      </div>
      <div class="crud__form-actions">
        <button class="crud__cancel" @click="form = null">
          {{ $i('common_cancel') }}
        </button>
        <button class="crud__save" :disabled="saving || !form.displayName.trim()" @click="save">
          {{ saving ? $i('common_saving') : $i('common_save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
// POS operators (staff who log in at the till). CRUD plus PIN management.
export default {
  name: 'OperatorsTab',
  props: { storeId: { type: [Number, String], required: true } },
  data () {
    return { items: [], loading: true, form: null, saving: false, roles: ['Standard', 'Godkjenner'], pinFor: null, pin: '', pinSaving: false };
  },
  computed: {
    pinValid () { return /^\d{4}$/.test(this.pin); }
  },
  mounted () { this.load(); },
  methods: {
    async load () {
      this.loading = true;
      try {
        this.items = await this._operatorService.GetForStore(this.storeId) || [];
      } catch (e) {
        this.$emit('notify', this.errMsg(e), 'error');
      } finally {
        this.loading = false;
      }
    },
    errMsg (e) { return (e && e.response && e.response.data && e.response.data.message) || (e && e.message) || 'Feil'; },
    startNew () {
      this.form = { storeId: Number(this.storeId), displayName: '', roleLevel: 'Standard', isActive: true, pin: '' };
    },
    startEdit (it) {
      this.form = { operatorId: it.operatorId, storeId: Number(this.storeId), displayName: it.displayName, roleLevel: it.roleLevel, isActive: it.isActive };
    },
    startPin (it) {
      this.pinFor = it.operatorId;
      this.pin = '';
    },
    async savePin (it) {
      this.pinSaving = true;
      try {
        await this._operatorService.SetPin(it.operatorId, { pin: this.pin });
        this.pinFor = null;
        this.$emit('notify', this.$i('posset_saved'), 'success');
        await this.load();
      } catch (e) {
        this.$emit('notify', this.errMsg(e), 'error');
      } finally {
        this.pinSaving = false;
      }
    },
    async save () {
      this.saving = true;
      try {
        const model = { storeId: Number(this.storeId), displayName: this.form.displayName.trim(), roleLevel: this.form.roleLevel, applicationUserId: null, isActive: this.form.isActive, pin: this.form.operatorId ? null : (this.form.pin || null) };
        if (this.form.operatorId) {
          await this._operatorService.Update(this.form.operatorId, model);
        } else {
          await this._operatorService.Create(model);
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
.crud__xlink { color: var(--pos-primary-dark, #159f63); font-weight: 600; margin-left: 4px; }
.crud__add { border: none; background: #1bb776; color: #fff; font-weight: 600; padding: 9px 16px; border-radius: 8px; cursor: pointer; }
.crud__loading { color: #94a3b8; padding: 20px 0; }
.crud__table { width: 100%; border-collapse: collapse; }
.crud__table th { text-align: left; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
.crud__table td { padding: 10px; border-bottom: 1px solid #f1f5f9; color: #292c34; }
.crud__empty { color: #94a3b8; text-align: center; padding: 20px 0; }
.crud__row-actions { text-align: right; }
.crud__edit { border: 1px solid #cbd5e0; background: #fff; color: #292c34; padding: 5px 12px; border-radius: 7px; cursor: pointer; font-weight: 600; }
.crud__pin { height: 32px; width: 110px; border: 1px solid #cbd5e0; border-radius: 7px; padding: 0 10px; font-size: 0.95rem; color: #292c34; margin-right: 8px; }
.crud__form { margin-top: 22px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8f9fa; }
.crud__form h3 { margin: 0 0 14px; font-size: 1.05rem; color: #292c34; }
.crud__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
.crud__grid label { display: flex; flex-direction: column; gap: 5px; font-size: 0.8rem; font-weight: 600; color: #64748b; }
.crud__grid input[type=text], .crud__grid input[type=password], .crud__grid select { height: 40px; border: 1px solid #cbd5e0; border-radius: 8px; padding: 0 10px; font-size: 0.95rem; color: #292c34; }
.crud__check { flex-direction: row !important; align-items: center; gap: 8px !important; }
.crud__form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
.crud__cancel { border: 1px solid #cbd5e0; background: #fff; padding: 9px 18px; border-radius: 8px; cursor: pointer; font-weight: 600; color: #292c34; }
.crud__save { border: none; background: #1bb776; color: #fff; padding: 9px 20px; border-radius: 8px; cursor: pointer; font-weight: 700; }
.crud__save:disabled { background: #cbd5e0; cursor: not-allowed; }
</style>

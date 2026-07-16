<template>
  <div class="crud">
    <div class="crud__bar">
      <h2 class="crud__heading">
        {{ $i('posset_tab_cashpoints') }}
      </h2>
      <button class="crud__add" @click="startNew">
        + {{ $i('posset_cp_new') }}
      </button>
    </div>
    <p class="crud__hint">
      {{ $i('posset_cp_hint') }}
    </p>

    <div class="cpp">
      <span class="cpp__label">{{ $i('posset_store_provider') }}</span>
      <div class="crud__provider-toggle">
        <button class="crud__provider-btn" :class="{ 'is-active': storeProvider === 'Surfboard' }" :disabled="savingProvider" @click="setStoreProvider('Surfboard')">
          {{ $i('pos_provider_surfboard') }}
        </button>
        <button class="crud__provider-btn" :class="{ 'is-active': storeProvider === 'Dintero' }" :disabled="savingProvider" @click="setStoreProvider('Dintero')">
          {{ $i('pos_provider_dintero') }}
        </button>
      </div>
      <p class="cpp__hint">
        {{ $i('posset_store_provider_hint') }}
      </p>
    </div>

    <div v-if="loading" class="crud__loading">
      {{ $i('common_loading') }}
    </div>

    <table v-else class="crud__table">
      <thead>
        <tr><th>{{ $i('posset_col_name') }}</th><th>{{ $i('posset_cp_register') }}</th><th>{{ $i('posset_cp_provider') }}</th><th>{{ $i('posset_cp_maxdiff') }}</th><th>{{ $i('posset_col_active') }}</th><th /></tr>
      </thead>
      <tbody>
        <tr v-if="!items.length">
          <td colspan="6" class="crud__empty">
            {{ $i('posset_none') }}
          </td>
        </tr>
        <tr v-for="it in items" :key="it.cashPointId">
          <td>{{ it.name }}</td>
          <td>{{ it.registerId }}</td>
          <td>{{ rowProviderLabel(it) }}</td>
          <td>{{ priceLabel(it.maxCashDifference) }}</td>
          <td>{{ it.isActive ? '✓' : '—' }}</td>
          <td class="crud__row-actions">
            <button class="crud__edit" @click="startEdit(it)">
              {{ $i('common_edit') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="form" class="crud__form">
      <h3>{{ form.cashPointId ? $i('posset_cp_edit') : $i('posset_cp_new') }}</h3>
      <div class="crud__grid">
        <label>{{ $i('posset_col_name') }}<input v-model="form.name" type="text"></label>
        <label>{{ $i('posset_cp_register') }}<input v-model="form.registerId" type="text" :placeholder="$i('posset_cp_register_ph')"></label>
        <label>{{ $i('posset_cp_maxdiff_kr') }}<input v-model.number="maxDiffKr" type="number" step="0.01"></label>
        <label class="crud__check"><input v-model="form.isActive" type="checkbox"> {{ $i('posset_col_active') }}</label>
      </div>

      <!-- WP-B3: fast operator switch (default off). -->
      <div class="crud__grid">
        <label class="crud__check"><input v-model="form.allowFastOperatorSwitch" type="checkbox"> {{ $i('posset_cp_fast_switch') }}</label>
      </div>

      <p class="crud__provider-note">
        {{ $i('posset_cp_provider_inherit_note', { provider: effectiveProviderLabel }) }}
      </p>

      <div v-if="effectiveProvider === 'surfboard'" class="crud__grid">
        <label>{{ $i('posset_cp_sb_terminal') }}<input v-model="form.surfboardTerminalId" type="text" :placeholder="$i('posset_cp_sb_terminal_ph')"></label>
        <label class="crud__check"><input v-model="form.surfboardAutoPrintReceipt" type="checkbox"> {{ $i('posset_cp_sb_autoprint') }}</label>
      </div>
      <div v-else class="crud__grid">
        <label>{{ $i('posset_cp_dt_store') }}<input v-model="form.dinteroStoreId" type="text"></label>
        <label>{{ $i('posset_cp_dt_terminal') }}<input v-model="form.dinteroTerminalId" type="text"></label>
        <label>{{ $i('posset_cp_dt_payout') }}<input v-model="form.dinteroPayoutDestinationId" type="text"></label>
        <label>{{ $i('posset_cp_dt_profile') }}<input v-model="form.dinteroProfileId" type="text"></label>
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
// Cash points. The terminal card acquirer is chosen once at the store level (posset_store_provider),
// defaulting to Surfboard; switch the whole store to Dintero when needed. Cash points always follow
// the store choice (their TerminalProvider is saved as Auto = inherit), so the physical terminal id
// is the only per-cash-point terminal setting. No delete (journal history) — deactivate via the
// active flag.
export default {
  name: 'CashPointsTab',
  props: { storeId: { type: [Number, String], required: true } },
  data () {
    return { items: [], loading: true, form: null, saving: false, storeProvider: 'Surfboard', savingProvider: false };
  },
  computed: {
    maxDiffKr: {
      get () { return this.form ? Math.round(this.form.maxCashDifference) / 100 : 0; },
      set (v) { if (this.form) { this.form.maxCashDifference = Math.round((Number(v) || 0) * 100); } }
    },
    effectiveProvider () {
      return this.storeProvider === 'Dintero' ? 'dintero' : 'surfboard';
    },
    effectiveProviderLabel () {
      return this.effectiveProvider === 'dintero' ? this.$i('pos_provider_dintero') : this.$i('pos_provider_surfboard');
    }
  },
  mounted () { this.load(); },
  methods: {
    async load () {
      this.loading = true;
      try {
        const [items, config] = await Promise.all([
          this._cashPointService.GetForStore(this.storeId),
          this._storeService.GetPaymentConfig(this.storeId).catch(() => null)
        ]);
        this.items = items || [];
        // Surfboard is the default; only an explicit Dintero choice flips the store selector.
        this.storeProvider = config && config.terminalProvider === 'Dintero' ? 'Dintero' : 'Surfboard';
      } catch (e) {
        this.$emit('notify', this.errMsg(e), 'error');
      } finally {
        this.loading = false;
      }
    },
    errMsg (e) { return (e && e.response && e.response.data && e.response.data.message) || (e && e.message) || 'Feil'; },
    async setStoreProvider (p) {
      if (p === this.storeProvider) { return; }
      const previous = this.storeProvider;
      this.storeProvider = p;
      this.savingProvider = true;
      try {
        await this._storeService.SetTerminalProvider(this.storeId, p);
        this.$emit('notify', this.$i('posset_saved'), 'success');
      } catch (e) {
        this.storeProvider = previous;
        this.$emit('notify', this.errMsg(e), 'error');
      } finally {
        this.savingProvider = false;
      }
    },
    rowProviderLabel (it) {
      // Cash points inherit the store choice; a legacy explicit value still wins if present.
      if (it.terminalProvider === 'Surfboard') { return this.$i('pos_provider_surfboard'); }
      if (it.terminalProvider === 'Dintero') { return this.$i('pos_provider_dintero'); }
      return this.effectiveProviderLabel;
    },
    blank () {
      return {
        storeId: Number(this.storeId),
        name: '',
        registerId: '',
        maxCashDifference: 0,
        isActive: true,
        allowFastOperatorSwitch: false,
        surfboardTerminalId: '',
        surfboardAutoPrintReceipt: false,
        dinteroStoreId: '',
        dinteroTerminalId: '',
        dinteroPayoutDestinationId: '',
        dinteroProfileId: ''
      };
    },
    startNew () {
      this.form = this.blank();
    },
    startEdit (it) {
      this.form = {
        cashPointId: it.cashPointId,
        storeId: Number(this.storeId),
        name: it.name,
        registerId: it.registerId,
        maxCashDifference: it.maxCashDifference,
        isActive: it.isActive,
        allowFastOperatorSwitch: !!it.allowFastOperatorSwitch,
        surfboardTerminalId: it.surfboardTerminalId || '',
        surfboardAutoPrintReceipt: !!it.surfboardAutoPrintReceipt,
        dinteroStoreId: it.dinteroStoreId || '',
        dinteroTerminalId: it.dinteroTerminalId || '',
        dinteroPayoutDestinationId: it.dinteroPayoutDestinationId || '',
        dinteroProfileId: it.dinteroProfileId || ''
      };
    },
    async save () {
      this.saving = true;
      try {
        const f = this.form;
        const eff = this.effectiveProvider;
        // Cash points inherit the store provider (TerminalProvider = Auto). The resolver also keys off
        // SurfboardTerminalId, so clear it when the store runs Dintero.
        const model = {
          storeId: Number(this.storeId),
          name: f.name.trim(),
          registerId: f.registerId,
          maxCashDifference: f.maxCashDifference,
          isActive: f.isActive,
          allowFastOperatorSwitch: f.allowFastOperatorSwitch,
          surfboardTerminalId: eff === 'surfboard' ? f.surfboardTerminalId : '',
          surfboardAutoPrintReceipt: eff === 'surfboard' ? f.surfboardAutoPrintReceipt : false,
          terminalProvider: 'Auto',
          dinteroStoreId: f.dinteroStoreId,
          dinteroTerminalId: f.dinteroTerminalId,
          dinteroPayoutDestinationId: f.dinteroPayoutDestinationId,
          dinteroProfileId: f.dinteroProfileId
        };
        if (f.cashPointId) {
          await this._cashPointService.Update(f.cashPointId, model);
        } else {
          await this._cashPointService.Create(model);
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
.cpp { margin: 0 0 20px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8f9fa; }
.cpp__label { display: block; font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 8px; }
.cpp__hint { color: #64748b; margin: 8px 0 0; font-size: 0.85rem; }
.crud__loading { color: #94a3b8; padding: 20px 0; }
.crud__table { width: 100%; border-collapse: collapse; }
.crud__table th { text-align: left; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
.crud__table td { padding: 10px; border-bottom: 1px solid #f1f5f9; color: #292c34; }
.crud__empty { color: #94a3b8; text-align: center; padding: 20px 0; }
.crud__row-actions { text-align: right; }
.crud__edit { border: 1px solid #cbd5e0; background: #fff; color: #292c34; padding: 5px 12px; border-radius: 7px; cursor: pointer; font-weight: 600; }
.crud__form { margin-top: 22px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8f9fa; }
.crud__form h3 { margin: 0 0 14px; font-size: 1.05rem; color: #292c34; }
.crud__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 4px; }
.crud__grid label { display: flex; flex-direction: column; gap: 5px; font-size: 0.8rem; font-weight: 600; color: #64748b; }
.crud__grid input[type=text], .crud__grid input[type=number] { height: 40px; border: 1px solid #cbd5e0; border-radius: 8px; padding: 0 10px; font-size: 0.95rem; color: #292c34; }
.crud__check { flex-direction: row !important; align-items: center; gap: 8px !important; }
.crud__provider-note { margin: 16px 0 8px; font-size: 0.85rem; color: #64748b; }
.crud__provider-toggle { display: inline-flex; background: #eef1f5; border-radius: 10px; padding: 4px; }
.crud__provider-btn { border: none; background: none; padding: 9px 18px; border-radius: 8px; font-weight: 600; color: #64748b; cursor: pointer; }
.crud__provider-btn.is-active { background: #fff; color: #292c34; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
.crud__provider-btn:disabled { opacity: 0.5; cursor: default; }
.crud__form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
.crud__cancel { border: 1px solid #cbd5e0; background: #fff; padding: 9px 18px; border-radius: 8px; cursor: pointer; font-weight: 600; color: #292c34; }
.crud__save { border: none; background: #1bb776; color: #fff; padding: 9px 20px; border-radius: 8px; cursor: pointer; font-weight: 700; }
.crud__save:disabled { background: #cbd5e0; cursor: not-allowed; }
</style>

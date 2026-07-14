<template>
  <div class="crud">
    <div class="crud__bar">
      <h2 class="crud__heading">{{ $i('posset_tab_goods') }}</h2>
      <div class="crud__bar-actions">
        <button class="crud__seed" :disabled="seeding || loading" @click="seedStandard">{{ seeding ? $i('common_saving') : $i('posset_goods_seed') }}</button>
        <button class="crud__add" @click="startNew">+ {{ $i('posset_goods_new') }}</button>
      </div>
    </div>
    <p class="crud__hint">{{ $i('posset_goods_hint') }}</p>

    <div v-if="loading" class="crud__loading">{{ $i('common_loading') }}</div>

    <table v-else class="crud__table">
      <thead>
        <tr><th>{{ $i('posset_col_name') }}</th><th>{{ $i('posset_col_code') }}</th><th>{{ $i('posset_col_profile') }}</th><th>{{ $i('posset_col_sort') }}</th><th>{{ $i('posset_col_active') }}</th><th /></tr>
      </thead>
      <tbody>
        <tr v-if="!items.length"><td colspan="6" class="crud__empty">{{ $i('posset_none') }}</td></tr>
        <tr v-for="it in items" :key="it.goodsGroupId">
          <td>{{ it.name }}</td>
          <td>{{ it.code }}</td>
          <td>{{ profileLabel(it) }}</td>
          <td>{{ it.sortOrder }}</td>
          <td>{{ it.isActive ? '✓' : '—' }}</td>
          <td class="crud__row-actions"><button class="crud__edit" @click="startEdit(it)">{{ $i('common_edit') }}</button></td>
        </tr>
      </tbody>
    </table>

    <div v-if="form" class="crud__form">
      <h3>{{ form.goodsGroupId ? $i('posset_goods_edit') : $i('posset_goods_new') }}</h3>
      <div class="crud__grid">
        <label>{{ $i('posset_col_name') }}<input v-model="form.name" type="text"></label>
        <label>{{ $i('posset_col_code') }}<input v-model="form.code" type="text" :placeholder="$i('posset_goods_code_ph')"></label>
        <label>{{ $i('posset_col_sort') }}<input v-model.number="form.sortOrder" type="number"></label>
        <label class="crud__check"><input v-model="form.isActive" type="checkbox"> {{ $i('posset_col_active') }}</label>
      </div>

      <div class="gg-profile">
        <div class="gg-profile__head">
          <h4>{{ $i('posset_goods_profile') }}</h4>
          <p>{{ $i('posset_goods_profile_hint') }}</p>
        </div>
        <!-- One-tap presets for the common Norwegian profiles; the selects below stay for
             special cases (e.g. 12 %). -->
        <div class="gg-profile__presets">
          <button type="button" :class="{ 'is-active': presetActive(15, 25, 15) }" @click="applyPreset(15, 25, 15)">{{ $i('posset_goods_preset_food') }}</button>
          <button type="button" :class="{ 'is-active': presetActive(25, 25, 25) }" @click="applyPreset(25, 25, 25)">{{ $i('posset_goods_preset_standard') }}</button>
          <button type="button" :class="{ 'is-active': presetActive(0, 0, 0) }" @click="applyPreset(0, 0, 0)">{{ $i('posset_goods_preset_free') }}</button>
        </div>
        <div class="crud__grid">
          <label>{{ $i('posset_goods_takeaway') }}
            <select v-model="form.takeAwayVatPercent">
              <option :value="null">{{ $i('posset_goods_rate_none') }}</option>
              <option v-for="r in vatRates" :key="'ta'+r" :value="r">{{ r }} %</option>
            </select>
          </label>
          <label>{{ $i('posset_goods_eatin') }}
            <select v-model="form.eatInVatPercent">
              <option :value="null">{{ $i('posset_goods_rate_none') }}</option>
              <option v-for="r in vatRates" :key="'ei'+r" :value="r">{{ r }} %</option>
            </select>
          </label>
          <label>{{ $i('posset_goods_delivery') }}
            <select v-model="form.deliveryVatPercent">
              <option :value="null">{{ $i('posset_goods_rate_none') }}</option>
              <option v-for="r in vatRates" :key="'de'+r" :value="r">{{ r }} %</option>
            </select>
          </label>
        </div>
        <p v-if="profileIncomplete" class="gg-profile__warn">{{ $i('posset_goods_profile_incomplete') }}</p>
        <p v-else-if="hasProfile" class="gg-profile__reprice">{{ $i('posset_goods_profile_reprice') }}</p>
      </div>

      <div class="crud__form-actions">
        <button class="crud__cancel" @click="form = null">{{ $i('common_cancel') }}</button>
        <button class="crud__save" :disabled="saving || !form.name.trim() || profileIncomplete" @click="save">{{ saving ? $i('common_saving') : $i('common_save') }}</button>
      </div>
    </div>
  </div>
</template>

<script>
// Goods groups (SAF-T grouping; open-price lines require one). CRUD only.
export default {
  name: 'GoodsGroupsTab',
  props: { storeId: { type: [Number, String], required: true } },
  data () {
    // The supported Norwegian VAT rates (must match AccountingHelper on the backend).
    return { items: [], loading: true, form: null, saving: false, seeding: false, vatRates: [0, 12, 15, 25] };
  },
  computed: {
    // A VAT profile is either complete (all three rates set) or fully empty (legacy group). A
    // partial profile is rejected by the backend, so the form guards against it too.
    profileSetCount () {
      if (!this.form) { return 0; }
      return [this.form.takeAwayVatPercent, this.form.eatInVatPercent, this.form.deliveryVatPercent]
        .filter(v => v !== null && v !== undefined && v !== '').length;
    },
    hasProfile () { return this.profileSetCount === 3; },
    profileIncomplete () { return this.profileSetCount === 1 || this.profileSetCount === 2; }
  },
  mounted () { this.load(); },
  methods: {
    // "Ta med 15 · Spis her 25 · Lev. 15" for a profiled group, or "—" for a legacy group.
    profileLabel (it) {
      if (it.takeAwayVatPercent == null || it.eatInVatPercent == null || it.deliveryVatPercent == null) {
        return '—';
      }
      return `${it.takeAwayVatPercent} / ${it.eatInVatPercent} / ${it.deliveryVatPercent}`;
    },
    async load () {
      this.loading = true;
      try {
        this.items = await this._goodsGroupService.GetForStore(this.storeId) || [];
      } catch (e) {
        this.$emit('notify', this.errMsg(e), 'error');
      } finally {
        this.loading = false;
      }
    },
    errMsg (e) { return (e && e.response && e.response.data && e.response.data.message) || (e && e.message) || 'Feil'; },
    // Seed the Norway default groups (with VAT profiles). Idempotent — skips codes the store
    // already has — so it is safe to run on onboarding without duplicating.
    async seedStandard () {
      this.seeding = true;
      try {
        await this._goodsGroupService.SeedStandard(this.storeId);
        this.$emit('notify', this.$i('posset_goods_seeded'), 'success');
        await this.load();
      } catch (e) {
        this.$emit('notify', this.errMsg(e), 'error');
      } finally {
        this.seeding = false;
      }
    },
    applyPreset (takeAway, eatIn, delivery) {
      this.form.takeAwayVatPercent = takeAway;
      this.form.eatInVatPercent = eatIn;
      this.form.deliveryVatPercent = delivery;
    },
    presetActive (takeAway, eatIn, delivery) {
      return this.form && this.form.takeAwayVatPercent === takeAway && this.form.eatInVatPercent === eatIn && this.form.deliveryVatPercent === delivery;
    },
    startNew () {
      this.form = { storeId: Number(this.storeId), name: '', code: '', sortOrder: (this.items.length + 1), isActive: true, takeAwayVatPercent: null, eatInVatPercent: null, deliveryVatPercent: null };
    },
    startEdit (it) {
      this.form = {
        goodsGroupId: it.goodsGroupId,
        storeId: Number(this.storeId),
        name: it.name,
        code: it.code,
        sortOrder: it.sortOrder,
        isActive: it.isActive,
        takeAwayVatPercent: it.takeAwayVatPercent != null ? it.takeAwayVatPercent : null,
        eatInVatPercent: it.eatInVatPercent != null ? it.eatInVatPercent : null,
        deliveryVatPercent: it.deliveryVatPercent != null ? it.deliveryVatPercent : null
      };
    },
    async save () {
      this.saving = true;
      try {
        const model = {
          storeId: Number(this.storeId),
          name: this.form.name.trim(),
          code: this.form.code,
          sortOrder: this.form.sortOrder,
          isActive: this.form.isActive,
          // All-or-nothing: send the complete profile, or three nulls for a legacy group.
          takeAwayVatPercent: this.hasProfile ? this.form.takeAwayVatPercent : null,
          eatInVatPercent: this.hasProfile ? this.form.eatInVatPercent : null,
          deliveryVatPercent: this.hasProfile ? this.form.deliveryVatPercent : null
        };
        if (this.form.goodsGroupId) {
          await this._goodsGroupService.Update(this.form.goodsGroupId, model);
        } else {
          await this._goodsGroupService.Create(model);
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
.crud__bar-actions { display: flex; gap: 8px; align-items: center; }
.crud__seed { border: 1px solid #1bb776; background: #fff; color: #159f63; font-weight: 600; padding: 9px 14px; border-radius: 8px; cursor: pointer; }
.crud__seed:disabled { border-color: #cbd5e0; color: #cbd5e0; cursor: not-allowed; }
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
.gg-profile { margin-top: 18px; padding: 16px; border: 1px dashed #cbd5e0; border-radius: 10px; }
.gg-profile__head h4 { margin: 0 0 4px; font-size: 0.95rem; color: #292c34; }
.gg-profile__head p { margin: 0 0 12px; font-size: 0.8rem; color: #64748b; }
.gg-profile select { height: 40px; border: 1px solid #cbd5e0; border-radius: 8px; padding: 0 10px; font-size: 0.95rem; color: #292c34; background: #fff; }
.gg-profile__presets { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.gg-profile__presets button { border: 1px solid #cbd5e0; background: #fff; color: #292c34; font-weight: 600; font-size: 0.82rem; padding: 7px 12px; border-radius: 8px; cursor: pointer; }
.gg-profile__presets button.is-active { border-color: #1bb776; background: rgba(27, 183, 118, 0.08); color: #159f63; }
.gg-profile__warn { margin: 12px 0 0; color: #b91c1c; font-size: 0.82rem; font-weight: 600; }
.gg-profile__reprice { margin: 12px 0 0; color: #b45309; font-size: 0.82rem; }
</style>

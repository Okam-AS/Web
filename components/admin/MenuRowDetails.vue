<template>
  <div class="row-details-overlay" @click.self="$emit('close')">
    <section
      ref="panel"
      class="row-details"
      role="dialog"
      aria-modal="true"
      :aria-label="$i('menuImport_detailsTitle')"
      @keydown.esc.stop.prevent="$emit('close')"
    >
      <header class="row-details-head">
        <div>
          <h2>{{ $i('menuImport_detailsTitle') }}</h2>
          <p>{{ isCreate ? $i('menuImport_detailsCreating') : $i('menuImport_detailsUpdating', { name: currentName }) }}</p>
        </div>
        <button ref="close" type="button" class="icon-btn" :aria-label="$i('common_close')" @click="$emit('close')">
          ×
        </button>
      </header>

      <div class="row-details-body">
        <!-- An existing product changes nothing until a field is actually edited. Saying so is
             the whole contract of this panel, so it is stated rather than implied. -->
        <p v-if="!isCreate" class="notice">
          {{ $i('menuImport_detailsUntouchedNotice') }}
        </p>

        <ProductFormField :label="$i('menuImport_colName')">
          <input
            type="text"
            :value="value('name')"
            @change="edit('name', $event.target.value)"
          >
          <template #actions>
            <button
              v-if="differs('name')"
              type="button"
              class="link-btn"
              @click="edit('name', row.sourceMeta.name)"
            >
              {{ $i('menuImport_useSourceValue', { value: row.sourceMeta.name }) }}
            </button>
            <button v-if="!isCreate && edited('name')" type="button" class="link-btn" @click="reset('name')">
              {{ $i('menuImport_keepExisting') }}
            </button>
          </template>
        </ProductFormField>

        <ProductFormField :label="$i('menuImport_colCategory')">
          <MenuProductSearch
            :value="value('categoryId')"
            :options="categoryOptions"
            :allow-create="false"
            :placeholder="$i('menuImport_findCategory')"
            :aria-label="$i('menuImport_colCategory')"
            @input="edit('categoryId', $event)"
          />
          <!-- Creating a category is a typed, explicit act, never a side effect of a name that
               happened not to match anything. -->
          <div class="new-category">
            <input
              v-model="newCategoryName"
              type="text"
              :placeholder="$i('menuImport_newCategoryPlaceholder')"
              @keydown.enter.prevent="createCategory"
            >
            <button type="button" class="link-btn" :disabled="!newCategoryName.trim()" @click="createCategory">
              {{ $i('menuImport_createCategory') }}
            </button>
          </div>
          <small v-if="pendingCategoryName" class="pending">{{ $i('menuImport_categoryWillBeCreated', { name: pendingCategoryName }) }}</small>
        </ProductFormField>

        <ProductFormField :label="$i('menuImport_colDescription')">
          <textarea
            rows="3"
            :value="value('description')"
            @change="edit('description', $event.target.value)"
          />
          <template #actions>
            <button
              v-if="differs('description')"
              type="button"
              class="link-btn"
              @click="edit('description', row.sourceMeta.description)"
            >
              {{ $i('menuImport_useSourceText') }}
            </button>
            <button v-if="!isCreate && edited('description')" type="button" class="link-btn" @click="reset('description')">
              {{ $i('menuImport_keepExisting') }}
            </button>
          </template>
        </ProductFormField>

        <ProductFormField :label="$i('menuImport_colAllergens')">
          <input
            type="text"
            :value="value('otherInformation')"
            :placeholder="$i('menuImport_allergensPlaceholder')"
            @change="edit('otherInformation', $event.target.value)"
          >
          <template #actions>
            <button
              v-if="differs('otherInformation')"
              type="button"
              class="link-btn"
              @click="edit('otherInformation', row.sourceMeta.otherInformation)"
            >
              {{ $i('menuImport_useSourceText') }}
            </button>
          </template>
        </ProductFormField>

        <details class="disclosure">
          <summary>{{ $i('menuImport_vatDepositAvailability') }}</summary>

          <div class="fields3">
            <ProductFormField
              v-for="channel in channels"
              :key="channel"
              inline
              :label="$i('menuImport_vatFor', { channel: $i('menuImport_channel' + channelKey(channel)) })"
            >
              <input
                type="number"
                min="0"
                max="99"
                step="1"
                :value="value(taxField(channel))"
                @change="editNumber(taxField(channel), $event.target.value)"
              >
            </ProductFormField>
          </div>

          <!-- Kept apart from the three totals on purpose: pant is added on top of a price,
               it is not one of them. -->
          <ProductFormField :label="$i('menuImport_colDeposit')" :hint="$i('menuImport_depositHelp')">
            <input
              type="number"
              min="0"
              step="0.01"
              :value="depositInKroner"
              @change="editDeposit($event.target.value)"
            >
          </ProductFormField>

          <label class="check">
            <input
              type="checkbox"
              :checked="!!value('soldOut')"
              @change="edit('soldOut', $event.target.checked)"
            >
            {{ $i('menuImport_markSoldOut') }}
          </label>

          <label class="check">
            <input
              type="checkbox"
              :checked="!!value('hide')"
              @change="edit('hide', $event.target.checked)"
            >
            {{ $i('menuImport_hideFromMenu') }}
          </label>
        </details>

        <details class="disclosure">
          <summary>
            {{ $i('menuImport_variantsAndOptions') }}
            <span class="tag">{{ $i('menuImport_groupCount', { count: shownGroups.length }) }}</span>
          </summary>

          <p v-if="!isCreate && row.variantGroups === null" class="helper-text">
            {{ $i('menuImport_variantsUntouched') }}
          </p>

          <ul v-if="shownGroups.length" class="variant-list">
            <li v-for="(group, index) in shownGroups" :key="group.variantGroupId || index">
              <button type="button" class="variant-row" @click="$emit('edit-variant', index)">
                <strong>{{ group.name }}</strong>
                <span class="badges">
                  <span v-if="group.required" class="badge">{{ $i('menuImport_required') }}</span>
                  <span v-if="group.multiSelect" class="badge">{{ $i('menuImport_multiselect') }}</span>
                  <span v-if="hasExactBounds(group)" class="badge">{{ $i('menuImport_chooseBetween', { min: group.minimumSelectedOptions, max: group.maximumSelectedOptions }) }}</span>
                </span>
                <small>{{ optionsPreview(group) }}</small>
              </button>
              <button
                type="button"
                class="icon-btn"
                :aria-label="$i('menuImport_removeGroup', { name: group.name })"
                @click="$emit('remove-variant', index)"
              >
                ×
              </button>
            </li>
          </ul>

          <div class="variant-actions">
            <button type="button" class="link-btn" @click="$emit('add-variant')">
              {{ $i('menuImport_addGroup') }}
            </button>
            <button
              v-if="!isCreate && shownGroups.length"
              type="button"
              class="link-btn danger"
              @click="$emit('clear-variants')"
            >
              {{ $i('menuImport_removeAllGroups') }}
            </button>
          </div>
          <p class="helper-text">
            {{ $i('menuImport_variantsHelp') }}
          </p>
        </details>

        <ul v-if="!isCreate && changedFields.length" class="change-summary">
          <li class="change-summary-title">
            {{ $i('menuImport_willChange') }}
          </li>
          <li v-for="field in changedFields" :key="field">
            {{ fieldLabel(field) }}
          </li>
        </ul>
      </div>

      <footer class="row-details-foot">
        <button type="button" class="link-btn" @click="$emit('duplicate')">
          {{ $i('menuImport_duplicateAsNew') }}
        </button>
        <button type="button" class="btn-primary" @click="$emit('close')">
          {{ $i('menuImport_detailsDone') }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script>
// The per-row detail panel.
//
// It supplements the table rather than replacing it: every field here is also available as a
// column, and this panel is where the ones nobody wants permanently on screen live.
//
// Nothing in here writes a value by being opened. Each control reports an explicit edit through
// `edit`, and `reset` takes an edit back off, which is what "existing metadata is unchanged
// until it is edited" means in practice.

import MenuProductSearch from '~/components/admin/MenuProductSearch.vue'
import ProductFormField from '~/components/admin/ProductFormField.vue'
import { ACTION, CHANNELS, channelEnum, channelName, displayValue, hasMetadataPatch, sourceDiffers } from '~/utils/menu-workspace'

export default {
  name: 'MenuRowDetails',
  components: { MenuProductSearch, ProductFormField },
  props: {
    row: { type: Object, required: true },
    categories: { type: Array, default: () => [] },
    newCategories: { type: Array, default: () => [] }
  },
  data () {
    return { channels: CHANNELS, newCategoryName: '' }
  },
  computed: {
    isCreate () { return this.row.action === ACTION.create },
    currentName () { return (this.row.current && this.row.current.name) || this.row.displayName },
    categoryOptions () {
      return this.categories.map(category => ({ value: category.categoryId, label: category.name }))
    },
    pendingCategoryName () {
      const key = this.row.metadataEdits.newCategoryKey
      if (!key) { return '' }
      const pending = this.newCategories.find(category => category.key === key)
      return pending ? pending.name : ''
    },
    /** What the drawer lists as groups: the edited set when there is one, else what exists today. */
    shownGroups () {
      if (this.row.variantGroups !== null) { return this.row.variantGroups }
      return (this.row.current && this.row.current.variants) || []
    },
    depositInKroner () {
      const amount = displayValue(this.row, 'depositAmount')
      return amount === null || amount === undefined ? '' : amount / 100
    },
    changedFields () {
      const fields = Object.keys(this.row.metadataEdits || {})
      if (this.row.variantGroups !== null || this.row.clearVariantGroups) { fields.push('variants') }
      return fields
    },
    hasPatch () { return hasMetadataPatch(this.row) }
  },
  mounted () {
    if (this.$refs.close) { this.$refs.close.focus() }
  },
  methods: {
    value (field) {
      const resolved = displayValue(this.row, field)
      return resolved === null || resolved === undefined ? '' : resolved
    },
    edited (field) { return Object.prototype.hasOwnProperty.call(this.row.metadataEdits || {}, field) },
    differs (field) { return sourceDiffers(this.row, field) },
    edit (field, value) { this.$emit('edit', { field, value }) },
    reset (field) { this.$emit('reset', field) },
    editNumber (field, raw) {
      const trimmed = String(raw == null ? '' : raw).trim()
      this.edit(field, trimmed === '' ? null : Math.round(Number(trimmed)))
    },
    editDeposit (raw) {
      const trimmed = String(raw == null ? '' : raw).trim()
      // An empty box means "leave pant alone"; a typed 0 means "turn it off". The contract
      // distinguishes the two, so the panel must not collapse them.
      this.edit('depositAmount', trimmed === '' ? null : Math.round(Number(trimmed) * 100))
    },
    channelKey (channel) { return channelEnum(channelName(channel)) },
    taxField (channel) { return channel === 'takeaway' ? 'tax' : channel + 'Tax' },
    createCategory () {
      const name = this.newCategoryName.trim()
      if (!name) { return }
      this.$emit('create-category', name)
      this.newCategoryName = ''
    },
    hasExactBounds (group) {
      return group.minimumSelectedOptions !== null && group.minimumSelectedOptions !== undefined &&
        group.maximumSelectedOptions !== null && group.maximumSelectedOptions !== undefined
    },
    optionsPreview (group) {
      const names = (group.options || []).map(option => option.name).filter(Boolean)
      if (!names.length) { return this.$i('menuImport_noOptions') }
      if (names.length <= 3) { return names.join(', ') }
      return this.$i('menuImport_optionsMore', { names: names.slice(0, 2).join(', '), count: names.length - 2 })
    },
    /** Field names are internal; the summary names them the way the table's headers do. */
    fieldLabel (field) {
      const labels = {
        name: 'menuImport_colName',
        categoryId: 'menuImport_colCategory',
        newCategoryKey: 'menuImport_colCategory',
        description: 'menuImport_colDescription',
        otherInformation: 'menuImport_colAllergens',
        tax: 'menuImport_colTakeawayVat',
        eatInTax: 'menuImport_colEatInVat',
        deliveryTax: 'menuImport_colDeliveryVat',
        depositAmount: 'menuImport_colDeposit',
        soldOut: 'menuImport_colSoldOut',
        hide: 'menuImport_colHidden',
        variants: 'menuImport_colVariants'
      }
      return labels[field] ? this.$i(labels[field]) : field
    }
  }
}
</script>

<style lang="scss" scoped>
.row-details-overlay {
  position: fixed; inset: 0; z-index: 900;
  display: flex; justify-content: flex-end;
  background: rgba(41, 44, 52, 0.35);
}

.row-details {
  display: flex; flex-direction: column;
  width: min(520px, 100%); height: 100%;
  background: #fff; box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);

  @media (max-width: 768px) { width: 100%; }
}

.row-details-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  padding: 24px; border-bottom: 1px solid #e2e8f0;

  h2 { margin: 0 0 4px; font-size: 1.1em; font-weight: 600; color: #292c34; }
  p { margin: 0; color: #64748b; font-size: 0.9em; }
}

.row-details-body { flex: 1; overflow-y: auto; padding: 24px; }

.row-details-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 16px 24px; border-top: 1px solid #e2e8f0; background: #f8f9fa;
}

.notice {
  margin: 0 0 20px; padding: 12px;
  background: #f8f9fa; border-left: 3px solid #1bb776; border-radius: 6px;
  color: #292c34; font-size: 0.88em;
}

.field {
  display: block; margin-bottom: 20px;
  font-size: 0.85em; font-weight: 600; color: #292c34;
  text-transform: uppercase; letter-spacing: 0.3px;

  input[type="text"], input[type="number"], textarea {
    display: block; width: 100%; margin-top: 8px; padding: 12px;
    border: 2px solid #e2e8f0; border-radius: 8px; background: #fff;
    font: inherit; font-size: 1rem; font-weight: 400; color: #292c34;
    text-transform: none; letter-spacing: normal;
    transition: all 0.2s ease;

    &:hover { border-color: #cbd5e0; }
    &:focus { outline: none; border-color: #1bb776; box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1); }
  }

  textarea { resize: vertical; }
}

.new-category {
  display: flex; gap: 8px; align-items: center; margin-top: 8px;

  input { flex: 1; margin-top: 0; }
}

.pending { display: block; margin-top: 6px; color: #92400e; font-size: 0.8em; font-weight: 500; text-transform: none; }

.fields3 {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px;
}

.check {
  // Matches the product editor's checkbox row, so the same control does not look like two.
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  transition: all 0.3s ease;

  &:hover { background: #f1f5f9; }

  display: flex; align-items: center; gap: 10px;
  min-height: 44px; padding: 12px; margin-bottom: 8px;
  background: #f8f9fa; border-radius: 8px; cursor: pointer;
  font-size: 0.92em; color: #292c34;

  &:hover { background: #f1f5f9; }
  input { width: 20px; height: 20px; accent-color: #1bb776; }
}

.disclosure {
  margin-bottom: 20px; padding: 12px 0; border-top: 1px solid #e2e8f0;

  summary {
    display: flex; align-items: center; gap: 8px;
    min-height: 44px; cursor: pointer;
    font-size: 0.95em; font-weight: 600; color: #292c34;
  }
  &[open] summary { margin-bottom: 12px; }
}

.tag {
  padding: 2px 8px; border-radius: 6px;
  background: #f1f5f9; color: #64748b; font-size: 0.78em; font-weight: 500;
}

.variant-list {
  margin: 0 0 12px; padding: 0; list-style: none;

  li { display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #f1f5f9; }
}

.variant-row {
  flex: 1; display: block; padding: 12px 8px;
  background: none; border: 0; border-radius: 8px;
  font: inherit; text-align: left; cursor: pointer;

  &:hover { background: #f8f9fa; }
  &:focus-visible { outline: 2px solid #1bb776; outline-offset: -2px; }

  strong { display: block; color: #292c34; font-size: 0.95em; }
  small { display: block; margin-top: 2px; color: #64748b; font-size: 0.82em; }
}

.badges { display: inline-flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }

.badge {
  padding: 2px 8px; border-radius: 6px;
  background: #eaf7f0; color: #116a44; font-size: 0.75em; font-weight: 600;
}

.variant-actions { display: flex; flex-wrap: wrap; gap: 16px; }

.change-summary {
  margin: 24px 0 0; padding: 12px 16px; list-style: none;
  background: #f8f9fa; border-radius: 8px;
  color: #292c34; font-size: 0.85em;

  li + li { margin-top: 4px; }
}

.change-summary-title { font-weight: 600; }

.helper-text { display: block; margin-top: 6px; color: #64748b; font-size: 0.8em; font-style: italic; text-transform: none; letter-spacing: normal; font-weight: 400; }

.link-btn {
  padding: 4px 0; margin-top: 6px;
  background: none; border: 0; color: #159f63;
  font: inherit; font-size: 0.85em; font-weight: 500; text-transform: none; letter-spacing: normal;
  cursor: pointer; text-decoration: underline;

  &:disabled { color: #94a3b8; cursor: not-allowed; }
  &.danger { color: #ef4444; }
  &:focus-visible { outline: 2px solid #1bb776; outline-offset: 2px; }
}

.icon-btn {
  min-width: 44px; min-height: 44px;
  background: none; border: 0; border-radius: 8px;
  color: #64748b; font-size: 1.4em; line-height: 1; cursor: pointer;

  &:hover { background: #f1f5f9; color: #292c34; }
  &:focus-visible { outline: 2px solid #1bb776; outline-offset: -2px; }
}

.btn-primary {
  padding: 14px 24px;
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  color: #fff; border: 0; border-radius: 8px;
  font: inherit; font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);
  transition: all 0.2s ease;

  &:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4); }
  &:focus-visible { outline: 2px solid #1bb776; outline-offset: 2px; }
}
</style>

<template>
  <div class="rm-overlay" @click.self="$emit('close')">
    <div class="rm">
      <div class="rm-head">
        <h2>{{ isNew ? (draft.isWalkIn ? $i('res_walkin') : $i('res_modal_new')) : $i('res_modal_title') }}</h2>
        <button class="rm-close" @click="$emit('close')">
          ✕
        </button>
      </div>

      <div v-if="!isNew" class="rm-status-row">
        <span class="rm-status" :class="'st-' + draft.status">{{ statusLabel(draft.status) }}</span>
        <div class="rm-status-actions">
          <button v-if="draft.status === 'requested'" class="ok" @click="applyStatus('confirmed')">
            {{ $i('common_confirm') }}
          </button>
          <button v-if="draft.status === 'confirmed'" class="ok" @click="applyStatus('seated')">
            {{ $i('res_act_seat') }}
          </button>
          <button v-if="draft.status === 'confirmed'" class="warn" @click="applyStatus('noshow')">
            {{ $i('res_act_noshow') }}
          </button>
          <button v-if="draft.status === 'seated'" class="ok" @click="applyStatus('completed')">
            {{ $i('res_act_complete') }}
          </button>
          <button
            v-if="['completed', 'noshow', 'cancelled'].includes(draft.status)"
            @click="applyStatus('confirmed')"
          >
            {{ $i('res_act_reopen') }}
          </button>
          <button
            v-if="['requested', 'confirmed', 'seated'].includes(draft.status)"
            class="warn"
            @click="applyStatus('cancelled')"
          >
            {{ $i('res_act_cancel') }}
          </button>
        </div>
      </div>

      <div class="rm-grid">
        <label>
          <span>{{ $i('common_date') }}</span>
          <input v-model="draft.dateKey" type="date">
        </label>
        <label>
          <span>{{ $i('res_modal_time') }}</span>
          <input v-model="timeStr" type="time" step="900">
        </label>
        <label>
          <span>{{ $i('res_modal_seating') }}</span>
          <input v-model.number="draft.durationMin" type="number" min="30" step="15">
        </label>
        <label>
          <span>{{ $i('res_modal_guests') }}</span>
          <input v-model.number="draft.partySize" type="number" min="1" max="100">
        </label>
        <label class="rm-span2">
          <span>{{ $i('res_modal_table') }}</span>
          <select v-model="draft.tableId">
            <optgroup v-for="g in zoneGroups" :key="g.zone.id" :label="g.zone.name">
              <option
                v-for="t in g.tables"
                :key="t.id"
                :value="t.id"
              >
                {{ t.name || $i('res_table_number', { number: t.number }) }} ({{ $i('res_capacity_range', { min: t.minCapacity, max: t.maxCapacity }) }}){{ isBusy(t.id) ? ' — ' + $i('res_busy') : '' }}
              </option>
            </optgroup>
          </select>
        </label>
        <div class="rm-span2 rm-combine">
          <span class="rm-combine-label">{{ $i('res_modal_combine') }}</span>
          <div class="rm-combine-chips">
            <button
              v-for="t in combinableTables"
              :key="t.id"
              type="button"
              class="rm-combine-chip"
              :class="{ 'is-on': (draft.extraTableIds || []).includes(t.id) }"
              @click="toggleExtra(t.id)"
            >
              {{ t.name || $i('res_table_number', { number: t.number }) }}
            </button>
          </div>
        </div>
        <label class="rm-span2">
          <span>{{ $i('common_name') }} {{ draft.isWalkIn ? $i('res_modal_name_walkin_opt') : '' }}</span>
          <input v-model="draft.name" type="text" maxlength="60">
        </label>
        <label class="rm-span2">
          <span>{{ $i('res_modal_phone') }}</span>
          <input v-model="draft.phone" type="tel" maxlength="15">
        </label>
        <label class="rm-span2">
          <span>{{ $i('res_modal_comment') }}</span>
          <input v-model="draft.comment" type="text" maxlength="200" :placeholder="$i('res_modal_comment_ph')">
        </label>
      </div>

      <p v-if="conflictNow" class="rm-error">
        {{ $i('res_modal_conflict') }}
      </p>
      <p v-else-if="capacityWarning" class="rm-warning">
        {{ capacityWarning }}
      </p>

      <div class="rm-actions">
        <button class="btn-secondary" @click="$emit('close')">
          {{ $i('common_cancel') }}
        </button>
        <button class="btn-primary" :disabled="!canSave" @click="save">
          {{ isNew ? $i('common_create') : $i('common_save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
const STATUS_KEYS = {
  requested: 'res_status_requested',
  confirmed: 'res_status_confirmed',
  seated: 'res_status_seated',
  completed: 'res_status_completed',
  noshow: 'res_status_noshow',
  cancelled: 'res_status_cancelled'
};

export default {
  name: 'ReservationModal',
  props: {
    reservation: { type: Object, required: true },
    isNew: { type: Boolean, default: false },
    zoneGroups: { type: Array, default: () => [] },
    tables: { type: Array, default: () => [] },
    checkConflict: { type: Function, required: true }
  },
  data () {
    const draft = { ...this.reservation };
    if (!Array.isArray(draft.extraTableIds)) { draft.extraTableIds = []; }
    return { draft };
  },
  computed: {
    // Other active tables the primary can be combined with (L3c table combinations).
    combinableTables () {
      return (this.tables || []).filter(t => t.isActive !== false && t.id !== this.draft.tableId);
    },
    timeStr: {
      get () {
        const h = Math.floor(this.draft.startMin / 60) % 24;
        const m = this.draft.startMin % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      },
      set (v) {
        const parts = (v || '').split(':');
        const h = parseInt(parts[0]) || 0;
        const m = parseInt(parts[1]) || 0;
        this.draft.startMin = h * 60 + m;
      }
    },
    selectedTable () {
      return this.tables.find(t => t.id === this.draft.tableId) || null;
    },
    conflictNow () {
      if (!this.draft.tableId) { return false; }
      return this.checkConflict(
        this.isNew ? null : this.draft.id,
        this.draft.tableId,
        this.draft.startMin,
        this.draft.durationMin,
        this.draft.dateKey
      );
    },
    capacityWarning () {
      const t = this.selectedTable;
      if (!t) { return ''; }
      if (this.draft.partySize > t.maxCapacity) {
        return this.$i('res_modal_over_max', { count: this.draft.partySize, max: t.maxCapacity });
      }
      if (this.draft.partySize < t.minCapacity) {
        return this.$i('res_modal_under_min', { count: this.draft.partySize, min: t.minCapacity });
      }
      return '';
    },
    canSave () {
      return (
        !!this.draft.tableId &&
        !!this.draft.dateKey &&
        this.draft.partySize > 0 &&
        this.draft.durationMin >= 30 &&
        !this.conflictNow &&
        (this.draft.isWalkIn || this.draft.name.trim().length > 0)
      );
    }
  },
  methods: {
    toggleExtra (id) {
      const list = this.draft.extraTableIds || [];
      const idx = list.indexOf(id);
      if (idx === -1) { list.push(id); } else { list.splice(idx, 1); }
      this.$set(this.draft, 'extraTableIds', list.slice());
    },
    statusLabel (status) {
      const key = STATUS_KEYS[status];
      return key ? this.$i(key) : status;
    },
    isBusy (tableId) {
      return this.checkConflict(
        this.isNew ? null : this.draft.id,
        tableId,
        this.draft.startMin,
        this.draft.durationMin,
        this.draft.dateKey
      );
    },
    applyStatus (status) {
      this.$emit('status-change', { id: this.draft.id, status });
      this.$emit('close');
    },
    save () {
      if (!this.canSave) { return; }
      this.$emit('save', { ...this.draft });
    }
  }
};
</script>

<style lang="scss" scoped>
.rm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 16px;
}

.rm {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 22px 24px;
}

.rm-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;

  h2 {
    font-size: 1.15em;
    font-weight: 600;
    color: #292c34;
    margin: 0;
  }
}

.rm-close {
  border: none;
  background: #f1f5f9;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  color: #64748b;
  font-size: 14px;

  &:hover {
    background: #e2e8f0;
  }
}

.rm-status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 10px;
}

.rm-status {
  font-size: 0.75em;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;

  &.st-requested { background: #fef3c7; color: #92400e; }
  &.st-confirmed { background: #d9f4e7; color: #159f63; }
  &.st-seated { background: #dbeafe; color: #1d4ed8; }
  &.st-completed { background: #f1f5f9; color: #64748b; }
  &.st-noshow { background: #fee2e2; color: #b91c1c; }
  &.st-cancelled { background: #f1f5f9; color: #94a3b8; }
}

.rm-status-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;

  button {
    padding: 7px 12px;
    border-radius: 8px;
    border: 2px solid #e2e8f0;
    background: #fff;
    font-size: 0.78em;
    font-weight: 600;
    cursor: pointer;
    color: #292c34;

    &.ok:hover {
      border-color: #1bb776;
      color: #159f63;
    }

    &.warn:hover {
      border-color: #ef4444;
      color: #ef4444;
    }
  }
}

.rm-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  label {
    display: flex;
    flex-direction: column;
    gap: 5px;

    span {
      font-size: 0.72em;
      font-weight: 600;
      color: #292c34;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    input,
    select {
      padding: 10px 12px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.92em;
      color: #292c34;
      background: #fff;

      &:focus {
        outline: none;
        border-color: #1bb776;
        box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
      }
    }
  }
}

.rm-span2 {
  grid-column: 1 / -1;
}

.rm-error {
  margin: 12px 0 0;
  font-size: 0.85em;
  color: #b91c1c;
  background: #fee2e2;
  padding: 10px 12px;
  border-radius: 8px;
}

.rm-warning {
  margin: 12px 0 0;
  font-size: 0.85em;
  color: #92400e;
  background: #fef3c7;
  padding: 10px 12px;
  border-radius: 8px;
}

.rm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.btn-primary {
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  color: #fff;
  border: none;
  padding: 11px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9em;
  cursor: pointer;

  &:disabled {
    background: #cbd5e0;
    cursor: not-allowed;
  }
}

.btn-secondary {
  background: #fff;
  color: #292c34;
  border: 2px solid #e2e8f0;
  padding: 11px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9em;
  cursor: pointer;

  &:hover {
    background: #f8f9fa;
  }
}

.rm-combine {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rm-combine-label { font-size: 0.85em; color: #64748b; }
.rm-combine-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.rm-combine-chip {
  border: 1px solid #cbd5e0;
  background: #fff;
  color: #475569;
  padding: 6px 12px;
  border-radius: 16px;
  font-weight: 600;
  font-size: 0.85em;
  cursor: pointer;

  &.is-on {
    background: #1bb776;
    border-color: #1bb776;
    color: #fff;
  }
}
</style>

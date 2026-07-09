<template>
  <div class="rm-overlay" @click.self="$emit('close')">
    <div class="rm">
      <div class="rm-head">
        <h2>{{ isNew ? (draft.isWalkIn ? 'Walk-in' : 'Ny reservasjon') : 'Reservasjon' }}</h2>
        <button class="rm-close" @click="$emit('close')">
          ✕
        </button>
      </div>

      <div v-if="!isNew" class="rm-status-row">
        <span class="rm-status" :class="'st-' + draft.status">{{ statusLabel(draft.status) }}</span>
        <div class="rm-status-actions">
          <button v-if="draft.status === 'requested'" class="ok" @click="applyStatus('confirmed')">
            Bekreft
          </button>
          <button v-if="draft.status === 'confirmed'" class="ok" @click="applyStatus('seated')">
            Ankommet
          </button>
          <button v-if="draft.status === 'confirmed'" class="warn" @click="applyStatus('noshow')">
            No-show
          </button>
          <button v-if="draft.status === 'seated'" class="ok" @click="applyStatus('completed')">
            Ferdig
          </button>
          <button
            v-if="['completed', 'noshow', 'cancelled'].includes(draft.status)"
            @click="applyStatus('confirmed')"
          >
            Gjenåpne
          </button>
          <button
            v-if="['requested', 'confirmed', 'seated'].includes(draft.status)"
            class="warn"
            @click="applyStatus('cancelled')"
          >
            Kanseller
          </button>
        </div>
      </div>

      <div class="rm-grid">
        <label>
          <span>Dato</span>
          <input v-model="draft.dateKey" type="date">
        </label>
        <label>
          <span>Tid</span>
          <input v-model="timeStr" type="time" step="900">
        </label>
        <label>
          <span>Sittetid (min)</span>
          <input v-model.number="draft.durationMin" type="number" min="30" step="15">
        </label>
        <label>
          <span>Gjester</span>
          <input v-model.number="draft.partySize" type="number" min="1" max="100">
        </label>
        <label class="rm-span2">
          <span>Bord</span>
          <select v-model="draft.tableId">
            <optgroup v-for="g in zoneGroups" :key="g.zone.id" :label="g.zone.name">
              <option
                v-for="t in g.tables"
                :key="t.id"
                :value="t.id"
              >
                {{ t.name || 'Bord ' + t.number }} ({{ t.minCapacity }}–{{ t.maxCapacity }} pers){{ isBusy(t.id) ? ' — opptatt' : '' }}
              </option>
            </optgroup>
          </select>
        </label>
        <label class="rm-span2">
          <span>Navn {{ draft.isWalkIn ? '(valgfritt for walk-in)' : '' }}</span>
          <input v-model="draft.name" type="text" maxlength="60">
        </label>
        <label class="rm-span2">
          <span>Telefon</span>
          <input v-model="draft.phone" type="tel" maxlength="15">
        </label>
        <label class="rm-span2">
          <span>Kommentar</span>
          <input v-model="draft.comment" type="text" maxlength="200" placeholder="Allergier, anledning, ønsker …">
        </label>
      </div>

      <p v-if="conflictNow" class="rm-error">
        Bordet er opptatt i dette tidsrommet — velg et annet bord eller tidspunkt.
      </p>
      <p v-else-if="capacityWarning" class="rm-warning">
        {{ capacityWarning }}
      </p>

      <div class="rm-actions">
        <button class="btn-secondary" @click="$emit('close')">
          Avbryt
        </button>
        <button class="btn-primary" :disabled="!canSave" @click="save">
          {{ isNew ? 'Opprett' : 'Lagre' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
const STATUS_LABELS = {
  requested: 'Forespurt',
  confirmed: 'Bekreftet',
  seated: 'Ankommet',
  completed: 'Ferdig',
  noshow: 'No-show',
  cancelled: 'Kansellert'
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
    return {
      draft: { ...this.reservation }
    };
  },
  computed: {
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
        return `${this.draft.partySize} gjester er over bordets maks (${t.maxCapacity}). Du kan lagre likevel.`;
      }
      if (this.draft.partySize < t.minCapacity) {
        return `${this.draft.partySize} gjester er under bordets min (${t.minCapacity}). Du kan lagre likevel.`;
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
    statusLabel (status) {
      return STATUS_LABELS[status] || status;
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
</style>

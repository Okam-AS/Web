<template>
  <div class="rl">
    <div class="rl-search">
      <input
        v-model="query"
        type="search"
        placeholder="Søk på navn eller telefon (alle dager)"
      >
    </div>

    <div v-if="!groups.length" class="rl-empty">
      {{ query ? 'Ingen treff.' : 'Ingen reservasjoner denne dagen.' }}
    </div>

    <div v-for="g in groups" :key="g.dateKey" class="rl-group">
      <h3 v-if="query">
        {{ g.label }}
      </h3>
      <div
        v-for="r in g.items"
        :key="r.id"
        class="rl-row"
        :class="'st-' + r.status"
        @click="$emit('select', r)"
      >
        <div class="rl-time">
          {{ hhmm(r.startMin) }}
        </div>
        <div class="rl-main">
          <b>{{ r.name || 'Walk-in' }} <span class="rl-party">· {{ r.partySize }} pers</span></b>
          <span class="rl-sub">
            {{ tableLabel(r.tableId) }}<template v-if="r.comment"> · {{ r.comment }}</template>
          </span>
        </div>
        <a
          v-if="r.phone"
          class="rl-phone"
          :href="'tel:' + r.phone"
          title="Ring gjesten"
          @click.stop
        >✆</a>
        <span class="rl-status" :class="'st-' + r.status">{{ statusLabel(r.status) }}</span>
        <div class="rl-actions" @click.stop>
          <button v-if="r.status === 'requested'" class="ok" @click="setStatus(r, 'confirmed')">
            Bekreft
          </button>
          <button v-if="r.status === 'confirmed'" class="ok" @click="setStatus(r, 'seated')">
            Ankommet
          </button>
          <button v-if="r.status === 'confirmed'" class="warn" @click="setStatus(r, 'noshow')">
            No-show
          </button>
          <button v-if="r.status === 'seated'" class="ok" @click="setStatus(r, 'completed')">
            Ferdig
          </button>
        </div>
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
  name: 'ReservationList',
  props: {
    reservations: { type: Array, default: () => [] },
    tables: { type: Array, default: () => [] },
    selectedDateKey: { type: String, required: true }
  },
  data () {
    return { query: '' };
  },
  computed: {
    groups () {
      const q = this.query.trim().toLowerCase();
      let items;
      if (q) {
        items = this.reservations.filter(
          r => (r.name || '').toLowerCase().includes(q) || (r.phone || '').includes(q)
        );
      } else {
        items = this.reservations.filter(r => r.dateKey === this.selectedDateKey);
      }
      const byDate = {};
      items.forEach((r) => {
        (byDate[r.dateKey] = byDate[r.dateKey] || []).push(r);
      });
      return Object.keys(byDate)
        .sort()
        .map(dateKey => ({
          dateKey,
          label: this.dateLabel(dateKey),
          items: byDate[dateKey].sort((a, b) => a.startMin - b.startMin)
        }));
    }
  },
  watch: {
    query (value) {
      // Let the parent run a server-side search across all days; it feeds the results back
      // through the reservations prop (an empty query restores the current day's data).
      this.$emit('search', value);
    }
  },
  methods: {
    hhmm (min) {
      const h = Math.floor(min / 60) % 24;
      const m = min % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    },
    dateLabel (dateKey) {
      const [y, m, d] = dateKey.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('no-NO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    },
    tableLabel (tableId) {
      const t = this.tables.find(x => x.id === tableId);
      return t ? t.name || 'Bord ' + t.number : 'Uten bord';
    },
    statusLabel (status) {
      return STATUS_LABELS[status] || status;
    },
    setStatus (r, status) {
      this.$emit('status-change', { id: r.id, status });
    }
  }
};
</script>

<style lang="scss" scoped>
.rl-search {
  margin-bottom: 14px;

  input {
    width: 100%;
    max-width: 420px;
    padding: 11px 14px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.92em;

    &:focus {
      outline: none;
      border-color: #1bb776;
    }
  }
}

.rl-empty {
  padding: 40px 0;
  text-align: center;
  color: #94a3b8;
  font-size: 0.9em;
}

.rl-group {
  margin-bottom: 20px;

  h3 {
    font-size: 0.8em;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: #64748b;
    margin: 0 0 8px;
  }
}

.rl-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  margin-bottom: 8px;
  cursor: pointer;
  border-left: 3px solid #e2e8f0;

  &.st-requested { border-left-color: #f59e0b; }
  &.st-confirmed { border-left-color: #1bb776; }
  &.st-seated { border-left-color: #3b82f6; }
  &.st-completed { border-left-color: #94a3b8; }
  &.st-noshow { border-left-color: #ef4444; }

  &.st-cancelled {
    border-left-color: #cbd5e0;
    opacity: 0.55;

    .rl-main b {
      text-decoration: line-through;
    }
  }

  &:hover {
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
  }
}

.rl-time {
  font-weight: 700;
  font-size: 0.95em;
  color: #292c34;
  min-width: 46px;
  font-variant-numeric: tabular-nums;
}

.rl-main {
  flex: 1;
  min-width: 0;

  b {
    display: block;
    font-size: 0.92em;
    color: #292c34;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rl-party {
    font-weight: 500;
    color: #64748b;
  }

  .rl-sub {
    display: block;
    font-size: 0.8em;
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.rl-phone {
  font-size: 1.1em;
  text-decoration: none;
  color: #1bb776;
  padding: 6px;
}

.rl-status {
  font-size: 0.72em;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;

  &.st-requested { background: #fef3c7; color: #92400e; }
  &.st-confirmed { background: #d9f4e7; color: #159f63; }
  &.st-seated { background: #dbeafe; color: #1d4ed8; }
  &.st-completed { background: #f1f5f9; color: #64748b; }
  &.st-noshow { background: #fee2e2; color: #b91c1c; }
  &.st-cancelled { background: #f1f5f9; color: #94a3b8; }
}

.rl-actions {
  display: flex;
  gap: 6px;

  button {
    padding: 7px 12px;
    border-radius: 8px;
    border: 2px solid #e2e8f0;
    background: #fff;
    font-size: 0.78em;
    font-weight: 600;
    cursor: pointer;
    color: #292c34;
    white-space: nowrap;

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

@media (max-width: 700px) {
  .rl-actions {
    display: none;
  }
}
</style>

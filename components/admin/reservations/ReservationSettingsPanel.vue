<template>
  <div class="settings-panel">
    <!-- Enable -->
    <div class="card">
      <div class="card-head">
        <div>
          <h2>{{ $i('res_settings_accept_title') }}</h2>
          <p class="hint">
            {{ $i('res_settings_accept_hint') }}
          </p>
        </div>
        <label class="switch">
          <input v-model="settings.enabled" type="checkbox">
          <span class="slider" />
        </label>
      </div>
    </div>

    <!-- Self-service cancellation -->
    <div class="card" :class="{ 'card--off': !settings.enabled }">
      <div class="card-head">
        <div>
          <h2>{{ $i('res_settings_selfcancel_title') }}</h2>
          <p class="hint">
            {{ $i('res_settings_selfcancel_hint') }}
          </p>
        </div>
        <label class="switch">
          <input v-model="settings.allowGuestCancellation" type="checkbox">
          <span class="slider" />
        </label>
      </div>
    </div>

    <!-- Booking hours -->
    <div class="card" :class="{ 'card--off': !settings.enabled }">
      <h2>{{ $i('res_settings_hours_title') }}</h2>
      <p class="hint">
        {{ $i('res_settings_hours_hint') }}
      </p>
      <label class="checkbox-row">
        <input v-model="settings.useStoreHours" type="checkbox">
        <span>{{ $i('res_settings_use_store_hours') }}</span>
      </label>

      <div v-if="!settings.useStoreHours" class="days">
        <div v-for="d in settings.days" :key="d.key" class="day-row">
          <label class="checkbox-row day-name">
            <input v-model="d.open" type="checkbox">
            <span>{{ dayLabel(d.key) }}</span>
          </label>
          <div v-if="d.open" class="day-times">
            <input v-model="d.from" type="time">
            <span class="dash">–</span>
            <input v-model="d.to" type="time">
            <span v-if="isOvernight(d)" class="overnight">{{ $i('res_settings_overnight') }}</span>
          </div>
          <span v-else class="closed-label">{{ $i('res_settings_closed_for_res') }}</span>
        </div>
      </div>
    </div>

    <!-- Rules -->
    <div class="card" :class="{ 'card--off': !settings.enabled }">
      <h2>{{ $i('res_settings_rules_title') }}</h2>
      <div class="rules-grid">
        <label>
          <span>{{ $i('res_settings_slot_interval') }}</span>
          <select v-model.number="settings.slotMinutes">
            <option :value="15">{{ $i('res_settings_minutes', { count: 15 }) }}</option>
            <option :value="30">{{ $i('res_settings_minutes', { count: 30 }) }}</option>
            <option :value="45">{{ $i('res_settings_minutes', { count: 45 }) }}</option>
            <option :value="60">{{ $i('res_settings_minutes', { count: 60 }) }}</option>
          </select>
        </label>
        <label>
          <span>{{ $i('res_settings_seating_minutes') }}</span>
          <input v-model.number="settings.seatingMinutes" type="number" min="30" step="15" @change="normalize">
        </label>
        <label>
          <span>{{ $i('res_settings_buffer_minutes') }}</span>
          <input v-model.number="settings.bufferMinutes" type="number" min="0" step="15" @change="normalize">
        </label>
        <label>
          <span>{{ $i('res_settings_lead_minutes') }}</span>
          <input v-model.number="settings.leadMinutes" type="number" min="0" step="15" @change="normalize">
        </label>
        <label>
          <span>{{ $i('res_settings_max_days') }}</span>
          <select v-model.number="settings.maxDaysAhead">
            <option :value="7">{{ $i('res_settings_1week') }}</option>
            <option :value="14">{{ $i('res_settings_2weeks') }}</option>
            <option :value="30">{{ $i('res_settings_1month') }}</option>
            <option :value="60">{{ $i('res_settings_2months') }}</option>
          </select>
        </label>
        <label>
          <span>{{ $i('res_settings_max_guests') }}</span>
          <input v-model.number="settings.maxGuests" type="number" min="1" max="100" @change="normalize">
          <em class="field-hint">{{ $i('res_settings_max_guests_hint') }}</em>
        </label>
        <label>
          <span>{{ $i('res_settings_noshow_grace') }}</span>
          <input v-model.number="settings.noShowGraceMinutes" type="number" min="0" max="120" step="5">
          <em class="field-hint">{{ $i('res_settings_noshow_grace_hint') }}</em>
        </label>
      </div>
    </div>

    <div class="card" :class="{ 'card--off': !settings.enabled }">
      <div class="card-head">
        <div>
          <h2>{{ $i('res_settings_overrides_title') }}</h2>
          <p class="hint">
            {{ $i('res_settings_overrides_hint') }}
          </p>
        </div>
        <button class="btn-secondary" @click="addOverride">
          + {{ $i('common_add') }}
        </button>
      </div>
      <div v-if="!settings.dateOverrides.length" class="overrides-empty">
        {{ $i('res_settings_no_overrides') }}
      </div>
      <div v-for="(o, idx) in settings.dateOverrides" :key="idx" class="override-row">
        <input v-model="o.date" type="date">
        <label class="checkbox-row">
          <input v-model="o.closed" type="checkbox">
          <span>{{ $i('res_settings_closed') }}</span>
        </label>
        <template v-if="!o.closed">
          <input v-model="o.from" type="time">
          <span class="dash">–</span>
          <input v-model="o.to" type="time">
        </template>
        <button class="override-remove" @click="removeOverride(idx)">
          ×
        </button>
      </div>
    </div>

    <div class="actions">
      <button class="btn-primary" @click="save">
        {{ $i('common_save') }}
      </button>
      <span v-if="lastSavedAt" class="saved">{{ $i('res_settings_saved_at', { time: lastSavedAt }) }}</span>
    </div>

    <transition name="toast">
      <div v-if="toast.show" class="toast">
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script>
const DAY_LABELS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];

export function defaultReservationSettings () {
  return {
    enabled: true,
    allowGuestCancellation: true,
    useStoreHours: true,
    days: DAY_LABELS.map((label, key) => ({ key, label, open: true, from: '16:00', to: '22:00' })),
    slotMinutes: 30,
    seatingMinutes: 90,
    bufferMinutes: 60,
    leadMinutes: 30,
    maxDaysAhead: 14,
    maxGuests: 8,
    noShowGraceMinutes: 15,
    dateOverrides: []
  };
}

export default {
  name: 'ReservationSettingsPanel',
  props: {
    storeId: { type: [String, Number], default: '' }
  },
  data () {
    return {
      settings: defaultReservationSettings(),
      saving: false,
      lastSavedAt: null,
      toast: { show: false, message: '' }
    };
  },
  watch: {
    storeId () {
      this.load();
    }
  },
  mounted () {
    this.load();
  },
  methods: {
    async load () {
      const storeId = this.storeId;
      this.lastSavedAt = null;
      if (!storeId) { this.settings = defaultReservationSettings(); return; }
      try {
        const api = await this._tableService.GetReservationSettings(storeId);
        this.settings = this.fromApi(api);
      } catch (e) {
        this.settings = defaultReservationSettings();
        this.showToast(this.$i('res_settings_load_error'));
      }
    },
    dayLabel (key) {
      return this.$i('res_day_' + key);
    },
    // Maps the API's day rows (dayOfWeek) to the panel's labelled key rows, filling gaps.
    fromApi (s) {
      const defaults = defaultReservationSettings();
      if (!s) { return defaults; }
      const days = (s.days && s.days.length)
        ? DAY_LABELS.map((label, key) => {
          const match = s.days.find(d => d.dayOfWeek === key);
          return match
            ? { key, label, open: !!match.open, from: match.from || '16:00', to: match.to || '22:00' }
            : { key, label, open: true, from: '16:00', to: '22:00' };
        })
        : defaults.days;
      return {
        enabled: !!s.enabled,
        allowGuestCancellation: s.allowGuestCancellation !== false,
        useStoreHours: s.useStoreHours !== false,
        days,
        slotMinutes: s.slotMinutes || 30,
        seatingMinutes: s.seatingMinutes || 90,
        bufferMinutes: s.bufferMinutes != null ? s.bufferMinutes : 60,
        leadMinutes: s.leadMinutes != null ? s.leadMinutes : 30,
        maxDaysAhead: s.maxDaysAhead || 14,
        maxGuests: s.maxGuests || 8,
        noShowGraceMinutes: s.noShowGraceMinutes != null ? s.noShowGraceMinutes : 15,
        dateOverrides: (s.dateOverrides || []).map(o => ({
          date: (o.date || '').slice(0, 10),
          closed: !!o.closed,
          from: o.from || '16:00',
          to: o.to || '22:00'
        }))
      };
    },
    toApi () {
      const s = this.settings;
      return {
        enabled: s.enabled,
        allowGuestCancellation: s.allowGuestCancellation,
        useStoreHours: s.useStoreHours,
        slotMinutes: s.slotMinutes,
        seatingMinutes: s.seatingMinutes,
        bufferMinutes: s.bufferMinutes,
        leadMinutes: s.leadMinutes,
        maxDaysAhead: s.maxDaysAhead,
        maxGuests: s.maxGuests,
        noShowGraceMinutes: s.noShowGraceMinutes,
        days: s.days.map(d => ({ dayOfWeek: d.key, open: d.open, from: d.from, to: d.to })),
        dateOverrides: (s.dateOverrides || [])
          .filter(o => o.date)
          .map(o => ({ date: o.date, closed: o.closed, from: o.from, to: o.to }))
      };
    },
    addOverride () {
      const today = new Date();
      const iso = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      this.settings.dateOverrides.push({ date: iso, closed: true, from: '16:00', to: '22:00' });
    },
    removeOverride (idx) {
      this.settings.dateOverrides.splice(idx, 1);
    },
    normalize () {
      const s = this.settings;
      s.seatingMinutes = Math.max(30, Math.round(s.seatingMinutes) || 90);
      s.bufferMinutes = Math.max(0, Math.round(s.bufferMinutes) || 0);
      s.leadMinutes = Math.max(0, Math.round(s.leadMinutes) || 0);
      s.maxGuests = Math.min(100, Math.max(1, Math.round(s.maxGuests) || 8));
    },
    isOvernight (d) {
      return d.from && d.to && d.to <= d.from;
    },
    async save () {
      if (this.saving) { return; }
      this.normalize();
      const storeId = this.storeId;
      if (!storeId) { return; }
      this.saving = true;
      try {
        const saved = await this._tableService.SaveReservationSettings(storeId, this.toApi());
        this.settings = this.fromApi(saved);
        this.lastSavedAt = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
        this.showToast(this.$i('res_settings_saved_toast'));
        this.$emit('saved', this.settings);
      } catch (e) {
        this.showToast(e && e.message ? e.message : this.$i('res_settings_save_error'));
      } finally {
        this.saving = false;
      }
    },
    showToast (message) {
      this.toast = { show: true, message };
      setTimeout(() => {
        this.toast.show = false;
      }, 3000);
    }
  }
};
</script>

<style lang="scss" scoped>
.settings-panel {
  max-width: 820px;
}

.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  padding: 20px 24px;
  margin-bottom: 20px;
  transition: opacity 0.3s ease;

  h2 {
    font-size: 1.05em;
    font-weight: 600;
    color: #292c34;
    margin: 0 0 6px;
  }
}

.card--off {
  opacity: 0.5;
  pointer-events: none;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.hint {
  font-size: 0.85em;
  color: #64748b;
  margin: 0 0 14px;
}

.switch {
  position: relative;
  width: 52px;
  height: 30px;
  flex-shrink: 0;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    inset: 0;
    background: #cbd5e0;
    border-radius: 999px;
    cursor: pointer;
    transition: background 0.2s ease;

    &::before {
      content: "";
      position: absolute;
      width: 24px;
      height: 24px;
      left: 3px;
      top: 3px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
  }

  input:checked + .slider {
    background: #1bb776;

    &::before {
      transform: translateX(22px);
    }
  }
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.92em;
  color: #292c34;
  cursor: pointer;
  padding: 6px 0;

  input {
    width: 18px;
    height: 18px;
    accent-color: #1bb776;
  }
}

.days {
  margin-top: 10px;
  border-top: 1px solid #eef1f5;
}

.day-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px solid #f4f6f9;
  flex-wrap: wrap;
}

.day-name {
  width: 130px;
  flex-shrink: 0;
  font-weight: 500;
}

.day-times {
  display: flex;
  align-items: center;
  gap: 8px;

  input[type="time"] {
    padding: 7px 10px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9em;
    color: #292c34;

    &:focus {
      outline: none;
      border-color: #1bb776;
    }
  }

  .dash {
    color: #94a3b8;
  }

  .overnight {
    font-size: 0.75em;
    color: #92400e;
  }
}

.closed-label {
  font-size: 0.85em;
  color: #94a3b8;
  font-style: italic;
}

.rules-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 12px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 6px;

    > span {
      font-size: 0.75em;
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

    .field-hint {
      font-size: 0.78em;
      color: #64748b;
      font-style: normal;
    }
  }
}

.btn-secondary {
  background: #fff;
  color: #292c34;
  border: 1px solid #cbd5e0;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.overrides-empty {
  color: #94a3b8;
  padding: 12px 0;
}

.override-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
  flex-wrap: wrap;

  input[type="date"],
  input[type="time"] {
    height: 38px;
    border: 1px solid #cbd5e0;
    border-radius: 8px;
    padding: 0 10px;
  }
}

.override-remove {
  margin-left: auto;
  border: none;
  background: none;
  color: #94a3b8;
  font-size: 1.3rem;
  cursor: pointer;

  &:hover {
    color: #ef4444;
  }
}

.actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.btn-primary {
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  color: #fff;
  border: none;
  padding: 12px 28px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95em;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4);
  }
}

.saved {
  font-size: 0.82em;
  color: #94a3b8;
}

.toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 8px;
  background: #10b981;
  color: #fff;
  font-size: 14px;
  z-index: 1000;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.3s ease;
}

.toast-enter,
.toast-leave-to {
  opacity: 0;
}
</style>

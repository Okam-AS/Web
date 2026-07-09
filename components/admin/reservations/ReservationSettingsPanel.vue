<template>
  <div class="settings-panel">
    <!-- Enable -->
    <div class="card">
      <div class="card-head">
        <div>
          <h2>Ta imot reservasjoner</h2>
          <p class="hint">
            Aktiverer også bordreservasjon i nettbutikken («Reserver bord»-knappen på butikksiden din).
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
          <h2>Selvbetjent avbestilling</h2>
          <p class="hint">
            Gjester kan avbestille via lenken i bekreftelses-SMS-en. Skrur du dette av, sendes
            SMS-en uten lenke og avbestilling skjer på telefon.
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
      <h2>Åpningstider for reservasjon</h2>
      <p class="hint">
        Booking kan ha andre tider enn butikkens åpningstider — for eksempel når kjøkkenet
        stenger tidligere enn baren, eller du kun tar imot bordbestilling til middag.
      </p>
      <label class="checkbox-row">
        <input v-model="settings.useStoreHours" type="checkbox">
        <span>Bruk butikkens åpningstider</span>
      </label>

      <div v-if="!settings.useStoreHours" class="days">
        <div v-for="d in settings.days" :key="d.key" class="day-row">
          <label class="checkbox-row day-name">
            <input v-model="d.open" type="checkbox">
            <span>{{ d.label }}</span>
          </label>
          <div v-if="d.open" class="day-times">
            <input v-model="d.from" type="time">
            <span class="dash">–</span>
            <input v-model="d.to" type="time">
            <span v-if="isOvernight(d)" class="overnight">over midnatt kappes ved 00:00</span>
          </div>
          <span v-else class="closed-label">Stengt for reservasjon</span>
        </div>
      </div>
    </div>

    <!-- Rules -->
    <div class="card" :class="{ 'card--off': !settings.enabled }">
      <h2>Regler</h2>
      <div class="rules-grid">
        <label>
          <span>Intervall mellom tidspunkt</span>
          <select v-model.number="settings.slotMinutes">
            <option :value="15">15 minutter</option>
            <option :value="30">30 minutter</option>
            <option :value="45">45 minutter</option>
            <option :value="60">60 minutter</option>
          </select>
        </label>
        <label>
          <span>Standard sittetid (minutter)</span>
          <input v-model.number="settings.seatingMinutes" type="number" min="30" step="15" @change="normalize">
        </label>
        <label>
          <span>Siste bord før stengetid (minutter)</span>
          <input v-model.number="settings.bufferMinutes" type="number" min="0" step="15" @change="normalize">
        </label>
        <label>
          <span>Minste frist før bordet trengs (minutter)</span>
          <input v-model.number="settings.leadMinutes" type="number" min="0" step="15" @change="normalize">
        </label>
        <label>
          <span>Hvor langt frem kan man booke</span>
          <select v-model.number="settings.maxDaysAhead">
            <option :value="7">1 uke</option>
            <option :value="14">2 uker</option>
            <option :value="30">1 måned</option>
            <option :value="60">2 måneder</option>
          </select>
        </label>
        <label>
          <span>Maks gjester per reservasjon</span>
          <input v-model.number="settings.maxGuests" type="number" min="1" max="100" @change="normalize">
          <em class="field-hint">Større selskap må ta kontakt direkte.</em>
        </label>
      </div>
    </div>

    <div class="actions">
      <button class="btn-primary" @click="save">
        Lagre
      </button>
      <span v-if="lastSavedAt" class="saved">Lagret {{ lastSavedAt }}</span>
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
    maxGuests: 8
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
        this.showToast('Kunne ikke laste innstillingene');
      }
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
        maxGuests: s.maxGuests || 8
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
        days: s.days.map(d => ({ dayOfWeek: d.key, open: d.open, from: d.from, to: d.to }))
      };
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
        this.showToast('Innstillingene er lagret');
        this.$emit('saved', this.settings);
      } catch (e) {
        this.showToast(e && e.message ? e.message : 'Kunne ikke lagre');
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

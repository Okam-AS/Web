<template>
  <div class="publishing-rule-editor">
    <div class="editor-header">
      <h3>Publiseringsregler</h3>
      <p class="description">
        Definer når denne kategorien skal være synlig for kunder basert på dag og tid.
      </p>
    </div>

    <div class="rules-list">
      <div
        v-for="(rule, index) in localRules"
        :key="index"
        class="rule-card"
      >
        <div class="rule-header">
          <span class="rule-number">Regel {{ index + 1 }}</span>
          <button class="remove-rule-btn" @click="removeRule(index)" title="Fjern regel">
            <span class="material-icons">delete</span>
          </button>
        </div>

        <!-- Day Selection -->
        <div class="form-group">
          <label>Dag</label>
          <select v-model.number="rule.dayOfWeek" class="form-select" @change="emitChanges">
            <option :value="1">Mandag</option>
            <option :value="2">Tirsdag</option>
            <option :value="3">Onsdag</option>
            <option :value="4">Torsdag</option>
            <option :value="5">Fredag</option>
            <option :value="6">Lørdag</option>
            <option :value="0">Søndag</option>
          </select>
        </div>

        <!-- All Day Toggle -->
        <div class="form-group">
          <label class="checkbox-label">
            <input
              :checked="isAllDay(rule)"
              type="checkbox"
              @change="toggleAllDay(rule)"
            />
            <span>Hele dagen</span>
          </label>
        </div>

        <!-- Time Range (shown when not all day) -->
        <div v-if="!isAllDay(rule)" class="time-range">
          <div class="form-group">
            <label>Fra kl.</label>
            <input
              :value="minutesToTime(rule.startTimeInMinutes)"
              type="time"
              class="time-input"
              @input="updateStartTime(rule, $event.target.value)"
            />
          </div>

          <div class="form-group">
            <label>Til kl.</label>
            <input
              :value="minutesToTime(rule.endTimeInMinutes)"
              type="time"
              class="time-input"
              @input="updateEndTime(rule, $event.target.value)"
            />
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="localRules.length === 0" class="empty-state">
        <span class="material-icons">event_available</span>
        <p>Ingen publiseringsregler definert</p>
        <p class="empty-hint">Kategorien vil alltid være synlig</p>
      </div>
    </div>

    <!-- Add Rule Button -->
    <button
      type="button"
      class="btn-add-rule"
      @click="addRule"
    >
      <span class="material-icons">add</span>
      Legg til regel
    </button>
  </div>
</template>

<script>
export default {
  name: 'PublishingRuleEditor',
  props: {
    rules: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      localRules: []
    }
  },
  watch: {
    rules: {
      immediate: true,
      deep: true,
      handler(newRules) {
        console.log('Publishing rules received from backend:', newRules)
        // Convert backend format to component format
        const convertedRules = (newRules || []).map(rule => ({
          ...rule,
          dayOfWeek: this.dayOfWeekStringToNumber(rule.dayOfWeek)
        }))

        // Only update localRules if there's an actual difference
        // This prevents emitting change events when props update with the same data
        if (JSON.stringify(this.localRules) !== JSON.stringify(convertedRules)) {
          this.localRules = convertedRules
          console.log('Local rules updated:', this.localRules)
        }
      }
    }
  },
  methods: {
    // Convert C# DayOfWeek string to number (0=Sunday, 1=Monday, etc.)
    dayOfWeekStringToNumber(dayOfWeekString) {
      // If already a number, return it
      if (typeof dayOfWeekString === 'number') return dayOfWeekString

      const mapping = {
        'Sunday': 0,
        'Monday': 1,
        'Tuesday': 2,
        'Wednesday': 3,
        'Thursday': 4,
        'Friday': 5,
        'Saturday': 6
      }
      return mapping[dayOfWeekString] !== undefined ? mapping[dayOfWeekString] : 1
    },

    // Convert time string (HH:MM) to minutes from midnight
    timeToMinutes(timeStr) {
      if (!timeStr) return 0
      const [hours, minutes] = timeStr.split(':').map(Number)
      return hours * 60 + minutes
    },

    // Convert minutes from midnight to time string (HH:MM)
    minutesToTime(minutes) {
      if (minutes === undefined || minutes === null) return '00:00'
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
    },

    emitChanges() {
      this.$emit('update:rules', this.localRules)
    },

    addRule() {
      this.localRules.push({
        id: null,
        dayOfWeek: 1, // Default to Monday
        startTimeInMinutes: 540, // 09:00
        endTimeInMinutes: 1020 // 17:00
      })
      this.emitChanges()
    },

    removeRule(index) {
      if (confirm('Er du sikker på at du vil fjerne denne regelen?')) {
        this.localRules.splice(index, 1)
        this.emitChanges()
      }
    },

    updateStartTime(rule, timeStr) {
      rule.startTimeInMinutes = this.timeToMinutes(timeStr)
      this.emitChanges()
    },

    updateEndTime(rule, timeStr) {
      rule.endTimeInMinutes = this.timeToMinutes(timeStr)
      this.emitChanges()
    },

    isAllDay(rule) {
      return rule.startTimeInMinutes === 0 && rule.endTimeInMinutes === 1440
    },

    toggleAllDay(rule) {
      if (this.isAllDay(rule)) {
        // Switch to partial day (default 09:00-17:00)
        rule.startTimeInMinutes = 540
        rule.endTimeInMinutes = 1020
      } else {
        // Switch to all day (00:00-24:00)
        rule.startTimeInMinutes = 0
        rule.endTimeInMinutes = 1440
      }
      this.emitChanges()
    }
  }
}
</script>

<style lang="scss" scoped>
.publishing-rule-editor {
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.editor-header {
  margin-bottom: 24px;

  h3 {
    margin: 0 0 8px 0;
    font-size: 1.2em;
    font-weight: 600;
    color: #292c34;
  }

  .description {
    margin: 0;
    color: #6b7280;
    font-size: 0.95em;
  }
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.rule-card {
  padding: 20px;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
}

.rule-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  .rule-number {
    font-weight: 600;
    color: #374151;
    font-size: 1.05em;
  }

  .remove-rule-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px;
    display: flex;
    align-items: center;
    color: #ef4444;
    border-radius: 6px;
    transition: all 0.2s;

    &:hover {
      background: #fee2e2;
    }

    .material-icons {
      font-size: 20px;
    }
  }
}

.form-group {
  margin-bottom: 16px;

  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #374151;
    font-size: 0.95em;
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1em;
  font-family: inherit;
  background: #fff;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #94a3b8;
    box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.1);
  }
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 500;
  color: #374151;

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
}

.time-range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.time-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1em;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #94a3b8;
    box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.1);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  color: #9ca3af;
  text-align: center;

  .material-icons {
    font-size: 48px;
    margin-bottom: 12px;
    color: #d1d5db;
  }

  p {
    margin: 4px 0;
    font-size: 1em;
    color: #6b7280;

    &.empty-hint {
      font-size: 0.9em;
      color: #9ca3af;
    }
  }
}

.btn-add-rule {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #334155;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.95em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  &:hover {
    background: #1e293b;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0);
  }

  .material-icons {
    font-size: 20px;
  }
}
</style>

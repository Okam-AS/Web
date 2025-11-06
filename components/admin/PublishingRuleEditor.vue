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

        <!-- Days Selection -->
        <div class="form-group">
          <label>Dager</label>
          <div class="days-grid">
            <label
              v-for="day in weekDays"
              :key="day.value"
              class="day-checkbox"
              :class="{ checked: isDaySelected(rule, day.value) }"
            >
              <input
                type="checkbox"
                :checked="isDaySelected(rule, day.value)"
                @change="toggleDay(rule, day.value)"
              />
              <span class="day-label">{{ day.label }}</span>
            </label>
          </div>
        </div>

        <!-- All Day Toggle -->
        <div class="form-group">
          <label class="checkbox-label">
            <input v-model="rule.allDay" type="checkbox" />
            <span>Hele dagen</span>
          </label>
        </div>

        <!-- Time Range (shown when not all day) -->
        <div v-if="!rule.allDay" class="time-range">
          <div class="form-group">
            <label>Fra kl.</label>
            <input
              v-model="rule.startTime"
              type="time"
              class="time-input"
            />
          </div>

          <div class="form-group">
            <label>Til kl.</label>
            <input
              v-model="rule.endTime"
              type="time"
              class="time-input"
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
    <button class="btn btn-add-rule" @click="addRule">
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
      localRules: [],
      weekDays: [
        { label: 'Man', value: 1, fullName: 'Mandag' },
        { label: 'Tir', value: 2, fullName: 'Tirsdag' },
        { label: 'Ons', value: 3, fullName: 'Onsdag' },
        { label: 'Tor', value: 4, fullName: 'Torsdag' },
        { label: 'Fre', value: 5, fullName: 'Fredag' },
        { label: 'Lør', value: 6, fullName: 'Lørdag' },
        { label: 'Søn', value: 0, fullName: 'Søndag' }
      ]
    }
  },
  watch: {
    rules: {
      immediate: true,
      handler(newRules) {
        this.localRules = newRules && newRules.length > 0
          ? JSON.parse(JSON.stringify(newRules))
          : []
      }
    },
    localRules: {
      deep: true,
      handler(newRules) {
        this.$emit('update:rules', newRules)
      }
    }
  },
  methods: {
    addRule() {
      this.localRules.push({
        days: [],
        startTime: '09:00',
        endTime: '17:00',
        allDay: false
      })
    },

    removeRule(index) {
      if (confirm('Er du sikker på at du vil fjerne denne regelen?')) {
        this.localRules.splice(index, 1)
      }
    },

    isDaySelected(rule, dayValue) {
      return rule.days && rule.days.includes(dayValue)
    },

    toggleDay(rule, dayValue) {
      if (!rule.days) {
        rule.days = []
      }

      const index = rule.days.indexOf(dayValue)
      if (index === -1) {
        rule.days.push(dayValue)
      } else {
        rule.days.splice(index, 1)
      }

      // Trigger reactivity
      this.$set(rule, 'days', [...rule.days])
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

.days-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 8px;
}

.day-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 12px;
  background: #fff;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;

  input[type="checkbox"] {
    display: none;
  }

  .day-label {
    font-weight: 600;
    color: #6b7280;
    font-size: 0.95em;
  }

  &:hover {
    border-color: #0066cc;
    background: #f9fafb;
  }

  &.checked {
    background: #eff6ff;
    border-color: #0066cc;

    .day-label {
      color: #0066cc;
    }
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
    border-color: #0066cc;
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
  padding: 10px 20px;
  background: #10b981;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #059669;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  .material-icons {
    font-size: 20px;
  }
}
</style>

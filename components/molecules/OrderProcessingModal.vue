<template>
  <div
    class="modal-backdrop"
    @click.self="cancel"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ dateRequestedLabel ? 'Forhåndsbestilling' : 'Når vil du ha bestillingen klar?' }}</h2>
        <button
          class="close-btn"
          @click="cancel"
        >
          <span class="material-icons">close</span>
        </button>
      </div>

      <div class="modal-body">
        <p
          v-if="dateRequestedLabel"
          class="preorder-info"
        >
          Vi varsler deg før du må starte tilberedningen
        </p>

        <!-- Requested completion time for preorders -->
        <div
          v-if="dateRequestedLabel"
          class="requested-time"
        >
          <label>Ønsket ferdig til:</label>
          <div class="time-display preorder-time">
            <span class="material-icons">update</span>
            <span class="time-text">{{ dateRequestedLabel }}, {{ timeRequestedLabel }}</span>
          </div>
        </div>

        <!-- Selected completion time -->
        <div class="selected-time">
          <label>Klar til:</label>
          <div class="time-display">
            <span>{{ dateLabel }}, </span>
            <button
              class="time-button"
              :class="{ 'is-active': showTimePicker }"
              @click="showTimePicker = !showTimePicker"
            >
              {{ timeLabel }}
            </button>
          </div>
        </div>

        <!-- Time picker -->
        <div
          v-if="showTimePicker"
          class="time-picker-container"
        >
          <input
            v-model="timeInput"
            type="time"
            class="time-picker"
            @change="timeChanged"
          />
          <button
            class="close-picker-btn"
            @click="showTimePicker = false"
          >
            Lukk
          </button>
        </div>

        <!-- Predefined times -->
        <div class="predefined-times">
          <button
            v-for="minutes in predefinedMinutes"
            :key="minutes"
            class="time-chip"
            :class="{ 'is-selected': isSelected(minutes) }"
            @click="selectPredefinedTime(minutes)"
          >
            <span class="time-value">{{ minutes === 0 ? 'Nå' : minutes }}</span>
            <span
              v-if="minutes !== 0"
              class="time-unit"
            >min</span>
          </button>
        </div>
      </div>

      <div class="modal-footer">
        <button
          v-if="!isLoading"
          class="btn btn-primary"
          @click="confirm"
        >
          Bekreft {{ dateTimeLabel }}
        </button>
        <div
          v-else
          class="loading-spinner"
        />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'OrderProcessingModal',
  props: {
    order: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      isLoading: false,
      showTimePicker: false,
      selectedDate: new Date(),
      selectedTime: new Date(),
      numberOfMinutes: 20,
      preorderNumberOfMinutes: 20,
      selectedPredefinedNumberOfMinutes: 20,
      timeInput: '',
      predefinedMinutes: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]
    }
  },
  computed: {
    dateRequestedLabel() {
      if (!this.order.requestedCompletion) return ''
      const date = new Date(this.order.requestedCompletion)
      return this.getDateLabel(date)
    },
    timeRequestedLabel() {
      if (!this.order.requestedCompletion) return ''
      const date = new Date(this.order.requestedCompletion)
      return this.getNumberWithTrailingZero(date.getHours()) + ':' + this.getNumberWithTrailingZero(date.getMinutes())
    },
    dateLabel() {
      return this.getDateLabel(this.selectedDate)
    },
    timeLabel() {
      return this.getNumberWithTrailingZero(this.selectedTime.getHours()) + ':' + this.getNumberWithTrailingZero(this.selectedTime.getMinutes())
    },
    dateTimeLabel() {
      if (this.numberOfMinutes <= 0) return 'nå'
      if (this.numberOfMinutes < 60) return 'om ' + this.numberOfMinutes + ' minutter'
      if (this.numberOfMinutes === 60) return 'om en time'
      return 'kl. ' + this.timeLabel + ' ' + this.dateLabel
    },
    isPreorder() {
      return !!this.order?.requestedCompletion
    }
  },
  mounted() {
    if (this.order.requestedCompletion) {
      this.readyAtRequestedDateTime()
    } else {
      this.selectPredefinedTime(20)
    }
    this.updateTimeInput()
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  },
  beforeDestroy() {
    // Restore body scroll
    document.body.style.overflow = '';
  },
  methods: {
    readyAtRequestedDateTime() {
      if (this.isPreorder) {
        this.selectedDate = new Date(this.order.requestedCompletion)
        this.selectedTime = new Date(this.order.requestedCompletion)
        this.dateTimeChanged()
      }
    },
    isSelected(minutes) {
      return Math.abs(this.selectedPredefinedNumberOfMinutes - minutes) <= 1
    },
    getDateLabel(date) {
      const today = new Date()
      if (this.isSameDay(date, today)) return 'i dag'

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      if (this.isSameDay(date, tomorrow)) return 'i morgen'

      return this.getNumberWithTrailingZero(date.getDate()) + '.' + this.getNumberWithTrailingZero(date.getMonth() + 1) + '.' + date.getFullYear()
    },
    isSameDay(date1, date2) {
      return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate()
    },
    addMinToDate(min, date) {
      const d = date || new Date()
      d.setSeconds(0)
      return new Date(d.getTime() + min * 60000)
    },
    getSelectedDateTime() {
      const dateOnly = new Date(this.selectedDate.getTime())
      dateOnly.setHours(this.selectedTime.getHours(), this.selectedTime.getMinutes(), 0, 0)
      return dateOnly
    },
    selectPredefinedTime(min) {
      this.showTimePicker = false
      this.selectedPredefinedNumberOfMinutes = min

      if (this.isPreorder) {
        this.preorderNumberOfMinutes = min
      }

      if (!this.isPreorder || this.numberOfMinutes < this.preorderNumberOfMinutes) {
        const selected = this.addMinToDate(min)
        this.selectedTime = selected
        this.selectedDate = selected
        this.dateTimeChanged()
      }
      this.updateTimeInput()
    },
    timeChanged() {
      if (!this.timeInput) return

      const [hours, minutes] = this.timeInput.split(':').map(Number)
      const now = new Date()
      const selected = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0)

      this.selectedTime = selected
      this.selectedDate = selected
      this.dateTimeChanged()
    },
    dateTimeChanged() {
      const selected = this.getSelectedDateTime()
      const now = new Date()
      now.setSeconds(0)
      now.setMilliseconds(0)

      const diffInMs = selected.getTime() - now.getTime()
      const diffInMinutes = Math.round(diffInMs / (60 * 1000))

      if (diffInMs < 0) {
        this.selectedTime = now
        this.selectedDate = now
        this.numberOfMinutes = 0
      } else {
        this.selectedTime = selected
        this.selectedDate = selected
        this.numberOfMinutes = diffInMinutes
      }

      if (this.isPreorder && this.numberOfMinutes < this.preorderNumberOfMinutes) {
        const adjusted = this.addMinToDate(this.preorderNumberOfMinutes)
        this.selectedTime = adjusted
        this.selectedDate = adjusted
        this.numberOfMinutes = this.preorderNumberOfMinutes
      }

      this.updateTimeInput()
    },
    updateTimeInput() {
      this.timeInput = this.getNumberWithTrailingZero(this.selectedTime.getHours()) + ':' + this.getNumberWithTrailingZero(this.selectedTime.getMinutes())
    },
    getNumberWithTrailingZero(number) {
      const numberString = number + ''
      if (!numberString || numberString.length <= 0) return '00'
      if (numberString.length === 1) return '0' + numberString
      return numberString
    },
    confirm() {
      if (this.isLoading) return
      this.isLoading = true

      let remainingMinutesToStartProcessing = 0
      if (this.isPreorder) {
        remainingMinutesToStartProcessing = this.numberOfMinutes - this.preorderNumberOfMinutes
      }

      this._orderService
        .Processing(this.order.id, this.numberOfMinutes, remainingMinutesToStartProcessing > 0 ? remainingMinutesToStartProcessing : 0)
        .then(() => {
          this.$emit('close', true)
        })
        .catch((error) => {
          alert(error.message || 'Kunne ikke oppdatere bestilling')
        })
        .finally(() => {
          this.isLoading = false
        })
    },
    cancel() {
      this.$emit('close', false)
    }
  }
}
</script>

<style scoped lang="scss">
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    margin: 0;
    font-size: 1.5em;
    color: #292c34;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: #666;
    transition: color 0.2s;

    &:hover {
      color: #1bb776;
    }

    .material-icons {
      font-size: 24px;
    }
  }
}

.modal-body {
  padding: 24px;
}

.preorder-info {
  text-align: center;
  color: #666;
  margin-bottom: 20px;
  font-size: 0.95em;
}

.requested-time,
.selected-time {
  margin-bottom: 20px;

  label {
    display: block;
    font-weight: 600;
    color: #4a5568;
    margin-bottom: 8px;
    font-size: 0.9em;
  }
}

.time-display {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ebeaea;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 1.1em;

  &.preorder-time {
    background: #e6f2ff;
    border: 2px solid #4da6ff;
    font-weight: 600;
  }

  .material-icons {
    color: #4da6ff;
    font-size: 20px;
  }
}

.time-button {
  background: none;
  border: none;
  font-size: 1.1em;
  font-weight: bold;
  text-decoration: underline;
  cursor: pointer;
  color: #292c34;
  padding: 0;
  transition: color 0.2s;

  &:hover,
  &.is-active {
    color: #1bb776;
  }
}

.time-picker-container {
  background: #ebeaea;
  padding: 16px;
  border-radius: 10px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  .time-picker {
    width: 100%;
    padding: 12px;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 1.1em;
    background: white;

    &:focus {
      outline: none;
      border-color: #1bb776;
    }
  }

  .close-picker-btn {
    background: white;
    border: 1px solid #ddd;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9em;
    transition: all 0.2s;

    &:hover {
      background: #f5f5f5;
      border-color: #1bb776;
    }
  }
}

.predefined-times {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;

  @media (max-width: 480px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.time-chip {
  background: #ebeaea;
  border: 2px solid transparent;
  padding: 12px 8px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: all 0.2s;

  &:hover {
    background: #e0e0e0;
    transform: translateY(-2px);
  }

  &.is-selected {
    background: #e8f7f1;
    border-color: #1bb776;
  }

  .time-value {
    font-size: 1.4em;
    font-weight: bold;
    line-height: 1;
  }

  .time-unit {
    font-size: 0.75em;
    color: #666;
  }
}

.modal-footer {
  padding: 24px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: center;
}

.btn {
  padding: 14px 32px;
  border: none;
  border-radius: 8px;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;

  &.btn-primary {
    background: #1bb776;
    color: white;

    &:hover {
      background: #159a61;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);
    }

    &:active {
      transform: translateY(0);
    }
  }
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top: 4px solid #1bb776;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>

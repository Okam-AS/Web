<template>
  <div class="begin-day">
    <div class="begin-day__panel">
      <div class="begin-day__icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </div>
      <h1 class="begin-day__title">
        {{ $i('pos_begin_day_title') }}
      </h1>
      <p class="begin-day__subtitle">
        {{ $i('pos_begin_day_subtitle') }}
      </p>

      <AmountPad v-model="startFloat" :quick-amounts="quickFloats" />

      <p v-if="error" class="begin-day__error">
        {{ error }}
      </p>

      <button
        type="button"
        class="begin-day__submit"
        :disabled="busy"
        @click="submit"
      >
        <span v-if="busy">{{ $i('pos_working') }}</span>
        <span v-else>{{ $i('pos_begin_day_button') }}</span>
      </button>
    </div>
  </div>
</template>

<script>
import AmountPad from '~/components/admin/pos/AmountPad.vue';

// Blocking first step when a cash point has no open trading day (POSSTART requires an opening
// float). Sales are gated until the day is opened. Calls pos.beginDay(startFloatØre).
export default {
  name: 'BeginDayModal',
  components: { AmountPad },
  inject: ['pos'],
  data () {
    return {
      startFloat: 0,
      quickFloats: [0, 100000, 200000, 500000],
      busy: false,
      error: ''
    };
  },
  methods: {
    async submit () {
      this.busy = true;
      this.error = '';
      try {
        await this.pos.beginDay(this.startFloat);
      } catch (e) {
        this.error = this.pos.errMsg(e);
      } finally {
        this.busy = false;
      }
    }
  }
};
</script>

<style scoped>
.begin-day {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 20%, #1f2530, #12141a 70%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 850;
}

.begin-day__panel {
  background: #ffffff;
  border-radius: 20px;
  padding: 28px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45);
}

.begin-day__icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(27, 183, 118, 0.12);
  color: var(--pos-primary-dark, #159f63);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14px;
}
.begin-day__icon svg { width: 30px; height: 30px; }

.begin-day__title {
  font-size: 1.4rem;
  font-weight: 700;
  text-align: center;
  color: var(--pos-ink, #292c34);
  margin: 0 0 4px;
}
.begin-day__subtitle {
  text-align: center;
  color: #64748b;
  font-size: 0.9rem;
  margin: 0 0 20px;
}

.begin-day__error {
  color: #ef4444;
  font-weight: 600;
  text-align: center;
  font-size: 0.85rem;
  margin: 14px 0 0;
}

.begin-day__submit {
  margin-top: 18px;
  width: 100%;
  height: 60px;
  border: none;
  border-radius: 12px;
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
}
.begin-day__submit:disabled { background: #cbd5e0; cursor: not-allowed; }
</style>

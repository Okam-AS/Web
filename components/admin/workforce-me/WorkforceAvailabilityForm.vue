<template>
  <section class="wfav">
    <!-- The replace rule, said before the form rather than after a surprise. #36 supersedes the whole
         active rule set, so a week submitted with one day filled in is a week with six days cleared. -->
    <p class="wfav__lede">
      {{ $i('wfme_avail_lede') }}
    </p>
    <!-- The read that does not exist. #36 is a PUT and the manager GET (#14) needs WorkforceScheduler,
         so a worker cannot be shown what is stored — only what they just sent. Saying so is the
         difference between an empty form meaning "you have set nothing" and meaning "we do not know". -->
    <p class="wfav__note wfav__note--warn">
      {{ saved ? $i('wfme_avail_showing_saved') : $i('wfme_avail_no_read') }}
    </p>

    <div v-if="!timeZoneId" class="wfav__blocked">
      {{ $i('wfme_self_no_zone') }}
    </div>

    <template v-else>
      <h3 class="wfav__heading">
        {{ $i('wfme_avail_weekly') }}
      </h3>
      <ul class="wfav__days">
        <li v-for="row in rules" :key="row.dayOfWeek" class="wfav__day">
          <label class="wfav__toggle">
            <input v-model="row.enabled" type="checkbox" :disabled="busy">
            <span class="wfav__dayname">{{ $i(row.labelKey) }}</span>
          </label>

          <div v-if="row.enabled" class="wfav__fields">
            <label class="wfav__field">
              <span class="wfav__label">{{ $i('wfme_avail_from') }}</span>
              <input v-model="row.start" type="time" :disabled="busy">
            </label>
            <label class="wfav__field">
              <span class="wfav__label">{{ $i('wfme_avail_to') }}</span>
              <input v-model="row.end" type="time" :disabled="busy">
            </label>
            <label class="wfav__field wfav__field--wide">
              <span class="wfav__label">{{ $i('wfme_avail_kind') }}</span>
              <select v-model="row.kind" :disabled="busy">
                <option value="Available">{{ $i('wfme_avail_kind_available') }}</option>
                <option value="Preferred">{{ $i('wfme_avail_kind_preferred') }}</option>
                <option value="Unavailable">{{ $i('wfme_avail_kind_unavailable') }}</option>
              </select>
            </label>
          </div>
        </li>
      </ul>

      <p v-if="hiddenCount" class="wfav__note wfav__note--warn">
        {{ $i('wfme_avail_hidden_rules', { count: hiddenCount }) }}
      </p>

      <h3 class="wfav__heading">
        {{ $i('wfme_avail_exceptions') }}
      </h3>
      <p class="wfav__note">
        {{ $i('wfme_avail_exceptions_lede') }}
      </p>

      <ul v-if="exceptions.length" class="wfav__exceptions">
        <li v-for="(row, index) in exceptions" :key="index" class="wfav__exception">
          <div class="wfav__fields">
            <label class="wfav__field">
              <span class="wfav__label">{{ $i('wfme_avail_date') }}</span>
              <input v-model="row.date" type="date" :disabled="busy">
            </label>
            <label class="wfav__field">
              <span class="wfav__label">{{ $i('wfme_avail_from') }}</span>
              <input v-model="row.start" type="time" :disabled="busy">
            </label>
            <label class="wfav__field">
              <span class="wfav__label">{{ $i('wfme_avail_to') }}</span>
              <input v-model="row.end" type="time" :disabled="busy">
            </label>
            <label class="wfav__field">
              <span class="wfav__label">{{ $i('wfme_avail_kind') }}</span>
              <select v-model="row.kind" :disabled="busy">
                <option value="Unavailable">{{ $i('wfme_avail_kind_unavailable') }}</option>
                <option value="Preferred">{{ $i('wfme_avail_kind_preferred') }}</option>
                <option value="Available">{{ $i('wfme_avail_kind_available') }}</option>
              </select>
            </label>
          </div>
          <label class="wfav__field wfav__field--wide">
            <span class="wfav__label">{{ $i('wfme_avail_note') }}</span>
            <input v-model="row.note" type="text" :disabled="busy">
          </label>
          <button class="wfav__btn wfav__btn--ghost" :disabled="busy" @click="removeException(index)">
            {{ $i('wfme_avail_remove') }}
          </button>
        </li>
      </ul>

      <button class="wfav__btn wfav__btn--ghost" :disabled="busy" @click="addException">
        {{ $i('wfme_avail_add_exception') }}
      </button>

      <p v-if="error" class="wfav__error">
        {{ $i(error) }}
      </p>

      <div class="wfav__actions">
        <button class="wfav__btn" :disabled="busy" @click="submit">
          {{ busy ? $i('wfme_avail_saving') : $i('wfme_avail_save') }}
        </button>
      </div>
    </template>
  </section>
</template>

<script>
import {
  VALID,
  blankRules,
  buildAvailabilityRequest,
  hiddenRuleCount,
  rulesFromResponse,
  validationMessageKey
} from '~/utils/workforce-me/self-requests';

// The worker's own availability (#36).
//
// It holds the WHOLE week because the endpoint replaces the whole week. A form that submitted only
// the row somebody touched would clear the other six, and the worker would find out by not being
// rostered.
export default {
  name: 'WorkforceAvailabilityForm',
  props: {
    // The store's IANA zone. Absent means the picked dates cannot be placed, so the form refuses to
    // render its inputs rather than sending instants derived from the phone's zone.
    timeZoneId: { type: String, default: null },
    busy: { type: Boolean, default: false },
    // The last #36 response for this engagement, or null. It is the ONLY canonical state a worker can
    // be shown — there is no read — so it is what the form reloads from after a save.
    saved: { type: Object, default: null }
  },
  data () {
    return {
      rules: blankRules(),
      exceptions: [],
      error: ''
    };
  },
  computed: {
    hiddenCount () {
      return hiddenRuleCount(this.saved);
    }
  },
  watch: {
    // A save answers with the canonical set; the form adopts it so the next edit starts from what the
    // server holds rather than from what this browser last typed. `immediate` because the page keys
    // this component on the engagement: switching store and back REMOUNTS it, and without this the
    // remount would show a blank week for an engagement whose answer is still in hand.
    saved: {
      immediate: true,
      handler (value) {
        if (!value) { return; }
        this.rules = rulesFromResponse(value);
        this.exceptions = ((value.exceptions) || []).map(item => ({
          date: String(item.localDate || '').slice(0, 10),
          start: '',
          end: '',
          kind: item.kind || 'Unavailable',
          note: item.note || ''
        }));
      }
    },
    // Switching engagement switches store, and a week typed for one store must not be submitted to
    // another. The form resets rather than carrying it across.
    timeZoneId () {
      this.rules = blankRules();
      this.exceptions = [];
      this.error = '';
    }
  },
  methods: {
    addException () {
      this.exceptions.push({ date: '', start: '', end: '', kind: 'Unavailable', note: '' });
    },
    removeException (index) {
      this.exceptions.splice(index, 1);
    },
    submit () {
      this.error = '';
      const built = buildAvailabilityRequest({
        timeZoneId: this.timeZoneId,
        rules: this.rules,
        exceptions: this.exceptions
      });

      if (built.error !== VALID) {
        this.error = validationMessageKey(built.error);
        return;
      }
      this.$emit('save', built.body);
    }
  }
};
</script>

<style scoped>
.wfav {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px 20px;
}

.wfav__lede {
  margin: 0 0 10px;
  font-size: 0.92em;
  color: #292c34;
}

.wfav__note {
  margin: 0 0 14px;
  font-size: 0.82em;
  color: #64748b;
}

.wfav__note--warn {
  padding: 10px 14px;
  border-radius: 8px;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  color: #92400e;
}

.wfav__blocked {
  padding: 14px;
  border-radius: 8px;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  color: #64748b;
  font-size: 0.9em;
}

.wfav__heading {
  margin: 18px 0 10px;
  font-size: 1em;
  font-weight: 600;
  color: #292c34;
}

.wfav__days,
.wfav__exceptions {
  list-style: none;
  margin: 0;
  padding: 0;
}

.wfav__day,
.wfav__exception {
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}

.wfav__toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  cursor: pointer;
}

.wfav__toggle input {
  width: 20px;
  height: 20px;
}

.wfav__dayname {
  font-weight: 600;
  color: #292c34;
  text-transform: capitalize;
}

.wfav__fields {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
}

.wfav__field {
  display: block;
  flex: 0 0 auto;
}

.wfav__field--wide {
  flex: 1 1 180px;
}

.wfav__label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.75em;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.wfav__field input,
.wfav__field select {
  width: 100%;
  min-height: 44px;
  padding: 8px 10px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.92em;
  color: #292c34;
  background: #fff;
}

.wfav__field input:focus,
.wfav__field select:focus {
  outline: none;
  border-color: #1bb776;
}

.wfav__error {
  margin: 12px 0 0;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid #ef4444;
  color: #292c34;
  font-size: 0.88em;
}

.wfav__actions {
  margin-top: 16px;
}

.wfav__btn {
  min-height: 44px;
  margin-top: 10px;
  padding: 0 20px;
  border: none;
  border-radius: 8px;
  background: #1bb776;
  color: #fff;
  font-weight: 600;
  font-size: 0.9em;
  cursor: pointer;
}

.wfav__btn:disabled {
  background: #cbd5e0;
  cursor: not-allowed;
}

.wfav__btn--ghost {
  background: #fff;
  color: #292c34;
  border: 1px solid #cbd5e0;
}
</style>

<template>
  <section class="wfto">
    <p class="wfto__lede">
      {{ $i('wfme_timeoff_lede') }}
    </p>

    <div v-if="!timeZoneId" class="wfto__blocked">
      {{ $i('wfme_self_no_zone') }}
    </div>

    <template v-else>
      <div class="wfto__fields">
        <label class="wfto__field">
          <span class="wfto__label">{{ $i('wfme_timeoff_from') }}</span>
          <input v-model="fromDate" type="date" :disabled="busy">
        </label>
        <label class="wfto__field">
          <span class="wfto__label">{{ $i('wfme_timeoff_to') }}</span>
          <input v-model="toDate" type="date" :disabled="busy">
        </label>
        <label class="wfto__field wfto__field--wide">
          <span class="wfto__label">{{ $i('wfme_timeoff_visibility') }}</span>
          <select v-model="visibility" :disabled="busy">
            <option value="Managers">{{ $i('wfme_timeoff_visibility_managers') }}</option>
            <option value="Team">{{ $i('wfme_timeoff_visibility_team') }}</option>
          </select>
        </label>
      </div>

      <label class="wfto__field wfto__field--wide">
        <span class="wfto__label">{{ $i('wfme_timeoff_reason') }}</span>
        <input v-model="reason" type="text" :disabled="busy" :placeholder="$i('wfme_timeoff_reason_placeholder')">
      </label>
      <!-- Who reads the reason, stated where it is typed. The manager inbox is the only surface that
           carries it; it is on no broadcast and on no coworker's screen, whichever visibility is
           chosen. A worker deciding how much to write deserves to know that before writing it. -->
      <p class="wfto__note">
        {{ $i('wfme_timeoff_reason_private') }}
      </p>

      <p class="wfto__note">
        {{ $i('wfme_timeoff_whole_days', { zone: timeZoneId }) }}
      </p>

      <p v-if="error" class="wfto__error">
        {{ $i(error) }}
      </p>

      <button class="wfto__btn" :disabled="busy" @click="submit">
        {{ busy ? $i('wfme_timeoff_sending') : $i('wfme_timeoff_send') }}
      </button>
    </template>

    <!-- What was sent, for as long as this page is open. There is no worker-side READ of a person's
         own requests (`/me/inbox` carries publication items only), so this list cannot survive a
         reload — and it says so rather than looking like a complete record that has gone empty. -->
    <template v-if="submitted.length">
      <h3 class="wfto__heading">
        {{ $i('wfme_timeoff_sent_title') }}
      </h3>
      <ul class="wfto__list">
        <li v-for="request in submitted" :key="request.timeOffRequestId" class="wfto__request">
          <div class="wfto__requesthead">
            <span class="wfto__dates">{{ dateRange(request) }}</span>
            <span class="wfto__status">{{ $i(statusKey(request.status)) }}</span>
          </div>
          <p v-if="request.reason" class="wfto__reason">
            {{ request.reason }}
          </p>
          <!-- An approval that overlapped a published shift records the affected revision and does
               NOT rewrite the publication. The worker is told the same truth the manager is: the
               answer is yes, and the roster has not moved yet. -->
          <p v-if="request.firstAffectedScheduleRevisionId" class="wfto__affected">
            {{ $i('wfme_timeoff_affects_published') }}
          </p>
          <button
            v-if="isOpen(request)"
            class="wfto__btn wfto__btn--ghost"
            :disabled="busy"
            @click="$emit('withdraw', request)"
          >
            {{ $i('wfme_timeoff_withdraw') }}
          </button>
        </li>
      </ul>
      <p class="wfto__note wfto__note--muted">
        {{ $i('wfme_timeoff_session_only') }}
      </p>
    </template>
  </section>
</template>

<script>
import { formatBusinessDate } from '~/utils/workforce-me/shift-view';
import {
  VALID,
  buildTimeOffRequest,
  isOpenRequest,
  timeOffStatusKey,
  validationMessageKey
} from '~/utils/workforce-me/self-requests';

// The worker's own time-off request (#37) and withdrawal (#38).
//
// The dates are STORE-LOCAL calendar days and the instants are derived from them in the store's zone,
// because the server files the request on whichever local dates those instants land on. Without a
// zone the form refuses to render its pickers — a request quietly filed a day out is worse than one
// that could not be made.
export default {
  name: 'WorkforceTimeOffForm',
  props: {
    timeZoneId: { type: String, default: null },
    locale: { type: String, default: 'nb-NO' },
    busy: { type: Boolean, default: false },
    // The requests this session has sent, newest last, as the server answered them.
    submitted: { type: Array, default: () => [] }
  },
  data () {
    return {
      fromDate: '',
      toDate: '',
      reason: '',
      visibility: 'Managers',
      error: ''
    };
  },
  watch: {
    timeZoneId () {
      this.error = '';
    }
  },
  methods: {
    isOpen: isOpenRequest,
    statusKey: timeOffStatusKey,

    dateRange (request) {
      const from = String(request.localStartDate || '').slice(0, 10);
      const to = String(request.localEndDate || '').slice(0, 10);
      if (!from) { return ''; }
      const start = formatBusinessDate(from, this.locale);
      return !to || to === from ? start : start + ' – ' + formatBusinessDate(to, this.locale);
    },

    submit () {
      this.error = '';
      const built = buildTimeOffRequest({
        timeZoneId: this.timeZoneId,
        fromDate: this.fromDate,
        toDate: this.toDate,
        reason: this.reason,
        visibility: this.visibility
      });

      if (built.error !== VALID) {
        this.error = validationMessageKey(built.error);
        return;
      }
      this.$emit('request', built.body);
    },

    // Called by the page once the server has accepted a request, so the form is empty for the next
    // one. Not cleared optimistically: a refused request keeps the dates that were typed.
    reset () {
      this.fromDate = '';
      this.toDate = '';
      this.reason = '';
    }
  }
};
</script>

<style scoped>
.wfto {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px 20px;
}

.wfto__lede {
  margin: 0 0 14px;
  font-size: 0.92em;
  color: #292c34;
}

.wfto__blocked {
  padding: 14px;
  border-radius: 8px;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  color: #64748b;
  font-size: 0.9em;
}

.wfto__fields {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.wfto__field {
  display: block;
  flex: 0 0 auto;
  margin-bottom: 10px;
}

.wfto__field--wide {
  flex: 1 1 200px;
}

.wfto__label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.75em;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.wfto__field input,
.wfto__field select {
  width: 100%;
  min-height: 44px;
  padding: 8px 10px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.92em;
  color: #292c34;
  background: #fff;
}

.wfto__field input:focus,
.wfto__field select:focus {
  outline: none;
  border-color: #1bb776;
}

.wfto__note {
  margin: 0 0 12px;
  font-size: 0.8em;
  color: #64748b;
}

.wfto__note--muted {
  color: #94a3b8;
}

.wfto__error {
  margin: 0 0 12px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid #ef4444;
  color: #292c34;
  font-size: 0.88em;
}

.wfto__heading {
  margin: 20px 0 10px;
  font-size: 1em;
  font-weight: 600;
  color: #292c34;
}

.wfto__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.wfto__request {
  padding: 12px 0;
  border-top: 1px solid #f1f5f9;
}

.wfto__requesthead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.wfto__dates {
  font-weight: 600;
  color: #292c34;
  text-transform: capitalize;
}

.wfto__status {
  font-size: 0.72em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #64748b;
  background: #f1f5f9;
  border-radius: 6px;
  padding: 3px 8px;
}

.wfto__reason {
  margin: 6px 0 0;
  font-size: 0.88em;
  color: #64748b;
}

.wfto__affected {
  margin: 8px 0 0;
  padding: 8px 12px;
  border-radius: 8px;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  color: #92400e;
  font-size: 0.85em;
}

.wfto__btn {
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

.wfto__btn:disabled {
  background: #cbd5e0;
  cursor: not-allowed;
}

.wfto__btn--ghost {
  background: #fff;
  color: #292c34;
  border: 1px solid #cbd5e0;
}
</style>

<template>
  <li class="wfme-open" :class="{ 'wfme-open--mine': assignment.alreadyRequested }">
    <div class="wfme-open__head">
      <div>
        <span class="wfme-open__date">{{ dateLabel }}</span>
        <span class="wfme-open__range">{{ range }}</span>
      </div>
      <span v-if="assignment.alreadyRequested" class="wfme-open__badge">{{ $i('wfme_open_asked') }}</span>
    </div>

    <div class="wfme-open__body">
      <span v-if="assignment.roleName" class="wfme-open__role">{{ assignment.roleName }}</span>
      <span v-else class="wfme-open__role wfme-open__role--none">{{ $i('wfme_role_none') }}</span>
      <span v-if="paid" class="wfme-open__paid">{{ $i('wfme_paid_time', { time: paid }) }}</span>
      <span class="wfme-open__origin">{{ originLabel }}</span>
    </div>

    <p v-if="assignment.note" class="wfme-open__note">
      {{ assignment.note }}
    </p>

    <div class="wfme-open__foot">
      <!-- A count, never who. The surface discloses how contested a shift is without disclosing which
           coworkers asked for it. -->
      <span class="wfme-open__contest">{{ contestLabel }}</span>

      <button
        v-if="!assignment.alreadyRequested"
        class="wfme-open__btn"
        :disabled="busy"
        @click="$emit('claim', assignment)"
      >
        {{ busy ? $i('wfme_open_sending') : $i('wfme_open_ask') }}
      </button>

      <button
        v-else-if="canWithdraw"
        class="wfme-open__btn wfme-open__btn--ghost"
        :disabled="busy"
        @click="$emit('withdraw', assignment)"
      >
        {{ busy ? $i('wfme_open_sending') : $i('wfme_open_withdraw') }}
      </button>

      <!-- alreadyRequested with no exchangeId: #39 only returns the id of a coworker's OPEN offer,
           so an ask on a manager-opened shift carries none and #42 has nothing to address. Saying so
           beats a button that cannot work. -->
      <span v-else class="wfme-open__nowithdraw">{{ $i('wfme_open_withdraw_unavailable') }}</span>
    </div>
  </li>
</template>

<script>
import { formatBusinessDate, formatMinutes, formatWallClock, paidMinutes } from '~/utils/workforce-me/shift-view';

// One shift the worker may ask for (#39). Asking creates a candidacy, never an assignment: a manager
// awards exactly one candidate, so this card must stay honest about the fact that asking is not
// getting.
export default {
  name: 'WorkforceOpenShiftCard',
  props: {
    assignment: { type: Object, required: true },
    // The store zone for this engagement. #39 items carry no timeZoneId of their own, so it is passed
    // down from the membership rather than guessed from the browser.
    timeZoneId: { type: String, default: null },
    locale: { type: String, default: 'nb-NO' },
    busy: { type: Boolean, default: false }
  },
  computed: {
    dateLabel () {
      const raw = this.assignment.localBusinessDate;
      return raw ? formatBusinessDate(String(raw).slice(0, 10), this.locale) : '';
    },
    range () {
      const zone = this.timeZoneId;
      return formatWallClock(this.assignment.startsUtc, zone, this.locale) +
        '–' + formatWallClock(this.assignment.endsUtc, zone, this.locale);
    },
    paid () {
      return formatMinutes(paidMinutes(this.assignment));
    },
    // A shift is open either because nobody was ever rostered on it or because a coworker released
    // it. The worker sees which, but never who released it.
    originLabel () {
      return this.assignment.exchangeId
        ? this.$i('wfme_open_from_coworker')
        : this.$i('wfme_open_unassigned');
    },
    contestLabel () {
      const count = this.assignment.candidateCount;
      if (typeof count !== 'number') { return this.$i('wfme_open_contest_unknown'); }
      if (count === 0) { return this.$i('wfme_open_contest_none'); }
      if (count === 1) { return this.$i('wfme_open_contest_one'); }
      return this.$i('wfme_open_contest_many', { count });
    },
    canWithdraw () {
      return !!this.assignment.exchangeId;
    }
  }
};
</script>

<style scoped>
.wfme-open {
  list-style: none;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 10px;
}

.wfme-open--mine {
  border-color: #1bb776;
  background: rgba(27, 183, 118, 0.04);
}

.wfme-open__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.wfme-open__date {
  display: block;
  font-size: 0.8em;
  color: #64748b;
  text-transform: capitalize;
}

.wfme-open__range {
  font-size: 1.15em;
  font-weight: 600;
  color: #292c34;
  font-variant-numeric: tabular-nums;
}

.wfme-open__badge {
  flex-shrink: 0;
  font-size: 0.72em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #159f63;
  background: rgba(27, 183, 118, 0.14);
  border-radius: 6px;
  padding: 3px 8px;
}

.wfme-open__body {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
}

.wfme-open__role {
  font-size: 0.95em;
  color: #292c34;
}

.wfme-open__role--none {
  color: #94a3b8;
  font-style: italic;
}

.wfme-open__paid,
.wfme-open__origin {
  font-size: 0.85em;
  color: #64748b;
}

.wfme-open__note {
  margin: 8px 0 0;
  font-size: 0.88em;
  color: #64748b;
}

.wfme-open__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.wfme-open__contest {
  font-size: 0.8em;
  color: #94a3b8;
}

.wfme-open__nowithdraw {
  font-size: 0.78em;
  color: #94a3b8;
  text-align: right;
  flex: 1;
}

.wfme-open__btn {
  min-height: 44px;
  min-width: 44px;
  padding: 0 20px;
  border: none;
  border-radius: 8px;
  background: #1bb776;
  color: #fff;
  font-weight: 600;
  font-size: 0.9em;
  cursor: pointer;
  transition: background 0.2s ease;
}

.wfme-open__btn:hover:not(:disabled) {
  background: #159f63;
}

.wfme-open__btn:disabled {
  background: #cbd5e0;
  cursor: not-allowed;
}

.wfme-open__btn--ghost {
  background: #fff;
  color: #292c34;
  border: 1px solid #cbd5e0;
}

.wfme-open__btn--ghost:hover:not(:disabled) {
  background: #f8f9fa;
}

@media (max-width: 768px) {
  .wfme-open {
    padding: 12px 14px;
  }

  .wfme-open__btn {
    flex: 1;
  }
}
</style>

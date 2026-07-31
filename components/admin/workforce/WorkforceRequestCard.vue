<template>
  <li class="wfq-card" :class="{ 'wfq-card--decidable': canDecide, 'wfq-card--closed': !item.isDecidable }">
    <div class="wfq-card__head">
      <div class="wfq-card__who">
        <span class="wfq-card__name">{{ personName }}</span>
        <span class="wfq-card__when">{{ dateLabel }}</span>
        <span class="wfq-card__clock">{{ clockLabel }}</span>
        <span v-if="!zoneKnown" class="wfq-card__flag">{{ $i('wfq_zone_unknown') }}</span>
      </div>
      <div class="wfq-card__tags">
        <span class="wfq-card__kind" :class="'wfq-card__kind--' + item.kind">{{ $i(kindKey) }}</span>
        <span class="wfq-card__state">{{ $i(stateKey) }}</span>
      </div>
    </div>

    <p v-if="item.reason" class="wfq-card__reason">
      <span class="wfq-card__reasonlabel">{{ $i('wfq_reason') }}</span>{{ item.reason }}
    </p>
    <!-- The reason is manager-only by construction (§13.4): it is on #23 and on nothing a coworker
         reads. Saying whose eyes it is for keeps that a property of the product rather than an
         accident of which endpoint happened to carry it. -->
    <p v-if="item.reason" class="wfq-card__private">
      {{ $i('wfq_reason_private') }}
    </p>

    <p v-if="exchangeLine" class="wfq-card__detail">
      {{ exchangeLine }}
    </p>
    <p v-if="availabilityLine" class="wfq-card__detail">
      {{ availabilityLine }}
    </p>

    <!-- The collision probe, said in whichever of its three states is true. "We could not check" is a
         separate sentence from "nothing collides" and never renders as the latter. -->
    <p v-if="collisionLine" class="wfq-card__collision" :class="'wfq-card__collision--' + collision.state">
      {{ collisionLine }}
    </p>

    <!-- A refused decision, said in full and IN PLACE, with the manager's note still in the field
         below it. Only the stale case offers the re-read button: it is the one refusal whose answer
         can change, and re-reading is a deliberate act rather than something that happens to them. -->
    <div v-if="conflict" class="wfq-card__conflict" :class="{ 'wfq-card__conflict--stale': isStale }">
      <strong>{{ $i(conflictTitleKey) }}</strong>
      <span>{{ $i(conflictMessageKey) }}</span>
      <button v-if="isStale" class="wfq-card__btn" :disabled="busy" @click="$emit('refetch')">
        {{ $i('wfq_stale_reload') }}
      </button>
    </div>

    <div v-if="canDecide" class="wfq-card__decide">
      <label class="wfq-card__notefield">
        <span class="wfq-card__notelabel">{{ $i('wfq_note_label') }}</span>
        <input
          :value="note"
          type="text"
          :disabled="busy"
          :placeholder="$i('wfq_note_placeholder')"
          @input="$emit('note', { requestId: item.requestId, value: $event.target.value })"
        >
      </label>

      <div class="wfq-card__actions">
        <button class="wfq-card__btn" :disabled="busy" @click="$emit('approve')">
          {{ busy ? $i('wfq_sending') : $i(approveKey) }}
        </button>
        <button class="wfq-card__btn wfq-card__btn--deny" :disabled="busy" @click="$emit('reject')">
          {{ busy ? $i('wfq_sending') : $i(rejectKey) }}
        </button>
      </div>

      <p v-if="isContested" class="wfq-card__contest">
        {{ $i('wfq_award_closes_others', { count: contestSize - 1 }) }}
      </p>
    </div>

    <p v-else class="wfq-card__blocked">
      {{ $i(blockedKey) }}
    </p>
  </li>
</template>

<script>
import {
  BLOCK_NO_REVISION,
  COLLISION_NONE,
  COLLISION_PUBLISHED,
  COLLISION_UNKNOWN,
  KIND_AVAILABILITY_EXCEPTION,
  KIND_EXCHANGE,
  KIND_OPEN_SHIFT_REQUEST,
  KIND_TIME_OFF,
  OUTCOME_STALE,
  BLOCK_NONE,
  decisionBlock,
  kindLabelKey,
  outcomeMessageKey,
  stateLabelKey
} from '~/utils/workforce/requests-inbox';
import { formatBusinessDate, formatWallClock, timeZoneIsKnown } from '~/utils/workforce-me/shift-view';

// One row of the manager decision inbox (#23), with the decision (#24) attached to it.
//
// The formatting helpers are imported from the worker surface rather than reimplemented: they are
// where the rule "a bare wire stamp is UTC, not browser-local" lives, and a second copy of that rule
// on the manager side is exactly the kind of divergence that shows two managers different times for
// the same shift.
export default {
  name: 'WorkforceRequestCard',
  props: {
    item: { type: Object, required: true },
    // The store zone. Null when the context read failed — the card then labels its times UTC rather
    // than silently rendering the manager's own zone as if it were the venue's.
    timeZoneId: { type: String, default: null },
    locale: { type: String, default: 'nb-NO' },
    // `{ state, shifts }` from `publishedCollision`, or null for a family the probe does not cover.
    collision: { type: Object, default: null },
    // The manager's typed decision note. Owned by the page so it survives a refused write.
    note: { type: String, default: '' },
    // The last refusal for THIS row, as an outcome token, or null.
    conflict: { type: String, default: null },
    busy: { type: Boolean, default: false },
    // How many candidacies compete for this row's shift. 1 (or 0) means nothing is being closed.
    contestSize: { type: Number, default: 0 }
  },
  computed: {
    personName () {
      return this.item.staffDisplayName || this.$i('wfq_person_unknown');
    },
    kindKey () {
      return kindLabelKey(this.item.kind);
    },
    stateKey () {
      return stateLabelKey(this.item.state);
    },
    zoneKnown () {
      return timeZoneIsKnown(this.timeZoneId);
    },
    dateLabel () {
      const from = String(this.item.localStartDate || '').slice(0, 10);
      const to = String(this.item.localEndDate || '').slice(0, 10);
      if (!from) { return ''; }
      const start = formatBusinessDate(from, this.locale);
      return !to || to === from ? start : start + ' – ' + formatBusinessDate(to, this.locale);
    },
    clockLabel () {
      return formatWallClock(this.item.startsUtc, this.timeZoneId, this.locale) +
        '–' + formatWallClock(this.item.endsUtc, this.timeZoneId, this.locale);
    },

    // The exchange families carry a kind the manager needs: giving a shift away, swapping two named
    // shifts and asking for an unassigned one are three different decisions.
    exchangeLine () {
      if (this.item.kind !== KIND_EXCHANGE && this.item.kind !== KIND_OPEN_SHIFT_REQUEST) { return ''; }
      switch (this.item.exchangeKind) {
      case 'GiveAway': return this.$i('wfq_exchange_giveaway');
      case 'DirectSwap': return this.$i('wfq_exchange_directswap');
      case 'OpenPool': return this.$i('wfq_exchange_openpool');
      case 'OpenShiftRequest': return this.$i('wfq_exchange_openshift');
      default: return this.$i('wfq_exchange_unknown');
      }
    },
    availabilityLine () {
      if (this.item.kind !== KIND_AVAILABILITY_EXCEPTION) { return ''; }
      switch (this.item.availabilityKind) {
      case 'Unavailable': return this.$i('wfq_availability_unavailable');
      case 'Preferred': return this.$i('wfq_availability_preferred');
      case 'Available': return this.$i('wfq_availability_available');
      default: return this.$i('wfq_availability_unknown');
      }
    },

    collisionLine () {
      if (!this.collision) { return ''; }
      switch (this.collision.state) {
      case COLLISION_PUBLISHED:
        return this.collision.shifts.length === 1
          ? this.$i('wfq_collision_one')
          : this.$i('wfq_collision_many', { count: this.collision.shifts.length });
      case COLLISION_NONE: return this.$i('wfq_collision_none');
      case COLLISION_UNKNOWN: return this.$i('wfq_collision_unknown');
      default: return '';
      }
    },

    block () {
      return decisionBlock(this.item);
    },
    canDecide () {
      return this.block === BLOCK_NONE;
    },
    blockedKey () {
      if (this.block === BLOCK_NO_REVISION) { return 'wfq_blocked_no_revision'; }
      return this.item.kind === KIND_AVAILABILITY_EXCEPTION
        ? 'wfq_blocked_informational'
        : 'wfq_blocked_closed';
    },

    // "Approve/Deny" for leave, "Award/Pass over" for a shift: awarding is not approving a request,
    // it is choosing one person out of several, and the verb has to say so.
    approveKey () {
      return this.item.kind === KIND_TIME_OFF ? 'wfq_approve' : 'wfq_award';
    },
    rejectKey () {
      return this.item.kind === KIND_TIME_OFF ? 'wfq_reject' : 'wfq_pass_over';
    },

    isContested () {
      return this.contestSize > 1;
    },
    isStale () {
      return this.conflict === OUTCOME_STALE;
    },
    conflictTitleKey () {
      return this.isStale ? 'wfq_stale_title' : 'wfq_conflict_title';
    },
    conflictMessageKey () {
      return outcomeMessageKey(this.conflict);
    }
  }
};
</script>

<style scoped>
.wfq-card {
  list-style: none;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 12px;
}

.wfq-card--decidable {
  border-left: 4px solid #1bb776;
}

.wfq-card--closed {
  background: #fafbfc;
}

.wfq-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.wfq-card__name {
  display: block;
  font-size: 1.05em;
  font-weight: 600;
  color: #292c34;
}

.wfq-card__when {
  font-size: 0.88em;
  color: #64748b;
  text-transform: capitalize;
}

.wfq-card__clock {
  margin-left: 10px;
  font-size: 0.88em;
  color: #64748b;
  font-variant-numeric: tabular-nums;
}

.wfq-card__flag {
  margin-left: 8px;
  font-size: 0.7em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #92400e;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 6px;
  padding: 2px 7px;
  white-space: nowrap;
}

.wfq-card__tags {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.wfq-card__kind,
.wfq-card__state {
  font-size: 0.72em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border-radius: 6px;
  padding: 3px 8px;
}

.wfq-card__kind {
  color: #292c34;
  background: #e2e8f0;
}

.wfq-card__kind--time-off {
  color: #159f63;
  background: rgba(27, 183, 118, 0.14);
}

.wfq-card__kind--exchange,
.wfq-card__kind--open-shift-request {
  color: #1d4ed8;
  background: rgba(29, 78, 216, 0.1);
}

.wfq-card__state {
  color: #64748b;
  background: #f1f5f9;
}

.wfq-card__reason {
  margin: 10px 0 0;
  font-size: 0.92em;
  color: #292c34;
}

.wfq-card__reasonlabel {
  font-weight: 600;
  margin-right: 6px;
}

.wfq-card__private,
.wfq-card__detail {
  margin: 4px 0 0;
  font-size: 0.82em;
  color: #94a3b8;
}

.wfq-card__collision {
  margin: 10px 0 0;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.85em;
}

.wfq-card__collision--published {
  color: #92400e;
  background: #fef3c7;
  border: 1px solid #fcd34d;
}

.wfq-card__collision--none {
  color: #64748b;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
}

.wfq-card__collision--unknown {
  color: #64748b;
  background: #fff;
  border: 1px dashed #cbd5e0;
}

.wfq-card__conflict {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 12px 0 0;
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid #ef4444;
  color: #292c34;
  font-size: 0.88em;
}

.wfq-card__conflict strong {
  color: #ef4444;
}

.wfq-card__conflict .wfq-card__btn {
  align-self: flex-start;
}

.wfq-card__decide {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #e2e8f0;
}

.wfq-card__notefield {
  display: block;
  margin-bottom: 10px;
}

.wfq-card__notelabel {
  display: block;
  margin-bottom: 6px;
  font-size: 0.78em;
  font-weight: 600;
  color: #292c34;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.wfq-card__notefield input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.92em;
  color: #292c34;
}

.wfq-card__notefield input:focus {
  outline: none;
  border-color: #1bb776;
}

.wfq-card__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.wfq-card__btn {
  min-height: 44px;
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

.wfq-card__btn:hover:not(:disabled) {
  background: #159f63;
}

.wfq-card__btn:disabled {
  background: #cbd5e0;
  cursor: not-allowed;
}

.wfq-card__btn--deny {
  background: #fff;
  color: #ef4444;
  border: 2px solid #ef4444;
}

.wfq-card__btn--deny:hover:not(:disabled) {
  background: #ef4444;
  color: #fff;
}

.wfq-card__contest {
  margin: 10px 0 0;
  font-size: 0.82em;
  color: #92400e;
}

.wfq-card__blocked {
  margin: 12px 0 0;
  font-size: 0.82em;
  color: #94a3b8;
}

@media (max-width: 768px) {
  .wfq-card {
    padding: 14px;
  }

  .wfq-card__actions .wfq-card__btn {
    flex: 1;
  }
}
</style>

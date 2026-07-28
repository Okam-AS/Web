<template>
  <li class="wfme-shift">
    <div class="wfme-shift__time">
      <span class="wfme-shift__range">{{ range }}</span>
      <span v-if="overnight" class="wfme-shift__flag">{{ $i('wfme_overnight') }}</span>
      <span v-if="!zoneKnown" class="wfme-shift__flag wfme-shift__flag--warn">{{ $i('wfme_zone_unknown') }}</span>
    </div>

    <div class="wfme-shift__body">
      <span v-if="shift.roleName" class="wfme-shift__role">{{ shift.roleName }}</span>
      <span v-else class="wfme-shift__role wfme-shift__role--none">{{ $i('wfme_role_none') }}</span>

      <!-- Rendered only when it is known. An unknown duration shows nothing rather than "0m". -->
      <span v-if="paid" class="wfme-shift__paid">{{ $i('wfme_paid_time', { time: paid }) }}</span>
    </div>

    <p v-if="shift.note" class="wfme-shift__note">
      {{ shift.note }}
    </p>

    <p class="wfme-shift__provenance">
      {{ $i('wfme_from_publication', { number: shift.publicationNumber }) }}
    </p>
  </li>
</template>

<script>
import { crossesMidnight, formatMinutes, formatShiftRange, paidMinutes, timeZoneIsKnown } from '~/utils/workforce-me/shift-view';

// One published shift on the worker's own schedule (#33). Read-only: a published assignment is
// immutable, and nothing a worker does from this card could change it in place.
export default {
  name: 'WorkforceShiftCard',
  props: {
    shift: { type: Object, required: true },
    locale: { type: String, default: 'nb-NO' }
  },
  computed: {
    range () {
      return formatShiftRange(this.shift, this.locale);
    },
    // Null when either instant is missing — the template then renders nothing at all.
    paid () {
      return formatMinutes(paidMinutes(this.shift));
    },
    overnight () {
      return crossesMidnight(this.shift, this.locale);
    },
    // False means the times above are UTC, not the store's wall clock, and the card says so rather
    // than showing a plausible wrong number.
    zoneKnown () {
      return timeZoneIsKnown(this.shift.timeZoneId);
    }
  }
};
</script>

<style scoped>
.wfme-shift {
  list-style: none;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #1bb776;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 10px;
}

.wfme-shift__time {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}

.wfme-shift__range {
  font-size: 1.25em;
  font-weight: 600;
  color: #292c34;
  font-variant-numeric: tabular-nums;
}

.wfme-shift__flag {
  font-size: 0.72em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #64748b;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 2px 7px;
}

.wfme-shift__flag--warn {
  color: #92400e;
  background: #fef3c7;
  border-color: #fcd34d;
}

.wfme-shift__body {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
}

.wfme-shift__role {
  font-size: 0.95em;
  color: #292c34;
}

.wfme-shift__role--none {
  color: #94a3b8;
  font-style: italic;
}

.wfme-shift__paid {
  font-size: 0.85em;
  color: #64748b;
}

.wfme-shift__note {
  margin: 8px 0 0;
  font-size: 0.88em;
  color: #64748b;
}

.wfme-shift__provenance {
  margin: 8px 0 0;
  font-size: 0.75em;
  color: #94a3b8;
}

@media (max-width: 768px) {
  .wfme-shift {
    padding: 12px 14px;
  }
}
</style>

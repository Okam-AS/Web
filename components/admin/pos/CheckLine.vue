<template>
  <div class="check-line" :class="{ 'check-line--ready': isReady }">
    <div class="check-line__qty">
      <button type="button" class="check-line__qtybtn" @click.stop="$emit('dec', group)">
        −
      </button>
      <span class="check-line__qtyval">{{ group.quantity }}</span>
      <button type="button" class="check-line__qtybtn" @click.stop="$emit('inc', group)">
        +
      </button>
    </div>

    <div class="check-line__body">
      <div class="check-line__top">
        <span class="check-line__name">{{ group.name }}</span>
        <span class="check-line__amount">{{ priceLabel(group.lineAmount) }}</span>
      </div>

      <div v-if="group.options.length" class="check-line__options">
        <span v-for="(o, i) in group.options" :key="i" class="check-line__option">{{ optionLabel(o) }}</span>
      </div>

      <div v-if="showTags" class="check-line__tags">
        <span v-if="group.depositAmount > 0" class="check-line__tag check-line__tag--deposit">{{ $i('pos_deposit') }}</span>
        <template v-if="coursing">
          <span v-if="group.courseSequence" class="check-line__tag">{{ $i('pos_course') }} {{ group.courseSequence }}</span>
          <span v-if="statusLabel" class="check-line__tag" :class="statusClass">{{ statusLabel }}</span>
        </template>
        <!-- Guest tag: who the line belongs to. Tappable to (re)assign; a ghost "+ Gjest" invites
             tagging when the line is still shared. Stop propagation so it doesn't toggle row select. -->
        <template v-if="seating">
          <button
            v-if="group.seatNumber != null"
            type="button"
            class="check-line__tag check-line__tag--seat"
            @click.stop="$emit('seat', group)"
          >
            {{ $i('pos_seat_num', { n: group.seatNumber }) }}
          </button>
          <button
            v-else
            type="button"
            class="check-line__tag check-line__tag--seat-add"
            @click.stop="$emit('seat', group)"
          >
            {{ $i('pos_seat_add') }}
          </button>
        </template>
      </div>

      <p v-if="group.notes" class="check-line__notes">
        {{ group.notes }}
      </p>
      <p v-if="group.discountAmount > 0" class="check-line__discount">
        {{ group.discountReason || $i('pos_discount') }}: {{ negatedPriceLabel(group.discountAmount) }}
        <button type="button" class="check-line__discount-remove" :title="$i('pos_remove_discount')" @click.stop="$emit('line-remove-discount', group)">×</button>
      </p>

      <!-- Mark a fired/ready line as served. Kitchen-ready lines get the celebratory green button;
           you cannot serve a line that has not at least been fired. -->
      <div v-if="canServe" class="check-line__serve-row">
        <button
          type="button"
          class="check-line__serve"
          :class="{ 'check-line__serve--ready': isReady }"
          @click.stop="$emit('serve', group)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M5 13l4 4L19 7" /></svg>
          <span>{{ $i('pos_serve') }}</span>
        </button>
      </div>
    </div>

    <div class="check-line__actions">
      <button
        type="button"
        class="check-line__disc-btn"
        :class="{ 'check-line__disc-btn--set': group.discountAmount > 0 }"
        :title="$i('pos_discount')"
        @click.stop="$emit('line-discount', group)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" /></svg>
      </button>
      <button
        type="button"
        class="check-line__note-btn"
        :class="{ 'check-line__note-btn--set': !!group.notes }"
        :title="$i('pos_note_title')"
        @click.stop="$emit('note', group)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
      </button>
      <button type="button" class="check-line__remove" :title="$i('pos_remove_line')" @click.stop="$emit('remove', group)">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  </div>
</template>

<script>
// One grouped row in the open check. Because the backend never merges lines, the panel groups
// identical lines and shows the combined quantity; +/- add or remove one member line.
//
// The discount line prints its sign through `negatedAmountLabel` rather than as a template literal in
// front of the interpolation. `−{{ priceLabel(x) }}` puts the minus outside the interpolation, where
// no absence rule in this repo can see it, and an amount the rule withholds composes to `−—`. The
// `> 0` guard on the row hides the ordinary absences before they get that far, but it is a relational
// test rather than the absence rule and the two disagree on `Infinity`; the sign belongs to the label
// regardless, which is the only place that knows whether there is a figure to attach it to.
import { negatedAmountLabel } from '~/utils/price';

export default {
  name: 'CheckLine',
  props: {
    group: { type: Object, required: true },
    // Table checks course their lines; quick sales do not, so line status and course tags are
    // hidden there (build -> pay, no kitchen round).
    coursing: { type: Boolean, default: false },
    // Guest (seat) tagging in play: renders the per-line guest tag (assigned or a ghost "+ Gjest").
    seating: { type: Boolean, default: false }
  },
  computed: {
    // A "Ny" line is not yet sent to the kitchen; "Sendt" confirms it is on the kitchen screen;
    // Fired / Ready / Served track the coursing progression from there.
    statusLabel () {
      const map = {
        Pending: this.$i('pos_line_new'),
        Sent: this.$i('pos_line_sent'),
        Fired: this.$i('pos_line_fired'),
        Ready: this.$i('pos_line_ready'),
        Served: this.$i('pos_line_served')
      };
      return map[this.group.status] || '';
    },
    statusClass () {
      return this.group.status ? 'check-line__tag--' + String(this.group.status).toLowerCase() : '';
    },
    // The deposit tag always shows; the course / status tags only on a coursing (table) check; the
    // guest tag (assigned or the ghost affordance) whenever seating is in play.
    showTags () {
      return this.group.depositAmount > 0 || this.coursing || this.seating;
    },
    // The kitchen has finished this line (bumped Ready) — highlight it so a server notices at a
    // glance that it is ready to run.
    isReady () {
      return this.coursing && this.group.status === 'Ready';
    },
    // "Servert" is only offered once the line has at least been fired to the kitchen (Fired or
    // Ready); you cannot serve food that has not been cooked.
    canServe () {
      return this.coursing && (this.group.status === 'Fired' || this.group.status === 'Ready');
    }
  },
  methods: {
    // The sign is resolved from the negated value and the magnitude alone goes to the formatter —
    // core's `priceLabel` renders -4 as "kr 0,-4" and -50 as "kr -,50". See `negatedAmountLabel`.
    negatedPriceLabel (amountMinor) {
      return negatedAmountLabel(amountMinor, this.priceLabel);
    },
    optionLabel (o) {
      return o.parentName ? o.parentName + ': ' + o.name : o.name;
    }
  }
};
</script>

<style scoped>
.check-line {
  display: flex;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
  align-items: flex-start;
}
/* Kitchen-ready line: a calm celebratory green accent so a server spots it instantly. */
.check-line--ready {
  background: rgba(27, 183, 118, 0.07);
  box-shadow: inset 3px 0 0 var(--pos-primary, #1bb776);
  border-radius: 0 8px 8px 0;
  padding-left: 8px;
}

.check-line__qty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
/* The most-tapped control on the screen; 44px per the admin touch-target guideline. */
.check-line__qtybtn {
  width: 44px;
  height: 44px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--pos-ink, #292c34);
  cursor: pointer;
  line-height: 1;
}
.check-line__qtybtn:active { background: #e2e8f0; }
.check-line__qtyval { font-weight: 700; font-size: 0.95rem; min-width: 24px; text-align: center; }

.check-line__body { flex: 1; min-width: 0; }
.check-line__top { display: flex; justify-content: space-between; gap: 8px; }
.check-line__name { font-weight: 600; color: var(--pos-ink, #292c34); }
.check-line__amount { font-weight: 700; color: var(--pos-ink, #292c34); white-space: nowrap; }

.check-line__options { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 2px; }
.check-line__option { font-size: 0.8rem; color: #64748b; }

.check-line__tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.check-line__tag {
  font-size: 0.66rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 5px;
  background: #f1f5f9;
  color: #64748b;
}
.check-line__tag--deposit { background: rgba(59, 130, 246, 0.12); color: #2563eb; }
/* Guest tag uses the blue "who" family (like deposit) so it never reads as a kitchen state.
   Rendered as a button because it is tappable to reassign the line's guest. */
.check-line__tag--seat { background: rgba(59, 130, 246, 0.12); color: #2563eb; border: 1px solid rgba(59, 130, 246, 0.28); cursor: pointer; font-family: inherit; line-height: 1.2; }
.check-line__tag--seat:hover { background: rgba(59, 130, 246, 0.2); }
/* Ghost affordance inviting the operator to tag an as-yet-shared line. */
.check-line__tag--seat-add { background: transparent; color: #94a3b8; border: 1px dashed #cbd5e0; cursor: pointer; font-family: inherit; line-height: 1.2; }
.check-line__tag--seat-add:hover { border-color: #2563eb; color: #2563eb; }
/* "Ny": a calm but clear green marker for a line not yet sent to the kitchen. */
.check-line__tag--pending { background: rgba(27, 183, 118, 0.14); color: #159f63; }
/* "Sendt": muted with a check, confirming the line is on the kitchen screen. */
.check-line__tag--sent { background: #f1f5f9; color: #94a3b8; }
.check-line__tag--sent::before { content: '✓'; margin-right: 3px; }
.check-line__tag--fired { background: rgba(217, 119, 6, 0.14); color: #b45309; }
.check-line__tag--ready { background: rgba(27, 183, 118, 0.14); color: #159f63; }
.check-line__tag--served { background: rgba(100, 116, 139, 0.14); color: #475569; }

.check-line__notes { font-size: 0.8rem; color: #d97706; margin: 4px 0 0; font-style: italic; }
.check-line__discount { font-size: 0.8rem; color: #ef4444; margin: 4px 0 0; font-weight: 600; }

.check-line__serve-row { margin-top: 8px; }
.check-line__serve {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #cbd5e0;
  background: #ffffff;
  color: #475569;
  font-weight: 700;
  font-size: 0.78rem;
  padding: 5px 12px;
  border-radius: 8px;
  cursor: pointer;
}
.check-line__serve:hover { border-color: var(--pos-primary, #1bb776); color: var(--pos-primary-dark, #159f63); }
.check-line__serve svg { width: 15px; height: 15px; }
/* Ready lines get the filled, celebratory serve button; fired-but-not-ready stays understated. */
.check-line__serve--ready {
  border-color: var(--pos-primary, #1bb776);
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
}
.check-line__serve--ready:hover { background: var(--pos-primary-dark, #159f63); color: #ffffff; }

/* 2x2 grid of 44px targets rather than a column of 22px icons 6px apart. Delete sits in the
   bottom-right cell, diagonally opposite the note pencil it used to be mistaken for; the empty
   bottom-left cell is what buys that separation. The block is 88px tall, so it fits inside the
   row height the quantity stepper already sets. */
.check-line__actions {
  display: grid;
  grid-template-columns: 44px 44px;
  grid-template-rows: 44px 44px;
  flex-shrink: 0;
}
.check-line__disc-btn { grid-area: 1 / 1; }
.check-line__note-btn { grid-area: 1 / 2; }
.check-line__remove { grid-area: 2 / 2; }

.check-line__actions > button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 10px;
  background: none;
  cursor: pointer;
}
.check-line__actions > button:active { background: #f1f5f9; }

.check-line__note-btn {
  color: #cbd5e0;
}
.check-line__note-btn:hover { color: var(--pos-primary-dark, #159f63); }
/* A line that already carries a note gets a filled-in pencil so it reads at a glance. */
.check-line__note-btn--set { color: #d97706; }
.check-line__note-btn--set:hover { color: #b45309; }
.check-line__note-btn svg { width: 18px; height: 18px; }

.check-line__remove { color: #cbd5e0; }
.check-line__remove:hover { color: #ef4444; }
.check-line__remove:active { background: #fef2f2; }
.check-line__remove svg { width: 20px; height: 20px; }

.check-line__disc-btn { color: #cbd5e0; }
.check-line__disc-btn:hover { color: var(--pos-primary-dark, #159f63); }
/* A line that already carries a discount gets a filled-in tag so it reads at a glance. */
.check-line__disc-btn--set { color: #ef4444; }
.check-line__disc-btn--set:hover { color: #dc2626; }
.check-line__disc-btn svg { width: 18px; height: 18px; }

.check-line__discount-remove { border: none; background: none; color: #ef4444; font-size: 1.05rem; line-height: 1; cursor: pointer; padding: 0 4px; vertical-align: middle; }
</style>

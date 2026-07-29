<template>
  <div class="check-line" :class="{ 'check-line--ready': isReady, 'is-selected': selected }">
    <!-- The whole row is the target. Tapping it selects the line and opens its actions underneath,
         which is the only place they exist: a row of 20px icons sitting permanently beside every
         line meant the destructive ones (− on a row of 1, the bin) were one mis-tap away at all
         times, on a screen operated at speed with a thumb. -->
    <button type="button" class="check-line__row" :aria-expanded="selected" @click="$emit('select', group)">
      <span class="check-line__qty">{{ group.quantity }}</span>

      <span class="check-line__body">
        <span class="check-line__top">
          <span class="check-line__name">{{ group.name }}</span>
          <span class="check-line__amount">{{ priceLabel(group.lineAmount) }}</span>
        </span>

        <span v-if="group.options.length" class="check-line__options">
          <span v-for="(o, i) in group.options" :key="i" class="check-line__option">{{ optionLabel(o) }}</span>
        </span>

        <span v-if="showTags" class="check-line__tags">
          <span v-if="group.depositAmount > 0" class="check-line__tag check-line__tag--deposit">{{ $i('pos_deposit') }}</span>
          <span v-if="coursing && group.courseSequence" class="check-line__tag">{{ $i('pos_course') }} {{ group.courseSequence }}</span>
          <span v-if="showStatus" class="check-line__tag" :class="statusClass">{{ statusLabel }}</span>
          <!-- Read-only now: assigning a guest is a button in the action panel, so the tag is
               information rather than a second tiny target inside the row's own target. -->
          <span
            v-if="seating"
            class="check-line__tag"
            :class="group.seatNumber != null ? 'check-line__tag--seat' : 'check-line__tag--seat-add'"
          >{{ group.seatNumber != null ? $i('pos_seat_num', { n: group.seatNumber }) : $i('pos_seat_add') }}</span>
        </span>

        <span v-if="group.notes" class="check-line__notes">{{ group.notes }}</span>
        <span v-if="group.discountAmount > 0" class="check-line__discount">
          {{ group.discountReason || $i('pos_discount') }}: −{{ priceLabel(group.discountAmount) }}
        </span>
      </span>
    </button>

    <!-- Serving is kitchen flow, not bill editing: it stays out in the open (only on a line the
         kitchen has fired or bumped) so running food never costs a select first. -->
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

    <div v-if="selected" class="check-line__panel">
      <!-- One unit less / more, and the count itself opens the pad for anything bigger. All three
           are full-height targets — the stepper is what the operator reaches for most. -->
      <div class="check-line__stepper">
        <button type="button" class="check-line__step" :aria-label="$i('pos_quantity_less')" @click.stop="$emit('dec', group)">
          −
        </button>
        <button type="button" class="check-line__count" @click.stop="$emit('quantity', group)">
          <span class="check-line__count-num">{{ group.quantity }}</span>
          <span class="check-line__count-label">{{ $i('pos_quantity_title') }}</span>
        </button>
        <button type="button" class="check-line__step" :aria-label="$i('pos_quantity_more')" @click.stop="$emit('inc', group)">
          +
        </button>
      </div>

      <div class="check-line__acts">
        <button type="button" class="check-line__act" @click.stop="$emit('line-discount', group)">
          {{ $i('pos_discount') }}
        </button>
        <button
          v-if="isDiscounted"
          type="button"
          class="check-line__act"
          @click.stop="$emit('line-remove-discount', group)"
        >
          {{ $i('pos_remove_discount') }}
        </button>
        <button type="button" class="check-line__act" :class="{ 'is-set': !!group.notes }" @click.stop="$emit('note', group)">
          {{ $i('pos_note_title') }}
        </button>
        <button v-if="seating" type="button" class="check-line__act" @click.stop="$emit('seat', group)">
          {{ $i('pos_line_guest') }}
        </button>
        <button type="button" class="check-line__act check-line__act--danger" @click.stop="$emit('remove', group)">
          {{ $i('pos_remove_line') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
// One grouped row in the open check. Because the backend never merges lines, the panel groups
// identical lines and shows the combined quantity; the stepper adds or removes one member line.
//
// Selection model: at rest a row is only information plus one large tap target. Selecting it reveals
// the actions that change it. That is what keeps the destructive ones (remove line, − on a row of
// one) behind a deliberate second tap instead of scattering 20px icons across a screen worked at
// speed — and it is what lets every remaining control be a real touch target.
export default {
  name: 'CheckLine',
  props: {
    group: { type: Object, required: true },
    // The row the operator has selected: its action panel is open. Owned by the panel above, so
    // only ever one row at a time.
    selected: { type: Boolean, default: false },
    // Table checks course their lines; quick sales do not, so line status and course tags are
    // hidden there (build -> pay, no kitchen round).
    coursing: { type: Boolean, default: false },
    // Guest (seat) tagging in play: renders the per-line guest tag and the Gjest action.
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
    // Ny / Sendt / Fyrt / Klar / Servert belongs to lines the kitchen actually sees, not to lines
    // that happen to sit on a table check. A drink can never leave "Ny", so wearing the tag made it
    // look stuck; a counter-sale burger does go to the kitchen, so it earns the tag even with no
    // table. kitchenPrintEnabled is resolved server-side, the same source the send button counts.
    // A reason with no amount is still a discount: a campaign that happens to come to 0 kr on this
    // row is what the quantity pad refuses to raise, so "Fjern rabatt" has to be offered for it too
    // — otherwise the pad tells the operator to remove a discount that has no button.
    isDiscounted () {
      return this.group.discountAmount > 0 || !!this.group.discountReason;
    },
    // Only an explicit false hides the tag: a line that never told us either way keeps the status
    // it always had, rather than losing Ny/Sendt/Klar (and with it Serve) without a word.
    showStatus () {
      return this.group.kitchenPrintEnabled !== false && !!this.statusLabel;
    },
    // The deposit tag always shows; the course tag only on a coursing (table) check; the status tag
    // on kitchen-bound lines; the guest tag (assigned or the ghost placeholder) whenever seating is
    // in play.
    showTags () {
      return this.group.depositAmount > 0 || this.showStatus ||
        (this.coursing && !!this.group.courseSequence) || this.seating;
    },
    // The kitchen has finished this line (bumped Ready) — highlight it so a server notices at a
    // glance that it is ready to run.
    isReady () {
      return this.showStatus && this.group.status === 'Ready';
    },
    // "Servert" is only offered once the line has at least been fired to the kitchen (Fired or
    // Ready); you cannot serve food that has not been cooked.
    canServe () {
      return this.showStatus && (this.group.status === 'Fired' || this.group.status === 'Ready');
    }
  },
  methods: {
    optionLabel (o) {
      return o.parentName ? o.parentName + ': ' + o.name : o.name;
    }
  }
};
</script>

<style scoped>
.check-line {
  border-bottom: 1px solid #f1f5f9;
}
/* Kitchen-ready line: a calm celebratory green accent so a server spots it instantly. */
.check-line--ready {
  background: rgba(27, 183, 118, 0.07);
  box-shadow: inset 3px 0 0 var(--pos-primary, #1bb776);
  border-radius: 0 8px 8px 0;
}
/* Selected: lifted off the list so it is obvious which row the actions below belong to. */
.check-line.is-selected {
  background: #f8fafc;
  box-shadow: inset 3px 0 0 var(--pos-ink, #292c34);
  border-radius: 0 8px 8px 0;
}
.check-line--ready.is-selected { box-shadow: inset 3px 0 0 var(--pos-primary, #1bb776); }

/* The row: one target, the full width of the panel, never below the 44px touch minimum. */
.check-line__row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  min-height: 56px;
  padding: 12px 8px;
  border: none;
  background: none;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.check-line__row:active { background: rgba(15, 23, 42, 0.05); }

/* The count is a badge now, not a control — the controls live in the panel below. */
.check-line__qty {
  flex-shrink: 0;
  min-width: 34px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  border-radius: 8px;
  background: #eef2f7;
  color: var(--pos-ink, #292c34);
  font-weight: 800;
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
}
.check-line.is-selected .check-line__qty { background: var(--pos-ink, #292c34); color: #ffffff; }

.check-line__body { flex: 1; min-width: 0; display: block; }
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
/* Guest tag uses the blue "who" family (like deposit) so it never reads as a kitchen state. */
.check-line__tag--seat { background: rgba(59, 130, 246, 0.12); color: #2563eb; }
/* Untagged line: a ghost placeholder that says the guest is still shared. */
.check-line__tag--seat-add { background: transparent; color: #94a3b8; border: 1px dashed #cbd5e0; }
/* "Ny": a calm but clear green marker for a line not yet sent to the kitchen. */
.check-line__tag--pending { background: rgba(27, 183, 118, 0.14); color: #159f63; }
/* "Sendt": muted with a check, confirming the line is on the kitchen screen. */
.check-line__tag--sent { background: #f1f5f9; color: #94a3b8; }
.check-line__tag--sent::before { content: '✓'; margin-right: 3px; }
.check-line__tag--fired { background: rgba(217, 119, 6, 0.14); color: #b45309; }
.check-line__tag--ready { background: rgba(27, 183, 118, 0.14); color: #159f63; }
.check-line__tag--served { background: rgba(100, 116, 139, 0.14); color: #475569; }

.check-line__notes { display: block; font-size: 0.8rem; color: #d97706; margin-top: 4px; font-style: italic; }
.check-line__discount { display: block; font-size: 0.8rem; color: #ef4444; margin-top: 4px; font-weight: 600; }

.check-line__serve-row { padding: 0 8px 10px 52px; }
.check-line__serve {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid #cbd5e0;
  border-radius: 10px;
  background: #ffffff;
  color: #475569;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
}
.check-line__serve:hover { border-color: var(--pos-primary, #1bb776); color: var(--pos-primary-dark, #159f63); }
.check-line__serve svg { width: 17px; height: 17px; }
/* Ready lines get the filled, celebratory serve button; fired-but-not-ready stays understated. */
.check-line__serve--ready {
  border-color: var(--pos-primary, #1bb776);
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
}
.check-line__serve--ready:hover { background: var(--pos-primary-dark, #159f63); color: #ffffff; }

/* The action panel: everything that changes this line, at a size a thumb can hit. */
.check-line__panel { padding: 0 8px 12px; }

.check-line__stepper {
  display: grid;
  grid-template-columns: 1fr 1.4fr 1fr;
  gap: 8px;
  margin-bottom: 8px;
}
.check-line__step,
.check-line__count {
  min-height: 52px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  color: var(--pos-ink, #292c34);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}
.check-line__step { font-size: 1.5rem; line-height: 1; }
.check-line__step:active { background: #e2e8f0; }
.check-line__count {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
}
.check-line__count:active { background: #e2e8f0; }
.check-line__count-num { font-size: 1.15rem; font-variant-numeric: tabular-nums; }
.check-line__count-label { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #64748b; }

.check-line__acts { display: flex; flex-wrap: wrap; gap: 8px; }
.check-line__act {
  flex: 1 1 calc(50% - 4px);
  min-height: 48px;
  padding: 0 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  color: #475569;
  font: inherit;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
}
.check-line__act:active { background: #f1f5f9; }
/* A line that already carries a note says so on the button rather than in a filled-in icon. */
.check-line__act.is-set { border-color: #d97706; color: #b45309; }
/* Delete keeps its own full-width row at the end, so it is never adjacent to a routine action. */
.check-line__act--danger {
  flex-basis: 100%;
  border-color: #fecaca;
  color: #dc2626;
}
.check-line__act--danger:active { background: #fef2f2; }
</style>

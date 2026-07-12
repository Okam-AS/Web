<template>
  <div class="check-line" :class="{ 'check-line--ready': isReady }">
    <div class="check-line__qty">
      <button type="button" class="check-line__qtybtn" @click="$emit('dec', group)">
        −
      </button>
      <span class="check-line__qtyval">{{ group.quantity }}</span>
      <button type="button" class="check-line__qtybtn" @click="$emit('inc', group)">
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
      </div>

      <p v-if="group.notes" class="check-line__notes">
        {{ group.notes }}
      </p>
      <p v-if="group.discountAmount > 0" class="check-line__discount">
        {{ group.discountReason || $i('pos_discount') }}: −{{ priceLabel(group.discountAmount) }}
      </p>

      <!-- Mark a fired/ready line as served. Kitchen-ready lines get the celebratory green button;
           you cannot serve a line that has not at least been fired. -->
      <div v-if="canServe" class="check-line__serve-row">
        <button
          type="button"
          class="check-line__serve"
          :class="{ 'check-line__serve--ready': isReady }"
          @click="$emit('serve', group)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M5 13l4 4L19 7" /></svg>
          <span>{{ $i('pos_serve') }}</span>
        </button>
      </div>
    </div>

    <div class="check-line__actions">
      <button
        type="button"
        class="check-line__note-btn"
        :class="{ 'check-line__note-btn--set': !!group.notes }"
        :title="$i('pos_note_title')"
        @click="$emit('note', group)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
      </button>
      <button type="button" class="check-line__remove" :title="$i('pos_remove_line')" @click="$emit('remove', group)">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  </div>
</template>

<script>
// One grouped row in the open check. Because the backend never merges lines, the panel groups
// identical lines and shows the combined quantity; +/- add or remove one member line.
export default {
  name: 'CheckLine',
  props: {
    group: { type: Object, required: true },
    // Table checks course their lines; quick sales do not, so line status and course tags are
    // hidden there (build -> pay, no kitchen round).
    coursing: { type: Boolean, default: false }
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
    // The deposit tag always shows; the course / status tags only on a coursing (table) check.
    showTags () {
      return this.group.depositAmount > 0 || this.coursing;
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
.check-line__qtybtn {
  width: 32px;
  height: 32px;
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

.check-line__actions { display: flex; flex-direction: column; align-items: center; gap: 6px; flex-shrink: 0; }
.check-line__note-btn {
  border: none;
  background: none;
  color: #cbd5e0;
  cursor: pointer;
  padding: 2px;
}
.check-line__note-btn:hover { color: var(--pos-primary-dark, #159f63); }
/* A line that already carries a note gets a filled-in pencil so it reads at a glance. */
.check-line__note-btn--set { color: #d97706; }
.check-line__note-btn--set:hover { color: #b45309; }
.check-line__note-btn svg { width: 18px; height: 18px; }

.check-line__remove {
  border: none;
  background: none;
  color: #cbd5e0;
  cursor: pointer;
  padding: 2px;
}
.check-line__remove:hover { color: #ef4444; }
.check-line__remove svg { width: 18px; height: 18px; }
</style>

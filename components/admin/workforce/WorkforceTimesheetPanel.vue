<template>
  <section class="wft-panel" data-testid="wft-panel">
    <!-- ---- the period ------------------------------------------------------------------------ -->
    <header class="wft-panel__head">
      <div>
        <h2 class="wft-panel__title">
          {{ $i('wft_period_title') }}
        </h2>
        <p class="wft-panel__range" data-testid="wft-range">
          {{ rangeLabel }}
        </p>
      </div>
      <span
        class="wft-panel__badge"
        :class="'wft-panel__badge--' + badgeTone"
        data-testid="wft-status"
      >{{ statusLabel }}</span>
    </header>

    <!-- UNKNOWN is not emptiness. Until the read answers, this says so rather than showing a period
         with no hours in it — which a manager would read as "nobody worked". -->
    <p v-if="!period" class="wft-panel__unknown" data-testid="wft-unknown">
      {{ loading ? $i('wft_loading') : $i('wft_period_unknown') }}
    </p>

    <template v-else>
      <dl class="wft-panel__facts">
        <div class="wft-panel__fact">
          <dt>{{ $i('wft_fact_paid_hours') }}</dt>
          <dd data-testid="wft-paid-hours">
            {{ formatMinutes(period.paidMinutes) }}
          </dd>
        </div>
        <div class="wft-panel__fact">
          <dt>{{ $i('wft_fact_unpaid_break') }}</dt>
          <dd data-testid="wft-unpaid-break">
            {{ formatMinutes(period.unpaidBreakMinutes) }}
          </dd>
        </div>
        <div class="wft-panel__fact">
          <dt>{{ $i('wft_fact_rows') }}</dt>
          <dd data-testid="wft-line-count">
            {{ period.lineCount }}
          </dd>
        </div>
        <div class="wft-panel__fact">
          <dt>{{ $i('wft_fact_unknown_rows') }}</dt>
          <!-- null is UNKNOWN and prints the marker; 0 is a real answer and prints 0. -->
          <dd
            data-testid="wft-incomplete-count"
            :class="{ 'wft-panel__fact-value--warn': unknownRows > 0 }"
          >
            {{ unknownRows === null ? '—' : unknownRows }}
          </dd>
        </div>
      </dl>

      <!-- ---- WHO FROZE IT. The C4 surface: an approved period is a money-bearing record and the
               actor that caused it is printed beside it, not buried in an audit table. The value is
               the approver's own staff-member reference, exactly as the server stamped it. It is NOT
               resolved to a display name: the approver need not be on this store's visible roster,
               and a page that guessed a name from an id it could not find would print the wrong
               person's name onto a payroll artifact. -->
      <div v-if="isFrozen" class="wft-panel__frozen" data-testid="wft-frozen">
        <p class="wft-panel__frozen-line">
          <strong>{{ $i('wft_frozen_by') }}</strong>
          <code data-testid="wft-approved-by">{{ period.approvedByActorReference }}</code>
        </p>
        <p class="wft-panel__frozen-line">
          <strong>{{ $i('wft_frozen_at') }}</strong>
          <span data-testid="wft-approved-at">{{ period.approvedAtUtc }}</span>
        </p>
        <p class="wft-panel__frozen-line">
          <strong>{{ $i('wft_snapshot_digest') }}</strong>
          <code class="wft-panel__digest" data-testid="wft-snapshot-sha">{{ period.snapshotSha256 }}</code>
        </p>
        <p class="wft-panel__frozen-note">
          {{ $i('wft_frozen_note') }}
        </p>
      </div>

      <!-- ---- the two acts --------------------------------------------------------------------- -->
      <div class="wft-panel__actions">
        <div class="wft-panel__act">
          <!-- The unknown-hours decision is DELIBERATE and explicit. The server refuses a freeze
               that would silently swallow rows nobody can account for, and this checkbox is the
               manager stating they know. It is only offered when there is something to decide. -->
          <label
            v-if="unknownRows > 0 && !isFrozen"
            class="wft-panel__allow"
            data-testid="wft-allow-incomplete-label"
          >
            <input
              v-model="allowIncomplete"
              type="checkbox"
              data-testid="wft-allow-incomplete"
            >
            <span>{{ $i('wft_allow_incomplete', { count: unknownRows }) }}</span>
          </label>

          <button
            class="wft-panel__button wft-panel__button--primary"
            type="button"
            :disabled="!approve.enabled || isBusy"
            data-testid="wft-approve"
            @click="$emit('approve', { allowIncomplete })"
          >
            {{ busy === 'approve' ? $i('wft_approving') : $i('wft_approve') }}
          </button>
          <p v-if="approve.reasonKey" class="wft-panel__why" data-testid="wft-approve-why">
            {{ $i(approve.reasonKey) }}
          </p>
        </div>

        <div class="wft-panel__act">
          <button
            class="wft-panel__button wft-panel__button--secondary"
            type="button"
            :disabled="!exportGate.enabled || isBusy"
            data-testid="wft-export"
            @click="$emit('export')"
          >
            {{ busy === 'export' ? $i('wft_exporting') : $i('wft_export') }}
          </button>
          <p v-if="exportGate.reasonKey" class="wft-panel__why" data-testid="wft-export-why">
            {{ $i(exportGate.reasonKey) }}
          </p>
        </div>
      </div>
    </template>
  </section>
</template>

<script>
import {
  approveAvailability, exportAvailability, formatMinutes, incompleteCount,
  STATUS_APPROVED, STATUS_EXPORTED
} from '~/utils/workforce/timesheet';

/**
 * THE PERIOD A MANAGER FREEZES, and the two acts that make it a payroll artifact.
 *
 * This component renders and emits; it decides nothing. Every gate below comes from
 * `~/utils/workforce/timesheet`, which is where the rules are testable against the contract they
 * claim to implement — a rule living in a `v-if` here could not be.
 *
 * The two buttons EMIT rather than calling. The page owns the clients and therefore owns the writes,
 * which is what keeps the actor resolution and the refusal handling in one place instead of two.
 */
export default {
  props: {
    period: { type: Object, default: null },
    /**
     * THREE-STATE, and `null` is the default on purpose. A panel nobody has told about the store's
     * export switch has not been told it is OFF, and defaulting to `false` is how the surface came
     * to print "Eksport er slått av for denne butikken." over a read that never answered. Vue skips
     * type validation for a null value on an optional prop, so the declared `Boolean` still documents
     * the two answered states.
     */
    exportEnabled: { type: Boolean, default: null },
    hasPayrollCapability: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    /** '' | 'approve' | 'export' — which write is in flight, so only that button says so. */
    busy: { type: String, default: '' }
  },
  data () {
    return { allowIncomplete: false };
  },
  computed: {
    /**
     * A REAL boolean for the two `:disabled` bindings, and the reason it cannot be `busy` itself.
     *
     * `busy` is a string ('' | 'approve' | 'export'). Vue 2 drops a boolean attribute only when the
     * value is `null`, `undefined` or `false` — an EMPTY STRING is not falsy by that rule, so
     * `:disabled="!enabled || busy"` renders `disabled=""` whenever the gate is open and nothing is
     * in flight, which is exactly when the button must work. It cost this surface its Approve
     * button: the control rendered greyed out with no reason beside it, because the gate had
     * genuinely said yes and there was no refusal to print. Caught by looking at the page, not by a
     * unit test — the gate functions were right and were passing.
     */
    isBusy () {
      return this.busy !== '';
    },
    isFrozen () {
      return !!this.period &&
        (this.period.status === STATUS_APPROVED || this.period.status === STATUS_EXPORTED);
    },
    unknownRows () {
      return incompleteCount(this.period);
    },
    statusLabel () {
      if (!this.period) { return this.$i('wft_status_unknown'); }
      return this.$i('wft_status_' + String(this.period.status).toLowerCase());
    },
    badgeTone () {
      if (!this.period) { return 'unknown'; }
      if (this.period.status === STATUS_EXPORTED) { return 'sent'; }
      if (this.period.status === STATUS_APPROVED) { return 'frozen'; }
      return 'open';
    },
    rangeLabel () {
      if (!this.period || !this.period.fromBusinessDate) { return '—'; }
      return this.period.fromBusinessDate + ' – ' + this.period.toBusinessDate;
    },
    approve () {
      return approveAvailability({
        period: this.period,
        exportEnabled: this.exportEnabled,
        hasPayrollCapability: this.hasPayrollCapability
      });
    },
    exportGate () {
      return exportAvailability({
        period: this.period,
        exportEnabled: this.exportEnabled,
        hasPayrollCapability: this.hasPayrollCapability
      });
    }
  },
  watch: {
    // A freeze must not leave the previous decision ticked: the next period a manager looks at is a
    // different one, and an inherited "yes, freeze the unknowns" is the one default nobody chose.
    period () { this.allowIncomplete = false; }
  },
  methods: { formatMinutes }
};
</script>

<style lang="scss" scoped>
.wft-panel {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  margin-top: 24px;

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
  }

  &__title {
    font-size: 1.1em;
    font-weight: 600;
    color: #292c34;
    margin: 0 0 4px 0;
  }

  &__range {
    margin: 0;
    color: #64748b;
    font-size: 0.9em;
  }

  &__badge {
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.8em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    white-space: nowrap;

    &--open { background: #e2e8f0; color: #292c34; }
    &--frozen { background: #fef3c7; color: #92400e; }
    &--sent { background: #d1fae5; color: #065f46; }
    &--unknown { background: #f1f5f9; color: #64748b; }
  }

  &__unknown {
    color: #64748b;
    font-style: italic;
    margin: 0;
  }

  &__facts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 16px;
    margin: 0 0 20px 0;
  }

  &__fact {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px;

    dt {
      font-size: 0.75em;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 4px;
    }

    dd {
      margin: 0;
      font-size: 1.05em;
      font-weight: 600;
      color: #292c34;
    }
  }

  &__fact-value--warn { color: #92400e; }

  &__frozen {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
  }

  &__frozen-line {
    margin: 0 0 8px 0;
    font-size: 0.9em;
    color: #292c34;
    // The digest is long and must not push the card wide on a narrow screen.
    overflow-wrap: anywhere;

    strong { color: #64748b; font-weight: 600; margin-right: 8px; }
    code { font-size: 0.9em; color: #292c34; }
  }

  &__digest { color: #64748b; }

  &__frozen-note {
    margin: 12px 0 0 0;
    font-size: 0.8em;
    color: #64748b;
    font-style: italic;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    align-items: flex-start;
  }

  &__act { flex: 1 1 240px; }

  &__allow {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 8px;
    cursor: pointer;
    margin-bottom: 12px;
    font-size: 0.9em;
    color: #292c34;
    transition: all 0.3s ease;

    &:hover { background: #f1f5f9; }

    input[type="checkbox"] {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      border: 2px solid #cbd5e0;
      flex-shrink: 0;

      &:checked { background-color: #1bb776; border-color: #1bb776; }
      &:focus { box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.2); }
    }
  }

  &__button {
    width: 100%;
    padding: 14px 24px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.95em;
    cursor: pointer;
    transition: all 0.3s ease;

    &--primary {
      background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
      color: white;
      border: none;
      box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4);
      }
    }

    &--secondary {
      background: white;
      color: #292c34;
      border: 2px solid #e2e8f0;

      &:hover:not(:disabled) {
        background: #f8f9fa;
        border-color: #cbd5e0;
        transform: translateY(-1px);
      }
    }

    &:disabled {
      background: #cbd5e0;
      color: #ffffff;
      border-color: #cbd5e0;
      box-shadow: none;
      cursor: not-allowed;
      opacity: 0.6;
      transform: none;
    }
  }

  &__why {
    margin: 8px 0 0 0;
    font-size: 0.8em;
    color: #64748b;
    font-style: italic;
  }
}
</style>

<template>
  <div class="pos-status">
    <button
      type="button"
      class="pos-status__btn"
      :class="'pos-status__btn--' + tone"
      :title="title"
      @click="toggleOpen"
    >
      <span class="pos-status__dot" :class="'pos-status__dot--' + tone" />
      <span class="pos-status__label">{{ label }}</span>
    </button>

    <div v-if="open" class="pos-status__pop">
      <dl class="pos-status__facts">
        <dt>{{ $i('pos_status_connection') }}</dt>
        <dd :class="online ? 'is-ok' : 'is-bad'">
          {{ online ? $i('pos_online') : $i('pos_offline') }}
        </dd>

        <dt>{{ $i('pos_terminal_title') }}</dt>
        <dd :class="terminalToneClass">
          {{ terminalSummary }}
        </dd>

        <template v-if="bound && status.serialNo">
          <dt class="is-sub">
            {{ $i('pos_terminal_serial') }}
          </dt><dd>{{ status.serialNo }}</dd>
        </template>
        <template v-if="bound && status.secondsSinceAlive != null">
          <dt class="is-sub">
            {{ $i('pos_terminal_last_seen') }}
          </dt><dd>{{ lastSeenLabel }}</dd>
        </template>
        <template v-if="bound && status.deviceNetwork">
          <dt class="is-sub">
            {{ $i('pos_terminal_network') }}
          </dt><dd>{{ status.deviceNetwork }}</dd>
        </template>
        <template v-if="bound && status.batteryPercentage != null">
          <dt class="is-sub">
            {{ $i('pos_terminal_battery') }}
          </dt><dd>{{ Math.round(status.batteryPercentage) }}%{{ status.isCharging ? ' ⚡' : '' }}</dd>
        </template>
      </dl>

      <p v-if="bound && status.statusError" class="pos-status__error">
        {{ $i('pos_terminal_status_unavailable') }}
      </p>

      <!-- Unbound is the one state with something to do right here, so the picker lives in the popover. -->
      <!-- Also shown when the status call failed (status null): a register that cannot reach the
           status endpoint still needs a way to bind its terminal, and toggleOpen has already
           loaded the list for exactly that case. -->
      <template v-if="!bound">
        <p class="pos-status__hint">
          {{ $i('pos_terminal_pick') }}
        </p>
        <p v-if="!availableTerminals.length" class="pos-status__hint">
          {{ $i('pos_terminal_no_terminals') }}
        </p>
        <button
          v-for="t in availableTerminals"
          :key="t.terminalId"
          type="button"
          class="pos-status__option"
          :disabled="binding"
          @click="bind(t)"
        >
          <span class="pos-status__option-name">{{ t.terminalName || t.terminalType }}</span>
          <span class="pos-status__option-serial">{{ t.serialNo }}</span>
        </button>
        <p v-if="bindError" class="pos-status__error">
          {{ bindError }}
        </p>
      </template>
    </div>
  </div>
</template>

<script>
// One status chip for the POS top bar, covering both things that can strand a sale: the register's
// connection to Okam (pos.online, from the board poll) and the card terminal's liveness (Surfboard
// lastAliveAt, polled here). They used to sit side by side as two green chips both reading
// "Tilkoblet", which read as one duplicated thing rather than two different ones. Now the bar stays
// quiet — a single "Klar" — until something breaks, and then it names what broke.
const POLL_MS = 30000;

export default {
  name: 'PosStatusChip',
  inject: ['pos'],
  data () {
    return { status: null, open: false, terminals: [], binding: false, bindError: null, timer: null };
  },
  computed: {
    cashPoint () { return this.pos.cashPoint; },
    online () { return this.pos.online; },
    bound () { return !!(this.status && this.status.bound); },
    terminalTone () {
      if (!this.status) { return 'idle'; }
      if (!this.status.bound) { return 'none'; }
      if (this.status.online === true) { return 'ok'; }
      if (this.status.online === false) { return 'bad'; }
      return 'idle';
    },
    // Worst state wins: with no connection to Okam nothing sells, so it outranks a quiet terminal,
    // and an unpicked terminal outranks an offline one (there is nothing to be offline yet).
    tone () {
      if (!this.online) { return 'down'; }
      if (this.terminalTone === 'none') { return 'todo'; }
      if (this.terminalTone === 'bad') { return 'warn'; }
      if (this.terminalTone === 'idle') { return 'idle'; }
      return 'ok';
    },
    label () {
      if (this.tone === 'down') { return this.$i('pos_status_no_connection'); }
      if (this.tone === 'todo') { return this.$i('pos_status_pick_terminal'); }
      if (this.tone === 'warn') { return this.$i('pos_terminal_offline'); }
      if (this.tone === 'idle') { return this.$i('pos_terminal_unknown'); }
      return this.$i('pos_status_ready');
    },
    title () {
      return this.tone === 'ok' ? this.$i('pos_status_ready_hint') : this.label;
    },
    terminalToneClass () {
      if (this.terminalTone === 'ok') { return 'is-ok'; }
      if (this.terminalTone === 'bad' || this.terminalTone === 'none') { return 'is-bad'; }
      return '';
    },
    terminalSummary () {
      if (!this.status) { return '—'; }
      if (!this.status.bound) { return this.$i('pos_terminal_none'); }
      const name = this.status.terminalName || this.status.terminalId;
      if (this.status.online === false) { return `${name} · ${this.$i('pos_offline')}`; }
      return name;
    },
    lastSeenLabel () {
      const s = Math.round(this.status.secondsSinceAlive);
      if (s < 60) { return this.$i('pos_terminal_seconds_ago', { n: s }); }
      return this.$i('pos_terminal_minutes_ago', { n: Math.round(s / 60) });
    },
    availableTerminals () {
      return (this.terminals || []).filter(t => t && t.terminalId &&
        !['PaymentPage', 'SelfHostedPage', 'MerchantInitiated', 'printer', 'surfprint'].includes(t.terminalType));
    }
  },
  watch: {
    cashPoint: {
      immediate: true,
      // Drop the old register's status first. refresh() deliberately keeps the last known status
      // when the call fails — right for a blip on one register, wrong across a switch: the chip
      // would keep reporting the previous cash point's terminal as connected, with its serial and
      // battery in the popover, for a register that is not bound to it.
      handler () {
        this.status = null;
        this.terminals = [];
        this.refresh();
      }
    }
  },
  mounted () {
    this.timer = setInterval(() => this.refresh(), POLL_MS);
  },
  beforeDestroy () {
    if (this.timer) { clearInterval(this.timer); }
  },
  methods: {
    async refresh () {
      if (!this.cashPoint || !this.pos.storeId) { this.status = null; return; }
      try {
        this.status = await this._surfboardService.getCashPointTerminalStatus(this.pos.storeId, this.cashPoint.cashPointId);
      } catch (e) {
        // Leave the last known status; the chip falls back to "unknown" when nothing loaded yet.
      }
    },
    toggleOpen () {
      this.open = !this.open;
      if (!this.open) { return; }
      this.refresh();
      if (!this.status || !this.status.bound) { this.loadTerminals(); }
    },
    async loadTerminals () {
      try {
        this.terminals = await this._surfboardService.getStoreTerminalsForStore(this.pos.storeId) || [];
      } catch (e) {
        this.terminals = [];
      }
    },
    async bind (t) {
      this.binding = true;
      this.bindError = null;
      try {
        await this._surfboardService.bindTerminal(this.pos.storeId, {
          terminalId: t.terminalId,
          cashPointId: this.cashPoint.cashPointId
        });
        // Reflect the binding on the in-memory cash point so payment gating updates immediately.
        this.cashPoint.surfboardTerminalId = t.terminalId;
        await this.refresh();
        this.open = false;
      } catch (e) {
        this.bindError = (e && e.response && e.response.data && e.response.data.message) ||
          (e && e.message) || this.$i('pos_terminal_bind_failed');
        await this.refresh();
      } finally {
        this.binding = false;
      }
    }
  }
};
</script>

<style scoped>
.pos-status { position: relative; display: inline-flex; }

.pos-status__btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #1c1f28;
  border: none;
  border-radius: 10px;
  padding: 8px 12px;
  color: #cbd5e0;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}
.pos-status__btn--ok { color: #43d197; }
.pos-status__btn--warn,
.pos-status__btn--todo { color: #f59e0b; }
.pos-status__btn--down { color: #f87171; }

.pos-status__dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; background: #64748b; }
.pos-status__dot--ok { background: #43d197; }
.pos-status__dot--warn,
.pos-status__dot--todo { background: #f59e0b; }
.pos-status__dot--down { background: #f87171; }

.pos-status__pop {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 268px;
  background: #ffffff;
  color: #292c34;
  border-radius: 14px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
  padding: 14px;
  z-index: 990;
}

.pos-status__facts { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; margin: 0; font-size: 0.85rem; }
.pos-status__facts dt { color: #64748b; font-weight: 600; }
.pos-status__facts dt.is-sub { color: #94a3b8; font-weight: 500; padding-left: 10px; }
.pos-status__facts dd { margin: 0; color: #292c34; text-align: right; }
.pos-status__facts dd.is-ok { color: #166534; font-weight: 600; }
.pos-status__facts dd.is-bad { color: #92400e; font-weight: 600; }

.pos-status__error { margin: 10px 0 0; font-size: 0.8rem; color: #92400e; }
.pos-status__hint { margin: 12px 0 8px; font-size: 0.85rem; color: #64748b; }

.pos-status__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
  cursor: pointer;
  font-size: 0.88rem;
}
.pos-status__option:hover { background: #eef2f7; }
.pos-status__option:disabled { opacity: 0.55; cursor: default; }
.pos-status__option-name { font-weight: 600; color: #292c34; }
.pos-status__option-serial { color: #94a3b8; font-size: 0.78rem; }

@media (max-width: 1100px) {
  /* The label is the whole point when something is wrong; only "Klar" is safe to drop to a dot. */
  .pos-status__btn--ok .pos-status__label { display: none; }
}
</style>

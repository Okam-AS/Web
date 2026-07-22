<template>
  <div class="term-chip">
    <button
      type="button"
      class="term-chip__btn"
      :class="'term-chip__btn--' + tone"
      :title="label"
      @click="toggleOpen"
    >
      <span class="term-chip__icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 2h8a2 2 0 012 2v16a2 2 0 01-2 2H8a2 2 0 01-2-2V4a2 2 0 012-2zM9 5.5h6v4H9zM9 13h.01M12 13h.01M15 13h.01M9 16h.01M12 16h.01M15 16h.01M9 19h.01M12 19h.01M15 19h.01" /></svg>
        <span class="term-chip__dot" :class="'term-chip__dot--' + tone" />
      </span>
      <span class="term-chip__text">
        <span class="term-chip__text-title">{{ $i('pos_terminal_title') }}</span>
        <span class="term-chip__text-state" :class="'term-chip__text-state--' + tone">{{ label }}</span>
      </span>
    </button>

    <div v-if="open" class="term-chip__pop">
      <template v-if="status && status.bound">
        <div class="term-chip__pop-head">
          <span class="term-chip__pop-name">{{ status.terminalName || status.terminalId }}</span>
          <span class="term-chip__pop-state" :class="'term-chip__pop-state--' + tone">{{ label }}</span>
        </div>
        <dl class="term-chip__facts">
          <template v-if="status.serialNo">
            <dt>{{ $i('pos_terminal_serial') }}</dt><dd>{{ status.serialNo }}</dd>
          </template>
          <template v-if="status.secondsSinceAlive != null">
            <dt>{{ $i('pos_terminal_last_seen') }}</dt><dd>{{ lastSeenLabel }}</dd>
          </template>
          <template v-if="status.deviceNetwork">
            <dt>{{ $i('pos_terminal_network') }}</dt><dd>{{ status.deviceNetwork }}</dd>
          </template>
          <template v-if="status.batteryPercentage != null">
            <dt>{{ $i('pos_terminal_battery') }}</dt><dd>{{ Math.round(status.batteryPercentage) }}%{{ status.isCharging ? ' ⚡' : '' }}</dd>
          </template>
        </dl>
        <p v-if="status.statusError" class="term-chip__error">
          {{ $i('pos_terminal_status_unavailable') }}
        </p>
      </template>

      <template v-else>
        <div class="term-chip__pop-head">
          <span class="term-chip__pop-name">{{ $i('pos_terminal_none') }}</span>
        </div>
        <p class="term-chip__pick-hint">
          {{ $i('pos_terminal_pick') }}
        </p>
        <p v-if="!availableTerminals.length" class="term-chip__pick-hint">
          {{ $i('pos_terminal_no_terminals') }}
        </p>
        <button
          v-for="t in availableTerminals"
          :key="t.terminalId"
          type="button"
          class="term-chip__option"
          :disabled="binding"
          @click="bind(t)"
        >
          <span class="term-chip__option-name">{{ t.terminalName || t.terminalType }}</span>
          <span class="term-chip__option-serial">{{ t.serialNo }}</span>
        </button>
        <p v-if="bindError" class="term-chip__error">
          {{ bindError }}
        </p>
      </template>
    </div>
  </div>
</template>

<script>
// Terminal connectivity chip for the POS top bar. Polls the cash point's terminal-status endpoint
// (Surfboard lastAliveAt-based liveness) and, when no terminal is bound yet, lets the operator pick
// one of the store's onboarded terminals right here — one tap, no ids to type.
const POLL_MS = 30000;

export default {
  name: 'TerminalStatusChip',
  inject: ['pos'],
  data () {
    return { status: null, open: false, terminals: [], binding: false, bindError: null, timer: null };
  },
  computed: {
    cashPoint () { return this.pos.cashPoint; },
    tone () {
      if (!this.status) { return 'unknown'; }
      if (!this.status.bound) { return 'none'; }
      if (this.status.online === true) { return 'ok'; }
      if (this.status.online === false) { return 'bad'; }
      return 'unknown';
    },
    label () {
      if (this.status && !this.status.bound) { return this.$i('pos_terminal_none'); }
      if (this.tone === 'ok') { return this.$i('pos_terminal_online'); }
      if (this.tone === 'bad') { return this.$i('pos_terminal_offline'); }
      return this.$i('pos_terminal_unknown');
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
      handler () { this.refresh(); }
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
.term-chip { position: relative; display: inline-flex; }

.term-chip__btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #1c1f28;
  border: none;
  border-radius: 10px;
  padding: 6px 12px;
  color: #cbd5e0;
  cursor: pointer;
}
.term-chip__btn:hover { color: #ffffff; }
.term-chip__btn--ok { color: #43d197; }
.term-chip__btn--bad { color: #f59e0b; }

.term-chip__icon { position: relative; display: inline-flex; flex-shrink: 0; }
.term-chip__icon svg { width: 20px; height: 20px; }

.term-chip__text { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.2; }
.term-chip__text-title { font-size: 0.68rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; }
.term-chip__text-state { font-size: 0.78rem; font-weight: 600; white-space: nowrap; color: #cbd5e0; }
.term-chip__text-state--ok { color: #43d197; }
.term-chip__text-state--bad { color: #f59e0b; }

.term-chip__dot {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid #1c1f28;
}
.term-chip__dot--ok { background: #43d197; }
.term-chip__dot--bad { background: #f59e0b; }
.term-chip__dot--none { background: #94a3b8; }
.term-chip__dot--unknown { background: #64748b; }

.term-chip__pop {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 260px;
  background: #ffffff;
  color: #292c34;
  border-radius: 14px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
  padding: 14px;
  z-index: 990;
}

.term-chip__pop-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.term-chip__pop-name { font-weight: 700; font-size: 0.95rem; }
.term-chip__pop-state { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; padding: 3px 8px; border-radius: 6px; background: #f1f5f9; color: #64748b; }
.term-chip__pop-state--ok { background: #dcfce7; color: #166534; }
.term-chip__pop-state--bad { background: #fef3c7; color: #92400e; }

.term-chip__facts { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: 0; font-size: 0.85rem; }
.term-chip__facts dt { color: #94a3b8; font-weight: 600; }
.term-chip__facts dd { margin: 0; color: #292c34; text-align: right; }

.term-chip__error { margin: 10px 0 0; font-size: 0.8rem; color: #92400e; }

.term-chip__pick-hint { margin: 0 0 10px; font-size: 0.85rem; color: #64748b; }

.term-chip__option {
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
.term-chip__option:hover { background: #eef2f7; }
.term-chip__option:disabled { opacity: 0.55; cursor: default; }
.term-chip__option-name { font-weight: 600; color: #292c34; }
.term-chip__option-serial { color: #94a3b8; font-size: 0.78rem; }

@media (max-width: 1100px) {
  .term-chip__text { display: none; }
}
</style>

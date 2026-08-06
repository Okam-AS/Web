<template>
  <header class="pos-topbar">
    <div class="pos-topbar__left">
      <div class="pos-topbar__cashpoint">
        <span class="pos-topbar__cp-name">{{ cashPoint ? cashPoint.name : '—' }}</span>
        <span class="pos-topbar__store">{{ storeName }}</span>
      </div>
      <span
        class="pos-topbar__day"
        :class="dayOpen ? 'is-open' : 'is-closed'"
      >{{ dayOpen ? $i('pos_day_open') : $i('pos_day_closed') }}</span>
    </div>

    <nav class="pos-topbar__modes">
      <button
        v-for="m in modes"
        :key="m.key"
        type="button"
        class="pos-topbar__mode"
        :class="{ 'is-active': pos.mode === m.key }"
        @click="pos.setMode(m.key)"
      >
        <span class="pos-topbar__mode-icon" v-html="m.icon" />
        <span>{{ m.label }}</span>
      </button>
    </nav>

    <div class="pos-topbar__right">
      <button
        type="button"
        class="pos-topbar__ctrl"
        :title="$i('pos_open_drawer')"
        @click="pos.openDrawer()"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7H4a1 1 0 00-1 1v3h18V8a1 1 0 00-1-1zM3 11v5a1 1 0 001 1h16a1 1 0 001-1v-5M10 14h4" /></svg>
        <span class="pos-topbar__ctrl-label">{{ $i('pos_drawer_label') }}</span>
      </button>
      <button
        type="button"
        class="pos-topbar__ctrl"
        :class="{ 'is-on': pos.chimeEnabled }"
        :title="pos.chimeEnabled ? $i('pos_chime_on') : $i('pos_chime_off')"
        @click="pos.toggleChime()"
      >
        <svg v-if="pos.chimeEnabled" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l4-4m0 4l-4-4" /></svg>
        <span class="pos-topbar__ctrl-label">{{ pos.chimeEnabled ? $i('pos_chime_on') : $i('pos_chime_off') }}</span>
      </button>
      <PosStatusChip />
      <button type="button" class="pos-topbar__operator" @click="pos.requestSwitch()">
        <span class="pos-topbar__avatar">{{ initials }}</span>
        <span class="pos-topbar__op-text">
          <span class="pos-topbar__op-name">{{ operatorName }}</span>
        </span>
      </button>
      <button type="button" class="pos-topbar__ctrl" :title="$i('pos_exit')" @click="pos.requestExit()">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        <span class="pos-topbar__ctrl-label">{{ $i('pos_exit_short') }}</span>
      </button>
    </div>
  </header>
</template>

<script>
import PosStatusChip from '~/components/admin/pos/PosStatusChip.vue';

const ICON_SELL = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>';
const ICON_BOARD = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h5v6H4V5zm10-1h5a1 1 0 011 1v5h-6V4zM4 13h6v6H5a1 1 0 01-1-1v-5zm10 0h6v5a1 1 0 01-1 1h-5v-6z" /></svg>';
const ICON_RECEIPTS = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>';
const ICON_DAY = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
const ICON_CLOCK = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>';

export default {
  name: 'PosTopBar',
  components: { PosStatusChip },
  inject: ['pos'],
  computed: {
    cashPoint () { return this.pos.cashPoint; },
    storeName () { return this.pos.storeName; },
    dayOpen () { return this.pos.dayOpen; },
    session () { return this.pos.session || {}; },
    operatorName () { return this.session.operatorName || '—'; },
    initials () {
      return String(this.operatorName || '')
        .split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
    },
    modes () {
      return [
        { key: 'sell', label: this.$i('pos_mode_sell'), icon: ICON_SELL },
        { key: 'board', label: this.$i('pos_mode_board'), icon: ICON_BOARD },
        { key: 'day', label: this.$i('pos_mode_day'), icon: ICON_DAY },
        { key: 'receipts', label: this.$i('pos_mode_receipts'), icon: ICON_RECEIPTS },
        { key: 'clock', label: this.$i('pos_mode_clock'), icon: ICON_CLOCK }
      ];
    }
  }
};
</script>

<style scoped>
.pos-topbar {
  height: 64px;
  background: #12141a;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
  gap: 12px;
  /* Above BeginDayModal (850), which is `position: absolute; inset: 0` and therefore covered the bar
     as well as the body it means to block.
     THIS IS WHAT MADE THE MODE EXEMPTIONS REACHABLE RATHER THAN NOMINAL. `needsDay` has always
     exempted `day` and `receipts`, but with the bar underneath the overlay there was no way to
     REACH either one: a register whose day is closed opens in `sell`, the modal covers everything,
     and its only control opens a trading day. So the exemption described a mode you could only be
     in already. Found by clicking — the mode button was visible, enabled and stable, and the panel
     took the pointer.
     It matters most for the clock, because arriving at work happens BEFORE the day is opened: the
     first person in would otherwise have to open a trading day — a fiscal event — to record that
     they showed up, and the last one out could not clock out after it closed.
     The body stays blocked, which is the modal's actual job; only the register's own navigation
     stays live. Below the PIN pads (2000/2100) so an operator switch still covers the bar. */
  position: relative;
  z-index: 860;
}

/* `overflow: hidden` so the cash point's name TRUNCATES instead of spilling out of the 64px bar.
   A fifth mode entry (Stempling) widened the nav past what 1280 leaves for this block, and with
   `white-space: nowrap` on the name the overflow rendered as text lying across the bar's top edge.
   The store name already has an ellipsis; this is what lets it reach. */
.pos-topbar__left { display: flex; align-items: center; gap: 12px; min-width: 0; overflow: hidden; }

.pos-topbar__cashpoint { display: flex; flex-direction: column; min-width: 0; }
.pos-topbar__cp-name { font-weight: 700; font-size: 1rem; white-space: nowrap; }
.pos-topbar__store { font-size: 0.75rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.pos-topbar__day {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 3px 8px;
  border-radius: 6px;
  /* Never squeezed into a wrap: whether the trading day is open is a one-word fact and a badge that
     broke across two lines pushed the whole left block past the bar's height. */
  flex-shrink: 0;
  white-space: nowrap;
}
.pos-topbar__day.is-open { background: rgba(27, 183, 118, 0.2); color: #43d197; }
.pos-topbar__day.is-closed { background: rgba(148, 163, 184, 0.18); color: #94a3b8; }

.pos-topbar__modes {
  display: flex;
  gap: 4px;
  background: #1c1f28;
  padding: 4px;
  border-radius: 12px;
  /* The register's own navigation is the last thing that may be squeezed — a mode button narrowed
     to nothing is a mode nobody can reach, which is how a shipped screen becomes invisible. */
  flex-shrink: 0;
}
.pos-topbar__mode {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: none;
  color: #cbd5e0;
  font-weight: 600;
  font-size: 0.95rem;
  padding: 8px 18px;
  border-radius: 9px;
  cursor: pointer;
}
.pos-topbar__mode.is-active { background: var(--pos-primary, #1bb776); color: #ffffff; }
.pos-topbar__mode-icon { display: inline-flex; }
.pos-topbar__mode-icon svg { width: 18px; height: 18px; }

.pos-topbar__right { display: flex; align-items: center; gap: 14px; }

.pos-topbar__ctrl {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: #1c1f28;
  border: none;
  border-radius: 10px;
  padding: 8px 12px;
  color: #cbd5e0;
  cursor: pointer;
}
.pos-topbar__ctrl:hover { color: #ffffff; }
.pos-topbar__ctrl.is-on { color: #43d197; }
.pos-topbar__ctrl svg { width: 18px; height: 18px; flex-shrink: 0; }

.pos-topbar__ctrl-label {
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
}

.pos-topbar__operator {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1c1f28;
  border: none;
  border-radius: 10px;
  padding: 6px 12px 6px 6px;
  cursor: pointer;
  color: #ffffff;
}
.pos-topbar__avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
}
.pos-topbar__op-text { display: flex; flex-direction: column; align-items: flex-start; }
.pos-topbar__op-name { font-size: 0.85rem; font-weight: 600; }

/* 1300 rather than 1100: this threshold was tuned when the bar carried FOUR modes, and Stempling is
   a fifth. At 1280 — the commonest laptop the register is actually run on — the nav plus the three
   right-hand labels over-subscribed the bar, and the left block was squeezed until the cash point's
   name and the trading-day badge overlapped the bar's own edge. The icons stay; only their words go,
   which is the same trade this rule already made one breakpoint down. */
@media (max-width: 1300px) {
  .pos-topbar__ctrl-label { display: none; }
}

@media (max-width: 720px) {
  .pos-topbar__mode span:not(.pos-topbar__mode-icon) { display: none; }
  .pos-topbar__op-text { display: none; }
  .pos-topbar__store { display: none; }
}
</style>

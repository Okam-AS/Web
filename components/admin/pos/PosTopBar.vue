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
        class="pos-topbar__chime"
        :class="{ 'is-on': pos.chimeEnabled }"
        :title="pos.chimeEnabled ? $i('pos_chime_on') : $i('pos_chime_off')"
        @click="pos.toggleChime()"
      >
        <svg v-if="pos.chimeEnabled" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l4-4m0 4l-4-4" /></svg>
      </button>
      <span
        class="pos-topbar__net"
        :class="pos.online ? 'is-online' : 'is-offline'"
        :title="pos.online ? $i('pos_online') : $i('pos_offline')"
      />
      <button type="button" class="pos-topbar__operator" @click="pos.requestSwitch()">
        <span class="pos-topbar__avatar">{{ initials }}</span>
        <span class="pos-topbar__op-text">
          <span class="pos-topbar__op-name">{{ operatorName }}</span>
          <span class="pos-topbar__op-role">{{ roleLabel }}</span>
        </span>
      </button>
      <button type="button" class="pos-topbar__exit" :title="$i('pos_exit')" @click="pos.exit()">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
      </button>
    </div>
  </header>
</template>

<script>
const ICON_SELL = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>';
const ICON_BOARD = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h5v6H4V5zm10-1h5a1 1 0 011 1v5h-6V4zM4 13h6v6H5a1 1 0 01-1-1v-5zm10 0h6v5a1 1 0 01-1 1h-5v-6z" /></svg>';
const ICON_DAY = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';

export default {
  name: 'PosTopBar',
  inject: ['pos'],
  computed: {
    cashPoint () { return this.pos.cashPoint; },
    storeName () { return this.pos.storeName; },
    dayOpen () { return this.pos.dayOpen; },
    session () { return this.pos.session || {}; },
    operatorName () { return this.session.operatorName || '—'; },
    roleLabel () { return this.$i('pos_role_' + String(this.session.roleLevel || '').toLowerCase()) || this.session.roleLevel || ''; },
    initials () {
      return String(this.operatorName || '')
        .split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
    },
    modes () {
      return [
        { key: 'sell', label: this.$i('pos_mode_sell'), icon: ICON_SELL },
        { key: 'board', label: this.$i('pos_mode_board'), icon: ICON_BOARD },
        { key: 'day', label: this.$i('pos_mode_day'), icon: ICON_DAY }
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
}

.pos-topbar__left { display: flex; align-items: center; gap: 12px; min-width: 0; }

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
}
.pos-topbar__day.is-open { background: rgba(27, 183, 118, 0.2); color: #43d197; }
.pos-topbar__day.is-closed { background: rgba(148, 163, 184, 0.18); color: #94a3b8; }

.pos-topbar__modes {
  display: flex;
  gap: 4px;
  background: #1c1f28;
  padding: 4px;
  border-radius: 12px;
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

.pos-topbar__chime { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 6px; display: inline-flex; }
.pos-topbar__chime:hover { color: #ffffff; }
.pos-topbar__chime.is-on { color: #43d197; }
.pos-topbar__chime svg { width: 20px; height: 20px; }

.pos-topbar__net { width: 10px; height: 10px; border-radius: 50%; }
.pos-topbar__net.is-online { background: #43d197; }
.pos-topbar__net.is-offline { background: #f59e0b; }

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
.pos-topbar__op-role { font-size: 0.7rem; color: #94a3b8; }

.pos-topbar__exit {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 6px;
}
.pos-topbar__exit:hover { color: #ffffff; }
.pos-topbar__exit svg { width: 22px; height: 22px; }

@media (max-width: 720px) {
  .pos-topbar__mode span:not(.pos-topbar__mode-icon) { display: none; }
  .pos-topbar__op-text { display: none; }
  .pos-topbar__store { display: none; }
}
</style>

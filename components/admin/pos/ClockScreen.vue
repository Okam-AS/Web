<template>
  <div class="posclk">
    <div class="posclk__inner">
      <header class="posclk__head">
        <div class="posclk__who">
          <span class="posclk__avatar">{{ initials }}</span>
          <div class="posclk__who-text">
            <span class="posclk__name">{{ operatorName }}</span>
            <span class="posclk__store">{{ storeName }}</span>
          </div>
        </div>
        <span class="posclk__state" :class="'posclk__state--' + state">{{ stateLabel }}</span>
      </header>

      <!-- The two halves of the pair, always both rendered. Which one is live is decided by the
           state module, never by this template — see utils/workforce/pos-clock-state.js. -->
      <div class="posclk__actions">
        <button
          type="button"
          class="posclk__btn posclk__btn--in"
          :disabled="busy || !canIn"
          @click="punch('ClockIn')"
        >
          <span class="posclk__btn-label">{{ $i('posclk_in') }}</span>
          <span class="posclk__btn-time">{{ nowLabel }}</span>
        </button>
        <button
          type="button"
          class="posclk__btn posclk__btn--out"
          :disabled="busy || !canOut"
          @click="punch('ClockOut')"
        >
          <span class="posclk__btn-label">{{ $i('posclk_out') }}</span>
          <span class="posclk__btn-time">{{ nowLabel }}</span>
        </button>
      </div>

      <!-- Outcome. An exception is NOT an error and does not render as one: the punch is on the
           append-only record either way, and saying "failed" about a recorded punch would be the
           second lie after the one this screen exists to avoid. -->
      <p v-if="notice" class="posclk__notice" :class="'posclk__notice--' + noticeKind">
        {{ notice }}
      </p>

      <p v-if="error" class="posclk__error">
        {{ error }}
        <button v-if="errorRetryable" type="button" class="posclk__retry" @click="retry">
          {{ $i('pos_retry') }}
        </button>
      </p>

      <section class="posclk__list">
        <header class="posclk__list-head">
          <h2 class="posclk__list-title">{{ $i('posclk_list_title') }}</h2>
          <span v-if="list" class="posclk__list-count">{{ $i('posclk_present_count', { count: list.presentCount }) }}</span>
        </header>

        <p v-if="listLoading && !list" class="posclk__list-state">
          {{ $i('pos_loading') }}
        </p>
        <p v-else-if="listError" class="posclk__list-state posclk__list-state--error">
          {{ listError }}
          <button type="button" class="posclk__retry" @click="loadList">
            {{ $i('pos_retry') }}
          </button>
        </p>
        <p v-else-if="!entries.length" class="posclk__list-state">
          {{ $i('posclk_list_empty') }}
        </p>

        <table v-else class="posclk__table">
          <thead>
            <tr>
              <th scope="col">{{ $i('posclk_col_name') }}</th>
              <th scope="col">{{ $i('posclk_col_from') }}</th>
              <th scope="col">{{ $i('posclk_col_to') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(entry, i) in entries"
              :key="(entry.protectedIdentityCodeRef || entry.participantName) + '-' + i"
              class="posclk__row"
              :class="{ 'is-present': entry.isPresent }"
            >
              <td class="posclk__cell posclk__cell--name">
                <span class="posclk__entry-name">{{ entry.participantName }}</span>
                <span v-if="entry.category" class="posclk__entry-cat">{{ entry.category }}</span>
              </td>
              <td class="posclk__cell">{{ venueTime(entry.onSiteStartUtc) }}</td>
              <!-- The end time is the whole reason a completed window stays on this list. An open
                   window has none yet, and says so rather than rendering an empty cell. -->
              <td class="posclk__cell">
                <span v-if="entry.onSiteEndUtc">{{ venueTime(entry.onSiteEndUtc) }}</span>
                <span v-else class="posclk__still-in">{{ $i('posclk_still_in') }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>

<script>
import { newGuid } from '~/utils/guid';
import { WorkforcePosClockService } from '~/utils/workforce/pos-clock-client';
import { isWorkforceApiError } from '~/utils/workforce/api-client';
import {
  SESSION_OPEN,
  SESSION_CLOSED,
  SESSION_EXCEPTION,
  SESSION_UNKNOWN,
  canClockIn,
  canClockOut,
  stateFromRefusal,
  nextState
} from '~/utils/workforce/pos-clock-state';

// The register's clock: the one screen in this app from which a person can clock in and out.
//
// WHY IT LIVES INSIDE THE POS SHELL AND NOWHERE ELSE. `POST /workforce/pos/clock-events` authenticates
// a DEVICE JWT plus an `X-Operator-Session` header, and resolves WHO is clocking from the operator's
// manager-reviewed staff link — never from anything the client sends. The POS shell is the only place
// in this app that holds an operator session, so this is the only place the endpoint can be reached
// from at all. `utils/workforce/personnel-list-client.js` already recorded the other half of that
// sentence: a manager's browser holds neither credential, so binding this on an admin page would be a
// button that could only ever answer 403.
//
// WHAT THE OPERATOR SESSION IS AND IS NOT. It is PROVENANCE, never attendance (spec §7.2). Logging in
// as an operator does not clock anybody in; it only says which linked staff member a punch is
// attributed to. An operator with no link is a 403 and is told to see a manager.
export default {
  name: 'ClockScreen',
  inject: ['pos'],
  data () {
    return {
      state: SESSION_UNKNOWN,
      busy: false,
      notice: '',
      noticeKind: 'ok',
      error: '',
      errorRetryable: false,
      list: null,
      listLoading: false,
      listError: '',
      // The clock ticking on the buttons, so the person sees the time their punch will carry.
      now: new Date(),
      // The interval handle is deliberately NOT declared here. Vue 2 refuses to proxy a data key
      // beginning with `_` or `$` onto the instance, so a `_tick: null` entry was a declaration
      // nothing could read back: `this._tick` resolved to a plain instance property while
      // `this.$data._tick` stayed null forever. It lives on the instance instead (see `mounted`),
      // which is also where a timer handle belongs — it is not state anything renders.
      // The punch currently being attempted. Held so a RETRY re-sends the same clientEventId: the
      // dedupe is the natural (Source, ClientEventId) key, so a retry that minted a fresh id would
      // append a SECOND punch to an append-only table with no delete to undo it (C1).
      pending: null
    };
  },
  computed: {
    operatorName () { return (this.pos.session && this.pos.session.operatorName) || '—'; },
    storeName () { return this.pos.storeName; },
    initials () {
      return String(this.operatorName || '')
        .split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
    },
    canIn () { return canClockIn(this.state); },
    canOut () { return canClockOut(this.state); },
    stateLabel () {
      if (this.state === SESSION_OPEN) { return this.$i('posclk_state_in'); }
      if (this.state === SESSION_CLOSED) { return this.$i('posclk_state_out'); }
      if (this.state === SESSION_EXCEPTION) { return this.$i('posclk_state_exception'); }
      return this.$i('posclk_state_unknown');
    },
    nowLabel () { return this.clockLabel(this.now); },
    entries () { return (this.list && this.list.entries) || []; }
  },
  mounted () {
    this.loadList();
    // A non-reactive instance property on purpose: nothing renders the handle, only `now`.
    this._tick = setInterval(() => { this.now = new Date(); }, 1000);
  },
  beforeDestroy () {
    if (this._tick) { clearInterval(this._tick); }
  },
  methods: {
    svc () {
      const s = new WorkforcePosClockService(this._coreInitializer);
      s.operatorSessionId = this.pos.sessionId;
      return s;
    },

    clockLabel (date) {
      const pad = n => (n < 10 ? '0' + n : String(n));
      return pad(date.getHours()) + ':' + pad(date.getMinutes());
    },

    /**
     * An instant from the wire as the VENUE's wall clock.
     *
     * The response names the zone it resolved the business day in (`timeZoneId`), so the register
     * renders through THAT rather than the browser's — the same discipline
     * `utils/workforce/personnel-list.js` holds for the manager's list. On a till standing at the
     * venue the two agree; the point is that the list does not stop being true if it ever runs
     * somewhere else, and a formatter that silently fell back to the browser would hide that.
     */
    venueTime (utc) {
      if (!utc) { return ''; }
      const zone = this.list && this.list.timeZoneId;
      const date = new Date(utc);
      if (isNaN(date.getTime())) { return ''; }
      try {
        return new Intl.DateTimeFormat('nb-NO', {
          hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zone || undefined
        }).format(date);
      } catch (e) {
        // An unknown zone id must not blank the register out — fall back to the browser's clock and
        // keep the row readable rather than losing the time entirely.
        return this.clockLabel(date);
      }
    },

    async punch (eventType) {
      if (this.busy) { return; }
      this.pending = { eventType, clientEventId: newGuid() };
      await this.send();
    },

    retry () {
      if (this.pending) { this.send(); }
    },

    async send () {
      const attempt = this.pending;
      if (!attempt) { return; }
      this.busy = true;
      this.error = '';
      this.errorRetryable = false;
      this.notice = '';
      try {
        const response = await this.svc().ClockEvent(attempt.eventType, attempt.clientEventId, {
          at: new Date()
        });
        this.applyResponse(attempt.eventType, response);
        this.pending = null;
        // The punch only means anything if it reached the register everyone reads, so the list is
        // re-read rather than patched locally — what it shows is then the server's answer, not this
        // screen's guess at it.
        await this.loadList();
      } catch (e) {
        this.applyError(e);
      } finally {
        this.busy = false;
      }
    },

    applyResponse (eventType, response) {
      this.state = nextState(this.state, response);
      if (!response || !response.clockSessionId) {
        // The null-session outcome. The punch IS recorded (accepted: true on an append-only row);
        // what did not happen is the fold. Saying "clocked out" here would be the exact lie this
        // screen was built to stop, and saying "failed" would be a different one.
        this.noticeKind = 'warn';
        this.notice = eventType === 'ClockOut'
          ? this.$i('posclk_note_nothing_open')
          : this.$i('posclk_note_no_session');
        return;
      }
      this.noticeKind = 'ok';
      if (response.closedUtc) {
        this.notice = this.$i('posclk_note_out', { time: this.venueTime(response.closedUtc) });
      } else {
        this.notice = this.$i('posclk_note_in', { time: this.venueTime(response.openedUtc) });
      }
    },

    applyError (e) {
      // A 401 on this route is the operator session, not the punch: the device JWT or the session
      // died. PosShell owns that decision everywhere else, so it owns it here — drop to the PIN
      // screen rather than showing an error the person at the till cannot act on.
      //
      // It is matched on STATUS, not on a problem code: this one refusal does not answer
      // problem+json at all. It is a plain `{"message": …}` from OperatorSessionExceptionMiddleware,
      // so it carries no `code` to branch on and the shell's own `isSessionExpired` (which reads
      // `statusCode`) does not recognise a WorkforceApiError either.
      if (e && e.status === 401) {
        this.pending = null;
        this.pos.endSessionLocally();
        return;
      }

      if (isWorkforceApiError(e)) {
        const learned = stateFromRefusal(e.code);
        if (learned) { this.state = learned; }
        this.error = this.refusalMessage(e);
        // Only a refusal the server itself calls retryable offers the button; every other one is a
        // decision somebody has to make (link the operator, flip the flag), not a thing to press again.
        this.errorRetryable = e.retryable === true;
        if (!this.errorRetryable) { this.pending = null; }
        return;
      }

      this.pending = null;
      this.error = (e && e.message) || this.$i('pos_generic_error');
    },

    refusalMessage (e) {
      switch (e.code) {
        case 'workforce.open-session-exists':
          return this.$i('posclk_err_already_in');
        case 'workforce.flag-disabled-read-only':
          return this.$i('posclk_err_clock_off');
        case 'workforce.module-disabled':
          return this.$i('posclk_err_module_off');
        case 'workforce.pos-operator-not-linked':
          return this.$i('posclk_err_not_linked');
        case 'workforce.pos-verification-failed':
          return this.$i('posclk_err_verification');
        case 'workforce.idempotency-payload-mismatch':
          return this.$i('posclk_err_mismatch');
        case 'workforce.dst-ambiguous-offset-required':
        case 'workforce.dst-nonexistent-time':
          return this.$i('posclk_err_dst');
        case 'workforce.not-found':
          return this.$i('posclk_err_no_engagement');
        default:
          return e.message || this.$i('pos_generic_error');
      }
    },

    async loadList () {
      this.listLoading = true;
      this.listError = '';
      try {
        this.list = await this.svc().GetPersonnelList();
      } catch (e) {
        if (e && e.status === 401) { this.pos.endSessionLocally(); return; }
        this.listError = (e && e.message) || this.$i('pos_generic_error');
      } finally {
        this.listLoading = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.posclk {
  height: 100%;
  overflow-y: auto;
  background: #f5f6f8;
}

.posclk__inner {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 20px 40px;
}

.posclk__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.posclk__who { display: flex; align-items: center; gap: 12px; }

.posclk__avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #23252b;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 15px;
}

.posclk__who-text { display: flex; flex-direction: column; }
.posclk__name { font-weight: 700; font-size: 17px; color: #17181c; }
.posclk__store { font-size: 13px; color: #6b7280; }

.posclk__state {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  background: #e5e7eb;
  color: #4b5563;

  &--open { background: #dcfce7; color: #166534; }
  &--closed { background: #e5e7eb; color: #4b5563; }
  &--exception { background: #fef3c7; color: #92400e; }
}

// Two equal targets. They stay side by side down to a narrow till and only stack below that, so the
// pair is never one-above-the-other on a laptop where a mis-tap costs somebody their end time.
.posclk__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.posclk__btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 116px;
  border: 0;
  border-radius: 14px;
  cursor: pointer;
  color: #fff;
  transition: transform .06s ease, opacity .12s ease;

  &--in { background: #16a34a; }
  &--out { background: #b45309; }

  &:active:not(:disabled) { transform: scale(.985); }

  &:disabled {
    opacity: .38;
    cursor: not-allowed;
  }
}

.posclk__btn-label { font-size: 21px; font-weight: 700; }
.posclk__btn-time { font-size: 14px; opacity: .85; font-variant-numeric: tabular-nums; }

.posclk__notice {
  margin: 16px 0 0;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 15px;

  &--ok { background: #dcfce7; color: #166534; }
  &--warn { background: #fef3c7; color: #92400e; }
}

.posclk__error {
  margin: 16px 0 0;
  padding: 12px 14px;
  border-radius: 10px;
  background: #fee2e2;
  color: #991b1b;
  font-size: 15px;
}

.posclk__retry {
  margin-left: 10px;
  border: 0;
  background: rgba(0, 0, 0, .12);
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font: inherit;
  color: inherit;
}

.posclk__list { margin-top: 28px; }

.posclk__list-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.posclk__list-title { font-size: 16px; font-weight: 700; color: #17181c; margin: 0; }
.posclk__list-count { font-size: 13px; color: #6b7280; }

.posclk__list-state {
  padding: 18px;
  border-radius: 10px;
  background: #fff;
  color: #6b7280;
  font-size: 14px;

  &--error { color: #991b1b; }
}

// The table scrolls inside its own track rather than widening the page: on a 1280 laptop a table
// that escapes its grid column steals the hit test from whatever sits beside it, and the control it
// covers stops being clickable without ever looking broken.
.posclk__table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  font-size: 14px;

  th {
    text-align: left;
    padding: 10px 14px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .04em;
    color: #6b7280;
    background: #f9fafb;
  }
}

.posclk__cell {
  padding: 12px 14px;
  border-top: 1px solid #eef0f3;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  &--name { white-space: normal; }
}

.posclk__entry-name { font-weight: 600; color: #17181c; }
.posclk__entry-cat { display: block; font-size: 12px; color: #6b7280; }
.posclk__still-in { color: #166534; font-weight: 600; }

@media (max-width: 640px) {
  .posclk__actions { grid-template-columns: 1fr; }
}
</style>

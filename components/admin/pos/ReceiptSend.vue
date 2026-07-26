<template>
  <div class="rsend">
    <!-- Done state replaces the form entirely: a confirmation that stays put beats a toast the
         operator may already have looked away from. -->
    <div v-if="sentTo" class="rsend__done">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M5 13l4 4L19 7" /></svg>
      <span class="rsend__done-text">{{ doneText }}</span>
      <button type="button" class="rsend__again" @click="reset">
        {{ $i('pos_receipts_send_again') }}
      </button>
    </div>

    <template v-else-if="open">
      <label class="rsend__label" :for="fieldId">{{ $i('pos_receipts_send_to') }}</label>
      <div class="rsend__row">
        <input
          :id="fieldId"
          ref="input"
          v-model="recipient"
          type="text"
          inputmode="email"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          class="rsend__input"
          :placeholder="$i('pos_receipts_send_ph')"
          @keyup.enter="send"
        >
        <button type="button" class="rsend__go" :disabled="!valid || busy" @click="send">
          {{ busy ? $i('pos_working') : $i('pos_receipts_send_go') }}
        </button>
      </div>
      <!-- The hint says what the field takes, so nobody has to guess which of the two it wants. -->
      <p class="rsend__hint">
        {{ hintText }}
      </p>
      <p v-if="error" class="rsend__error">
        {{ error }}
      </p>
    </template>

    <button v-else type="button" class="rsend__open" @click="start">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
      <span>{{ $i('pos_receipts_send') }}</span>
    </button>
  </div>
</template>

<script>
let seq = 0;

// "Give the customer their receipt", as one control, used identically after a sale and from the
// receipts list. One field takes a mobile number OR an email address — asking a cashier to first
// classify what the customer just told them is work the machine can do, and getting it wrong is a
// dead end for the customer. The server picks the channel and reports back which one it used, so
// the confirmation is never a guess.
export default {
  name: 'ReceiptSend',
  inject: ['pos'],
  props: {
    journalEntryId: { type: Number, required: true }
  },
  data () {
    seq += 1;
    return {
      fieldId: 'rsend-' + seq,
      open: false,
      recipient: '',
      busy: false,
      error: '',
      sentTo: '',
      sentChannel: ''
    };
  },
  computed: {
    looksLikeEmail () { return this.recipient.includes('@'); },
    digits () { return this.recipient.replace(/\D/g, ''); },
    // Mirrors the server's rule so the button never invites a request that is going to bounce.
    valid () {
      const value = this.recipient.trim();
      if (!value) { return false; }
      if (this.looksLikeEmail) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value); }
      return this.digits.length >= 8 && this.digits.length <= 15;
    },
    // Reflects what has been typed so far rather than lecturing up front.
    hintText () {
      if (!this.recipient.trim()) { return this.$i('pos_receipts_send_hint'); }
      return this.looksLikeEmail ? this.$i('pos_receipts_send_as_email') : this.$i('pos_receipts_send_as_sms');
    },
    doneText () {
      const key = this.sentChannel === 'Email' ? 'pos_receipts_sent_email' : 'pos_receipts_sent_sms';
      return this.$i(key, { target: this.sentTo });
    }
  },
  methods: {
    start () {
      this.open = true;
      this.error = '';
      this.$nextTick(() => { if (this.$refs.input) { this.$refs.input.focus(); } });
    },
    reset () {
      this.sentTo = '';
      this.sentChannel = '';
      this.recipient = '';
      this.start();
    },
    async send () {
      if (!this.valid || this.busy) { return; }
      this.busy = true;
      this.error = '';
      try {
        const res = await this.pos.posSvc().SendReceipt(this.journalEntryId, {
          recipient: this.recipient.trim()
        });
        // The API answers 200 with sent:false when the gateway rejected a well-formed address —
        // an unreachable number, a bounced domain. Reporting that as delivered leaves the customer
        // waiting for a receipt that was never on its way.
        if (!res || res.sent === false) {
          this.error = this.$i('pos_receipt_sms_fail');
          return;
        }
        this.sentTo = (res && res.recipient) || this.recipient.trim();
        this.sentChannel = (res && res.channel) || (this.looksLikeEmail ? 'Email' : 'Sms');
        this.open = false;
        this.$emit('sent', res);
      } catch (e) {
        this.error = this.pos.errMsg(e);
      } finally {
        this.busy = false;
      }
    }
  }
};
</script>

<style scoped>
.rsend__open {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 54px;
  border: none;
  border-radius: 14px;
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}
.rsend__open:hover { background: var(--pos-primary-dark, #159f63); }
.rsend__open svg { width: 20px; height: 20px; }

.rsend__label {
  display: block;
  margin: 0 0 6px;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}
.rsend__row { display: flex; gap: 8px; }
.rsend__input {
  flex: 1;
  min-width: 0;
  min-height: 50px;
  padding: 0 14px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1.05rem;
  color: var(--pos-ink, #292c34);
}
.rsend__input:focus { outline: none; border-color: var(--pos-primary, #1bb776); }
.rsend__go {
  flex-shrink: 0;
  min-height: 50px;
  padding: 0 20px;
  border: none;
  border-radius: 12px;
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
}
.rsend__go:disabled { background: #cbd5e0; cursor: default; }

.rsend__hint { margin: 8px 0 0; color: #94a3b8; font-size: 0.8rem; }
.rsend__error { margin: 8px 0 0; color: #ef4444; font-size: 0.88rem; font-weight: 600; }

.rsend__done {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(27, 183, 118, 0.1);
  color: var(--pos-primary-dark, #159f63);
  font-weight: 700;
}
.rsend__done svg { width: 20px; height: 20px; flex-shrink: 0; }
.rsend__done-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.rsend__again {
  margin-left: auto;
  flex-shrink: 0;
  border: none;
  background: none;
  color: var(--pos-primary-dark, #159f63);
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}
</style>

<template>
  <!-- `allow-non-admin`, for the same reason `/admin/workforce-me` sets it: this page is about the
       SIGNED-IN PERSON and takes no store id. A shop assistant with no admin membership anywhere has
       an account address like everybody else, and the shell would otherwise bounce them to
       /registrer from a link its own sidebar offers them. Authentication is still required — that is
       a different flag and this page does not touch it. -->
  <AdminPage allow-non-admin @login-success="init">
    <div class="ae-page">
      <div class="ae-page__header">
        <h1 class="ae-page__title">
          {{ $i('ae_page_title') }}
        </h1>
        <p class="ae-page__intro">
          {{ $i('ae_page_intro') }}
        </p>
      </div>

      <transition name="ae-toast">
        <div v-if="toast.show" class="ae-page__toast" :class="'ae-page__toast--' + toast.type">
          {{ toast.message }}
        </div>
      </transition>

      <p v-if="!signedIn" class="ae-page__blocker">
        {{ $i('ae_signed_out') }}
      </p>

      <template v-else>
        <!-- 1. WHAT THE ACCOUNT HOLDS, read from the account and not from the box below it. The
             difference matters the moment the operator starts typing: the field is a draft, the
             status is the server's answer, and a status derived from the field would flip to
             "confirmed" as soon as somebody retyped the address they already had. -->
        <section class="ae-page__panel">
          <h2 class="ae-page__panel-title">
            {{ $i('ae_status_label') }}
          </h2>
          <p class="ae-page__status">
            <span class="ae-page__badge" :class="'ae-page__badge--' + status">
              {{ $i('ae_status_' + status) }}
            </span>
            <!-- The address is shown to the person it belongs to, in their own account screen. That
                 is the product. It goes into NO message, no toast and no refusal — see the copy
                 block in translations/no.ts and `notify` below (C7). -->
            <span v-if="accountAddress" class="ae-page__address">{{ accountAddress }}</span>
          </p>
          <p class="ae-page__status-body">
            {{ $i('ae_status_' + status + '_body') }}
          </p>
          <!-- The way on, and the reason this screen exists at all: a confirmed address is what the
               newsletter test-send requires, and until this link there was no admin route to one. -->
          <nuxt-link v-if="status === 'confirmed'" class="ae-page__next" :to="'/admin/growth-newsletter'">
            {{ $i('ae_next_testsend') }}
          </nuxt-link>
        </section>

        <!-- 2. THE ADDRESS. Requesting a code is what sets it, so there is one field and not two:
             `POST /user/send-email-confirmation-code` writes the address AND mints the code in the
             same call, and a separate "save" control would imply an address can be stored without
             starting a confirmation. It cannot. -->
        <section class="ae-page__panel">
          <label class="ae-page__field">
            <span>{{ $i('ae_address_label') }}</span>
            <input
              v-model="addressField"
              type="email"
              autocomplete="email"
              :placeholder="$i('ae_address_placeholder')"
              :disabled="busy.any"
              @input="onAddressInput"
            >
          </label>
          <p v-if="addressInvalid" class="ae-page__error">
            {{ $i('ae_address_invalid') }}
          </p>
          <div class="ae-page__actions">
            <button
              type="button"
              class="ae-page__btn ae-page__btn--primary"
              :disabled="busy.any || !addressField"
              @click="requestCode"
            >
              {{ busy.send ? $i('ae_sending') : (codeStep ? $i('ae_send_code_again') : $i('ae_send_code')) }}
            </button>
          </div>
        </section>

        <!-- 3. THE CODE. Only after a request this session, because a code box standing open on a
             screen nobody has requested a code from is an invitation to guess at one. -->
        <section v-if="codeStep" class="ae-page__panel ae-page__panel--code">
          <!-- WHAT THIS SCREEN IS NOT ALLOWED TO CLAIM. The service hands the mail to a task it does
               not await and answers before the provider has been asked, so a truthful screen says
               the code was ORDERED. "We have sent you a code" would be a delivery claim built from a
               response that contains no delivery — the same misreport the newsletter run counters
               exist to avoid. -->
          <p class="ae-page__notice">
            {{ $i('ae_code_requested') }}
          </p>
          <label class="ae-page__field ae-page__field--code">
            <span>{{ $i('ae_code_label') }}</span>
            <input
              v-model="codeField"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              :disabled="busy.any"
              @input="onCodeInput"
            >
          </label>
          <p class="ae-page__help">
            {{ $i('ae_code_help') }}
          </p>
          <p v-if="codeInvalid" class="ae-page__error">
            {{ $i(codeErrorKey) }}
          </p>
          <div class="ae-page__actions">
            <button
              type="button"
              class="ae-page__btn ae-page__btn--primary"
              :disabled="busy.any || !codeField"
              @click="confirmCode"
            >
              {{ busy.confirm ? $i('ae_confirming') : $i('ae_confirm') }}
            </button>
          </div>
        </section>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';

// The client-side shape check, and the ONE reason it is not merely a nicety.
//
// `UserService.SendEmailConfirmationCodeAsync` parses the address with `MailboxAddress.Parse`, which
// throws a MimeKit `ParseException` on a malformed value — and `UserController` catches only
// `AppException`, so the throw escapes as an unhandled 500. An operator who typed one character
// wrong therefore got a server error rather than "that is not an address". Refusing the obviously
// malformed value here means this screen's user never provokes it.
//
// It does NOT close the defect: any other caller of that route still can, so the server-side half is
// recorded as a finding by the journey rather than claimed as fixed here. And it is deliberately the
// same permissive shape the consumer app uses — the point is to catch a typo before it becomes a
// 500, not to adjudicate which addresses exist.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_SHAPE = /^\d{6}$/;

const CONFIRMED = 'confirmed';
const UNCONFIRMED = 'unconfirmed';
const MISSING = 'missing';

// The signed-in person's own address, and the confirmation of it.
//
// WHY THIS PAGE EXISTS. `GrowthNewsletterService.RequireOwnAccountAddressAsync` binds a newsletter
// test-send to the acting administrator's own account address AND requires that address to be
// confirmed — closing a markedsføringsloven § 15 hole, because a test-send otherwise put marketing
// in front of a mailbox that had consented to nothing. That refusal is deny-closed by design: an
// administrator with no confirmed address simply cannot test-send. It was ruled defensible because
// confirming is a live product path — and it is, end to end, with a real mail — but the ONLY UI call
// site for it in the whole estate was the consumer app (`ConsumerApp EmailSetting.vue`). Neither
// admin surface called either route, so a phone-signup administrator's way out was to install the
// consumer app or to curl the API. This screen is the missing call site (C3).
//
// WHAT IT DOES NOT DO. It makes the confirmation REACHABLE; it does not make it STRONG. The code is
// six digits with no attempt counter, no lockout on that path and no rate limit, and a wrong guess
// does not invalidate it — `UserService.ConfirmEmailAsync` clears the code only on success. Those
// limits are a separate lane's subject. Nothing on this screen may be read as saying § 15 is closed.
export default {
  name: 'AdminAccountEmail',
  components: { AdminPage },
  data () {
    return {
      /**
       * The account as the SERVER last described it, or `null` when that has not been read.
       *
       * Never written from a successful confirm. `confirmCode` re-reads the account instead, so what
       * this screen reports as confirmed is the account row answering, not this page remembering
       * that it asked. That distinction is the whole subject of the page.
       */
      account: null,
      addressField: '',
      codeField: '',
      addressInvalid: false,
      codeInvalid: false,
      codeErrorKey: 'ae_code_invalid',
      /** A code has been requested THIS SESSION. Not persisted: an old request is not a live one. */
      codeStep: false,
      busy: { send: false, confirm: false, any: false },
      toast: { show: false, message: '', type: 'success' },
      toastTimer: null
    };
  },
  computed: {
    signedIn () {
      return !!this.$store.getters.userIsLoggedIn;
    },
    currentUser () {
      return this.$store.state.currentUser || {};
    },
    accountAddress () {
      return (this.account && this.account.email) || '';
    },
    /**
     * Three states, never a boolean.
     *
     * "Has an address that is not confirmed" and "has no address at all" are different situations
     * with different next steps — and the second is the ordinary one for an administrator who signed
     * up by phone. A screen with one negative state would tell that person to check a mailbox no
     * code was ever sent to.
     */
    status () {
      if (!this.account) { return MISSING; }
      if (!this.account.email) { return MISSING; }
      return this.account.emailConfirmed ? CONFIRMED : UNCONFIRMED;
    }
  },
  mounted () {
    // An already-signed-in admin lands here with a session in hand; `AdminPage`'s `@login-success`
    // covers the case where the session arrives after mount. `init` guards on both.
    this.init();
  },
  beforeDestroy () {
    if (this.toastTimer) { clearTimeout(this.toastTimer); }
  },
  methods: {
    async init () {
      if (!this.signedIn) { return; }
      // THE ACCOUNT IS RE-READ, not taken from the store as it stands. `AdminPage.initAuth` does
      // call `Reload()` on mount, but this page is also reached by client-side navigation from the
      // sidebar, where the shell does not remount — and a stale `emailConfirmed` here is exactly the
      // wrong thing to be stale, because it is the fact the whole screen reports.
      await this._userService.Reload();
      this.account = {
        email: this.currentUser.email || '',
        emailConfirmed: !!this.currentUser.emailConfirmed
      };
      // Seeded from the account so the ordinary case — confirm the address already on file — needs
      // no retyping. Only when there is nothing on file is the box left empty.
      this.addressField = this.account.email || '';
      // An unconfirmed address on file means a confirmation is already outstanding: the server minted
      // a code when that address was set and it is valid for fifteen minutes. Opening the code step
      // is what lets somebody finish a confirmation they started somewhere else — in the consumer
      // app, or on a previous visit here — instead of being made to request a second code.
      this.codeStep = this.status === UNCONFIRMED;
    },

    onAddressInput () {
      this.addressInvalid = false;
    },

    onCodeInput () {
      this.codeInvalid = false;
    },

    async requestCode () {
      const address = (this.addressField || '').trim();
      if (!EMAIL_SHAPE.test(address)) {
        this.addressInvalid = true;
        return;
      }
      await this.run_('send', async () => {
        const ok = await this._userService.SendEmailConfirmationCode(address);
        if (!ok) {
          this.notify(this.$i('ae_send_failed'), 'error');
          return;
        }
        // A fresh request supersedes whatever was typed before it. Left in place, a stale six digits
        // sit in the box under a notice saying a NEW code was ordered.
        this.codeField = '';
        this.codeInvalid = false;
        this.codeStep = true;
        // The account has changed underneath us — the address is now set and unconfirmed — so the
        // status is re-read rather than assumed.
        await this.refreshAccount();
      });
    },

    async confirmCode () {
      const code = (this.codeField || '').trim();
      if (!CODE_SHAPE.test(code)) {
        this.codeErrorKey = 'ae_code_invalid';
        this.codeInvalid = true;
        return;
      }
      await this.run_('confirm', async () => {
        const ok = await this._userService.ConfirmEmail(code);
        if (!ok) {
          // NOTHING ABOUT WHICH DIGITS WERE WRONG, and no count of attempts — because there is no
          // count. The server neither limits attempts nor invalidates the code on a wrong guess, so
          // a message implying a budget would be inventing a protection that does not exist.
          this.codeErrorKey = 'ae_confirm_failed';
          this.codeInvalid = true;
          return;
        }
        // THE SERVER IS ASKED AGAIN. Setting `emailConfirmed = true` here would make the screen
        // report its own optimism: the badge would read "confirmed" for anyone whose confirm call
        // returned truthy for any reason at all, including a shape this client misread. The account
        // row is the only thing entitled to say the address is confirmed.
        await this.refreshAccount();
        this.codeField = '';
        this.codeStep = this.status === UNCONFIRMED;
        this.notify(this.$i('ae_confirmed_toast'));
      });
    },

    async refreshAccount () {
      await this._userService.Reload();
      this.account = {
        email: this.currentUser.email || '',
        emailConfirmed: !!this.currentUser.emailConfirmed
      };
    },

    /** One in-flight write at a time, and `any` is what every control disables on. */
    async run_ (key, fn) {
      if (this.busy.any) { return; }
      this.busy[key] = true;
      this.busy.any = true;
      try {
        await fn();
      } catch (error) {
        // The error OBJECT is not rendered and not logged. It can carry the request body, and the
        // request body carries the address on the way out and the code on the way back (C7).
        this.notify(this.$i(key === 'confirm' ? 'ae_confirm_failed' : 'ae_send_failed'), 'error');
      } finally {
        this.busy[key] = false;
        this.busy.any = false;
      }
    },

    /**
     * Every message this screen shows.
     *
     * It takes a rendered string and no params, and that is deliberate rather than incidental: with
     * no interpolation there is nowhere an address or a six-digit code could be threaded into a
     * sentence that then reaches a screenshot, a support ticket or a log sink.
     */
    notify (message, type) {
      this.toast = { show: true, message, type: type || 'success' };
      if (this.toastTimer) { clearTimeout(this.toastTimer); }
      this.toastTimer = setTimeout(() => { this.toast.show = false; }, 6000);
    }
  }
};
</script>

<style lang="scss" scoped>
.ae-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }
}

.ae-page__header {
  margin-bottom: 32px;
}

.ae-page__title {
  font-size: 2em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 8px 0;

  @media (max-width: 768px) {
    font-size: 1.5em;
  }
}

.ae-page__intro {
  color: #64748b;
  margin: 0;
}

.ae-page__panel {
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
}

.ae-page__panel-title {
  font-size: 1.1em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 16px 0;
}

.ae-page__status {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin: 0 0 8px 0;
}

.ae-page__badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 0.85em;
  font-weight: 600;
}

.ae-page__badge--confirmed {
  background: rgba(27, 183, 118, 0.12);
  color: #159f63;
}

.ae-page__badge--unconfirmed,
.ae-page__badge--missing {
  background: rgba(146, 64, 14, 0.1);
  color: #92400e;
}

.ae-page__address {
  color: #292c34;
  font-weight: 500;
}

.ae-page__status-body {
  color: #64748b;
  font-size: 0.95em;
  margin: 0;
}

.ae-page__next {
  display: inline-block;
  margin-top: 16px;
  color: #159f63;
  font-weight: 600;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.ae-page__field {
  display: block;
  margin-bottom: 8px;

  span {
    display: block;
    margin-bottom: 8px;
    font-size: 0.85em;
    font-weight: 600;
    color: #292c34;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  input {
    width: 100%;
    padding: 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
    font-size: 0.95em;
    color: #292c34;
    transition: all 0.3s ease;

    &:hover {
      border-color: #cbd5e0;
    }

    &:focus {
      outline: none;
      border-color: #1bb776;
      box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
    }

    &::placeholder {
      color: #94a3b8;
    }
  }
}

.ae-page__field--code input {
  max-width: 180px;
  letter-spacing: 4px;
  font-size: 1.2em;
}

.ae-page__help {
  font-size: 0.8em;
  color: #64748b;
  font-style: italic;
  margin: 0 0 8px 0;
}

.ae-page__notice {
  background: #f8f9fa;
  border-left: 3px solid #cbd5e0;
  padding: 12px 16px;
  border-radius: 6px;
  color: #292c34;
  font-size: 0.95em;
  margin: 0 0 20px 0;
}

.ae-page__error {
  color: #ef4444;
  font-size: 0.9em;
  margin: 0 0 8px 0;
}

.ae-page__blocker {
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  color: #292c34;
}

.ae-page__actions {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 16px;
}

.ae-page__btn {
  background: #fff;
  color: #292c34;
  border: 2px solid #e2e8f0;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.95em;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: #f8f9fa;
    border-color: #cbd5e0;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.ae-page__btn--primary {
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  color: #fff;
  border: none;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4);
  }

  &:disabled {
    background: #cbd5e0;
    box-shadow: none;
    transform: none;
  }
}

.ae-page__toast {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  font-size: 0.95em;
}

.ae-page__toast--success {
  background: rgba(27, 183, 118, 0.12);
  color: #159f63;
}

.ae-page__toast--error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.ae-toast-enter-active,
.ae-toast-leave-active {
  transition: opacity 0.3s ease;
}

.ae-toast-enter,
.ae-toast-leave-to {
  opacity: 0;
}
</style>

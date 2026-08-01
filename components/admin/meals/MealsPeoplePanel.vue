<template>
  <section class="meals-people">
    <h2 class="mls-title">
      {{ $i('meals_people_title') }}
    </h2>

    <!-- LEDGER ENTRY MIG-17 / decision D-MEALS-EMPREF, stated before anything can be issued.
         `MealsInvitation.EmployeeReference` and `MealsMembership.EmployeeReference` now exist and the
         form below captures one. What has NOT changed is the consequence of leaving it empty: the
         reference is company-supplied and can only be captured AT INVITATION — the company is in the
         loop at that moment and nowhere else — so a membership claimed without one can never acquire
         it. The invitation that would have carried it is Claimed, and finalized statement lines are
         immutable by trigger. `MealsStatementService` then falls back to the membership id, so every
         line of that person's monthly bill names them by a bare identifier, permanently.

         Hence the note is shown only while the field is EMPTY, and the acknowledgement is required
         only then. A warning that stayed up after the operator did the right thing would be the kind
         of notice people learn to click past, and the acknowledgement exists so that nobody does this
         unaware — not as a ritual. It is still not a block: the server permits the write, and a client
         inventing a ban the platform has not decided is not this screen's call. -->
    <div v-if="!employeeReferenceSupplied" class="mls-note mls-note--danger">
      <span class="mls-note__title">{{ $i('meals_mig17_title') }}</span>
      <span>{{ $i('meals_mig17_body') }}</span>
    </div>

    <!-- THE HANDOVER. Rendered instead of the form while a token is on screen, so the token cannot
         scroll off behind a second issue. -->
    <div v-if="issued" class="mls-form">
      <h3 class="mls-form__title">
        {{ $i('meals_token_title') }}
      </h3>

      <div class="mls-note mls-note--warn">
        <span class="mls-note__title">{{ $i('meals_token_not_sent_title') }}</span>
        <span>{{ $i('meals_token_not_sent_body') }}</span>
      </div>

      <label class="mls-label" for="meals-issued-token">
        {{ $i('meals_token_label') }}
      </label>
      <input
        id="meals-issued-token"
        ref="token"
        class="mls-token"
        type="text"
        readonly
        :value="issued.token"
        @focus="selectToken"
      >

      <p class="mls-hint">
        {{ $i('meals_token_recipient', { contact: issuedContact, role: issuedRoleLabel, expires: issuedExpiry }) }}
      </p>
      <p class="mls-hint">
        {{ $i('meals_token_bearer_note') }}
      </p>
      <!-- WHERE THE CODE GOES. This sentence used to say that no screen in the estate accepted one,
           which was true and is no longer: `pages/meals/join.vue` is the invitee's surface. It names
           the address rather than merely asserting a screen exists, because the operator is about to
           relay a bare string in a message and the recipient has to be told where to put it. -->
      <p class="mls-hint">
        {{ $i('meals_token_claim_screen', { link: claimLink }) }}
      </p>

      <button class="mls-btn" type="button" @click="copyToken">
        {{ copied ? $i('meals_token_copied') : $i('meals_token_copy') }}
      </button>
      <button class="mls-btn mls-btn--primary" type="button" @click="$emit('dismiss-issued')">
        {{ $i('meals_token_done') }}
      </button>
      <p v-if="copyFailed" class="mls-hint">
        {{ $i('meals_token_copy_failed') }}
      </p>
      <p class="mls-hint">
        {{ $i('meals_token_once_note') }}
      </p>
    </div>

    <!-- ISSUE AN INVITATION. -->
    <form v-else class="mls-form" @submit.prevent="submitInvitation">
      <h3 class="mls-form__title">
        {{ $i('meals_invite_title') }}
      </h3>
      <p class="mls-hint">
        {{ $i('meals_invite_intro') }}
      </p>

      <div class="mls-grid">
        <label class="mls-label">
          {{ $i('meals_field_contact_email') }}
          <input v-model="invite.email" class="mls-input" type="email" :disabled="busy">
        </label>
        <label class="mls-label">
          {{ $i('meals_field_contact_phone') }}
          <input v-model="invite.phone" class="mls-input" type="tel" :disabled="busy">
        </label>
        <label class="mls-label">
          {{ $i('meals_field_role') }}
          <select v-model="invite.role" class="mls-select" :disabled="busy">
            <option value="Employee">{{ $i('meals_role_employee') }}</option>
            <option value="CompanyAdmin">{{ $i('meals_role_admin') }}</option>
          </select>
        </label>
        <label class="mls-label">
          {{ $i('meals_field_expires_days') }}
          <input
            v-model="invite.expiresInDays"
            class="mls-input"
            type="number"
            min="1"
            max="90"
            :disabled="busy"
          >
        </label>
        <!-- THE FIELD THE WHOLE NOTE IS ABOUT. Spans the grid because it is not a fourth attribute of
             equal weight: it is the one input on this form that cannot be supplied later. The server
             refuses a fødselsnummer here (decision D-d); this value is copied into an export the
             restaurant hands the buying company. -->
        <label class="mls-label mls-label--wide">
          {{ $i('meals_field_employee_ref') }}
          <input
            v-model="invite.employeeReference"
            class="mls-input"
            type="text"
            maxlength="64"
            :disabled="busy"
          >
          <span class="mls-hint">{{ $i('meals_field_employee_ref_hint') }}</span>
        </label>
      </div>

      <label v-if="!employeeReferenceSupplied" class="mls-check">
        <input v-model="acknowledged" type="checkbox" :disabled="busy">
        <span>{{ $i('meals_mig17_ack') }}</span>
      </label>

      <p v-if="inviteError" class="mls-error">
        {{ $i(inviteError) }}
      </p>

      <MealsWriteFailure :failure-key="inviteFailureKey" :detail="inviteFailureDetail" />

      <button class="mls-btn mls-btn--primary" type="submit" :disabled="busy || !canIssue">
        {{ busy ? $i('meals_saving') : $i('meals_invite_action') }}
      </button>
    </form>

    <!-- INVITATIONS ISSUED. The token is not here and cannot be: only the create response carries
         it, and the server stores a hash. -->
    <h3 class="mls-subtitle">
      {{ $i('meals_invitations_title') }}
    </h3>

    <p v-if="invitationsUnknown" class="mls-note mls-note--warn">
      {{ $i(invitationsRefusalKey) }}
    </p>
    <p v-else-if="invitations.isEmpty" class="mls-note">
      {{ $i('meals_invitations_none') }}
    </p>
    <table v-else class="mls-table">
      <thead>
        <tr>
          <th scope="col">
            {{ $i('meals_col_contact') }}
          </th>
          <th scope="col">
            {{ $i('meals_col_role') }}
          </th>
          <th scope="col">
            {{ $i('meals_col_status') }}
          </th>
          <th scope="col">
            {{ $i('meals_col_expires') }}
          </th>
          <th scope="col" />
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in invitations.rows" :key="row.invitationId">
          <td>{{ contactOf(row) }}</td>
          <td>{{ roleLabel(row.intendedRole) }}</td>
          <td>
            <span class="mls-badge" :class="invitationBadge(row)">{{ invitationStateLabel(row) }}</span>
          </td>
          <td>{{ instant(row.expiresAtUtc) }}</td>
          <td>
            <!-- The mitigation when a relayed token goes somewhere it should not have. Only a
                 Pending invitation can be revoked: a Claimed one already produced a membership and
                 revoking the invitation would not undo that, which is why the server refuses it and
                 no button is offered here either. -->
            <button
              v-if="row.isRevocable"
              class="mls-btn mls-btn--danger mls-btn--small"
              type="button"
              :disabled="busy"
              @click="$emit('revoke-invitation', { invitationId: row.invitationId, expectedVersion: row.revision })"
            >
              {{ $i('meals_invite_revoke') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <MealsWriteFailure :failure-key="revokeFailureKey" :detail="revokeFailureDetail" />

    <!-- MEMBERSHIPS. -->
    <h3 class="mls-subtitle">
      {{ $i('meals_members_title') }}
    </h3>

    <p v-if="membersUnknown" class="mls-note mls-note--warn">
      {{ $i(membersRefusalKey) }}
    </p>
    <p v-else-if="members.isEmpty" class="mls-note">
      {{ $i('meals_members_none') }}
    </p>
    <template v-else>
      <table class="mls-table">
        <thead>
          <tr>
            <th scope="col">
              {{ $i('meals_col_member_ref') }}
            </th>
            <th scope="col">
              {{ $i('meals_col_account') }}
            </th>
            <th scope="col">
              {{ $i('meals_col_role') }}
            </th>
            <th scope="col">
              {{ $i('meals_col_status') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in members.rows" :key="row.membershipId">
            <!-- This column is not an implementation detail on display. It is verbatim what
                 `MealsStatementService` writes into `MemberDisplayRef` on every statement line, so
                 it is what the buying company's accountant will be reconciling against — the
                 company's own reference where one was supplied, and the membership id where the
                 invitation was issued without one. The fallback rows are marked because they are the
                 ones nothing can fix, not because a GUID is ugly. -->
            <td class="mls-ref">
              {{ row.statementRef || dash }}
              <span v-if="!row.hasEmployeeReference" class="mls-badge mls-badge--warn">{{ $i('meals_member_ref_missing') }}</span>
            </td>
            <td class="mls-ref">
              {{ row.applicationUserId || dash }}
            </td>
            <td>{{ roleLabel(row.role) }}</td>
            <td>
              <span class="mls-badge" :class="row.state === 'Active' ? 'mls-badge--on' : 'mls-badge--off'">
                {{ memberStateLabel(row) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <p class="mls-note mls-note--warn">
        {{ $i('meals_members_display_note') }}
      </p>
    </template>
  </section>
</template>

<script>
import MealsWriteFailure from '~/components/admin/meals/MealsWriteFailure.vue';
import { DATA_UNKNOWN } from '~/utils/meals/admin-view';
import { refusalKey, SCOPE_COMPANY } from '~/utils/meals/refusal-copy';
import { parseApiInstant } from '~/utils/workforce/week-range';

/**
 * Invitations and memberships — the module's on-ramp, and the two places its honesty is hardest.
 *
 * ONE: NOTHING SENDS AN INVITATION. There is no outbox, no mail and no SMS anywhere in the module;
 * `MealsMembershipService.CreateInvitationAsync` hands the plaintext token back on the HTTP response
 * and stores only its hash. So the token has to be on screen — otherwise the invitation reaches
 * nobody at all — and the screen has to be unmistakable that the product did not deliver it. There
 * is deliberately NO "send" button: a button that merely looked like delivery would be worse than no
 * button, because an operator would stop relaying and the invitations would silently go nowhere.
 *
 * The handover follows the treatment `utils/workforce/roster-client.js:29` records for the same
 * problem on the Workforce claim token — "show once, copy, confirm sent, rather than a button on a
 * table row that can be double-clicked into an unrecoverable token". Hence: the token replaces the
 * form while it is up, it is readonly and select-on-focus, and dismissing it is an explicit act.
 *
 * TWO: LEDGER ENTRY MIG-17 — see the note at the top of the template. Issuing an invitation today
 * produces a membership that will appear on every statement line as a bare identifier, permanently
 * and unfixably. The write is gated on an explicit acknowledgement, and the member table shows the
 * identifier the statement will actually carry rather than hiding it behind a friendlier column.
 */
export default {
  name: 'MealsPeoplePanel',
  components: { MealsWriteFailure },
  props: {
    invitations: { type: Object, required: true },
    members: { type: Object, required: true },
    /** The `MealsInvitationCreatedModel` from the last create — the ONLY carrier of the token. */
    issued: { type: Object, default: null },
    /** BCP-47 tag for the expiry labels; the page passes the admin locale. */
    locale: { type: String, default: 'no' },
    busy: { type: Boolean, default: false },
    inviteFailureKey: { type: String, default: null },
    inviteFailureDetail: { type: String, default: null },
    revokeFailureKey: { type: String, default: null },
    revokeFailureDetail: { type: String, default: null }
  },
  data () {
    return {
      dash: '—',
      acknowledged: false,
      copied: false,
      copyFailed: false,
      inviteError: null,
      invite: {
        email: '',
        phone: '',
        role: 'Employee',
        expiresInDays: 14,
        employeeReference: ''
      }
    };
  },
  computed: {
    /** Whether the one irreversible field has been filled in. Drives the note, the acknowledgement
     *  and the submit gate, so those three can never disagree with each other. */
    employeeReferenceSupplied () {
      return String(this.invite.employeeReference || '').trim() !== '';
    },
    /** Issue when the reference is there, or when its absence has been acknowledged. */
    canIssue () {
      return this.employeeReferenceSupplied || this.acknowledged;
    },
    invitationsUnknown () {
      return this.invitations.state === DATA_UNKNOWN;
    },
    invitationsRefusalKey () {
      return refusalKey(this.invitations.refusal, SCOPE_COMPANY);
    },
    membersUnknown () {
      return this.members.state === DATA_UNKNOWN;
    },
    membersRefusalKey () {
      return refusalKey(this.members.refusal, SCOPE_COMPANY);
    },
    issuedContact () {
      if (!this.issued) { return this.dash; }
      return this.issued.intendedContactEmail || this.issued.intendedContactPhone || this.dash;
    },
    /**
     * Where to send the person the code is for.
     *
     * Built from the browser's own origin rather than from configuration: this app serves the
     * marketing site and `/admin` from one host, so the origin the operator is reading this on IS
     * the host the claim page is served from. It deliberately carries NO token — the claim page
     * accepts the code as a paste, and a link with the credential in it is a link an operator would
     * reasonably forward, which is the thing the note above tells them not to do.
     */
    claimLink () {
      const origin = (typeof window !== 'undefined' && window.location && window.location.origin) || '';
      return origin + '/meals/join';
    },
    issuedRoleLabel () {
      return this.issued ? this.roleLabel(this.issued.intendedRole) : this.dash;
    },
    issuedExpiry () {
      return this.issued ? this.instant(this.issued.expiresAtUtc) : this.dash;
    }
  },
  watch: {
    // A fresh token means a fresh handover: the copy state must not read "copied" for a token this
    // operator has not copied.
    issued () {
      this.copied = false;
      this.copyFailed = false;
    }
  },
  methods: {
    contactOf (row) {
      return row.intendedContactEmail || row.intendedContactPhone || this.dash;
    },
    roleLabel (role) {
      switch (role) {
      case 'CompanyAdmin': return this.$i('meals_role_admin');
      case 'Employee': return this.$i('meals_role_employee');
      // A role this client has not heard of is shown verbatim rather than mapped onto one it knows.
      default: return role || this.dash;
      }
    },
    invitationStateLabel (row) {
      switch (row.state) {
      case 'Pending': return this.$i('meals_invite_pending');
      case 'Claimed': return this.$i('meals_invite_claimed');
      case 'Revoked': return this.$i('meals_invite_revoked');
      case 'Expired': return this.$i('meals_invite_expired');
      default: return row.state || this.dash;
      }
    },
    invitationBadge (row) {
      switch (row.state) {
      case 'Claimed': return 'mls-badge--on';
      case 'Pending': return 'mls-badge--warn';
      default: return 'mls-badge--off';
      }
    },
    memberStateLabel (row) {
      switch (row.state) {
      case 'Active': return this.$i('meals_status_active');
      case 'Revoked': return this.$i('meals_member_revoked');
      default: return row.state || this.dash;
      }
    },

    /**
     * An expiry instant, formatted in the READER's own zone and labelled as such by the column
     * header — the same treatment `MealsFundedOrders.vue` documents, and for the same reason: Meals
     * exposes no store timezone anywhere on this surface.
     *
     * It goes through `parseApiInstant`, never `new Date(iso)`: these stamps are loaded straight off
     * `datetime2` columns and serialise bare, which JS reads as browser-local wall clock.
     */
    instant (value) {
      const parsed = parseApiInstant(value);
      if (!parsed) { return this.dash; }
      return new Intl.DateTimeFormat(this.locale, {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      }).format(parsed);
    },

    selectToken () {
      const input = this.$refs.token;
      if (input && typeof input.select === 'function') { input.select(); }
    },

    /**
     * Copy, with the manual path left open rather than assumed away. The Clipboard API needs a
     * secure context and a permission, and the token is the one value on this page that cannot be
     * fetched again — so a failed copy says so and the field stays selectable.
     */
    copyToken () {
      this.copyFailed = false;
      const token = this.issued && this.issued.token;
      if (!token) { return; }

      const clipboard = typeof navigator !== 'undefined' && navigator.clipboard;
      if (!clipboard || typeof clipboard.writeText !== 'function') {
        this.copyFailed = true;
        this.selectToken();
        return;
      }

      clipboard.writeText(token).then(() => {
        this.copied = true;
      }).catch(() => {
        this.copyFailed = true;
        this.selectToken();
      });
    },

    submitInvitation () {
      this.inviteError = null;
      const email = String(this.invite.email || '').trim();
      const phone = String(this.invite.phone || '').trim();
      if (!email && !phone) { this.inviteError = 'meals_err_contact_required'; return; }

      const days = Number(this.invite.expiresInDays);
      if (!Number.isInteger(days) || days < 1 || days > 90) { this.inviteError = 'meals_err_expires_range'; return; }
      // The disabled attribute is not the only guard: an issue without the reference and without the
      // acknowledgement is refused here too, so a programmatic submit cannot slip past the one
      // decision on this form that nothing downstream can undo.
      if (!this.canIssue) { this.inviteError = 'meals_err_ack_required'; return; }

      const employeeReference = String(this.invite.employeeReference || '').trim();

      this.$emit('create-invitation', {
        intendedContactEmail: email || null,
        intendedContactPhone: phone || null,
        intendedRole: this.invite.role,
        // null, never '' — an empty string would reach the server as a supplied-but-blank reference,
        // and the column's honest absent value is NULL. The server normalizes blank to null as well;
        // sending null means both ends agree without depending on that.
        employeeReference: employeeReference || null,
        expiresInDays: days
      });
    },

    /** Called by the page once an invitation has landed: a fresh acknowledgement per invitation. */
    resetInvitation () {
      this.invite.email = '';
      this.invite.phone = '';
      // Cleared with the contact: a reference is per-person, and carrying the previous hire's payroll
      // number into the next invitation would attach it to the wrong member permanently.
      this.invite.employeeReference = '';
      this.acknowledged = false;
      this.inviteError = null;
    }
  }
};
</script>

<style lang="scss" scoped>
@import './meals-admin';

.meals-people {
  margin-bottom: 32px;
}
</style>

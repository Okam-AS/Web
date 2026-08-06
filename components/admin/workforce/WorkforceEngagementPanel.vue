<template>
  <aside class="wfr-panel">
    <div class="wfr-panel__head">
      <div>
        <h2 class="wfr-panel__title">
          {{ orDash(row.displayName) }}
        </h2>
        <p class="wfr-panel__sub">
          {{ $i('wfr_panel_engagement_of', { store: storeId }) }}
        </p>
      </div>
      <button class="wfr-panel__close" type="button" @click="$emit('close')">
        ×
      </button>
    </div>

    <!-- The person / engagement split, stated rather than implied. The manager is looking at ONE
         engagement; the human behind it is a chain-wide record that this store neither owns nor can
         see the rest of. -->
    <dl class="wfr-panel__facts">
      <dt>{{ $i('wfr_panel_person_state') }}</dt>
      <dd>{{ personStateLabel }}</dd>
      <dt>{{ $i('wfr_panel_contact') }}</dt>
      <dd v-if="detail">
        {{ orDash(detail.contactEmail) }} · {{ orDash(detail.contactPhone) }}
      </dd>
      <dd v-else class="is-unknown">
        {{ $i('wfr_panel_detail_unknown') }}
      </dd>
      <dt>{{ $i('wfr_panel_employer') }}</dt>
      <dd class="is-mono">
        {{ orDash(row.legalEmployerId) }}
      </dd>
      <dt>{{ $i('wfr_panel_active_window') }}</dt>
      <dd>{{ orDash(date(row.activeFromUtc)) }} → {{ orDash(date(row.activeToUtc)) }}</dd>
    </dl>

    <p v-if="row.engagementCount > 1" class="wfr-panel__note">
      {{ $i('wfr_panel_multi_engagement', { count: row.engagementCount }) }}
    </p>

    <!-- ACCESS ----------------------------------------------------------------------------------
         The engagement above authorises nothing until a LOGIN is attached to it, and a claim
         invitation is the only mechanism in the module that attaches one: `POST /staff` creates a
         person with no `ApplicationUserId`, and no other route ever sets it. Until this section
         existed the module could create staff who could never sign in, which made the whole
         self-service half — own shifts, availability, time off, acknowledgements — unreachable by
         any human. -->
    <section class="wfr-panel__section wfr-panel__section--access" data-test="section-access">
      <h3>{{ $i('wfr_panel_access') }}</h3>

      <p class="wfr-panel__hint" data-test="access-state">
        {{ accessStateLabel }}
      </p>

      <!-- THE HANDOVER. Rendered INSTEAD of the issue button while a token is on screen, so a second
           press cannot scroll the first token out of view — it is unrecoverable the moment it goes.
           The same rule `MealsPeoplePanel` keeps, for the same reason. -->
      <div v-if="invitation" class="wfr-panel__handover" data-test="invitation-handover">
        <!-- The token is null on an IDEMPOTENT REPLAY: the server stores a token-less outcome on
             purpose, so a replayed issue can answer with the invitation's metadata and nothing else.
             That is not a failure and must not read as one — the invitation exists and is pending;
             this caller simply cannot be shown it again. -->
        <template v-if="invitation.token">
          <div class="wfr-panel__warn">
            <strong>{{ $i('wfr_access_not_sent_title') }}</strong>
            <span>{{ $i('wfr_access_not_sent_body') }}</span>
          </div>

          <label class="wfr-panel__sublabel" for="wfr-invitation-token">
            {{ $i('wfr_access_token_label') }}
          </label>
          <input
            id="wfr-invitation-token"
            ref="token"
            class="wfr-panel__token"
            type="text"
            readonly
            data-test="invitation-token"
            :value="invitation.token"
            @focus="selectToken"
          >

          <!-- The address, named rather than assumed. What the manager relays is a bare string in a
               message, so the recipient has to be told where to put it — and the code and the
               destination travel as two things, never as one clickable link carrying the credential
               through somebody's chat history. -->
          <p class="wfr-panel__hint">
            {{ $i('wfr_access_token_where', { link: claimLink }) }}
          </p>
          <p class="wfr-panel__hint" data-test="invitation-expiry">
            {{ $i('wfr_access_token_expires', { expires: invitationExpiry }) }}
          </p>

          <div class="wfr-panel__handover-actions">
            <button class="wfr-panel__btn wfr-panel__btn--ghost" type="button" data-test="copy-token" @click="copyToken">
              {{ copied ? $i('wfr_access_token_copied') : $i('wfr_access_token_copy') }}
            </button>
            <button class="wfr-panel__btn" type="button" data-test="dismiss-token" @click="$emit('dismiss-invitation')">
              {{ $i('wfr_access_token_done') }}
            </button>
          </div>

          <p v-if="copyFailed" class="wfr-panel__danger">
            {{ $i('wfr_access_token_copy_failed') }}
          </p>
          <p class="wfr-panel__danger">
            {{ $i('wfr_access_token_once') }}
          </p>
        </template>

        <template v-else>
          <p class="wfr-panel__danger" data-test="invitation-replayed">
            {{ $i('wfr_access_token_replayed') }}
          </p>
          <button class="wfr-panel__btn" type="button" @click="$emit('dismiss-invitation')">
            {{ $i('wfr_access_token_done') }}
          </button>
        </template>
      </div>

      <template v-else>
        <!-- WHAT IS STILL OUTSTANDING. This block used to be a sentence saying it could not exist —
             that `WorkforceStaffController` bound issue and nothing else, so no client could know
             whether a code was live and none could withdraw one. Endpoints 6b and 6c landed and the
             sentence became false, which is why it is gone rather than softened.

             THE ROW'S STATE IS NOT LIVENESS, and rendering it would answer the manager's question
             backwards. `WorkforceInvitationState.Expired` is written by no code path: expiry is
             decided at READ TIME by comparing `expiresAtUtc`, so a code that lapsed a month ago is
             still `Pending` in its row. `isLive` is the server's own comparison — the SAME one the
             claim path makes — so a code this panel calls live is a code the claim path would still
             admit. Only `isLive` is rendered.

             NULL IS UNKNOWN, [] IS NONE. A failed read must not spend a frame claiming nobody holds
             a code, because that is the one wrong answer a manager would act on. -->
        <div class="wfr-panel__invites" data-test="invitation-list">
          <h4 class="wfr-panel__sublabel">
            {{ $i('wfr_access_live_heading') }}
          </h4>

          <p v-if="invitations === null" class="wfr-panel__hint is-unknown" data-test="invitations-unknown">
            {{ $i('wfr_access_live_unknown') }}
          </p>
          <p v-else-if="!engagementInvitations.length" class="wfr-panel__hint" data-test="invitations-none">
            {{ $i('wfr_access_live_none') }}
          </p>
          <ul v-else class="wfr-panel__invitelist">
            <li
              v-for="invite in engagementInvitations"
              :key="invite.invitationId"
              class="wfr-panel__invite"
              :class="{ 'is-live': invite.isLive }"
              :data-test="invite.isLive ? 'invitation-live' : 'invitation-lapsed'"
            >
              <p class="wfr-panel__invite-state">
                <template v-if="invite.isLive">
                  {{ $i('wfr_access_live_state', { expires: stamp(invite.expiresAtUtc) }) }}
                </template>
                <template v-else>
                  {{ $i('wfr_access_live_lapsed', { created: stamp(invite.createdAtUtc), expires: stamp(invite.expiresAtUtc) }) }}
                </template>
              </p>

              <!-- Withdrawing a LAPSED code is offered too, with different wording, because the read
                   returns Pending rows for ever and a lapsed one otherwise sits in this list until
                   somebody claims a code that can no longer be claimed. What it does there is
                   housekeeping, and the copy says so rather than implying danger was removed. -->
              <button
                class="wfr-panel__btn wfr-panel__btn--danger"
                type="button"
                data-test="revoke-invitation"
                :disabled="!canInvite || busy"
                @click="$emit('revoke-invitation', invite)"
              >
                {{ invite.isLive ? $i('wfr_access_revoke') : $i('wfr_access_revoke_lapsed') }}
              </button>

              <p class="wfr-panel__hint">
                {{ invite.isLive ? $i('wfr_access_revoke_hint') : $i('wfr_access_revoke_lapsed_hint') }}
              </p>
            </li>
          </ul>
        </div>

        <!-- What this read is and, just as importantly, what it is not: it never carries the code.
             The server keeps a fingerprint, so no screen can show a code a second time — which is
             why the handover above is the only place a token is ever on screen. -->
        <p class="wfr-panel__note" data-test="access-limits">
          {{ $i('wfr_access_list_note') }}
        </p>

        <label class="wfr-panel__sublabel" for="wfr-invitation-hours">
          {{ $i('wfr_access_expires_label') }}
        </label>
        <input
          id="wfr-invitation-hours"
          v-model="expiresInDays"
          class="wfr-panel__input"
          type="number"
          min="1"
          max="60"
          :disabled="!canInvite || busy"
        >
        <p class="wfr-panel__hint">
          {{ $i('wfr_access_expires_hint') }}
        </p>

        <button
          class="wfr-panel__btn"
          type="button"
          data-test="issue-invitation"
          :disabled="!canInvite || busy || !row.isActive"
          @click="$emit('issue-invitation', { expiresInHours: requestedHours })"
        >
          {{ isClaimed ? $i('wfr_access_reissue') : $i('wfr_access_issue') }}
        </button>

        <!-- An ended engagement resolves no capability, so a login attached to it can do nothing.
             The button is withheld rather than left to fail, and the reason is on screen. -->
        <p v-if="!row.isActive" class="wfr-panel__hint">
          {{ $i('wfr_access_ended') }}
        </p>
        <p v-else-if="isClaimed" class="wfr-panel__hint">
          {{ $i('wfr_access_reissue_hint') }}
        </p>
      </template>
    </section>

    <!-- CAPABILITIES ------------------------------------------------------------------------- -->
    <section class="wfr-panel__section" data-test="section-capabilities">
      <h3>{{ $i('wfr_panel_capabilities') }}</h3>
      <p class="wfr-panel__hint">
        {{ $i('wfr_panel_capabilities_hint') }}
      </p>
      <div class="wfr-panel__caps">
        <label v-for="capability in allCapabilities" :key="capability" class="wfr-panel__cap">
          <input
            type="checkbox"
            :checked="draftCapabilities.includes(capability)"
            :disabled="!canManage || busy"
            @change="toggleCapability(capability)"
          >
          <span>{{ $i('wfr_cap_' + short(capability)) }}</span>
          <small>{{ $i('wfr_cap_desc_' + short(capability)) }}</small>
        </label>
      </div>
      <p v-if="losingLastManager" class="wfr-panel__danger">
        {{ $i('wfr_last_manager_warning') }}
      </p>
      <button
        class="wfr-panel__btn"
        type="button"
        :disabled="!canManage || busy || !capabilitiesChanged || losingLastManager"
        @click="$emit('save-capabilities', draftCapabilities)"
      >
        {{ $i('wfr_save') }}
      </button>
    </section>

    <!-- THE ENGAGEMENT'S OWN NUMBERS ------------------------------------------------------------
         Payroll identifiers of the ENGAGEMENT, not of the person: the same human engaged at two
         venues carries two of these, and changing one here never touches the other. -->
    <section class="wfr-panel__section" data-test="section-numbers">
      <h3>{{ $i('wfr_panel_numbers') }}</h3>
      <div class="wfr-panel__termgrid wfr-panel__termgrid--pair">
        <input
          v-model.trim="draftEmploymentNumber"
          class="wfr-panel__input"
          type="text"
          :placeholder="$i('wfr_add_employment_number')"
          :disabled="!canManage || busy"
        >
        <input
          v-model.trim="draftPayrollNumber"
          class="wfr-panel__input"
          type="text"
          :placeholder="$i('wfr_add_payroll_number')"
          :disabled="!canManage || busy"
        >
      </div>
      <button
        class="wfr-panel__btn"
        type="button"
        :disabled="!canManage || busy || !numbersChanged"
        @click="$emit('save-numbers', { employmentNumber: draftEmploymentNumber, payrollNumber: draftPayrollNumber })"
      >
        {{ $i('wfr_save') }}
      </button>
    </section>

    <!-- ROLES -------------------------------------------------------------------------------- -->
    <section class="wfr-panel__section" data-test="section-roles">
      <h3>{{ $i('wfr_panel_roles') }}</h3>
      <!-- The single most important sentence on this panel. A role is a station, not a permission;
           the block above is where power lives. Planday conflates the two and this must not. -->
      <p class="wfr-panel__hint">
        {{ $i('wfr_panel_roles_hint') }}
      </p>
      <p v-if="roles === null" class="wfr-panel__unknown">
        {{ $i('wfr_panel_roles_unknown') }}
      </p>
      <p v-else-if="!roles.length" class="wfr-panel__unknown is-answered">
        {{ $i('wfr_panel_roles_none_defined') }}
      </p>
      <template v-else>
        <p v-if="staffRoles === null" class="wfr-panel__unknown">
          {{ $i('wfr_panel_staff_roles_unknown') }}
        </p>
        <div v-else class="wfr-panel__roles">
          <label v-for="role in roles" :key="role.roleId" class="wfr-panel__role">
            <input
              type="checkbox"
              :checked="draftRoles.includes(role.roleId)"
              :disabled="!canManage || busy"
              @change="toggleRole(role.roleId)"
            >
            <span>{{ orDash(role.name) }}</span>
            <small v-if="role.station">{{ role.station }}</small>
            <small v-if="role.retired" class="is-retired">{{ $i('wfr_role_retired') }}</small>
          </label>
        </div>
        <button
          class="wfr-panel__btn"
          type="button"
          :disabled="!canManage || busy || staffRoles === null || !rolesChanged"
          @click="$emit('save-roles', draftRoles)"
        >
          {{ $i('wfr_save') }}
        </button>
      </template>
    </section>

    <!-- EMPLOYMENT TERMS --------------------------------------------------------------------- -->
    <section class="wfr-panel__section" data-test="section-terms">
      <h3>{{ $i('wfr_panel_terms') }}</h3>
      <p v-if="terms === null" class="wfr-panel__unknown">
        {{ $i('wfr_panel_terms_unknown') }}
      </p>
      <p v-else-if="!terms.length" class="wfr-panel__unknown is-answered">
        {{ $i('wfr_panel_terms_none') }}
      </p>
      <ul v-else class="wfr-panel__terms">
        <li v-for="term in terms" :key="term.id" :class="{ 'is-open': term.isOpen }">
          <span class="wfr-panel__term-dates">
            {{ orDash(date(term.effectiveFromUtc)) }} → {{ orDash(date(term.effectiveToUtc)) }}
          </span>
          <span class="wfr-panel__term-fact">
            {{ $i('wfr_term_contract') }}: {{ contractLabel(term) }}
          </span>
          <span class="wfr-panel__term-fact">{{ $i('wfr_term_category') }}: {{ orDash(term.employmentCategory) }}</span>
          <!-- A null wage means two different things depending on who is asking, so the screen says
               which one it is instead of printing an empty field either way. -->
          <span class="wfr-panel__term-fact" :class="'is-wage-' + term.wageState">
            {{ $i('wfr_term_wage') }}: {{ wageLabel(term) }}
          </span>
        </li>
      </ul>

      <!-- Appending a term, not editing one. The server closes the previous open term at the new
           one's effective instant, so the history is a chain of non-overlapping facts rather than a
           field somebody overwrote. An engagement created on this page starts with no term at all,
           which is why the form is here rather than on a screen of its own. -->
      <div v-if="canManage && terms !== null" class="wfr-panel__termform">
        <label class="wfr-panel__sublabel">{{ $i('wfr_term_new') }}</label>
        <div class="wfr-panel__termgrid">
          <input
            v-model="newTerm.effectiveFromDate"
            class="wfr-panel__input"
            type="date"
            :disabled="busy"
          >
          <input
            v-model="newTerm.contractHoursPerWeek"
            class="wfr-panel__input"
            type="number"
            step="0.5"
            min="0"
            :placeholder="$i('wfr_term_hours_placeholder')"
            :disabled="busy"
          >
          <input
            v-model.trim="newTerm.employmentCategory"
            class="wfr-panel__input"
            type="text"
            :placeholder="$i('wfr_term_category')"
            :disabled="busy"
          >
        </div>
        <!-- Wage is offered only to a caller who may READ one: the endpoint refuses a wage write
             from anyone without the payroll capability, so showing the field otherwise would turn
             every save into a 403. -->
        <div v-if="hasPayrollApprover" class="wfr-panel__termgrid">
          <input
            v-model="newTerm.wageAmount"
            class="wfr-panel__input"
            type="number"
            step="0.01"
            min="0"
            :placeholder="$i('wfr_term_wage')"
            :disabled="busy"
          >
          <input
            v-model.trim="newTerm.wageCurrency"
            class="wfr-panel__input"
            type="text"
            :placeholder="$i('wfr_term_wage_currency')"
            :disabled="busy"
          >
          <input
            v-model.trim="newTerm.wageInterval"
            class="wfr-panel__input"
            type="text"
            :placeholder="$i('wfr_term_wage_interval')"
            :disabled="busy"
          >
        </div>
        <button
          class="wfr-panel__btn"
          type="button"
          :disabled="busy || !newTerm.effectiveFromDate"
          @click="$emit('save-term', newTerm)"
        >
          {{ $i('wfr_term_add') }}
        </button>
      </div>
    </section>

    <!-- ENDING ------------------------------------------------------------------------------- -->
    <section v-if="row.isActive" class="wfr-panel__section wfr-panel__section--end">
      <h3>{{ $i('wfr_panel_end') }}</h3>

      <!-- What ending actually does, in the order it will bite. None of it is a deletion: this
           surface binds no DELETE for anything. -->
      <ul class="wfr-panel__effects">
        <li>{{ $i('wfr_end_effect_shifts') }}</li>
        <li>{{ $i('wfr_end_effect_selfservice') }}</li>
        <li :class="openSessionClass">
          {{ openSessionLabel }}
        </li>
        <li class="is-safe">
          {{ $i('wfr_end_effect_personnel_list') }}
        </li>
      </ul>

      <p v-if="effects.stranding" class="wfr-panel__danger">
        {{ $i('wfr_last_manager_warning') }}
      </p>

      <label class="wfr-panel__endcheck">
        <input v-model="recordEndDate" type="checkbox" :disabled="busy">
        <span>{{ $i('wfr_end_record_date') }}</span>
      </label>
      <input v-if="recordEndDate" v-model="endDate" class="wfr-panel__input" type="date" :disabled="busy">
      <p v-if="recordEndDate" class="wfr-panel__danger">
        {{ $i('wfr_end_date_one_way') }}
      </p>

      <button
        class="wfr-panel__btn wfr-panel__btn--danger"
        type="button"
        :disabled="!canManage || busy || effects.stranding || blockedByOpenSession"
        @click="$emit('end', { recordEndDate, endDate })"
      >
        {{ $i('wfr_end_submit') }}
      </button>
    </section>

    <section v-else class="wfr-panel__section">
      <h3>{{ $i('wfr_panel_reactivate') }}</h3>
      <p class="wfr-panel__hint">
        {{ $i('wfr_reactivate_hint') }}
      </p>
      <!-- The end date is unclearable through this API, and the schedule refuses any shift past it.
           Reactivating such an engagement produces someone who is active and unschedulable. -->
      <p v-if="reactivationCap" class="wfr-panel__danger">
        {{ $i('wfr_reactivate_capped', { date: date(reactivationCap) }) }}
      </p>
      <button
        class="wfr-panel__btn"
        type="button"
        :disabled="!canManage || busy"
        @click="$emit('reactivate')"
      >
        {{ $i('wfr_reactivate_submit') }}
      </button>
    </section>
  </aside>
</template>

<script>
import {
  CAPABILITIES,
  CAPABILITY_MANAGER,
  SESSIONS_UNKNOWN,
  contractHoursPerWeek,
  formatDate,
  orDash,
  reactivationBlockedBy,
  WAGE_SET,
  WAGE_WITHHELD
} from '~/utils/workforce/roster';

// One engagement, in full: what this person may do here, which stations they work, what their
// contract says, and how the employment ends.
//
// The panel edits an ENGAGEMENT, never a person. Nothing here changes the human's chain-wide record
// — the surface exposes no route that would — and nothing here can see or say anything about that
// human's engagements at other stores.
export default {
  name: 'WorkforceEngagementPanel',
  props: {
    row: { type: Object, required: true },
    // The `GET /staff/{id}` body, or null when that read has not answered. Null is unknown, not
    // "this engagement has no contact details".
    detail: { type: Object, default: null },
    roster: { type: Object, required: true },
    roles: { type: Array, default: null },
    staffRoles: { type: Array, default: null },
    terms: { type: Array, default: null },
    effects: { type: Object, required: true },
    canManage: { type: Boolean, default: false },
    /**
     * Whether an invitation may be ISSUED — a strictly weaker condition than `canManage`.
     *
     * `canManage` folds in "the detail read answered with a revision", because every other write here
     * is the one PATCH and that route is a 400 without an `If-Match`. Endpoint 6 takes no
     * precondition header at all, so a caller who holds WorkforceManager can onboard somebody even
     * where no rowversion exists. Two props rather than one because collapsing them would make the
     * module's only way in unreachable on exactly those deployments.
     */
    canInvite: { type: Boolean, default: false },
    // Decides whether a term's null wage means "withheld" or "none", and whether the wage fields on
    // the term form may be offered at all.
    hasPayrollApprover: { type: Boolean, default: false },
    /**
     * The `WorkforceInvitationIssuedResponse` from the LAST issue on this engagement, or null.
     *
     * The only carrier of the raw token there will ever be: the server keeps a SHA-256 hash and
     * nothing else, and no read returns it. It is a prop rather than component state because the
     * page owns the call — and because keying the panel on `staffMemberId` (which the roster page
     * does) destroys this component when the selection moves, which is exactly the behaviour wanted:
     * one person's claim token must never be on screen under another person's name.
     */
    invitation: { type: Object, default: null },
    /**
     * The STORE'S outstanding invitations (`GET /workforce/stores/{storeId}/invitations`), or null
     * when that read has not answered.
     *
     * NULL IS UNKNOWN AND `[]` IS NONE, and the two are never collapsed: "nobody is holding a code"
     * is the one answer a manager would act on, so a failed read must never produce it.
     *
     * Store-scoped on the wire because "which codes are still out there" is a store-wide question;
     * this panel narrows it to the selected engagement. Every element carries `isLive` — the
     * server's read-time expiry comparison — and NO token and no token hash, at any level.
     */
    invitations: { type: Array, default: null },
    storeId: { type: [String, Number], default: '' },
    timeZoneId: { type: String, default: null },
    locale: { type: String, default: 'no' },
    busy: { type: Boolean, default: false },
    asOf: { type: Date, default: () => new Date() }
  },
  data () {
    return {
      draftCapabilities: (this.row.capabilities || []).slice(),
      draftRoles: (this.staffRoles || []).map(r => r.roleId),
      draftEmploymentNumber: this.row.employmentNumber || '',
      draftPayrollNumber: this.detail ? (this.detail.payrollNumber || '') : '',
      recordEndDate: false,
      endDate: '',
      // Days rather than the wire's hours: a manager thinks in days, and the endpoint's own default
      // is 14 days. Converted at the emit, never stored in two units.
      expiresInDays: '14',
      copied: false,
      copyFailed: false,
      newTerm: {
        effectiveFromDate: '',
        contractHoursPerWeek: '',
        employmentCategory: '',
        wageAmount: '',
        wageCurrency: '',
        wageInterval: ''
      }
    };
  },
  computed: {
    allCapabilities () { return CAPABILITIES; },
    personStateLabel () {
      return this.row.personState ? this.$i('wfr_person_' + String(this.row.personState).toLowerCase()) : this.$i('wfr_person_unknown');
    },
    /** `Claimed` is the ONE state that means a login is attached; everything else means none is. */
    isClaimed () {
      return String(this.row.personState || '') === 'Claimed';
    },
    /**
     * What the access section is allowed to claim about this engagement's sign-in.
     *
     * Derived from `personState` and from nothing else, deliberately. It answers whether a LOGIN is
     * attached, which is a different question from whether a code is outstanding — the invitation
     * list below answers that one, and neither sentence is allowed to stand in for the other. An
     * `Invited` engagement with no live code and one with a live code read identically here, and
     * that is correct: the difference is shown where it is actually known.
     */
    accessStateLabel () {
      switch (String(this.row.personState || '')) {
      case 'Claimed': return this.$i('wfr_access_state_claimed');
      case 'Invited': return this.$i('wfr_access_state_invited');
      case 'Archived': return this.$i('wfr_access_state_archived');
      default: return this.$i('wfr_access_state_unknown');
      }
    },
    /**
     * This engagement's slice of the store-wide invitation read.
     *
     * `null` propagates as `[]` ONLY through the template's own `v-if="invitations === null"` guard,
     * which is checked first — this computed never has to distinguish them, and callers must not use
     * its emptiness as an answer.
     *
     * LIVE ONES FIRST, then lapsed, each group by expiry. The server orders by `expiresAtUtc`, which
     * on a mixed list puts the long-dead code above a live one; a manager scanning for "is anything
     * out there" needs the live ones where their eye lands. The comparison is on `isLive` — the
     * server's own read-time verdict — never on `state`, which is `Pending` for both.
     */
    engagementInvitations () {
      const mine = (this.invitations || []).filter(i => i && i.staffMemberId === this.row.staffMemberId);
      return mine.slice().sort((a, b) => {
        if (!!a.isLive !== !!b.isLive) { return a.isLive ? -1 : 1; }
        return String(a.expiresAtUtc || '').localeCompare(String(b.expiresAtUtc || ''));
      });
    },
    /** Days on screen, hours on the wire. Out-of-range or non-numeric input sends null — the server's default. */
    requestedHours () {
      const days = Number(this.expiresInDays);
      if (!isFinite(days) || days < 1 || days > 60) { return null; }
      return Math.round(days) * 24;
    },
    /**
     * Where the worker goes. The ORIGIN this admin page is served from, because the claim page is a
     * route in this same app — never a configured host, which would silently point at the wrong
     * deployment. It deliberately carries NO token: the credential and the destination are relayed as
     * two separate things, so neither a chat log nor a screenshot of the address is enough on its own.
     */
    claimLink () {
      const origin = (typeof window !== 'undefined' && window.location) ? window.location.origin : '';
      return origin + '/workforce/join';
    },
    invitationExpiry () {
      return this.stamp(this.invitation && this.invitation.expiresAtUtc);
    },
    capabilitiesChanged () {
      const before = (this.row.capabilities || []).slice().sort().join(',');
      return before !== this.draftCapabilities.slice().sort().join(',');
    },
    // The payroll number only ever arrives on the DETAIL read (`GET /staff` omits it), so a save is
    // offered only once that read has answered — otherwise an empty box would look like a value and
    // saving would blank a number nobody had seen.
    numbersChanged () {
      if (!this.detail) { return false; }
      return this.draftEmploymentNumber !== (this.row.employmentNumber || '') ||
        this.draftPayrollNumber !== (this.detail.payrollNumber || '');
    },
    rolesChanged () {
      const before = (this.staffRoles || []).map(r => r.roleId).slice().sort().join(',');
      return before !== this.draftRoles.slice().sort().join(',');
    },
    // Stripping WorkforceManager from the store's only remaining active manager is the same
    // one-way door as ending their engagement: capabilities are resolved ONLY from an active
    // engagement's grant bits, and no endpoint could grant them back afterwards.
    losingLastManager () {
      const held = (this.row.capabilities || []).includes(CAPABILITY_MANAGER);
      const keeping = this.draftCapabilities.includes(CAPABILITY_MANAGER);
      return this.row.isActive && held && !keeping && this.roster.activeManagerCount === 1;
    },
    openSessionLabel () {
      if (this.effects.openSessions === SESSIONS_UNKNOWN) { return this.$i('wfr_end_effect_punches_unknown'); }
      if (!this.effects.openSessions) { return this.$i('wfr_end_effect_punches_clear'); }
      return this.$i('wfr_end_effect_punches_open', { count: this.effects.openSessions });
    },
    openSessionClass () {
      if (this.effects.openSessions === SESSIONS_UNKNOWN) { return 'is-unknown'; }
      return this.effects.openSessions ? 'is-danger' : 'is-safe';
    },
    // A KNOWN open session blocks the button. An UNKNOWN one does not — refusing on an unanswered
    // check would make an unrelated 403 an unliftable block — but it is never allowed to render as
    // a clear either, which is what the label above does.
    blockedByOpenSession () {
      return this.effects.openSessions !== SESSIONS_UNKNOWN && this.effects.openSessions > 0;
    },
    reactivationCap () {
      return reactivationBlockedBy(this.row, this.asOf);
    }
  },
  watch: {
    // The panel is reused as the selection moves, so the drafts follow the row rather than keeping
    // the previous person's edits.
    'row.staffMemberId' () {
      this.draftCapabilities = (this.row.capabilities || []).slice();
      this.recordEndDate = false;
      this.endDate = '';
      this.newTerm = { effectiveFromDate: '', contractHoursPerWeek: '', employmentCategory: '', wageAmount: '', wageCurrency: '', wageInterval: '' };
    },
    staffRoles (value) {
      this.draftRoles = (value || []).map(r => r.roleId);
    },
    // The payroll number is only on the detail read, so the box fills in when that answers rather
    // than sitting empty and inviting a save that would blank it.
    detail (value) {
      this.draftPayrollNumber = value ? (value.payrollNumber || '') : '';
    },
    // A fresh token is a fresh handover. Leaving "Kopiert" standing would tell the manager they had
    // already relayed a code they have not yet seen — and the previous one is now dead.
    invitation () {
      this.copied = false;
      this.copyFailed = false;
    }
  },
  methods: {
    orDash,
    short (capability) { return capability.replace('Workforce', '').toLowerCase(); },
    date (instant) { return formatDate(instant, this.timeZoneId, this.locale); },
    /**
     * A Workforce instant, rendered to the minute in the STORE'S zone.
     *
     * The Workforce surface serialises column-loaded stamps BARE (no `Z`), and JS reads a bare ISO
     * string as browser-LOCAL — which would move every expiry by the viewer's own offset and let a
     * manager in one zone read a code as live an hour after it died. The `Z` is supplied when the
     * string carries no designator of its own.
     *
     * An unreadable stamp returns the "we could not read it" phrase rather than `Invalid Date`: this
     * renders inside a sentence about whether a credential is still usable, and a broken date there
     * has to read as unknown rather than as a time.
     */
    stamp (raw) {
      if (!raw) { return this.$i('wfr_access_expiry_unknown'); }
      const parsed = new Date(/[Zz]|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : raw + 'Z');
      if (isNaN(parsed.getTime())) { return this.$i('wfr_access_expiry_unknown'); }
      return new Intl.DateTimeFormat(this.locale, {
        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: this.timeZoneId || 'UTC'
      }).format(parsed);
    },
    toggleCapability (capability) {
      const index = this.draftCapabilities.indexOf(capability);
      if (index === -1) { this.draftCapabilities.push(capability); } else { this.draftCapabilities.splice(index, 1); }
    },
    toggleRole (roleId) {
      const index = this.draftRoles.indexOf(roleId);
      if (index === -1) { this.draftRoles.push(roleId); } else { this.draftRoles.splice(index, 1); }
    },
    contractLabel (term) {
      const hours = contractHoursPerWeek(term.contractMinutesPerWeek);
      // A contract nobody recorded is a dash. Printing 0 would claim a zero-hour contract.
      return hours === null ? orDash(null) : this.$i('wfr_term_hours', { hours });
    },
    wageLabel (term) {
      if (term.wageState === WAGE_WITHHELD) { return this.$i('wfr_term_wage_withheld'); }
      if (term.wageState === WAGE_SET) { return term.wage.amount + ' ' + orDash(term.wage.currency); }
      return this.$i('wfr_term_wage_none');
    },

    selectToken () {
      const input = this.$refs.token;
      if (input && typeof input.select === 'function') { input.select(); }
    },

    /**
     * Copy, with the manual path left open rather than assumed away.
     *
     * The Clipboard API needs a secure context and a permission, and this token is the one value on
     * the whole panel that cannot be fetched again — so a failed copy SAYS so and re-selects the
     * field, instead of leaving a manager to close a handover believing they hold a code they do not.
     */
    copyToken () {
      this.copyFailed = false;
      const token = this.invitation && this.invitation.token;
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
    }
  }
};
</script>

<style scoped>
.wfr-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
.wfr-panel__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.wfr-panel__title { font-size: 1.15rem; font-weight: 600; color: #292c34; margin: 0; }
.wfr-panel__sub { margin: 2px 0 0; color: #64748b; font-size: 0.78rem; }
.wfr-panel__close { border: none; background: none; font-size: 1.5rem; line-height: 1; color: #94a3b8; cursor: pointer; }

.wfr-panel__facts { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: 16px 0 0; font-size: 0.82rem; }
.wfr-panel__facts dt { color: #94a3b8; font-weight: 600; }
.wfr-panel__facts dd { margin: 0; color: #292c34; }
.wfr-panel__facts dd.is-unknown { color: #94a3b8; font-style: italic; }
.wfr-panel__facts dd.is-mono { font-family: monospace; font-size: 0.74rem; word-break: break-all; }

.wfr-panel__note { margin: 12px 0 0; color: #64748b; font-size: 0.78rem; }

.wfr-panel__section { margin-top: 22px; padding-top: 16px; border-top: 1px solid #f1f5f9; }
.wfr-panel__section h3 { font-size: 0.94rem; font-weight: 600; color: #292c34; margin: 0 0 4px; }
.wfr-panel__hint { margin: 0 0 10px; color: #64748b; font-size: 0.78rem; }
.wfr-panel__unknown { margin: 0; padding: 10px 14px; border-radius: 10px; background: #f8f9fa; border: 1px dashed #cbd5e0; color: #94a3b8; font-size: 0.8rem; }
.wfr-panel__unknown.is-answered { border-style: solid; border-color: #e2e8f0; color: #64748b; }

.wfr-panel__caps, .wfr-panel__roles { display: flex; flex-direction: column; gap: 6px; }
.wfr-panel__cap, .wfr-panel__role { display: grid; grid-template-columns: auto 1fr; column-gap: 10px; align-items: center; padding: 7px 10px; background: #f8f9fa; border-radius: 8px; font-size: 0.84rem; color: #292c34; cursor: pointer; }
.wfr-panel__cap small, .wfr-panel__role small { grid-column: 2; color: #64748b; font-size: 0.72rem; }
.wfr-panel__role small.is-retired { color: #92400e; }

.wfr-panel__terms { list-style: none; margin: 0; padding: 0; }
.wfr-panel__terms li { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 8px; background: #f8f9fa; margin-bottom: 6px; font-size: 0.8rem; }
.wfr-panel__terms li.is-open { background: rgba(27, 183, 118, 0.08); }
.wfr-panel__term-dates { font-weight: 600; color: #292c34; }
.wfr-panel__term-fact { color: #64748b; }
.wfr-panel__term-fact.is-wage-withheld { color: #94a3b8; font-style: italic; }
.wfr-panel__termform { margin-top: 10px; }
.wfr-panel__sublabel { display: block; margin-bottom: 6px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; }
.wfr-panel__termgrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-bottom: 6px; }
.wfr-panel__termgrid--pair { grid-template-columns: repeat(2, minmax(0, 1fr)); }

.wfr-panel__section--end { border-top-color: #fde68a; }
.wfr-panel__effects { list-style: none; margin: 0 0 14px; padding: 0; font-size: 0.8rem; }
.wfr-panel__effects li { padding: 7px 12px; border-radius: 8px; background: #f8f9fa; color: #64748b; margin-bottom: 5px; }
.wfr-panel__effects li.is-safe { background: rgba(27, 183, 118, 0.08); color: #159f63; }
.wfr-panel__effects li.is-unknown { background: #fff; border: 1px dashed #cbd5e0; color: #94a3b8; }
.wfr-panel__effects li.is-danger { background: rgba(239, 68, 68, 0.1); color: #b91c1c; }

.wfr-panel__endcheck { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: #292c34; margin-bottom: 8px; }
.wfr-panel__input { width: 100%; padding: 9px 12px; border: 1px solid #cbd5e0; border-radius: 8px; font-size: 0.86rem; }
.wfr-panel__danger { margin: 10px 0; padding: 10px 14px; border-radius: 10px; background: rgba(239, 68, 68, 0.1); color: #b91c1c; font-size: 0.8rem; }

.wfr-panel__btn { margin-top: 12px; border: none; background: #1bb776; color: #fff; font-weight: 600; padding: 9px 18px; border-radius: 8px; cursor: pointer; font-size: 0.86rem; }
.wfr-panel__btn--danger { background: #fff; color: #ef4444; border: 1px solid #ef4444; }
.wfr-panel__btn--ghost { background: #fff; color: #292c34; border: 1px solid #cbd5e0; }
.wfr-panel__btn:disabled { background: #cbd5e0; color: #fff; cursor: not-allowed; border-color: #cbd5e0; }

/* ACCESS / INVITATION HANDOVER.
   Deliberately louder than the sections around it. The token is the only value on this panel that
   cannot be read back, so the block that holds it has to look like a thing you deal with now rather
   than a field you scroll past. */
.wfr-panel__section--access { border-top-color: #bfdbfe; }
/* `.wfr-panel__note` carries no bottom margin (elsewhere it is the last thing in its block), and
   here the lifetime label follows it directly — the two ran together on screen. */
.wfr-panel__section--access .wfr-panel__note { margin-bottom: 14px; }
.wfr-panel__handover { margin-top: 6px; padding: 14px; border: 1px solid #bfdbfe; border-radius: 10px; background: #eff6ff; }
.wfr-panel__warn { display: flex; flex-direction: column; gap: 3px; padding: 10px 14px; border-radius: 8px; background: #fff7ed; color: #92400e; font-size: 0.78rem; margin-bottom: 12px; }
.wfr-panel__token { width: 100%; padding: 10px 12px; border: 1px solid #93c5fd; border-radius: 8px; background: #fff; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.8rem; word-break: break-all; box-sizing: border-box; }
.wfr-panel__handover-actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* OUTSTANDING CODES.
   A LIVE code is a credential somebody is holding right now, so it gets the same amber the handover
   warning uses — the manager scanning this panel during an incident has to find it without reading.
   A LAPSED one is deliberately quiet: it is a dead row, and dressing it in a warning colour would
   spend the manager's attention on the one entry that cannot hurt them. */
.wfr-panel__invites { margin-bottom: 14px; }
.wfr-panel__invitelist { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.wfr-panel__invite { padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8f9fa; }
.wfr-panel__invite.is-live { border-color: #fcd34d; background: #fffbeb; }
.wfr-panel__invite-state { margin: 0 0 8px; font-size: 0.82rem; font-weight: 600; color: #292c34; }
.wfr-panel__invite .wfr-panel__hint { margin-top: 8px; margin-bottom: 0; }
</style>

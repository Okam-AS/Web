<template>
  <AdminPage full-width @login-success="init">
    <div class="trn-ev-page">
      <div class="trn-ev-page__header">
        <h1 class="trn-ev-page__title">
          {{ $i('trn_ev_page_title') }}
        </h1>
        <p class="trn-ev-page__intro">
          {{ $i('trn_ev_page_intro') }}
        </p>
      </div>

      <!-- The gate, and the only refusal on this surface that says anything. Past it every 404 is one
           answer for absent / another store's / never enabled, and every 403 is one answer for "you do
           not hold this store" and "there is no such store". -->
      <div v-if="gate !== 'open'" class="trn-ev-page__gate" data-test="gate">
        {{ gateMessage }}
      </div>

      <template v-else>
        <p v-if="failure" class="trn-ev-page__failure" data-test="failure">
          {{ failure }}
        </p>

        <!-- ABOVE THE BUTTON, NOT BESIDE THE RESULT. This warns about an act that is irreversible the
             moment it is performed, so it has to be readable while the choice is still the reader's.
             Rendered with the document it would arrive after the disclosure it describes, which is
             the one placement that makes a true sentence useless. -->
        <p class="trn-ev-page__disclosure" data-test="evidence-disclosure-notice">
          {{ $i('trn_ev_disclosure_notice') }}
        </p>

        <form class="trn-form" data-test="evidence-form" @submit.prevent="submit">
          <TrainingReferenceField
            v-model="personRef"
            :label="$i('trn_ev_person_label')"
            :directory="peopleDirectory"
            kind="person"
            test-id="evidence-person-input"
            :disabled="busy"
          />
          <p v-if="referenceMalformed" class="trn-note trn-note--blocked" data-test="evidence-person-malformed">
            {{ $i('trn_reference_malformed') }}
          </p>
          <!-- The verb is «hent» — fetch — and not «vis». Pressing it performs a disclosure and writes
               a permanent row; a label suggesting the document was already on the page and is merely
               being revealed would understate what the button does. -->
          <button class="trn-btn trn-btn--primary" type="submit" :disabled="!canSubmit" data-test="evidence-open">
            {{ $i('trn_ev_open') }}
          </button>
        </form>

        <TrainingEvidenceDocument
          :read="evidence"
          :locale="locale"
          :zone-id="zoneId"
        />

        <p class="trn-ev-page__footnote" data-test="zone-footnote">
          {{ zoneFootnote }}
        </p>
        <p class="trn-ev-page__footnote" data-test="scope-footnote">
          {{ $i('trn_ev_footnote_scope') }}
        </p>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import TrainingReferenceField from '~/components/admin/training/TrainingReferenceField.vue';
import TrainingEvidenceDocument from '~/components/admin/training/TrainingEvidenceDocument.vue';
import {
  TrainingStoreService,
  gateOf,
  codeOf,
  GATE_OPEN,
  GATE_UNKNOWN,
  GATE_UNAUTHENTICATED,
  GATE_FORBIDDEN,
  GATE_INVISIBLE,
  GATE_UNREACHABLE,
  TRAINING_VALIDATION,
  TRAINING_FORBIDDEN,
  TRAINING_NOT_FOUND,
  TRAINING_FLAG_DISABLED_READ_ONLY
} from '~/utils/training/training-client';
import { WorkforceRosterService } from '~/utils/workforce/roster-client';
import { personDirectory, zoneIdOf, zoneIsFallback, isReferenceId } from '~/utils/training/journey';
import { readEvidence } from '~/utils/training/evidence';

const ERROR_KEYS = {
  [TRAINING_VALIDATION]: 'trn_err_validation',
  [TRAINING_FORBIDDEN]: 'trn_err_forbidden',
  [TRAINING_NOT_FOUND]: 'trn_err_not_found',
  [TRAINING_FLAG_DISABLED_READ_ONLY]: 'trn_err_flag_off'
};

const GATE_KEYS = {
  [GATE_UNKNOWN]: 'trn_gate_unknown',
  [GATE_UNAUTHENTICATED]: 'trn_gate_unauthenticated',
  [GATE_FORBIDDEN]: 'trn_gate_forbidden',
  [GATE_INVISIBLE]: 'trn_gate_invisible',
  [GATE_UNREACHABLE]: 'trn_gate_unreachable'
};

/**
 * ONE PERSON'S TRAINING RECORD, OPENED — the surface that makes the evidence read reachable.
 *
 * `/admin/training-courses` is where a venue WORKS: authors courses, publishes versions, assigns them
 * and files completions. This page is where the result of all that is READ, by somebody who was not
 * there. It is a separate surface for three reasons, and each of them is a decision rather than a
 * layout preference:
 *
 *   • THE DOCUMENT IS SHOWN TO SOMEBODY OUTSIDE THE VENUE. Whatever is on screen beside it is on
 *     screen for them too, and the authoring controls — a course form, a publish button, a completion
 *     the manager could file while the inspector watches — do not belong in that frame.
 *   • THE READ IS A WRITE, so it must be an act rather than a side effect of arriving somewhere. See
 *     below.
 *   • IT IS ONE PERSON'S. Every list on the courses page is store-wide; this is the only Training
 *     surface whose whole subject is a named human, and it takes exactly one input.
 *
 * ---- NOTHING IS FETCHED ON MOUNT, AND THAT IS THE LOAD-BEARING PART -----------------------------
 *
 * `GET …/evidence` appends an `evidence.read` row to an append-only ledger and commits it in the same
 * request. There is no path that removes one — the table is immutable under a database trigger. So a
 * page that loaded a document because somebody navigated to it would write "this manager read this
 * person's training file" for every visit that was about something else, permanently, and the person
 * it is about would be the one reading that log later.
 *
 * Hence: the context read runs on mount (it discloses nothing and it is the gate), the roster read
 * runs on mount (another module's, and only to suggest names), and the evidence read runs when
 * somebody names a person and presses the button. Nothing on this page refreshes on a timer, and the
 * store watcher clears the document rather than re-fetching it for the new store.
 *
 * ---- THE NAME BESIDE THE ID COMES FROM A DIFFERENT MODULE ---------------------------------------
 *
 * `personRef` is a Workforce identifier carried BY VALUE — Training holds no foreign key to it and
 * has no route that lists people. So the picker is populated from `GET …/staff`, which needs
 * `WorkforceScheduler` on the caller's own active engagement and is NOT conferred by StoreAdmin. A
 * manager entitled to open this document may therefore be refused the roster, which is why the
 * reference field keeps a text input under every state of the directory and why a refused roster
 * touches neither the gate nor the document.
 *
 * Note that the document names the person from ITS OWN read, not from this picker: the server
 * resolves `displayName` against the person record and reports `personOnFile` separately, so a
 * reference naming nobody produces a document that says so instead of an unlabelled empty file.
 */
export default {
  name: 'AdminTrainingEvidence',
  components: { AdminPage, TrainingReferenceField, TrainingEvidenceDocument },
  data () {
    return {
      gate: GATE_UNKNOWN,
      context: null,
      staff: null,
      staffError: null,
      personRef: '',
      // Idle is a fourth state and the one this page starts in: nobody has asked yet, which is not a
      // failed read and must never render as an empty document.
      evidencePayload: null,
      evidenceError: null,
      asked: false,
      loading: false,
      failure: ''
    };
  },
  computed: {
    storeId () {
      const selected = this.$store.state.selectedAdminStore;
      if (selected) { return selected; }
      const stores = (this.$store.state.currentUser && this.$store.state.currentUser.adminIn) || [];
      return stores.length ? stores[0].id : '';
    },
    locale () {
      return this.$store.state.adminLocale || 'no';
    },
    _trainingService () {
      return new TrainingStoreService(this._coreInitializer);
    },
    _rosterService () {
      return new WorkforceRosterService(this._coreInitializer);
    },
    busy () { return this.loading; },
    gateMessage () { return this.$i(GATE_KEYS[this.gate] || 'trn_gate_unknown'); },
    zoneId () { return zoneIdOf(this.context); },
    peopleDirectory () { return personDirectory(this.staff, this.staffError); },
    evidence () {
      if (!this.asked) { return { state: 'idle' }; }
      return readEvidence(this.evidencePayload, this.evidenceError);
    },
    referenceMalformed () {
      const typed = this.personRef.trim();
      return !!typed && !isReferenceId(typed);
    },
    canSubmit () {
      return !this.busy && isReferenceId(this.personRef);
    },
    zoneFootnote () {
      if (!this.zoneId) { return this.$i('trn_footnote_zone_utc'); }
      return zoneIsFallback(this.context)
        ? this.$i('trn_footnote_zone_fallback', { zone: this.zoneId })
        : this.$i('trn_footnote_zone', { zone: this.zoneId });
    }
  },
  watch: {
    storeId () { this.init(); }
  },
  mounted () {
    this.init();
  },
  methods: {
    async init () {
      if (!this.$store.getters.userIsLoggedIn || !this.storeId) { return; }
      this.gate = GATE_UNKNOWN;
      this.context = null;
      this.failure = '';
      // The document belongs to the store it was read from. Switching stores clears it rather than
      // re-fetching: re-fetching would write a disclosure nobody asked for, and keeping it on screen
      // would label one store's record with another store's heading.
      this.asked = false;
      this.evidencePayload = null;
      this.evidenceError = null;
      this.loading = true;

      try {
        this.context = await this._trainingService.GetContext(this.storeId);
        this.gate = GATE_OPEN;
      } catch (e) {
        this.gate = gateOf(e) || GATE_UNKNOWN;
        this.loading = false;
        return;
      }

      // The roster is another module's read with another module's authorization, so it fails on its
      // own and says nothing about Training. A 403 here leaves the picker empty and the text input
      // open; it never touches the gate and never appears in the failure banner.
      this.staff = null;
      this.staffError = null;
      this.staff = await this._rosterService.ListStaff(this.storeId).catch((e) => { this.staffError = e; return null; });

      this.loading = false;
    },

    submit () {
      if (!this.canSubmit) { return; }
      this.open(this.personRef.trim());
    },

    /**
     * THE DISCLOSURE. One press, one read, one permanent ledger row.
     *
     * The previous document is cleared BEFORE the request rather than replaced after it: a failed
     * read that left the last person's record on screen under a new banner would be the worst
     * possible defect on this particular page.
     */
    async open (personRef) {
      this.asked = true;
      this.evidencePayload = null;
      this.evidenceError = null;
      this.failure = '';
      this.loading = true;
      try {
        this.evidencePayload = await this._trainingService.GetEvidence(this.storeId, personRef);
      } catch (e) {
        this.evidenceError = e;
        this.fail(e);
      }
      this.loading = false;
    },

    /**
     * The banner, keyed on the stable `training.*` code and never on the server's `detail`, which is
     * English prose written for a developer. A failure carrying no such code did not come from this
     * module and gets the generic sentence rather than being attributed to a rule Training does not
     * have — the controller's own missing-`personRef` 400 is one of those, and it is unreachable from
     * this form anyway because the button will not enable without a well-formed reference.
     *
     * The document itself ALSO renders the refusal, from the same error. That is deliberate rather
     * than duplicated: the banner says the request failed, and the document's own three-state note is
     * what stops a refusal from being read as an empty record.
     */
    fail (error) {
      const key = ERROR_KEYS[codeOf(error)];
      this.failure = key ? this.$i(key) : this.$i('trn_err_unknown');
    }
  }
};
</script>

<style lang="scss" scoped>
// The lookup form, its button and its three-state notes are rendered by THIS component's template, so
// the shared panel rules have to be emitted under this component's own scope attribute. Importing the
// partial is how every Training panel gets them; a page that skipped it would render an unstyled form
// while the identical markup one component away looked right.
@import '../../components/admin/training/training-panel';

.trn-ev-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }
}

.trn-ev-page__header {
  margin-bottom: 24px;
}

.trn-ev-page__title {
  font-size: 2em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 8px;

  @media (max-width: 768px) {
    font-size: 1.5em;
  }
}

.trn-ev-page__intro {
  color: #64748b;
  margin: 0;
}

.trn-ev-page__disclosure {
  padding: 14px 18px;
  border-radius: 8px;
  border-left: 4px solid #92400e;
  background: #fff8e6;
  color: #92400e;
  font-size: 0.9em;
  margin: 0 0 20px;
}

.trn-ev-page__gate {
  padding: 24px;
  border-radius: 12px;
  background: #eef2f7;
  color: #475569;
  font-size: 0.95em;
}

.trn-ev-page__failure {
  padding: 12px 16px;
  border-radius: 8px;
  background: #fdf2f2;
  color: #b91c1c;
  font-size: 0.9em;
  margin: 0 0 16px;
}

.trn-ev-page__footnote {
  margin: 16px 0 0;
  font-size: 0.8em;
  color: #64748b;
  font-style: italic;
}
</style>

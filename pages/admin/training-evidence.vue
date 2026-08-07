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

        <!-- THE HAND-OVER. The page's own sentence says this record is one that «kan legges fram ved
             tilsyn», and until this control existed the only thing a manager could produce on the day
             was a browser tab. It is a first-class button rather than a hint to use the browser's own
             menu for the same reason the personalliste's is: a document somebody may be asked for
             while an inspector stands there is not something to go hunting through a menu for.

             Disabled until there is something to hand over. A print that produced the page's own
             heading and «velg en person» is worse than no button, because it looks like the record. -->
        <div class="trn-ev-page__actions">
          <button
            class="trn-btn"
            type="button"
            :disabled="!canPrint"
            data-test="evidence-print"
            @click="printDocument"
          >
            {{ $i('trn_ev_print') }}
          </button>
          <p class="trn-form__hint" data-test="evidence-print-hint">
            {{ $i('trn_ev_print_hint') }}
          </p>
          <p v-if="printFailure" class="trn-note trn-note--blocked" data-test="evidence-print-failure">
            {{ printFailure }}
          </p>
        </div>

        <!-- PAPER ONLY — revealed by this page's print block and by nothing else. On screen the
             browser tab, the sidebar and the page heading all say what is being looked at; on paper
             none of them survive, and a sheet handed over unnamed is a sheet about nothing. -->
        <div class="trn-ev-page__sheet-head">
          <h2 class="trn-ev-page__sheet-title">
            {{ $i('trn_ev_page_title') }}
          </h2>
        </div>

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
import { personDirectory, zoneIdOf, zoneIsFallback, isReferenceId, READ_ANSWERED } from '~/utils/training/journey';
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
      failure: '',
      // Its own line rather than the read's banner. `failure` is keyed on a `training.*` code the
      // server issued; this one is about the browser in front of the manager and the server has no
      // opinion about it, so folding the two together would attribute a browser's limitation to the
      // module.
      printFailure: ''
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
    /**
     * Nothing is offered for printing until a document has actually answered.
     *
     * `answered` and not «asked»: an idle page, a refusal and a read that never came back all render
     * a sentence rather than a record, and putting any of those three on paper under this page's
     * heading would hand somebody a document that looks like a clean file and is not one. The three
     * sentences DO print if a manager reaches the browser's own print command — see the component's
     * print rules — because a sheet saying «the server declined» is honest and a blank one is not.
     */
    canPrint () {
      return !this.busy && this.evidence.state === READ_ANSWERED;
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
      this.printFailure = '';
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
     * THE COPY THAT LEAVES THE BUILDING.
     *
     * `window.print()` is what produces it; the stylesheets at the bottom of this file and of
     * `TrainingEvidenceDocument.vue` are what make the output a document rather than a screenshot of
     * an admin panel — the page heading, the lookup form, this button and the sidebar all come off
     * the paper, and every claim the document carries stays on it. The browser's own «save as PDF»
     * is the same pipeline, so the same press yields either paper or a file.
     *
     * NOTHING IS RE-READ. The record already on screen is the record that prints: a second fetch
     * would append a second disclosure to an append-only ledger for a manager who only pressed
     * print, and the row would say the file was opened twice.
     *
     * A browser exposing no print command is TOLD about rather than left with a control that appears
     * to work and silently does nothing — which is the failure this whole page exists to avoid.
     */
    printDocument () {
      this.printFailure = '';
      if (typeof window === 'undefined' || typeof window.print !== 'function') {
        this.printFailure = this.$i('trn_ev_print_unavailable');
        return;
      }
      window.print();
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

.trn-ev-page__actions {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 12px;
  margin: 16px 0 20px;

  .trn-form__hint {
    margin: 0;
    flex: 1 1 260px;
  }

  .trn-note {
    flex: 1 1 100%;
    margin: 0;
  }
}

// Paper only. Revealed by the print block below and by nothing else.
.trn-ev-page__sheet-head {
  display: none;
}

/* ---- THE PAGE HALF OF THE PRINT PATH ------------------------------------------------------------
   The component half lives in `TrainingEvidenceDocument.vue` and decides how the record itself sets
   on paper. This half decides that nothing ELSE on the page reaches it.

   SCOPED, AND THAT IS THE WHOLE GUARD. Every selector below carries this page's `data-v-` attribute,
   so it cannot reach a screen this page did not render — even though a Nuxt chunk's CSS stays loaded
   after navigation. No body class, no `head()`, nothing anyone has to apply and therefore nothing to
   forget: the estate has already shipped one print stylesheet guarded by a class set imperatively on
   `document.body`, which vue-meta rebuilt from its own map. The class was wiped, the rules stayed in
   the file, and the document printed with the admin shell down the side of it for as long as nobody
   looked. `pages/admin/events-pipeline.vue` records that diagnosis in full.

   DEFAULT-DENY. Everything comes off the paper and three things are named back in: the paper-only
   heading, the document, and the two footnotes — the zone every instant on the sheet is stated in,
   and what the record's scope is. Both of those are qualifications on the figures above them, and a
   record printed without them would be over-claiming in exactly the direction that matters. What is
   NOT named back in is the page intro, the lookup form, this page's own controls and the disclosure
   notice: a warning about an act the reader is about to perform has nothing to say on a sheet that
   is the result of having performed it, and a control is not part of the document it produces.

   The default-deny is also what covers whatever a later lane adds beside them.

   `.trn-ev` is `TrainingEvidenceDocument`'s root, and Vue stamps THIS page's scope id onto a child
   component's root element — which is why it is reachable from here and its innards are not. That is
   the correct seam: what happens inside the record is the component's business. */
@media print {
  .trn-ev-page {
    max-width: none;
    margin: 0;
    padding: 0;
  }

  .trn-ev-page > * {
    display: none !important;
  }

  .trn-ev-page__sheet-head {
    display: block !important;
    border-bottom: 1.5pt solid #000;
    margin: 0 0 10pt;
    padding-bottom: 6pt;
    break-after: avoid;
    page-break-after: avoid;
  }

  .trn-ev-page__sheet-title {
    font-size: 15pt;
    font-weight: 600;
    color: #000;
    margin: 0;
  }

  .trn-ev-page > .trn-ev {
    display: block !important;
  }

  .trn-ev-page__footnote {
    display: block !important;
    color: #000;
    font-style: normal;
    font-size: 8pt;
    margin: 8pt 0 0;
  }
}
/* ---- THERE IS NO `@page` BOX HERE, AND THAT IS A MEASUREMENT RATHER THAN AN OMISSION ------------
   The two print paths this page was modelled on both declare a named page box — `@page wfpl-sheet`
   on the personalliste, `@page ev-runsheet` on the run sheet — and claim it from a scoped rule, so
   the sheet comes out A4 at 14 mm regardless of the dialog. This page had the same pair and it was
   REMOVED after reading the file it produced:

     • A BLANK FIRST SHEET. `.trn-ev-page` is not the first box in the printed flow (the admin shell
       wraps it), so claiming a named box part-way through forced a page break: the record began on
       sheet two and sheet one came out of the printer empty. Handing an inspector a blank first page
       is not a cosmetic defect.
     • THE RIGHT-HAND EDGE CUT OFF. With the named box's 14 mm margin applied to the page and the
       device margin still at the dialog's value, the document was laid out at the full paper width
       and cropped at the narrower one. `Opphav` printed as `Opp`, `I journalen` as `I journa`, and
       the ledger's delta column stopped mid-JSON — a document that LOOKS complete on paper and is
       missing the column naming who filed each row.

   Both were read out of the produced PDF with `pdftotext`, before and after. Without the named box
   the record prints on the paper the manager chose, at the browser's own margins, on two sheets with
   nothing cut off. A guaranteed 14 mm is worth less than a page that carries all of its columns.

   No rule reaching `.admin__content`, `.admin__main` or `body` either. Those are ancestors of this
   page's scope, so touching them means an unscoped rule — the thing this whole arrangement avoids —
   and the shell's own components already take themselves off the paper (`AdminPageHeader.vue` hides
   `.admin-nav`, `OnboardingNotification.vue` hides its banner, each in its own scoped `@media
   print`). Measured at the printable width under emulated print media, `.admin__content` and every
   box inside it are exactly the page width with no overflow, so there is nothing left to correct. */
</style>

<template>
  <AdminPage full-width @login-success="init">
    <div class="trn-page">
      <div class="trn-page__header">
        <h1 class="trn-page__title">
          {{ $i('trn_page_title') }}
        </h1>
        <p class="trn-page__intro">
          {{ $i('trn_page_intro') }}
        </p>
      </div>

      <div class="trn-page__controls">
        <button class="trn-page__reload" :disabled="busy" @click="init">
          {{ $i('trn_reload') }}
        </button>
      </div>

      <!-- The gate. Every refusal past it is opaque by design, so this is the only screen on the
           page that is allowed to say WHY nothing is here. -->
      <div v-if="gate !== 'open'" class="trn-page__gate" data-test="gate">
        {{ gateMessage }}
      </div>

      <template v-else>
        <p v-if="failure" class="trn-page__failure" data-test="failure">
          {{ failure }}
        </p>

        <TrainingContextPanel :context="context" />

        <div class="trn-page__columns">
          <div class="trn-page__column">
            <TrainingCourseList
              :listing="coursesListing"
              :selected-course-id="selectedCourseId"
              :locale="locale"
              :zone-id="zoneId"
              :setup-flag="setupFlag"
              :busy="busy"
              @select="select"
              @create="createCourse"
            />
            <TrainingVersionPanel
              :detail="detailView"
              :selected-course-id="selectedCourseId"
              :locale="locale"
              :zone-id="zoneId"
              :setup-flag="setupFlag"
              :busy="busy"
              @create-version="createVersion"
              @publish="publishVersion"
            />
            <TrainingCertificatePanel
              :listing="certificatesListing"
              :locale="locale"
              :zone-id="zoneId"
              :setup-flag="setupFlag"
              :busy="busy"
              @register-certificate="registerCertificate"
            />
          </div>

          <div class="trn-page__column">
            <TrainingAssignmentPanel
              :listing="assignmentsListing"
              :versions="assignable"
              :locale="locale"
              :zone-id="zoneId"
              :assignments-flag="assignmentsFlag"
              :busy="busy"
              @create-assignment="createAssignment"
              @revoke="revokeAssignment"
            />
            <TrainingCompletionPanel
              :listing="completionsListing"
              :versions="recordable"
              :locale="locale"
              :zone-id="zoneId"
              :assignments-flag="assignmentsFlag"
              :busy="busy"
              @record-completion="recordCompletion"
            />
            <TrainingHoldingsPanel
              :holdings="holdings"
              :locale="locale"
              :zone-id="zoneId"
              :busy="busy"
              @lookup="lookupHoldings"
            />
          </div>
        </div>

        <p class="trn-page__footnote" data-test="zone-footnote">
          {{ zoneFootnote }}
        </p>
        <p class="trn-page__footnote" data-test="scope-footnote">
          {{ $i('trn_footnote_scope') }}
        </p>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import TrainingContextPanel from '~/components/admin/training/TrainingContextPanel.vue';
import TrainingCourseList from '~/components/admin/training/TrainingCourseList.vue';
import TrainingVersionPanel from '~/components/admin/training/TrainingVersionPanel.vue';
import TrainingAssignmentPanel from '~/components/admin/training/TrainingAssignmentPanel.vue';
import TrainingCompletionPanel from '~/components/admin/training/TrainingCompletionPanel.vue';
import TrainingCertificatePanel from '~/components/admin/training/TrainingCertificatePanel.vue';
import TrainingHoldingsPanel from '~/components/admin/training/TrainingHoldingsPanel.vue';
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
  TRAINING_IDEMPOTENCY_PAYLOAD_MISMATCH,
  TRAINING_IDEMPOTENCY_IN_PROGRESS,
  TRAINING_COURSE_VERSION_IMMUTABLE,
  TRAINING_FLAG_DISABLED_READ_ONLY
} from '~/utils/training/training-client';
import {
  readListing,
  readCourseDetail,
  readHoldings,
  flagState,
  zoneIdOf,
  zoneIsFallback,
  assignableVersions,
  recordableVersions
} from '~/utils/training/journey';

const SETUP_FLAG = 'training.setup';
const ASSIGNMENTS_FLAG = 'training.assignments';

// Every `training.*` code this surface can meet, mapped to copy. Keyed on `code` and never on the
// server's `detail`, which is English prose written for a developer.
const ERROR_KEYS = {
  [TRAINING_VALIDATION]: 'trn_err_validation',
  [TRAINING_FORBIDDEN]: 'trn_err_forbidden',
  [TRAINING_NOT_FOUND]: 'trn_err_not_found',
  [TRAINING_IDEMPOTENCY_PAYLOAD_MISMATCH]: 'trn_err_idem_mismatch',
  [TRAINING_IDEMPOTENCY_IN_PROGRESS]: 'trn_err_idem_inflight',
  [TRAINING_COURSE_VERSION_IMMUTABLE]: 'trn_err_immutable',
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
 * TRAINING & INTERNKONTROLL — one journey, end to end: a course becomes evidence.
 *
 * Author a course that carries a competency key; cut a version and PUBLISH it, which freezes its
 * content and mints the hash every later record is stamped with; assign that published version to a
 * role or a person; record the completion; and then ask the possession projection whether the person
 * now holds the competence. The last step is the only one that proves the first four did anything,
 * which is why it is on the page at all.
 *
 * WHAT THIS IS NOT. It is not the Training module's admin experience. The landed surface has fifteen
 * endpoints and this page binds fourteen of them in a single column-pair; the four it leaves alone
 * (draft edit, retire, certificate correction, and the expiring feed) are listed with reasons in
 * `utils/training/training-client.js`. It is also not the worker's side of the module: spec §5.2, the
 * self-service surface where somebody actually takes a quiz, does not exist in this wave, which is
 * why every completion filed here is `ManagerRecorded`.
 *
 * WHERE THE JOURNEY STOPS, AND IT IS WORTH BEING PRECISE ABOUT IT. `personRef` and `roleRef` are
 * `Workforce*` identifiers carried BY VALUE — no foreign key, no cross-module read, no directory on
 * this surface at all. Training therefore cannot offer a picker of this store's people, and the
 * register-certificate write does not even check that the reference belongs to somebody employed
 * here (only that it is not `Guid.Empty`). So the three fields that name a human are typed
 * references, and the panels say so rather than implying a check that is not there.
 *
 * TWO OPEN RULINGS SHAPE WHAT IS ON SCREEN, AND NEITHER IS PRE-EMPTED HERE:
 *
 *   TR-B1 — a completion's `passed` is stored exactly as the client sent it and is never compared
 *   against the version's pass threshold. This page does not compare them either. See
 *   `TrainingCompletionPanel`.
 *   TR-B3 — whether a certificate's stored expiry denotes UTC or the store's own local midnight is
 *   an open module-epoch question. So the authored day is sliced and shown, never converted, and the
 *   `withinDays` expiry feed — the one screen whose correctness would turn on the answer — is not
 *   bound at all. See `civilDateOf` in `utils/training/journey.js`.
 *
 * EVERY REFUSAL PAST THE GATE IS OPAQUE, AND THE UI DOES NOT PRETEND OTHERWISE. Training answers the
 * same 404 for a resource that is absent, one that belongs to another employer, and a module that
 * was never switched on; and the same 403 for a store the caller does not hold and a store that does
 * not exist. Both equalities are pinned by `WebApi.Tests/Training/TrainingTenantIsolationTests`, and
 * the pin fails on ANY divergence — status, code, detail or extension — because divergence is the
 * disclosure. There is a `CrossStoreDenied` factory on the backend that would answer a 403 with a
 * distinct code for a body naming another store's row; it has no throw site, deliberately, because
 * using it would diverge from the absent-id control. So the only thing this page reports past the
 * gate is that the server refused, and it never guesses which of the reasons applied.
 */
export default {
  name: 'AdminTrainingCourses',
  components: {
    AdminPage,
    TrainingContextPanel,
    TrainingCourseList,
    TrainingVersionPanel,
    TrainingAssignmentPanel,
    TrainingCompletionPanel,
    TrainingCertificatePanel,
    TrainingHoldingsPanel
  },
  data () {
    return {
      gate: GATE_UNKNOWN,
      context: null,
      // Null is UNKNOWN throughout, and stays null on failure. None of these is ever initialised to
      // `[]` or to an empty envelope: those are answers, and this is the absence of one.
      courses: null,
      coursesError: null,
      assignments: null,
      assignmentsError: null,
      completions: null,
      completionsError: null,
      certificates: null,
      certificatesError: null,
      detail: null,
      detailError: null,
      selectedCourseId: null,
      // Idle is a fourth state: nobody has looked a person up yet, which is not a failed read.
      holdingsPayload: null,
      holdingsError: null,
      holdingsAsked: false,
      loading: false,
      writing: false,
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
    busy () {
      return this.loading || this.writing;
    },
    gateMessage () {
      return this.$i(GATE_KEYS[this.gate] || 'trn_gate_unknown');
    },
    zoneId () { return zoneIdOf(this.context); },
    setupFlag () { return flagState(this.context, SETUP_FLAG); },
    assignmentsFlag () { return flagState(this.context, ASSIGNMENTS_FLAG); },
    coursesListing () { return readListing(this.courses, this.coursesError, 'courses'); },
    assignmentsListing () { return readListing(this.assignments, this.assignmentsError, 'assignments'); },
    completionsListing () { return readListing(this.completions, this.completionsError, 'completions'); },
    certificatesListing () { return readListing(this.certificates, this.certificatesError, 'certificates'); },
    detailView () { return readCourseDetail(this.detail, this.detailError); },
    holdings () {
      if (!this.holdingsAsked) { return { state: 'idle' }; }
      return readHoldings(this.holdingsPayload, this.holdingsError);
    },
    assignable () { return assignableVersions(this.detailView.state === 'answered' ? this.detailView.course : null); },
    recordable () { return recordableVersions(this.detailView.state === 'answered' ? this.detailView.course : null); },
    /**
     * Which clock the instants on this page are printed in. The store zone comes from `GET /context`
     * and is never guessed; when the server said it fell back to Europe/Oslo because the store
     * carries no valid zone, the footnote says so rather than presenting the fallback as the store's
     * own setting.
     */
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
    /**
     * The context read is the gate, and it is the ONLY read whose refusal is informative: a 403 says
     * the caller does not hold this store (or it is not there — the same answer), and a 404 carrying
     * a `training.*` document says the module is invisible here. Past it, nothing is informative.
     *
     * The lists are only loaded once the gate opened. With the module invisible every route answers
     * the same opaque 404, so loading anyway would fire four reads that cannot succeed and would
     * decorate a deliberate "Training is not switched on" screen with failures about it.
     */
    async init () {
      if (!this.$store.getters.userIsLoggedIn || !this.storeId) { return; }
      this.gate = GATE_UNKNOWN;
      this.context = null;
      this.failure = '';
      this.selectedCourseId = null;
      this.detail = null;
      this.detailError = null;
      this.holdingsAsked = false;
      this.holdingsPayload = null;
      this.holdingsError = null;
      this.loading = true;

      try {
        this.context = await this._trainingService.GetContext(this.storeId);
        this.gate = GATE_OPEN;
      } catch (e) {
        this.gate = gateOf(e) || GATE_UNKNOWN;
        this.loading = false;
        return;
      }

      await this.load();
      this.loading = false;
    },

    /**
     * The four store-wide reads, issued together and failing independently.
     *
     * No `catch` here is allowed to become another's answer: a certificate read that fails leaves
     * the certificates UNKNOWN, and the courses that were successfully read stay on screen saying
     * exactly what they said.
     */
    async load () {
      // Cleared to unknown, not to empty. A reload in flight must not render as a store that has
      // suddenly stopped having courses.
      this.courses = null;
      this.coursesError = null;
      this.assignments = null;
      this.assignmentsError = null;
      this.completions = null;
      this.completionsError = null;
      this.certificates = null;
      this.certificatesError = null;

      const [courses, assignments, completions, certificates] = await Promise.all([
        this._trainingService.ListCourses(this.storeId).catch((e) => { this.coursesError = e; return null; }),
        this._trainingService.ListAssignments(this.storeId).catch((e) => { this.assignmentsError = e; return null; }),
        this._trainingService.ListCompletions(this.storeId).catch((e) => { this.completionsError = e; return null; }),
        this._trainingService.ListCertificates(this.storeId).catch((e) => { this.certificatesError = e; return null; })
      ]);

      this.courses = courses;
      this.assignments = assignments;
      this.completions = completions;
      this.certificates = certificates;
    },

    /** Clicking the selected course clears it, so a venue can get back to "nothing selected". */
    select (courseId) {
      this.selectedCourseId = this.selectedCourseId === courseId ? null : courseId;
      this.detail = null;
      this.detailError = null;
      if (this.selectedCourseId) { this.loadDetail(); }
    },

    async loadDetail () {
      const courseId = this.selectedCourseId;
      this.loading = true;
      try {
        const detail = await this._trainingService.GetCourse(this.storeId, courseId);
        // The selection may have moved on while this was in flight; a late answer must not
        // overwrite the panel with another course's versions.
        if (this.selectedCourseId === courseId) { this.detail = detail; }
      } catch (e) {
        if (this.selectedCourseId === courseId) { this.detailError = e; }
      }
      this.loading = false;
    },

    // ---- writes ---------------------------------------------------------------------------------
    //
    // Each one runs the mutation, then RE-READS rather than splicing the response into the list.
    // The response models and the list projections are not the same shape (a created course comes
    // back as a detail document with no `versionCount`), and a spliced row would be a row this
    // surface invented.

    async createCourse (request) {
      await this.write(() => this._trainingService.CreateCourse(this.storeId, request), () => this.load());
    },

    async createVersion (request) {
      if (!this.selectedCourseId) { return; }
      await this.write(
        () => this._trainingService.CreateVersion(this.storeId, this.selectedCourseId, request),
        () => Promise.all([this.loadDetail(), this.load()])
      );
    },

    async publishVersion (versionNo) {
      if (!this.selectedCourseId) { return; }
      await this.write(
        () => this._trainingService.PublishVersion(this.storeId, this.selectedCourseId, versionNo),
        () => Promise.all([this.loadDetail(), this.load()])
      );
    },

    async createAssignment (request) {
      await this.write(
        () => this._trainingService.CreateAssignment(this.storeId, request),
        () => this.reloadAssignments()
      );
    },

    async revokeAssignment (assignmentId) {
      await this.write(
        () => this._trainingService.RevokeAssignment(this.storeId, assignmentId),
        () => this.reloadAssignments()
      );
    },

    async recordCompletion (request) {
      await this.write(
        () => this._trainingService.RecordCompletion(this.storeId, request),
        () => this.reloadCompletions()
      );
    },

    async registerCertificate (request) {
      await this.write(
        () => this._trainingService.RegisterCertificate(this.storeId, request),
        () => this.reloadCertificates()
      );
    },

    async lookupHoldings (personRef) {
      this.holdingsAsked = true;
      this.holdingsPayload = null;
      this.holdingsError = null;
      this.loading = true;
      try {
        this.holdingsPayload = await this._trainingService.GetHoldings(this.storeId, personRef);
      } catch (e) {
        this.holdingsError = e;
      }
      this.loading = false;
    },

    /**
     * One mutation, one refusal path.
     *
     * A failure sets the banner from the server's stable `code` and NOTHING ELSE happens: no list is
     * cleared, no state is guessed, and the re-read is not run. A 409 because the flag is off must
     * leave the screen exactly as it was, because everything on it is still true.
     */
    async write (mutate, reread) {
      this.writing = true;
      this.failure = '';
      try {
        await mutate();
        await reread();
      } catch (e) {
        this.fail(e);
      }
      this.writing = false;
    },

    async reloadAssignments () {
      this.assignments = null;
      this.assignmentsError = null;
      this.assignments = await this._trainingService.ListAssignments(this.storeId)
        .catch((e) => { this.assignmentsError = e; return null; });
    },

    async reloadCompletions () {
      this.completions = null;
      this.completionsError = null;
      this.completions = await this._trainingService.ListCompletions(this.storeId)
        .catch((e) => { this.completionsError = e; return null; });
    },

    async reloadCertificates () {
      this.certificates = null;
      this.certificatesError = null;
      this.certificates = await this._trainingService.ListCertificates(this.storeId)
        .catch((e) => { this.certificatesError = e; return null; });
    },

    /**
     * The banner sentence, keyed on the stable code.
     *
     * A failure with no `training.*` code did not come from this module — a network failure, a
     * gateway, a 500 — and gets the generic sentence rather than being attributed to a rule Training
     * does not have.
     */
    fail (error) {
      const key = ERROR_KEYS[codeOf(error)];
      this.failure = key ? this.$i(key) : this.$i('trn_err_unknown');
    }
  }
};
</script>

<style lang="scss" scoped>
.trn-page {
  max-width: 1500px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }
}

.trn-page__header {
  margin-bottom: 24px;
}

.trn-page__title {
  font-size: 2em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 8px;

  @media (max-width: 768px) {
    font-size: 1.5em;
  }
}

.trn-page__intro {
  color: #64748b;
  margin: 0;
}

.trn-page__controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.trn-page__reload {
  background: #fff;
  color: #292c34;
  border: 2px solid #e2e8f0;
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.trn-page__gate {
  padding: 24px;
  border-radius: 12px;
  background: #eef2f7;
  color: #475569;
  font-size: 0.95em;
}

.trn-page__failure {
  padding: 12px 16px;
  border-radius: 8px;
  background: #fdf2f2;
  color: #b91c1c;
  font-size: 0.9em;
  margin: 0 0 16px;
}

.trn-page__columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 24px;
  margin-top: 24px;
}

.trn-page__column {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}

.trn-page__footnote {
  margin: 16px 0 0;
  font-size: 0.8em;
  color: #64748b;
  font-style: italic;
}
</style>

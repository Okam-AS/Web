import { mount } from '@vue/test-utils'
import TrainingContextPanel from '~/components/admin/training/TrainingContextPanel.vue'
import TrainingCourseList from '~/components/admin/training/TrainingCourseList.vue'
import TrainingVersionPanel from '~/components/admin/training/TrainingVersionPanel.vue'
import TrainingAssignmentPanel from '~/components/admin/training/TrainingAssignmentPanel.vue'
import TrainingCompletionPanel from '~/components/admin/training/TrainingCompletionPanel.vue'
import TrainingCertificatePanel from '~/components/admin/training/TrainingCertificatePanel.vue'
import TrainingHoldingsPanel from '~/components/admin/training/TrainingHoldingsPanel.vue'
import TrainingReferenceField from '~/components/admin/training/TrainingReferenceField.vue'
import { readListing, readCourseDetail, readHoldings } from '~/utils/training/journey'
import { WorkforceApiError } from '~/utils/workforce/api-client'
import translations from '~/translations'

// The real Norwegian dictionary, resolved the way `plugins/i18n.js` resolves it, so these assert the
// copy a venue actually sees — and fail if a key was never added.
const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}

const mocks = { $i }
const PERSON = '44444444-4444-4444-4444-444444444444'
const OTHER_PERSON = '55555555-5555-5555-5555-555555555555'
const ROLE = '99999999-9999-9999-9999-999999999999'
const refusal = (status, code) => new WorkforceApiError(status, { code, detail: 'prose' })

const answered = (key, rows, asOfUtc) => readListing({ [key]: rows, asOfUtc }, null, key)
const refused = key => readListing(null, refusal(404, 'training.not-found'), key)
const unknown = key => readListing(null, new Error('network'), key)

describe('TrainingContextPanel — what the server said, not what we inferred', () => {
  const mountPanel = context => mount(TrainingContextPanel, { mocks, propsData: { context } })

  test('the flag list is the SERVER\'S map, so a flag it did not report is simply not shown', () => {
    const wrapper = mountPanel({ featureFlags: { 'training.setup': true, 'training.assignments': false } })
    const rendered = wrapper.findAll('.trn-context__flag')
    expect(rendered).toHaveLength(2)
    expect(wrapper.find('[data-test="flag-training.setup"]').text()).toBe(translations.no.trn_flag_on)
    expect(wrapper.find('[data-test="flag-training.assignments"]').text()).toBe(translations.no.trn_flag_off)
  })

  test('a flag whose value is not a boolean is UNKNOWN, never off', () => {
    const wrapper = mountPanel({ featureFlags: { 'training.setup': 'yes' } })
    expect(wrapper.find('[data-test="flag-training.setup"]').text()).toBe(translations.no.trn_flag_unknown)
  })

  test('THE DISTINCTION, varied: on, off and unknown render three different words', () => {
    const wrapper = mountPanel({
      featureFlags: { 'training.setup': true, 'training.assignments': false, 'training.reminders': null }
    })
    const words = [
      wrapper.find('[data-test="flag-training.setup"]').text(),
      wrapper.find('[data-test="flag-training.assignments"]').text(),
      wrapper.find('[data-test="flag-training.reminders"]').text()
    ]
    expect(new Set(words).size).toBe(3)
  })

  test('an unreported flag family renders no flags at all rather than seven fabricated OFFs', () => {
    expect(mountPanel(null).findAll('.trn-context__flag')).toHaveLength(0)
  })

  test('the competency seam is three-valued too', () => {
    expect(mountPanel({ competencySeamBound: true }).find('[data-test="context-seam"]').text()).toBe(translations.no.trn_seam_bound)
    expect(mountPanel({ competencySeamBound: false }).find('[data-test="context-seam"]').text()).toBe(translations.no.trn_seam_unbound)
    expect(mountPanel({}).find('[data-test="context-seam"]').text()).toBe(translations.no.trn_flag_unknown)
  })

  test('a zone the server declared a FALLBACK is marked as one', () => {
    const own = mountPanel({ timeZone: { id: 'Europe/Oslo', isFallback: false } })
    const fallback = mountPanel({ timeZone: { id: 'Europe/Oslo', isFallback: true } })
    expect(own.find('[data-test="context-zone-fallback"]').exists()).toBe(false)
    expect(fallback.find('[data-test="context-zone-fallback"]').exists()).toBe(true)
    // Both still name the same zone, so the marker is the only thing that varied.
    expect(own.find('[data-test="context-zone"]').text()).toContain('Europe/Oslo')
    expect(fallback.find('[data-test="context-zone"]').text()).toContain('Europe/Oslo')
  })
})

describe('TrainingCourseList — unknown, refused and empty are three screens', () => {
  const course = over => Object.assign({
    courseId: 'c-1',
    title: 'Internkontroll grunnkurs',
    category: 'IK',
    competencyKey: 'food-hygiene',
    isActive: true,
    versionCount: 2,
    hasPublishedVersion: true,
    createdAtUtc: '2026-07-01T09:00:00'
  }, over)

  const mountPanel = (listing, over) => mount(TrainingCourseList, {
    mocks,
    propsData: Object.assign({ listing, zoneId: 'Europe/Oslo' }, over)
  })

  test('THE DISTINCTION, varied: the three states render three different notices', () => {
    const seen = [
      mountPanel(unknown('courses')).find('[data-test="courses-unknown"]').text(),
      mountPanel(refused('courses')).find('[data-test="courses-refused"]').text(),
      mountPanel(answered('courses', [])).find('[data-test="courses-empty"]').text()
    ]
    expect(new Set(seen).size).toBe(3)
  })

  test('neither an unknown nor a refused read renders a table, so neither can read as "no courses"', () => {
    expect(mountPanel(unknown('courses')).find('[data-test="courses-table"]').exists()).toBe(false)
    expect(mountPanel(refused('courses')).find('[data-test="courses-table"]').exists()).toBe(false)
    // POSITIVE CONTROL: an answered read with a row genuinely does render one.
    expect(mountPanel(answered('courses', [course()])).find('[data-test="courses-table"]').exists()).toBe(true)
  })

  test('a course with zero versions shows 0, not a dash', () => {
    const wrapper = mountPanel(answered('courses', [course({ versionCount: 0, hasPublishedVersion: false })]))
    const cells = wrapper.find('[data-test="course-row"]').findAll('td')
    expect(cells.at(3).text()).toBe('0')
  })

  test('a course carrying no competency key shows a dash with the reason, not an empty cell', () => {
    const wrapper = mountPanel(answered('courses', [course({ competencyKey: null })]))
    const cell = wrapper.find('[data-test="course-row"]').findAll('td').at(2)
    expect(cell.text()).toBe('—')
    expect(cell.find('span').attributes('title')).toBe(translations.no.trn_course_no_competency)
  })

  test('the write is blocked only when the server SAID the flag is off', () => {
    expect(mountPanel(answered('courses', []), { setupFlag: false }).find('[data-test="course-write-blocked"]').exists()).toBe(true)
    // Unknown must not disable anything: that would report a module as switched off on the strength
    // of a read that never came back.
    expect(mountPanel(answered('courses', []), { setupFlag: null }).find('[data-test="course-write-blocked"]').exists()).toBe(false)
    expect(mountPanel(answered('courses', []), { setupFlag: true }).find('[data-test="course-write-blocked"]').exists()).toBe(false)
  })

  test('creating a course emits the trimmed body, with an empty competency key sent as null', async () => {
    const wrapper = mountPanel(answered('courses', []))
    wrapper.find('[data-test="course-title"]').setValue('  Internkontroll  ')
    wrapper.find('[data-test="course-category"]').setValue('IK')
    await wrapper.vm.$nextTick()
    wrapper.find('[data-test="course-form"]').trigger('submit')

    expect(wrapper.emitted().create[0][0]).toEqual({ title: 'Internkontroll', category: 'IK', competencyKey: null })
  })

  test('a course with no title cannot be submitted — the server refuses it with a 400', async () => {
    const wrapper = mountPanel(answered('courses', []))
    wrapper.find('[data-test="course-title"]').setValue('   ')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="course-submit"]').attributes('disabled')).toBeTruthy()
  })
})

describe('TrainingVersionPanel — publishing is the hinge, and only a draft can be published', () => {
  const detail = versions => readCourseDetail({ courseId: 'c-1', versions }, null)

  const mountPanel = (view, over) => mount(TrainingVersionPanel, {
    mocks,
    propsData: Object.assign({ detail: view, selectedCourseId: 'c-1', zoneId: 'Europe/Oslo' }, over)
  })

  test('no course selected is its own screen, not an unknown read', () => {
    const wrapper = mount(TrainingVersionPanel, {
      mocks,
      propsData: { detail: readCourseDetail(null, null), selectedCourseId: null }
    })
    expect(wrapper.find('[data-test="versions-no-course"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="versions-unknown"]').exists()).toBe(false)
  })

  test('the publish button appears on the draft row and on no other', () => {
    const wrapper = mountPanel(detail([
      { courseVersionId: 'v1', versionNo: 1, state: 'Published', passThresholdPercent: 80, contentHash: 'abcdef0123456789ff', publishedAtUtc: '2026-07-02T09:00:00' },
      { courseVersionId: 'v2', versionNo: 2, state: 'Draft', passThresholdPercent: 70, contentHash: 'ffee0011', publishedAtUtc: null },
      { courseVersionId: 'v3', versionNo: 3, state: 'Retired', passThresholdPercent: 60, contentHash: '00112233', publishedAtUtc: '2026-06-01T09:00:00' }
    ]))
    const rows = wrapper.findAll('[data-test="version-row"]')
    expect(rows).toHaveLength(3)
    expect(rows.at(0).find('[data-test="version-publish"]').exists()).toBe(false)
    expect(rows.at(1).find('[data-test="version-publish"]').exists()).toBe(true)
    expect(rows.at(2).find('[data-test="version-publish"]').exists()).toBe(false)
  })

  test('publishing emits the version NUMBER, which is what the route binds', () => {
    const wrapper = mountPanel(detail([{ courseVersionId: 'v2', versionNo: 7, state: 'Draft', passThresholdPercent: 70, contentHash: 'x' }]))
    wrapper.find('[data-test="version-publish"]').trigger('click')
    expect(wrapper.emitted().publish[0]).toEqual([7])
  })

  test('the version\'s OWN authored threshold is shown on the version', () => {
    const wrapper = mountPanel(detail([{ courseVersionId: 'v1', versionNo: 1, state: 'Published', passThresholdPercent: 80, contentHash: 'x' }]))
    expect(wrapper.find('[data-test="version-row"]').findAll('td').at(2).text()).toBe('80%')
  })

  test('a threshold outside 0-100 cannot be submitted', async () => {
    const wrapper = mountPanel(detail([]))
    wrapper.find('[data-test="version-threshold"]').setValue('101')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="version-submit"]').attributes('disabled')).toBeTruthy()

    wrapper.find('[data-test="version-threshold"]').setValue('80')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="version-submit"]').attributes('disabled')).toBeFalsy()
  })

  test('THE UNTAKEABLE FIELD IS GONE, and its absence is stated rather than left to be noticed', () => {
    // No worker surface can serve a quiz in this wave, and `QuizJson` feeds the content hash that
    // publishing freezes under a SQL trigger — so a guessed schema would be permanent.
    const wrapper = mountPanel(detail([]))
    expect(wrapper.find('[data-test="version-quiz"]').exists()).toBe(false)
    expect(wrapper.findAll('textarea')).toHaveLength(1)
    expect(wrapper.find('[data-test="version-quiz-absent"]').text()).toBe(translations.no.trn_version_quiz_absent)
  })

  test('the draft body sends an explicit null quiz, which hashes identically to the empty box it replaces', async () => {
    const wrapper = mountPanel(detail([]))
    wrapper.find('[data-test="version-content"]').setValue('[{"title":"Side 1"}]')
    await wrapper.vm.$nextTick()
    wrapper.find('[data-test="version-form"]').trigger('submit')

    expect(wrapper.emitted()['create-version'][0][0]).toEqual({
      contentPagesJson: '[{"title":"Side 1"}]', quizJson: null, passThresholdPercent: 80
    })
  })
})

describe('TrainingAssignmentPanel — only a published version is offered', () => {
  const mountPanel = (listing, over) => mount(TrainingAssignmentPanel, {
    mocks,
    propsData: Object.assign({ listing, versions: [], zoneId: 'Europe/Oslo' }, over)
  })

  test('with no published version the form explains itself instead of offering an empty picker', () => {
    const wrapper = mountPanel(answered('assignments', []), { versions: [] })
    expect(wrapper.find('[data-test="assignment-no-published"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="assignment-version"]').exists()).toBe(false)

    // POSITIVE CONTROL: with one, the picker is there.
    const withOne = mountPanel(answered('assignments', []), {
      versions: [{ courseVersionId: 'v-pub', versionNo: 2, state: 'Published' }]
    })
    expect(withOne.find('[data-test="assignment-version"]').exists()).toBe(true)
    expect(withOne.find('[data-test="assignment-no-published"]').exists()).toBe(false)
  })

  test('a row shows the reference its own scope names', () => {
    const wrapper = mountPanel(answered('assignments', [
      { assignmentId: 'a-1', scope: 'Role', roleRef: 'role-9', personRef: null, courseTitle: 'IK', versionNo: 2, createdAtUtc: '2026-07-01T09:00:00' },
      { assignmentId: 'a-2', scope: 'Person', roleRef: null, personRef: PERSON, courseTitle: 'IK', versionNo: 2, createdAtUtc: '2026-07-01T09:00:00' }
    ]))
    const rows = wrapper.findAll('[data-test="assignment-row"]')
    expect(rows.at(0).findAll('td').at(2).text()).toBe('role-9')
    expect(rows.at(1).findAll('td').at(2).text()).toBe(PERSON)
  })

  test('a due date is the authored day, and an absent one is a dash', () => {
    const wrapper = mountPanel(answered('assignments', [
      { assignmentId: 'a-1', scope: 'Role', roleRef: 'r', dueDateUtc: '2026-09-01T00:00:00' },
      { assignmentId: 'a-2', scope: 'Role', roleRef: 'r', dueDateUtc: null }
    ]))
    const rows = wrapper.findAll('[data-test="assignment-row"]')
    expect(rows.at(0).findAll('td').at(3).text()).toBe('2026-09-01')
    expect(rows.at(1).findAll('td').at(3).text()).toBe('—')
  })

  test('the by-value warning STAYS on this form, because this write really does validate nothing', () => {
    // Unlike the completion and certificate writes, `CreateAssignmentAsync` never calls
    // TrainingPersonBinding. This hint must not be harmonised with the other two panels'.
    const wrapper = mountPanel(answered('assignments', []), {
      versions: [{ courseVersionId: 'v-pub', versionNo: 2, state: 'Published' }]
    })
    expect(wrapper.find('[data-test="assignment-reference-note"]').text()).toBe(translations.no.trn_reference_by_value)
    expect(wrapper.text()).not.toContain(translations.no.trn_completion_person_known)
  })

  test('the emitted body sets exactly the reference the scope names and nulls the other', async () => {
    const wrapper = mountPanel(answered('assignments', []), {
      versions: [{ courseVersionId: 'v-pub', versionNo: 2, state: 'Published' }]
    })
    wrapper.find('[data-test="assignment-version"]').setValue('v-pub')
    wrapper.find('[data-test="assignment-reference"]').setValue(' ' + ROLE + ' ')
    await wrapper.vm.$nextTick()
    wrapper.find('[data-test="assignment-form"]').trigger('submit')

    expect(wrapper.emitted()['create-assignment'][0][0]).toEqual({
      courseVersionId: 'v-pub', scope: 'Role', roleRef: ROLE, personRef: null, dueDateUtc: null
    })
  })

  test('switching the scope REMOUNTS the field, so a role id cannot be sent as a person reference', async () => {
    const wrapper = mountPanel(answered('assignments', []), {
      versions: [{ courseVersionId: 'v-pub', versionNo: 2, state: 'Published' }]
    })
    wrapper.find('[data-test="assignment-reference"]').setValue(ROLE)
    await wrapper.vm.$nextTick()
    wrapper.find('[data-test="assignment-scope"]').setValue('Person')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="assignment-reference"]').element.value).toBe('')
  })

  test('a reference that is not a GUID cannot be submitted — the server could not bind it', async () => {
    const wrapper = mountPanel(answered('assignments', []), {
      versions: [{ courseVersionId: 'v-pub', versionNo: 2, state: 'Published' }]
    })
    wrapper.find('[data-test="assignment-version"]').setValue('v-pub')
    wrapper.find('[data-test="assignment-reference"]').setValue('role-9')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="assignment-reference-malformed"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="assignment-submit"]').attributes('disabled')).toBeTruthy()
  })

  test('a row\'s reference is named from the directory ITS OWN SCOPE points at', () => {
    const wrapper = mountPanel(answered('assignments', [
      { assignmentId: 'a-1', scope: 'Role', roleRef: ROLE, courseTitle: 'Kurs', versionNo: 2 },
      { assignmentId: 'a-2', scope: 'Person', personRef: PERSON, courseTitle: 'Kurs', versionNo: 2 }
    ]), {
      versions: [],
      peopleDirectory: { state: 'answered', options: [{ id: PERSON, label: 'Kari Nordmann', ended: false }] },
      // Deliberately also holds the PERSON id under a role's name. Looking a reference up in the
      // wrong directory would print "Feil oppslag" for a person, and that must not happen.
      rolesDirectory: {
        state: 'answered',
        options: [
          { id: ROLE, label: 'Kokk', ended: false },
          { id: PERSON, label: 'Feil oppslag', ended: false }
        ]
      }
    })
    const rows = wrapper.findAll('[data-test="assignment-row"]')
    expect(rows.at(0).findAll('td').at(2).text()).toBe('Kokk')
    expect(rows.at(1).findAll('td').at(2).text()).toBe('Kari Nordmann')
    // The id itself is never lost — it stays on the title, which is what an operator copies.
    expect(rows.at(1).findAll('td').at(2).find('span').attributes('title')).toBe(PERSON)
  })
})

describe('TrainingCompletionPanel — the ledger, and the grading it leaves to the server', () => {
  const mountPanel = (listing, over) => mount(TrainingCompletionPanel, {
    mocks,
    propsData: Object.assign({
      listing,
      versions: [{ courseVersionId: 'v-pub', versionNo: 2, state: 'Published', passThresholdPercent: 80 }],
      zoneId: 'Europe/Oslo'
    }, over)
  })

  // The completions read is store-WIDE, so before these the table listed scores and pass/fail
  // verdicts against nothing at all — an evidence ledger that did not say what the evidence was of.
  test('EVERY row names the course and the version the attempt was stamped to', () => {
    const wrapper = mountPanel(answered('completions', [
      { completionId: 'x-1', personRef: PERSON, courseTitle: 'Ansvarlig alkoholservering', versionNo: 1, scorePercent: 90, passed: true, source: 'ManagerRecorded' },
      { completionId: 'x-2', personRef: OTHER_PERSON, courseTitle: 'Internkontroll mat', versionNo: 4, scorePercent: 55, passed: false, source: 'ManagerRecorded' }
    ]))
    const cells = wrapper.findAll('[data-test="completion-course"]')
    expect(cells).toHaveLength(2)
    // Two DIFFERENT courses, so a panel printing one course over the whole table fails here.
    expect(cells.at(0).text()).toContain('Ansvarlig alkoholservering')
    expect(cells.at(0).text()).toContain('v1')
    expect(cells.at(1).text()).toContain('Internkontroll mat')
    expect(cells.at(1).text()).toContain('v4')
  })

  test('the version shown is the one on the ROW, never the one the form happens to offer', () => {
    // The picker offers v2 (see mountPanel). A row filed against v1 keeps saying v1 — a panel that
    // named rows from the versions prop, or from the selected course, would print v2 here.
    const wrapper = mountPanel(answered('completions', [
      { completionId: 'x-1', personRef: PERSON, courseTitle: 'Ansvarlig alkoholservering', versionNo: 1, scorePercent: 90, passed: true, source: 'ManagerRecorded' }
    ]))
    expect(wrapper.find('[data-test="completion-course"]').text()).toContain('v1')
    expect(wrapper.find('[data-test="completion-course"]').text()).not.toContain('v2')
  })

  test('a row the server could not name prints a dash and no version flag, rather than disappearing', () => {
    // The ledger holds its course reference BY VALUE with no foreign key, so an unresolvable one is
    // a real state. It is still evidence and still listed.
    const wrapper = mountPanel(answered('completions', [
      { completionId: 'x-1', personRef: PERSON, courseTitle: null, versionNo: null, scorePercent: 90, passed: true, source: 'ManagerRecorded' }
    ]))
    expect(wrapper.findAll('[data-test="completion-row"]')).toHaveLength(1)
    expect(wrapper.find('[data-test="completion-course"]').text()).toBe('—')
    expect(wrapper.find('[data-test="completion-course"]').find('.trn-flag').exists()).toBe(false)
  })

  test('the column heading is a defined Norwegian word in all three locales, not a raw key', () => {
    // The mock falls back to the key, which is how a missing string ships green. Asserted against
    // every dictionary the app can load rather than against the one this file mounts with.
    const wrapper = mountPanel(answered('completions', [
      { completionId: 'x-1', personRef: PERSON, courseTitle: 'Kurs', versionNo: 1, scorePercent: 90, passed: true, source: 'ManagerRecorded' }
    ]))
    expect(wrapper.find('[data-test="completions-table"] th').text()).toBe(translations.no.trn_col_course)
    for (const locale of ['no', 'en', 'de']) {
      expect(typeof translations[locale].trn_col_course).toBe('string')
      expect(translations[locale].trn_col_course).not.toBe('trn_col_course')
      expect(translations[locale].trn_col_course.trim()).not.toBe('')
    }
  })

  test('a 0% score renders as 0%, not as a dash', () => {
    // Truthiness here would erase every failed attempt from an evidence ledger.
    const wrapper = mountPanel(answered('completions', [
      { completionId: 'x-1', personRef: PERSON, scorePercent: 0, passed: false, source: 'ManagerRecorded', versionContentHash: 'abc', completedAtUtc: '2026-07-01T09:00:00' }
    ]))
    expect(wrapper.find('[data-test="completion-row"]').findAll('td').at(2).text()).toBe('0%')
  })

  test('a score the server did not give is a dash, which is a different cell from 0%', () => {
    const wrapper = mountPanel(answered('completions', [
      { completionId: 'x-1', personRef: PERSON, passed: true, source: 'ManagerRecorded' },
      { completionId: 'x-2', personRef: PERSON, scorePercent: 0, passed: false, source: 'ManagerRecorded' }
    ]))
    const rows = wrapper.findAll('[data-test="completion-row"]')
    expect(rows.at(0).findAll('td').at(2).text()).toBe('—')
    expect(rows.at(1).findAll('td').at(2).text()).toBe('0%')
  })

  test('THE DEAD CONTROL IS GONE: there is no pass box, because the server never read one', () => {
    // The removed defect. `RecordTrainingCompletionRequest` carries PersonRef/CourseVersionId/
    // ScorePercent and no verdict field, and TrainingCompletionService derives `Passed` through
    // TrainingGrading.IsPass. The box that used to be here was discarded on arrival, under a hint
    // that claimed the opposite.
    const wrapper = mountPanel(answered('completions', []))
    expect(wrapper.find('[data-test="completion-passed"]').exists()).toBe(false)
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="completion-grading-note"]').text()).toBe(translations.no.trn_completion_grading_note)
  })

  test('the form states the rule and the SELECTED version\'s own threshold, so 55-against-80 is no surprise', async () => {
    const wrapper = mountPanel(answered('completions', []), {
      versions: [
        { courseVersionId: 'v-pub', versionNo: 2, state: 'Published', passThresholdPercent: 80 },
        { courseVersionId: 'v-ret', versionNo: 1, state: 'Retired', passThresholdPercent: 50 }
      ]
    })
    // Nothing is claimed before a version is chosen: the threshold belongs to a version.
    expect(wrapper.find('[data-test="completion-threshold-note"]').exists()).toBe(false)

    wrapper.find('[data-test="completion-version"]').setValue('v-pub')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="completion-threshold-note"]').text()).toContain('80')

    // The OTHER version's threshold, not the first one carried over.
    wrapper.find('[data-test="completion-version"]').setValue('v-ret')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="completion-threshold-note"]').text()).toContain('50')
  })

  test('a row is shown exactly as the server graded it, and the panel recomputes nothing', () => {
    // The table must never second-guess the ledger: the threshold that graded a row is the one
    // frozen into ITS version, which this panel does not hold.
    const wrapper = mountPanel(answered('completions', [
      { completionId: 'x-1', personRef: PERSON, scorePercent: 0, passed: true, source: 'ManagerRecorded' },
      { completionId: 'x-2', personRef: PERSON, scorePercent: 100, passed: false, source: 'ManagerRecorded' }
    ]))
    const rows = wrapper.findAll('[data-test="completion-row"]')
    expect(rows.at(0).findAll('td').at(3).text()).toBe(translations.no.trn_result_passed)
    expect(rows.at(1).findAll('td').at(3).text()).toBe(translations.no.trn_result_failed)
  })

  test('a Quiz-sourced row is labelled plainly and titled with what this build knows', () => {
    // No production code writes `Quiz`; a row carrying it came from outside this version.
    const wrapper = mountPanel(answered('completions', [
      { completionId: 'x-1', personRef: PERSON, scorePercent: 90, passed: true, source: 'Quiz' }
    ]))
    const cell = wrapper.find('[data-test="completion-row"]').findAll('td').at(4)
    expect(cell.text()).toBe(translations.no.trn_source_quiz)
    expect(cell.find('span').attributes('title')).toBe(translations.no.trn_source_quiz_note)
    // POSITIVE CONTROL: the source this surface actually produces carries no such title.
    const manager = mountPanel(answered('completions', [
      { completionId: 'x-2', personRef: PERSON, scorePercent: 90, passed: true, source: 'ManagerRecorded' }
    ]))
    expect(manager.find('[data-test="completion-row"]').findAll('td').at(4).find('span').attributes('title')).toBeUndefined()
  })

  test('the person hint says a KNOWN person is required, which is what the server now checks', () => {
    const wrapper = mountPanel(answered('completions', []))
    expect(wrapper.find('[data-test="completion-person-note"]').text()).toBe(translations.no.trn_completion_person_known)
  })

  test('a reference that is not a GUID is refused here, where the cause is known', async () => {
    const wrapper = mountPanel(answered('completions', []))
    wrapper.find('[data-test="completion-person"]').setValue('not-a-guid')
    wrapper.find('[data-test="completion-version"]').setValue('v-pub')
    wrapper.find('[data-test="completion-score"]').setValue('90')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="completion-person-malformed"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="completion-submit"]').attributes('disabled')).toBeTruthy()

    // POSITIVE CONTROL: a real id clears both.
    wrapper.find('[data-test="completion-person"]').setValue(PERSON)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="completion-person-malformed"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="completion-submit"]').attributes('disabled')).toBeFalsy()
  })

  test('passed and not-passed are two different words, and an absent flag is a dash', () => {
    const wrapper = mountPanel(answered('completions', [
      { completionId: 'x-1', personRef: PERSON, scorePercent: 90, passed: true },
      { completionId: 'x-2', personRef: PERSON, scorePercent: 40, passed: false },
      { completionId: 'x-3', personRef: PERSON, scorePercent: 40 }
    ]))
    const results = wrapper.findAll('[data-test="completion-row"]').wrappers.map(r => r.findAll('td').at(3).text())
    expect(results).toEqual([translations.no.trn_result_passed, translations.no.trn_result_failed, '—'])
  })

  test('with no frozen version the form explains itself instead of offering an empty picker', () => {
    const wrapper = mountPanel(answered('completions', []), { versions: [] })
    expect(wrapper.find('[data-test="completion-no-frozen"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="completion-version"]').exists()).toBe(false)
  })

  test('THE WIRE BODY CARRIES NO VERDICT — the score is the whole assertion', async () => {
    const wrapper = mountPanel(answered('completions', []))
    wrapper.find('[data-test="completion-person"]').setValue(PERSON)
    wrapper.find('[data-test="completion-version"]').setValue('v-pub')
    wrapper.find('[data-test="completion-score"]').setValue('55')
    await wrapper.vm.$nextTick()
    wrapper.find('[data-test="completion-form"]').trigger('submit')

    const body = wrapper.emitted()['record-completion'][0][0]
    expect(body).toEqual({ personRef: PERSON, courseVersionId: 'v-pub', scorePercent: 55 })
    // Named explicitly: a `passed` reappearing here would be silently discarded by the server, which
    // is exactly the defect that shipped.
    expect('passed' in body).toBe(false)
  })
})

describe('TrainingCertificatePanel — dated evidence', () => {
  const cert = over => Object.assign({
    certificateId: 'c-1',
    personRef: PERSON,
    type: 'food-handler',
    issuer: 'Mattilsynet',
    issueDateUtc: '2026-01-10T00:00:00',
    expiryDateUtc: '2028-01-10T00:00:00',
    status: 'Valid',
    createdAtUtc: '2026-01-10T09:00:00'
  }, over)

  const mountPanel = (listing, over) => mount(TrainingCertificatePanel, {
    mocks,
    propsData: Object.assign({ listing, zoneId: 'Europe/Oslo' }, over)
  })

  test('both dates are the authored day, unconverted', () => {
    // The suite runs under Europe/Oslo. A converted midnight would show as 10.01 02:00 at best and
    // as the PREVIOUS day for a reader west of UTC; the sliced day is the same everywhere.
    const wrapper = mountPanel(answered('certificates', [cert()]))
    const cells = wrapper.find('[data-test="certificate-row"]').findAll('td')
    expect(cells.at(3).text()).toBe('2026-01-10')
    expect(cells.at(4).text()).toBe('2028-01-10')
  })

  test('no expiry is a dash carrying the reason, and it is not the same as a missing value', () => {
    const wrapper = mountPanel(answered('certificates', [cert({ expiryDateUtc: null })]))
    const cell = wrapper.find('[data-test="certificate-row"]').findAll('td').at(4)
    expect(cell.text()).toBe('—')
    expect(cell.find('span').attributes('title')).toBe(translations.no.trn_cert_no_expiry)
  })

  test('the server\'s derived status is shown as given, and the moment it was derived is printed with it', () => {
    const wrapper = mountPanel(answered('certificates', [cert({ status: 'Expiring' })], '2026-07-29T08:00:00Z'))
    expect(wrapper.find('[data-test="certificate-row"]').findAll('td').at(5).text()).toBe(translations.no.trn_status_expiring)
    expect(wrapper.find('[data-test="certificates-status-note"]').text()).toContain('29')
  })

  test('THE DISTINCTION, varied: the three statuses render three different words', () => {
    const wrapper = mountPanel(answered('certificates', [
      cert({ certificateId: 'a', status: 'Valid' }),
      cert({ certificateId: 'b', status: 'Expiring' }),
      cert({ certificateId: 'c', status: 'Expired' })
    ]))
    const words = wrapper.findAll('[data-test="certificate-row"]').wrappers.map(r => r.findAll('td').at(5).text())
    expect(new Set(words).size).toBe(3)
  })

  test('a status the server did not give is a dash, never assumed valid', () => {
    const wrapper = mountPanel(answered('certificates', [cert({ status: null })]))
    expect(wrapper.find('[data-test="certificate-row"]').findAll('td').at(5).text()).toBe('—')
  })

  test('with no asOf on the answer the note says the moment is unknown rather than using the browser clock', () => {
    const wrapper = mountPanel(answered('certificates', [cert()]))
    expect(wrapper.find('[data-test="certificates-status-note"]').text()).toBe(translations.no.trn_certs_status_asof_unknown)
  })

  test('the form states that a KNOWN person is required — the check the server actually runs now', () => {
    const wrapper = mountPanel(answered('certificates', []))
    expect(wrapper.find('[data-test="certificate-person-note"]').text()).toBe(translations.no.trn_cert_person_known)
  })

  test('an expiry before the issue date is refused here, so it never becomes an unexplained 400', async () => {
    // The server refuses it (`The expiry date cannot precede the issue date.`) with the SAME
    // `training.validation` code as an unknown person. Pre-empting it here is what leaves the
    // unknown person as the only cause the page then has to name.
    const wrapper = mountPanel(answered('certificates', []))
    wrapper.find('[data-test="certificate-person"]').setValue(PERSON)
    wrapper.find('[data-test="certificate-type"]').setValue('food-handler')
    wrapper.find('[data-test="certificate-issue"]').setValue('2026-01-10')
    wrapper.find('[data-test="certificate-expiry"]').setValue('2025-12-31')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="certificate-expiry-order"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="certificate-submit"]').attributes('disabled')).toBeTruthy()

    // POSITIVE CONTROL: the same day is in order, and the server slices both to midnight too.
    wrapper.find('[data-test="certificate-expiry"]').setValue('2026-01-10')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="certificate-expiry-order"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="certificate-submit"]').attributes('disabled')).toBeFalsy()
  })

  test('a person reference that is not a GUID cannot be submitted', async () => {
    const wrapper = mountPanel(answered('certificates', []))
    wrapper.find('[data-test="certificate-person"]').setValue('44444444')
    wrapper.find('[data-test="certificate-type"]').setValue('food-handler')
    wrapper.find('[data-test="certificate-issue"]').setValue('2026-01-10')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="certificate-person-malformed"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="certificate-submit"]').attributes('disabled')).toBeTruthy()
  })

  test('an empty expiry is emitted as null — a certificate that never expires, not an unknown one', async () => {
    const wrapper = mountPanel(answered('certificates', []))
    wrapper.find('[data-test="certificate-person"]').setValue(PERSON)
    wrapper.find('[data-test="certificate-type"]').setValue('food-handler')
    wrapper.find('[data-test="certificate-issue"]').setValue('2026-01-10')
    await wrapper.vm.$nextTick()
    wrapper.find('[data-test="certificate-form"]').trigger('submit')

    expect(wrapper.emitted()['register-certificate'][0][0]).toEqual({
      personRef: PERSON,
      type: 'food-handler',
      issuer: null,
      issueDateUtc: '2026-01-10T00:00:00',
      expiryDateUtc: null,
      documentReference: null
    })
  })
})

describe('TrainingHoldingsPanel — four states, and none of them is a verdict', () => {
  const mountPanel = holdings => mount(TrainingHoldingsPanel, { mocks, propsData: { holdings } })

  test('THE DISTINCTION, varied: idle, unknown, refused and answered-empty are four screens', () => {
    const idle = mountPanel({ state: 'idle' })
    const unanswered = mountPanel(readHoldings(null, new Error('network')))
    const declined = mountPanel(readHoldings(null, refusal(404, 'training.not-found')))
    const empty = mountPanel(readHoldings({ personRef: PERSON, heldCompetencyKeys: [], certificates: [] }, null))

    expect(idle.find('[data-test="holdings-idle"]').exists()).toBe(true)
    expect(unanswered.find('[data-test="holdings-unknown"]').exists()).toBe(true)
    expect(declined.find('[data-test="holdings-refused"]').exists()).toBe(true)
    expect(empty.find('[data-test="holdings-answer"]').exists()).toBe(true)

    const seen = [
      idle.find('[data-test="holdings-idle"]').text(),
      unanswered.find('[data-test="holdings-unknown"]').text(),
      declined.find('[data-test="holdings-refused"]').text(),
      empty.find('[data-test="holdings-no-keys"]').text()
    ]
    expect(new Set(seen).size).toBe(4)
  })

  test('an answered-empty holding says nothing is on record, and says it is not a judgement', () => {
    const wrapper = mountPanel(readHoldings({ personRef: PERSON, heldCompetencyKeys: [], certificates: [] }, null))
    expect(wrapper.find('[data-test="holdings-no-keys"]').text()).toBe(translations.no.trn_holdings_no_keys)
    expect(wrapper.find('[data-test="holdings-not-a-verdict"]').text()).toBe(translations.no.trn_holdings_not_a_verdict)
  })

  test('held keys and valid certificates are both rendered', () => {
    const wrapper = mountPanel(readHoldings({
      personRef: PERSON,
      heldCompetencyKeys: ['food-hygiene', 'allergens'],
      certificates: [{ type: 'food-handler', issuer: 'Mattilsynet', issueDateUtc: '2026-01-10T00:00:00', expiryDateUtc: '2028-01-10T00:00:00', status: 'Valid' }],
      asOfUtc: '2026-07-29T08:00:00Z'
    }, null))

    expect(wrapper.findAll('[data-test="holdings-keys"] li').wrappers.map(w => w.text())).toEqual(['food-hygiene', 'allergens'])
    const cells = wrapper.find('[data-test="holdings-cert-row"]').findAll('td')
    expect(cells.at(0).text()).toBe('food-handler')
    expect(cells.at(3).text()).toBe('2028-01-10')
    expect(cells.at(4).text()).toBe(translations.no.trn_status_valid)
  })

  test('a refused lookup renders no key list at all, so absence cannot be read off it', () => {
    const wrapper = mountPanel(readHoldings(null, refusal(403, 'training.forbidden')))
    expect(wrapper.find('[data-test="holdings-keys"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="holdings-no-keys"]').exists()).toBe(false)
  })

  test('the lookup emits the trimmed reference', async () => {
    const wrapper = mountPanel({ state: 'idle' })
    wrapper.find('[data-test="holdings-person"]').setValue('  ' + PERSON + '  ')
    await wrapper.vm.$nextTick()
    wrapper.find('[data-test="holdings-form"]').trigger('submit')
    expect(wrapper.emitted().lookup[0]).toEqual([PERSON])
  })

  test('a reference that could not bind is refused before the query is built', async () => {
    // The route takes `?person=` as a Guid; anything else is a framework 400 with no training code,
    // which this page could only report as "something went wrong".
    const wrapper = mountPanel({ state: 'idle' })
    wrapper.find('[data-test="holdings-person"]').setValue('kari')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="holdings-person-malformed"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="holdings-lookup"]').attributes('disabled')).toBeTruthy()
  })
})

describe('TrainingReferenceField — a picker that assists typing and never replaces it', () => {
  const mountField = (directory, over) => mount(TrainingReferenceField, {
    mocks,
    propsData: Object.assign({ label: 'Person-ID', directory, testId: 'ref' }, over)
  })

  const people = [
    { id: PERSON, label: 'Kari Nordmann', ended: false },
    { id: OTHER_PERSON, label: 'Ola Nordmann', ended: true }
  ]

  test('THE INPUT SURVIVES EVERY STATE OF THE DIRECTORY — including the one where it answered', () => {
    // A refused roster is an ordinary outcome for a Training manager with no Workforce capability,
    // and the suggestions are not the accepted set even when it answers. Closing the field would
    // refuse writes the server takes.
    const states = [
      { state: 'unknown', options: [] },
      { state: 'refused', options: [] },
      { state: 'answered', options: [] },
      { state: 'answered', options: people }
    ]
    for (const directory of states) {
      expect(mountField(directory).find('[data-test="ref"]').exists()).toBe(true)
    }
  })

  test('THE DISTINCTION, varied: unknown, refused, answered-empty and answered give four sentences', () => {
    const seen = [
      mountField({ state: 'unknown', options: [] }).find('[data-test="ref-directory"]').text(),
      mountField({ state: 'refused', options: [] }).find('[data-test="ref-directory"]').text(),
      mountField({ state: 'answered', options: [] }).find('[data-test="ref-directory"]').text(),
      mountField({ state: 'answered', options: people }).find('[data-test="ref-directory"]').text()
    ]
    expect(new Set(seen).size).toBe(4)
  })

  test('the picker appears ONLY when the directory answered with somebody', () => {
    expect(mountField({ state: 'unknown', options: [] }).find('[data-test="ref-picker"]').exists()).toBe(false)
    expect(mountField({ state: 'refused', options: [] }).find('[data-test="ref-picker"]').exists()).toBe(false)
    expect(mountField({ state: 'answered', options: [] }).find('[data-test="ref-picker"]').exists()).toBe(false)
    expect(mountField({ state: 'answered', options: people }).find('[data-test="ref-picker"]').exists()).toBe(true)
  })

  test('picking somebody emits their id, so the text field stays the single source of truth', () => {
    const wrapper = mountField({ state: 'answered', options: people })
    wrapper.find('[data-test="ref-picker"]').setValue(PERSON)
    expect(wrapper.emitted().input[0]).toEqual([PERSON])
  })

  test('re-selecting the placeholder does NOT wipe a reference that is already typed', () => {
    const wrapper = mountField({ state: 'answered', options: people }, { value: PERSON })
    wrapper.find('[data-test="ref-picker"]').setValue('')
    expect(wrapper.emitted().input).toBeUndefined()
  })

  test('the picker reflects the TYPED value, so it doubles as confirmation that a pasted id names somebody', () => {
    const matched = mountField({ state: 'answered', options: people }, { value: PERSON })
    expect(matched.find('[data-test="ref-picker"]').element.value).toBe(PERSON)
    expect(matched.find('[data-test="ref-directory"]').text()).toContain('Kari Nordmann')

    // An id nobody on the roster holds falls back to the placeholder rather than showing a stale pick.
    const unmatched = mountField({ state: 'answered', options: people }, { value: '11111111-1111-1111-1111-111111111111' })
    expect(unmatched.find('[data-test="ref-picker"]').element.value).toBe('')
  })

  test('an unrecognised id says it may still be accepted, because the server\'s check is estate-wide', () => {
    // TrainingPersonBinding checks that a WorkforcePerson EXISTS, in any state, anywhere — not that
    // they are engaged at this store. "Not on this roster" is a weaker claim than "invalid".
    const wrapper = mountField({ state: 'answered', options: people }, { value: '11111111-1111-1111-1111-111111111111' })
    expect(wrapper.find('[data-test="ref-directory"]').text()).toBe(translations.no.trn_directory_people_no_match)
  })

  test('a half-typed id does not fire the unrecognised warning on every keystroke', () => {
    const wrapper = mountField({ state: 'answered', options: people }, { value: '1111' })
    expect(wrapper.find('[data-test="ref-directory"]').text()).toBe(translations.no.trn_directory_people_pick)
  })

  test('an ended engagement is MARKED rather than dropped — the person is still real', () => {
    const wrapper = mountField({ state: 'answered', options: people })
    const labels = wrapper.findAll('[data-test="ref-picker"] option').wrappers.map(w => w.text())
    expect(labels).toHaveLength(3)
    expect(labels[1]).toBe('Kari Nordmann')
    expect(labels[2]).toContain('Ola Nordmann')
    expect(labels[2]).not.toBe('Ola Nordmann')
  })

  test('an ABSENT directory reads as unknown, never as refused — refused is a positive claim', () => {
    const wrapper = mount(TrainingReferenceField, { mocks, propsData: { label: 'Person-ID', testId: 'ref', directory: null } })
    expect(wrapper.find('[data-test="ref-directory"]').text()).toBe(translations.no.trn_directory_people_unknown)
    expect(wrapper.find('[data-test="ref"]').exists()).toBe(true)
  })

  test('the role variant says something different from the person variant in every state', () => {
    const asPerson = s => mountField(s, { kind: 'person' }).find('[data-test="ref-directory"]').text()
    const asRole = s => mountField(s, { kind: 'role' }).find('[data-test="ref-directory"]').text()
    for (const state of [{ state: 'unknown', options: [] }, { state: 'refused', options: [] }, { state: 'answered', options: [] }]) {
      expect(asPerson(state)).not.toBe(asRole(state))
    }
  })
})

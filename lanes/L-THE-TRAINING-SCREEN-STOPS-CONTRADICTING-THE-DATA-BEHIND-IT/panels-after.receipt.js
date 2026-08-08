// LANE RECEIPT — not a committed test. The two write forms, rendered by their REAL templates, fed
// the course list the fixed API will serve for THIS world (store 1 on :5971, read through the app's
// own course reads by walk-projected.js). It writes what a manager would see and asserts nothing a
// reviewer could not check by reading the output.
import fs from 'fs'
import path from 'path'
import { mount } from '@vue/test-utils'
import TrainingAssignmentPanel from '~/components/admin/training/TrainingAssignmentPanel.vue'
import TrainingCompletionPanel from '~/components/admin/training/TrainingCompletionPanel.vue'
import { readListing, storeVersions, versionsAreUnknown, assignableVersions, recordableVersions } from '~/utils/training/journey'
import translations from '~/translations'

const LANE = '/Users/svendaneel/okam/Web-modules/lanes/L-THE-TRAINING-SCREEN-STOPS-CONTRADICTING-THE-DATA-BEHIND-IT'
const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}
const mocks = { $i }

test('LANE RECEIPT: nothing selected, the store\'s own versions are offered', () => {
  const live = JSON.parse(fs.readFileSync(path.join(LANE, 'walk-projected-versions.json'), 'utf8'))

  // The course list document as `TrainingCourseService.ListCoursesAsync` now composes it.
  const courses = Object.keys(live.titleOf).map(courseId => ({
    courseId,
    title: live.titleOf[courseId],
    versions: (live.versionsOfCourse[courseId] || []).slice().sort((a, b) => b.versionNo - a.versionNo),
    versionCount: (live.versionsOfCourse[courseId] || []).length,
    hasPublishedVersion: (live.versionsOfCourse[courseId] || []).some(v => v.state === 'Published')
  }))
  const coursesListing = readListing({ courses, asOfUtc: '2026-08-06T21:00:00Z' }, null, 'courses')
  const all = storeVersions(coursesListing)

  const assign = mount(TrainingAssignmentPanel, {
    mocks,
    propsData: {
      listing: readListing({ assignments: [], asOfUtc: null }, null, 'assignments'),
      versions: assignableVersions(all),
      versionsUnknown: versionsAreUnknown(coursesListing),
      zoneId: 'Europe/Oslo'
    }
  })
  const record = mount(TrainingCompletionPanel, {
    mocks,
    propsData: {
      listing: readListing({ completions: [], asOfUtc: null }, null, 'completions'),
      versions: recordableVersions(all),
      versionsUnknown: versionsAreUnknown(coursesListing),
      zoneId: 'Europe/Oslo'
    }
  })

  const options = (w, sel) => w.findAll('[data-test="' + sel + '"] option').wrappers.map(o => o.text()).slice(1)
  const assignOptions = options(assign, 'assignment-version')
  const recordOptions = options(record, 'completion-version')
  const lines = [
    'This world holds ' + courses.length + ' courses and ' + all.length + ' versions.',
    '',
    'NY TILDELING, with no course selected',
    '  denies a published version exists : ' + assign.find('[data-test="assignment-no-published"]').exists(),
    '  offers a version picker            : ' + assign.find('[data-test="assignment-version"]').exists(),
    '  the options it offers:',
    ...assignOptions.map(t => '    ' + t),
    '',
    'FOR EN GJENNOMFORING, with no course selected',
    '  denies a frozen version exists    : ' + record.find('[data-test="completion-no-frozen"]').exists(),
    '  offers a version picker            : ' + record.find('[data-test="completion-version"]').exists(),
    '  the options it offers:',
    ...recordOptions.map(t => '    ' + t)
  ]
  fs.writeFileSync(path.join(LANE, 'panels-after.txt'), lines.join('\n') + '\n')

  expect(assign.find('[data-test="assignment-no-published"]').exists()).toBe(false)
  expect(assignOptions.length).toBe(assignableVersions(all).length)
  expect(recordOptions.length).toBe(recordableVersions(all).length)
  expect(record.find('[data-test="completion-no-frozen"]').exists()).toBe(false)
})

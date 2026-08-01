import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import WorkforceSchedulePage from '~/pages/admin/workforce-schedule.vue'
import { WorkforceApiError } from '~/utils/workforce/api-client'

// THE §9.2 KILL SWITCH, ON THE SCHEDULE PAGE.
//
// `workforce.publication` gates all FOUR schedule writes — `CreateDraftAsync`, `BatchAssignmentsAsync`,
// `ValidateAsync` and `PublishAsync` each pass it to `RequireWriteCapabilityAsync` — and
// `WorkforceModuleGate.EnsureStageWriteEnabledAsync` refuses a disabled one with
// `WorkforceProblemException.FlagDisabledReadOnly(flag)`: 409, code `workforce.flag-disabled-read-only`,
// `conflictKind: "flag-disabled-read-only"`, and the flag key on `flag` — carried precisely so a
// client can name which lever to pull, because "a workforce feature is disabled" cannot be acted on.
//
// Until this lane the page had no branch for that kind, so the refusal fell to the generic
// `wf_conflict_generic_title` + the server's English detail, with nothing naming the flag and nowhere
// to go. These tests are about the sentence the manager actually reads.

const behaviour = {}

jest.mock('~/utils/workforce/schedule-client', () => ({
  WorkforceScheduleService: class {
    GetContext () {
      return Promise.resolve({
        timeZone: { id: 'Europe/Oslo' },
        capabilities: ['WorkforceScheduler', 'WorkforceManager']
      })
    }

    ListStaff () { return Promise.resolve([]) }
    ListRoles () { return Promise.resolve([]) }
    GetExternalCommitments () { return Promise.resolve({ items: [], timeZoneId: 'Europe/Oslo' }) }

    // A week that already holds a VALIDATED revision, which is the only state in which the page
    // offers `Publiser` at all (`canPublish`).
    GetRange (_storeId, _from, _to, view) {
      return Promise.resolve({
        view,
        scheduleRevisionId: 'rev-1',
        eTag: 'etag-1',
        state: 'Validated',
        revisionNumber: 1,
        publicationNumber: null,
        timeZoneId: 'Europe/Oslo',
        // No `asOfUtc`: the state band formats it through `formatDate`, which the global mixin
        // supplies and no unit test can load (`core/` is an uninitialised submodule by design).
        assignments: [],
        cost: null
      })
    }

    Publish () {
      return behaviour.Publish
        ? behaviour.Publish()
        : Promise.resolve({ publicationNumber: 1, recipientCount: 2 })
    }
  }
}))

jest.mock('~/utils/workforce/requests-client', () => ({
  WorkforceRequestsService: class {
    ListRequests () { return Promise.resolve({ items: [] }) }
  }
}))

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

function mountPage () {
  return shallowMount(WorkforceSchedulePage, {
    mocks: {
      $i: (key, params) => (params ? key + ':' + JSON.stringify(params) : key),
      $store: {
        getters: { userIsLoggedIn: true },
        state: { selectedAdminStore: 42, adminLocale: 'no', currentUser: { id: 1, adminIn: [{ id: 42 }] } }
      },
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' }, NuxtLink: true }
  })
}

/** The refusal exactly as `WorkforceProblemException.FlagDisabledReadOnly` builds it. */
const flagRefusal = flag => new WorkforceApiError(409, {
  type: 'https://okam.test/problems/workforce.flag-disabled-read-only',
  title: 'workforce.flag-disabled-read-only',
  status: 409,
  code: 'workforce.flag-disabled-read-only',
  detail: 'The workforce feature is disabled for this store; the surface is read-only.',
  conflictKind: 'flag-disabled-read-only',
  flag,
  retryable: false
})

beforeEach(() => { Object.keys(behaviour).forEach(key => delete behaviour[key]) })

describe('publish, refused because the stage flag is down', () => {
  test('the week offers publish while the flag is up', async () => {
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.canPublish).toBe(true)
    expect(wrapper.find('.wf-page__conflict').exists()).toBe(false)
  })

  // THE EXIT CRITERION, at the unit level: with the flag off the press produces the TYPED refusal on
  // screen — not a generic failure, not a silent nothing, and not a toast that scrolls away.
  test('with the flag off the press renders the typed refusal, naming the flag', async () => {
    behaviour.Publish = () => Promise.reject(flagRefusal('workforce.publication'))
    const wrapper = mountPage()
    await settled()

    await wrapper.vm.publish()
    await settled()

    const banner = wrapper.find('.wf-page__conflict')
    expect(banner.exists()).toBe(true)
    expect(wrapper.vm.conflictHeadline).toBe('wf_conflict_flag_title')
    // The flag key is IN the sentence. A refusal that named no lever is a refusal nobody can act on.
    expect(wrapper.vm.conflictDetail).toBe('wf_conflict_flag:{"flag":"workforce.publication"}')
    expect(wrapper.vm.conflictFlag).toBe('workforce.publication')
  })

  // The refusal is only actionable if the operator can reach the lever, and the lever is a page in
  // this same admin. C3: the capability and the way to it land together.
  test('the refusal links to the page that holds the lever', async () => {
    behaviour.Publish = () => Promise.reject(flagRefusal('workforce.publication'))
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.publish()
    await settled()

    const link = wrapper.find('.wf-page__conflict-link')
    expect(link.exists()).toBe(true)
    expect(link.attributes('to')).toBe('/admin/feature-flags')
  })

  test('the view does NOT switch to published when the publish was refused', async () => {
    behaviour.Publish = () => Promise.reject(flagRefusal('workforce.publication'))
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.publish()
    await settled()
    expect(wrapper.vm.view).toBe('draft')
    // Still Validated, so the button is still there: the week was not changed by being refused.
    expect(wrapper.vm.canPublish).toBe(true)
  })

  // The server carries the key so a client need not guess it. A refusal that omitted it must produce
  // an honest "we were not told which" rather than a blank where a lever's name belongs.
  test('a refusal with no flag key says so instead of printing an empty name', async () => {
    behaviour.Publish = () => Promise.reject(flagRefusal(undefined))
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.publish()
    await settled()
    expect(wrapper.vm.conflictFlag).toBeNull()
    expect(wrapper.vm.conflictDetail).toBe('wf_conflict_flag_unnamed')
  })

  // The branch keys on the CONFLICT KIND, not on whether a `flag` field happens to be present. The
  // second body below is the one that matters: a different refusal carrying a stray `flag` must not
  // be relabelled "the schedule is read-only" and must not send the manager to the switchboard,
  // where nothing they can flip would help. Written this way because the first body alone passes
  // even with the kind check deleted — it carries no `flag`, so the assertion could not fail.
  test.each([
    ['a refusal with no flag field', { code: 'workforce.revision-not-validated', conflictKind: 'assignment-invalid' }],
    ['a refusal of another kind that happens to carry one', {
      code: 'workforce.assignment-overlap',
      detail: 'This person already has an overlapping shift.',
      conflictKind: 'assignment-overlap',
      flag: 'workforce.publication'
    }]
  ])('%s offers no switchboard link and is not relabelled', async (_name, problem) => {
    behaviour.Publish = () => Promise.reject(new WorkforceApiError(409, problem))
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.publish()
    await settled()
    expect(wrapper.find('.wf-page__conflict').exists()).toBe(true)
    expect(wrapper.vm.conflictFlag).toBeNull()
    expect(wrapper.vm.conflictHeadline).not.toBe('wf_conflict_flag_title')
    expect(wrapper.find('.wf-page__conflict-link').exists()).toBe(false)
  })

  // And back on. `load()` clears the conflict, so returning from the switchboard and re-reading the
  // week leaves no stale refusal on screen to be mistaken for a live one.
  test('with the flag back on the publish lands and the refusal is gone', async () => {
    behaviour.Publish = () => Promise.reject(flagRefusal('workforce.publication'))
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.publish()
    await settled()
    expect(wrapper.find('.wf-page__conflict').exists()).toBe(true)

    delete behaviour.Publish
    await wrapper.vm.publish()
    await settled()
    expect(wrapper.vm.conflict).toBeNull()
    expect(wrapper.find('.wf-page__conflict').exists()).toBe(false)
    expect(wrapper.vm.view).toBe('published')
    expect(wrapper.vm.toast.message).toBe('wf_published_ok:{"count":2}')
  })
})

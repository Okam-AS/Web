import { shallowMount } from '@vue/test-utils'
import AccountEmailPage from '~/pages/admin/account-email.vue'
import translations from '~/translations'
import AdminPageHeader from '~/components/organisms/AdminPageHeader.vue'

// THE ACCOUNT AS THE SERVER HOLDS IT, and the only thing `Reload()` is allowed to write into the
// store. The page must never report a state this object does not carry — that is the difference
// between "the account is confirmed" and "this page asked something and assumed the best".
let account

const calls = []
const behaviour = {}

function serviceCall (name, args, fallback) {
  calls.push([name].concat(args))
  const override = behaviour[name]
  if (typeof override === 'function') { return override.apply(null, args) }
  return Promise.resolve(fallback)
}

const i18nCalls = []

function mountPage (currentUser) {
  const state = {
    adminLocale: 'no',
    currentUser: currentUser || { id: 'u1', adminIn: [{ id: 42 }] }
  }
  return shallowMount(AccountEmailPage, {
    mocks: {
      $i: (key, params) => { i18nCalls.push([key, params]); return key },
      $store: {
        getters: { userIsLoggedIn: true },
        state
      },
      _userService: {
        // `AdminUserService.Reload` re-reads `GET /user` and dispatches SetCurrentUser, so from the
        // page's side a reload is "the store now holds what the server said". Modelled exactly that
        // way, from `account` — which the confirm route below mutates — so a page that reported its
        // own optimism instead of the server's answer would be visible here.
        Reload: () => {
          state.currentUser = Object.assign({}, state.currentUser, account)
          return serviceCall('Reload', [], true)
        },
        SendEmailConfirmationCode: email => serviceCall('SendEmailConfirmationCode', [email], true),
        ConfirmEmail: code => serviceCall('ConfirmEmail', [code], true)
      }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' }, NuxtLink: true }
  })
}

const callsTo = name => calls.filter(c => c[0] === name)
const settled = () => new Promise(resolve => setTimeout(resolve, 0))

beforeEach(() => {
  calls.length = 0
  i18nCalls.length = 0
  Object.keys(behaviour).forEach(k => delete behaviour[k])
  account = { email: null, emailConfirmed: false }
})

describe('what the screen reports about the account', () => {
  test('an account with no address reports "missing", not "unconfirmed"', async () => {
    // Two different situations with two different next steps, and the second is the ordinary one for
    // an administrator who signed up by phone. Folding them into one negative state would tell that
    // person to check a mailbox no code was ever sent to.
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.status).toBe('missing')
  })

  test('an address on file that is not confirmed reports "unconfirmed"', async () => {
    account = { email: 'kari@example.test', emailConfirmed: false }
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.status).toBe('unconfirmed')
  })

  test('a confirmed address reports "confirmed"', async () => {
    account = { email: 'kari@example.test', emailConfirmed: true }
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.status).toBe('confirmed')
  })

  test('the status follows the ACCOUNT and not the box the operator is typing in', async () => {
    // The bound content, not the shape. A rewrite that kept every element and read `addressField`
    // instead of `account` would flip the badge to "confirmed" the moment somebody retyped the
    // address they already had — a screen reporting a fact it has not been told.
    account = { email: 'kari@example.test', emailConfirmed: false }
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.status).toBe('unconfirmed')
    wrapper.setData({ addressField: 'someone.else@example.test' })
    await settled()
    expect(wrapper.vm.status).toBe('unconfirmed')
    expect(wrapper.vm.accountAddress).toBe('kari@example.test')
  })

  test('an outstanding confirmation opens the code step without asking for a second code', async () => {
    // An unconfirmed address on file means a code was minted when it was set and is live for fifteen
    // minutes. Somebody who started the confirmation elsewhere can finish it here.
    account = { email: 'kari@example.test', emailConfirmed: false }
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.codeStep).toBe(true)
    expect(callsTo('SendEmailConfirmationCode')).toEqual([])
  })

  test('a confirmed account does not open the code step', async () => {
    // The positive control for the assertion above: without it, `codeStep === true` would be
    // satisfied by a page that simply always opens the box.
    account = { email: 'kari@example.test', emailConfirmed: true }
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.codeStep).toBe(false)
  })
})

describe('requesting a code', () => {
  test('a malformed address is refused here, and NOTHING is sent', async () => {
    // The server parses with `MailboxAddress.Parse`, whose `ParseException` escapes
    // `UserController`'s `catch (AppException)` as an unhandled 500. The refusal has to happen before
    // the call or the operator gets a server error for a typo.
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ addressField: 'kari.telefon@' })
    await wrapper.vm.requestCode()
    expect(wrapper.vm.addressInvalid).toBe(true)
    expect(callsTo('SendEmailConfirmationCode')).toEqual([])
    expect(wrapper.vm.codeStep).toBe(false)
  })

  test('a well-formed address IS sent — trimmed, and exactly once', async () => {
    // The positive control the test above needs: without it, "nothing was sent" would also hold for
    // a page whose button is wired to nothing at all.
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ addressField: '  kari@example.test  ' })
    account = { email: 'kari@example.test', emailConfirmed: false }
    await wrapper.vm.requestCode()
    expect(callsTo('SendEmailConfirmationCode')).toEqual([['SendEmailConfirmationCode', 'kari@example.test']])
    expect(wrapper.vm.addressInvalid).toBe(false)
    expect(wrapper.vm.codeStep).toBe(true)
  })

  test('a refused send does not open the code step', async () => {
    behaviour.SendEmailConfirmationCode = () => Promise.resolve(false)
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ addressField: 'kari@example.test' })
    await wrapper.vm.requestCode()
    expect(wrapper.vm.codeStep).toBe(false)
    expect(wrapper.vm.toast.type).toBe('error')
    expect(wrapper.vm.toast.message).toBe('ae_send_failed')
  })

  test('a new request clears whatever six digits were already in the box', async () => {
    // Left in place, a stale code sits under a notice saying a NEW one was ordered — and the operator
    // presses confirm on the wrong one.
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ addressField: 'kari@example.test', codeField: '111111', codeStep: true })
    await wrapper.vm.requestCode()
    expect(wrapper.vm.codeField).toBe('')
  })
})

describe('confirming', () => {
  test('a code that is not six digits is refused without calling the server', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ codeStep: true, codeField: '123' })
    await wrapper.vm.confirmCode()
    expect(wrapper.vm.codeInvalid).toBe(true)
    expect(wrapper.vm.codeErrorKey).toBe('ae_code_invalid')
    expect(callsTo('ConfirmEmail')).toEqual([])
  })

  test('six digits ARE sent, and the account is re-read afterwards', async () => {
    const wrapper = mountPage()
    await settled()
    const readsBefore = callsTo('Reload').length
    wrapper.setData({ codeStep: true, codeField: '424242' })
    account = { email: 'kari@example.test', emailConfirmed: true }
    await wrapper.vm.confirmCode()
    expect(callsTo('ConfirmEmail')).toEqual([['ConfirmEmail', '424242']])
    // THE RE-READ IS THE POINT. A page that set `emailConfirmed` locally would report confirmed for
    // any truthy answer at all, including one this client misread. The account row is the only thing
    // entitled to say the address is confirmed.
    expect(callsTo('Reload').length).toBeGreaterThan(readsBefore)
    expect(wrapper.vm.status).toBe('confirmed')
  })

  test('a REFUSED code leaves the account exactly as it was', async () => {
    // The sharp one: the server answers `false` while the account still says unconfirmed, and the
    // screen must agree with the account rather than with the fact that it asked.
    account = { email: 'kari@example.test', emailConfirmed: false }
    behaviour.ConfirmEmail = () => Promise.resolve(false)
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ codeField: '999999' })
    await wrapper.vm.confirmCode()
    expect(wrapper.vm.status).toBe('unconfirmed')
    expect(wrapper.vm.codeInvalid).toBe(true)
    expect(wrapper.vm.codeErrorKey).toBe('ae_confirm_failed')
  })

  test('a thrown confirm is an error toast, never a success one', async () => {
    behaviour.ConfirmEmail = () => Promise.reject(new Error('network'))
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ codeStep: true, codeField: '424242' })
    await wrapper.vm.confirmCode()
    expect(wrapper.vm.toast.type).toBe('error')
    expect(wrapper.vm.status).not.toBe('confirmed')
  })
})

describe('C7 — no credential and no address ever reaches a message', () => {
  test('no rendered string is built from the address or the code', async () => {
    const address = 'kari.telefon@example.test'
    const code = '424242'
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ addressField: address })
    account = { email: address, emailConfirmed: false }
    await wrapper.vm.requestCode()
    wrapper.setData({ codeField: code })
    account = { email: address, emailConfirmed: true }
    await wrapper.vm.confirmCode()

    // BOTH VALUES REALLY WERE IN PLAY — they went to the server. Without this the assertion below
    // would hold for a page that never had either value at all, which proves nothing.
    expect(callsTo('SendEmailConfirmationCode')).toEqual([['SendEmailConfirmationCode', address]])
    expect(callsTo('ConfirmEmail')).toEqual([['ConfirmEmail', code]])

    // And no translation call carried either one, as a key or as an interpolation param.
    const leaked = i18nCalls.filter((entry) => {
      const rendered = entry[0] + ' ' + JSON.stringify(entry[1] || {})
      return rendered.includes(address) || rendered.includes(code)
    })
    expect(leaked).toEqual([])
  })

  test('every message this screen can show is rendered with NO params at all', async () => {
    // The structural half of the rule: with no interpolation there is nowhere an address or a code
    // could ever be threaded in by a later change. `notify` takes an already-rendered string.
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ addressField: 'kari@example.test' })
    await wrapper.vm.requestCode()
    wrapper.setData({ codeField: '424242' })
    await wrapper.vm.confirmCode()
    const withParams = i18nCalls.filter(entry => entry[1] !== undefined && entry[1] !== null)
    expect(withParams).toEqual([])
  })
})

describe('reachability — C3', () => {
  test('the sidebar offers the page, in the group that is not gated on store-admin membership', () => {
    // A capability exists only when it is reachable. The page could be perfect and, without this
    // entry, be reachable only by typing a URL — which is the exact defect this lane remedies, so
    // the link is asserted rather than assumed.
    const groups = AdminPageHeader.computed.navGroups.call({
      $i: key => key,
      showsStoreAdminNav: false,
      isKeyAccountManager: false,
      isPowerUser: false,
      onboardingInProgress: false
    })
    const me = groups.find(g => g.title === 'nav_group_me')
    expect(me).toBeDefined()
    const entry = me.items.find(i => i.path === '/admin/account-email')
    expect(entry).toBeDefined()
    expect(entry.label).toBe('nav_account_email')
    // AND IT IS DRAWN FOR SOMEBODY WITH NO STORE ADMIN MEMBERSHIP — `showsStoreAdminNav` is false
    // above. Every other group is withheld from that person; this one is the reason a worker's
    // sidebar is not a menu of dead ends, and the page sets `allow-non-admin` to match.
    expect(groups.filter(g => g.title === 'nav_group_modules')).toEqual([])
  })
})

describe('the copy itself — what the screen is allowed to assert', () => {
  const LOCALES = ['no', 'en', 'de']

  test('the code notice never claims the mail was delivered', () => {
    // `SendEmailConfirmationCodeAsync` hands the send to `FireAndForgetTask.Run` and returns true
    // without waiting, so nothing in the response knows whether a mail was accepted, let alone
    // delivered. Each locale says the code was ORDERED and admits we do not learn whether it
    // arrived, per locale, so a translation that keeps the shape and drops the admission reds.
    const ORDERED = { no: 'bestilt', en: 'ordered', de: 'bestellt' }
    const UNKNOWN = { no: 'Vi får ikke vite', en: 'We do not get to know', de: 'Wir erfahren nicht' }
    LOCALES.forEach((locale) => {
      const copy = translations[locale].ae_code_requested
      expect(copy).toEqual(expect.stringContaining(ORDERED[locale]))
      expect(copy).toEqual(expect.stringContaining(UNKNOWN[locale]))
    })
  })

  test('no ae_* sentence carries an interpolation slot', () => {
    // DERIVED from the union of the three files' own key sets rather than from a hand-written list,
    // so a key added to one locale is covered the day it is added. An `{address}` or a `{code}` slot
    // is the one way this screen's copy could ever put personal data or a credential into a message.
    const keys = new Set()
    LOCALES.forEach((locale) => {
      Object.keys(translations[locale]).filter(k => k.startsWith('ae_')).forEach(k => keys.add(k))
    })
    // The union is non-empty first: an empty set would make the loop below vacuously green.
    expect(keys.size).toBeGreaterThan(10)
    keys.forEach((key) => {
      LOCALES.forEach((locale) => {
        const copy = translations[locale][key]
        expect(typeof copy).toBe('string')
        expect(copy).not.toEqual(expect.stringContaining('{'))
      })
    })
  })

  test('the test-send refusal names the confirmation clause and points at this screen', () => {
    // ONE code covers FOUR situations now that the guard requires the address to be CONFIRMED, and
    // the sentence used to name only two. An administrator whose address is on file but unconfirmed
    // would read "if your account has no email address on file" and go hunting for a typo that does
    // not exist. The remedy is named because a deny-closed refusal with no reachable way out is a
    // wall — and until this lane there genuinely was none in admin.
    const CONFIRMED = { no: 'bekreftet', en: 'confirmed', de: 'bestätigt' }
    const REMEDY = { no: 'E-postadressen min', en: 'My email address', de: 'Meine E-Mail-Adresse' }
    LOCALES.forEach((locale) => {
      const copy = translations[locale].growth_error_test_address_not_own
      expect(copy).toEqual(expect.stringContaining(CONFIRMED[locale]))
      expect(copy).toEqual(expect.stringContaining(REMEDY[locale]))
      // Still no interpolation slot: the address must have nowhere to go (C7).
      expect(copy).not.toEqual(expect.stringContaining('{'))
      // And the sentence the remedy names has to be the nav label somebody will actually look for.
      expect(translations[locale].nav_account_email).toBe(REMEDY[locale])
    })
  })

  test('no ae_* sentence exists in one locale and not another', () => {
    const keys = new Set()
    LOCALES.forEach((locale) => {
      Object.keys(translations[locale]).filter(k => k.startsWith('ae_')).forEach(k => keys.add(k))
    })
    const missing = []
    keys.forEach((key) => {
      LOCALES.forEach((locale) => {
        if (!translations[locale][key]) { missing.push(locale + ':' + key) }
      })
    })
    expect(missing).toEqual([])
  })
})

import {
  ENTITY_TYPE_PUBLICATION,
  INBOX_KINDS,
  INBOX_STATES,
  filterInboxItems,
  isInboxFilterError,
  publicationCount,
  publicationsForNotice,
  resolveKind,
  resolveState,
  unreadPublications
} from '~/utils/workforce-me/inbox-filter'

const publication = (id, isRead) => ({
  inboxItemId: id,
  storeId: 90001,
  staffMemberId: '30000000-0000-0000-0000-000000000002',
  entityType: ENTITY_TYPE_PUBLICATION,
  entityReference: 'pub/' + id,
  schedulePublicationId: 'p-' + id,
  createdAtUtc: '2026-07-20T08:00:00Z',
  isRead,
  readAtUtc: isRead ? '2026-07-20T09:00:00Z' : null
})

describe('inbox filter — an unrecognised value is refused, never silently ignored', () => {
  // The manager inbox answers 400 workforce.invalid-inbox-filter rather than returning everything,
  // because a silently-dropped filter makes "matched nothing" and "never applied" indistinguishable.
  // The worker inbox takes no filters at all, so the same law has to hold here instead.
  test('an unknown kind throws instead of returning the unfiltered list', () => {
    const items = [publication('a', false), publication('b', true)]
    expect(() => filterInboxItems(items, { kind: 'time-off' })).toThrow()
  })

  test('an unknown state throws instead of returning the unfiltered list', () => {
    const items = [publication('a', false)]
    expect(() => filterInboxItems(items, { state: 'pending' })).toThrow()
  })

  test('the thrown error names the parameter, what was submitted, and what is accepted', () => {
    let caught = null
    try {
      resolveKind('exchange')
    } catch (e) {
      caught = e
    }

    expect(caught).not.toBeNull()
    expect(isInboxFilterError(caught)).toBe(true)
    expect(caught.parameter).toBe('kind')
    expect(caught.submitted).toBe('exchange')
    expect(caught.accepted).toEqual(INBOX_KINDS)
  })

  test('the accepted state vocabulary is echoed on a bad state', () => {
    let caught = null
    try {
      resolveState('approved')
    } catch (e) {
      caught = e
    }
    expect(caught.parameter).toBe('state')
    expect(caught.accepted).toEqual(INBOX_STATES)
  })

  test('the four manager request families are NOT accepted here — this inbox never carries them', () => {
    // The backend only ever writes entityType 'WorkforceSchedulePublication' into the worker inbox.
    // Offering these tokens would promise a filter that can only ever match nothing.
    const managerKinds = ['time-off', 'availability-exception', 'exchange', 'open-shift-request']
    managerKinds.forEach((kind) => {
      expect(() => resolveKind(kind)).toThrow()
    })
  })

  test('isInboxFilterError is false for unrelated errors', () => {
    expect(isInboxFilterError(new Error('boom'))).toBe(false)
    expect(isInboxFilterError(null)).toBe(false)
    expect(isInboxFilterError(undefined)).toBe(false)
  })
})

describe('inbox filter — lenient matching inside the vocabulary', () => {
  test('case and separators do not change the resolved token', () => {
    expect(resolveKind('Publication')).toBe('publication')
    expect(resolveKind('PUBLICATION')).toBe('publication')
    expect(resolveKind('  publication  ')).toBe('publication')
    expect(resolveState('UnRead')).toBe('unread')
    expect(resolveState('un-read')).toBe('unread')
    expect(resolveState('un_read')).toBe('unread')
  })

  test('an absent value means all, and all is a real token', () => {
    expect(resolveKind(null)).toBe('all')
    expect(resolveKind(undefined)).toBe('all')
    expect(resolveKind('')).toBe('all')
    expect(resolveState(null)).toBe('all')
    expect(resolveKind('all')).toBe('all')
  })

  test('lenient is not permissive — a near-miss still throws', () => {
    expect(() => resolveKind('publications')).toThrow()
    expect(() => resolveState('unreads')).toThrow()
  })
})

describe('inbox filter — filtering', () => {
  const items = [publication('a', false), publication('b', true), publication('c', false)]

  test('state=unread keeps only the unread items', () => {
    expect(filterInboxItems(items, { state: 'unread' }).map(i => i.inboxItemId)).toEqual(['a', 'c'])
  })

  test('state=read keeps only the read items', () => {
    expect(filterInboxItems(items, { state: 'read' }).map(i => i.inboxItemId)).toEqual(['b'])
  })

  test('kind=publication drops an item of another entity type', () => {
    const mixed = items.concat([{ inboxItemId: 'x', entityType: 'SomethingElse', isRead: false }])
    expect(filterInboxItems(mixed, { kind: 'publication' }).map(i => i.inboxItemId)).toEqual(['a', 'b', 'c'])
  })

  test('no filter returns every item', () => {
    expect(filterInboxItems(items, {}).length).toBe(3)
    expect(filterInboxItems(items).length).toBe(3)
  })

  test('unreadPublications returns the unread publication items', () => {
    expect(unreadPublications(items).map(i => i.inboxItemId)).toEqual(['a', 'c'])
  })
})

describe('inbox filter — an acknowledged publication stays on screen with its receipt', () => {
  // THE DEFECT THIS EXISTS FOR. Acknowledging implies seen, so the act that produces the receipt is
  // the same act that makes the row read. Built from `unreadPublications` alone, the notice lost the
  // row one tick after the receipt arrived and the worker was shown nothing at all. These cases pin
  // the resolved condition; the walk that proves a person sees it is workforce-week-run.
  const ack = item => ({ [item.schedulePublicationId]: item })

  test('an acknowledged row is kept even though acknowledging marked it read', () => {
    const pressed = publication('a', false)
    // The server's answer AFTER the press: the same publication, now read.
    const afterReload = [Object.assign({}, pressed, { isRead: true })]
    expect(publicationsForNotice(afterReload, ack(pressed)).map(i => i.inboxItemId)).toEqual(['a'])
  })

  test('a read row nobody acknowledged is still dropped', () => {
    const items = [publication('a', true), publication('b', false)]
    expect(publicationsForNotice(items, {}).map(i => i.inboxItemId)).toEqual(['b'])
  })

  test('with nothing acknowledged it is exactly the unread list', () => {
    const items = [publication('a', false), publication('b', true), publication('c', false)]
    expect(publicationsForNotice(items, {}).map(i => i.inboxItemId))
      .toEqual(unreadPublications(items).map(i => i.inboxItemId))
  })

  test('the receipt survives an inbox re-read that failed', () => {
    // `loadInbox()` catches and leaves the list null. The confirmation must not depend on that
    // second request succeeding — the worker performed the act either way.
    const pressed = publication('a', false)
    expect(publicationsForNotice(null, ack(pressed)).map(i => i.inboxItemId)).toEqual(['a'])
  })

  test('an acknowledged row the server stops reporting is not lost', () => {
    const pressed = publication('a', false)
    expect(publicationsForNotice([], ack(pressed)).map(i => i.inboxItemId)).toEqual(['a'])
  })

  test('the kept row is appended once, after what is still unread', () => {
    // Not duplicated, and not ahead of a plan the worker has yet to look at.
    const pressed = publication('a', false)
    const afterReload = [Object.assign({}, pressed, { isRead: true }), publication('b', false)]
    expect(publicationsForNotice(afterReload, ack(pressed)).map(i => i.inboxItemId)).toEqual(['b', 'a'])
  })

  test('a row the server has NOT marked read is kept once, in its unread position', () => {
    // The press is remembered whatever the server then says; if the row comes back still unread it
    // is already in the list and must not be added twice.
    const pressed = publication('a', false)
    const items = [pressed, publication('b', false)]
    expect(publicationsForNotice(items, ack(pressed)).map(i => i.inboxItemId)).toEqual(['a', 'b'])
  })

  test('the row carried forward is the SERVER\'s, so it reports itself as read', () => {
    // Which matters on screen: the heading, the unread dot and the mark-as-read button are all
    // claims about an unread row, and this one is not one any more.
    const pressed = publication('a', false)
    const afterReload = [Object.assign({}, pressed, { isRead: true })]
    expect(publicationsForNotice(afterReload, ack(pressed))[0].isRead).toBe(true)
  })

  test('not loaded with nothing acknowledged is still null, never an empty inbox', () => {
    expect(publicationsForNotice(null, {})).toBeNull()
    expect(publicationsForNotice(null, null)).toBeNull()
    expect(publicationsForNotice(undefined, undefined)).toBeNull()
  })
})

describe('inbox filter — not loaded is not empty', () => {
  // Honest state: a null inbox means the read has not completed. Collapsing that to [] would let the
  // page assert "no schedule has ever been published to you" on no evidence at all.
  test('a null item list stays null through the filter', () => {
    expect(filterInboxItems(null, { state: 'unread' })).toBeNull()
    expect(unreadPublications(null)).toBeNull()
  })

  test('publicationCount is null when unknown and 0 only when genuinely empty', () => {
    expect(publicationCount(null)).toBeNull()
    expect(publicationCount(undefined)).toBeNull()
    expect(publicationCount([])).toBe(0)
    expect(publicationCount([publication('a', false)])).toBe(1)
  })

  test('a bad filter still throws even when the list is not loaded', () => {
    // The filter contract does not depend on the data having arrived.
    expect(() => filterInboxItems(null, { kind: 'nonsense' })).toThrow()
  })
})

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

  test('the kept row is carried once, and stays where it was', () => {
    // Not duplicated, and NOT moved below the week that is still unread. This case used to pin
    // ['b', 'a'] — sorting unread first — and that ordering is the whole of
    // F-THE-ACKNOWLEDGE-BUTTON-CAN-CONFIRM-THE-NEXT-WEEK: see the describe block below.
    const pressed = publication('a', false)
    const afterReload = [Object.assign({}, pressed, { isRead: true }), publication('b', false)]
    expect(publicationsForNotice(afterReload, ack(pressed)).map(i => i.inboxItemId)).toEqual(['a', 'b'])
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

describe('inbox filter — confirming one week never moves another under the worker\'s finger', () => {
  // THE DEFECT THESE EXIST FOR, walked live against trunk 6b98839 on 2026-08-07 before any of this
  // was written. A worker held TWO unread publications. She pressed the acknowledge control at the
  // top of the notice; the row she confirmed was pushed to the bottom and the OTHER week rose into
  // the place she had just pressed, offering an identically-worded button. Her second press — the
  // press of someone who thinks the first did not register — answered `alreadyAcknowledged: false`
  // and wrote a FIRST acknowledgement for a week she had never opened. Both recipient rows carried
  // an `acknowledgedAtUtc` afterwards, which is what a payroll or an inspector reads.
  //
  // The law these pin: read state and acknowledgement state decide WHICH rows are shown and never in
  // what order. Position is a function of the row set alone.
  const ack = item => ({ [item.schedulePublicationId]: item })
  const at = (id, isRead, createdAtUtc) =>
    Object.assign(publication(id, isRead), { createdAtUtc })

  // Two weeks published minutes apart, as the inbox answers them: newest first.
  const NEWER = () => at('newer', false, '2026-07-20T10:00:00')
  const OLDER = () => at('older', false, '2026-07-20T08:00:00')

  test('the control at the top addresses the same publication before and after a press', () => {
    // The exit criterion, at the level the press is decided: the notice's first row is the same
    // publication once the press has landed and the inbox has been re-read.
    const before = publicationsForNotice([NEWER(), OLDER()], {})
    const pressed = before[0]
    const afterReload = [Object.assign({}, NEWER(), { isRead: true }), OLDER()]
    const after = publicationsForNotice(afterReload, ack(pressed))
    expect(before[0].schedulePublicationId).toBe('p-newer')
    expect(after[0].schedulePublicationId).toBe('p-newer')
  })

  test('a second press at the top would replay, because that row is the one already confirmed', () => {
    const pressed = NEWER()
    const afterReload = [Object.assign({}, pressed, { isRead: true }), OLDER()]
    const shown = publicationsForNotice(afterReload, ack(pressed))
    expect(shown.map(i => i.inboxItemId)).toEqual(['newer', 'older'])
    // The row still needing her attention is still on screen — this is not fixed by hiding it.
    expect(shown[1].isRead).toBe(false)
  })

  test('confirming a row in the MIDDLE moves neither the row above it nor the one below', () => {
    // Three weeks, the middle one confirmed. The hazard is any movement, and this is the shape that
    // shows it: sorting unread-first leaves the two unread rows adjacent and drops the confirmed one
    // to the bottom, so both of the worker's remaining rows change place.
    const middle = at('middle', false, '2026-07-20T09:00:00')
    const afterReload = [NEWER(), Object.assign({}, middle, { isRead: true }), OLDER()]
    expect(publicationsForNotice(afterReload, ack(middle)).map(i => i.inboxItemId))
      .toEqual(['newer', 'middle', 'older'])
  })

  test('the order does not depend on the order the inbox happened to answer in', () => {
    // The page re-reads the inbox after every press. A SQL ORDER BY with equal keys has no defined
    // order, so an order taken on trust could move a row for a reason nobody performed.
    const forward = publicationsForNotice([NEWER(), OLDER()], {}).map(i => i.inboxItemId)
    const reversed = publicationsForNotice([OLDER(), NEWER()], {}).map(i => i.inboxItemId)
    expect(forward).toEqual(['newer', 'older'])
    expect(reversed).toEqual(forward)
  })

  test('two rows that arrived in the same instant are still ordered the same way twice', () => {
    const a = at('aaa', false, '2026-07-20T08:00:00')
    const b = at('bbb', false, '2026-07-20T08:00:00')
    expect(publicationsForNotice([a, b], {}).map(i => i.inboxItemId)).toEqual(['aaa', 'bbb'])
    expect(publicationsForNotice([b, a], {}).map(i => i.inboxItemId)).toEqual(['aaa', 'bbb'])
  })

  test('newest first, and a bare stamp is read as UTC rather than as local', () => {
    // `createdAtUtc` arrives bare. A row carried over from a press and a row from the response must
    // be compared under ONE rule or the carried row lands in the wrong place on a non-UTC machine.
    const bare = at('bare', false, '2026-07-20T10:00:00')
    const zoned = at('zoned', false, '2026-07-20T09:00:00Z')
    expect(publicationsForNotice([zoned, bare], {}).map(i => i.inboxItemId)).toEqual(['bare', 'zoned'])
  })

  test('rows carried over from a press are ordered too, not left in object order', () => {
    // Both confirmed, and the re-read no longer reports either. They still come out newest first.
    const older = OLDER()
    const newer = NEWER()
    const kept = Object.assign(ack(older), ack(newer))
    expect(publicationsForNotice([], kept).map(i => i.inboxItemId)).toEqual(['newer', 'older'])
  })

  test('an unreadable arrival instant sorts last instead of taking the notice off screen', () => {
    const broken = at('broken', false, 'not-a-timestamp')
    const shown = publicationsForNotice([broken, OLDER()], {})
    expect(shown.map(i => i.inboxItemId)).toEqual(['older', 'broken'])
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

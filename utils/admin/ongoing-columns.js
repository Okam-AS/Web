import { OrderStatus } from '~/core/enums/order-status'

// Where an order goes on `/admin/ongoing`, and what the venue can do to it once it is there.
//
// THE DEFECT THIS EXISTS TO CLOSE. The board bucketed its three columns with three hand-written
// lists inside the page's computeds: `Accepted`, `Processing`, and `['ReadyForPickup',
// 'ReadyForDriver', 'Served']`. `OrderStatus` has nine members. Two of the seven an order can hold
// while it is still live — `DriverPickedUp` and `OpenCheck` — appeared in none of those lists.
//
// An order in either state was fetched by `GetAllOngoing()`, assigned to `this.orders`, counted by
// nothing and rendered by nothing. It was on the venue's operating screen in the sense that the
// browser held it in memory, and absent from it in every sense that matters: not visible, not
// countable, and — because `Fullfør` lives on the card — not completable from the screen the venue
// actually works from. `DriverPickedUp` is not obscure: `plugins/global-mixin.js` labels it
// "Sjåføren er på vei" and `pages/admin/orders.vue` lists it among the statuses it filters on.
//
// THE FAILURE MODE IS SILENCE, WHICH IS WHY THIS IS A TABLE AND NOT A BETTER LIST. Nothing threw and
// no column looked wrong; the order was just not there. A hand-written list produced that, and a
// better hand-written list would produce it again the first time a tenth status is added. So the
// board's rule is stated ONCE, as a total function over the enum:
//
//   every member of `OrderStatus` is either IN `BOARD` with a named column and a named action,
//   or IN `OFF_BOARD` with a written reason. `unclassifiedStatuses()` returns the members that are
//   in neither, and the suite asserts it is empty.
//
// Adding a status to `core/enums/order-status.ts` without deciding where it belongs therefore fails
// a test. It cannot fall through to nowhere again in silence.
//
// The two failure modes this leaves are both LOUD, and that pairing is the point:
//   - a status added to the enum and classified nowhere       → red suite, at `unclassifiedStatuses`
//   - a status the backend returns that this build's `core`   → rendered in the first column with no
//     pin has never heard of                                    action, never dropped (see below)

export const COLUMN_NEW = 'new'
export const COLUMN_PROCESSING = 'processing'
export const COLUMN_READY = 'ready'

// What the card's primary button offers. `ACTION_NEXT` advances the order one rung and is wired per
// column — the New column opens the processing modal, the Processing column writes the ready status
// — so the label is decided here while the handler stays where it was.
export const ACTION_NONE = null
export const ACTION_NEXT = 'next'
export const ACTION_COMPLETE = 'complete'

// The board's whole rule. One row per live status; the `why` is part of the row because a placement
// nobody can argue with is a placement nobody reviewed.
const BOARD = {
  // A check still open at the register. It is a live order and the venue must be able to SEE it —
  // that is the entire reason it is here — but the board deliberately offers no action on it: the
  // POS owns an open check's lifecycle until it is accepted, and `startProcessing` on a check that
  // is still being built would advance an order the register has not finished writing. Visible,
  // cancellable, and its receipt readable; not advanceable.
  [OrderStatus.OpenCheck]: { column: COLUMN_NEW, action: ACTION_NONE, why: 'open at the register; the POS owns it until it is accepted' },

  [OrderStatus.Accepted]: { column: COLUMN_NEW, action: ACTION_NEXT, why: 'placed and awaiting the kitchen' },
  [OrderStatus.Processing]: { column: COLUMN_PROCESSING, action: ACTION_NEXT, why: 'being cooked' },

  [OrderStatus.ReadyForPickup]: { column: COLUMN_READY, action: ACTION_COMPLETE, why: 'waiting on the counter for the guest' },
  [OrderStatus.ReadyForDriver]: { column: COLUMN_READY, action: ACTION_COMPLETE, why: 'waiting on the counter for a driver' },

  // THE ONE THAT WAS MISSING. The driver has it; the order is still open and somebody still has to
  // close it. It sits with the other out-of-the-kitchen statuses and carries the same `Fullfør`,
  // which is the difference between seeing the order and being able to finish it. `core/pinia/
  // order.ts` already collapses this rung onto `ReadyForDriver` when it draws the guest's progress
  // bar, so this is the placement the rest of the estate had already chosen.
  [OrderStatus.DriverPickedUp]: { column: COLUMN_READY, action: ACTION_COMPLETE, why: 'out for delivery and still open' },

  [OrderStatus.Served]: { column: COLUMN_READY, action: ACTION_COMPLETE, why: 'on the guest table and still open' }
}

// Off the board by decision, not by omission. Both are terminal: an order in either state is over,
// and this screen shows what is live. `pages/admin/orders.vue` is where they are read.
const OFF_BOARD = {
  [OrderStatus.Completed]: 'terminal — the order is closed',
  [OrderStatus.Canceled]: 'terminal — the order was cancelled'
}

const has = (table, status) => Object.prototype.hasOwnProperty.call(table, status)

/**
 * The members of `OrderStatus` that this board neither places nor excludes.
 *
 * The guard against a repeat. It is asserted empty by the suite, so a status added to the enum
 * cannot reach production without somebody choosing a column for it or writing down why it has none.
 */
export const unclassifiedStatuses = () => Object.keys(OrderStatus)
  .map(key => OrderStatus[key])
  .filter(status => !has(BOARD, status) && !has(OFF_BOARD, status))

/**
 * The column a status belongs in, or `null` if it is deliberately off the board.
 *
 * A status this build has never heard of — the backend returning a value before this repo's `core`
 * submodule pin carries it — is SURFACED in the first column rather than dropped. That is the same
 * choice the whole file makes: unrecognised is a reason to put something in front of a human, never
 * a reason to make it disappear. It arrives with no primary action, because a build that cannot name
 * the status cannot know which transition is legal from it.
 */
export const columnForStatus = (status) => {
  if (has(BOARD, status)) { return BOARD[status].column }
  if (has(OFF_BOARD, status)) { return null }
  return COLUMN_NEW
}

/** The primary button a card offers, or `ACTION_NONE`. */
export const actionForStatus = status => (has(BOARD, status) ? BOARD[status].action : ACTION_NONE)

/** The orders of one column, oldest first — the order a kitchen works in. */
export const ordersInColumn = (orders, column) => (orders || [])
  .filter(order => columnForStatus(order && order.status) === column)
  .sort((a, b) => new Date(a.created) - new Date(b.created))

// What a refused `GET /workforce/stores/{storeId}/context` is allowed to SAY.
//
// Every Workforce admin page opens on endpoint 1 and blocks on it: without the store's time zone the
// page renders nothing, so whatever this returns is the entire screen. Nine pages each wrote the same
// branch — `status === 403 ? "you have no workforce access" : "could not load"` — and that branch is
// wrong for the most ordinary 403 the route answers.
//
// TWO DIFFERENT REFUSALS SHARE THE STATUS. `WorkforceAuthorizationService.RequireAnyCapabilityAsync`
// checks the caller's capability FIRST and only then asks the module gate, so a caller who reaches
// `EnsureEnabledAsync` has already passed the capability check:
//
//   403 `workforce.forbidden`        the caller holds no capability in this store — about the PERSON
//   403 `workforce.module-disabled`  `workforce.module` is off for this store — about the MODULE
//
// Collapsing them sends an operator who has just switched the module off for this store — or whose
// platform never switched it on — to look at somebody's permissions for a switch. Every other module
// names the module in this situation (`mrg_module_off`, `ev_pipeline_disabled`, `meals_refusal_dark`,
// `trn_gate_invisible`), and Workforce itself already names it on the POS clock
// (`posclk_err_module_off`, keyed on this same code); the admin pages were the outlier.
//
// KEYED ON `code`, NEVER ON THE STATUS ALONE. The codes are a pinned public contract
// (`WorkforceErrorCodes`), the prose `detail` is not. The status is used only as the fallback for the
// case an intermediary strips the problem body — the same rule `classifyDecisionFailure` and
// `classifySelfFailure` already state for their own surfaces.

import { isWorkforceApiError } from '~/utils/workforce/api-client';

/** `workforce.module` is off for this store. Answered only AFTER the capability check has passed. */
export const CODE_MODULE_DISABLED = 'workforce.module-disabled';

/**
 * The one sentence that names the module. Shared by every admin page rather than duplicated per
 * page: the fact it reports is a property of the STORE, so nine wordings of it could only disagree.
 */
export const KEY_MODULE_OFF = 'wf_module_off';

/**
 * The `$i` key a refused context read earns.
 *
 * `keys.noCapability` and `keys.failed` stay per page because they are about that page's own
 * surface — the schedule says the week will not render, the roster says the dates will not. Only the
 * module-off sentence is shared, because only it is about something outside the page.
 *
 * @param {*} error the rejection from `GetContext`
 * @param {{noCapability: string, failed: string}} keys the page's own two sentences
 * @returns {string} an `$i` key
 */
export function contextRefusalKey (error, keys) {
  if (!isWorkforceApiError(error)) { return keys.failed; }
  if (error.code === CODE_MODULE_DISABLED) { return KEY_MODULE_OFF; }
  // Every other 403 on this route is about the caller — `workforce.forbidden`, or an untyped one
  // whose body an intermediary stripped. That is what the pages said before this existed, and it
  // stays their answer.
  return error.status === 403 ? keys.noCapability : keys.failed;
}

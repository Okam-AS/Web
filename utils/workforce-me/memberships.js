// Reading the caller's own engagements (#31 `GET /workforce/me/staff-memberships`).
//
// The one subtle field is `capabilityGrants`. It is a C# [Flags] enum
// (`Enums/Workforce/WorkforceCapability.cs`) rendered by Newtonsoft's StringEnumConverter, so a
// single grant is `"WorkforceSelf"`, several are the comma-separated `"WorkforceSelf, WorkforceScheduler"`,
// and an empty set is `"None"`. Splitting on the comma is the whole trick — but getting it wrong
// fails SILENTLY and totally: every membership reads as un-capable, the page calls nothing, and the
// worker sees an empty screen that looks like "you have no shifts" rather than a bug. That is why the
// numeric and array shapes are tolerated too rather than assumed away.

/** The self-service grant — what #33, #36, #37, #39–#43 require on the engagement. */
export const CAPABILITY_SELF = 'WorkforceSelf';

// Bit values from Enums/Workforce/WorkforceCapability.cs, needed only for the numeric wire shape.
const CAPABILITY_BITS = {
  WorkforceSelf: 1,
  WorkforceScheduler: 2,
  WorkforceManager: 4,
  WorkforcePayrollApprover: 8
};

/**
 * True when a membership's grants include `capability`.
 *
 * Accepts the three shapes a flags enum can arrive in: the comma-separated string the current wire
 * uses, an already-split array, and the raw integer bitmask.
 */
export function hasCapability (grants, capability) {
  if (grants === null || grants === undefined) { return false; }

  if (typeof grants === 'number') {
    const bit = CAPABILITY_BITS[capability];
    return !!bit && (grants & bit) === bit;
  }

  const tokens = Array.isArray(grants) ? grants : String(grants).split(',');
  return tokens.some(token => String(token).trim() === capability);
}

/** True when the engagement is one this worker can currently self-serve on. */
export function canSelfServe (membership) {
  return !!membership && membership.isActive === true && hasCapability(membership.capabilityGrants, CAPABILITY_SELF);
}

/**
 * The engagements the self-service reads actually cover.
 *
 * #33 and #39 both filter server-side to ACTIVE engagements holding WorkforceSelf, so asking for an
 * engagement outside this set returns a 403 the page can do nothing useful with. Selecting here keeps
 * the client's picture identical to the server's rather than issuing calls that are guaranteed to
 * fail and then reporting those failures to the worker as if something were wrong.
 *
 * Returns null when memberships are not loaded — an empty list means "you have no engagements", which
 * is a different and much stronger claim.
 */
export function selfServiceMemberships (memberships) {
  if (!memberships) { return null; }
  return memberships.filter(canSelfServe);
}

/** The engagement's role names as one string, or '' when it carries none. Never invents a role. */
export function roleSummary (membership) {
  if (!membership) { return ''; }
  return (membership.roleNames || []).filter(Boolean).join(', ');
}

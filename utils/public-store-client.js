// One anonymous store route, and deliberately only one.
//
// `GET /stores/slug/{slug}` answers `{ id }` and NOTHING else — `StoresController.GetBySlug` projects
// a single integer out of `GetStoreIdBySlugAsync`. That is what makes it safe to call from a page a
// member of the public opens: there is no store payload to leak.
//
// THE READS BESIDE IT ARE NOT HERE, AND THAT IS THE POINT. `GET /stores/{id}` and
// `GET /stores/basic/{id}` are `[AllowAnonymous]` too and would give a guest page the venue's NAME,
// which every guest surface in this module is currently missing. They are still not used, because
// `StoreService.GetStoreAsync` only strips `SendInvoiceToEmails` and `GiftcardBankAccountNumber`
// when the caller is an authenticated non-admin: an ANONYMOUS caller skips that branch entirely and
// receives them. Calling either from here would put a venue's invoicing addresses and giftcard bank
// account number into a response fetched by whoever holds the link. Naming a venue on the guest
// pages needs a projection that carries a name and nothing else; until one exists, the guest surface
// does without a venue name rather than paying that price for it.

import { WorkforceClientBase } from '~/utils/workforce/api-client';

export class PublicStoreService extends WorkforceClientBase {
  constructor () {
    // No initializer, so no bearer token: this is called from pages that have no signed-in user.
    super({});
  }

  /**
   * A store slug -> its numeric id, or null.
   *
   * Null for every failure, including 404 (the slug matches no store) and 400 (an empty one). The
   * caller cannot act differently on those, and treating "no such venue" as an error state would
   * turn a mistyped link into a page that looks broken instead of one that says the link is wrong.
   */
  async ResolveIdBySlug (slug) {
    if (!slug) { return null; }
    try {
      const payload = await this._request('GET', '/stores/slug/' + encodeURIComponent(slug));
      const id = payload && payload.id;
      return typeof id === 'number' && id > 0 ? id : null;
    } catch (e) {
      return null;
    }
  }
}

export default PublicStoreService;

<template>
  <!-- The admin area renders client-side only: its content depends on the login state, which the
       server does not have (the token lives in localStorage), so SSR markup would never match the
       client render. A hydration bail at this boundary leaves the router-view holding detached DOM
       references, after which client-side navigation updates the URL but not the page. -->
  <client-only>
    <div class="admin" :class="{ 'admin--collapsed': sidebarCollapsed, 'admin--chromeless': chromeless }">
      <AdminPageHeader
        v-if="!chromeless"
        :collapsed="sidebarCollapsed"
        @toggle-sidebar="toggleSidebar"
      />
      <div class="admin__main">
        <OnboardingNotification v-if="!chromeless && !isOnboardingPage" />
        <main :class="['admin__content', { admin__wrapper: !fullWidth && !chromeless }]">
          <slot />
        </main>
        <AdminPageFooter v-if="!chromeless && !userIsLoggedIn" />
      </div>
      <LoginModal
        v-if="showLogin"
        @close="closeLoginModal"
      />
    </div>
  </client-only>
</template>

<script>
import AdminPageHeader from "~/components/organisms/AdminPageHeader.vue";
import AdminPageFooter from "~/components/organisms/AdminPageFooter.vue";
import OnboardingNotification from "~/components/organisms/OnboardingNotification.vue";
import LoginModal from "~/components/molecules/LoginModal.vue";

// Where a signed-out admin lands. Deliberately the BARE path and not `/admin?redirect=…`:
// `closeLoginModal` answers a redirect query with `$router.replace` and therefore never emits
// `login-success`, which is the whole of F-IN-PAGE-SIGN-IN-IS-DEAD-END-TO-END. The bare path takes
// the emitting branch, and `pages/admin/index.vue` is listening for it — it is also the one admin
// page that mounts no LoginModal of its own, so nothing stacks on top of the shell's.
const SIGN_IN_PATH = "/admin";

export default {
  components: {
    AdminPageHeader,
    AdminPageFooter,
    OnboardingNotification,
    LoginModal,
  },
  props: {
    fullWidth: {
      type: Boolean,
      default: false,
    },
    // Full-screen mode with no sidebar/header/footer chrome (used by the POS register
    // flate). Auth handling (initAuth/LoginModal) is preserved so the page is still guarded.
    chromeless: {
      type: Boolean,
      default: false,
    },
    // Opt out of the STORE-ADMIN membership requirement — not out of authentication.
    //
    // The shell's default is that a signed-in user with an empty `adminIn` is not an admin of
    // anything and is sent to /registrer. That is right for all 46 pages that read or write a
    // store's data. It is wrong for a page whose content the BACKEND authorises per caller from the
    // token: `/workforce/me` resolves the worker's own engagements and never takes a store id, so a
    // shop assistant with no admin membership anywhere is precisely that page's intended user — and
    // the shell was bouncing them before they saw it.
    //
    // Defaults to false, so every existing page keeps the identical code path. Login, the redirect
    // dance and the LoginModal are untouched by this flag: an anonymous visitor to a page that sets
    // it is still sent to /admin?redirect=… exactly as before.
    allowNonAdmin: {
      type: Boolean,
      default: false,
    },
  },
  data: () => ({
    showLogin: false,
    sidebarCollapsed: false,
  }),
  computed: {
    isOnboardingPage() {
      return this.$route && this.$route.path.includes("/admin/onboarding");
    },
    userIsLoggedIn() {
      return this.$store.getters.userIsLoggedIn;
    },
  },
  // Signing out is a STATE change, not a navigation, and this shell is the one place that already
  // knows what an unauthenticated admin visitor is supposed to see. The sidebar and the footer each
  // answered it themselves with `window.location.href = '/'` — the CONSUMER storefront, which links
  // nowhere back into the admin and leaves an operator on a till with no way to sign in again.
  //
  // Watching the session rather than being called by the button means every way the session can end
  // lands in the same place: the sidebar's confirm dialog, the footer's dropdown, and the genuine
  // 401 that makes `AdminUserService` dispatch `ClearState` mid-navigation.
  watch: {
    userIsLoggedIn(isLoggedIn, wasLoggedIn) {
      if (isLoggedIn || !wasLoggedIn) {
        return;
      }
      this.showLogin = true;
      if (this.$route && this.$route.path !== SIGN_IN_PATH) {
        // Not `push`: a history entry pointing back at a page the visitor can no longer read is a
        // trip through the redirect form this sign-in path exists to avoid.
        const navigation = this.$router.replace(SIGN_IN_PATH);
        // vue-router 3.1+ rejects a redundant navigation. The guard above makes that unlikely
        // rather than impossible, and an unhandled rejection here would be the only thing on screen.
        if (navigation && typeof navigation.catch === "function") {
          navigation.catch(() => {});
        }
      }
    },
  },
  mounted() {
    if (typeof localStorage !== "undefined") {
      this.sidebarCollapsed = localStorage.getItem("adminSidebarCollapsed") === "true";
    }
    this.initAuth();
  },
  methods: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("adminSidebarCollapsed", this.sidebarCollapsed);
      }
    },
    async initAuth() {
    if (!this.$store.getters.userIsLoggedIn) {
      this.showLogin = true;
      // Only redirect to /admin if we're on a different admin page
      // This creates the redirect flow for protected pages
      if (this.$route && this.$route.path !== "/admin" && !this.$route.query.redirect) {
        this.$router.replace(`/admin?redirect=${encodeURIComponent(this.$route.fullPath)}`);
      }
    } else {
      await this._userService.Reload();
      if (this.allowNonAdmin) {
        return;
      }
      const adminIn = this.$store.state.currentUser?.adminIn;
      if (!adminIn || adminIn.length === 0) {
        this.$router.replace("/registrer");
        return;
      }
    }
    },
    // The shell owns the ONLY sign-in modal on an admin route, so a page that needs to raise one
    // asks for this one rather than mounting a second of its own. `initAuth` covers the page-load
    // case; this covers the one case the shell does not see — a session that was present at mount
    // and turned out to be stale when `_userService.Reload()` answered. `pages/admin/onboarding.vue`
    // and `pages/admin/wolt-menu.vue` both read that answer, and both used to say so by rendering a
    // duplicate `<LoginModal>` inside this component's own slot.
    openLogin () {
      this.showLogin = true;
    },
    // A `redirect` target is a PAGE, so it is compared against the page the visitor is on —
    // `$route.path`. It used to be compared against `$route.fullPath`, which is the path AND the
    // query, and the query is where the redirect target itself is written. On `/admin/ongoing?
    // redirect=/admin/ongoing` the two strings therefore never matched, and the shell answered a
    // sign-in performed ON the ongoing board by `replace`ing to the board the visitor was already
    // looking at.
    //
    // That is not a navigation. vue-router reuses the component for a same-path route change, so
    // `mounted` does not run a second time; the URL shed its query and nothing else happened. The
    // page's own recovery — the poll, the clock, the fullscreen listener — is hung off
    // `login-success`, and `login-success` was in the branch that was never taken. Measured on this
    // build before the change: `/orders/ongoing` calls after the sign-in = 0, board frozen, sign-in
    // still on screen (lanes/.../arm-A0-selfredirect-stock/verdict.json).
    //
    // The `replace` branch is still right when the target is a DIFFERENT page: that navigation
    // mounts the target, whose `mounted` is its own starter. Only the same-page case was wrong.
    closeLoginModal(isLoggedIn) {
      this.showLogin = !isLoggedIn;
      if (isLoggedIn) {
        const redirectTarget = this.redirectTargetPath();
        if (redirectTarget && redirectTarget !== this.$route.path) {
          // A different page: navigate to it exactly as asked, query and all, and shed the
          // `redirect` parameter by leaving this URL behind. Unchanged behaviour.
          this.$router.replace(this.rawRedirect());
        } else {
          // Already on the page the visitor asked for — tell it a session arrived, because nothing
          // else will. A page with no `@login-success` binding hears nothing and stays as it was.
          this.$emit('login-success');
        }
      }
    },
    // The path half of the `redirect` query. A redirect target may legitimately carry a query of its
    // own (`/admin/ongoing?storeId=1` — the store selector writes exactly that), and comparing the
    // whole string to `$route.path` would call that a different page and start the same silent
    // `replace` over again. vue-router hands back an array when a key is repeated, so the first
    // value is taken rather than stringifying `[a,b]` into a path that matches nothing.
    redirectTargetPath () {
      const value = this.rawRedirect();
      return value ? value.split('#')[0].split('?')[0] : null;
    },
    rawRedirect () {
      const raw = this.$route.query.redirect;
      const value = Array.isArray(raw) ? raw[0] : raw;
      return typeof value === 'string' && value ? value : null;
    },
  },
};
</script>

<style scoped>
.admin__main {
  margin-left: var(--admin-sidebar-width, 264px);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  background-color: #f8f9fa;
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.admin--collapsed .admin__main {
  margin-left: 0;
}

/* Chromeless (POS full-screen): no sidebar/header/footer, so the main area
   must fill the viewport with no reserved sidebar gutter at any width. */
.admin--chromeless .admin__main {
  margin-left: 0;
  padding-top: 0;
}

@media (max-width: 1024px) {
  .admin__main {
    margin-left: 0;
    padding-top: 56px;
  }

  .admin--chromeless .admin__main {
    padding-top: 0;
  }
}
</style>

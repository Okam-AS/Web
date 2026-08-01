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
    closeLoginModal(isLoggedIn) {
      this.showLogin = !isLoggedIn;
      if (isLoggedIn) {
        // Check if there's a redirect parameter in the URL
        const redirectPath = this.$route.query.redirect;
        if (redirectPath && redirectPath !== this.$route.fullPath) {
          // Navigate to the redirect path and remove the redirect query parameter
          this.$router.replace(redirectPath);
        } else {
          // Emit event to notify parent page to reload data
          this.$emit('login-success');
        }
      }
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

/* ---- THE SHELL ON PAPER ----------------------------------------------------------------------
 *
 * Both declarations above reserve space for chrome that `@media print` REMOVES, and neither took
 * itself back when it went. `AdminPageHeader` hides `.admin-nav` entirely when printing — sidebar,
 * mobile top bar and all — but the gutter the sidebar sat in and the strip the top bar sat under are
 * declared here, and so they survived onto the paper of all 47 pages that use this shell.
 *
 * WHAT THAT COST, measured rather than reasoned about. Printing the § 8-5-6 personalliste to A4 on
 * 2026-08-01 produced a document whose organisation number, time zone, correction lineage ("hvem som
 * har foretatt rettelsen og tidspunkt") and hired-in organisation number were all cut off the right
 * edge of the sheet, behind a leading blank page — every one of them a field the paragraph names.
 * The allergen-matrix lane measured the same gutter as 285 of 1052 px in A4 landscape.
 *
 * `transition: none` is not tidiness. `margin-left` animates over 300 ms (above), and `window.print()`
 * is synchronous — so the instant print styles apply the gutter does not collapse, it SLIDES, and the
 * snapshot the printer takes lands somewhere between 264 px and 0. The matrix lane read 264, 259.9 and
 * 249.98 px on three consecutive samples of one page. A printed result that depends on when the dialog
 * opened is not a document.
 *
 * FIXED HERE RATHER THAN PER PAGE. Every page that ever prints inherits this shell, so a per-page
 * override is a fix each of the 47 has to remember to repeat — and the two documents that had already
 * shipped (`/admin/brev`, the personalliste) had not. No `!important`: the two rules that beat this on
 * specificity (`.admin--collapsed`, `.admin--chromeless`) already set the same zero, and leaving the
 * door open is what lets a page still claim its own print geometry.
 */
@media print {
  .admin__main {
    margin-left: 0;
    padding-top: 0;
    transition: none;
  }
}
</style>

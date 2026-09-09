<template>
  <AdminPage>
    <div class="menu-update-redirect">
      <h1>{{ $i('menuImport_pageTitle') }}</h1>
      <p>{{ $i('menuUpdate_movedBody') }}</p>
      <!-- A plain link as well as the automatic redirect, so a bookmark still works when
           JavaScript navigation is blocked or the redirect is interrupted. -->
      <nuxt-link class="btn-primary" to="/admin/import">
        {{ $i('menuUpdate_movedAction') }}
      </nuxt-link>
    </div>
  </AdminPage>
</template>

<script>
// Menu update and Import are one workspace now, at /admin/import.
//
// The old address is kept because it is bookmarked and linked from elsewhere, and because the
// plan asks for both addresses to stay reachable until parity is verified. It forwards rather
// than duplicating the flow, so there is only ever one implementation to keep correct.

import AdminPage from '~/components/organisms/AdminPage.vue'

export default {
  components: { AdminPage },
  middleware ({ redirect, route }) {
    return redirect(301, '/admin/import', route.query)
  },
  mounted () {
    // The middleware handles a normal navigation; this covers a client-side route that reached
    // the component anyway, so the page never sits on a dead end.
    if (this.$router && this.$route.path !== '/admin/import') {
      this.$router.replace({ path: '/admin/import', query: this.$route.query })
    }
  }
}
</script>

<style lang="scss" scoped>
.menu-update-redirect {
  max-width: 640px;
  margin: 0 auto;
  padding: 64px 24px;
  text-align: center;

  h1 { margin: 0 0 8px; font-size: 1.5em; font-weight: 600; color: #292c34; }
  p { margin: 0 0 24px; color: #64748b; }
}

.btn-primary {
  display: inline-block;
  padding: 14px 24px;
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  color: #fff; border-radius: 8px;
  font-weight: 600; text-decoration: none;

  &:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4); }
  &:focus-visible { outline: 2px solid #1bb776; outline-offset: 2px; }
}
</style>

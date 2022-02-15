<template>
  <div class="admin">
    <AdminPageHeader />
    <main class="admin__content admin__wrapper">
      <slot />
    </main>
    <AdminPageFooter />
  </div>
</template>

<script>
import AdminPageHeader from '@/components/organisms/AdminPageHeader.vue'
import AdminPageFooter from '@/components/organisms/AdminPageFooter.vue'

export default {
  components: { AdminPageHeader, AdminPageFooter }
}
</script>
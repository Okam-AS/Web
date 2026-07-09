<script>
// Settings moved into /admin/reservations (tab "Innstillinger"); keep the old
// route as a redirect so bookmarks and links survive.
export default {
  name: 'AdminReservationRedirect',
  mounted () {
    this.$router.replace('/admin/reservations');
  },
  render (h) {
    return h('div');
  }
};
</script>

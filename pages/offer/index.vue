<script>
export default {
  name: "OfferIndex",
  asyncData({ error }) {
    // Return a 404 error when accessing /offer without a code
    return error({ statusCode: 404, message: "Offer code is required" });
  },
};
</script>

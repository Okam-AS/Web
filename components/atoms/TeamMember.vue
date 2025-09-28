<template>
  <div class="profile">
    <div class="profile_picture">
      <img :src="imageUrl" :alt="name">
    </div>
    <div class="profile_info">
      <span class="profile_name">{{ name }}</span>
      <span class="profile_description">{{ description }}</span>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    imageUrl: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.profile {
  margin-top: 2em;
  border: 2px dashed $color-profile;
  border-radius: 10px;
}

.profile_picture {
  margin-top: 2em;
  img {
    border-radius: 50%;
    width: 13em;
    background-color: $color-profile;
  }

  display: flex;
  justify-content: center;
}
.profile_info {
  padding: 2em;
  text-align: center;

  .profile_name {
    font-weight: bold;
  }
}
</style>

<template>
  <div>
    <transition name="modal">
      <div class="modal-mask" @click="$emit('close')">
        <div class="modal-wrapper">
          <div class="modal-container">
            <div class="modal-body">
              <slot />
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
  </transition>
  </div>
</template>

<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.modal {
  &-mask {
    position: fixed;
    z-index: 9998;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: table;
    transition: opacity 0.3s ease;
  }

  &-wrapper {
    display: table-cell;
    vertical-align: middle;
  }

  &-container {
    width: rem(400);
    margin: 0px auto;
    padding: rem(20) rem(30);
    background-color: #fff;
    border-radius: 2px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33);
    transition: all 0.3s ease;
    font-family: Helvetica, Arial, sans-serif;
  }

  &-body {
    margin: rem(10);
  }
  &-buttons button {
    display: inline-block;
  }
}
</style>
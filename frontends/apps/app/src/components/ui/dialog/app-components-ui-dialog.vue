<script setup lang="ts">
import componentButton from '../../containment/app-component-containment-button.vue';
import { iconXMark } from '../../icons';

const visible = defineModel<boolean>({ required: true });

/** Close the dialog */
function handleClose(): void {
  visible.value = false;
}
</script>

<template>
  <div class="backdrop" @click="handleClose" v-if="visible"></div>
  <div class="dialog-wrap" v-if="visible">
    <div class="dialog">
      <button type="button" aria-label="Close dialog" @click="handleClose">
        <componentButton variant="ghost" size="icon">
          <iconXMark />
        </componentButton>
      </button>

      <slot />
    </div>
  </div>
</template>

<style scoped>
.dialog-wrap {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;

  .dialog {
    position: fixed;
    display: flex;
    flex-direction: column;
    z-index: 2;
    @apply p-6 bg-white rounded-md w-full container gap-4;
    max-width: 90ch;

    button {
      @apply absolute right-4 top-4;
    }
  }
}

.backdrop {
  cursor: pointer;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backdrop-filter: blur(1px);
  z-index: 1;
  @apply bg-stone-900/30;
}
</style>

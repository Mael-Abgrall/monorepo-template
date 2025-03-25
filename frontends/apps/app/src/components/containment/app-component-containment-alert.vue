<script setup lang="ts">
import { iconXMark } from '../icons';
import containmentButton from './app-component-containment-button.vue';

defineProps<{
  /**
   *
   * The visual style variant of the alert
   * - `danger` for errors
   * - `outline` for neutral alerts
   * - `success` for success alerts
   * - `warning` for warnings
   */
  variant?: 'danger' | 'outline' | 'success' | 'warning';
}>();

const visible = defineModel<boolean>({ required: true });

/**
 * Closes the alert
 */
function handleClose(): void {
  visible.value = false;
}
</script>

<template>
  <div class="alert-container">
    <Transition name="alert">
      <div class="alert" :class="[variant]" role="alert" v-if="visible">
        <div class="alert-content">
          <slot></slot>
        </div>
        <button type="button" aria-label="Close alert" @click="handleClose">
          <containmentButton variant="ghost" size="icon">
            <iconXMark />
          </containmentButton>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.alert-container {
  position: fixed;
  width: 100%;
  z-index: 1;
  display: flex;
  justify-content: center;

  .alert {
    position: fixed;
    top: 1rem;
    padding: 0rem;
    display: flex;
    align-items: flex-start;
    padding: 0.1rem;
    max-width: 60ch;
    width: calc(100% - 2rem);

    @apply rounded-md shadow-lg bg-white;

    .alert-content {
      flex: 1;
      padding: 0.9rem;
    }

    &.success {
      @apply bg-green-600/75 text-white;
    }

    &.warning {
      @apply bg-yellow-600/75 text-white;
    }

    &.danger {
      @apply bg-red-600/75 text-white;
    }

    &.outline {
      border: 1px solid;
      @apply border-gray-200 bg-white text-gray-900;
    }
  }
}
</style>

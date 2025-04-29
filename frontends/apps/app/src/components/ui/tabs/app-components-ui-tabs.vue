<template>
  <div class="tabs">
    <slot />
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  border-bottom: 1px solid;
  width: 100%;
  @apply border-stone-300;
}
</style>

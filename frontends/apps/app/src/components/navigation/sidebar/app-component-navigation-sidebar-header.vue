<script setup lang="ts"></script>

<template>
  <div class="sidebar-header">
    <img
      src="../../../assets/logo.webp"
      alt="logo"
      class="sidebar-header-logo"
    />
  </div>
</template>

<style scoped>
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  @apply py-2 px-4;

  .sidebar-header-logo {
    width: 10ch;
  }
}
</style>

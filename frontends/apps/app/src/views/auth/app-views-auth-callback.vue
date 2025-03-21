<script lang="ts" setup>
import mediaLoading from '../../components/media/app-component-media-loading.vue';

async function oauthFinish() {}
</script>

<template>
  <div class="callback-page">
    <div class="callback-page-content">
      <h2>Just a moment...</h2>
      <p>We're logging you in</p>
    </div>
    <mediaLoading size="large" />
  </div>
</template>

<style scoped>
.callback-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  @apply gap-4;

  .callback-page-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    @apply gap-1;
  }
}
</style>

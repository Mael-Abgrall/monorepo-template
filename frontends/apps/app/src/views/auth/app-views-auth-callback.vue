<script lang="ts" setup>
import type {
  OauthFinishBody,
  OauthFinishResponse,
} from 'shared/schemas/shared-auth-schemas';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import containmentAlert from '../../components/containment/app-component-containment-alert.vue';
import mediaLoading from '../../components/media/app-component-media-loading.vue';
import { apiFetch } from '../../helpers/app-helpers-fetch';
import { logger } from '../../helpers/app-helpers-reporting';
import { useAuthStore } from '../../stores/app-stores-auth';

const { code, state, vendor } = defineProps<{
  /**
   * The code from the OAuth provider
   */
  code: string | undefined;
  /**
   * The state from the URL
   */
  state: string | undefined;
  /**
   * The provider to finish the OAuth process for
   */
  vendor: 'google' | 'microsoft' | undefined;
}>();

const errorMessage = ref<string | undefined>();
const errorVisible = ref(false);
const router = useRouter();
const authStore = useAuthStore();
onMounted(async () => {
  if (!code || !state || !vendor) {
    throw new Error('Missing required parameters');
  }

  try {
    const { email, verified } = await apiFetch<OauthFinishResponse>(
      '/auth/oauth/finish',
      {
        body: {
          code,
          stateFromUrl: state,
          vendor,
        } satisfies OauthFinishBody,
        method: 'POST',
      },
    );
    if (!verified) {
      await router.push({ name: 'auth.otp', query: { email } });
      return;
    }

    await authStore.saveLogin();
    await router.push({ name: 'home' });
  } catch (error) {
    logger.error(error);
    errorMessage.value = 'Failed to finish OAuth';
    errorVisible.value = true;
  }
});
</script>

<template>
  <div class="callback-page">
    <div class="callback-page-content">
      <containmentAlert variant="danger" v-model="errorVisible">
        {{ errorMessage }}
      </containmentAlert>
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

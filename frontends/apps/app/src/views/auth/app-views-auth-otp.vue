<script lang="ts" setup>
import type {
  OtpFinishBody,
  OtpFinishResponse,
  OtpInitBody,
} from 'shared/schemas/shared-auth-schemas';
import type { GenericResponse } from 'shared/schemas/shared-schemas';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import containmentAlert from '../../components/containment/app-component-containment-alert.vue';
import containmentButton from '../../components/containment/app-component-containment-button.vue';
import { apiFetch } from '../../fetch';
import { useAuthStore } from '../../stores/app-stores-auth';
const { email } = defineProps<{
  /**
   * The email address of the user
   */
  email?: string;
}>();

const router = useRouter();
const token = ref('');
const errorMessage = ref('');
const errorVisible = ref(false);
const authStore = useAuthStore();
/**
 * Requests a magic link to be sent to the user's email
 */
async function requestOTP(): Promise<void> {
  try {
    await apiFetch<GenericResponse>('/auth/otp/init', {
      body: {
        email,
      } satisfies OtpInitBody,
      method: 'POST',
    });
  } catch (error) {
    console.error(error);
    errorMessage.value = 'Failed to request OTP. Please try again in a minute';
    errorVisible.value = true;
  }
}

/**
 * Verifies the OTP code
 */
async function verifyOTP(): Promise<void> {
  try {
    await apiFetch<OtpFinishResponse>('/auth/otp/finish', {
      body: {
        token: token.value.trim(),
      } satisfies OtpFinishBody,
      method: 'POST',
    });
    await authStore.saveLogin();
    await router.push({ name: 'home' });
  } catch (error) {
    console.error(error);
    errorMessage.value = 'Failed to verify OTP. Please try again';
    errorVisible.value = true;
  }
}
</script>

<template>
  <containmentAlert variant="danger" v-model="errorVisible">
    {{ errorMessage }}
  </containmentAlert>
  <div class="otp-page">
    <h2>Verify your email</h2>
    <form @submit.prevent="verifyOTP">
      <p>Enter the code sent to {{ email ? email : 'your email' }}</p>
      <input type="text" v-model="token" placeholder="xxx-xxx" />
      <button type="submit">
        <containmentButton type="primary">Verify</containmentButton>
      </button>
      <p>
        Didn't receive an email?
        <button type="reset" @click="requestOTP">
          <containmentButton variant="ghost">Resend email</containmentButton>
        </button>
      </p>
    </form>
  </div>
</template>

<style scoped>
.otp-page {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  @apply gap-8;

  form {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    @apply gap-4;
  }

  input {
    max-width: 10ch;
    outline: 1px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    @apply outline-brand-500;
  }
}
</style>

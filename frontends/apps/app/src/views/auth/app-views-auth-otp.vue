<script lang="ts" setup>
import type {
  OtpFinishBody,
  OtpFinishResponse,
  OtpInitBody,
} from 'shared/schemas/shared-auth-schemas';
import type { GenericResponse } from 'shared/schemas/shared-schemas';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import containmentButton from '../../components/containment/app-component-containment-button.vue';
import { apiFetch } from '../../fetch';

const router = useRouter();
const email = ref('');
const token = ref('');

/**
 * Requests a magic link to be sent to the user's email
 */
async function requestOTP(): Promise<void> {
  try {
    await apiFetch<GenericResponse>('/auth/otp/init', {
      body: {
        email: email.value,
      } satisfies OtpInitBody,
      method: 'POST',
    });
  } catch (error) {
    console.error(error);
  }
}

/**
 * Verifies the OTP code
 */
async function verifyOTP(): Promise<void> {
  await apiFetch<OtpFinishResponse>('/auth/otp/finish', {
    body: {
      token: token.value,
    } satisfies OtpFinishBody,
    method: 'POST',
  });
  await router.push({ name: 'home' });
}
</script>

<template>
  <div class="otp-page">
    <h2>Verify your email</h2>
    <form @submit.prevent="verifyOTP">
      <p>Enter the code sent to {{ email }}</p>
      <input type="text" v-model="token" />
      <button type="submit">
        <containmentButton type="primary">Verify</containmentButton>
      </button>
      <p>
        Didn't receive an email?
        <button type="reset" @click="requestOTP">
          <containmentButton type="discreet">Resend email</containmentButton>
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
}
</style>

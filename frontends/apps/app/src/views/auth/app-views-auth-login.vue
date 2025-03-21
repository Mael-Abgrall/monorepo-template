<script setup lang="ts">
import type { OtpInitBody } from 'shared/schemas/shared-auth-schemas';
import type { GenericResponse } from 'shared/schemas/shared-schemas';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import containmentButton from '../../components/containment/app-component-containment-button.vue';
import mediaIcon from '../../components/media/app-component-media-icon.vue';
import { apiFetch } from '../../fetch';

const email = ref('');
const router = useRouter();

/**
 *
 */
async function oauthInit() {}

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
    await router.push({ name: 'auth.otp' });
  } catch (error) {
    console.error(error);
  }
}
</script>

<template>
  <div class="login-page">
    <div class="marketing-panel">
      <h2>Brand</h2>

      <div class="feature">
        <mediaIcon icon="pajamas:check-circle" />
        <div class="feature-content">
          <h3>Feature 1</h3>
          <p>My feature description</p>
        </div>
      </div>
      <div class="feature">
        <mediaIcon icon="pajamas:check-circle" />
        <div class="feature-content">
          <h3>Feature 2</h3>
          <p>My feature description</p>
        </div>
      </div>
      <div class="feature">
        <mediaIcon icon="pajamas:check-circle" />
        <div class="feature-content">
          <h3>Feature 3</h3>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipisicing elit.
            Praesentium quaerat voluptatum atque quod cumque eveniet eum vero,
            laudantium nesciunt odit!
          </p>
        </div>
      </div>
    </div>
    <div class="login-form">
      <h1>Welcome!</h1>
      <p class="sub-title">Sign in or create an account</p>
      <div class="form-group">
        <button
          type="button"
          @click="oauthInit({ provider: 'google' })"
          class="oauth-btn"
        >
          <mediaIcon icon="logos:google-icon" />
          <span class="oauth-btn-text">Google</span>
        </button>

        <button
          type="button"
          @click="oauthInit({ provider: 'microsoft' })"
          class="oauth-btn"
        >
          <mediaIcon icon="logos:microsoft-icon" />
          <span class="oauth-btn-text">Microsoft</span>
        </button>
      </div>
      <div class="divider">
        <span>or</span>
      </div>
      <form @submit.prevent="requestOTP" class="form-group">
        <label class="sr-only">Email</label>
        <input
          type="email"
          v-model="email"
          placeholder="Enter your email"
          required
        />

        <button type="submit" class="submit-btn">
          <containmentButton type="primary">Email magic link</containmentButton>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.sub-title {
  text-align: center;
}

.login-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  justify-content: space-evenly;
  @apply gap-8 p-8 container mx-auto md:flex-row;

  .login-form {
    flex: 1 1 0;
    max-width: 50ch;
    display: flex;
    flex-direction: column;
    justify-content: center;
    @apply gap-4;

    .form-group {
      display: flex;
      flex-direction: column;
      @apply gap-4;

      input,
      .oauth-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        border: 1px solid;
        @apply gap-3 py-3 px-4 rounded-lg bg-white border-gray-100 hover:bg-gray-50 transition-colors;

        .oauth-btn-text {
          width: 5ch;
          text-align: left;
        }
      }

      .sr-only {
        @apply absolute w-1 h-1 p-0 -m-1 overflow-hidden whitespace-nowrap border-0;
      }
    }

    .divider {
      @apply my-4 relative text-center;

      &::before,
      &::after {
        content: '';
        @apply absolute top-1/2 w-5/12 h-px bg-gray-300;
      }

      &::before {
        @apply left-0;
      }

      &::after {
        @apply right-0;
      }

      span {
        @apply px-4 text-sm text-gray-500;
      }
    }
  }

  .marketing-panel {
    flex: 1 1 0;
    max-width: 50ch;
    @apply mx-auto;

    display: flex;
    flex-direction: column;
    justify-content: center;
    @apply gap-4;

    .feature {
      display: flex;
      align-items: top;
      @apply gap-2;

      .feature-content {
        display: flex;
        flex-direction: column;
      }
    }
  }
}
</style>

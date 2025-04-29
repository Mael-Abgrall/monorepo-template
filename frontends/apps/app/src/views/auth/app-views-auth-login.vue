<script setup lang="ts">
import type {
  OauthInitQuery,
  OauthInitResponse,
  OtpInitBody,
} from 'shared/schemas/shared-auth-schemas';
import type { GenericResponse } from 'shared/schemas/shared-schemas';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import containmentAlert from '../../components/containment/app-component-containment-alert.vue';
import containmentButton from '../../components/containment/app-component-containment-button.vue';
import { iconCheck, iconGoogle, iconMicrosoft } from '../../components/icons';
import { apiFetch } from '../../helpers/app-helpers-fetch';
import { logger } from '../../helpers/app-helpers-reporting';

const email = ref('');
const router = useRouter();

const errorMessage = ref<string | undefined>();
const errorVisible = ref(false);

/**
 * Requests a redirect to the OAuth provider
 * @param root named parameters
 * @param root.provider The provider to redirect to
 */
async function oauthInit({
  provider,
}: {
  provider: 'google' | 'microsoft';
}): Promise<void> {
  try {
    const { redirectUrl } = await apiFetch<OauthInitResponse>(
      '/auth/oauth/init',
      {
        method: 'GET',
        query: { vendor: provider } satisfies OauthInitQuery,
      },
    );
    // this url is safe!
    globalThis.location.href = redirectUrl;
  } catch (error) {
    logger.error(error);
    errorMessage.value = 'Failed to request OAuth';
    errorVisible.value = true;
  }
}

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
    await router.push({
      name: 'auth.otp',
      query: { email: email.value },
    });
  } catch (error) {
    logger.error(error);
    errorMessage.value = 'Failed to request OTP';
    errorVisible.value = true;
  }
}
</script>

<template>
  <containmentAlert variant="danger" v-model="errorVisible">
    {{ errorMessage }}
  </containmentAlert>
  <div class="login-page">
    <div class="marketing-panel">
      <h2>Brand</h2>

      <div class="feature">
        <iconCheck class="feature-icon" />
        <div class="feature-content">
          <h3>Feature 1</h3>
          <p>My feature description</p>
        </div>
      </div>
      <div class="feature">
        <iconCheck class="feature-icon" />
        <div class="feature-content">
          <h3>Feature 2</h3>
          <p>My feature description</p>
        </div>
      </div>
      <div class="feature">
        <iconCheck class="feature-icon" />
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
          <iconGoogle />
          <span class="oauth-btn-text">Google</span>
        </button>

        <button
          type="button"
          @click="oauthInit({ provider: 'microsoft' })"
          class="oauth-btn"
        >
          <iconMicrosoft />
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
          <containmentButton size="max" variant="primary">
            Email magic link
          </containmentButton>
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
  justify-content: center;
  @apply gap-28 p-8 container mx-auto md:flex-row;

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
        box-shadow: none;
        @apply gap-3 py-3 px-4 rounded-lg bg-white border-brand-100 transition-colors;

        &:hover {
          @apply border-brand-400;
        }

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

      .feature-icon {
        flex-shrink: 0;
        @apply text-brand-500;
      }
    }
  }
}
</style>

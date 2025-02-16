<script setup lang="ts">
// libs
import { Icon } from '@iconify/vue';
import { ref } from 'vue';

// components
import appPopupMessage from '../components/popup/app-popup-message.vue';

// stores
import { useAuthStore } from '../../stores/stores-auth';

const auth = useAuthStore();
const email = ref('');

async function requestOTP() {}

async function oauthInit() {}

const features = [
  'Earn points for every rental payment',
  'Redeem rewards at partner stores',
  'Create a strong rental history, worldwide',
];
</script>

<template>
  <appPopupMessage v-if="auth.error" :message="auth.error" type="error" />
  <div class="login-container">
    <div class="info">
      <section>
        <h1 class="title text-gray-900">Renti</h1>
        <p class="tagline">Get rewarded for renting</p>
        <ul>
          <li v-for="feature of features" :key="feature" class="feature">
            <Icon icon="mdi:check-circle" class="feature-icon" />
            <span>{{ feature }}</span>
          </li>
        </ul>
      </section>
    </div>

    <div class="separator"></div>

    <div class="login">
      <section class="form-content">
        <template v-if="!auth.loading">
          <h2>Welcome</h2>
          <p>Sign in or create an account</p>

          <div class="oauth-buttons">
            <button
              type="button"
              @click="handleOAuthLogin({ provider: 'google' })"
              class="oauth-btn"
            >
              <Icon icon="logos:google-icon" />
              <span class="oauth-btn-text">Google</span>
            </button>

            <button
              type="button"
              @click="handleOAuthLogin({ provider: 'apple' })"
              class="oauth-btn"
            >
              <Icon icon="logos:apple" />
              <span class="oauth-btn-text">Apple</span>
            </button>

            <button
              type="button"
              @click="handleOAuthLogin({ provider: 'azure' })"
              class="oauth-btn"
            >
              <Icon icon="logos:microsoft-icon" />
              <span class="oauth-btn-text">Microsoft</span>
            </button>
          </div>

          <div class="divider">
            <span>or</span>
          </div>

          <form @submit.prevent="emailLogin" class="email-form">
            <label class="sr-only">Email</label>
            <input
              type="email"
              v-model="email"
              placeholder="Enter your email"
              required
            />

            <button type="submit" class="submit-btn">
              Send one time password
            </button>
          </form>
        </template>

        <div v-else class="loading">
          <Icon icon="tdesign:load" class="loading-icon" />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: center;
  @apply min-h-screen md:flex-row relative;
}

.info {
  display: flex;
  align-items: center;
  justify-content: center;
  @apply md:w-1/2 p-8;
}

section {
  display: flex;
  flex-direction: column;
  @apply max-w-md gap-3;
}

.form-content {
  width: 100%;
}

.login {
  @apply md:w-1/2 p-8 flex items-center justify-center;
}

.separator {
  @apply hidden md:block absolute left-1/2 top-8 bottom-8 w-px bg-gray-300;
}

.title {
  @apply text-center;
}

.tagline {
  @apply text-xl;
}

.feature {
  @apply flex items-center gap-2 text-gray-600;
}

.feature-icon {
  @apply text-brand text-xl;
}

.email-form {
  display: flex;
  flex-direction: column;
  @apply gap-4;
}

.submit-btn {
  @apply text-white bg-brand gap-3 py-3 px-4 rounded-lg hover:bg-brand/60 transition-colors;
}

.form-group {
  @apply mb-6;
}

.sr-only {
  @apply absolute w-1 h-1 p-0 -m-1 overflow-hidden whitespace-nowrap border-0;
}

.divider {
  @apply my-8 relative text-center;
}

.divider::before,
.divider::after {
  content: '';
  @apply absolute top-1/2 w-5/12 h-px bg-gray-300;
}

.divider::before {
  @apply left-0;
}

.divider::after {
  @apply right-0;
}

.divider span {
  @apply px-4 text-sm text-gray-500;
}

.oauth-buttons {
  @apply grid grid-cols-1 gap-4;
}

input,
.oauth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  border: 1px solid;
  @apply gap-3 py-3 px-4 rounded-lg bg-white border-gray-100 hover:bg-gray-50 transition-colors;
}

.oauth-btn-text {
  width: 5ch;
  text-align: left;
}

.loading {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
}

.loading-icon {
  @apply animate-spin text-7xl;
}
</style>

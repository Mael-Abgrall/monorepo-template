<script setup lang="ts">
import { useUserStore } from '../../../stores/app-stores-user';
import { iconFolder, iconHelp, iconHome, iconUserDefault } from '../../icons';
import {
  navigationSidebarButton,
  navigationSidebarGroup,
  navigationSidebarHeader,
} from './app-navigation-sidebar';

const userStore = useUserStore();
</script>

<template>
  <nav class="navbar">
    <div class="nav-top">
      <navigationSidebarHeader />

      <navigationSidebarGroup title="Dashboard">
        <navigationSidebarButton toName="home">
          <template #icon>
            <iconHome />
          </template>
          Home
        </navigationSidebarButton>
        <navigationSidebarButton toName="spaces">
          <template #icon>
            <iconFolder />
          </template>
          Spaces
        </navigationSidebarButton>
      </navigationSidebarGroup>

      <navigationSidebarGroup title="Another section">
        <navigationSidebarButton toName="auth.login">
          <template #icon>
            <iconHome />
          </template>
          Home
        </navigationSidebarButton>
        <navigationSidebarButton toName="auth.login">
          <template #icon>
            <iconHome />
          </template>
          Home
        </navigationSidebarButton>
        <navigationSidebarButton toName="auth.login">
          <template #icon>
            <iconHome />
          </template>
          Home
        </navigationSidebarButton>
      </navigationSidebarGroup>
    </div>
    <div class="nav-bottom">
      <navigationSidebarGroup>
        <navigationSidebarButton toName="support">
          <template #icon>
            <iconHelp />
          </template>
          Help & feedback
        </navigationSidebarButton>
        <navigationSidebarButton toName="settings">
          <template #icon>
            <iconUserDefault />
          </template>
          <div class="setting-button">
            <span v-if="userStore.user">{{ userStore.user.email }}</span>
            Settings
          </div>
        </navigationSidebarButton>
      </navigationSidebarGroup>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  border-right: 1px solid;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  @apply bg-stone-100/60 border-stone-300;

  .setting-button {
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    span {
      @apply text-xs;
    }
  }
}
</style>

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0);

  const doubleCount = computed(() => {
    return count.value * 2;
  });

  /**
   * increment te store value
   */
  function increment(): void {
    count.value++;
  }

  return { count, doubleCount, increment };
});

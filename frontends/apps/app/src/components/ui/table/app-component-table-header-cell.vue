<template>
  <th>
    <slot />
  </th>
</template>

<style scoped>
th {
  text-align: left;
  vertical-align: middle;
  @apply h-10 px-2 text-stone-500;
}
</style>

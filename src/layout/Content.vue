<template>
  <div class="s-content">
    <slot></slot>
  </div>
</template>

<script>
  export default {
    name: 's-content'
  }
</script>

<style scoped lang="scss">
  .s-content {
    flex-grow: 1;
  }
</style>

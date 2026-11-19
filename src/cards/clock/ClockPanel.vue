<template>
  <div class="clock-panel">
    <div class="stage">
      <FlipClock />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 时钟详情：只放翻页时钟（点阵已移除），背景是深色玻璃面。
 */
import FlipClock from "./FlipClock.vue"
</script>

<style scoped>
.clock-panel {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.stage {
  display: grid;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: var(--desk-r-control);
  background:
    radial-gradient(120% 120% at 50% 0%, rgb(40 42 52 / 88%), rgb(12 13 17 / 94%)),
    #0b0b0d;
  backdrop-filter: blur(var(--desk-blur-regular, 24px));
}
</style>

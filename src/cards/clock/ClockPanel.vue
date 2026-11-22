<template>
  <div class="clock-panel">
    <div class="stage desk-content-surface">
      <FlipClock />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 时钟详情：翻页数字保留钟表结构，舞台使用共享内容表面。
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
}
</style>

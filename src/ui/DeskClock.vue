<template>
  <div class="desk-clock">
    <time class="time" :datetime="now.toISOString()">{{ timeText }}</time>
    <div class="date">{{ dateText }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from "vue"
import { pad } from "@/core/util"
import { t, weekdayShort } from "@/core/i18n"

const now = shallowRef(new Date())
const timeText = computed(() => [now.value.getHours(), now.value.getMinutes()].map(pad).join(":"))
const dateText = computed(() => t("ui.clock.date", { m: now.value.getMonth() + 1, d: now.value.getDate(), weekday: weekdayShort(now.value.getDay()) }))
let timer = 0

/** 每次按真实时间对齐下一分钟，避免累计误差；卸载即停止。 */
function tick() {
  now.value = new Date()
  timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000))
}
onMounted(tick)
onBeforeUnmount(() => window.clearTimeout(timer))
</script>

<style scoped>
.desk-clock {
  container-type: size;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #fff;
  text-align: center;
  text-shadow: 0 4px 24px rgb(0 0 0 / 42%);
}
.time {
  font-size: clamp(28px, min(64cqh, 32cqw), 160px);
  font-weight: 300;
  line-height: 1;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}
.date {
  margin-top: clamp(1px, 2cqh, 8px);
  font-size: clamp(11px, 7cqh, 22px);
  color: rgb(255 255 255 / 78%);
}
</style>

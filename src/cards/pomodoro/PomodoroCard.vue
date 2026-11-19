<template>
  <div
    class="pm-card"
    :class="`is-${size}`"
    :style="pomodoro.cover ? { backgroundImage: `url(${pomodoro.cover})` } : null"
  >
    <div class="pm-body desk-seq">
      <header class="pm-head">
        <span class="pm-label">{{ pomodoro.phase === "focus" ? "专注" : "休息" }}</span>
        <span class="pm-round">第 {{ pomodoro.round + 1 }} 个</span>
      </header>

      <div class="pm-dial" :style="{ '--pm-p': percent }">
        <b class="pm-clock">{{ clockText(left) }}</b>
      </div>

      <footer class="pm-foot">
        <button v-if="!running" class="pm-btn is-primary" type="button" @click="start">开始</button>
        <button v-else class="pm-btn" type="button" @click="pause">暂停</button>
        <button class="pm-btn" type="button" @click="reset">重置</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { clockText, pause, pomodoro, reset, start, usePomodoro } from "./pomodoro"

defineProps<{ size?: string; w?: number; h?: number }>()

const { running, left, percent } = usePomodoro()
</script>

<style scoped>
.pm-card {
  container-type: size;
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  color: var(--desk-text);
  /* 选了背景图就铺满并压一层暗罩，数字仍可读 */
  background-size: cover;
  background-position: center;
}

.pm-body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(4px, 5cqh, 10px);
  padding: clamp(8px, 6cqw, 16px);
}

.pm-head {
  display: flex;
  align-items: baseline;
  gap: var(--desk-sp-1h);
  font-size: clamp(10px, 4cqh, 12px);
  color: var(--desk-text-2);
}

.pm-round {
  color: var(--desk-text-3);
}

/* 进度环用 conic-gradient，不用 SVG：卡片尺寸千变，纯 CSS 更好缩 */
.pm-dial {
  display: grid;
  place-items: center;
  width: min(62cqh, 62cqw);
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    conic-gradient(var(--desk-accent) calc(var(--pm-p) * 360deg), color-mix(in srgb, var(--desk-text) 8%, transparent) 0)
      border-box;
}

.pm-dial::before {
  content: "";
  position: absolute;
}

.pm-clock {
  font-size: clamp(16px, 14cqh, 40px);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  background: var(--desk-surface);
  border-radius: 50%;
  width: 78%;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
}

.pm-foot {
  display: flex;
  gap: var(--desk-sp-1h);
}

.pm-btn {
  height: clamp(22px, 9cqh, 28px);
  padding: 0 10px;
  border: 1px solid var(--desk-stroke);
  border-radius: var(--desk-r-control);
  background: color-mix(in srgb, var(--desk-text) 6%, transparent);
  color: var(--desk-text);
  font-size: clamp(10px, 4cqh, 12px);
  cursor: pointer;
}

.pm-btn.is-primary {
  border-color: transparent;
  background: var(--desk-accent);
  color: #fff;
}

@container (max-height: 119px) {
  .pm-head,
  .pm-foot {
    display: none;
  }
}
</style>

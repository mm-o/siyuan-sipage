<template>
  <div class="pm-panel desk-seq desk-panel-row">
    <div
      class="pm-pane desk-pane is-left"
      :class="{ 'is-cover': !!pomodoro.cover }"
      :style="pomodoro.cover ? { backgroundImage: `linear-gradient(rgb(0 0 0 / 28%), rgb(0 0 0 / 28%)), url(${pomodoro.cover})` } : null"
    >
      <div class="pm-ring" :style="{ '--pm-p': percent }">
        <b>{{ clockText(left) }}</b>
        <span>{{ pomodoro.phase === "focus" ? "专注" : "休息" }} · 第 {{ pomodoro.round + 1 }} 个</span>
      </div>
      <div class="pm-actions">
        <GlassButton :icon="running ? Pause : Play" :label="running ? '暂停' : '开始'" @click="running ? pause() : start()" />
        <GlassButton :icon="RotateCcw" label="重置" @click="reset" />
        <GlassButton :icon="SkipForward" label="跳过本阶段" @click="skip" />
      </div>
    </div>

    <div class="pm-pane desk-pane is-right">
      <h4 class="pm-title">时长</h4>
      <Slider v-model="pomodoro.focus" label="专注" :min="5" :max="60" :step="5" suffix="分" :default-value="25" />
      <Slider v-model="pomodoro.rest" label="休息" :min="1" :max="20" :step="1" suffix="分" :default-value="5" />

      <h4 class="pm-title">背景与白噪音</h4>
      <div class="pm-covers">
        <button
          v-for="c in COVERS.slice(0, 8)"
          :key="c"
          class="pm-cover"
          :class="{ 'is-on': pomodoro.cover === c }"
          type="button"
          :style="{ backgroundImage: `url(${c})` }"
          @click="pomodoro.cover = pomodoro.cover === c ? '' : c"
        />
      </div>
      <div class="pm-actions">
        <GlassButton
          v-for="n in NOISES"
          :key="n.id"
          :label="n.label"
          :active="pomodoro.noise === n.id"
          @click="toggleNoise(n.id)"
        />
      </div>

      <h4 class="pm-title">记录 · 最近 {{ records.length }} 个</h4>
      <ul class="pm-log">
        <li v-for="r in records" :key="r.at">
          <span>{{ new Date(r.at).toLocaleString("zh-CN", { hour12: false, month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) }}</span>
          <b>{{ r.minutes }} 分钟</b>
        </li>
        <li v-if="!records.length" class="pm-empty desk-note">还没有记录，完成一个番茄就会出现在这里</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GlassButton } from "@/ui/controls"
import { Pause, Play, RotateCcw, SkipForward } from "lucide-vue-next"
import Slider from "@/ui/Slider.vue"
import { COVERS } from "@/core/image"
import { NOISES, clockText, pause, pomodoro, records, reset, skip, start, toggleNoise, usePomodoro } from "./pomodoro"

const { running, left, percent } = usePomodoro()
</script>

<style scoped>


.pm-pane {
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-2);
  padding: var(--desk-detail-pad);
  min-height: 0;
  overflow: auto;
  scrollbar-width: none;
}

.pm-pane.is-left {
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  background-size: cover;
  background-position: center;
}

/* 选了背景图：环里仍是白底（时间可读），环外文字转白 */
.pm-pane.is-cover .pm-ring span,
.pm-pane.is-cover .pm-ring + * {
  color: #fff;
}

.pm-pane.is-right {
  flex: 0 0 320px;
}

.pm-ring {
  width: min(46cqh, 220px);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: conic-gradient(var(--desk-accent) calc(var(--pm-p) * 360deg), color-mix(in srgb, var(--desk-text) 8%, transparent) 0);
}

.pm-ring b {
  font-size: 40px;
  font-variant-numeric: tabular-nums;
  background: var(--desk-surface);
  width: 78%;
  aspect-ratio: 1;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.pm-ring span {
  position: absolute;
  margin-top: 84px;
  font-size: var(--desk-fs-caption);
  color: var(--desk-text-2);
}

.pm-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--desk-sp-1h);
}

.pm-title {
  margin: var(--desk-sp-1) 0 0;
  font-size: var(--desk-fs-caption);
  color: var(--desk-text-3);
}

.pm-covers {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--desk-sp-1);
}

.pm-cover {
  height: 32px;
  border-radius: var(--desk-r-md);
  border: 1px solid var(--desk-stroke);
  background-size: cover;
  background-position: center;
  cursor: pointer;
}

.pm-cover.is-on {
  outline: 2px solid var(--desk-accent);
  outline-offset: 1px;
}

.pm-log {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--desk-sp-1);
  font-size: var(--desk-fs-sm);
  color: var(--desk-text-2);
}

.pm-log li {
  display: flex;
  justify-content: space-between;
  gap: var(--desk-sp-2);
}


</style>

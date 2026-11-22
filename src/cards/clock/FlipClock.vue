<template>
  <div class="flip">
    <template v-for="(ch, i) in digits" :key="i">
      <span v-if="ch === ':'" class="colon"><i /><i /></span>
      <span v-else class="digit">
        <!-- 静止层：上半新值、下半旧值（翻完换新值） -->
        <span class="half top"><span class="glyph">{{ ch }}</span></span>
        <span class="half bottom"><span class="glyph">{{ flipping ? prev[i] : ch }}</span></span>

        <!-- 翻转层：上半卡绕下缘向外翻落（旧值），下半卡随后翻入（新值） -->
        <template v-if="flipping && prev[i] !== ch">
          <span class="flap up"><span class="glyph">{{ prev[i] }}</span></span>
          <span class="flap down"><span class="glyph">{{ ch }}</span></span>
        </template>
      </span>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * 翻页时钟（含秒）
 *
 * 每个数字 = 上下两张半卡；换数字时上半卡绕自身下缘向前翻落（旧值），
 * 下半卡随后从后向前翻入（新值）。字形用一张整字按半卡裁剪，上下永远对齐。
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { pad } from "@/core/util"

const now = ref(new Date())
const prev = ref<string[]>([])
const flipping = ref(false)
let timer = 0
let flapTimer = 0

const text = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

const digits = computed(() => [...text(now.value)])

onMounted(() => {
  prev.value = digits.value
  timer = window.setInterval(() => {
    const t = new Date()
    const next = [...text(t)]
    if (next.join("") !== digits.value.join("")) {
      prev.value = digits.value
      flipping.value = true
      window.clearTimeout(flapTimer)
      flapTimer = window.setTimeout(() => (flipping.value = false), 520)
    }
    now.value = t
  }, 1000)
})

onBeforeUnmount(() => {
  window.clearInterval(timer)
  window.clearTimeout(flapTimer)
})
</script>

<style scoped>
.flip {
  container-type: size;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.4cqw;
  width: 100%;
  height: 100%;
  padding: 6cqh 3cqw;
  color: #f2f2f4;
  perspective: 120cqh;
}

.digit {
  position: relative;
  width: 13cqw;
  height: 46cqh;
  flex: none;
  border-radius: 1.8cqw;
  background: #1b1b1f;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 8%),
    0 3px 14px rgb(0 0 0 / 45%);
  font-size: min(34cqh, 12cqw);
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  transform-style: preserve-3d;
}

/* 两张半卡：裁掉字的另一半 */
.half,
.flap {
  position: absolute;
  left: 0;
  width: 100%;
  height: 50%;
  overflow: hidden;
  background: linear-gradient(180deg, #2b2b31, #1d1d22);
  backface-visibility: hidden;
}

.half.top,
.flap.up {
  top: 0;
  border-radius: 1.8cqw 1.8cqw 0 0;
}

.half.bottom,
.flap.down {
  bottom: 0;
  border-radius: 0 0 1.8cqw 1.8cqw;
}

/* 整字：高度 = 一张牌，靠 top/bottom 对齐让上下半拼回完整数字 */
.glyph {
  position: absolute;
  left: 0;
  width: 100%;
  height: 200%;
  display: grid;
  place-items: center;
}

.half.top .glyph,
.flap.up .glyph { top: 0; }

.half.bottom .glyph,
.flap.down .glyph { bottom: 0; }

/* 中缝 + 卡面高光 */
.digit::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: rgb(0 0 0 / 62%);
  z-index: 4;
}

.half.top::after,
.flap.up::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 40%;
  background: linear-gradient(180deg, transparent, rgb(0 0 0 / 28%));
}

.flap {
  z-index: 3;
  transform-origin: bottom center;
}

.flap.up { animation: flap-up 280ms cubic-bezier(0.45, 0, 0.9, 0.5) both; }

.flap.down {
  transform-origin: top center;
  animation: flap-down 240ms 280ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
}

@keyframes flap-up {
  from { transform: rotateX(0deg); filter: brightness(1); }
  to { transform: rotateX(-92deg); filter: brightness(0.45); }
}

@keyframes flap-down {
  from { transform: rotateX(92deg); filter: brightness(0.45); }
  to { transform: rotateX(0deg); filter: brightness(1); }
}

.colon {
  display: grid;
  gap: 5cqh;
  flex: none;
}

.colon i {
  width: 1.6cqw;
  height: 1.6cqw;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.8;
}

@media (prefers-reduced-motion: reduce) {
  .flap { display: none; animation: none; }
}
</style>

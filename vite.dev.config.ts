/** 卡片验证页构建配置（不打包插件，只出静态页） */
import { resolve } from "node:path"
import vue from "@vitejs/plugin-vue"
import { defineConfig } from "vite"

export default defineConfig({
  root: resolve(__dirname, "dev"),
  base: "./",
  publicDir: resolve(__dirname, "public"),
  plugins: [vue()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      // 验证页里用替身，避免 siyuan 包在浏览器端无法解析
      siyuan: resolve(__dirname, "dev/siyuan-stub.ts"),
    },
  },
  build: {
    outDir: resolve(__dirname, "dev-dist"),
    emptyOutDir: true,
    minify: false,
    target: "esnext",
  },
  server: { port: 5600, strictPort: true },
})

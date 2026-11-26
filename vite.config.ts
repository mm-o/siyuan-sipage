import { resolve } from "node:path"
import vue from "@vitejs/plugin-vue"
import fg from "fast-glob"
import livereload from "rollup-plugin-livereload"
import { defineConfig, loadEnv } from "vite"
import { viteStaticCopy } from "vite-plugin-static-copy"
import zipPack from "vite-plugin-zip-pack"
import plugin from "./plugin.json"

export default defineConfig(({ mode }) => {
  const { VITE_SIYUAN_WORKSPACE_PATH: workspace } = loadEnv(mode, process.cwd())
  const watch = process.argv.some(arg => arg === "--watch" || arg === "-w")
  const outDir = watch ? workspace ? `${workspace}/data/plugins/${plugin.name}` : "./dev-dist-plugin" : "./dist"
  console.log(`Plugin ${watch ? "watch" : "build"} → ${outDir}`)

  return {
    resolve: { alias: { "@": resolve(__dirname, "src") } },
    // 库模式也要裁掉 Vue 的开发分支；此变量由依赖消费，不是业务状态。
    define: { "process.env.NODE_ENV": JSON.stringify(watch ? "development" : "production") },
    plugins: [
      vue(),
      viteStaticCopy({ targets: [
        ...[plugin.icon, plugin.preview, "README*.md", "LICENSE.md", "THIRD_PARTY_NOTICES.md", "plugin.json"].map(src => ({ src, dest: "." })),
        { src: "src/i18n/**", dest: "i18n" },
      ] }),
    ],
    build: {
      outDir,
      emptyOutDir: !watch,
      minify: !watch,
      lib: { entry: resolve(__dirname, "src/index.ts"), fileName: "index", formats: ["cjs"] },
      rollupOptions: {
        external: ["siyuan"],
        plugins: watch ? [
          livereload(outDir),
          {
            name: "watch-metadata",
            async buildStart() {
              for (const file of await fg(["src/i18n/*.json", "README*.md", "plugin.json"])) this.addWatchFile(file)
            },
          },
        ] : [zipPack({ inDir: "dist", outDir: ".", outFileName: "package.zip" })],
        output: {
          entryFileNames: "[name].js",
          /* 思源的插件加载器只认 siyuan 这一个外部模块，相对 require 解析不了，
             所以必须单文件：动态 import 全部内联，不产出 chunks。 */
          inlineDynamicImports: true,
          assetFileNames: asset => asset.name === "style.css" ? "index.css" : asset.name,
        },
      },
    },
  }
})

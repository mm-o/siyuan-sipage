# 第三方声明 / Third-party notices

思页（SiPage，包名 `siyuan-sipage`）自身以 [MIT](LICENSE.md) 发布。发布产物 `index.js` / `index.css`
把下列开源代码**打进了同一个文件**，因此随包分发时必须保留它们的许可声明。

| 组件 | 版本 | 许可 | 版权 |
| --- | --- | --- | --- |
| [Vue 3](https://github.com/vuejs/core)（`vue`、`@vue/runtime-*`、`@vue/shared` 等） | 3.5.45 | MIT | Copyright © 2018-present, Yuxi (Evan) You and Vue contributors |
| [Lucide](https://github.com/lucide-icons/lucide)（`lucide-vue-next`，图标） | 1.0.0 | ISC | Copyright © Lucide Contributors |
| [tyme4ts](https://github.com/6tail/tyme4ts)（农历 / 节气 / 干支计算） | 1.5.6 | MIT | Copyright © 6tail |

以下依赖**只在开发期使用**，不打进产物：Vite、`@vitejs/plugin-vue`、`vue-tsc`、TypeScript、
ESLint 与 `@antfu/eslint-config`、`playwright-core`、`vite-plugin-static-copy`、`vite-plugin-zip-pack`、
`rollup-plugin-livereload`，以及只提供类型声明的
[SiYuan Petal](https://github.com/siyuan-note/petal)（`siyuan` 包，MIT）。

## MIT

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
associated documentation files (the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge, publish, distribute,
sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial
portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## ISC

Copyright © Lucide Contributors

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee
is hereby granted, provided that the above copyright notice and this permission notice appear in all
copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS
SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE
AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE
OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS
SOFTWARE.

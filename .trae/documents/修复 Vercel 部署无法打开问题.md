## 问题判断

* 项目是 `Vite + React` 单页应用（`package.json:6-14`、`vite.config.ts:8-19`）。

* 构建产物在 `dist/`（`dist/index.html:22` 指向 `/assets/index-...js`）。

* 当前 `vercel.json` 将所有路径重写到根目录的 `/index.html`（`vercel.json:1`），而根目录 `index.html` 在生产环境仍引用 `/index.tsx`（`index.html:24`），该文件并不会被部署，导致线上无法加载。

* 额外风险：对所有路径的重写可能覆盖静态资源请求（若未将 `dist` 设为输出目录），从而造成白屏。

## 修复思路

* 让 Vercel 以 `dist/` 作为静态站点根目录，并使用构建后的 `index.html` 与 `/assets/*` 资源。

* 移除对根目录 `index.html` 的依赖（它只用于开发），避免线上请求 `/index.tsx`。

* 如未来需要前端路由回退，再加仅匹配“非文件路径”的回退规则，避免影响静态资源。

## 具体改动

1. 调整 `vercel.json` 为静态构建配置：

   * 使用 `@vercel/static-build`，并设置 `distDir: "dist"`。

   * 不添加全量重写；如没有前端路由，保持最简即可。

   * 如需要路由回退，使用只匹配无扩展名路径的规则：`{"routes": [{"src": "/[^.]*", "dest": "/index.html"}]}`。
2. 在 Vercel 项目设置中确认：

   * Build Command：`npm run build`

   * Output Directory：`dist`
3. 保持 `vite.config.ts` 默认 `base` 为 `/`（当前未设置，符合根域部署）。如部署到子路径，再设置 `base`。

## 验证步骤

* 本地执行 `npm run build` 后 `npm run preview`，确认使用 `dist/index.html` 能正常加载并请求 `/assets/*`。

* 部署到 Vercel 后，访问主页与任意静态资源（如 `/assets/index-*.js`）均能 200 返回。

* 开发版 `index.html` 不再被线上使用（不出现对 `/index.tsx` 的请求）。

## 可能的环境变量影响（非阻塞）

* 代码通过 `vite define` 注入 `process.env.*`（`vite.config.ts:21-30`），缺失时功能可能受限，但页面应能加载。

* 如需联机功能，确保在 Vercel 的 Environment Variables 中配置：`GEMINI_API_KEY`、`ARK_API_KEY`、`ARK_BASE_URL` 等。


## 返回格式差异

* 第三方可能返回：

  * 顶层 `url` 为图片直链

  * 顶层 `data` 为字符串直链（如 webp）或数组对象（包含 `url` 或 `b64_json`）

* 目前 OpenAI 兼容分支只解析 `data[0].url` 或 `b64_json`，对“顶层 `data` 为字符串 URL”不够健壮。

## 代码适配

1. 更新图片解析（OpenAI 分支）

* 位置：services/providers/geminiProvider.ts:14-38（openAIImageGenerate）

* 解析顺序：

  * 若 `j.url` 为字符串 → 直接使用

  * 若 `typeof j.data === 'string'` → 直接使用该 URL

  * 若 `Array.isArray(j.data)` → 使用 `j.data[0].url` 或 `j.data[0].b64_json`

  * 若无上述 → 尝试 `j.image_url`、`j.b64_json`

* 返回：

  * URL 直接返回（用于 `<img src>`），或将 `b64_json` 包装为 `data:image/webp;base64,...`（按服务类型设置 MIME，默认 `image/webp`）。

1. webp 与 MIME

* 若 URL 以 `.webp` 结尾或响应 `Content-Type: image/webp`，前端 `<img>` 可正常显示；如需 Base64，按 `image/webp` 组装。

1. 同源转发与可选“抓取转为 Base64”

* 为避免浏览器跨域阻断：

  * 已使用同源路径 `/api/openai/images/generations` 获取 JSON。

  * 可增设 `/api/openai/images/fetch`（后端抓取第三方 URL 并返回 Base64），仅在需要时启用（设置项），前端对直链不可用时走该接口。

1. 设置页提示

* 在“OpenAI 兼容 Base URL”勾选说明中，补充：该模式会使用同源代理；返回 URL 时建议直接 `<img src>` 引用；如遇跨域图片无法加载，可开启“代理抓取图片为 Base64”。

## 验证

* 使用你提供的 `https://filesystem.site/cdn/...webp` 响应与普通 `b64_json` 响应，确认都能渲染。

* 在 Vercel 与本地分别验证图片显示与下载。


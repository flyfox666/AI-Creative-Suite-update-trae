## 现状与返回格式
- Gemini 图像生成/编辑接口返回两种形式：
  1) inline base64：在 candidates.content.parts 中的 `inlineData.data`，代码解析位置：services/providers/geminiProvider.ts:158-167。
  2) 文件 URI：在 `fileData.fileUri`/`file_data.file_uri`，代码解析位置：services/providers/geminiProvider.ts:169-172。
- 我们在生成函数中统一处理：
  - 若是 base64，包成 `data:image/...;base64,...` 直接给前端（services/providers/geminiProvider.ts:229-231、334-336）。
  - 若是 URI，直接返回该链接（services/providers/geminiProvider.ts:230、335）。

## 第三方返回
- 第三方 OpenAI 风格图片端点返回 http 直链或 b64；我们已在 OpenAI 兼容分支中支持解析 `data[0].url` 或 `data[0].b64_json`。
- 浏览器直接加载第三方 http 链接可能触发 CORS 阻断（图片或 fetch），需通过同源代理规避。

## 拟增强方案（无需改动使用方式）
1) 统一图片“标准化”层：
- 若拿到 http/https 链接，先经服务端或本地代理抓取并转为 `blob`/base64，再交给前端，避免跨域。
- 仅当链接同源可直链展示时，不做转换。

2) 代理与环境变量：
- 本地：通过 `/api/openai/*` 路径由 dev 代理转发第三方接口；
- 生产：Vercel 无服务器函数转发第三方接口；在环境中使用 `OPENAI_COMPAT_API_KEY` 注入令牌。

3) 文档与设置提示：
- 在设置页说明：勾选“OpenAI 兼容 Base URL”时，图片与聊天将走本地 `/api/openai/*`，建议在部署环境配置 `OPENAI_COMPAT_API_KEY`。

## 期待效果
- Gemini 返回的 base64/URI 与第三方返回的 URL/b64 全部自动适配；
- 消除浏览器 `ERR_ABORTED` 和 `Failed to fetch`；
- 前端使用方式不变，用户仅需在设置页选择兼容开关并填好令牌。
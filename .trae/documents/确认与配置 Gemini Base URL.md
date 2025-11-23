## 当前地址
- 默认：`https://generativelanguage.googleapis.com`
- 生效逻辑：读取设置项 `settings.GEMINI_BASE_URL`；若未设置则读取环境变量 `GEMINI_BASE_URL`；再无则回退默认（参考 services/runtimeConfig.ts）。

## 兼容模式关系
- 勾选“OpenAI 兼容 Base URL”后：聊天与图片走同源 `/api/openai/*`；Files API 仍使用 Google 原生 Base（建议保留默认）。
- 设置页在兼容模式下需同时填写第三方 API Key 与 Gemini API Key。

## 建议与操作
- 非兼容模式：保留 Base 为默认地址，避免路径拼接错误。
- 兼容模式：仍将 Gemini Base URL 保持默认，用于 Files API；第三方 API 通过 `/api/openai/*` 转发。
- 验证：在设置中保存后，进行一次图片/视频分析测试，确认 200 返回。
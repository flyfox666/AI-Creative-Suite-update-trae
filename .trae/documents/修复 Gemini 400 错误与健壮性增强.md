## 问题与原因
- 报错来源：`services/providers/geminiProvider.ts:21` 在 `geminiFetch` 收到 400 时抛出 `Gemini API error 400: <body>`；组件在 `components/StoryboardGenerator.tsx:151` 捕获并显示。
- 常见原因：
  - Base URL 配置为 OpenAI 兼容路径（`.../v1beta/openai/`），但图片走原生端点 `models/...:generateContent`，导致 400。
  - `MODEL_IMAGE` 非图片模型（如 `gemini-2.5-pro`），返回文本而非图片。
  - 请求体结构与模型期望不匹配（`contents` 结构差异、`responseModalities`/`imageConfig` 兼容性）。

## 实施方案
### 1) Base URL 规范化与校验
- 在 `services/runtimeConfig.ts` 读取时对 `GEMINI_BASE_URL` 做规范化：
  - 若包含 `/openai/`，标记为“OpenAI 兼容模式”；否则标记为“原生模式”。
  - 原生模式下使用 `x-goog-api-key` 与 `models/...:generateContent`；兼容模式仅用于 `geminiOpenAIChat`（`/v1beta/openai/chat/completions`）。
  - 若用户在设置中填了兼容路径，弹出提示引导把图片生成的 Base URL 改为 `https://generativelanguage.googleapis.com`。

### 2) 端点选择与防错
- 在 `services/providers/geminiProvider.ts`：
  - `geminiFetch` 仅用于原生路径，不允许拼在兼容 Base URL 上；若检测到兼容 Base URL，直接报明确错误并提示修改。
  - `geminiOpenAIChat` 保持兼容路径逻辑（`Authorization: Bearer`）。
- 在图片生成相关函数中，保留兜底请求体尝试，并在 400 时解析并展示可读错误。

### 3) 模型有效性校验
- 在设置页 `components/Settings.tsx` 增加前端校验：
  - `MODEL_IMAGE` 必须包含 `image` 或使用内置预设 `gemini-2.5-flash-image`。
  - 保存时若不满足，给出明确提示。

### 4) 错误信息可视化提升
- 改进 `geminiFetch` 错误：解析返回 JSON 的 `error.message`/`error.details`，拼接到抛出的错误中，便于定位。
- 在 `StoryboardGenerator.tsx` 捕获时，显示友好信息（如“请检查 Base URL 是否为原生端点、模型是否为图片模型”）。

### 5) 连通性与模型自检工具
- 添加一个轻量“健康检查”：
  - 读取当前设置，使用 `gemini-2.5-flash-image` 调用简单 `prompt` 生成图片。
  - 返回是否成功、使用的端点、模型 ID 与裁切后的错误文本，帮助用户快速定位。

## 交付与验证
- 代码修改覆盖上述四处文件：`services/runtimeConfig.ts`、`services/providers/geminiProvider.ts`、`components/Settings.tsx`、`components/StoryboardGenerator.tsx`（错误文案）。
- 本地运行 `npm run dev`，在设置页填：`Gemini Base URL = https://generativelanguage.googleapis.com`、`Gemini API Key` 有效、`MODEL_IMAGE = gemini-2.5-flash-image`，健康检查通过后再跑分镜生成。

请确认是否按此方案实施修改；确认后我会一次性完成这些改动并验证。
## 目标
- 立即使用 Base64（Data URL）方式在前端接入 Ark 的视频分析（/api/v3/chat/completions）。
- 设计为后续切换到 OSS URL 方式时无需改动调用方，仅在设置中切换。

## 实施步骤
### 接口与配置
- 在 `services/runtimeConfig.ts` 增加 `model.video` 读取：`settings.MODEL_VIDEO`。
- 在设置页 `components/Settings.tsx` 增加“视频模型 ID”输入框并保存到 `settings.MODEL_VIDEO`。

### Ark Provider：视频分析
- 在 `services/providers/arkProvider.ts` 实现 `analyzeVideo(base64VideoData, mimeType, useThinkingMode)`：
  - 读取模型：`models.video || VISION_MODEL_DEFAULT`（你可填视频理解专用模型 ID）。
  - 调用 `POST /chat/completions`，构造 OpenAI 兼容消息：
    - `system`：沿用当前分镜生成的结构化系统提示。
    - `user.content`：数组包含 `{ type: 'text', text: <分析提示> }` 与 `{ type: 'video_url', video_url: { url: 'data:video/<mime>;base64,<...>' } }`。
  - 可选启用 `thinking`（当 useThinkingMode=true）。
  - 返回 `choices[0].message.content`。

### 前端文件处理
- 在 `components/MediaAnalyzer.tsx`：
  - 读取上传 `File` → 使用 `FileReader.readAsDataURL` 生成 `data:video/<mime>;base64,<...>`，传入 `analyzeVideo`。
  - 预览使用 `URL.createObjectURL(file)`，在卸载或重新上传时 `URL.revokeObjectURL`，避免 `blob:` 中止报错。
  - 增加错误提示：当请求体过大或 Key/模型不合法时，提示“请减少视频大小或检查 API Key/模型 ID”。

### 回退与切换（预留）
- 在 `services/aiService.ts` 路由：Provider=Ark 时优先用 Ark；如 Ark 调用失败且存在 `GEMINI_API_KEY`，可提示并回退到 Gemini（可选开关，默认关闭）。
- 设置页预留“视频来源”切换（后续）：`Base64 | OSS URL`；当前默认 Base64，未来你提供 URL 后仅改设置，不改调用方。

### 国际化与提示
- `locales/en.json` 与 `locales/zh.json` 增加：
  - `mediaAnalyzer.videoModel`（视频模型 ID 标签）
  - `mediaAnalyzer.videoUploadError`、`mediaAnalyzer.fallbackToGemini`（可选）

## 验证
- Provider=Ark + 正确 `ARK_API_KEY` + 填写 `MODEL_VIDEO`：上传短视频并分析，返回分镜文本。
- 切换设置到 OSS URL（未来）：不改代码，仅将视频来源改为 URL 并走同一接口。

## 风险与建议
- Base64 请求体较大，建议限制视频文件大小与时长；生产推荐 OSS URL。
- 浏览器环境下调用侧已通过 Vite 代理避免 CORS；确保 `settings.ARK_API_KEY` 已填写。
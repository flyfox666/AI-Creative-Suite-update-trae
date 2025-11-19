## 目标
- 所有功能模块（分镜/聊天、图像生成/编辑/合并、图像分析、视频分析）均可由用户选择使用 Ark（doubao/seedream）或 Gemini（fast/pro、Imagen，视觉识别可配“nano banana”）。

## 现状与证据
- 现有为“全局二选一”模式：`aiService` 使用 `getProvider()` 做 Ark/Gemini 单选（services/aiService.ts:6）。
- `GeminiProvider` 当前被禁用，所有方法抛错（services/providers/geminiProvider.ts:3–25）。
- 运行时仅有全局 Provider 与通用模型字段（services/runtimeConfig.ts:11–18, 29–34）。

## 架构调整
- 按功能路由 Provider：
  - Image（生成/编辑/合并）
  - Storyboard/Chat（文本生成分镜）
  - Vision/Image Analyze（图像理解）
  - Video Analyze（视频理解）
- `aiService` 为每个导出的方法使用对应的 Provider 选择器（而非全局 `select()`）。

## 设置与运行时
- Settings 增加“每项功能 Provider 下拉”：
  - Image Provider（Ark/Gemini，默认 Ark）
  - Storyboard/Chat Provider（Ark/Gemini）
  - Vision Provider（Ark/Gemini）
  - Video Provider（Ark/Gemini）
- Settings 增加“每项功能的模型 ID”：
  - Ark：`MODEL_CHAT_ARK`、`MODEL_IMAGE_ARK`（seedream）、`MODEL_VISION_ARK`、`MODEL_VIDEO_ARK`
  - Gemini：`MODEL_CHAT_GEMINI`（fast/pro）、`MODEL_IMAGE_GEMINI`（Imagen）、`MODEL_VISION_GEMINI`（视觉识别可填 nano banana）、`MODEL_VIDEO_GEMINI`
- runtimeConfig 新增：
  - `getImageProvider()/getChatProvider()/getVisionProvider()/getVideoProvider()`
  - `getArkModelConfigByFeature()` 与 `getGeminiModelConfigByFeature()`

## Provider 实现
- ArkProvider：保留现有 Seedream 4.0 接入（model: doubao-seedream-4-0-250828），并使用 Settings 中的 Ark 模型字段覆盖默认。
- GeminiProvider：
  - Storyboard/Chat：用 Gemini Chat API（gemini-pro/gemini-fast）生成分镜文本，保持与 `ArkProvider.generateStoryboardAndImages` 的签名兼容（只生成文本，图像仍走 Image Provider）。
  - Vision/Image Analyze：用 Gemini 多模态（Gemini 模型，或配置的“nano banana”识别模型名）返回分析文本。
  - Video Analyze：如模型支持视频输入则接入；不支持则返回友好错误。
  - Image（生成/编辑/合并）：用 Imagen（官方文档）实现；若用户希望用 Gemini 进行图片任务，可选择 Gemini；否则默认 Image Provider 仍是 Ark。

## 模型默认映射（可被设置覆盖）
- Ark：
  - Chat：`doubao-1-5-pro-32k-250115`
  - Image：`doubao-seedream-4-0-250828`
  - Vision：`doubao-1-5-vision-pro-32k-250115`
  - Video：复用 Vision 或设置提供
- Gemini：
  - Chat：`gemini-1.5-pro` 或 `gemini-1.5-flash`（Settings 选择）
  - Image（生成/编辑/合并）：`imagen-3.0`（按文档）
  - Vision：`gemini-1.5-pro`（图像理解）或用户自填“nano banana”识别模型名
  - Video：`gemini-1.5-pro`（如支持）或用户自填

## 交互与文案
- Settings：
  - 每项功能的 Provider 与模型字段，并带提示说明（例如 Imagen 仅用于图像生成/编辑）。
- 功能不可用时：
  - 若所选 Provider 不支持该功能（如 Gemini 视频），UI灰置并提示原因。

## 错误处理与验证
- 统一错误提示：认证失败（API Key）、参数不支持、跨域或媒体过大等。
- 端到端验证：
  - 在 Settings 切换 Provider 与模型后，分别验证四类功能正常工作。
  - Image Studio 与 Storyboard 保持稳定；Media Analyzer 图像/视频分析正常。

## 交付节奏
1. Settings 与 runtimeConfig 扩展（Provider 下拉 + 模型字段）。
2. aiService 按功能路由。
3. 重新启用并实现 GeminiProvider 的各项能力（优先文本/分析，其次图片）。
4. 文案与 UI 提示完善；构建与端到端验收。
## 目标与范围
- 增加火山方舟（Ark）系列模型支持，覆盖：文本与多模态对话、图片生成/编辑/多图融合；可选接入语音合成（TTS）。
- 与现有 Gemini 服务并存，支持通过配置在两者间切换，尽量减少对现有组件的改动。

## 现状与集成点
- 现用服务：`services/geminiService.ts`，对外暴露的能力已在多个组件使用：
  - 文案+分镜+图生成：`generateStoryboardAndImages`、`generateImageForScene`（components/StoryboardGenerator.tsx:2）
  - 图片工作台：`generateImage`、`editImage`、`combineImages`（components/ImageStudio.tsx:2）
  - 媒体分析：`analyzeImage`、`analyzeVideo`（components/MediaAnalyzer.tsx:3）
  - 语音合成：`generateSpeech`（components/AudioLab.tsx:4、components/VoiceSelector.tsx:4）
- 环境注入：`vite.config.ts:14-16` 将 `GEMINI_API_KEY` 注入为 `process.env.API_KEY`。

## 技术方案
- 抽象统一 AI Provider 接口；按“提供者路由”在运行时分发到 Gemini 或 Ark。
- Ark 接入方式：直接使用 v3 OpenAI 兼容 API（HTTP），避免引入额外 SDK，减少体积与依赖。
  - 文本/多模态：`POST /api/v3/chat/completions`，Bearer `ARK_API_KEY`（参考：https://www.volcengine.com/docs/82379/1399008）
  - 图片生成：`POST /api/v3/images/generations`（Seedream/Seededit 能力，支持文本生图、图生图、多图融合；参考：https://www.volcengine.com/docs/82379/1541523）
- 语音合成（可选）：Ark v3 暂未直接提供 `audio/speech`；接入火山引擎“语音合成”服务（OpenSpeech HTTP/WebSocket，返回 Base64），保持与现有 `generateSpeech` 返回形态一致（参考：https://www.volcengine.com/docs/6561/1257544）。
- 兼容性说明：Ark v3 完全兼容 OpenAI 协议，支持流式与多模态；同时 V1/V2 已下线，请统一使用 v3（参考：https://www.volcengine.com/docs/82379/1355331）。

## 具体改动
- 新增 Provider 抽象与路由：
  - `services/providers/aiProvider.ts`：定义接口（方法签名与现有 `geminiService` 对齐）。
  - `services/providers/geminiProvider.ts`：薄封装现有实现。
  - `services/providers/arkProvider.ts`：实现 Ark 版本（HTTP fetch）。
  - `services/aiService.ts`：读取配置选择 Provider 并导出统一 API（方法名与参数保持原样）。
- 组件更新（最小改动）：将现有 `../services/geminiService` 引用统一替换为 `../services/aiService`，无需改业务代码。
  - 受影响文件：
    - `components/StoryboardGenerator.tsx:2`
    - `components/ImageStudio.tsx:2`
    - `components/MediaAnalyzer.tsx:3`
    - `components/AudioLab.tsx:4`
    - `components/VoiceSelector.tsx:4`

## Ark 能力映射与实现要点
- 文本/多模态对话（`analyzeImage` 等）：
  - `POST /chat/completions`，`model` 使用 `doubao-1-5-pro-32k-*`（文本）或 `doubao-1-5-vision-pro-32k-*`（图片理解）。
  - 图片输入：`messages[].content` 里使用 OpenAI 兼容的 `image_url`，值为可访问 URL 或 Data URL（`data:image/png;base64,...`）。
- 分镜生成（`generateStoryboardAndImages`）：
  - 系统提示与用户意图合并，使用 Ark 文本模型生成结构化分镜文本；复用现有 `parseStoryboard`（`services/geminiService.ts:173`）。
  - 逐场景图片：`generateImageForScene` 通过 `images/generations`，若需连贯性则将上一帧作为 `image` 参考；`size` 按宽高比映射（如 `16:9 -> 1280x720`）。
- 图片工作台：
  - 文生图：`generateImage` → `images/generations`，仅 `prompt`。
  - 图生图：`editImage` → `images/generations`，`image` 为 Data URL + `prompt`。
  - 多图融合：`combineImages` → `images/generations`，`image` 数组 + `prompt`；选择 `doubao-seedream-4.0` 支持多图融合。
- 语音合成（`generateSpeech` 可选迁移）：
  - HTTP 直返 Base64：`POST https://openspeech.bytedance.com/api/v1/tts`，参数包含 `appid`、`token`、`cluster`、`voice_type` 等，返回 Base64 音频，与现有前端播放逻辑兼容。
- 错误处理与提示：沿用现有 `finishReason`/文本回退模式；Ark 响应解析以 `choices[0].message.content`（对话）与图片 `data` 字段为准，统一异常消息。

## 配置与安全
- 新增环境变量（通过 `vite.config.ts` 注入为 `process.env.*`）：
  - `ARK_API_KEY`（必需）、`ARK_BASE_URL`（默认 `https://ark.cn-beijing.volces.com/api/v3`）、`AI_PROVIDER`（`gemini`/`ark`）。
  - 如启用 TTS：`VOLC_TTS_APP_ID`、`VOLC_TTS_TOKEN`、`VOLC_TTS_CLUSTER`。
- 注意：前端直呼模型需暴露 Key，建议后续增加轻量服务端代理；首版按现有模式保持一致。

## 验证与回归
- 开发验证用例：
  - Storyboard：文本 + 多图参考 → Ark 生成分镜文本 + 连贯场景图。
  - ImageStudio：文本生图 / 单图编辑 / 多图融合。
  - MediaAnalyzer：单图视觉理解输出结构化描述。
  - TTS（如启用）：返回 Base64，前端播放正常。
- 兼容性检查：`GEMINI_API_KEY` 与 `ARK_API_KEY` 并存；`AI_PROVIDER` 切换验证无异常。

## 风险与权衡
- 跨域与浏览器 Key 暴露：必要时配置 `extra_headers` 与 CORS；后续增加代理。
- 模型 ID 与地域：Ark 需使用已开通的 `Model ID` 或 `Endpoint ID (ep-...)`，并保证 base_url 与地域一致。
- v3 与 v2：统一走 v3，避免使用已下线的 v1/v2（迁移说明参考：https://www.volcengine.com/docs/82379/1355331）。

## 交付物
- 新增：`services/providers/aiProvider.ts`、`services/providers/geminiProvider.ts`、`services/providers/arkProvider.ts`、`services/aiService.ts`。
- 修改：`vite.config.ts` 注入 Ark/TTS 相关变量；5 个组件的 import 指向统一入口。
- 说明：不改动现有业务方法签名与调用方式；Gemini 与 Ark 可配置切换。

## 后续扩展
- 支持流式输出（对话与图片状态回传）。
- 支持 function calling、加密传输（`extra_headers: {'x-is-encrypted': 'true'}`）。
- 增加 UI Provider 切换与模型选择（从 `locales` 与 `contexts` 延展）。
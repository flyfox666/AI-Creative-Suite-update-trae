## 目标
- 将现有 Ark 视频分析请求体与官方 sample 完全对齐：使用 `video_url` + Data URL、添加 `max_tokens`、消息结构与顺序一致。
- 增强健壮性：更清晰的错误提示（模型不支持视频、鉴权失败）、文件大小校验与预览 pause/清理，减少 `blob:` 中止报错。

## 当前实现与差异
- 现状：`services/providers/arkProvider.ts:140` 已支持 `video_url` 的 Base64 Data URL，消息包含 system+user（text + video_url）。
- 差异：未显式传 `max_tokens`，未强制消息结构顺序与 sample 一致（先 `video_url` 后 `text`），错误提示仍较笼统。

## 调整方案
1. Ark 请求体对齐
- 在 `analyzeVideo` 调用中：
  - `messages`: 仅使用 user 角色，`content` 先 `video_url` 再 `text`（示例问题文案）。
  - 添加 `max_tokens`（默认 300，可在设置页配置为 `settings.VIDEO_MAX_TOKENS`）。
  - 保留 `model` 来自 `settings.MODEL_VIDEO`，若为空提示“未配置视频模型”。

2. 设置项扩展
- 在设置页新增 `Video Max Tokens` 字段，保存为 `settings.VIDEO_MAX_TOKENS`。
- `runtimeConfig` 增加读取该值，默认 300。

3. 错误提示增强
- 对 Ark 返回的错误码：
  - `InvalidParameter` 且 param=video_url → 提示“当前模型不支持视频理解，请更换视频模型 ID（ep-... 或支持视频的模型）”。
  - `AuthenticationError` → 提示“API Key 缺失或无效，请在设置页填入有效 Ark Key”。

4. 预览与资源清理
- 在 `components/MediaAnalyzer.tsx`：上传新视频前 `pause()` 当前 video；替换 URL 后 `revokeObjectURL` 旧 URL。
- 加入文件大小上限（例如 20MB）提示，避免过大 Base64 请求体导致网络中止。

## 验证
- 设置 `settings.MODEL_VIDEO` 为支持视频的模型或接入点，填入 `ARK_API_KEY`，上传短视频并分析，返回结果。
- 更换为不支持的视频模型，出现明确错误提示。
- 反复上传与切换，浏览器不再频繁出现 `blob:` 中止报错。
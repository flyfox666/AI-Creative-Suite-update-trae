## 实施目标
- 支持视频理解在大文件场景下稳定运行：≥20MB 走 Files API 上传，拿到 `file_uri` 后参与分析；小文件继续用 `inline_data`。
- 与现有 React + Vite 前端一致，直接使用 REST，不引入后端或额外 SDK。

## 技术方案
- 新增上传函数（`services/providers/geminiProvider.ts`）：
  - `geminiUploadFile(file: Blob | ArrayBuffer, mimeType: string): Promise<{ uri: string, mimeType: string }>`。
  - 初始化上传：`POST ${baseUrl}/upload/v1beta/files`（`x-goog-api-key`），从响应头读取上传 `Location`。
  - 上传数据：`PUT Location`（`Content-Type: mimeType`，`x-goog-api-key`），返回文件元数据（含 `uri`）。
  - 错误解析：优先解析 JSON `error.message`，重试一次并返回明确文案。
- 视频分析接入 Files API：
  - 修改 `analyzeVideo`：根据大小阈值（默认 20MB，或由设置控制）选择：
    - 小文件：保持 `inline_data` 路径，已增加模型回退/重试。
    - 大文件：`base64→Blob` 调用 `geminiUploadFile` 获得 `file_uri`，组装 `contents` 为 `[{ role:'user', parts: [{ file_data: { file_uri, mime_type } }, { text: prompt }] }]`，继续使用 `gemini-2.5-flash` 优先与多请求体重试。
- 图片分析（可选）：同策略为大图走 Files API，先保留现状。

## 设置与体验
- 新增开关（可选）：`settings.USE_FILES_API_FOR_MEDIA`（`auto`/`always`/`never`），默认 `auto`（≥20MB 走 Files）。
- 在媒体分析页提示：当文件较大时显示“已使用 Files API 上传，分析可能略有延迟”。

## 变更范围
- `services/providers/geminiProvider.ts`：新增上传函数；更新 `analyzeVideo` 的 file_uri 分支。
- `services/runtimeConfig.ts`：新增读取 `USE_FILES_API_FOR_MEDIA`（可选）。
- `components/Settings.tsx`：增加对应开关 UI（可选）。
- `components/MediaAnalyzer.tsx`：提示文案（可选）。

## 验证
- 小视频（<20MB）：走 `inline_data`，返回非空文本。
- 大视频（≥20MB）：走 Files API 上传，返回非空文本；错误时显示安全阻断或网络错误原因。

## 风险与注意
- 前端持有 API Key 与跨域上传：与当前架构一致；生产建议通过服务端代理隐藏密钥。

确认后我将按以上方案修改并完成联调与验证。
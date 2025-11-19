## 目标
- 在“媒体分析”页的视频模式下，显示 Gemini Files API 上传返回的 `file_uri` 与状态，便于定位“Empty response”问题。

## 改造点
- 新增上传调试函数：在 `services/providers/geminiProvider.ts` 导出 `geminiUploadMediaForDebug(base64, mimeType)`，内部使用现有 `geminiUploadFile`，返回 `{ uri, status }`（等待至 ACTIVE 或返回错误信息）。
- 透传到服务入口：在 `services/aiService.ts` 增加 `geminiUploadMediaForDebug` 导出，当前 Provider 为 Gemini 时调用；非 Gemini 返回错误提示。
- 更新视频页 UI：在 `components/MediaAnalyzer.tsx` 视频模式的分析流程中：
  - 在调用 `analyzeVideo` 前，执行一次 `geminiUploadMediaForDebug`（仅当 Provider 为 Gemini）；将返回的 `file_uri` 与状态写入本页状态并展示；若上传失败则展示错误信息。
  - 继续调用 `analyzeVideo`（保持现有逻辑）；即使分析失败，上传信息仍可留存供排查。
- 展示位置与样式：在视频预览下方新增一块“Files API 上传信息”卡片，显示 `file_uri` 与 `status`，便于复制与检查。

## 验证
- 在设置页 Provider 选为 Gemini，上传任意视频并点击分析：
  - 预期先显示 `file_uri` 与状态（ACTIVE/FAILED/错误文案），随后显示分析结果或错误。
  - 若再次出现空响应，可凭 `file_uri` 复用终端调试脚本进行排查。

若确认，我将按以上方案修改相关文件并回归验证。
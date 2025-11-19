## 目标
- 在“媒体分析”页的视频模式中，实时显示 Gemini Files API 上传进度与结果，包括：阶段、file_uri、状态（ACTIVE/FAILED/PENDING）。位置固定在右侧“分析视频”按钮上方。

## 实施内容
- 在 Provider 中新增上传函数（带进度回调）：
  - `geminiUploadMediaWithStatus(base64, mimeType, onStatus)`：顺序更新阶段 `init → upload_url → uploaded → state(PENDING/ACTIVE/FAILED)` 并返回 `{ uri, status }`。
- 在服务入口透传：
  - 新增 `uploadMediaWithStatus(base64, mimeType, onStatus)`（仅 Gemini 有效）。
- 在 `MediaAnalyzer.tsx`：
  - `handleFileChange`（视频）选中后自动触发 Files API 上传，使用回调实时更新本地 `videoUploadInfo` 状态。
  - 在视频 UI 中，固定在右侧“分析视频”按钮上方展示“Files API 上传信息”卡片，显示阶段、状态与 `file_uri`。

## 验证
- 切换 Provider 为 Gemini；上传视频后，右侧立即显示上传信息；上传完成后显示 `file_uri` 与最终状态；点击“分析视频”完成分析。
## 问题判断
- 错误来源：预览视频使用 `blob:` URL（`URL.createObjectURL`），在分析或切换文件/状态时，旧的对象 URL被清理或播放器切换，浏览器取消该资源的加载并记录 `net::ERR_ABORTED blob:...`。这常见于在视频仍在加载时调用 `URL.revokeObjectURL` 或替换 `src`。
- 与 Gemini/Ark 请求无直接关系：Gemini 端发送 `inline_data`（≤20MB），Ark 端发送 data URL；报错指向预览层（`<video src={blob:...}>`）。

## 修改方案
### 1) 合理化对象 URL 生命周期
- 在 `MediaAnalyzer.tsx`：
  - 移除依赖于 `imageFile?.url, videoFile?.url` 的清理 effect；改为只在组件卸载时清理（`useEffect(() => () => { ... }, [])`）。
  - 在 `handleFileChange` 中手动清理旧 URL：
    - 若存在旧视频 URL：先 `pause()`，将 `videoRef.current.src = ''`，再 `URL.revokeObjectURL(oldUrl)`，最后创建新的 `URL.createObjectURL` 并赋值。
    - 对旧图片 URL同理清理（无需 `pause`）。

### 2) 降低预览的加载量
- 为 `<video>` 添加 `preload="metadata"`，减少视频预览阶段的数据抓取，降低并发加载中被中止的可能性。

### 3) 友好错误处理
- 在 `handleAnalyze` 的 `catch` 中：若错误包含 `ERR_ABORTED` 或来源为 `blob:`，忽略该预览层日志，不将其作为分析失败提示；真实分析失败仍正常展示。

### 4) 文档与最佳实践提示（不改代码逻辑）
- 保持 20MB 限制；更大的文件建议采用 Gemini Files API 上传后以 `file_uri` 方式分析（与官方文档一致）。如需，我可后续补充文件上传路径与 `createPartFromUri` 的支持。

## 涉及文件
- `components/MediaAnalyzer.tsx`：对象 URL 清理、`preload="metadata"`、错误过滤三处改动。

## 验证
- 上传小视频进行预览与分析：不再出现 `net::ERR_ABORTED blob:`；分析结果正常返回。
- 切换/重复上传：无跨帧旧 URL 中止问题；组件卸载时资源被正确释放。

确认后我将立即实施上述改动并回归测试。
## 思路
- 不再使用代理监听，而是在代码内部为 Gemini/Ark 请求添加日志打印，保证不改 Base URL、不影响连通性。
- 通过设置开关控制日志开关，默认关闭，仅在调试时开启。

## 实施项
1) 新增日志开关
- runtimeConfig：`getEnableRequestLogs()` 读取 `settings.ENABLE_REQUEST_LOGS`（默认 `false`）。
- Settings 页面：新增开关“调试日志（请求/响应）”。

2) 统一日志工具
- 新增 `services/logger.ts`：
  - `logRequest({ provider, method, url, headersMasked, reqBytes, status, resBytes, durMs, snippet })`
  - 自动掩码敏感头（`x-goog-api-key`、`Authorization`）。
  - 控制台打印结构化日志；仅在开关为 `true` 时打印。

3) 集成到请求路径
- `geminiFetch` 与 `geminiOpenAIChat`：
  - 调用前记录方法/URL/请求体大小；调用后记录状态/耗时/响应体片段（最多 1024 字节）。
- Files API 上传函数 `geminiUploadFile`：
  - 记录 init 与 upload 两步的请求/响应日志（含 `X-Goog-Upload-URL`）。
- Ark 的 `arkFetch`：同样集成日志。

4) 错误日志增强
- 当 `res.ok` 为 false 时，打印 `
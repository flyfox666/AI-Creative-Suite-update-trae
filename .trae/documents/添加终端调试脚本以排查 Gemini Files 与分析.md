## 目标
- 在项目根目录添加一个 Node 脚本，直接通过终端调用 Gemini Files API 与 generateContent，输出完整请求/响应信息，便于定位错误（协议头、鉴权、模型与请求体等）。

## 实施内容
- 新增文件：`scripts/gemini-debug.mjs`
  - 兼容 ESM（项目 `type: module`）。
  - 读取 `process.env.GEMINI_API_KEY` 与 `process.env.GEMINI_BASE_URL`（默认 `https://generativelanguage.googleapis.com`）。
  - 提供三个子命令：
    - `upload <filePath> <mime>`：执行可恢复上传，返回 `file_uri` 并打印关键响应头（含 `X-Goog-Upload-URL`）。
    - `analyze-video <filePath> <mime> [model]`：上传文件得到 `file_uri`，以 `contents=[file_data+text]` 调用 `models/...:generateContent`，打印文本结果或错误原因。
    - `analyze-image <filePath> <mime> [model]`：同上（模型默认 `gemini-2.5-flash` 或 `gemini-2.5-flash-image` 视场景）。
  - 详细日志：开启 `--verbose` 输出请求头、`upload URL`、响应体（截断较长内容时打印摘要）。
  - 错误解析：优先解析 JSON `error.message` 与 `promptFeedback.blockReason`；无 JSON 时回退为原始文本。
- 更新 `package.json`：新增 npm script 入口
  - `debug:gemini:upload` 和 `debug:gemini:analyze-video` 示例命令，用户也可直接 `node scripts/gemini-debug.mjs`。

## 使用方法
- 环境：在 PowerShell 终端设置 `GEMINI_API_KEY` 与可选 `GEMINI_BASE_URL`。
- 示例：
  - `node scripts/gemini-debug.mjs upload .\sample.mp4 video/mp4 --verbose`
  - `node scripts/gemini-debug.mjs analyze-video .\sample.mp4 video/mp4 gemini-2.5-flash --verbose`
  - `node scripts/gemini-debug.mjs analyze-image .\sample.jpg image/jpeg gemini-2.5-flash --verbose`

## 验证
- 运行 `upload` 验证可恢复上传流程；获得 `file_uri`。
- 运行 `analyze-video` 输出文本结果或明确错误；对比当前前端行为，快速锁定问题环节。

确认后我将添加脚本文件与 npm scripts，并进行一次上传与分析的终端验证。
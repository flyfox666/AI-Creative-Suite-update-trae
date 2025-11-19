# AI Creative Suite / AI Video Storyboard Generator

一个基于 React + TypeScript + Vite 的前端应用，集成 Gemini 与 Ark（Doubao/Seedream）两大 AI 提供方，支持分镜生成、图片生成/合成/编辑、媒体（图片/视频）分析等功能。

## 快速开始
- 安装依赖：`npm install`
- 开发运行：`npm run dev`（默认 `http://localhost:3000/`）
- 生产构建：`npm run build`；预览：`npm run preview`

## 主要功能模块
- 分镜生成器（Storyboard）：
  - 使用 Chat 模型生成分镜文本 → 解析 → 按场景生图
  - 支持参考图与风格连贯（强/弱/关闭）
- 媒体分析器（Media Analyzer）：
  - 图片/视频理解与复刻分镜脚本
  - 支持视频/图片预览与结果框滚动查看；Markdown 结果按格式美观展示
- 设置页（Settings）：
  - Provider 选择、API Key、Base URL、模型配置、语言、视频 tokens、图片尺寸、水印、无限积分
  - 健康检查：Gemini/Ark 图像生成连通性
  - 调试日志（开发模式）开关

## 技术栈
- 前端：React 18 + TypeScript + Vite + Tailwind（页面样式）
- Markdown 渲染：`react-markdown` + `remark-gfm`

## Provider 与配置
- 运行时配置优先读取 `localStorage`（`settings.*`），否则回退 `process.env.*`（通过 Vite `loadEnv` 注入）。
- 关键设置（Settings 或环境变量）：
  - `AI_PROVIDER`: `gemini | ark`
  - `GEMINI_API_KEY`, `GEMINI_BASE_URL`（推荐 `https://generativelanguage.googleapis.com`）
  - `ARK_API_KEY`, `ARK_BASE_URL`（生产：`https://ark.cn-beijing.volces.com/api/v3`；开发代理见下）
  - 模型：Chat/分镜、图片、视觉理解、视频分析（不同 Provider 下有差异）
  - `VIDEO_MAX_TOKENS`、`REPLY_LANGUAGE`（`zh | en | auto`）、`IMAGE_SIZE_PRESET`（`1K/2K/4K` 或像素字符串）、`IMAGE_WATERMARK`

### Gemini
- 文本：OpenAI 兼容端点 `/v1beta/openai/chat/completions`
- 图片/视频/文件：原生端点 `models/*:generateContent`，统一使用 Files API 上传媒体后以 `file_uri` 参与生成/分析，避免请求体过大与跨域问题。
- 推荐模型：
  - 视频理解：`gemini-2.5-flash`
  - 图片生成：`gemini-2.5-flash-image`
- 语言控制：视频与图片提示前自动附加语言指令（中文/英文），由 Settings 的 `Reply Language` 控制。
- 调试日志（开发模式）：Settings 勾选后在 Console 打印请求/响应摘要（脱敏头部）。

### Ark（Doubao/Seedream）
- 开发代理与 CORS：
  - 在 `localhost/127.0.0.1` 或局域网 `10.* / 192.168.* / 172.16–31.*` 访问开发页时，`Ark Base URL` 自动使用 `'/arkapi/api/v3'`，通过 Vite 代理到官方域，避免浏览器预检拦截 `Authorization`。
  - 生产环境需服务端代理。
- Chat/分镜默认首选：`doubao-1-5-pro-32k-250115`（可选 `doubao-seed-1-6-*`）
- 图片模型：
  - `doubao-seedream-4-0-250828`
    - 支持参考图与组图；单图生成配置 `sequential_image_generation='disabled'`
    - 支持多图合成；返回 `b64_json`
  - `doubao-seedream-3-0-t2i-250415`
    - 仅文生图（Text-to-Image），不支持参考图/组图/图生图
    - 支持 `seed`（`-1` 随机或 `0–2147483647`），Settings 下拉选择 t2i 时显示 Seed 输入框
    - `size` 必须为像素字符串 `WIDTHxHEIGHT`（示例：`1024x1024`；`2K/4K` 会映射成像素）
- 统一输出：图片生成与合成均使用 `response_format: 'b64_json'`，前端直接显示 Data URL。

## 结果展示与交互
- 分析结果框：固定高度、始终显示滚动条，支持复制与下载全文。
- Markdown 预览：检测到 Markdown 特征时自动使用 ReactMarkdown + GFM 样式渲染，更美观易读。

## 调试与脚本
- 调试日志：Settings 勾选“调试日志（开发模式）”，Console 显示基础请求、Files API 上传与状态轮询、阻断原因等。
- 代理（可选）：`npm run proxy` 启动本地日志代理（开发使用），Settings 可将 Gemini Base URL 指向 `http://localhost:4000/gemini`；若直连稳定，建议无需代理。
- 终端调试（可选）：
  - `npm run debug:gemini:upload` / `debug:gemini:analyze-video` / `debug:gemini:analyze-image`
  - 需设置 `GEMINI_API_KEY`（可选 `GEMINI_BASE_URL`），用于快速复现 Files API 与生成调用。

## 常见问题
- CORS 报错 `authorization is not allowed`：使用开发代理路径 `'/arkapi/api/v3'` 或通过 `localhost/局域网 IP` 访问；生产环境通过后端代理。
- Gemini Files API 报“init missing upload url/No file found”：需采用可恢复上传协议头；项目已实现自动处理。
- “File not ACTIVE” 错误：已在上传后轮询 `files.get` 等待 `ACTIVE` 状态，失败会给出明确错误。
- 视频分析结果不全：提高 Settings 的 `VIDEO_MAX_TOKENS`（如 2048/4096），并优先使用 `gemini-2.5-flash` 或 `gemini-2.5-pro`；结果框可滚动与复制保存。

## 安全
- 不要提交或暴露 API Key；生产环境建议通过服务端代理隐藏密钥。

## 目录结构（简要）
- `components/`：页面与交互组件（`StoryboardGenerator.tsx`、`MediaAnalyzer.tsx`、`Settings.tsx`、`MarkdownBlock.tsx`、`CodeBlock.tsx`）
- `services/`：Provider 封装、配置读取（`providers/geminiProvider.ts`、`providers/arkProvider.ts`、`aiService.ts`、`runtimeConfig.ts`）
- `utils/`：解析与工具（`parser.ts`、`fileUtils.ts`）
- `scripts/`：调试/代理脚本（`gemini-debug.mjs`、`gemini-proxy.mjs`）

## 目标
- 在 Settings 里用“品牌切换”简化配置：选择 Ark 或 Gemini 时，仅显示该品牌相关的字段与模型下拉。
- 支持自定义 Base URL 与 API Key；模型下拉提供常用预设并包含“自定义 Model ID”。
- 选择品牌后，所有模块统一走该品牌的 Provider 与模型。

## 现状
- Settings 同时展示 Ark 与通用模型字段，界面冗杂（components/Settings.tsx）。
- 运行时全局 Provider 只支持 ark/gemini 二选一（services/runtimeConfig.ts:getProvider）。
- GeminiProvider 当前禁用；无法选择 Gemini（services/providers/geminiProvider.ts）。

## 设计与实现
### 1) Settings UI 重构
- 顶部新增“品牌选择”单选：Ark / Gemini。
- 当选择 Gemini：
  - 显示：`Gemini Base URL`（默认官方 API 域，可自定义）、`Gemini API Key`、模型下拉：
    - Chat/Storyboard：`gemini-1.5-pro`、`gemini-1.5-flash`、`gemini-flash-lite-latest`、`Custom...`
    - Vision（图像识别/多模态）：`gemini-1.5-pro`、`gemini-1.5-flash`、`Custom...`（可填“nano banana”）
    - Image（生成/编辑/合并）：`imagen-3.0`（或当前可用版本）、`Custom...`
    - Video（分析）：`gemini-1.5-pro`（若支持）、`Custom...`
- 当选择 Ark：
  - 显示：`Ark Base URL`、`Ark API Key`、模型文本框（保持现有）、尺寸预设、水印开关。
- 交互：
  - 下拉若选“Custom...”，展开一个输入框接收自定义 Model ID。

### 2) 运行时配置扩展
- runtimeConfig 新增：`getBrand()`（ark/gemini）、`getGeminiBaseUrl()`；
- `getModelConfig()` 按品牌读取对应字段：若品牌为 gemini 则读取 gemini_* 模型键，ark 则读取现有键。

### 3) Provider 路由
- aiService 保持全局品牌选择：所有功能调用同一品牌的 Provider。
- GeminiProvider：
  - 启用 Chat/Storyboard（文本），Vision（图像分析）、Video（如支持）、Image（使用 Imagen）方法。
  - 使用 Settings 中的 gemini_* 模型值；Base URL 与 API Key 来自运行时配置。
- ArkProvider：保持现有 Seedream 4.0（doubao-seedream-4-0-250828），并使用 Settings 配置覆盖默认。

### 4) 本地化与文案
- 新增 Settings 字段的多语言文案：品牌选择、Gemini Base URL/API Key、各模型下拉与“自定义 Model ID”。
- 保留已存在的回复语言、尺寸、水印、无限积分文案。

### 5) 验证
- 品牌选择为 Gemini：
  - 分镜/聊天生成、图像/视频分析与（如启用）Imagen 图像生成/编辑/合并均使用 Gemini。
- 品牌选择为 Ark：
  - 所有模块使用 Ark；Image Studio 无跨域错误；尺寸与水印生效。
- 下拉与自定义 Model ID 正常工作；Base URL 与 API Key 生效。

## 注意
- “nano banana”非官方标准命名，将作为 Vision 的自定义 Model ID 使用；若与官方 Gemini Vision 冲突，界面提示“自定义模型名由用户提供”。
- Tailwind CDN 警告不影响开发，生产环境可按需改为 PostCSS/CLI 安装。
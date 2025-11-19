## 调整点
- 使用你指定的 `gemini-2.5-flash-image` 作为 Gemini 的图像生成/编辑默认模型；分镜/聊天与多模态分析默认用 `gemini-2.5-pro/flash`（可切换）。
- Settings 进行“品牌化切换”：选择 Ark 或 Gemini 时仅显示该品牌相关字段与模型下拉，并支持 Base URL 与 API Key 的自定义，以及“自定义 Model ID”。
- 选择品牌后，所有模块统一走该品牌的 Provider 与模型。

## Settings 改造
- 顶部新增“模型品牌”：Ark / Gemini。
- 选择 Gemini 时显示：
  - `Gemini Base URL`（默认官方域，可自定义），`Gemini API Key`
  - 下拉与自定义：
    - Image（生成/编辑/合并）：默认 `gemini-2.5-flash-image`，提供 `Custom...`
    - Chat/Storyboard：`gemini-2.5-pro`、`gemini-2.5-flash`、`gemini-flash-lite-latest`、`Custom...`
    - Vision（图像分析/多模态）：`gemini-2.5-pro`、`gemini-2.5-flash`、`Custom...`（可填“nano banana”）
    - Video（分析）：`gemini-2.5-pro` 或 `Custom...`（如模型支持视频输入）
- 选择 Ark 时显示：
  - `Ark Base URL`、`Ark API Key`
  - 模型文本框（保持现有方式），保留 `Image Size(2K/4K)` 与 `Watermark` 开关。

## Runtime 与路由
- 扩展运行时读取：`getBrand()`、`getGeminiBaseUrl()`；根据品牌返回对应的模型配置（Ark/Gemini）。
- `aiService` 按品牌统一路由：所有方法使用当前品牌对应的 Provider；不再混用。

## GeminiProvider 实现
- Image：对接 `gemini-2.5-flash-image`，支持文本生图与“图生图编辑”（上传源图+指令）。返回 Data URL（Base64）以统一前端逻辑。
- Chat/Storyboard：使用 `gemini-2.5-pro/flash` 输出分镜文本，签名与 Ark 保持一致（图片仍由 Image 模块生成）。
- Vision：使用多模态（文本+图片）分析；如填写“nano banana”，作为自定义模型名透传。
- Video：若模型支持视频输入则调用；否则返回明确错误提示。

## Ark 保持
- Image：默认 `doubao-seedream-4-0-250828`，按设置传 2K/4K 与 `watermark`；优先返回 Base64，避免跨域抓取。
- Chat/Vision/Video：沿用当前配置与错误处理。

## 返回格式与错误处理
- 统一返回 Data URL（Base64）；若供应商返回 URL，前端兼容展示但不强制抓取。
- 错误分类：认证失败、参数不支持、媒体过大、跨域/网络错误；Settings 提供清晰提示与必填项。

## 验证
- 品牌切换到 Gemini：图像（gemini-2.5-flash-image）生成/编辑、分镜/分析/视频（按支持）正常；
- 品牌切换到 Ark：所有模块走 Ark，Image Studio 稳定；
- 下拉与“自定义 Model ID”生效；Base URL 与 API Key 可修改并即时应用。
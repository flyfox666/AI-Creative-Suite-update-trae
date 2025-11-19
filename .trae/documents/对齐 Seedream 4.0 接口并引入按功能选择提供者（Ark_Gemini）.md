## 现状与问题
- Image Studio 流程：
  - 生成/编辑/合并均走 `services/aiService.ts` → Ark Provider（当前 Gemini Provider 已禁用）。
  - Ark 端默认 `response_format: 'url'`，现已在 Provider 内统一转换为 Data URL，避免 UI 报错。
- 与 Seedream 4.0 文档差异：
  - 文档支持 `size: "2K"/"4K"/自定义像素`；我们使用像素字符串并做 2K 映射，能工作但不够简洁。
  - 文档支持 `sequential_image_generation: 'auto'` + options（多张输出/组图/主体一致性）；我们多数场景设为 `'disabled'` 并逐张生成。
  - 支持 `watermark`；当前未暴露设置。
  - 约束：最多 10 张参考图、单图 ≤10MB、总像素 ≤6000×6000、宽高比 [1/3, 3]；我们未在前端严格校验（除视频 20MB）。
- Gemini 状态：
  - 代码中 Gemini Provider 为禁用桩；“nano banana”并不可用。用户无法切换到 Gemini 完成图像相关任务。

## 目标
1) 与 Seedream 4.0 接口保持一致：更易用的尺寸选择、可选的组图/连贯生成开关、可选水印、前端校验约束。
2) 引入“按功能选择提供者”的能力：图片用 Ark（Seedream 4.0），文本/分镜/多模态可选 Gemini；用户可在设置里选择各功能的提供者/模型。

## 方案与改动
### A. Seedream 4.0 对齐与增强
- 尺寸：
  - 在 Settings 增加 `Image Size Preset`（"2K"/"4K"/自定义像素）。
  - Ark Provider 根据设置决定：若选择预设，直接传 `size:"2K"/"4K"`；若选择自定义，沿用像素字符串并保留宽高比映射。
- 组图/连贯生成：
  - 在 Image Studio 增加“生成多张（连贯）”开关与数量输入（1–3 或 1–N，受 API 限制）。
  - Ark Provider 在多张输出场景传：
    - `sequential_image_generation: 'auto'`
    - `sequential_image_generation_options: { max_images: N }`
  - UI 接受多张输出并以网格展示；仍将 URL 统一转换为 Base64（已在 Provider 层实现）。
- 水印：
  - 在 Settings 增加 `watermark` 开关；Ark Provider 传 `watermark: true/false`。
- 约束校验：
  - Image Studio 与 Storyboard 上传图片时：
    - 单图大小 ≤10MB；超过给出友好的错误提示。
    - 总张数 ≤10；超限提示（我们目前 FREE=3、PRO=10 已与限制一致）。
    - 额外提示：宽高比范围与总像素上限（仅提示，不进行复杂像素计算）。

### B. 按功能选择提供者（Ark/Gemini）
- Settings 扩展：在现有模型设置基础上，新增每个功能的 Provider 下拉：
  - `Image Provider`: Ark/Gemini（默认 Ark）
  - `Storyboard/Chat Provider`: Ark/Gemini（默认 Ark）
  - `Vision (Image) Provider`: Ark/Gemini（默认 Ark）
  - `Video Provider`: Ark/Gemini（默认 Ark）
- Runtime：新增各功能的 provider 选择读取函数，比如 `getImageProvider()` 等；`aiService` 按功能动态选择 Provider。
- Gemini Provider：
  - 重新启用文本/分镜/图像分析/视频分析功能（使用 GEMINI_API_KEY），与当前接口对齐。
  - 图像生成/编辑/合并：若暂不支持 Gemini 图像能力，则在 Gemini Provider 返回明确错误，或将这三项在 UI 中灰置并提示“请使用 Ark 图像模型”。
  - 用户因此可：
    - 选择 Seedream 4.0 用于所有图像相关任务；
    - 选择 Gemini 作为分镜/视频/图像分析模型（若需要）。

## 交互与文案
- Settings：
  - 新增 `AI 回复语言`已上线；继续复用。
  - 新增 `Image Size`（2K/4K/Custom）、`Watermark`、各功能 Provider 下拉。
- Image Studio：
  - 新增“生成多张（连贯）”开关与数量输入；结果网格展示。
  - 上传时增加 10MB 体积校验提示。

## 验证
- 构建与端到端测试：
  - 文生图/图生图/多图合成均能返回 Data URL，UI不报错。
  - 连贯组图可生成 N 张，UI网格展示。
  - 切换水印与尺寸预设对结果生效。
  - 在 Settings 切换各功能 Provider：
    - 图像相关选择 Ark；
    - 分镜/分析/视频选择 Gemini 也可工作（若启用）。

## 交付节奏（迭代）
1. Settings 与 Runtime 扩展（尺寸预设、水印、功能 Provider）。
2. Ark Provider 支持尺寸预设、watermark、组图参数；前端上传校验。
3. UI 增加“多张生成”开关与数量；网格展示与下载。
4. 重新启用 Gemini Provider 的非图像能力；`aiService` 按功能选择 Provider。
5. 验证全流程并优化错误提示与文案。
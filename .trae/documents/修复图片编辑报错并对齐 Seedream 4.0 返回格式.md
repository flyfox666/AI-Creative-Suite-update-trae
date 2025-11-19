## 问题根因
- 当前图片编辑/生成/合并在 Ark 端使用 `response_format: 'url'`，Provider 试图用 `fetch(url)` 将签名 CDN 链接转成 Base64，跨域受限导致 `Failed to fetch`。
- Image Studio 前端强制要求 Data URL（`data:image/...;base64,...`），因此 URL 返回也会被视为无效。

## 目标
- 避免跨域抓取，保证编辑/生成/合并稳定返回 Base64；保留对 URL 的兼容展示。
- 保持与 Seedream 4.0 文档参数一致（模型、尺寸、水印），并在需要时支持顺序组图生成。

## 具体改动
1) Ark Provider（Image Studio 三个接口）
- `generateImage` / `editImage` / `combineImages` 请求改为 `response_format: 'b64_json'`，直接返回 Base64。
- 移除对 URL 的 `fetch` 转换；若供应商仍返回 URL（异常情况），则直接返回 URL 给前端，不抛错。
- 保留已加的 `size` 预设（2K/4K）与 `watermark` 设置。

2) Image Studio 前端兼容
- 去除严格的 Data URL 正则校验（components/ImageStudio.tsx:203–205），允许两类返回：
  - Data URL：原逻辑不变。
  - URL：直接展示，不转换。
- “再次编辑”时，若只有 URL 且无 Base64，直接将 URL 作为 `image` 传给 Ark（Seedream 4.0 支持图片 URL 输入），不强制转 Base64。
- 下载：URL 场景直接下载；Data URL 场景维持现状。

3) 文案与设置
- 将 `settings.unlimitedCredits` 与 `settings.unlimitedCreditsHint` 移入 `settings` 节点，修复翻译缺失警告。

4) Seedream 4.0 对齐与可选增强
- 已有：`model: 'doubao-seedream-4-0-250828'`、尺寸预设（2K/4K）、`watermark`。
- 可选：新增“顺序组图生成”开关与数量输入，Provider 传 `sequential_image_generation: 'auto'` 和 `sequential_image_generation_options: { max_images: N }`。

5) 验证
- 本地编辑一张图片→不再出现 `Failed to fetch`；返回 Base64 正常展示与再次编辑。
- 生成与合并同样稳定；URL 返回时也能展示与下载。
- Settings 页面不再出现翻译缺失警告。

## 说明
- 根据 Seedream 4.0 文档示例常用 `response_format: 'url'`（并支持 `size: '2K'`、顺序生成等），我们在 Image Studio 场景改用 `b64_json` 是为规避前端跨域抓取问题；展示 URL 仍兼容，不强制失败。
- 如需让用户选择 Seedream/Gemini 模型：我后续可按功能重启 Gemini Provider（分镜/分析/视频），并在设置中加入每项功能的 Provider 选择，下沉图像任务到 Seedream。
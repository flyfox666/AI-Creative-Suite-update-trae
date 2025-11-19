当前代码默认分辨率主要为 ~1K（例如 1024x1024、1280x720）。根据官方文档，doubao-seedream-4-0-250828 支持更高分辨率（2K/4K 或更大像素范围）。我准备按以下方案将生图、编辑图、合成图统一提升到 2K：

1) 使用 250828 模型
- 在设置中将图片模型设为 doubao-seedream-4-0-250828（代码会读取 settings.MODEL_IMAGE），从而所有图片相关流程（文生图、图生图、合成图）统一用该模型。

2) 场景生图（generateImageForScene）改为 2K 分辨率
- 文件：services/providers/arkProvider.ts:49 使用的 size 由 aspectToSize(aspectRatio) 决定
- 将 aspectToSize 映射（services/providers/arkProvider.ts:26-35）更新为 2K 推荐值：
  - 1:1 → 2048x2048
  - 16:9 → 2560x1440
  - 9:16 → 1440x2560
  - 4:3 → 2304x1728
  - 3:4 → 1728x2304
  - 3:2 → 2496x1664
  - 2:3 → 1664x2496
  - 21:9 → 3024x1296
- 默认回退：2048x2048

3) 纯生成/编辑/合成统一提升到 2K
- 纯生成 generateImage（services/providers/arkProvider.ts:164）：size 改为 2048x2048
- 编辑图 editImage（services/providers/arkProvider.ts:177）：size 改为 2048x2048
- 合成图 combineImages（services/providers/arkProvider.ts:152）：size 改为 2048x2048（或根据后续需求扩展为按纵横比映射）

4) 兼容“size: \"2K\"”模式（可选）
- 如果你希望直接传入 “2K/4K” 预设，我们可在检测模型为 250828 时将 size 直接设为 "2K"，并在 prompt 中明确期望的纵横比；但为保证纵横比确定性，优先采用明确像素值方案。

5) 注意与验证
- Ark 的图片输入限制需满足（格式、比例、大小、总像素等）；2K 显著提升画质但会增加时延与消耗。
- 修改后我会本地验证：按不同纵横比生成，确认返回图像分辨率正确；并检查编辑与合成流程是否按 2K 输出。

请确认是否按以上方案实施；确认后我将对上述文件进行更新并进行验证。
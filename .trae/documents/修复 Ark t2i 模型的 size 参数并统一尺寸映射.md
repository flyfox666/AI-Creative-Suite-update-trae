## 问题

* 在 `doubao-seedream-3-0-t2i-250415` 下，传入 `size` 为 `2K/4K` 导致 400：该模型要求 `WIDTHxHEIGHT` 形式。

## 方案

* 在 Ark Provider 内新增尺寸归一化：

  * 将设置中的 `2K/4K` 映射为像素：`2K → 2048x2048`，`4K → 4096x4096`；空值、无效则用 `1024x1024`。

  * 对 4.0 模型保持 `aspectToSize(aspectRatio)`（返回 `WIDTHxHEIGHT`）。

  * 增加正则校验，若不是 `^\d+x\d+$` 则回退默认像素。

* 应用到所有 Ark 图片生成路径：

  * `generateImageForScene`（场景出图）

  * `combineImages`（多图合成，t2i 不支持则用文生图单图替代）

  * `editImage`（图生图，t2i 不支持则用文生图单图替代）

## 验证

* 选择 `doubao-seedream-3-0-t2i-250415`：不传 `image`/`sequential_image_generation`，`size` 为像素字符串，接口返回正常。

* 选择 `doubao-seedream-4-0-250828`：保留 `image` 与 `sequential_image_generation='disabled'`，`size` 来自 `aspectToSize` 或映射结果，正常生成。


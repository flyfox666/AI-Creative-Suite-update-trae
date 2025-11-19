## 现状与问题
- 现有流程：Chat 生成分镜文本 → 解析为场景 → 首次出图使用 `description`（简化字段），重生使用 `fullPrompt`（完整场景文本）。
- 结果偏差主要源于：首次出图提示不够强；连贯模式把上一帧图像作为参考导致提示主导性降低；模型与端点已修正，但提示语义仍弱。

## 修改方案
### 1) 首次出图改用完整提示
- 在 `services/providers/geminiProvider.ts:136` 将 `parsedScenes[i].description` 改为 `parsedScenes[i].fullPrompt`，与重生一致，增强语义强度。
- 保留 `aspectRatio` 与参考图逻辑不变；仅替换文本内容来源。

### 2) 为出图提示加严格前缀模板
- 在 `generateImageForScene` 内对传入的 `prompt` 包装：根据语言加简短前缀，强调“严格按描述生成、避免额外元素、保持构图与光照要求”。
- 示例（英文/中文自动选择）：
  - EN: "Generate an image that strictly follows the following scene description. Avoid adding extra elements. Cinematic composition and faithful lighting/colors. " + prompt
  - ZH: "请严格按照以下场景描述生成图像，不要添加额外元素。保持电影级构图与光照/色彩一致：" + prompt

### 3) 可控连贯强度
- 在设置页新增“风格连贯”选项：`off | weak | strong`。
  - strong：与当前一致，传 `previousImageUrl` 作为 `inline_data`。
  - weak：不传参考图（提示强主导）。
  - off：同 weak。
- 读取配置：在 `services/runtimeConfig.ts` 增加 `getCoherenceStrength()`；在 `Settings.tsx` 增加 UI 并写入 `settings.COHERENCE_STRENGTH`。
- 在 `generateStoryboardAndImages` 首轮循环中根据该值决定是否传 `previousImageUrl`。

### 4) 模型与端点健壮性
- 保持现在的 Base URL 校验与错误解析（已完成）。
- 若 `MODEL_IMAGE` 未设置或非图片模型，自动回退 `gemini-2.5-flash-image`（已加入正则校验逻辑，继续保留）。

### 5) 解析与提示迭代（可选）
- 若仍不满足，可在 `utils/parser.ts` 追加更多字段组合（镜头、景别、构图、材质、运动），生成 `description` 更丰富。但优先执行 1) 与 2)。

## 涉及文件与改动点
- `services/providers/geminiProvider.ts`
  - 首次出图使用 `fullPrompt`：行 `136`。
  - 在 `generateImageForScene` 包装提示前缀：函数体内处理。
- `services/runtimeConfig.ts`
  - 新增 `getCoherenceStrength()`，读取 `settings.COHERENCE_STRENGTH`，默认 `strong`。
- `components/Settings.tsx`
  - 新增“风格连贯强度”下拉框，保存到 `localStorage`。

## 验证步骤
- 设置页：`Gemini Base URL = https://generativelanguage.googleapis.com`；`MODEL_IMAGE = gemini-2.5-flash-image`；连贯强度设置为 `weak` 进行对比测试。
- 生成故事板并观察：
  - 首次图片应更贴合分镜文本；
  - 切换强度到 `strong` 时风格更连续但对提示遵从度略降；
  - 将同一场景用“重新生成”对比，结果与首次更一致。

请确认是否按上述方案实施。我将据此更新相关文件并完成验证。
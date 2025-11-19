## 问题与原因
- 报错：在 Ark 模式下，`fetchImageAsBase64` 访问 TOS 资源（`ark-content-generation-v2...tos...`）发生 `net::ERR_FAILED` 与 `TypeError: Failed to fetch`。
- 原因：`generateImageForScene` 请求 Ark `/images/generations` 使用 `response_format: 'url'`，返回的是跨域的外链；浏览器直接抓取受 CORS/网络限制，导致失败。

## 解决方案
### 1) 改为请求 Base64 返回
- 在 `services/providers/arkProvider.ts` 的 `generateImageForScene` 将 `response_format: 'url'` 改为 `response_format: 'b64_json'`。
- 解析优先使用 `b64_json` 转为 `data:image/png;base64,...`，避免浏览器跨域抓取。
- 保留对 `url` 的兜底（仅在确实无 `b64_json` 时返回 URL，不再主动抓取）。

### 2) 强化错误提示
- 在 `fetchImageAsBase64` 的调用处只在必要路径使用；当返回 URL 但抓取失败时，抛出明确提示（跨域受限），建议用户在设置中选择能返回 Base64 的模型或让后端代理。

### 3) 可选完善（若你同意）
- 将 Ark 首次出图与 Gemini 一致，使用 `fullPrompt` 提示以提升遵从度。
- 在设置页添加“Ark 图像健康检查”按钮，用当前模型发起一次 `b64_json` 生成，并反馈连通性与错误原因。

## 修改范围
- `services/providers/arkProvider.ts`：仅变更 `generateImageForScene` 的 `response_format` 与返回解析逻辑；（可选）把首次生成改用 `fullPrompt`。

## 验证
- 切换到 Ark 模式，选择 `doubao-seedream-4-0-250828` 作为图像模型，生成多场景分镜，观察图片均以 Base64 方式返回，不再触发跨域抓取失败。

确认后我将执行上述修改并回归测试。
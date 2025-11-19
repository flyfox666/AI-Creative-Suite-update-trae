## 问题定位
- 当前 Image Studio 期望所有生成/编辑/合并结果为 `data:image/...;base64,...` 形式（见 components/ImageStudio.tsx:203–210），否则抛出错误 “Generated image data is invalid”。
- Ark Provider 经过近期对齐后，图片接口统一使用 `response_format: 'url'` 并返回 `first.url`（见 services/providers/arkProvider.ts:163–169、175–185）。这与 Image Studio 的期望不一致，导致编辑/生成结果是 HTTP URL 而不是 Data URL，从而出现该错误。
- 合并图片时，Provider 在拿到 URL 的分支返回 `{ base64: '', mimeType: 'image/url' }`（services/providers/arkProvider.ts:157–160），UI会拼接成 `data:image/url;base64,`，同样无效。

## 方案 A（推荐）：在 Provider 层统一返回 Base64
- 目标：保持现有 UI 不变，兼容现有 `data:` 解析逻辑。
- 修改点：
  - services/providers/arkProvider.ts
    1. generateImageForScene / generateImage / editImage：
       - 若 Ark 返回 `first.url`，在 Provider 内部抓取该 URL（fetch -> blob -> base64），并返回 Data URL 字符串（如 `data:image/png;base64,...`）。
    2. combineImages：
       - 若返回 URL 分支，抓取并返回 `{ base64, mimeType }`，保证 `base64` 非空，`mimeType` 为真实类型（如 `image/png`）。
- 优点：
  - 对前端改动最小；所有流程保持与旧约定一致；立即修复错误。
- 注意：
  - 带来一次额外的抓取，但只在 Ark 返回 URL 时触发。

## 方案 B：在 UI 层兼容 URL + 懒转换
- 修改点：
  - components/ImageStudio.tsx
    1. 处理返回值：
       - 若是 `data:`，沿用现有解析；若为 `http(s)://`，直接展示，不抛错。
    2. “再次编辑”按钮逻辑：
       - 若图片缺少 `base64`，在点击时抓取 `url` 并转换为 `base64` 后再入栈，保证 Ark 编辑接口收到 Data URL。
    3. 下载逻辑：
       - 若为 URL，支持直接下载或抓取为 Blob 再下载。
  - combine 分支：
    - 必须能拿到实际 URL；当前 Provider 未返回 URL 字段，需同步修改 Provider 返回结构或在 Provider 端统一转换。
- 优缺点：
  - 优点：减少 Provider 重抓取次数（只在用户需要二次编辑/下载时转换）。
  - 缺点：对 UI 改动较多；combine 仍需 Provider 返回 URL 或统一转换，否则无法修复。

## 执行计划（采用方案 A）
1. 更新 Ark Provider：
   - 在 `generateImageForScene`、`generateImage`、`editImage`、`combineImages` 中，当 Ark 返回 URL 时，抓取并转换为 Base64；统一输出 Data URL 或 `{ base64, mimeType }` 格式。
2. 保持 Image Studio 解析逻辑不变，避免大改。
3. 构建并验证：
   - 运行构建与一次实际生成/编辑/合并操作，确认不再出现 “Generated image data is invalid”。
4. 可选优化：
   - 若担心二次抓取的性能，可在后续迭代改为 UI 懒转换（方案 B）。

## 交付验证
- 生成（无上传图片）：返回 Data URL，成功展示。
- 编辑（一张图片）：返回 Data URL，成功展示且“再次编辑”使用已有 Base64。
- 合并（多张图片）：返回 `{ base64, mimeType }` 有效值，成功展示。
- 下载功能正常，文件扩展名正确。
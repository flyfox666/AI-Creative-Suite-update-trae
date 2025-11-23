## 问题根因
- 在 `services/providers/geminiProvider.ts` 的原生 Gemini 请求函数 `geminiFetch` 中，错误地使用了 `getOpenAICompatApiKey()` 作为鉴权来源；当用户未填写第三方兼容密钥时，这里会判定为空并抛出 `Gemini API key is not configured`。
- 在 `geminiOpenAIChat` 中，兼容模式下仍使用了 Gemini Key 作为 `Authorization: Bearer`，导致第三方端点 401；应在兼容模式下改用 `OPENAI_COMPAT_API_KEY`。

## 代码修复方案
1) 修正原生请求鉴权：
- `geminiFetch`：改为读取 `getGeminiConfig().apiKey`；为空时再抛错。
- 保持 `coreBase` 使用 Google 原生 Base，兼容模式只用于聊天/图片兼容分支，不影响原生。

2) 修正聊天端兼容鉴权：
- `geminiOpenAIChat`：
  - 兼容模式：`url` 使用 `/api/openai/chat/completions`，`Authorization: Bearer` 使用 `getOpenAICompatApiKey()`。
  - 原生模式：`url` 使用 `.../v1beta/openai/chat/completions`，鉴权使用 Gemini Key（`x-goog-api-key` 或保持现有方式）。

3) 保持图片分支逻辑：
- 兼容分支 `openAIImageGenerate` 已使用第三方密钥；原生分支走 `geminiFetch` 并用 Gemini Key，不变。

4) 设置与保存
- 确认设置页保存会将：
  - `settings.GEMINI_API_KEY`、`settings.GEMINI_BASE_URL`
  - 可选 `settings.OPENAI_COMPAT_API_KEY`
  - `settings.GEMINI_OPENAI_COMPAT`
  写入 localStorage。

## 验证步骤
- 本地 `npm run preview`：
  - 关闭兼容模式，仅填写并保存 `Gemini API Key` → 执行“Gemini 原生图像健康检查”应成功；生成图片与视频上传正常。
  - 开启兼容模式，填写第三方密钥与 Gemini Key → 执行“OpenAI 兼容图像健康检查”成功；聊天与图片兼容端点 200。
- 部署 Vercel 后重复以上验证，页面不再出现 `Gemini API key is not configured`。
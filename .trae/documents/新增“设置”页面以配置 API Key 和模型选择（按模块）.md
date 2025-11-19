## 目标
- 在主页新增“设置”页面，允许用户：
  - 输入并保存 API Key：Gemini、Ark（含 Base URL）、可选 TTS（AppId/Token/Cluster）
  - 为各模块选择模型：
    - 文本/分镜生成（Chat）
    - 图片生成/编辑/融合（Image）
    - 视觉理解（Vision）
    - 语音合成（默认 Voice）
  - 选择当前 Provider（`gemini`/`ark`）
- 设置持久化到 `localStorage`，运行时生效，无需重启。

## 技术方案
- 新增 `services/runtimeConfig.ts`：提供读取/写入配置的统一接口（从 `localStorage` 读取，缺省回退 `process.env`）。
- Provider 动态化：
  - 更新 `services/providers/arkProvider.ts` 与 `services/providers/geminiProvider.ts`，在每次调用时通过 `runtimeConfig` 读取 API Key、Base URL 与模型 ID。
  - 更新 `services/aiService.ts`：根据 `runtimeConfig.getProvider()` 动态路由到对应 Provider。
- UI 设置页：
  - 新增 `components/Settings.tsx`，表单包含 Provider 选择、API Key/URL、各模块模型 ID、TTS 参数；保存到 `localStorage`。
  - 在 `App.tsx` 增加“设置”Tab并渲染该组件。
- 国际化：在 `locales/en.json`、`locales/zh.json` 增加 `settings` 文案块。

## 涉及文件
- 新增：`services/runtimeConfig.ts`、`components/Settings.tsx`
- 修改：`services/providers/arkProvider.ts`、`services/providers/geminiProvider.ts`、`services/aiService.ts`、`App.tsx`、`locales/en.json`、`locales/zh.json`

## 字段约定（localStorage 键）
- `settings.AI_PROVIDER`：`gemini` | `ark`
- `settings.GEMINI_API_KEY`
- `settings.ARK_API_KEY`、`settings.ARK_BASE_URL`
- `settings.MODEL_CHAT`、`settings.MODEL_IMAGE`、`settings.MODEL_VISION`
- `settings.TTS_APP_ID`、`settings.TTS_TOKEN`、`settings.TTS_CLUSTER`、`settings.TTS_DEFAULT_VOICE`

## 验证
- 在设置页输入 Keys 与模型 ID，执行各模块功能并观察是否按所选 Provider/模型调用。
- 刷新页面后配置保持；切换 Provider 无需重启。

## 风险与注意
- 浏览器侧保存 API Key 存在暴露风险，建议后续升级为后端代理。
- 未填写 Key/模型时从环境变量回退；若仍为空则在 UI 给予明确错误提示。
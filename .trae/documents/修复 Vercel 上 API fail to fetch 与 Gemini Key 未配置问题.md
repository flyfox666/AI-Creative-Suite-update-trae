## 目标
- 解决线上 Vercel 页面填写 API 后出现“fail to fetch”
- 解决设置页执行“Gemini 图片生成连通性检查”出现“Gemini API key is not configured”

## 核心检查
1) 同源调用
- 线上调用统一改用同源路径：`/api/openai/chat/completions` 与 `/api/openai/images/generations`
- 确认 `vercel.json` 已包含重写：`/api/openai/(.*) → https://vibecodingapi.ai/v1/$1`

2) 双密钥填写
- 兼容模式勾选时在设置页同时填写：
  - 第三方 API Key（OpenAI-compatible）→ 用于 `/api/openai/*`
  - Gemini API Key → 用于 Files API（Google 原生）
- Base URL 保持 `https://generativelanguage.googleapis.com`

3) 保存与注入
- 在设置页点击“保存”，确保 localStorage 保存：`settings.OPENAI_COMPAT_API_KEY` 与 `settings.GEMINI_API_KEY`
- 如果希望在后端也可用，Vercel 环境变量同样配置 `OPENAI_COMPAT_API_KEY` 与（可选）`GEMINI_API_KEY`

4) 验证流程
- 在设置页勾选兼容模式并填好两类密钥，保存
- 执行“Gemini 文件上传健康检查”（应 200 或给出有效状态）
- 执行图片生成（兼容模式下走 `/api/openai/images/generations`，返回 URL 或 base64）
- 若直链图片跨域不可显示，勾选“代理抓取图片为 Base64”，再试

## 若仍失败
- 打开浏览器 Network，确认请求命中同源 `/api/openai/*`，不是直接第三方域
- 检查响应码与返回体是否有鉴权或域名错误
- 如需要，我将添加设置页“密钥状态”只读标记（已配置/未配置），帮助快速定位配置问题
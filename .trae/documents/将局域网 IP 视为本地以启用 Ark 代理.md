## 修改目标
- 当你在 `http://192.168.*.*`、`http://10.*.*.*` 或 `http://172.16-31.*.*` 访问开发页面时，自动将 Ark Base URL 视为本地代理 `'/arkapi/api/v3'`，避免 CORS。

## 变更点
- 更新 `services/runtimeConfig.ts` 中 `getArkConfig()` 的本地判定：
  - 现状仅识别 `localhost/127.0.0.1`；
  - 新增识别常见局域网 IP 段：`10.x.x.x`、`192.168.x.x`、`172.16-31.x.x`。
- 逻辑：命中上述范围则 `baseUrl='/arkapi/api/v3'`，否则使用设置/环境中的 Ark 生产域。

## 验证
- 在 `http://192.168.*.*:3000/` 访问并保存设置后，故事板生成器请求路径应为 `/arkapi/api/v3/...`，由 Vite 代理转发，消除 CORS；媒体分析器保持可用。

我将直接更新该判定逻辑。
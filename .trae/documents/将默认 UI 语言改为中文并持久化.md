## 原因说明
- 当前默认语言在 `contexts/LocalizationContext.tsx` 初始化为 `'en'`，因此首页首次加载显示英文。

## 修改要点
1) 初始化语言改为中文优先：
- 在 `LocalizationContext` 中将 `const [locale, setLocale] = useState<Locale>('en')` 改为使用 `getInitialLocale()`：
  - 读取 `localStorage('ui.locale')`；如有值直接用
  - 无值时检查 `navigator.language` 是否以 `zh` 开头；是则 `'zh'`
  - 以上都无则默认 `'zh'`
2) 切换语言持久化：
- 在调用 `setLocale` 的地方（`LocalizationContext` 或 `LanguageSwitcher`）同时写入 `localStorage('ui.locale', value)`，刷新后仍保留用户选择。
3) 资源加载保持不变：
- 继续使用 `BASE_URL + 'locales/en.json'` 与 `zh.json` 加载；无需改动。

## 验证
- 清空浏览器 `localStorage('ui.locale')` 后打开首页，界面显示中文。
- 切换到英文后刷新，仍显示英文（持久化生效）。

## 兼容注意
- 仅更改 UI 语言默认值，不更改“AI 回复语言”（仍保持 `settings.REPLY_LANGUAGE` 的现有逻辑）。
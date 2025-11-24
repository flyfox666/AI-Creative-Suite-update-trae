## 方案概述
- 将 UI 的默认语言从英文改为中文；优先读取本地存储已选择语言，其次回退为中文；可选：依据浏览器语言进行一次性初始化。

## 具体改动
1) LocalizationContext
- 初始化：`const [locale, setLocale] = useState<Locale>(initialLocale)`，其中 `initialLocale` 来源：
  - 读取 `localStorage.getItem('ui.locale')` → `'zh' | 'en'`
  - 若无，则检测 `navigator.language`（`zh` 前缀则设 `zh`，否则设 `zh`）
  - 最终默认回退为 `'zh'`
- 在 `setLocale` 处增加持久化：每次切换时 `localStorage.setItem('ui.locale', value)`。
- 保持翻译文件加载逻辑不变（已改为 BASE_URL 前缀）。

2) LanguageSwitcher（无需改动）
- 保持现有切换行为；初始化时会显示中文。

## 非功能性建议（可选）
- Settings 中的“AI 回复语言”默认值维持 `auto`，不随 UI 语言自动变更，避免影响模型输出；如需联动，可另行设为 `zh`。

## 验证
- 本地 `npm run preview` 启动后，不做任何操作，界面文本应显示为中文。
- 切换语言后刷新页面，仍保持用户选择（持久化生效）。
- 首次访问时（无本地存储），若浏览器为中文环境或无匹配语言，也显示中文。

## 回滚
- 若需要恢复英文默认，只需将 `initialLocale` 的回退改为 `'en'` 并保留本地存储优先读取。
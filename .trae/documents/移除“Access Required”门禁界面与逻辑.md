## 变更目标
- 彻底取消“Access Required/需要访问权限”界面与相关访问码校验逻辑，应用打开即进入主界面。

## 涉及文件
- `components/AccessGate.tsx`（整组件：门禁界面与访问码校验）
- `App.tsx`（门禁显示与 localStorage 访问标记逻辑）
- `locales/en.json`、`locales/zh.json`（可选：去除 `accessGate` 文案条目）

## 实施步骤
1. 移除 `App.tsx` 中的门禁逻辑：
   - 删除 `import AccessGate`（当前在 `App.tsx:14`）。
   - 删除 `AUTH_KEY`、`isAuthenticated` 状态与 `useEffect` 读取 localStorage 的逻辑（`App.tsx:114-139`）。
   - 将 `return` 处的条件渲染 `{isAuthenticated ? <AppContent /> : <AccessGate .../>}` 改为始终渲染 `<AppContent />`（`App.tsx:141-147`）。
2. 删除门禁组件：
   - 移除 `components/AccessGate.tsx` 文件及其所有引用（`t('accessGate.*')` 仅在该组件使用）。
3. 文案清理（可选）：
   - 从 `locales/en.json` 与 `locales/zh.json` 中移除 `accessGate` 区块，避免悬空文案。
4. 回归验证：
   - 构建并启动应用，确认首页直接进入主界面；各功能（Storyboard/Image/Analyzer/Audio/Pricing）正常。
   - 确认无 `localStorage` 相关访问控制残留，刷新后仍直接进入主界面。

## 影响范围与风险
- 仅移除门禁入口，不影响 PRO 付费与权限弹窗（`ProAccessModal`）或用户上下文；如需进一步取消 PRO 弹窗，可在后续单独处理。
- 删除 `accessGate` 文案不会影响其他国际化条目。

## 交付结果
- `App.tsx` 清理并始终渲染主界面。
- 删除 `components/AccessGate.tsx`（以及可选的 `accessGate` 文案）。
- 验证通过的可运行版本。
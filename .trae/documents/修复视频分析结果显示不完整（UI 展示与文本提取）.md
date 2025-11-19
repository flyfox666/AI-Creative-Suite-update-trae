## 问题判断
- 结果显示不全主要来自前端组件限制高度：`components/CodeBlock.tsx:11` 设置了 `max-h-96`（24rem），超过部分需要滚动，视觉上像“没显示”。
- 次要可能：`extractText` 仅取 `candidates[0]`，若多候选或分段内容在其他 `candidates` 中，会遗漏。

## 修改方案
### 1) 优化结果展示
- 更新 `CodeBlock`：移除固定高度或增加“展开/收起”开关。
  - 默认展示 24rem 高度（保留滚动），右上角提供“展开全部”按钮，展开后去掉高度限制，完整显示。
  - 增加“复制全文”与“下载为 .txt”按钮，便于保存长脚本。
- 在 `MediaAnalyzer.tsx` 的分析结果区保留现有布局，只增强 CodeBlock 能力，无需改样式。

### 2) 强化文本提取（可选）
- 在 `extractText` 中汇总所有 `candidates` 的 `content.parts.text`，而不是只取第一个。
- 在视频分析路径执行该提取，确保长文本完整拼接。

## 验证
- 重新分析同一视频：
  - 默认可滚动查看；点击“展开全部”后完整显示。
  - “复制全文/下载为 .txt”工作正常。
- 如仍不足，开启日志代理观察返回体长度，确认服务端文本是否完整。

## 交付范围
- `components/CodeBlock.tsx`：增加展开/复制/下载逻辑与按钮。
- `services/providers/geminiProvider.ts`：增强 `extractText` 汇总所有 `candidates`（仅限视频分析路径可优先启用）。

请确认后我将进行上述修改并回归验证。
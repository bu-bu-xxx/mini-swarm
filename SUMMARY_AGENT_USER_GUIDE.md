# Summary Agent — 用户新增功能文档

## 文档信息

| 项 | 内容 |
|----|------|
| **版本** | v1.0 |
| **创建日期** | 2026-02-20 |
| **功能名称** | Summary Agent（实时摘要助手） |
| **适用版本** | MiniSwarm Designer v1.x+ |

---

## 1. 功能概述

### 什么是 Summary Agent？

Summary Agent 是 MiniSwarm Designer 的一项新功能。当您运行 Swarm Pipeline 时，Summary Agent 会**实时**生成简洁的中文摘要，帮助您快速了解每个 Agent 正在做什么、产出了哪些文件或网页。

```
传统体验:
  Pipeline 运行 → 打开 LogViewer 看密密麻麻的日志 → 看完才知道发生了什么

新体验:
  Pipeline 运行 → Summary 窗口实时显示:
    "研究员: 收集了3个市场数据来源，生成了分析报告 📄 report.md"
    "编码员: 基于分析报告生成了交互式图表 🌐 Dashboard"
    "审核员: 审核通过，建议优化数据可视化配色"
```

### 核心价值

| 特性 | 说明 |
|------|------|
| **实时概括** | 每个 Agent 完成后立即生成摘要，无需等待 Pipeline 结束 |
| **超链接直达** | 文件和网页产出直接显示为可点击链接 |
| **内容连贯** | 后续摘要自动参考前文，像一份流畅的执行报告 |
| **自定义提示词** | 可修改 Summary Agent 的行为和输出风格 |
| **自动保存** | Pipeline 结束后摘要自动存档，随时查阅 |

---

## 2. 界面位置

Summary Agent 的界面位于工作区**右侧面板**中，具体位置在 `Agent Outputs` 和 `Generated Pages` 之间：

```
┌────────────────────────────────────────────────────────────┐
│  🐝 MiniSwarm Designer                          ⚙ Settings │
├────────────┬───────────────────────────┬───────────────────┤
│            │                           │  Execution         │
│  TASK      │                           │  ● Running         │
│  输入框    │                           │  [▶ Start]         │
│            │                           ├───────────────────┤
│  FileMan.  │     Pipeline Graph        │  Logs (折叠显示)   │
│            │      (中央画布)            ├───────────────────┤
│            │                           │  Agent Outputs     │
│  Todo List │                           ├───────────────────┤
│            │                           │  ★ Summary  📝     │  ← 新增
│            │                           │  Agent1: 摘要...   │
│            │                           │  Agent2: 摘要... 📄│
│            │                           ├───────────────────┤
│            │                           │  🌐 Generated Pages│
└────────────┴───────────────────────────┴───────────────────┘
```

---

## 3. 使用方法

### 3.1 自动工作 — 无需额外操作

Summary Agent 在 Pipeline 运行时**自动启动**，无需任何配置：

1. 正常设计 Swarm（使用 TASK 或手动创建 Agent）
2. 点击 **▶ Start** 运行 Pipeline
3. 观察右侧面板的 **📋 Summary** 窗口
4. 每个 Agent 完成后，窗口会实时添加该 Agent 的摘要

### 3.2 点击超链接

当 Agent 在执行过程中创建了文件或生成了网页时，摘要中会出现对应的超链接：

| 链接类型 | 图标 | 点击行为 |
|---------|------|---------|
| **文件链接** | 📄 | 弹出文件内容预览窗口（与 FileManager 中点击文件效果一致） |
| **网页链接** | 🌐 | 在新标签页中打开生成的网页预览 |

**示例**：

```
研究员: 分析了3个竞品数据，整理为综合报告 📄 analysis.md
编码员: 基于分析数据生成了交互式仪表盘 🌐 Dashboard 📄 styles.css
```

- 点击 `📄 analysis.md` → 弹出窗口显示文件内容
- 点击 `🌐 Dashboard` → 新标签页打开仪表盘预览
- 点击 `📄 styles.css` → 弹出窗口显示 CSS 文件内容

### 3.3 自定义提示词

如果您想修改 Summary Agent 的摘要风格（例如改为英文、更简洁或更详细），可以编辑其系统提示词：

1. 在 Summary 窗口标题栏找到 **📝 Prompt** 按钮
2. 点击打开提示词编辑弹窗
3. 修改提示词内容
4. 点击 **Save** 保存
5. 下次运行 Pipeline 时生效

**可选操作**：
- 点击 **Reset** 恢复为默认提示词
- 点击 **✕** 取消编辑

### 3.4 查看保存的摘要

Pipeline 完成后，完整的 Summary 报告会自动保存到 **Saved Outputs** 中：

1. 在左侧面板打开 **FileManager**
2. 展开 **📋 Saved Outputs** 区域
3. 找到 **SummaryAgent.md** 文件
4. 点击即可预览完整的摘要报告

---

## 4. 行为说明

### 4.1 摘要生成顺序

Summary Agent 采用**严格单线程**模式工作：

- 即使多个 Agent 同时完成（并行执行的 Agent），摘要也会按照完成的先后顺序**逐个**生成
- 正在生成摘要时，后续任务会排队等待
- 这确保了摘要内容的连贯性和上下文完整性

```
时间线示例:

t=0s  Agent A 开始 ─────────── t=5s Agent A 完成 → Summary 开始总结 A
t=0s  Agent B 开始 ──── t=3s Agent B 完成 → 排队等待
t=0s  Agent C 开始 ─── t=2s Agent C 完成 → 排队等待

Summary 执行顺序:
[总结 A] ──→ [总结 B] ──→ [总结 C]
  t=5s        t=7s        t=9s
（注意：B 和 C 虽然更早完成，但必须等 A 的总结完成后才能开始）
```

### 4.2 使用的模型

Summary Agent 使用与 Pipeline 相同的 LLM 模型，无需单独配置。

### 4.3 Token 消耗

Summary Agent 每次调用约消耗：
- **输入**: 约 500-3500 tokens（历史摘要 + Agent 输出截断至 3000 字符）
- **输出**: 约 50-100 tokens（摘要文本）
- **总额外消耗**: 约 N × 600-3600 tokens（N = Pipeline 中的 Agent 数量）

### 4.4 清空与重置

| 操作 | 行为 |
|------|------|
| 重新运行 Pipeline | 自动清空之前的摘要 |
| 停止 Pipeline | 已生成的摘要保留，待处理的任务取消 |
| 刷新页面 | 内存中的摘要清空（已保存的 outputs 保留） |

---

## 5. 常见问题

### Q: Summary 窗口没有显示内容？

**可能原因**：
- Pipeline 尚未运行或尚未有 Agent 完成
- Summary LLM 调用失败（不影响 Pipeline 执行，仅摘要缺失）
- 右侧面板被折叠（点击 ◀ 展开）

### Q: 超链接点击后没有反应？

**可能原因**：
- 文件可能已被其他操作删除
- 网页预览的 Blob URL 可能已过期（刷新 Pipeline 可重新生成）

### Q: 可以关闭 Summary Agent 吗？

当前版本中 Summary Agent 随 Pipeline 自动运行。如果您不需要，可以忽略 Summary 窗口，摘要生成不会阻塞 Pipeline 执行。

### Q: 摘要语言可以修改吗？

可以。通过 **📝 Prompt** 按钮编辑系统提示词，例如修改为：

```
You are an execution summary assistant. Summarize each agent's work in 1-2 concise English sentences...
```

保存后下次运行即生效。

---

## 6. 默认提示词参考

以下是 Summary Agent 的默认系统提示词，供自定义参考：

```
你是一个执行摘要助手。你的任务是用简洁的文字概括 AI Agent 的工作内容和产出。

规则：
1. 每个摘要限制在 1-3 句话以内，保持极度简洁
2. 如果 agent 使用了 file_write 工具创建了文件，用 [FILE:文件路径] 标记
3. 如果 agent 使用了 webpage_build_preview_tool 生成了网页，用 [PAGE:页面标题] 标记
4. 基于已有的总结历史保持连贯性，避免重复内容
5. 用中文回答
```

**标记说明**：
- `[FILE:report.md]` → 系统自动渲染为可点击的文件链接
- `[PAGE:Dashboard]` → 系统自动渲染为可点击的网页链接

# Orion Agent Studio — 前端产品规格文档 (PRD)

**版本**: v0.1.0  
**状态**: 草稿  
**日期**: 2025-07  
**作者**: 产品通（基于代码分析）  
**产品**: Orion Agent Studio（Electron 桌面端 + React Web SPA）

---

## 一、产品概述

Orion Agent Studio 是 **Orion Agent Runtime（后端）**的官方控制端，帮助用户以可视化方式创建、监控、审批和回溯 AI Agent 任务的执行过程。

**产品形态**：
- **桌面端**：Electron + React + TypeScript + Tailwind CSS，打包为 Windows/macOS/Linux 桌面应用
- **Web 端**：同一套 React SPA，编译为静态文件，可在浏览器中运行
- **通信协议**：通过 WebSocket JSON-RPC（端口 `:9877`）连接本地 Orion Runtime Daemon

**目标用户**：
- 开发者 / AI 产品经理，需要在本地运行和调试 AI Agent
- 需要可视化管理多个 Agent、监控任务执行状态的用户

---

## 二、问题陈述

**用户问题**：Orion Agent Runtime 是一个纯 CLI / Python 库，用户无法通过可视化界面：
1. 直观地查看 Agent 状态和任务执行进度
2. 管理多个 Agent 配置（能力、LLM 提供者、系统提示词）
3. 对高风险操作进行审批（点击而非 CLI 输入）
4. 回溯历史任务的执行过程

**影响**：纯 CLI 交互门槛高，调试体验差，难以被非 Python 开发者采用。

**不解决问题的代价**：Runtime 的强大能力（Browser Use、多 Agent 调度、Human-in-the-loop）无法被充分利用，产品受众受限。

---

## 三、目标

| # | 目标 | 衡量方式 |
|---|------|----------|
| G1 | 用户可通过可视化界面完成 90% 的 Runtime 操作，无需 CLI | 功能覆盖率（前端支持的后端 RPC 方法数 / 后端总 RPC 方法数）|
| G2 | 任务执行过程实时可见，用户能在 3 秒内判断任务状态 | 页面响应延迟 < 3s（WebSocket 推送 → UI 更新）|
| G3 | Agent 配置管理零代码化，用户无需编辑 JSON 或 Python 文件即可完成配置 | 配置成功率（通过 UI 完成配置的用户比例）|
| G4 | 高风险操作审批体验流畅，用户能在 10 秒内完成审批决策 | 审批平均响应时间 |

---

## 四、非目标（Non-Goals）

| # | 非目标 | 原因 |
|---|--------|------|
| NG1 | 不支持移动端 | 桌面/Web 已覆盖目标用户场景，移动端交互复杂且优先级低 |
| NG2 | 不内置 LLM 推理能力 | LLM 调用由后端 Runtime 负责，前端只做展示和指令下发 |
| NG3 | 不支持多用户/多租户 | 当前定位为本地个人工具，云端协作是后续独立产品方向 |
| NG4 | 不提供 Agent 编排的可视化流程图编辑器 | v1 通过表单配置已足够，流程图编辑器复杂度过高 |

---

## 五、用户故事

### 5.1 Agent 管理

- **作为用户**，我希望查看所有已配置的 Agent 及其状态，以便快速了解哪些 Agent 可用
- **作为用户**，我希望创建新 Agent 并配置其名称、角色、能力、系统提示词和 LLM 提供者，以便快速启动新任务
- **作为用户**，我希望编辑已有 Agent 的配置（如切换 LLM 提供者），以便适应不同任务需求
- **作为用户**，我希望删除不需要的 Agent，以便保持工作区整洁

### 5.2 任务执行与监控

- **作为用户**，我希望在 Agent 工作区中输入目标（goal）并启动任务，以便让 Agent 自主完成任务
- **作为用户**，我希望实时看到任务执行进度（thinking → working → done/failed），以便判断是否需要干预
- **作为用户**，我希望看到 Agent 的思考过程（thought cards），以便理解 Agent 的决策逻辑
- **作为用户**，我希望暂停/恢复/取消正在运行的任务，以便在需要时介入控制

### 5.3 审批管理

- **作为用户**，我希望在高风险操作（如文件删除、命令执行）发生时收到审批弹窗，以便做出安全决策
- **作为用户**，我希望看到审批请求的详细信息（工具名称、参数、风险等级），以便做出知情决策
- **作为用户**，我希望审批超时时有明确提示，以便避免任务无限等待

### 5.4 LLM 提供者管理

- **作为用户**，我希望配置多个 LLM 提供者（如 OpenAI、LM Studio 本地模型），以便在 Agent 之间灵活切换
- **作为用户**，我希望测试 LLM 提供者的连接状态，以便在配置前验证可用性
- **作为用户**，我希望设置一个默认 LLM 提供者，以便新 Agent 自动使用

### 5.5 历史与审计

- **作为用户**，我希望查看已完成/失败的任务历史，以便回顾任务结果
- **作为用户**，我希望查看任务的详细执行时间线（每一步的工具调用和结果），以便调试 Agent 行为
- **作为用户**，我希望查看审计日志（所有关键事件的结构化记录），以便进行安全审计

### 5.6 连接管理

- **作为用户**，我希望配置 Runtime Daemon 的连接地址和端口，以便在非标准部署环境下使用
- **作为用户**，我希望看到 Daemon 的连接状态（在线/离线/连接中），以便判断前端是否正常通信

---

## 六、功能需求

### 6.1 页面结构

| 路径 | 页面 | 描述 | 平台 |
|------|------|------|--------|
| `/` | DashboardPage | Agent 团队列表，支持搜索/状态过滤 | 共用 |
| `/agent/:agentId` | AgentWorkspacePage | Agent 工作区（聊天、任务、记忆等 Tab） | 共用 |
| `/audit` | AuditPage | 审计日志查看器 | 共用 |
| `/providers` | ProvidersPage | LLM 提供者管理 | 共用 |
| `/settings` | SettingsPage | 连接设置 + 关于信息 | 共用 |
| `/login` | LoginPage | 认证 + Daemon 连接（仅 Web） | Web 仅 |

### 6.2 Agent 管理（DashboardPage）

**P0（必须）**：
- [ ] Agent 卡片列表展示：名称、角色、状态徽章、指标（任务数、成功率）
- [ ] 按状态过滤（全部/工作中/思考中/等待中/空闲/待审批/错误）
- [ ] 关键词搜索（名称、角色、性格特质）
- [ ] 新建 Agent 表单：名称、角色、性格特质、能力选择、系统提示词、技能选择、LLM 提供者
- [ ] 编辑 Agent 表单（同新建，预填充当前配置）
- [ ] 删除 Agent（带确认）

**P1（重要）**：
- [ ] Agent 指标展示：任务数、成功率、成本、节省时间、记忆条数
- [ ] 能力标签可视化展示（AgentCapabilityTags 组件）

**P2（后续）**：
- [ ] Agent 导入/导出（JSON 格式）
- [ ] Agent 模板库

### 6.3 Agent 工作区（AgentWorkspacePage）

**P0（必须）**：
- [ ] 聊天式交互：用户输入 goal → 创建任务 → 实时显示执行消息
- [ ] 消息类型展示：message（普通消息）、thought（思考过程）、tool_call（工具调用）、approval（审批请求）、error（错误）、final_result（最终结果）
- [ ] 思考卡片（ThoughtCard）：展示 observe → plan → act → verify → reflect 全链路
- [ ] 审批弹窗（ApprovalDialog）：显示工具名称、参数、风险等级、原因；支持批准/拒绝
- [ ] 人工提问弹窗（HumanConfirmDialog）：Agent 需要人工输入时弹出
- [ ] 任务控制：暂停/恢复/取消
- [ ] 多 Tab 切换：chat（聊天）、tasks（任务列表）、memory（记忆）、browser（浏览器视图）、desktop（桌面视图）、knowledge（知识库）、analytics（分析）、settings（设置）

**P1（重要）**：
- [ ] 会话管理：新建会话、会话历史切换
- [ ] 聊天历史持久化（localStorage）
- [ ] 代码差异视图（CodeDiffView）：展示代码修改前后的 diff

### 6.4 LLM 提供者管理（ProvidersPage）

**P0（必须）**：
- [ ] 提供者列表展示：名称、Base URL、Model、是否默认
- [ ] 新建提供者表单：名称、Base URL、API Key、Model、是否默认
- [ ] 编辑/删除提供者
- [ ] 测试连接功能：点击后调用 `provider.test_direct` RPC，显示结果和延迟

**P1（重要）**：
- [ ] 提供者列表与 Daemon 同步（通过 `provider.sync` RPC）

### 6.5 审计日志（AuditPage）

**P0（必须）**：
- [ ] 审计事件列表展示：时间戳、事件类型、数据
- [ ] 按事件类型过滤
- [ ] 按时间范围过滤

**P1（重要）**：
- [ ] 审计日志导出（JSONL/CSV）
- [ ] 事件详情展开查看

### 6.6 连接管理（SettingsPage）

**P0（必须）**：
- [ ] 连接状态展示：在线/离线/连接中（带颜色徽章和 dot 动画）
- [ ] 主机地址和端口配置
- [ ] 重新连接按钮（带 loading 状态）
- [ ] Daemon 信息展示（版本、运行任务数等）

### 6.7 通用需求

**P0（必须）**：
- [ ] 深色/浅色主题切换（ThemeProvider + ThemeToggle）
- [ ] 自动重连机制（指数退避，最多 10 秒间隔）
- [ ] 连接状态全局同步（RPC 状态变化时所有页面感知）
- [ ] 错误边界（ErrorBoundary 组件，防止整个应用崩溃）

**P1（重要）**：
- [ ] Electron IPC 支持（桌面端使用本地文件存储，替代 localStorage）
- [ ] Web 端 `/login` 页面（认证 + Daemon 连接）

---

## 七、RPC API 清单

前端通过 `RpcClient`（WebSocket JSON-RPC）调用后端，当前已实现的方法：

| RPC 方法 | 说明 | 调用页面 |
|-----------|------|----------|
| `task.create` | 创建新任务 | AgentWorkspacePage |
| `task.list` | 列出任务（可按状态过滤） | DashboardPage |
| `task.status` | 获取单个任务状态 | AgentWorkspacePage |
| `task.cancel` | 取消任务 | AgentWorkspacePage |
| `task.pause` | 暂停任务 | AgentWorkspacePage |
| `task.resume` | 恢复任务 | AgentWorkspacePage |
| `task.logs` | 获取任务审计日志 | AuditPage |
| `task.replay` | 回放任务事件 | TaskDetailPage |
| `world.snapshot` | 获取世界状态快照 | AgentWorkspacePage |
| `daemon.status` | 获取 Daemon 状态信息 | SettingsPage |
| `approval.respond` | 响应审批请求（批准/拒绝） | AgentWorkspacePage |
| `provider.list` | 列出 LLM 提供者 | ProvidersPage |
| `provider.create` | 创建 LLM 提供者 | ProvidersPage |
| `provider.update` | 更新 LLM 提供者 | ProvidersPage |
| `provider.delete` | 删除 LLM 提供者 | ProvidersPage |
| `provider.test` | 测试指定提供者连接 | ProvidersPage |
| `provider.test_direct` | 直接测试连接参数（无需保存） | ProvidersPage |
| `provider.sync` | 同步提供者列表到 Daemon | ProvidersPage |
| `skill.list` | 列出可用技能 | AgentWorkspacePage |
| `agent_config.list` | 列出 Agent 配置 | DashboardPage |
| `agent_config.create` | 创建 Agent 配置 | DashboardPage |
| `agent_config.update` | 更新 Agent 配置 | DashboardPage |
| `agent_config.delete` | 删除 Agent 配置 | DashboardPage |
| `agent_config.get` | 获取单个 Agent 配置 | AgentWorkspacePage |
| `human.answer` | 回答 Agent 的人工提问 | AgentWorkspacePage |

**事件订阅（WebSocket 推送）**：

| 事件类型 | 说明 |
|-----------|------|
| `task.update` | 任务状态变化 |
| `step.update` | 执行步骤状态变化 |
| `approval.request` | 新的审批请求 |
| `human.question` | Agent 提出人工提问 |
| `tool.call` | 工具调用事件 |
| `task.log` | 审计日志记录 |

---

## 八、成功指标

### 领先指标（变化快）

| 指标 | 目标值 | 测量方式 |
|------|--------|----------|
| 前端功能覆盖率 | ≥ 80%（覆盖后端主要 RPC 方法） | 对比前端调用的 RPC 方法数 / 后端暴露的 RPC 方法数 |
| 页面加载时间 | < 1s（本地环境） | 浏览器 Performance API |
| WebSocket 重连成功率 | ≥ 95% | 重连成功次数 / 断连总次数 |
| 审批响应时间 | < 10s（用户点击批准/拒绝） | 从弹窗出现到 RPC 响应的时长 |

### 滞后指标（变化慢）

| 指标 | 目标值 | 测量方式 |
|------|--------|----------|
| 用户留存率（7 日） | ≥ 60% | 本地使用统计（如已启用） |
| 任务成功率 | ≥ 80% | 后端审计日志分析 |
| 用户满意度（NPS） | ≥ 40 | 后续用户调研 |

---

## 九、开放问题

| 问题 | 负责人 | 阻塞程度 |
|------|--------|----------|
| 后端 `dev-aicoding` 分支是否存在？当前 clone 的是 `main` 分支 | 用户确认 | 阻塞（影响后端 PRD 准确性） |
| `agent_config.*` RPC 与前端 `agentStore`（localStorage）的关系是什么？是否应统一以后端为权威源？ | 后端开发者 | 非阻塞 |
| Web 端 `/login` 页面的认证机制是什么？当前代码中未见实现 | 前端开发者 | 非阻塞 |
| `skill.list` 返回的技能数据格式是否稳定？当前前端硬编码了 `AVAILABLE_SKILLS` | 后端开发者 | 非阻塞 |

---

## 十、技术约束

| 约束 | 说明 |
|------|------|
| **运行环境** | 桌面端依赖 Electron（Windows/macOS/Linux）；Web 端需在支持 WebSocket 的现代浏览器中运行 |
| **后端依赖** | 必须运行 Orion Runtime Daemon（`orion serve`），前端无法独立工作 |
| **通信协议** | 仅支持 WebSocket JSON-RPC（端口 `:9877`），不支持 HTTP REST |
| **数据存储** | Agent 配置和 Provider 配置优先存 localStorage（Web）或 Electron IPC（桌面）；Daemon 在线时同步到后端 |
| **跨域** | Web 端需处理 WebSocket 跨域问题（Daemon 需支持 CORS 或同域部署） |

---

## 十一、发布考量

| 项目 | 说明 |
|------|------|
| **桌面端打包** | 使用 `electron-builder`，输出 `release/` 目录；应用 ID：`ai.orion.studio` |
| **Web 端构建** | `npm run web:build`，输出 `dist-web/`，可部署到任意静态文件服务器 |
| **版本同步** | 前端版本（`package.json` 中的 `version`）应与后端 Runtime 版本保持同步或兼容 |
| **更新机制** | 当前无自动更新；用户需手动下载新版本（后续可接入 `electron-updater`） |

---

*本文档基于 `dev-aicoding` 分支代码分析生成，若实现与文档不符，以代码为准。*

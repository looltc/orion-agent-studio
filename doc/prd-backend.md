# Orion Agent Runtime — 后端产品规格文档 (PRD)

**版本**: v0.2.0 (AgentOS)  
**状态**: 草稿  
**日期**: 2025-07  
**作者**: 产品通（基于代码分析）  
**产品**: Orion Agent Runtime（Python AI Agent 框架 + Runtime Daemon）

---

## 一、产品概述

**Orion Agent Runtime** 是一个基于 Python 的 AI Agent 运行时框架（AgentOS），采用 **Loop Engineering** 架构，为前端（Orion Agent Studio）和 CLI 提供 Agent 执行能力。

**核心定位**：
- **Agent 执行引擎**：接收 goal → 规划 → 执行 → 验证 → 输出结果
- **统一协议层**：所有客户端（CLI / Desktop / Web）通过 JSON-RPC 协议与 Runtime 通信
- **能力层框架**：Browser / Desktop / File / Terminal / API / Vision / Human 等能力模块化，支持热插拔
- **本地优先**：所有数据持久化到本地 `runtime_state/` 目录，无云端依赖

**技术栈**：Python ≥ 3.10、asyncio（异步内核）、Playwright（Browser）、WebSocket（实时通信）、Pydantic（数据模型）

---

## 二、问题陈述

**开发者问题**：构建 AI Agent 需要处理：
1. LLM 调用和工具调度
2. 状态持久化和崩溃恢复
3. 安全风险控制（文件操作、命令执行）
4. 多能力集成（浏览器、终端、文件系统等）
5. 审计追踪和调试

**现有方案的问题**：LangChain 等框架抽象过重，难以精细控制执行流程；AutoGPT 等开箱即用但缺乏企业级安全策略和可观测性。

**不解决问题的代价**：开发者需要重复实现底层能力，安全风险难以统一管理，Agent 行为难以调试和审计。

---

## 三、目标

| # | 目标 | 衡量方式 |
|---|------|----------|
| G1 | Agent 任务成功率 ≥ 80%（简单任务） | 审计日志分析（goal_achieved / failed 比例）|
| G2 | 进程崩溃后恢复时间 < 1s | 从持久化状态恢复未完成任务的时间 |
| G3 | 高风险操作 100% 被策略引擎拦截（需审批时） | 安全测试覆盖（自动化测试 `test_policy.py`、`test_guardrails.py`）|
| G4 | 前端功能覆盖率 ≥ 80% | 前端调用的 RPC 方法数 / 后端暴露的 RPC 方法总数 |
| G5 | 审计日志写入延迟 < 10ms | 性能测试（`test_trace.py`）|

---

## 四、非目标（Non-Goals）

| # | 非目标 | 原因 |
|---|--------|------|
| NG1 | 不支持多租户/云端部署 | 当前定位为本地开发工具，云端部署是独立产品方向 |
| NG2 | 不内置 LLM 模型 | Runtime 通过 API 调用外部 LLM（OpenAI 兼容接口）|
| NG3 | 不提供可视化流程编排 UI | 这是前端 Studio 的职责，后端只提供协议和数据 |
| NG4 | 不支持分布式 Agent 调度 | 单进程多 Agent 槽位已满足 v1 需求，分布式是 v2 方向 |
| NG5 | 不提供图形化技能编辑器 | 技能通过 `SKILL.md` 文件定义，文本编辑已足够 |

---

## 五、用户故事

### 5.1 作为开发者（直接调用 Runtime）

- **作为开发者**，我希望通过 `python -m orion_agent_runtime.main` 启动交互式 Agent，以便快速测试 goal 输入
- **作为开发者**，我希望通过 `orion run "goal"` CLI 命令创建并执行任务，以便在脚本中使用
- **作为开发者**，我希望查看任务的审计日志（`orion logs <task_id>`），以便调试 Agent 行为
- **作为开发者**，我希望回放任务的执行过程（`orion replay <run_id>`），以便理解 Agent 的决策链路

### 5.2 作为前端用户（通过 Studio 使用）

- **作为用户**，我希望在前端创建 Agent 配置（名称、角色、系统提示词、技能、LLM 提供者），以便让不同 Agent 擅长不同任务
- **作为用户**，我希望看到任务执行的实时进度（通过 WebSocket 推送），以便判断是否需要干预
- **作为用户**，我希望对高风险操作（文件删除、命令执行）进行审批，以便保障系统安全
- **作为用户**，我希望 Agent 在执行过程中向我提问（Human-in-the-loop），以便提供实时决策输入

### 5.3 作为能力开发者（扩展 Runtime）

- **作为开发者**，我希望通过继承 `Capability` 基类并实现 `open/snapshot/close` 方法，以便添加新的能力模块
- **作为开发者**，我希望通过 `@register_tool` 装饰器注册新工具，以便让 LLM 可以调用
- **作为开发者**，我希望通过 `manifest.json` 动态加载插件，以便在运行时扩展能力而无需重启

---

## 六、系统架构

### 6.1 架构总览

```
CLI (orion run/status/logs/approve/replay)
        │
        │  JSON-RPC over TCP (:9876) or WebSocket (:9877)
        ▼
┌───────────────────────────────────────────────┐
│              Runtime Daemon                    │
│  ┌──────────┐  ┌────────────┐            │
│  │  Kernel   │  │  Scheduler │            │
│  │(能力注册) │  │(任务调度)  │            │
│  └────┬─────┘  └─────┬──────┘            │
│       │               │                      │
│  ┌────┴─────────────┴──────────┐         │
│  │          EventBus                │         │
│  │  (异步事件 + JSONL 持久化)    │         │
│  └───────────────────────────────┘         │
│       │               │                      │
│  ┌────┴─────┐  ┌─────┴──────┐         │
│  │ Capabilities│  │ WorldState  │         │
│  │(Browser/    │  │(外部环境)  │         │
│  │ Desktop/... │  └────────────┘         │
│  └────────────┘                            │
│  ┌────────────┐  ┌────────────┐         │
│  │   Memory   │  │ Audit Log  │         │
│  │(三层记忆)   │  │(结构化日志) │         │
│  └────────────┘  └────────────┘         │
└───────────────────────────────────────────────┘
        │
        │  EventBus 事件推送
        ▼
   WebSocket 客户端（Studio Desktop/Web）
```

### 6.2 核心子系统

| 子系统 | 路径 | 职责 |
|--------|------|------|
| **V1 Core 引擎** | `core/` | 主循环：ReAct/Plan→Execute + 收敛验证 |
| **V2 Kernel** | `kernel/` | 能力注册、生命周期管理、事件总线集成 |
| **能力层** | `capabilities/` | Browser、Desktop、File、Terminal、API、Vision、Human |
| **工具注册** | `tools/registry.py` | LLM 可调用工具的注册和调度 |
| **协议层** | `protocol/` | `ProtocolTask/Step/Snapshot/Approval` 统一数据模型 |
| **审批中心** | `approval/center.py` | 路由审批请求到客户端，超时自动拒绝 |
| **策略引擎** | `policy/rules.py` | `default/strict/permissive` 三套预设，`ALLOW/APPROVE/DENY/CONFIRM` |
| **Runtime Daemon** | `runtime/daemon.py` | 常驻 JSON-RPC 服务：TCP(:9876) + WebSocket(:9877) |
| **调度器** | `scheduler/` | 异步任务编排、并发控制、持久化与崩溃恢复 |
| **多 Agent** | `scheduler/multi_agent.py` | Agent 槽位、角色分配（planner/executor/reviewer/browser）|
| **插件系统** | `plugins/manager.py` | 通过 `manifest.json` 动态加载/卸载能力 |
| **记忆系统** | `memory/` | Episodic（情景）、Semantic（语义）、Working（工作）三层 |
| **审计日志** | `audit/` | 所有关键事件结构化记录，支持 JSONL/CSV 导出 |
| **MCP 集成** | `mcp/` | Model Context Protocol 服务器连接管理（长连接）|
| **LLM 工厂** | `llm_provider.py` | Maker/Checker 双角色 LLM 客户端工厂 |

---

## 七、功能需求

### 7.1 统一协议层（Protocol）

**P0（必须）**：

- [ ] `ProtocolTask`：任务协议视图（task_id, goal, status, priority, created_at, updated_at, result_summary, run_id, iterations, error）
- [ ] `ProtocolStep`：单步执行单元（step_id, task_id, step_index, type, tool, arguments, risk_level, status, output, error）
- [ ] `ProtocolSnapshot`：世界状态快照（world_state, current_task, current_step, open_windows, open_tabs, notifications, last_action_result, timestamp）
- [ ] `ApprovalRequest`：审批请求（approval_id, task_id, step_id, tool, arguments, risk_level, reason）
- [ ] `BusEvent`：事件总线事件（id, timestamp, source, type, task_id, run_id, payload）

**设计约束**：所有客户端与 Core 之间**只使用**这四种协议对象，不允许各端自定义状态模型。

### 7.2 Runtime Daemon（JSON-RPC 服务）

**P0（必须）**：

- [ ] TCP 服务器（默认 `:9876`）：逐行 JSON-RPC，面向 CLI / 自动化脚本
- [ ] WebSocket 服务器（默认 `:9877`）：JSON-RPC + 事件推送，面向 Desktop / Web 客户端
- [ ] JSON-RPC 请求路由：支持 `task.*`、`approval.*`、`provider.*`、`agent.*`、`human.*`、`world.*`、`daemon.*`、`plugin.*`、`session.*`、`skill.*` 共 25+ 方法
- [ ] EventBus 事件 → WebSocket 广播：`task.update`、`step.update`、`approval.request`、`human.question`、`tool.call`、`task.log`
- [ ] 优雅关闭：终止所有 WebSocket 连接、取消所有后台任务、调用 `kernel.shutdown()`
- [ ] 启动时自动恢复持久化任务（`scheduler/storage.py` → `load_tasks()`）

**P1（重要）**：

- [ ] Daemon 状态信息接口（`daemon.status` RPC）：返回运行任务数、端口、是否运行中
- [ ] WebSocket 客户端管理：支持多客户端同时连接，断连时自动清理

### 7.3 任务管理 RPC

| RPC 方法 | 说明 | 状态 |
|-----------|------|------|
| `task.create` | 创建新任务，启动异步执行 | P0 |
| `task.list` | 列出任务（可按状态过滤）| P0 |
| `task.status` | 获取单个任务状态 | P0 |
| `task.cancel` | 取消任务 | P0 |
| `task.pause` | 暂停任务 | P0 |
| `task.resume` | 恢复任务 | P0 |
| `task.logs` | 获取任务审计日志 | P0 |
| `task.replay` | 回放任务事件 | P1 |

### 7.4 审批系统（ApprovalCenter）

**P0（必须）**：

- [ ] 高风险操作触发 `ApprovalRequest`（由 `policy/rules.py` 评估决定）
- [ ] 审批请求路由到当前连接的 WebSocket 客户端
- [ ] 超时自动拒绝（默认 300 秒，可通过 `ORION_APPROVAL_TIMEOUT` 配置）
- [ ] 审批结果全程写入审计日志
- [ ] `approval.respond` RPC：前端响应审批（批准/拒绝 + 原因）

**P1（重要）**：

- [ ] CLI 同步审批模式（无 WebSocket 客户端时降级到 CLI 输入）
- [ ] 审批历史查询

### 7.5 安全策略引擎（RiskPolicy）

**P0（必须）**：

- [ ] 三套预设策略：
  - `default`：CRITICAL/HIGH 需审批，MEDIUM 视规则，LOW 自动放行
  - `strict`：几乎所有写操作都需审批
  - `permissive`：自动批准（仅极少数 DENY）
- [ ] `PolicyRule` 通配符匹配（工具名称、参数模式）
- [ ] 评估返回四种动作：`ALLOW / APPROVE / DENY / CONFIRM`
- [ ] 集成进 executor 的审批流程

**P1（重要）**：

- [ ] 自定义策略规则 CRUD（当前仅支持代码配置）
- [ ] 策略评估日志（为何某个工具被批准/拒绝）

### 7.6 能力层（Capabilities）

**P0（必须）**：

| 能力 | 工具数 | 说明 |
|--------|--------|------|
| **Browser** | 20+ | Playwright 驱动，导航、点击、输入、截图、JS执行、多标签页 |
| **Desktop** | 6+ | Windows 自动化：启动应用、输入文本、热键、剪贴板、进程列表 |
| **File** | 4 | read / list / search / write |
| **Terminal** | 1 | Shell 命令执行，超时控制 |
| **API** | 2 | `http_get` / `http_post` |
| **Vision** | 2 | 屏幕截图、`vision_describe`（需 vision-capable LLM）|
| **Human** | 1+ | 将人工判断建模为 `HumanCapability`，可被 Scheduler 调度 |

**P1（重要）**：

- [ ] 所有能力均有 Mock 实现（便于无头测试）
- [ ] 能力热插拔（运行时注册/注销）

### 7.7 插件系统（PluginManager）

**P0（必须）**：

- [ ] `PluginManifest` 数据模型：name、version、capabilities、enabled、config
- [ ] `PluginManager.scan_directory(path)`：扫描并解析所有 `manifest.json`
- [ ] `PluginManager.load_all()`：加载启用的插件并注册能力到全局 Registry
- [ ] `PluginManager.unload(name)`：运行时卸载

**P1（重要）**：

- [ ] 插件依赖检查和冲突检测
- [ ] 插件配置热更新

### 7.8 记忆系统（三层架构）

**P0（必须）**：

- [ ] EpisodicStore：情景记忆（what happened），任务摘要持久化
- [ ] SemanticStore：语义记忆（what I know），知识库检索
- [ ] WorkingStore：工作记忆（what I'm doing now），当前任务上下文
- [ ] MemoryManager：统一存取接口，跨会话知识积累

### 7.9 LLM 提供者管理

**P0（必须）**：

- [ ] `ProviderConfig` 数据模型：id、name、base_url、api_key、model、is_default、created_at
- [ ] `ProviderManager` CRUD：list / create / update / delete，持久化到 `runtime_state/providers.json`
- [ ] 默认提供者自动创建（LM Studio 本地模型）
- [ ] `provider.test_direct` RPC：直接测试连接参数（无需保存到文件）
- [ ] Maker/Checker 双 LLM 角色：`get_llm_client(role="maker"/"checker")`

**P1（重要）**：

- [ ] 提供者配置同步到前端（`provider.sync` RPC）
- [ ] LLM 调用重试和熔断

### 7.10 Agent 配置管理

**P0（必须）**：

- [ ] `AgentConfig` 数据模型：id、name、role、system_prompt、skills、llm_provider_id、personality
- [ ] `AgentConfigManager` CRUD：list / create / update / delete，持久化到 `runtime_state/agent_configs.json`
- [ ] 对应 RPC：`agent_config.list / create / update / delete / get`

### 7.11 审计与可观测性

**P0（必须）**：

- [ ] 结构化审计日志：所有关键事件写入 `runtime_state/audit.jsonl`
- [ ] 记录事件类型：task 开始/完成/失败、工具调用（开始/成功/失败/缓存命中）、目标验证、人工批准、成本超限、停滞检测
- [ ] `audit.export`：JSONL / CSV 导出
- [ ] `trace.run_inspector`：运行状态查看
- [ ] `trace.metrics_collector`：指标收集（Token 消耗、迭代次数、工具调用统计）

### 7.12 多 Agent 调度（MultiAgentScheduler）

**P1（重要）**：

- [ ] Agent 槽位管理：planner / executor / reviewer / browser / general 角色分配
- [ ] 任务分片：子任务并行执行
- [ ] 并发控制：槽位忙闲管理
- [ ] 任务状态持久化：进程崩溃后可恢复未完成任务

---

## 八、RPC API 完整清单

### 8.1 任务管理

| 方法 | 参数 | 返回 |
|------|------|------|
| `task.create` | goal, agent_id?, session_id?, system_prompt?, skills?, active_skills?, llm_provider_id? | ProtocolTask |
| `task.list` | status? | {tasks: ProtocolTask[]} |
| `task.status` | task_id | {task: ProtocolTask} |
| `task.cancel` | task_id | ok |
| `task.pause` | task_id | ok |
| `task.resume` | task_id | ok |
| `task.logs` | task_id, limit? | {audit_logs: AuditEvent[]} |
| `task.replay` | run_id | {events: BusEvent[]} |

### 8.2 审批

| 方法 | 参数 | 返回 |
|------|------|------|
| `approval.respond` | approval_id, action (approve/reject), reason? | ok |

### 8.3 Human-in-the-loop

| 方法 | 参数 | 返回 |
|------|------|------|
| `human.answer` | task_id, question_id, answer | ok |

### 8.4 Provider 管理

| 方法 | 参数 | 返回 |
|------|------|------|
| `provider.list` | - | {providers: ProviderConfig[]} |
| `provider.create` | provider (ProviderConfig) | {provider: ProviderConfig} |
| `provider.update` | id, provider | {provider: ProviderConfig} |
| `provider.delete` | id | ok |
| `provider.test` | id | {ok, message, latency_ms} |
| `provider.test_direct` | base_url, api_key, model | {ok, message, latency_ms} |
| `provider.sync` | providers | ok |

### 8.5 Agent 配置管理

| 方法 | 参数 | 返回 |
|------|------|------|
| `agent_config.list` | - | {configs: AgentConfig[]} |
| `agent_config.create` | config (AgentConfig) | {config: AgentConfig} |
| `agent_config.update` | id, config | {config: AgentConfig} |
| `agent_config.delete` | id | ok |
| `agent_config.get` | id | {config: AgentConfig} |

### 8.6 插件管理

| 方法 | 参数 | 返回 |
|------|------|------|
| `plugin.list` | - | {plugins: PluginManifest[]} |
| `plugin.enable` | name | ok |
| `plugin.disable` | name | ok |

### 8.7 其他

| 方法 | 参数 | 返回 |
|------|------|------|
| `world.snapshot` | - | {world_state: dict} |
| `daemon.status` | - | {running, port, active_tasks} |
| `skill.list` | - | {skills: {name, description}[]} |
| `session.list` | - | {sessions: []} |
| `session.delete` | session_id | ok |

---

## 九、环境变量配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ORION_LLM_BASE_URL` | LLM API 端点 | `http://localhost:1234/v1` |
| `ORION_LLM_API_KEY` | LLM API 密钥 | `local-1234567890abcdef` |
| `ORION_LLM_MODEL` | LLM 模型名称 | `local-model` |
| `ORION_CHECKER_LLM_BASE_URL` | Checker LLM 端点 | 同主 LLM |
| `ORION_CHECKER_LLM_API_KEY` | Checker LLM 密钥 | 同主 LLM |
| `ORION_CHECKER_LLM_MODEL` | Checker LLM 模型 | 同主 LLM |
| `ORION_RUNTIME` | 运行时模式（`v1`/`v2`） | `v1` |
| `ORION_RUNTIME_STATE_DIR` | 运行时状态目录 | `./runtime_state` |
| `ORION_EVENT_STORE_DIR` | 事件总线持久化目录 | `./runtime_state/events` |
| `ORION_MCP_FILESYSTEM_DIRS` | MCP 文件系统目录 | 空（不启用）|
| `ORION_BROWSER_MODE` | 浏览器模式（`mock`/`real`） | `mock` |
| `ORION_BROWSER_HEADLESS` | 是否无头运行 | `true` |
| `ORION_BROWSER_CHANNEL` | 浏览器渠道 | `chrome` |
| `ORION_BROWSER_CDP_URL` | 连接已运行浏览器的 CDP 地址 | 空 |
| `ORION_BROWSER_TIMEOUT` | 浏览器超时(ms) | `30000` |
| `ORION_AUTO_APPROVE` | 自动批准高风险操作 | `false` |
| `ORION_APPROVAL_TIMEOUT` | 批准超时时间（秒） | `300` |

---

## 十、成功指标

### 领先指标

| 指标 | 目标值 | 测量方式 |
|------|--------|----------|
| 工具调用延迟（本地计算工具）| < 500ms | `trace/metrics_collector.py` |
| 幂等缓存命中率（同任务重试）| > 80% | `test_idempotency.py` |
| ReAct 循环平均迭代（简单任务）| < 5 | 审计日志分析 |
| 审计日志写入延迟 | < 10ms | 异步写入性能测试 |
| 状态恢复时间（进程崩溃恢复）| < 1s | `test_scheduler.py` |
| SPA 内容提取时间 | < 5s | `test_browser_extractor.py` |

### 滞后指标

| 指标 | 目标值 | 测量方式 |
|------|--------|----------|
| 任务成功率（简单任务）| ≥ 80% | 审计日志（goal_achieved / total）|
| 测试覆盖率 | ≥ 70% | `pytest --cov` |
| 前端 RPC 覆盖率 | ≥ 80% | 前端调用的 RPC 方法数 / 后端总 RPC 方法数 |

---

## 十一、质量保障

### 11.1 测试覆盖

当前测试文件（均在 `tests/` 目录下）：

| 测试文件 | 覆盖模块 |
|-----------|----------|
| `test_agent_runtime.py` | V1 核心引擎 |
| `test_approval.py` | 审批中心 |
| `test_audit_log.py` | 审计日志 |
| `test_browser_extractor.py` | 智能内容提取 |
| `test_browser_tools.py` | 浏览器工具注册 |
| `test_bus.py` | 事件总线 |
| `test_capabilities.py` | 能力层 |
| `test_cli_daemon.py` | CLI + Daemon |
| `test_code_tools.py` | 代码工具 |
| `test_convergence_control.py` | 收敛控制 |
| `test_core.py` | 核心引擎 |
| `test_goal_verification.py` | 目标验证 |
| `test_guardrails.py` | 安全护栏 |
| `test_idempotency.py` | 幂等缓存 |
| `test_memory_layers.py` | 三层记忆 |
| `test_policy.py` | 安全策略引擎 |
| `test_protocol.py` | 统一协议层 |
| `test_react_loop.py` | ReAct 内循环 |
| `test_scheduler.py` | 任务调度器 |
| `test_world.py` | 世界状态 |

### 11.2 验收脚本

- `verification/verify.py`：快速验收（覆盖核心功能）
- `verification/verify_e2e.py`：端到端测试（CLI + Daemon + 前端联动）

---

## 十二、开放问题

| 问题 | 负责人 | 阻塞程度 |
|------|--------|----------|
| `dev-aicoding` 分支是否存在？当前 clone 的是 `main` 分支，PRD 基于 `main` 分析 | 用户确认 | 阻塞（影响 PRD 准确性）|
| `session.list / delete` RPC 的功能定义是什么？当前代码中未见详细实现 | 后端开发者 | 非阻塞 |
| 多 Agent 调度（MultiAgentScheduler）是否已在前端暴露？当前前端未见多 Agent UI | 前后端对齐 | 非阻塞 |
| 插件系统的前端管理界面是否规划？当前仅有后端 RPC | 产品决策 | 非阻塞 |
| `ORION_RUNTIME=v2` 的稳定性如何？是否推荐生产使用？ | 后端开发者 | 非阻塞 |

---

## 十三、技术约束

| 约束 | 说明 |
|------|------|
| **Python 版本** | ≥ 3.10（使用 `from __future__ import annotations` 和 `asyncio` 新特性）|
| **本地运行** | Runtime Daemon 默认绑定 `127.0.0.1`，不支持远程访问（安全设计）|
| **数据持久化** | 所有状态文件存储在 `runtime_state/` 目录，需确保目录可写 |
| **Playwright 依赖** | Browser 能力需要 `playwright install chromium`，可选安装 |
| **Node.js 依赖** | MCP filesystem server 需要 Node.js 和 `npx`（可选）|
| **WebSocket 同域** | 前端 Web 模式需处理跨域问题（Daemon 需支持 CORS 或同域部署）|

---

## 十四、发布规划

### v0.2.0（当前）—— AgentOS 基础设施
- ✅ 统一协议层
- ✅ Runtime Daemon（TCP + WS）
- ✅ 审批中心 + 安全策略引擎
- ✅ V2 Kernel + 事件总线
- ✅ 插件系统
- ✅ 多 Agent 调度（基础版）

### v0.3.0（规划）
- 前端 Agent 配置管理完善（当前部分功能依赖 localStorage，需统一到后端）
- 多 Agent 前端 UI
- 插件管理前端界面
- 审计日志导出前端功能

### v1.0.0（目标）
- 生产级稳定性
- 完整测试覆盖率 ≥ 80%
- 性能基准测试通过
- 官方文档和教程

---

*本文档基于代码分析生成，若实现与文档不符，以代码为准。*

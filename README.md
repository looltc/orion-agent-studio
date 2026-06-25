# Orion Agent Studio

**Orion Agent Runtime** 的桌面客户端 — 可视化、监控、审批和回放 Agent 任务。

基于 Electron + React + TypeScript + Tailwind CSS 构建。

## 快速开始

```bash
# 安装依赖
npm install

# 开发 — 桌面端（Electron）
npm run electron:dev

# 开发 — Web 端（浏览器）
npm run web:dev

# 生产构建
npm run electron:build  # 桌面端
npm run web:build       # Web 端（静态文件 → dist-web/）
```

## 架构

```
Orion Studio
├── 桌面端（Electron + React）
│   └── WebSocket JSON-RPC ──→ Orion Runtime Daemon (:9877)
│
├── Web 端（React SPA）
│   └── WebSocket JSON-RPC ──→ Orion Runtime Daemon (:9877)
│
├── 页面（共用）
│   ├── /              Agent 团队 — 创建与管理 Agent
│   ├── /agent/:id    Agent 工作区 — 聊天式任务执行
│   ├── /audit         审计日志查看器
│   ├── /providers    LLM 提供者管理
│   └── /settings     连接与 Daemon 状态
│
├── Web 端专属
│   └── /login        认证 + Daemon 连接
│
└── 桌面端专属
    └── Electron shell + 原生 IPC
```

## 前置要求

- **Orion Runtime Daemon** 正在运行：`orion serve`（来自 `orion-agent-os`）
- Node.js ≥ 18
- npm ≥ 9

## 项目结构

```
src/
├── client/rpc.ts          JSON-RPC 客户端（WebSocket）
├── types/
│   ├── protocol.ts     协议类型（与 Python 模型对齐）
│   ├── agent.ts        Agent 数据类型
│   └── provider.ts    LLM 提供者类型
├── components/
│   ├── Layout.tsx         应用外壳
│   ├── Sidebar.tsx       导航侧边栏
│   ├── agent/             Agent 相关组件
│   ├── workspace/         工作区组件
│   ├── ApprovalDialog.tsx 风险审批弹窗
│   └── HumanConfirmDialog.tsx 人工确认弹窗
├── pages/
│   ├── DashboardPage.tsx   Agent 团队列表
│   ├── AgentWorkspacePage.tsx  Agent 工作区（聊天、任务、记忆等）
│   ├── AuditPage.tsx       审计日志查看器
│   ├── ProvidersPage.tsx   LLM 提供者管理
│   └── SettingsPage.tsx    连接设置
├── store/
│   └── agentStore.ts    Agent/Provider 数据层（后端为权威源）
├── theme/
│   └── ThemeContext.tsx  深色/浅色主题
├── App.tsx             路由配置
├── main.tsx            React 入口
└── index.css           Tailwind + 全局样式
```

## 主要功能

- **Agent 管理**：创建、配置、删除 Agent（能力、系统提示词、技能、LLM 提供者）
- **聊天式任务执行**：输入目标 → 实时查看执行进度 → 查看思考过程
- **审批管理**：高风险操作弹出审批弹窗，支持批准/拒绝
- **LLM 提供者管理**：配置多个 LLM 端点，测试连接，设置默认提供者
- **审计日志**：查看所有关键事件的结构化记录
- **深色/浅色主题**：一键切换
- **自动重连**：WebSocket 断连后指数退避重连

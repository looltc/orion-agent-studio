# Orion Agent Studio

Desktop client for **Orion Agent Runtime** — visualize, monitor, approve, and replay agent tasks.

Built with Electron + React + TypeScript + Tailwind CSS.

## Quick Start

```bash
# Install dependencies
npm install

# Development — Desktop (Electron)
npm run electron:dev

# Development — Web (browser)
npm run web:dev

# Build for production
npm run electron:build  # Desktop
npm run web:build       # Web (static files → dist-web/)
```

## Architecture

```
Orion Studio
├── Desktop (Electron + React)
│   └── WebSocket JSON-RPC ──→ Orion Runtime Daemon (:9877)
│
├── Web (React SPA)
│   └── WebSocket JSON-RPC ──→ Orion Runtime Daemon (:9877)
│
├── Pages (shared)
│   ├── /           Tasks — create & monitor (chat flow)
│   ├── /task/:id   Task detail + execution timeline
│   ├── /history    Completed & failed tasks
│   ├── /audit      Audit log viewer
│   └── /settings   Connection & daemon status
│
├── Web-only
│   └── /login      Authentication + daemon connection
│
└── Desktop-only
    └── Electron shell + native IPC
```

## Prerequisites

- **Orion Runtime Daemon** running: `orion serve` (from `orion-agent-runtime`)
- Node.js ≥ 18
- npm ≥ 9

## Project Structure

```
src/
├── client/rpc.ts          JSON-RPC client (WebSocket)
├── types/protocol.ts      Protocol types (aligned with Python models)
├── components/
│   ├── Sidebar.tsx         Navigation sidebar
│   ├── StatusBadge.tsx     Task status badge
│   ├── TaskCard.tsx        Task list card
│   ├── StepTimeline.tsx    Execution timeline
│   ├── ApprovalDialog.tsx  Risk approval popup
│   └── Layout.tsx          App shell
├── pages/
│   ├── TasksPage.tsx       Main task creation & monitoring
│   ├── TaskDetailPage.tsx  Task detail with timeline
│   ├── HistoryPage.tsx     Completed tasks
│   ├── AuditPage.tsx       Audit log viewer
│   └── SettingsPage.tsx    Connection settings
├── App.tsx                 Router setup
├── main.tsx                React entry
└── index.css               Tailwind + global styles
```

# 任务执行打断功能 — 前后端设计文档

版本：v1.0
日期：2025-07
适用产品：Orion Agent Studio

---

## 一、功能定义

**"打断"**在 AI Agent 任务执行过程中的语义：

| 操作 | 语义 | 后端 RPC | 任务状态 |
|------|------|-----------|-----------|
| **暂停（Pause）** | 暂停任务循环，保留当前状态（世界状态、对话历史、当前步骤）| `task.pause` | `paused` |
| **继续（Resume）** | 从暂停点恢复执行 | `task.resume` | `running` |
| **取消（Cancel）** | 终止任务，释放资源 | `task.cancel` | `cancelled` |
| **（未来）打断当前步骤** | 停止当前 LLM 调用/工具执行，立即进入下一步 | 需新增 `task.interrupt_step` | `running`（不变化）|

**v1 范围**：实现暂停 / 继续 / 取消（ Cancel）。"打断当前步骤"为 v2 范围。

---

## 二、用户流程

```
用户输入 goal → 点击发送
    ↓
[任务状态：running]
    ↓
输入区显示：
  [⏸ 暂停]  [■ 取消]
    ↓
用户点击"暂停"
    ↓
[任务状态：paused]
输入区显示：
  [▶ 继续]  [■ 取消]
    ↓
用户点击"继续"
    ↓
[任务状态：running]
    ↓
任务完成 → 输入区恢复正常
```

---

## 三、前端设计

### 3.1 状态跟踪

在 `AgentWorkspacePage.tsx` 中新增状态：

```tsx
// 当前运行的任务 ID（用于暂停/取消控制）
const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
// 当前任务是否已暂停
const [taskPaused, setTaskPaused] = useState(false);
```

### 3.2 轮询更新

已有的 `poll()` 函数（每 1.5 秒调用 `task.list`）需扩展——当检测到 `running` / `paused` 任务时，更新上述状态。

```tsx
const poll = useCallback(async () => {
  const tasks = await rpc.listTasks();
  // 找到当前 running 或 paused 的任务
  const active = tasks.find(t => t.status === "running" || t.status === "paused");
  if (active) {
    setRunningTaskId(active.task_id);
    setTaskPaused(active.status === "paused");
  } else {
    setRunningTaskId(null);
    setTaskPaused(false);
  }
  // ...更新消息状态（已有逻辑）
}, [messages]);
```

### 3.3 输入区按钮

在输入区（`/(chat tab 的输入框区域）增加控制按钮：

```
┌───────────────────────────────────────────────┐
│  @skill-1  @skill-2                            │  ← 技能 chips（已有）
├───────────────────────────────────────────────┤
│ [输入框...]              [⏸ 暂停] [■ 取消] │  ← 新增
└───────────────────────────────────────────────┘

暂停后：
┌───────────────────────────────────────────────┐
│  @skill-1  @skill-2                            │
├───────────────────────────────────────────────┤
│ [已暂停 — 任务将在当前步骤完成后停止]     │  ← 状态提示
│               [▶ 继续] [■ 取消]     │
└───────────────────────────────────────────────┘
```

**按钮实现**：

```tsx
{runningTaskId && (
  <div className="flex items-center gap-2">
    {taskPaused ? (
      <>
        <span className="text-xs text-surface-500">已暂停</span>
        <button onClick={handleResume} className="px-3 py-1.5 rounded-lg bg-orion-600 hover:bg-orion-700 text-white text-xs font-medium">
          ▶ 继续
        </button>
      </>
    ) : (
      <button onClick={handlePause} className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 text-xs font-medium">
        ⏸ 暂停
      </button>
    )}
    <button onClick={handleCancel} className="px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-medium">
      ■ 取消
    </button>
  </div>
)}
```

### 3.4 处理函数

```tsx
const handlePause = async () => {
  if (!runningTaskId) return;
  try {
    await rpc.pauseTask(runningTaskId);
    setTaskPaused(true);
  } catch (e) {
    console.error("暂停失败:", e);
  }
};

const handleResume = async () => {
  if (!runningTaskId) return;
  try {
    await rpc.resumeTask(runningTaskId);
    setTaskPaused(false);
  } catch (e) {
    console.error("继续失败:", e);
  }
};

const handleCancel = async () => {
  if (!runningTaskId) return;
  try {
    await rpc.cancelTask(runningTaskId);
    setRunningTaskId(null);
    setTaskPaused(false);
  } catch (e) {
    console.error("取消失败:", e);
  }
};
```

---

## 四、后端设计

### 4.1 现有 RPC 回顾

| RPC | 实现位置 | 当前状态 |
|-----|-------------|----------|
| `task.create` | `daemon.py` | ✅ 已实现 |
| `task.list` | `daemon.py` | ✅ 已实现 |
| `task.status` | `daemon.py` | ✅ 已实现 |
| `task.pause` | `daemon.py` → `scheduler.pause()` | ✅ 已实现（设置 `Task.status = PAUSED`，保存世界状态快照）|
| `task.resume` | `daemon.py` → `scheduler.resume()` | ✅ 已实现（恢复 `Task.status = RUNNING`，重载快照）|
| `task.cancel` | `daemon.py` → `scheduler.cancel()` | ✅ 已实现（设置 `Task.status = CANCELLED`，终止异步任务）|

### 4.2 后端无需修改

现有实现已完整支持暂停/继续/取消。验证点：

1. **`scheduler.pause()`** 是否正确保存世界状态快照？
   - 当前代码：`self.world.snapshot()` 保存到 `TaskCheckpoint`
   - ✅ 正确

2. **`scheduler.resume()`** 是否正确恢复快照？
   - 当前代码：`TaskCheckpoint` 重载到 `self.world`
   - ✅ 正确

3. **`task.cancel()`** 是否真的终止了异步执行？
   - 当前代码：`asyncio.Task.cancel()` + 设置 `status = CANCELLED`
   - ⚠️ 需验证：`AgentRuntime.run()` 是否正确响应 `CancelledError`

### 4.3 （未来 v2）打断当前步骤

如果需求是"打断当前 LLM 调用"（不等到步骤完成），需新增：

- 后端：在 `AgentRuntime` 中暴露 `interrupt()` 方法 → 调用 `asyncio.current_task().cancel()` 或设置一个 `interrupted` 标志
- 前端：新增"打断"按钮（区别于"暂停"） → 调用 `task.interrupt`

**v1 不包含此功能**——暂停已足够。

---

## 五、前端改动清单

| 文件 | 改动 |
|------|------|
| `src/pages/AgentWorkspacePage.tsx` | 新增 `runningTaskId` / `taskPaused` 状态 |
| `src/pages/AgentWorkspacePage.tsx` | 扩展 `poll()` 函数更新上述状态 |
| `src/pages/AgentWorkspacePage.tsx` | 输入区增加暂停/继续/取消按钮 |
| `src/pages/AgentWorkspacePage.tsx` | 新增 `handlePause` / `handleResume` / `handleCancel` 函数 |
| `src/rpc.ts` | **无需改动**（已有 `pauseTask` / `resumeTask` / `cancelTask`）|

---

## 六、后端改动清单

| 文件 | 改动 | 优先级 |
|------|------|----------|
| `src/runtime/daemon.py` | 验证 `task.cancel` 正确终止 `AgentRuntime` 异步任务 | P1 |
| `src/runtime/agent_runtime.py` | 确保响应 `CancelledError`，清理资源 | P1 |
| 无需改动 | — | — |

---

## 七、验证计划

1. **前端验证**：
   - 启动 Daemon（`orion serve`）
   - 打开 Studio，进入 Agent 工作区
   - 输入一个需要较长时间的任务（如"浏览 https://... 并总结"）
   - 点击"暂停" → 观察任务状态变为 `paused`
   - 点击"继续" → 观察任务继续运行
   - 点击"取消" → 观察任务状态变为 `cancelled`

2. **后端验证**：
   - 检查 `scheduler/task.py` 中 `TaskCheckpoint` 是否正确保存/恢复
   - 检查 `agent_runtime.py` 中 `run()` 是否正确响应 `CancelledError`

---

*本文档基于 `dev-aicoding` 分支代码分析生成。*

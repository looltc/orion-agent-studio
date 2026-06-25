# Orion Studio UI 设计规范

版本：v1.0  
生效日期：2025-07  
适用产品：Orion Agent Studio（桌面端 + Web 端）

---

## 一、设计理念

**Orion Studio** 的定位是开发者工具——界面应当冷静、精确、高效，如同 VS Code / TDesign / Shadcn 那样的专业感。

核心原则：
- **信息密度适中**：不浪费空间，也不拥挤
- **动作反馈即时**：hover / active / 状态变化有明确视觉反馈
- **深色优先**：默认深色主题（`dark` class），浅色为可选项
- **Orion 蓝为品牌色**：所有主要操作、链接、状态徽章均使用 `orion-*` 色阶

---

## 二、色彩系统

### 2.1 品牌色 — Orion Blue

| Token | 色值（Hex） | 用途 |
|--------|--------------|------|
| `--orion-50` | `#f0f4ff` | 深色模式下的 hover 背景 |
| `--orion-100` | `#dbe4ff` | 深色模式下的 active 背景 |
| `--orion-600` | `#4c6ef5` | **主操作按钮**、链接、激活状态（最常用）|
| `--orion-700` | `#4263eb` | 主操作按钮 hover |
| `--orion-400` | `#748ffc` | 浅色模式下的主色调 |

在 `tailwind.config.js` 的 `colors. orion` 中定义，全文使用 `bg-orion-600` / `text-orion-400` 等工具类。

### 2.2 表面色 — Surface（背景层）

| Token | 浅色（Light） | 深色（Dark） | 用途 |
|--------|----------------|----------------|------|
| `surface-50` | `#f8f9fa` | `#0d1117` | 最底层页面背景 |
| `surface-100` | `#f1f3f5` | `#212529` | 卡片、弹窗背景 |
| `surface-200` | `#e9ecef` | `#343a40` | 边框、分割线 |
| `surface-700` | `#495057` | `#868e96` | 禁用文本、滚动条 thumb |
| `surface-900` | `#212529` | `#f8f9fa` | 浅色模式下的主文本 |

**使用规则**：
- 页面最底层背景 → `bg-surface-50 dark:bg-surface-900`
- 卡片 / 弹窗背景 → `bg-white dark:bg-surface-900`
- 边框 → `border-surface-200 dark:border-surface-700`

### 2.3 文本色

| 用途 | 浅色 | 深色 | Tailwind 类 |
|------|------|------|---------------|
| 主文本 | `#212529` | `#f8f9fa` | `text-surface-900 dark:text-white` |
| 次文本 | `#495057` | `#adb5bd` | `text-surface-600 dark:text-surface-400` |
| 占位符 / 禁用 | `#868e96` | `#6c757d` | `text-surface-500 dark:text-surface-600` |

### 2.4 语义色（状态）

| 状态 | 浅色 | 深色 | 用途 |
|------|------|------|------|
| 成功 / 在线 | `#10b981` | `#6ee7b7` | 默认徽章、成功消息 |
| 警告 / 等待 | `#f59e0b` | `#fbbf24` | 警告徽章、黄点动画 |
| 错误 / 离线 | `#ef4444` | `#f87171` | 错误徽章、红点 |
| 信息 | `#3b82f6` | `#60a5fa` | 信息提示 |

---

## 三、字体系统

### 3.1 字体家族

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
}
```

优先使用系统原生字体，保证跨平台一致性。

### 3.2 字阶与行高

| 用途 | 大小 | 行高 | Tailwind 类 |
|------|------|------|---------------|
| 页面标题（H1） | `1.25rem` (20px) | 1.4 | `text-xl font-semibold` |
| 区段标题（H2） | `1rem` (16px) | 1.4 | `text-base font-medium` |
| 卡片标题 | `0.875rem` (14px) | 1.4 | `text-sm font-medium` |
| 正文 | `0.875rem` (14px) | 1.5 | `text-sm` |
| 小字 / 标签 | `0.75rem` (12px) | 1.4 | `text-xs` |
| 代码 / 等宽 | `0.8rem` (13px) | 1.5 | `font-mono text-xs` |

**规则**：全产品统一使用 `14px` 作为基准正文大小，不得混用 `15px` / `13px` 等其他大小。

---

## 四、间距系统

基于 **4px** 基础单位的 8 点网格：

| Token | 值 | Tailwind 类 | 用途 |
|--------|------|---------------|------|
| `space-1` | 4px | `p-1` / `gap-1` | 图标与文本间距 |
| `space-2` | 8px | `p-2` / `gap-2` | 紧凑排列间距 |
| `space-3` | 12px | `p-3` / `gap-3` | 表单控件内边距 |
| `space-4` | 16px | `p-4` / `gap-4` | 卡片内边距、区块间距 |
| `space-6` | 24px | `p-6` / `gap-6` | 页面区段间距 |
| `space-8` | 32px | `p-8` / `gap-8` | 大型弹窗内边距 |

**布局规则**：
- 页面内容区最大宽度：`max-w-6xl`（约 1152px），居中 `mx-auto`
- 卡片网格：`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

---

## 五、圆角系统

在 `tailwind.config.js` 的 `borderRadius` 中自定义：

| Token | 值 | Tailwind 类 | 用途 |
|--------|------|---------------|------|
| `card` | `24px` | `rounded-card` | 卡片、弹窗 |
| `module` | `16px` | `rounded-module` | 输入框、按钮 |
| `pill` | `999px` | `rounded-pill` | 胶囊标签、开关 |

**实际使用**（基于现有代码）：
- 卡片 / 弹窗 → `rounded-xl`（约 12px，暂未迁移到 `rounded-card`）
- 输入框 / 按钮 → `rounded-lg`（约 8px）
- 胶囊标签 → `rounded-pill`（999px）

> ⚠️ 待统一：现有代码混用 `rounded-xl` / `rounded-lg` / `rounded-md`，下一版本应迁移到上述 Token。

---

## 六、阴影系统

深色模式下阴影应当克制，主要使用**边框**而非阴影来区分层级：

| 用途 | 浅色 | 深色 | Tailwind 类 |
|------|------|------|---------------|
| 卡片悬停 | `shadow-md` | 边框高亮 | `hover:border-orion-500/50` |
| 弹窗 | `shadow-2xl` | 同上 | `shadow-2xl` |
| 下拉菜单 | `shadow-lg` | 同上 | `shadow-lg` |

**规则**：深色模式下不依赖 `shadow-*` 来区分层级，使用 `border-surface-700` 边框 + 背景色差。

---

## 七、组件规范

### 7.1 按钮（Button）

**主操作按钮（Primary）**：

```html
<button class="px-4 py-2 rounded-lg bg-orion-600 hover:bg-orion-700 
        text-white text-sm font-medium transition-colors">
  主要操作
</button>
```

| 状态 | 样式 |
|------|------|
| 默认 | `bg-orion-600 text-white` |
| Hover | `bg-orion-700` |
| 禁用 | `opacity-40 cursor-not-allowed` |
| Loading | `opacity-50 cursor-not-allowed` + spinner 图标 |

**次要按钮（Secondary）**：

```html
<button class="px-4 py-2 rounded-lg border border-surface-200 
        dark:border-surface-700 text-surface-600 
        dark:text-surface-400 hover:bg-surface-100 
        dark:hover:bg-surface-800 text-sm font-medium">
  取消
</button>
```

**图标按钮（Icon-only）**：

```html
<button class="p-1.5 rounded-lg text-surface-400 
        hover:text-orion-600 dark:hover:text-orion-400 
        hover:bg-surface-100 dark:hover:bg-surface-800 
        transition-colors">
  <Icon size={16} />
</button>
```

### 7.2 输入框（Input）

```html
<input class="w-full bg-surface-50 dark:bg-surface-950 
       border border-surface-200 dark:border-surface-700 
       rounded-lg px-3 py-2 text-sm 
       text-surface-900 dark:text-white 
       placeholder:text-surface-400 
       dark:placeholder:text-surface-600 
       outline-none focus:border-orion-500/50" />
```

| 状态 | 样式 |
|------|------|
| 默认 | `border-surface-200 dark:border-surface-700` |
| Focus | `focus:border-orion-500/50`（不使用 `ring`，与全局 `*:focus-visible` 配合）|
| 错误 | `border-red-400 dark:border-red-600` |

> ⚠️ 全局 `*:focus-visible` 已定义 `outline: 2px solid rgba(76,110,245,0.5)` —— 不要额外加 `focus:ring`。

### 7.3 卡片（Card）

```html
<div class="rounded-xl border border-surface-200 
             dark:border-surface-700 bg-white 
             dark:bg-surface-900 p-4 transition-colors 
             hover:border-surface-300 dark:hover:border-surface-600">
  <!-- 卡片内容 -->
</div>
```

悬停态：`hover:border-orion-500/50`（主操作卡片，如 AgentCard）

### 7.4 开关（Toggle / Switch）

```html
<button onclick="..." 
        class="relative w-11 h-6 rounded-full transition-colors 
               {{ enabled ? 'bg-orion-600' : 'bg-surface-300 dark:bg-surface-600' }}">
  <span class="absolute top-1/2 -translate-y-1/2 
               h-5 w-5 rounded-full bg-white shadow 
               transition-all duration-200"
        style="left: {{ enabled ? 'calc(100% - 22px)' : '2px' }}">
  </span>
</button>
```

### 7.5 胶囊标签（Pill Badge）

```html
<span class="inline-flex items-center gap-1 px-2 py-0.5 
             rounded-pill text-xs font-medium 
             {{ active 
               ? 'bg-orion-600 text-white' 
               : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400' }}">
  {{ label }}
</span>
```

用于：状态过滤按钮、能力标签、启用的 Provider 标记。

### 7.6 弹窗（Dialog / Modal）

```html
<!-- 遮罩 -->
<div class="fixed inset-0 z-50 flex items-center justify-center 
            bg-black/50 backdrop-blur-sm">

  <!-- 弹窗主体 -->
  <div class="bg-white dark:bg-surface-900 
              border border-surface-200 dark:border-surface-700 
              rounded-xl w-full max-w-md mx-4 
              shadow-2xl max-h-[90vh] flex flex-col">
    
    <!-- 头部 -->
    <div class="px-5 py-4 border-b border-surface-200 
                dark:border-surface-700 shrink-0">
      <h3 class="font-semibold text-surface-900 dark:text-white">
        {{ title }}
      </h3>
    </div>
    
    <!-- 内容（可滚动）-->
    <div class="px-5 py-4 space-y-4 overflow-y-auto shrink min-h-0">
      {{ content }}
    </div>
    
    <!-- 底部操作区 -->
    <div class="flex gap-3 px-5 py-4 border-t 
                border-surface-200 dark:border-surface-700 shrink-0">
      <div class="flex-1"></div>
      <button class="...">取消</button>
      <button class="...">确认</button>
    </div>
  </div>
</div>
```

**规则**：
- 弹窗内容区 `overflow-y-auto`，头部 / 底部 `shrink-0`，防止长表单撑破视口
- 操作按钮区始终**右对齐**，取消在左、确认为在右

### 7.7 状态徽章（Status Badge）

```html
<span class="inline-flex items-center gap-1.5 px-2.5 py-1 
             rounded-full text-xs font-medium 
             {{ 
               connected ? 'bg-green-900/30 text-green-400' :
               connecting ? 'bg-yellow-900/30 text-yellow-400' :
               'bg-red-900/30 text-red-400'
             }}">
  <span class="w-1.5 h-1.5 rounded-full 
               {{ connected ? 'bg-green-400' : 
                  connecting ? 'bg-yellow-400 animate-pulse' : 
                  'bg-red-400' }}">
  </span>
  {{ label }}
</span>
```

---

## 八、布局规范

### 8.1 整体布局

```
┌─────────────────────────────────────────────┐
│  Sidebar（固定 56=14rem）               Header（移动端）  │
│  ┌─────────┐                                      │
│  │  Logo     │  ┌──────────────────────────────┐  │
│  ├─────────┤  │  页面内容区（可滚动）          │  │
│  │  导航项   │  │                              │  │
│  ├─────────┤  │                              │  │
│  │  导航项   │  │                              │  │
│  ├─────────┤  └──────────────────────────────┘  │
│  │          │                                      │
│  ├─────────┤  Footer（状态 + 主题切换）          │
│  │  状态点  │                                      │
│  │  主题切换 │                                      │
│  └─────────┘                                      │
└─────────────────────────────────────────────┘
```

- **Sidebar**：固定 `w-56`，`h-screen`，左对齐，不可收起
- **内容区**：`flex-1 overflow-y-auto`，独立滚动，头部（标题 + 操作按钮）固定不滚动

### 8.2 页面结构模式

每个页面统一使用以下结构：

```html
<div class="h-full flex flex-col">
  <!-- 头部（固定不滚动） -->
  <div class="shrink-0 px-6 pt-6 pb-4 max-w-6xl w-full mx-auto">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-surface-900 dark:text-white">
          {{ 页面标题 }}
        </h1>
        <p class="text-sm text-surface-500 mt-0.5">
          {{ 副标题 / 统计信息 }}
        </p>
      </div>
      <button><!-- 主操作按钮 --></button>
    </div>
  </div>
  
  <!-- 内容区（独立滚动） -->
  <div class="flex-1 overflow-y-auto px-6 pb-6 max-w-6xl w-full mx-auto">
    {{ 页面内容 }}
  </div>
</div>
```

> **关键**：`max-w-6xl mx-auto` 同时作用于头部和内容区，保证两者对齐。

---

## 九、图标规范

- **图标库**：`lucide-react`（已在 `package.json` 中引入）
- **默认大小**：`16px`（`size={16}`）
- **标题区图标**：`14px`（`size={14}`，如侧边栏 Logo 处的 Play 图标）
- **空状态图标**：`28px`（`size={28}`，如空列表的装饰图标）

**颜色跟随父文本**：
```jsx
<Icon size={16} class="text-surface-400" />
```

不要使用 `lucide-react` 以外的图标库。

---

## 十、空状态与加载态

### 10.1 空状态（Empty State）

```html
<div class="text-center py-20">
  <div class="w-16 h-16 mx-auto mb-4 rounded-2xl 
              bg-surface-100 dark:bg-surface-800 
              flex items-center justify-center">
    <Icon size={28} class="text-surface-400" />
  </div>
  <p class="text-surface-500 text-sm">
    {{ 空状态描述文本 }}
  </p>
  <button class="mt-4 inline-flex ...">
    <Plus size={16} />
    添加第一项
  </button>
</div>
```

### 10.2 加载态（Loading）

- **按钮 loading**：替换按钮文本为 spinner 图标 + "连接中…" 文本，按钮 `disabled`
- **页面级 loading**：不使用全页遮罩，由数据驱动的条件渲染处理（数据到达前不渲染内容）
- **WebSocket 重连**：侧边栏 Footer 的状态点变为黄色 `animate-pulse`

---

## 十一、深色 / 浅色主题切换

主题通过 `ThemeContext` 管理，在 `<html>` 元素上切换 `class="dark"`。

**切换按钮**（侧边栏 Footer 右侧）：

```jsx
function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button onclick={toggle} 
            class="p-1.5 rounded-lg text-surface-400 
                   hover:bg-surface-100 dark:hover:bg-surface-800 
                   transition-colors"
            title={isDark ? "切换到浅色主题" : "切换到深色主题"}>
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
```

**过渡动画**：`index.css` 已全局定义 `transition: background-color 0.2s ease, border-color 0.2s ease, color 0.15s ease`，主题切换时所有颜色平滑过渡。

---

## 十二、响应式断点

| 断点 | Tailwind 前缀 | 布局变化 |
|--------|----------------|------------|
| `< 768px` | 默认（移动端）| Sidebar 变为顶部导航或隐藏，内容区全宽 |
| `≥ 768px` | `md:` | Sidebar 固定显示，内容区 `max-w-6xl` |
| `≥ 1024px` | `lg:` | 卡片网格变为 `lg:grid-cols-3` |

> 当前产品主要面向桌面端（Electron）和宽屏 Web，移动端适配为低优先级。

---

## 十三、可访问性要求

| 要求 | 实现方式 |
|------|------------|
| 键盘导航 | 全局 `*:focus-visible` 提供明确的焦点指示器 |
| 颜色对比度 | 主文本与背景对比度 ≥ 4.5:1（WCAG AA）|
| 状态传达 | 不仅靠颜色，同时用文本标签（如"在线"/"离线"）|
| ARIA | 图标按钮必须带 `title` 属性；弹窗需 `role="dialog"` |

---

## 十四、禁止事项（Anti-Patterns）

| 禁止 | 原因 |
|------|------|
| ❌ 使用 `shadow-*` 作为主要层级区分手段（深色模式）| 深色模式下阴影不可见，应使用边框 + 背景色差 |
| ❌ 在 focus 态使用 `ring-*` | 全局已定义 `outline`，重复会产色双重点 |
| ❌ 混用多种主色调 | 全产品只使用 `orion-600` 作为主操作色 |
| ❌ 使用像素级 `style` 定位 | 统一使用 Tailwind 工具类 |
| ❌ 中文排版使用 `justify-text` | 中文两端对齐会产生不规律的字间距，禁止使用 |

---

## 十五、使用检查清单

开发新页面或组件时，对照此清单：

- [ ] 是否使用了正确的表面色 Token（`surface-*`）？
- [ ] 主操作按钮是否是 `orion-600` 背景？
- [ ] 输入框 focus 态是否只使用 `border-orion-500/50` 而非 `ring`？
- [ ] 是否所有图标均来自 `lucide-react`？
- [ ] 页面结构是否遵循"头部固定 + 内容区滚动"模式？
- [ ] 是否在 `dark:` 模式下测试过？
- [ ] 空状态是否有有意义的提示和引导操作？

---

*本文档对应 `dev-aicoding` 分支代码风格，由前端代码分析自动生成。*

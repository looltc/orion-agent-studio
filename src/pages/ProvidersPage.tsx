import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Edit3, Check, X, Zap, Star, Globe, Cpu, Server, AlertTriangle } from "lucide-react";
import type { LLMProvider } from "@/types/provider";
import { agentStore } from "@/store/agentStore";
import rpc from "@/client/rpc";
import ConfirmDialog from "@/components/ConfirmDialog";

interface FormData {
  name: string;
  base_url: string;
  api_key: string;
  model: string;
  is_default: boolean;
}

const emptyForm: FormData = {
  name: "",
  base_url: "",
  api_key: "",
  model: "",
  is_default: false,
};

export default function ProvidersPage() {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<LLMProvider | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{
    providerId: string;
    ok: boolean;
    message: string;
    latency_ms: number;
  } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LLMProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProviders = useCallback(async () => {
    setError(null);
    // localStorage 是权威源
    const list = await agentStore.loadProviders();
    setProviders(list);
    // daemon 在线时自动同步
    if (rpc.connected && list.length > 0) {
      try { await rpc.syncProviders(list); } catch {}
    }
  }, []);

  const syncToDaemon = async () => {
    if (!rpc.connected) return;
    try {
      const list = await agentStore.loadProviders();
      await rpc.syncProviders(list);
    } catch {}
  };

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "请输入名称";
    if (!form.base_url.trim()) errors.base_url = "请输入 Base URL";
    if (!form.model.trim()) errors.model = "请输入 Model";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreate = () => {
    setForm(emptyForm);
    setFormErrors({});
    setEditing(null);
    setShowDialog(true);
  };

  const openEdit = (p: LLMProvider) => {
    setEditing(p);
    setForm({
      name: p.name,
      base_url: p.base_url,
      api_key: p.api_key,
      model: p.model,
      is_default: p.is_default,
    });
    setFormErrors({});
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!validate()) return;
    setError(null);

    try {
      const data: Partial<LLMProvider> = {
        name: form.name.trim(),
        base_url: form.base_url.trim(),
        api_key: form.api_key,
        model: form.model.trim(),
        is_default: form.is_default,
      };

      // 始终先存 localStorage（权威源）
      if (editing) {
        await agentStore.updateProvider(editing.id, data);
      } else {
        await agentStore.createProvider(data);
      }

      setShowDialog(false);
      setEditing(null);
      setForm(emptyForm);
      await loadProviders();
      await syncToDaemon();
    } catch (e: any) {
      setError(e?.message || "保存 Provider 失败");
    }
  };

  const handleDeleteRequest = (provider: LLMProvider) => {
    setDeleteTarget(provider);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    setError(null);
    try {
      await agentStore.deleteProvider(deleteTarget.id);
      await loadProviders();
      await syncToDaemon();
    } catch (e: any) {
      setError(e?.message || "删除 Provider 失败");
    } finally {
      setDeleting(null);
      setDeleteTarget(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

  const handleTest = async (provider: LLMProvider) => {
    setTesting(provider.id);
    setTestResult(null);
    setError(null);

    if (!rpc.connected) {
      setTestResult({
        providerId: provider.id,
        ok: false,
        message: "未连接 Daemon — 请启动 'orion serve' 后刷新",
        latency_ms: 0,
      });
      setTesting(null);
      // Auto-dismiss after 5s
      setTimeout(() => setTestResult(null), 5000);
      return;
    }

    try {
      const result = await rpc.testProviderDirect({
        base_url: provider.base_url,
        api_key: provider.api_key,
        model: provider.model,
      });
      setTestResult({ providerId: provider.id, ...result });
      // Auto-dismiss after 5s
      setTimeout(() => setTestResult(null), 5000);
    } catch (e: any) {
      setTestResult({
        providerId: provider.id,
        ok: false,
        message: e?.message || "测试失败",
        latency_ms: 0,
      });
      setTimeout(() => setTestResult(null), 5000);
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header（固定不滚动） */}
      <div className="shrink-0 px-6 pt-6 pb-4 max-w-4xl w-full mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-surface-900 dark:text-white">
              LLM 提供者
            </h1>
            <p className="text-sm text-surface-500 mt-0.5">
              已配置 {providers.length} 个 Provider
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orion-600 hover:bg-orion-700 text-white text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            添加 Provider
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline hover:no-underline"
            >
              关闭
            </button>
          </div>
        )}
      </div>

      {/* 内容区（独立滚动） */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 max-w-4xl w-full mx-auto">
      {/* Provider list */}
      {providers.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
            <Server size={28} className="text-surface-400" />
          </div>
          <p className="text-surface-500 text-sm">
            还没有配置 Provider，添加你的第一个 LLM Provider。
          </p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            添加 Provider
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-4 transition-colors hover:border-surface-300 dark:hover:border-surface-600"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-orion-50 dark:bg-orion-900/20 flex items-center justify-center shrink-0">
                  <Cpu size={20} className="text-orion-600 dark:text-orion-400" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-sm text-surface-900 dark:text-white truncate">
                      {p.name}
                    </h3>
                    {p.is_default && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-medium">
                        <Star size={10} />
                        默认
                      </span>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs text-surface-500">
                      <Globe size={11} />
                      <span className="font-mono truncate">{p.base_url}</span>
                    </div>
                    <div className="text-xs text-surface-400 font-mono">
                      model: {p.model}
                    </div>
                  </div>

                  {/* Test result */}
                  {testResult?.providerId === p.id && (
                    <div
                      className={`mt-2 flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 ${
                        testResult.ok
                          ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                          : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                      }`}
                    >
                      {testResult.ok ? (
                        <Check size={14} />
                      ) : (
                        <X size={14} />
                      )}
                      <span>{testResult.message}</span>
                      {testResult.ok && (
                        <span className="ml-auto tabular-nums">
                          {testResult.latency_ms}ms
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleTest(p)}
                    disabled={testing === p.id}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-orion-600 dark:hover:text-orion-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                    title="测试连接"
                  >
                    <Zap
                      size={16}
                      className={testing === p.id ? "animate-pulse" : ""}
                    />
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-orion-600 dark:hover:text-orion-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                    title="编辑"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteRequest(p)}
                    disabled={deleting === p.id}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
      {/* 内容区结束 */}

      {/* Create / Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-700">
              <h3 className="font-semibold text-surface-900 dark:text-white">
                {editing ? "编辑 Provider" : "添加 Provider"}
              </h3>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs text-surface-500 mb-1 block">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className={`w-full bg-surface-50 dark:bg-surface-950 border rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-white outline-none focus:border-orion-500/50 ${
                    formErrors.name
                      ? "border-red-400 dark:border-red-600"
                      : "border-surface-200 dark:border-surface-700"
                  }`}
                  placeholder="OpenAI"
                  autoFocus
                />
                {formErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>

              {/* Base URL */}
              <div>
                <label className="text-xs text-surface-500 mb-1 block">
                  Base URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.base_url}
                  onChange={(e) =>
                    setForm({ ...form, base_url: e.target.value })
                  }
                  className={`w-full bg-surface-50 dark:bg-surface-950 border rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-white outline-none focus:border-orion-500/50 font-mono ${
                    formErrors.base_url
                      ? "border-red-400 dark:border-red-600"
                      : "border-surface-200 dark:border-surface-700"
                  }`}
                  placeholder="https://api.openai.com/v1"
                />
                {formErrors.base_url && (
                  <p className="text-xs text-red-500 mt-1">
                    {formErrors.base_url}
                  </p>
                )}
              </div>

              {/* API Key */}
              <div>
                <label className="text-xs text-surface-500 mb-1 block">
                  API Key
                </label>
                <input
                  type="password"
                  value={form.api_key}
                  onChange={(e) =>
                    setForm({ ...form, api_key: e.target.value })
                  }
                  className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-white outline-none focus:border-orion-500/50 font-mono"
                  placeholder="sk-..."
                />
              </div>

              {/* Model */}
              <div>
                <label className="text-xs text-surface-500 mb-1 block">
                  Model <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.model}
                  onChange={(e) =>
                    setForm({ ...form, model: e.target.value })
                  }
                  className={`w-full bg-surface-50 dark:bg-surface-950 border rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-white outline-none focus:border-orion-500/50 ${
                    formErrors.model
                      ? "border-red-400 dark:border-red-600"
                      : "border-surface-200 dark:border-surface-700"
                  }`}
                  placeholder="gpt-4o"
                />
                {formErrors.model && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.model}</p>
                )}
              </div>

              {/* Default toggle */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-surface-500">
                  设为默认 Provider
                </label>
                <button
                  onClick={() =>
                    setForm({ ...form, is_default: !form.is_default })
                  }
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    form.is_default
                      ? "bg-orion-600"
                      : "bg-surface-300 dark:bg-surface-600"
                  }`}
                >
                  <span
                    className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white shadow transition-all duration-200"
                    style={{ left: form.is_default ? "calc(100% - 22px)" : "2px" }}
                  />
                </button>
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-surface-200 dark:border-surface-700">
              <div className="flex-1" />
              <button
                onClick={() => {
                  setShowDialog(false);
                  setEditing(null);
                  setFormErrors({});
                }}
                className="px-4 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 text-sm font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-orion-600 hover:bg-orion-700 text-white text-sm font-medium transition-colors"
              >
                {editing ? "保存" : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  destructive = true,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // Focus the cancel button by default (safer option)
    const t = setTimeout(() => cancelRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700
                   rounded-xl w-full max-w-sm mx-4 shadow-2xl"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-700">
          <h3 className="font-semibold text-surface-900 dark:text-white text-sm">
            {title}
          </h3>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-sm text-surface-600 dark:text-surface-400">
            {description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-surface-200 dark:border-surface-700 justify-end">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-surface-200 dark:border-surface-700
                       text-surface-600 dark:text-surface-400
                       hover:bg-surface-100 dark:hover:bg-surface-800
                       text-sm font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              destructive
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-orion-600 hover:bg-orion-700 text-white"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

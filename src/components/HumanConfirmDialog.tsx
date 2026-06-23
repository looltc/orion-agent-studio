// HumanConfirmDialog — 人类确认弹窗
import { HelpCircle } from "lucide-react";

interface HumanConfirmProps {
  questionId: string;
  question: string;
  taskId: string;
  onRespond: (taskId: string, questionId: string, answer: string) => void;
  onDismiss: () => void;
}

export default function HumanConfirmDialog({
  questionId, question, taskId, onRespond, onDismiss,
}: HumanConfirmProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-900 border border-surface-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-700 bg-orion-900/20">
          <HelpCircle size={22} className="text-orion-400" />
          <div>
            <h3 className="font-semibold text-white">Agent needs your input</h3>
            <p className="text-xs text-surface-500">Please confirm to continue</p>
          </div>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-surface-300 whitespace-pre-wrap">{question}</p>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-surface-700">
          <button
            onClick={() => onRespond(taskId, questionId, "reject")}
            className="flex-1 px-4 py-2 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/20 text-sm font-medium"
          >
            Reject
          </button>
          <button
            onClick={() => onRespond(taskId, questionId, "approve")}
            className="flex-1 px-4 py-2 rounded-lg bg-orion-600 hover:bg-orion-700 text-white text-sm font-medium"
          >
            Approve
          </button>
        </div>

        <button onClick={onDismiss}
          className="w-full px-5 py-2 text-xs text-surface-500 hover:text-surface-300">
          Dismiss
        </button>
      </div>
    </div>
  );
}

import { ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import type { ApprovalRequest } from "@/types/protocol";

interface ApprovalDialogProps {
  request: ApprovalRequest | null;
  onRespond: (approvalId: string, action: "approve" | "reject", reason: string) => void;
  onDismiss: () => void;
}

const riskConfig = {
  low: { icon: ShieldCheck, color: "text-green-400", bg: "bg-green-900/20", label: "LOW" },
  medium: { icon: ShieldAlert, color: "text-yellow-400", bg: "bg-yellow-900/20", label: "MEDIUM" },
  high: { icon: ShieldAlert, color: "text-orange-400", bg: "bg-orange-900/20", label: "HIGH" },
  critical: { icon: ShieldX, color: "text-red-400", bg: "bg-red-900/20", label: "CRITICAL" },
};

export default function ApprovalDialog({ request, onRespond, onDismiss }: ApprovalDialogProps) {
  if (!request) return null;

  const risk = riskConfig[request.risk_level] || riskConfig.low;
  const RiskIcon = risk.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-900 border border-surface-700 rounded-xl w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className={`flex items-center gap-3 px-5 py-4 border-b border-surface-700 ${risk.bg}`}>
          <div className={`p-2 rounded-lg ${risk.bg}`}>
            <RiskIcon size={22} className={risk.color} />
          </div>
          <div>
            <h3 className="font-semibold text-white">Approval Required</h3>
            <p className={`text-xs font-mono ${risk.color}`}>{risk.label} RISK</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <div>
            <span className="text-xs text-surface-500">Tool</span>
            <p className="text-sm text-white font-mono">{request.tool}</p>
          </div>
          {request.reason && (
            <div>
              <span className="text-xs text-surface-500">Reason</span>
              <p className="text-sm text-surface-300">{request.reason}</p>
            </div>
          )}
          {Object.keys(request.arguments).length > 0 && (
            <div>
              <span className="text-xs text-surface-500">Arguments</span>
              <pre className="mt-1 text-xs bg-surface-950 rounded-md p-2 text-surface-300 max-h-32 overflow-auto">
                {JSON.stringify(request.arguments, null, 2)}
              </pre>
            </div>
          )}
          <div className="text-xs text-surface-600">
            Task: {request.task_id} · ID: {request.approval_id.slice(0, 16)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 py-4 border-t border-surface-700">
          <button
            onClick={() => onRespond(request.approval_id, "reject", "rejected by user")}
            className="flex-1 px-4 py-2 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/20 text-sm font-medium transition-colors"
          >
            Reject
          </button>
          <button
            onClick={() => onRespond(request.approval_id, "approve", "approved by user")}
            className="flex-1 px-4 py-2 rounded-lg bg-orion-600 hover:bg-orion-700 text-white text-sm font-medium transition-colors"
          >
            Approve
          </button>
        </div>

        <button
          onClick={onDismiss}
          className="w-full px-5 py-2 text-xs text-surface-500 hover:text-surface-300 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

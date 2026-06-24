import { FileCode, Plus, Minus, Edit3 } from "lucide-react";

interface CodeOp {
  op: string;
  line?: number;
  start?: number;
  end?: number;
  content?: string;
}

interface CodeDiffViewProps {
  tool: string;
  path: string;
  operations?: CodeOp[];
  bytesWritten?: number;
}

export default function CodeDiffView({ tool, path, operations, bytesWritten }: CodeDiffViewProps) {
  const isCreate = tool === "code_create_file";
  const isPatch = tool === "code_apply_patch";

  if (!isCreate && !isPatch) return null;

  return (
    <div className="mt-2 rounded-lg border border-surface-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-surface-800 border-b border-surface-700">
        <FileCode size={14} className="text-orion-400" />
        <span className="text-xs font-mono text-surface-300 truncate">{path}</span>
        {isCreate ? (
          <span className="ml-auto flex items-center gap-1 text-xs text-green-400 shrink-0">
            <Plus size={12} /> new file
          </span>
        ) : (
          <span className="ml-auto flex items-center gap-1 text-xs text-orion-400 shrink-0">
            <Edit3 size={12} /> {operations?.length || 0} ops
          </span>
        )}
      </div>

      {/* Diff body */}
      {isPatch && operations && operations.length > 0 ? (
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          {operations.map((op, idx) => (
            <OpBlock key={idx} op={op} />
          ))}
        </div>
      ) : isCreate && bytesWritten ? (
        <div className="px-3 py-2 text-xs text-surface-500">
          {bytesWritten} bytes written
        </div>
      ) : null}
    </div>
  );
}

function OpBlock({ op }: { op: CodeOp }) {
  const lines = op.content ? op.content.split("\n") : [];
  const label =
    op.op === "insert" ? "added" :
    op.op === "delete" ? "removed" : "modified";

  const labelColor =
    op.op === "insert" ? "text-green-400" :
    op.op === "delete" ? "text-red-400" : "text-yellow-400";

  const lineInfo =
    op.op === "insert"
      ? `before line ${op.line ?? "?"}`
      : `lines ${op.start ?? "?"}${op.end && op.start && op.end > op.start + 1 ? `–${op.end - 1}` : ""}`;

  return (
    <div className="border-b border-surface-800 last:border-0">
      <div className="px-3 py-1 text-xs text-surface-600 bg-surface-900/50">
        <span className={labelColor}>{label}</span> {lineInfo}
      </div>
      {op.op !== "delete" && lines.length > 0 && (
        <pre className="px-3 py-0.5 text-xs font-mono text-green-300 bg-green-950/30 overflow-x-auto">
          {lines.map((line, i) => (
            <div key={i}>
              <span className="text-green-600 select-none">+ </span>
              {line}
            </div>
          ))}
        </pre>
      )}
      {op.op === "delete" && (
        <pre className="px-3 py-0.5 text-xs font-mono text-red-300 bg-red-950/30">
          <div>
            <span className="text-red-600 select-none">- </span>
            (deleted)
          </div>
        </pre>
      )}
    </div>
  );
}

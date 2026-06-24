// ThoughtCard — ReAct 思考步骤展示（可折叠）
import { Brain, ChevronUp, ChevronDown } from "lucide-react";

export interface ThinkEntry {
  iteration: number;
  thought: string;
  action: string;
  tool?: string;
  args?: Record<string, unknown>;
  answer?: string;
}

const TOOL_LABELS: Record<string, string> = {
  add: "Calculate",
  mul: "Calculate",
  sub: "Calculate",
  div: "Calculate",
  browser_open: "Open Browser",
  browser_navigate: "Navigate",
  browser_click: "Click",
  browser_type: "Type",
  browser_scroll: "Scroll",
  browser_snapshot: "Snapshot",
  browser_get_page_text: "Extract Text",
  browser_extract_results: "Extract Results",
  browser_press_key: "Press Key",
  browser_evaluate_js: "Execute JS",
  browser_wait: "Wait",
  browser_go_back: "Go Back",
  browser_close: "Close Browser",
  knowledge_search: "Search Knowledge",
  human_confirm: "Confirm",
};

function stepLabel(e: ThinkEntry): string {
  return e.action === "finish" ? "Complete" : TOOL_LABELS[e.tool || ""] || e.tool || e.action;
}

function stepDescription(e: ThinkEntry): string {
  if (e.thought) return e.thought;
  if (e.action === "finish") return e.answer || "(complete)";
  const a = e.args || {};
  return `调用 ${stepLabel(e)} 工具${
    Object.keys(a).length > 0 ? "，参数: " + JSON.stringify(a) : ""
  }`;
}

interface ThoughtCardProps {
  thoughts: ThinkEntry[];
  expanded: boolean;
  onToggle: () => void;
}

export default function ThoughtCard({ thoughts, expanded, onToggle }: ThoughtCardProps) {
  if (!thoughts.length) return null;
  const last = thoughts[thoughts.length - 1];

  return (
    <div className="mt-2 border border-surface-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-1.5 bg-surface-800/50 hover:bg-surface-800 text-xs"
      >
        <Brain size={12} className="text-orion-400 shrink-0" />
        <span className="flex-1 text-left text-surface-400 truncate">
          {expanded ? `Steps (${thoughts.length})` : `Step #${last.iteration} · ${stepLabel(last)}`}
        </span>
        <span className="text-surface-500 truncate max-w-[180px] hidden sm:inline">
          {last.thought
            ? last.thought.slice(0, 50) + (last.thought.length > 50 ? "…" : "")
            : stepDescription(last).slice(0, 50)}
        </span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {expanded && (
        <div className="divide-y divide-surface-700 max-h-80 overflow-y-auto">
          {thoughts.map((e, i) => {
            const isFinish = e.action === "finish";
            return (
              <div key={i} className="px-3 py-2 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-surface-600 font-mono w-8 shrink-0">#{e.iteration}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      isFinish
                        ? "bg-purple-900/30 text-purple-400"
                        : "bg-surface-700 text-surface-300"
                    }`}
                  >
                    {stepLabel(e)}
                  </span>
                </div>
                <p className="text-surface-400 leading-relaxed whitespace-pre-wrap ml-10">
                  {stepDescription(e)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

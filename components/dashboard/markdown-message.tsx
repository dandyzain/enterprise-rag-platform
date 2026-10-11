"use client";

import * as React from "react";
import { CitationItem } from "@/lib/rag/types";
import { Copy, Check, Terminal } from "lucide-react";
import { toast } from "sonner";

interface MarkdownMessageProps {
  content: string;
  citations?: CitationItem[];
  onSelectCitation: (citation: CitationItem) => void;
}

export function MarkdownMessage({
  content,
  citations = [],
  onSelectCitation,
}: MarkdownMessageProps) {
  // 1. Split content by code blocks first
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const blocks: Array<
    | { type: "code"; language: string; code: string }
    | { type: "text"; text: string }
  > = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: "text",
        text: content.substring(lastIndex, match.index),
      });
    }

    blocks.push({
      type: "code",
      language: match[1] || "code",
      code: match[2].trim(),
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    blocks.push({
      type: "text",
      text: content.substring(lastIndex),
    });
  }

  return (
    <div className="space-y-3 leading-relaxed text-sm">
      {blocks.map((block, bIdx) => {
        if (block.type === "code") {
          return (
            <CodeBlockView
              key={`code-${bIdx}`}
              language={block.language}
              code={block.code}
            />
          );
        }

        return (
          <TextBlockView
            key={`text-${bIdx}`}
            text={block.text}
            citations={citations}
            onSelectCitation={onSelectCitation}
          />
        );
      })}
    </div>
  );
}

function CodeBlockView({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Kode disalin ke papan klip.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-sm font-mono text-xs">
      <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/80 px-3.5 py-1.5 text-[11px] text-zinc-400">
        <div className="flex items-center gap-1.5 font-medium">
          <Terminal className="h-3 w-3 text-emerald-400" />
          <span>{language || "snippet"}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Salin</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-zinc-200 leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function TextBlockView({
  text,
  citations,
  onSelectCitation,
}: {
  text: string;
  citations: CitationItem[];
  onSelectCitation: (c: CitationItem) => void;
}) {
  const paragraphs = text.split("\n\n").filter((p) => p.trim().length > 0);

  return (
    <>
      {paragraphs.map((p, pIdx) => {
        const lines = p.split("\n");

        return (
          <div key={`p-${pIdx}`} className="space-y-1">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              const isBullet =
                trimmed.startsWith("•") ||
                trimmed.startsWith("- ") ||
                trimmed.startsWith("* ");
              const isHeading = trimmed.startsWith("###") || trimmed.startsWith("##");

              const lineContent = isBullet
                ? trimmed.replace(/^[•\-\*]\s*/, "")
                : isHeading
                ? trimmed.replace(/^#+\s*/, "")
                : line;

              return (
                <div
                  key={`line-${lIdx}`}
                  className={`${
                    isBullet
                      ? "flex items-start gap-2 pl-2"
                      : isHeading
                      ? "font-bold text-zinc-900 dark:text-zinc-50 pt-1"
                      : ""
                  }`}
                >
                  {isBullet && (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  )}
                  <div className="flex-1">
                    {parseInlineTokens(lineContent, citations, onSelectCitation)}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

/**
 * Parses inline bold (**text**), inline code (`code`), and citation tags ([1], [2])
 */
function parseInlineTokens(
  text: string,
  citations: CitationItem[],
  onSelectCitation: (c: CitationItem) => void
): React.ReactNode {
  // Regex matches: [citation] OR `inline code` OR **bold**
  const tokenRegex = /(\[(\d+)\])|(`([^`]+)`)|(\*\*([^*]+)\*\*)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.substring(lastIndex, match.index));
    }

    if (match[1]) {
      // Citation chip [n]
      const citeNum = parseInt(match[2], 10);
      const found = citations.find((c) => c.index === citeNum);

      nodes.push(
        <button
          key={`cite-${match.index}`}
          type="button"
          onClick={() => {
            if (found) {
              onSelectCitation(found);
            } else {
              toast.info(`Sitasi referensi [${citeNum}]`);
            }
          }}
          className="mx-0.5 inline-flex items-center align-baseline rounded bg-emerald-100 px-1.5 py-0.2 font-mono text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-200 hover:scale-105 active:scale-95 dark:bg-emerald-950/80 dark:text-emerald-300 dark:hover:bg-emerald-900 cursor-pointer"
          title={`Lihat sumber referensi [${citeNum}]`}
        >
          [{citeNum}]
        </button>
      );
    } else if (match[3]) {
      // Inline code `code`
      nodes.push(
        <code
          key={`code-${match.index}`}
          className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-700/50"
        >
          {match[4]}
        </code>
      );
    } else if (match[5]) {
      // Bold **bold**
      nodes.push(
        <strong
          key={`bold-${match.index}`}
          className="font-semibold text-zinc-900 dark:text-zinc-50"
        >
          {match[6]}
        </strong>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }

  return <>{nodes}</>;
}

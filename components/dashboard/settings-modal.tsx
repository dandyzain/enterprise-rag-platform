"use client";

import * as React from "react";
import {
  X,
  Sliders,
  Check,
  Layers,
  Cpu,
  FileText,
  Key,
  Sparkles,
  Eye,
  EyeOff,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SearchMode } from "@/lib/rag/types";
import { useLanguage, Locale } from "@/lib/i18n/context";

export interface RagSettings {
  similarityThreshold: number;
  topK: number;
  modelProvider: "openai" | "google";
  searchMode: SearchMode;
  enableReranking: boolean;
  customOpenAiKey?: string;
  customGeminiKey?: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: RagSettings;
  onSave: (newSettings: RagSettings) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: SettingsModalProps) {
  const { locale, setLocale, t } = useLanguage();
  const [localSettings, setLocalSettings] = React.useState<RagSettings>(settings);
  const [showKeys, setShowKeys] = React.useState(false);

  // Sync local state when incoming settings prop changes
  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    toast.success(t.modals.settings.savedSuccess);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400">
              <Sliders className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {t.modals.settings.title}
              </h3>
              <p className="text-xs text-zinc-500">
                {t.modals.settings.desc}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Language Preference Section */}
          <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400">
                <Globe className="h-3.5 w-3.5" />
              </span>
              <div>
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {t.modals.settings.languageLabel}
                </div>
                <div className="text-[11px] text-zinc-500">
                  {t.modals.settings.languageDesc}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                  locale === "en"
                    ? "border-emerald-500 bg-emerald-50/20 text-emerald-950 dark:text-emerald-300 ring-1 ring-emerald-500"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800"
                }`}
              >
                <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                  <span>English</span>
                  {locale === "en" && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                </div>
                <div className="mt-0.5 text-[10px] text-zinc-500">
                  Default enterprise locale
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLocale("id")}
                className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                  locale === "id"
                    ? "border-emerald-500 bg-emerald-50/20 text-emerald-950 dark:text-emerald-300 ring-1 ring-emerald-500"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800"
                }`}
              >
                <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                  <span>Bahasa Indonesia</span>
                  {locale === "id" && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                </div>
                <div className="mt-0.5 text-[10px] text-zinc-500">
                  Terjemahan resmi Indonesia
                </div>
              </button>
            </div>
          </div>

          {/* Search Mode Engine Selector */}
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {t.modals.semanticSearch.modeLabel}
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  setLocalSettings((prev) => ({ ...prev, searchMode: "hybrid" }))
                }
                className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                  localSettings.searchMode === "hybrid"
                    ? "border-emerald-500 bg-emerald-50/20 text-emerald-950 dark:text-emerald-300 ring-1 ring-emerald-500"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                  <Layers className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Hybrid (RRF)</span>
                </div>
                <div className="mt-1 text-[10px] text-zinc-500 leading-tight">
                  Dense Vector + BM25 Lexical
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setLocalSettings((prev) => ({ ...prev, searchMode: "semantic" }))
                }
                className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                  localSettings.searchMode === "semantic"
                    ? "border-emerald-500 bg-emerald-50/20 text-emerald-950 dark:text-emerald-300 ring-1 ring-emerald-500"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                  <Cpu className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Dense Vector</span>
                </div>
                <div className="mt-1 text-[10px] text-zinc-500 leading-tight">
                  Cosine Similarity Only
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setLocalSettings((prev) => ({ ...prev, searchMode: "keyword" }))
                }
                className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                  localSettings.searchMode === "keyword"
                    ? "border-emerald-500 bg-emerald-50/20 text-emerald-950 dark:text-emerald-300 ring-1 ring-emerald-500"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                  <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Sparse BM25</span>
                </div>
                <div className="mt-1 text-[10px] text-zinc-500 leading-tight">
                  Exact Term & Code Matching
                </div>
              </button>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              {localSettings.searchMode === "hybrid"
                ? "Hybrid (RRF) combines dense semantic vector matching with sparse BM25 lexical precision."
                : localSettings.searchMode === "semantic"
                ? "Dense Vector is optimal for conceptual and thematic semantic matching."
                : "Sparse BM25 is optimal for exact error codes, clause numbers, and technical identifiers."}
            </p>
          </div>

          {/* Similarity Threshold Slider */}
          <div>
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                {t.modals.settings.thresholdLabel}
              </label>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {localSettings.similarityThreshold.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={0.9}
              step={0.05}
              value={localSettings.similarityThreshold}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  similarityThreshold: parseFloat(e.target.value),
                }))
              }
              className="mt-2 w-full accent-emerald-500 cursor-pointer"
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              {t.modals.settings.thresholdDesc} Default: 0.65.
            </p>
          </div>

          {/* Top-K Chunks Slider */}
          <div>
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                {t.modals.settings.topKLabel}
              </label>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {localSettings.topK} Chunks
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={8}
              step={1}
              value={localSettings.topK}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  topK: parseInt(e.target.value, 10),
                }))
              }
              className="mt-2 w-full accent-emerald-500 cursor-pointer"
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              {t.modals.settings.topKDesc}
            </p>
          </div>

          {/* Two-Stage Re-Ranking Toggle */}
          <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {t.modals.settings.rerankLabel}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  {t.modals.settings.rerankDesc}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    enableReranking: !prev.enableReranking,
                  }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  localSettings.enableReranking
                    ? "bg-emerald-600"
                    : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    localSettings.enableReranking ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Model Provider Selector */}
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {t.modals.settings.providerLabel}
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setLocalSettings((prev) => ({ ...prev, modelProvider: "openai" }))
                }
                className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                  localSettings.modelProvider === "openai"
                    ? "border-emerald-500 bg-emerald-50/20 text-emerald-950 dark:text-emerald-300 ring-1 ring-emerald-500"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800"
                }`}
              >
                <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                  OpenAI
                </div>
                <div className="text-[11px] text-zinc-500">GPT-4o Mini</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setLocalSettings((prev) => ({ ...prev, modelProvider: "google" }))
                }
                className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                  localSettings.modelProvider === "google"
                    ? "border-emerald-500 bg-emerald-50/20 text-emerald-950 dark:text-emerald-300 ring-1 ring-emerald-500"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800"
                }`}
              >
                <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                  Google Gemini
                </div>
                <div className="text-[11px] text-zinc-500">Gemini 1.5 Flash</div>
              </button>
            </div>
          </div>

          {/* Bring-Your-Own-Key (BYOK) Section */}
          <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-400">
                  <Key className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    <span>Bring-Your-Own-Key (BYOK)</span>
                    {Boolean(localSettings.customOpenAiKey || localSettings.customGeminiKey) && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                        <Sparkles className="h-2.5 w-2.5" /> {t.common.active}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {t.modals.settings.byokDesc}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowKeys(!showKeys)}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                title={showKeys ? "Hide Keys" : "Show Keys"}
              >
                {showKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              <div>
                <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                  {t.modals.settings.openAiKeyLabel}
                </label>
                <input
                  type={showKeys ? "text" : "password"}
                  placeholder="sk-proj-..."
                  value={localSettings.customOpenAiKey || ""}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      customOpenAiKey: e.target.value.trim(),
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 font-mono text-xs text-zinc-800 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                  {t.modals.settings.geminiKeyLabel}
                </label>
                <input
                  type={showKeys ? "text" : "password"}
                  placeholder="AIzaSy..."
                  value={localSettings.customGeminiKey || ""}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      customGeminiKey: e.target.value.trim(),
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 font-mono text-xs text-zinc-800 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="cursor-pointer">
            {t.common.cancel}
          </Button>
          <Button type="button" variant="default" size="sm" onClick={handleSave} className="gap-1.5 cursor-pointer">
            <Check className="h-3.5 w-3.5" />
            <span>{t.common.save}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

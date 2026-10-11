"use client";

import * as React from "react";
import { X, Sliders, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface RagSettings {
  similarityThreshold: number;
  topK: number;
  modelProvider: "openai" | "google";
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
  const [localSettings, setLocalSettings] = React.useState<RagSettings>(settings);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    toast.success("Konfigurasi parameter RAG diperbarui.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400">
              <Sliders className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                Pengaturan Mesin RAG
              </h3>
              <p className="text-xs text-zinc-500">Parameter retrieval & semantic search</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Similarity Threshold Slider */}
          <div>
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                Ambang Batas Kemiripan (Threshold)
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
              Nilai lebih tinggi (e.g. 0.75+) menyaring hasil lebih ketat untuk akurasi maksimal. Nilai default: 0.65.
            </p>
          </div>

          {/* Top-K Chunks Slider */}
          <div>
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                Jumlah Potongan Konteks Teratas (Top-K)
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
              Jumlah chunk dokumen dengan kemiripan tertinggi yang diteruskan ke prompt LLM.
            </p>
          </div>

          {/* Model Provider Selector */}
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Provider Model Bahasa (LLM)
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setLocalSettings((prev) => ({ ...prev, modelProvider: "openai" }))
                }
                className={`rounded-xl border p-3 text-left transition ${
                  localSettings.modelProvider === "openai"
                    ? "border-emerald-500 bg-emerald-50/20 text-emerald-950 dark:text-emerald-300"
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
                className={`rounded-xl border p-3 text-left transition ${
                  localSettings.modelProvider === "google"
                    ? "border-emerald-500 bg-emerald-50/20 text-emerald-950 dark:text-emerald-300"
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
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button type="button" variant="default" size="sm" onClick={handleSave} className="gap-1.5">
            <Check className="h-3.5 w-3.5" />
            <span>Terapkan Parameter</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ChatWorkspace } from "@/components/dashboard/chat-workspace";
import { CitationDrawer } from "@/components/dashboard/citation-drawer";
import { DocumentUploadModal } from "@/components/dashboard/document-upload-modal";
import { CreateKbModal } from "@/components/dashboard/create-kb-modal";
import { DocumentDetailsModal } from "@/components/dashboard/document-details-modal";
import { SettingsModal, RagSettings } from "@/components/dashboard/settings-modal";
import { SemanticSearchModal } from "@/components/dashboard/semantic-search-modal";
import { KbAnalyticsModal } from "@/components/dashboard/kb-analytics-modal";
import { OnboardingModal } from "@/components/dashboard/onboarding-modal";
import {
  DocumentItem,
  KnowledgeBaseItem,
  CitationItem,
  ChatSessionItem,
} from "@/lib/rag/types";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/context";
import { useAuth } from "@/components/providers/auth-provider";
import { AlertTriangle } from "lucide-react";

const DEFAULT_KB_ID = "default-kb-1";
const SETTINGS_STORAGE_KEY = "enterprise_rag_byok_settings";
const ONBOARDING_STORAGE_KEY = "enterprise_rag_onboarding_dismissed";

const DEFAULT_RAG_SETTINGS: RagSettings = {
  similarityThreshold: 0.65,
  topK: 5,
  modelProvider: "openai",
  searchMode: "hybrid",
  enableReranking: true,
};

const subscribeNoop = () => () => {};

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** `?kb=<id>` share links (read once, as an external store). */
function readKbFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("kb");
}

export default function DashboardPage() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const urlKbId = React.useSyncExternalStore(subscribeNoop, readKbFromUrl, () => null);
  const [selectedKbOverride, setSelectedKbId] = React.useState<string | null>(null);
  const selectedKbId = selectedKbOverride ?? urlKbId ?? DEFAULT_KB_ID;
  const [storagePersistent, setStoragePersistent] = React.useState(true);
  const [documents, setDocuments] = React.useState<DocumentItem[]>([]);
  const [knowledgeBases, setKnowledgeBases] = React.useState<KnowledgeBaseItem[]>([]);
  const [chatSessions, setChatSessions] = React.useState<ChatSessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);

  const [isLoadingDocs, setIsLoadingDocs] = React.useState(true);
  const [activeCitation, setActiveCitation] = React.useState<CitationItem | null>(null);
  const [inspectingDoc, setInspectingDoc] = React.useState<DocumentItem | null>(null);

  // Modals visibility
  const [isCitationDrawerOpen, setIsCitationDrawerOpen] = React.useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [isCreateKbOpen, setIsCreateKbOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isSearchPlaygroundOpen, setIsSearchPlaygroundOpen] = React.useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = React.useState(false);
  const [onboardingOpenOverride, setIsOnboardingOpen] = React.useState<boolean | null>(null);
  const [promptForInput, setPromptForInput] = React.useState<string | undefined>(undefined);

  // RAG engine settings: saved overrides from localStorage (read as an external store, no effect)
  const storedSettingsRaw = React.useSyncExternalStore(
    subscribeNoop,
    () => readStorage(SETTINGS_STORAGE_KEY),
    () => null
  );
  const [ragSettingsOverride, setRagSettings] = React.useState<RagSettings | null>(null);
  const ragSettings = React.useMemo<RagSettings>(() => {
    if (ragSettingsOverride) return ragSettingsOverride;
    try {
      return storedSettingsRaw ? { ...DEFAULT_RAG_SETTINGS, ...JSON.parse(storedSettingsRaw) } : DEFAULT_RAG_SETTINGS;
    } catch {
      return DEFAULT_RAG_SETTINGS;
    }
  }, [ragSettingsOverride, storedSettingsRaw]);

  const onboardingDismissed = React.useSyncExternalStore(
    subscribeNoop,
    () => readStorage(ONBOARDING_STORAGE_KEY) !== null,
    () => true
  );
  const isOnboardingOpen = onboardingOpenOverride ?? !onboardingDismissed;

  const applyDocumentsResponse = React.useCallback(
    (res: Response, json: { success?: boolean; data?: { documents?: DocumentItem[]; knowledgeBases?: KnowledgeBaseItem[]; storage?: { persistent?: boolean } } }, kbId: string) => {
      if (res.status === 404 && kbId !== DEFAULT_KB_ID) {
        // Stale or inaccessible ?kb= link: fall back to the public demo knowledge base.
        setSelectedKbId(DEFAULT_KB_ID);
        return;
      }
      if (json.success && json.data) {
        setDocuments(json.data.documents || []);
        if (json.data.knowledgeBases && json.data.knowledgeBases.length > 0) {
          setKnowledgeBases(json.data.knowledgeBases);
        }
        if (json.data.storage) setStoragePersistent(Boolean(json.data.storage.persistent));
      }
    },
    []
  );

  const loadDocuments = React.useCallback(async (kbId: string) => {
    try {
      const res = await fetch(`/api/documents?kbId=${encodeURIComponent(kbId)}`);
      applyDocumentsResponse(res, await res.json(), kbId);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setIsLoadingDocs(false);
    }
  }, [applyDocumentsResponse]);

  const loadSessions = React.useCallback(async (kbId: string) => {
    try {
      const res = await fetch(`/api/chat/sessions?kbId=${encodeURIComponent(kbId)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setChatSessions(json.data);
      }
    } catch (err) {
      console.error("Failed to load chat sessions:", err);
    }
  }, []);

  // Fetch documents and sessions when knowledge base changes
  React.useEffect(() => {
    let ignore = false;
    void (async () => {
      try {
        const [docsRes, sessRes] = await Promise.all([
          fetch(`/api/documents?kbId=${encodeURIComponent(selectedKbId)}`),
          fetch(`/api/chat/sessions?kbId=${encodeURIComponent(selectedKbId)}`),
        ]);

        const [docsJson, sessJson] = await Promise.all([
          docsRes.json(),
          sessRes.json(),
        ]);

        if (!ignore) {
          applyDocumentsResponse(docsRes, docsJson, selectedKbId);
          if (sessJson.success && Array.isArray(sessJson.data)) {
            setChatSessions(sessJson.data);
          }
        }
      } catch (err) {
        console.error("Failed to sync knowledge base data:", err);
      } finally {
        if (!ignore) {
          setIsLoadingDocs(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [selectedKbId, applyDocumentsResponse, user?.id]);

  const handleRefresh = React.useCallback(() => {
    setIsLoadingDocs(true);
    void loadDocuments(selectedKbId);
    void loadSessions(selectedKbId);
  }, [loadDocuments, loadSessions, selectedKbId]);

  const handleSelectCitation = (citation: CitationItem) => {
    setActiveCitation(citation);
    setIsCitationDrawerOpen(true);
  };

  const handleCreateNewSession = async () => {
    const title = `${locale === "id" ? "Obrolan" : "Chat"} ${new Date().toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    try {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ knowledgeBaseId: selectedKbId, title }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setChatSessions((prev) => [json.data, ...prev]);
        setActiveSessionId(json.data.id);
        toast.success(t.toasts.sessionCreated);
      } else {
        toast.error(json.error || t.toasts.sessionCreateFailed);
      }
    } catch {
      toast.error(t.toasts.sessionCreateFailed);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setChatSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSessionId === sessionId) {
          setActiveSessionId(null);
        }
        toast.success(t.toasts.sessionDeleted);
      } else {
        toast.error(json.error || t.toasts.sessionDeleteFailed);
      }
    } catch {
      toast.error(t.toasts.sessionDeleteFailed);
    }
  };

  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      const json = await res.json();
      if (json.success) {
        setChatSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s))
        );
        toast.success(t.toasts.sessionRenamed);
      } else {
        toast.error(json.error || t.toasts.sessionRenameFailed);
      }
    } catch {
      toast.error(t.toasts.sessionRenameFailed);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        toast.success(t.toasts.documentDeleted);
      } else {
        toast.error(json.error || t.toasts.documentDeleteFailed);
      }
    } catch {
      toast.error(t.toasts.documentDeleteFailed);
    }
  };

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);

  const currentKb = knowledgeBases.find((k) => k.id === selectedKbId) || null;
  const canWrite = Boolean(currentKb?.canWrite);

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-white dark:bg-zinc-950">
      {/* 1. Left Collapsible Sidebar (Responsive Off-Canvas on Mobile) */}
      <Sidebar
        documents={documents}
        knowledgeBases={knowledgeBases}
        selectedKbId={selectedKbId}
        onSelectKb={(id) => {
          setSelectedKbId(id);
          setActiveSessionId(null);
          setIsMobileSidebarOpen(false);
        }}
        isLoading={isLoadingDocs}
        onRefreshDocs={handleRefresh}
        onUploadSuccess={handleRefresh}
        onInspectDocument={(doc) => setInspectingDoc(doc)}
        onDeleteDocument={handleDeleteDocument}
        onOpenCreateKb={() => {
          setIsCreateKbOpen(true);
          setIsMobileSidebarOpen(false);
        }}
        chatSessions={chatSessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          setActiveSessionId(id);
          setIsMobileSidebarOpen(false);
        }}
        onNewSession={() => {
          void handleCreateNewSession();
          setIsMobileSidebarOpen(false);
        }}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        canWrite={canWrite}
        currentKb={currentKb}
        onKbChanged={handleRefresh}
      />

      {/* 2. Central Focused Chat Workspace */}
      <main className="relative flex flex-1 flex-col h-full overflow-hidden w-full min-w-0">
        {!storagePersistent && (
          <div
            role="status"
            className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{t.access.storageNotPersistent}</span>
          </div>
        )}
        <ChatWorkspace
          knowledgeBaseId={selectedKbId}
          activeSessionId={activeSessionId}
          ragSettings={ragSettings}
          documents={documents}
          initialPrompt={promptForInput}
          onSelectCitation={handleSelectCitation}
          onOpenUpload={() => setIsUploadModalOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onNewChat={handleCreateNewSession}
          onOpenSearchPlayground={() => setIsSearchPlaygroundOpen(true)}
          onOpenAnalytics={() => setIsAnalyticsOpen(true)}
          onOpenOnboarding={() => setIsOnboardingOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          canWrite={canWrite}
        />
      </main>

      {/* 3. Right Slide-Over Citation Verification Drawer */}
      <CitationDrawer
        citation={activeCitation}
        isOpen={isCitationDrawerOpen}
        onClose={() => setIsCitationDrawerOpen(false)}
      />

      {/* 4. Document Ingestion Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        knowledgeBaseId={selectedKbId}
        onUploadSuccess={handleRefresh}
        canWrite={canWrite}
      />

      {/* 5. Create Knowledge Base Modal */}
      <CreateKbModal
        isOpen={isCreateKbOpen}
        onClose={() => setIsCreateKbOpen(false)}
        onCreated={(newKbId) => {
          setSelectedKbId(newKbId);
          handleRefresh();
        }}
      />

      {/* 6. Document Details & Chunks Inspector Modal */}
      <DocumentDetailsModal
        document={inspectingDoc}
        isOpen={Boolean(inspectingDoc)}
        onClose={() => setInspectingDoc(null)}
        onDeleted={handleRefresh}
        canWrite={canWrite}
      />

      {/* 7. RAG Engine Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={ragSettings}
        onSave={(newSettings) => {
          setRagSettings(newSettings);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
            } catch (e) {
              console.warn("Failed to save BYOK settings:", e);
            }
          }
        }}
      />

      {/* 8. Semantic Search Playground Modal */}
      <SemanticSearchModal
        isOpen={isSearchPlaygroundOpen}
        onClose={() => setIsSearchPlaygroundOpen(false)}
        knowledgeBaseId={selectedKbId}
      />

      {/* 9. Knowledge Base Health & Analytics Modal */}
      <KbAnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        knowledgeBase={
          knowledgeBases.find((k) => k.id === selectedKbId) ||
          knowledgeBases[0] ||
          null
        }
        documents={documents}
      />

      {/* 10. Interactive Public Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSelectSamplePrompt={(samplePrompt) => {
          setPromptForInput(samplePrompt);
        }}
      />
    </div>
  );
}

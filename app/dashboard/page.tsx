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

const DEFAULT_KB_ID = "default-kb-1";
const BYOK_SETTINGS_KEY = "enterprise_rag_byok_settings";
const ONBOARDING_DISMISSED_KEY = "enterprise_rag_onboarding_dismissed";

/* --------------------------------------------------------------------------
 * Browser-only inputs, read through useSyncExternalStore: the server render
 * and hydration see the server snapshot, and the client value arrives in the
 * render right after hydration, without a mount effect. Neither source is
 * observed for later changes, matching the previous read-once behaviour.
 * ------------------------------------------------------------------------ */

function subscribeToNothing() {
  return () => {};
}

/** `?kb=` from a shared link (see the Sidebar's share button). */
function getSharedKbIdSnapshot(): string | null {
  return new URLSearchParams(window.location.search).get("kb");
}

function getServerSharedKbId(): string | null {
  return null;
}

function getIsHydratedSnapshot() {
  return true;
}

function getServerIsHydrated() {
  return false;
}

/** BYOK settings saved by this page and the dismissal flag set by OnboardingModal. */
function readStoredPreferences(): {
  savedSettings: Partial<RagSettings> | null;
  showOnboarding: boolean;
} {
  try {
    const savedSettings = localStorage.getItem(BYOK_SETTINGS_KEY);
    return {
      savedSettings: savedSettings ? (JSON.parse(savedSettings) as Partial<RagSettings>) : null,
      showOnboarding: !localStorage.getItem(ONBOARDING_DISMISSED_KEY),
    };
  } catch (e) {
    console.warn("Failed to load settings or onboarding preference:", e);
    return { savedSettings: null, showOnboarding: false };
  }
}

export default function DashboardPage() {
  // The shared `?kb=` link decides the knowledge base until the user picks one.
  const sharedKbId = React.useSyncExternalStore(
    subscribeToNothing,
    getSharedKbIdSnapshot,
    getServerSharedKbId
  );
  const [chosenKbId, setChosenKbId] = React.useState<string | null>(null);
  const selectedKbId = chosenKbId ?? (sharedKbId || DEFAULT_KB_ID);
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
  const [isOnboardingOpen, setIsOnboardingOpen] = React.useState(false);
  const [promptForInput, setPromptForInput] = React.useState<string | undefined>(undefined);

  // RAG Engine Settings
  const [ragSettings, setRagSettings] = React.useState<RagSettings>({
    similarityThreshold: 0.65,
    topK: 5,
    modelProvider: "openai",
    searchMode: "hybrid",
    enableReranking: true,
  });

  // Restore persisted BYOK settings and the onboarding prompt once per mount,
  // in the first render after hydration (React's "adjusting state when a prop
  // changes", with hydration as the change).
  const isHydrated = React.useSyncExternalStore(
    subscribeToNothing,
    getIsHydratedSnapshot,
    getServerIsHydrated
  );
  const [restoredPreferences, setRestoredPreferences] = React.useState(false);
  if (isHydrated && !restoredPreferences) {
    setRestoredPreferences(true);
    const { savedSettings, showOnboarding } = readStoredPreferences();
    if (savedSettings) {
      setRagSettings((prev) => ({
        ...prev,
        ...savedSettings,
      }));
    }
    if (showOnboarding) {
      setIsOnboardingOpen(true);
    }
  }

  const loadDocuments = React.useCallback(async (kbId: string) => {
    try {
      const res = await fetch(`/api/documents?kbId=${encodeURIComponent(kbId)}`);
      const json = await res.json();
      if (json.success && json.data) {
        setDocuments(json.data.documents || []);
        if (json.data.knowledgeBases && json.data.knowledgeBases.length > 0) {
          setKnowledgeBases(json.data.knowledgeBases);
        }
      }
    } catch (err) {
      console.error("Gagal memuat dokumen:", err);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  const loadSessions = React.useCallback(async (kbId: string) => {
    try {
      const res = await fetch(`/api/chat/sessions?kbId=${encodeURIComponent(kbId)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setChatSessions(json.data);
      }
    } catch (err) {
      console.error("Gagal memuat sesi chat:", err);
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
          if (docsJson.success && docsJson.data) {
            setDocuments(docsJson.data.documents || []);
            if (docsJson.data.knowledgeBases && docsJson.data.knowledgeBases.length > 0) {
              setKnowledgeBases(docsJson.data.knowledgeBases);
            }
          }
          if (sessJson.success && Array.isArray(sessJson.data)) {
            setChatSessions(sessJson.data);
          }
        }
      } catch (err) {
        console.error("Gagal sinkronisasi data KB:", err);
      } finally {
        if (!ignore) {
          setIsLoadingDocs(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [selectedKbId]);

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
    const title = `Obrolan ${new Date().toLocaleDateString("id-ID", {
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
        toast.success("Sesi chat baru dibuat.");
      }
    } catch {
      toast.error("Gagal membuat sesi baru.");
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
        toast.success("Sesi obrolan dihapus.");
      }
    } catch {
      toast.error("Gagal menghapus sesi.");
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
        toast.success("Judul sesi berhasil diperbarui.");
      } else {
        toast.error(json.error || "Gagal memperbarui judul sesi.");
      }
    } catch {
      toast.error("Gagal memperbarui judul sesi.");
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
        toast.success("Dokumen berhasil dihapus.");
      }
    } catch {
      toast.error("Gagal menghapus dokumen.");
    }
  };

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-white dark:bg-zinc-950">
      {/* 1. Left Collapsible Sidebar (Responsive Off-Canvas on Mobile) */}
      <Sidebar
        documents={documents}
        knowledgeBases={knowledgeBases}
        selectedKbId={selectedKbId}
        onSelectKb={(id) => {
          setChosenKbId(id);
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
      />

      {/* 2. Central Focused Chat Workspace */}
      <main className="relative flex flex-1 flex-col h-full overflow-hidden w-full min-w-0">
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
      />

      {/* 5. Create Knowledge Base Modal */}
      <CreateKbModal
        isOpen={isCreateKbOpen}
        onClose={() => setIsCreateKbOpen(false)}
        onCreated={(newKbId) => {
          setChosenKbId(newKbId);
          handleRefresh();
        }}
      />

      {/* 6. Document Details & Chunks Inspector Modal */}
      <DocumentDetailsModal
        document={inspectingDoc}
        isOpen={Boolean(inspectingDoc)}
        onClose={() => setInspectingDoc(null)}
        onDeleted={handleRefresh}
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
              localStorage.setItem(BYOK_SETTINGS_KEY, JSON.stringify(newSettings));
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

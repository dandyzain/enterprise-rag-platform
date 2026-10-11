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
import {
  DocumentItem,
  KnowledgeBaseItem,
  CitationItem,
  ChatSessionItem,
} from "@/lib/rag/types";
import { toast } from "sonner";

export default function DashboardPage() {
  const [selectedKbId, setSelectedKbId] = React.useState("default-kb-1");
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

  // RAG Engine Settings
  const [ragSettings, setRagSettings] = React.useState<RagSettings>({
    similarityThreshold: 0.65,
    topK: 5,
    modelProvider: "openai",
  });

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

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-white dark:bg-zinc-950">
      {/* 1. Left Collapsible Sidebar */}
      <Sidebar
        documents={documents}
        knowledgeBases={knowledgeBases}
        selectedKbId={selectedKbId}
        onSelectKb={(id) => {
          setSelectedKbId(id);
          setActiveSessionId(null);
        }}
        isLoading={isLoadingDocs}
        onRefreshDocs={handleRefresh}
        onUploadSuccess={handleRefresh}
        onInspectDocument={(doc) => setInspectingDoc(doc)}
        onDeleteDocument={handleDeleteDocument}
        onOpenCreateKb={() => setIsCreateKbOpen(true)}
        chatSessions={chatSessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => setActiveSessionId(id)}
        onNewSession={handleCreateNewSession}
        onDeleteSession={handleDeleteSession}
      />

      {/* 2. Central Focused Chat Workspace */}
      <main className="relative flex flex-1 flex-col h-full overflow-hidden">
        <ChatWorkspace
          knowledgeBaseId={selectedKbId}
          activeSessionId={activeSessionId}
          ragSettings={ragSettings}
          onSelectCitation={handleSelectCitation}
          onOpenUpload={() => setIsUploadModalOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onNewChat={handleCreateNewSession}
          onOpenSearchPlayground={() => setIsSearchPlaygroundOpen(true)}
          onOpenAnalytics={() => setIsAnalyticsOpen(true)}
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
      />

      {/* 7. RAG Engine Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={ragSettings}
        onSave={(newSettings) => setRagSettings(newSettings)}
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
    </div>
  );
}

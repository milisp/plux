import { useState, useRef, useCallback, useEffect } from "react";
import { useChatStore, useCurrentMessages } from "@/hooks/useChatStore";
import { handleSendMessage } from "@/lib/useChatHandler";
import {
  ChatInput,
  WelcomeMessage,
  MessageList,
  ConversationList,
} from "@/components/chat";
import { NoteList, NoteEditor } from "@/components/notes";
import { FileTree } from "@/components/FileTree";
import { FileViewer } from "@/components/FileTree/FileViewer";
import { GitStatusView } from "@/components/FileTree/GitStatusView";
import { DiffViewer } from "@/components/FileTree/DiffViewer";
import { useFolderStore } from "@/hooks/useFolderStore";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { useNoteStore } from "@/hooks/useNoteStore";
import { History, Plus, FileText, MessageCircle, Folder, GitBranch } from "lucide-react";
import { useConversationStore } from "@/hooks/useConversationStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ChatPage() {
  const { createConversation } = useConversationStore();

  const messages = useCurrentMessages();
  const { isLoading } = useChatStore();
  const { currentFolder } = useFolderStore();
  const { showChatPane, showFileTree } = useLayoutStore();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"file" | "diff">("file");
  const [chatPaneWidth, setChatPaneWidth] = useState(600); // Wider to accommodate conversation list
  const [conversationListWidth, setConversationListWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<"conversation" | "notes">("conversation");
  const [leftPanelTab, setLeftPanelTab] = useState<"files" | "git">("files");
  const [noteListWidth, setNoteListWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = () => {
    handleSendMessage();
  };

  const handleFileClick = (filePath: string) => {
    setSelectedFile(filePath);
    setViewMode("file");
  };

  const handleDiffClick = (filePath: string) => {
    setSelectedFile(filePath);
    setViewMode("diff");
  };

  const handleCloseFile = () => {
    setSelectedFile(null);
    setViewMode("file");
  };

  const { createNoteFromContent, setCurrentNote } = useNoteStore();

  const addToNote = (text: string, source?: string) => {
    const newNote = createNoteFromContent(text, source);
    setCurrentNote(newNote.id);
    setActiveTab("notes"); // Switch to notes tab after creating note
  };

  const handleEditMessage = (index: number, newContent: string) => {
    // TODO: Implement message editing functionality
    // This would require updating the chat store to support editing messages
    console.log("Edit message", index, newContent);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return;

      if (isDragging) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = containerRect.right - e.clientX;
        const minWidth = 400;
        const maxWidth = containerRect.width * 0.8;

        setChatPaneWidth(Math.min(Math.max(newWidth, minWidth), maxWidth));
      }
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="relative h-full" ref={containerRef}>
      {/* Main content area */}
      <div className="flex h-full">
        {showFileTree && (
          <div className="w-80 border-r border-gray-200 flex-shrink-0">
            <Tabs value={leftPanelTab} onValueChange={(value) => setLeftPanelTab(value as "files" | "git")} className="flex flex-col h-full">
              <div className="flex-shrink-0 px-3 py-2 border-b border-gray-200">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="files" className="text-sm">
                    <Folder size={14} className="mr-1.5" />
                    Files
                  </TabsTrigger>
                  <TabsTrigger value="git" className="text-sm">
                    <GitBranch size={14} className="mr-1.5" />
                    Git
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="files" className="flex-1 min-h-0 mt-0">
                <FileTree
                  currentFolder={currentFolder || undefined}
                  onFileClick={handleFileClick}
                />
              </TabsContent>
              <TabsContent value="git" className="flex-1 min-h-0 mt-0">
                <GitStatusView
                  currentFolder={currentFolder || undefined}
                  onDiffClick={handleDiffClick}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
        <div className="flex-1 min-w-0 overflow-hidden">
          {selectedFile ? (
            viewMode === "diff" ? (
              <DiffViewer 
                filePath={selectedFile} 
                currentFolder={currentFolder || ""} 
                onClose={handleCloseFile} 
              />
            ) : (
              <FileViewer filePath={selectedFile} onClose={handleCloseFile} addToNotepad={addToNote} />
            )
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-4 max-w-md">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Select a file to view
                </h2>
                <p className="text-gray-600">
                  Choose a file from the file tree to start exploring your
                  project.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat pane overlay - Simplified clean design */}
      {showChatPane && (
        <div
          className="absolute top-0 right-0 h-full bg-white border-l border-gray-200 shadow-lg flex flex-col overflow-hidden"
          style={{ width: `${chatPaneWidth}px` }}
        >
          {/* Main chat pane resize handle */}
          <div
            className="absolute left-0 top-0 w-1 h-full bg-gray-200 hover:bg-gray-400 cursor-col-resize transition-colors z-10"
            onMouseDown={handleMouseDown}
          />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "conversation" | "notes")} className="flex flex-col flex-1 min-h-0">
            {/* Tab header - simplified */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50/50">
              <TabsList className="grid grid-cols-2 w-48">
                <TabsTrigger value="conversation" className="text-sm">
                  <MessageCircle size={14} className="mr-1.5" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="notes" className="text-sm">
                  <FileText size={14} className="mr-1.5" />
                  Notes
                </TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-1">
                {activeTab === "conversation" && (
                  <>
                    <button 
                      onClick={() => createConversation(undefined, "agent")}
                      className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
                      title="New conversation"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => setConversationListWidth((prev) => (prev === 0 ? 280 : 0))}
                      className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
                      title="Toggle conversation history"
                    >
                      <History size={14} />
                    </button>
                  </>
                )}
                {activeTab === "notes" && (
                  <button
                    onClick={() => setNoteListWidth((prev) => (prev === 0 ? 280 : 0))}
                    className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
                    title="Toggle note list"
                  >
                    <FileText size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Tab content */}
            <TabsContent value="conversation" className="flex flex-1 min-h-0 mt-0">
              <div className="flex flex-1 min-h-0">
                {/* Conversation history sidebar */}
                {conversationListWidth > 0 && (
                  <>
                    <div
                      className="flex-shrink-0 border-r border-gray-200 bg-gray-50"
                      style={{ width: `${conversationListWidth}px` }}
                    >
                      <ConversationList />
                    </div>
                    <div className="w-px bg-gray-200"></div>
                  </>
                )}

                {/* Chat area */}
                <div className="flex flex-col flex-1 min-h-0 bg-white">
                  {messages.length === 0 && !isLoading ? (
                    <WelcomeMessage />
                  ) : (
                    <div
                      ref={messageListRef}
                      className="flex-1 min-h-0 overflow-y-auto"
                    >
                      <MessageList messages={messages} isLoading={isLoading} addToNotepad={addToNote} onEditMessage={handleEditMessage} />
                    </div>
                  )}
                  <div className="flex-shrink-0 border-t border-gray-100">
                    <ChatInput onSend={handleSend} isLoading={isLoading} />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="flex flex-1 min-h-0 mt-0">
              <div className="flex flex-1 min-h-0">
                {/* Note List sidebar */}
                {noteListWidth > 0 && (
                  <>
                    <div
                      className="flex-shrink-0 border-r border-gray-200"
                      style={{ width: `${noteListWidth}px` }}
                    >
                      <NoteList />
                    </div>
                    <div className="w-px bg-gray-200"></div>
                  </>
                )}

                {/* Note Editor */}
                <div className="flex-1 min-w-0 bg-white">
                  <NoteEditor />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

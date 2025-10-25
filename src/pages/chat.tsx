import { useState, useRef, useEffect } from "react";
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
import { Plus, FileText, MessageCircle, Folder, GitBranch } from "lucide-react";
import { useConversationStore } from "@/hooks/useConversationStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ChatPage() {
  const { createConversation } = useConversationStore();

  const messages = useCurrentMessages();
  const { isLoading } = useChatStore();
  const { currentFolder } = useFolderStore();
  const { showChatPane, showFileTree } = useLayoutStore();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"file" | "diff">("file");
  const [leftPanelTab, setLeftPanelTab] = useState<
    "files" | "git" | "chat" | "note"
  >("files");
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
  };

  const handleEditMessage = (index: number, newContent: string) => {
    console.log("Edit message", index, newContent);
  };

  return (
    <div className="relative h-full" ref={containerRef}>
      {/* Main content area */}
      <div className="flex h-full">
        {showFileTree && (
          <div className="w-80 border-r border-gray-200 flex-shrink-0">
            <Tabs
              value={leftPanelTab}
              onValueChange={(value) =>
                setLeftPanelTab(value as "files" | "git" | "chat" | "note")
              }
              className="flex flex-col h-full"
            >
              <div className="flex-shrink-0 px-3 py-2 border-b border-gray-200">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="files" className="text-sm">
                    <Folder className="mr-1.5" />
                    Files
                  </TabsTrigger>
                  <TabsTrigger value="git" className="text-sm">
                    <GitBranch className="mr-1.5" />
                    Git
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="text-sm">
                    <MessageCircle className="mr-1.5" />
                  </TabsTrigger>
                  <TabsTrigger value="note" className="text-sm">
                    <FileText className="mr-1.5" />
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
              <TabsContent value="chat" className="flex-1 min-h-0 mt-0">
                <ConversationList />
              </TabsContent>
              <TabsContent value="note" className="flex-1 min-h-0 mt-0">
                <NoteList />
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
              <FileViewer
                filePath={selectedFile}
                onClose={handleCloseFile}
                addToNotepad={addToNote}
              />
            )
          ) : (
            <NoteEditor />
          )}
        </div>
      </div>

      {/* Chat pane overlay - Simplified clean design */}
      {showChatPane && (
        <div className="absolute top-0 right-0 h-full bg-white border-l border-gray-200 shadow-lg flex flex-col overflow-hidden">
          <div className="flex items-center gap-1">
            <button
              onClick={() => createConversation(undefined, "agent")}
              className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
              title="New conversation"
            >
              <Plus />
            </button>
          </div>

          <div className="flex flex-col flex-1 min-h-0 bg-white">
            {messages.length === 0 && !isLoading ? (
              <WelcomeMessage />
            ) : (
              <div
                ref={messageListRef}
                className="flex-1 min-h-0 overflow-y-auto"
              >
                <MessageList
                  messages={messages}
                  isLoading={isLoading}
                  addToNotepad={addToNote}
                  onEditMessage={handleEditMessage}
                />
              </div>
            )}
            <div className="flex-shrink-0 border-t border-gray-100">
              <ChatInput onSend={handleSend} isLoading={isLoading} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

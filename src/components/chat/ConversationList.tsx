import {
  Bot,
  Check,
  Edit2,
  MessageSquare,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useConversationStore } from "@/hooks/useConversationStore";
import type { Conversation } from "@/types/chat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

export function ConversationList() {
  const {
    conversations,
    currentConversationId,
    deleteConversation,
    setCurrentConversation,
    updateConversationTitle,
    toggleFavorite,
  } = useConversationStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const handleSelectConversation = (id: string) => {
    if (editingId) return; // Prevent switching while editing
    setCurrentConversation(id);
  };

  const handleDeleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteConversation(id);
  };

  const handleStartEdit = (
    e: React.MouseEvent,
    id: string,
    currentTitle: string,
  ) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleSaveEdit = () => {
    if (editingId && editTitle.trim()) {
      updateConversationTitle(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleFavorite(id);
  };

  // Filter conversations based on search and tab
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Filter by tab
    if (activeTab === "favorites") {
      filtered = filtered.filter((conv) => conv.isFavorite);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (conv) =>
          conv.title.toLowerCase().includes(query) ||
          conv.messages.some((msg) =>
            msg.content.toLowerCase().includes(query),
          ),
      );
    }

    return filtered;
  }, [conversations, activeTab, searchQuery]);

  const favoriteCount = conversations.filter((conv) => conv.isFavorite).length;

  const renderConversationList = (conversations: Conversation[]) => {
    if (conversations.length === 0) {
      return (
        <div className="px-4 text-center text-gray-500">
          <MessageSquare className="w-8 h-8 mx-auto opacity-50" />
          <p className="text-sm">
            {activeTab === "favorites"
              ? "No favorites yet"
              : "No conversations yet"}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            onClick={() => handleSelectConversation(conversation.id)}
            className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
              conversation.id === currentConversationId
                ? "bg-blue-100 border border-blue-200"
                : "hover:bg-white hover:shadow-sm"
            }`}
          >
            {editingId === conversation.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="p-1 text-green-600 hover:bg-green-100 rounded"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {conversation.mode === "agent" ? (
                        <Bot className="w-3 h-3 text-blue-600" />
                      ) : (
                        <MessageSquare className="w-3 h-3 text-gray-600" />
                      )}
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {conversation.title}
                      </h3>
                      {conversation.isFavorite && (
                        <Star className="w-3 h-3 text-yellow-500 fill-current" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(e, conversation.id)}
                      className={`p-1 rounded ${
                        conversation.isFavorite
                          ? "text-yellow-500 hover:bg-yellow-100"
                          : "text-gray-400 hover:text-yellow-500 hover:bg-yellow-100"
                      }`}
                    >
                      <Star
                        className={`w-3 h-3 ${
                          conversation.isFavorite ? "fill-current" : ""
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={(e) =>
                        handleStartEdit(e, conversation.id, conversation.title)
                      }
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) =>
                        handleDeleteConversation(e, conversation.id)
                      }
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {conversation.messages.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2 truncate">
                    {conversation.messages[
                      conversation.messages.length - 1
                    ]?.content?.substring(0, 60)}
                    ...
                  </p>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 border-r border-gray-200">
      {/* Search */}
      <div className="bg-white border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-8"
          />
        </div>
      </div>

      {/* Tabs and Conversation List */}
      <div className="flex-1 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="h-full flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-2 bg-white border-b border-gray-200 rounded-none">
            <TabsTrigger value="all" className="text-sm">
              All
            </TabsTrigger>
            <TabsTrigger value="favorites" className="text-sm">
              Favorites ({favoriteCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="flex-1 overflow-y-auto m-0">
            {renderConversationList(filteredConversations)}
          </TabsContent>

          <TabsContent value="favorites" className="flex-1 overflow-y-auto m-0">
            {renderConversationList(filteredConversations)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

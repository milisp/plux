import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  MessageSquare,
  FolderOpen,
  Plus,
  Settings,
  Zap,
  Clock,
  AlertCircle,
  Key,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFolderStore } from "@/hooks/useFolderStore";
import { useProvider } from "@/hooks/useProvider";
import { useState } from "react";

export default function HomePage() {
  const navigate = useNavigate();
  const { folderHistory, setCurrentFolder } = useFolderStore();
  const { apiKey, selectedProvider } = useProvider();
  const [showAllRecent, setShowAllRecent] = useState(false);

  const sortedFolders = folderHistory.sort(
    (a, b) => b.lastVisited - a.lastVisited,
  );
  const recentFolders = showAllRecent
    ? sortedFolders
    : sortedFolders.slice(0, 5);
  const hasMoreFolders = sortedFolders.length > 5;

  const hasApiKey = apiKey && apiKey.trim().length > 0;
  const needsSetup = !hasApiKey && selectedProvider !== "ollama";

  const features = [
    {
      icon: <FileText className="w-5 h-5" />,
      title: "File Explorer",
      description:
        "Browse and explore your project files with an intuitive tree structure",
    },
    {
      icon: <Plus className="w-5 h-5" />,
      title: "Context Management",
      description:
        "Add files to AI context by clicking the + button in the file tree",
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      title: "AI Chat Interface",
      description:
        "Chat with AI about your project with file context automatically included",
    },
    {
      icon: <Settings className="w-5 h-5" />,
      title: "MCP Integration",
      description:
        "Connect with Model Context Protocol servers for enhanced functionality",
    },
  ];

  const quickActions = [
    {
      label: "Start Chat",
      action: () => {
        navigate("/");
      },
      icon: <MessageSquare className="w-4 h-4" />,
      variant: "default" as const,
      disabled: needsSetup,
    },
    {
      label: "Settings",
      action: () => navigate("/settings"),
      icon: <Settings className="w-4 h-4" />,
      variant: needsSetup ? ("default" as const) : ("outline" as const),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-2 space-y-4">
      {/* API Key Setup Banner */}
      {needsSetup && (
        <Card className="bg-orange-50 gap-2 py-4">
          <CardHeader className="gap-1 pb-0 px-4">
            <div className="flex items-center gap-2 pb-0">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <CardTitle className="text-orange-900">Setup Required</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="m-0">
            <p className="text-orange-800 mb-1">
              Please configure your API key to start using Plux. You need an API
              key for {selectedProvider} to chat with AI models.
            </p>
            <Button
              onClick={() => navigate("/settings")}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
            >
              <Key className="w-4 h-4" />
              Configure API Key
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Zap className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Plux</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          A powerful desktop application for interacting with AI models using
          file context. Browse your projects, add files to context, and chat
          with AI about your file.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex justify-center gap-4">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            onClick={action.action}
            disabled={action.disabled}
            className="flex items-center gap-2"
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </div>

      {/* Recent Working Directories */}
      {recentFolders.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-800">Recent</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {recentFolders.map((folder) => (
              <div
                key={folder.path}
                className="flex items-center gap-2 p-2 rounded hover:bg-white cursor-pointer transition-colors group"
                onClick={() => {
                  setCurrentFolder(folder.path);
                  navigate("/");
                }}
                title={folder.path}
              >
                <FolderOpen className="w-3 h-3 text-blue-600 flex-shrink-0" />
                <span className="text-sm truncate text-gray-700 group-hover:text-gray-900">
                  {folder.name}
                </span>
              </div>
            ))}
          </div>
          {hasMoreFolders && (
            <div className="flex justify-center mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllRecent(!showAllRecent)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {showAllRecent
                  ? "Show Less"
                  : `Show More (${sortedFolders.length - 5} more)`}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Features */}
      <div className="grid md:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  {feature.icon}
                </div>
                {feature.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                {feature.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* How to Use */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            How to Use
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">
                1
              </Badge>
              <div>
                <p className="font-medium">Setup API Key</p>
                <p className="text-sm text-gray-600">
                  Configure your AI provider API key in Settings before starting
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">
                2
              </Badge>
              <div>
                <p className="font-medium">Navigate to Chat</p>
                <p className="text-sm text-gray-600">
                  Click "Start Chat" or use the main chat interface
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">
                3
              </Badge>
              <div>
                <p className="font-medium">Browse Files</p>
                <p className="text-sm text-gray-600">
                  Use the file tree on the left to explore your project
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">
                4
              </Badge>
              <div>
                <p className="font-medium">Add Context</p>
                <p className="text-sm text-gray-600">
                  Click the + button next to any file or folder to add it to
                  your chat context
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">
                5
              </Badge>
              <div>
                <p className="font-medium">Chat with AI</p>
                <p className="text-sm text-gray-600">
                  Ask questions - the AI will have access to the files you've
                  added
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

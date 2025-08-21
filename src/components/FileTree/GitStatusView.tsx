import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useFolderStore } from "@/hooks/useFolderStore";
import { RefreshCw, GitBranch, Plus, Minus, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GitStatus {
	staged: string[];
	modified: string[];
	untracked: string[];
	deleted: string[];
	renamed: string[];
	conflicted: string[];
}

interface GitStatusViewProps {
	currentFolder?: string;
	onDiffClick?: (path: string) => void;
}

export function GitStatusView({ currentFolder, onDiffClick }: GitStatusViewProps) {
	const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { currentFolder: storeFolder } = useFolderStore();

	const loadGitStatus = async (path?: string) => {
		setLoading(true);
		setError(null);

		try {
			const targetPath = path || currentFolder || storeFolder;
			if (!targetPath) {
				setError("No folder selected");
				return;
			}

			const result = await invoke<GitStatus>("get_git_status", {
				directory: targetPath,
			});
			setGitStatus(result);
		} catch (err) {
			setError(err as string);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadGitStatus();
	}, [currentFolder, storeFolder]);

	if (loading) {
		return (
			<div className="p-4 text-center text-gray-500 flex items-center justify-center gap-2">
				<RefreshCw className="w-4 h-4 animate-spin" />
				Loading git status...
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 text-center text-gray-500">
				<GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
				<p className="text-sm">{error}</p>
				<Button
					onClick={() => loadGitStatus()}
					variant="ghost"
					size="sm"
					className="mt-2"
				>
					<RefreshCw className="w-4 h-4 mr-1" />
					Retry
				</Button>
			</div>
		);
	}

	if (!gitStatus) {
		return (
			<div className="p-4 text-center text-gray-500">
				<GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
				<p className="text-sm">Not a git repository</p>
			</div>
		);
	}

	const isEmpty = 
		gitStatus.staged.length === 0 &&
		gitStatus.modified.length === 0 &&
		gitStatus.untracked.length === 0 &&
		gitStatus.deleted.length === 0 &&
		gitStatus.renamed.length === 0 &&
		gitStatus.conflicted.length === 0;

	if (isEmpty) {
		return (
			<div className="p-4 text-center text-gray-500">
				<GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
				<p className="text-sm">Working tree clean</p>
				<Button
					onClick={() => loadGitStatus()}
					variant="ghost"
					size="sm"
					className="mt-2"
				>
					<RefreshCw className="w-4 h-4 mr-1" />
					Refresh
				</Button>
			</div>
		);
	}

	const renderFileList = (files: string[], title: string, icon: React.ReactNode, color: string) => {
		if (files.length === 0) return null;

		return (
			<div className="mb-4">
				<div className="flex items-center gap-2 mb-2 text-sm font-medium">
					<span className={color}>{icon}</span>
					<span>{title} ({files.length})</span>
				</div>
				<div className="ml-6">
					{files.map((file, index) => {
						return (
							<div
								key={index}
								className="text-sm py-1 px-2 hover:bg-gray-100 rounded cursor-pointer"
								onClick={() => onDiffClick?.(file)}
							>
								<FileText className="w-3 h-3 inline mr-2" />
								{file}
							</div>
						);
					})}
				</div>
			</div>
		);
	};

	return (
		<div className="w-full h-full flex flex-col">
			<div className="flex items-center justify-between p-3 border-b border-gray-200">
				<div className="flex items-center gap-2">
					<GitBranch className="w-4 h-4" />
					<h3 className="font-medium text-sm">Git Status</h3>
				</div>
				<Button
					onClick={() => loadGitStatus()}
					variant="ghost"
					size="sm"
					className="p-1 h-auto"
				>
					<RefreshCw className="w-3 h-3" />
				</Button>
			</div>

			<div className="flex-1 overflow-y-auto p-3">
				{renderFileList(
					gitStatus.conflicted,
					"Conflicted",
					<AlertCircle className="w-4 h-4" />,
					"text-red-700"
				)}
				{renderFileList(
					gitStatus.staged,
					"Staged",
					<Plus className="w-4 h-4" />,
					"text-green-600"
				)}
				{renderFileList(
					gitStatus.modified,
					"Modified",
					<FileText className="w-4 h-4" />,
					"text-yellow-600"
				)}
				{renderFileList(
					gitStatus.deleted,
					"Deleted",
					<Minus className="w-4 h-4" />,
					"text-red-500"
				)}
				{renderFileList(
					gitStatus.renamed,
					"Renamed",
					<FileText className="w-4 h-4" />,
					"text-blue-500"
				)}
				{renderFileList(
					gitStatus.untracked,
					"Untracked",
					<Plus className="w-4 h-4" />,
					"text-green-500"
				)}
			</div>
		</div>
	);
}
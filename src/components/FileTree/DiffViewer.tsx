import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { X, RotateCcw } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vs, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface DiffLine {
	line_number_old: number | null;
	line_number_new: number | null;
	content: string;
	line_type: string; // "context", "added", "removed", "header"
}

interface FileDiff {
	file_path: string;
	old_path: string | null;
	new_path: string | null;
	lines: DiffLine[];
	is_binary: boolean;
	is_new_file: boolean;
	is_deleted_file: boolean;
}

interface DiffViewerProps {
	filePath: string;
	currentFolder: string;
	onClose: () => void;
}

export function DiffViewer({ filePath, currentFolder, onClose }: DiffViewerProps) {
	const [diff, setDiff] = useState<FileDiff | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isDarkMode, setIsDarkMode] = useState(false);

	const loadDiff = async () => {
		setLoading(true);
		setError(null);

		try {
			const result = await invoke<FileDiff[]>("get_git_diff", {
				directory: currentFolder,
				filePath: filePath,
			});

			if (result.length > 0) {
				setDiff(result[0]);
			} else {
				setError("No changes found for this file");
			}
		} catch (err) {
			setError(err as string);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadDiff();
	}, [filePath, currentFolder]);

	const getFileExtension = (path: string) => {
		const parts = path.split(".");
		return parts.length > 1 ? parts[parts.length - 1] : "";
	};

	const getLanguageFromExtension = (extension: string) => {
		const langMap: { [key: string]: string } = {
			js: "javascript",
			jsx: "jsx",
			ts: "typescript",
			tsx: "tsx",
			rs: "rust",
			py: "python",
			java: "java",
			cpp: "cpp",
			c: "c",
			h: "c",
			css: "css",
			html: "html",
			json: "json",
			xml: "xml",
			yaml: "yaml",
			yml: "yaml",
			toml: "toml",
			sh: "bash",
			md: "markdown",
		};
		return langMap[extension.toLowerCase()] || "text";
	};

	const renderDiffLine = (line: DiffLine, index: number) => {
		const getLineStyle = () => {
			switch (line.line_type) {
				case "added":
					return "bg-green-50 border-l-4 border-green-400";
				case "removed":
					return "bg-red-50 border-l-4 border-red-400";
				case "header":
					return "bg-blue-50 border-l-4 border-blue-400 font-medium";
				default:
					return "bg-gray-50";
			}
		};

		const getLinePrefix = () => {
			switch (line.line_type) {
				case "added":
					return "+";
				case "removed":
					return "-";
				case "context":
					return " ";
				default:
					return "";
			}
		};

		const content = line.content.slice(1); // Remove the +/- prefix from git diff

		return (
			<div key={index} className={`flex text-sm ${getLineStyle()}`}>
				<div className="flex-shrink-0 w-16 text-right px-2 py-1 text-gray-500 bg-gray-100 border-r">
					{line.line_number_old && (
						<span className="inline-block w-6">{line.line_number_old}</span>
					)}
					{!line.line_number_old && <span className="inline-block w-6"></span>}
				</div>
				<div className="flex-shrink-0 w-16 text-right px-2 py-1 text-gray-500 bg-gray-100 border-r">
					{line.line_number_new && (
						<span className="inline-block w-6">{line.line_number_new}</span>
					)}
					{!line.line_number_new && <span className="inline-block w-6"></span>}
				</div>
				<div className="flex-shrink-0 w-4 text-center py-1 text-gray-600 bg-gray-100 border-r">
					{getLinePrefix()}
				</div>
				<div className="flex-1 px-4 py-1 font-mono text-sm overflow-x-auto">
					{line.line_type === "header" ? (
						<span className="text-blue-600">{line.content}</span>
					) : (
						<SyntaxHighlighter
							language={getLanguageFromExtension(getFileExtension(filePath))}
							style={isDarkMode ? vscDarkPlus : vs}
							customStyle={{
								margin: 0,
								padding: 0,
								background: "transparent",
								fontSize: "inherit",
								lineHeight: "inherit",
							}}
							PreTag="span"
							CodeTag="span"
						>
							{content || " "}
						</SyntaxHighlighter>
					)}
				</div>
			</div>
		);
	};

	if (loading) {
		return (
			<div className="w-full h-full flex flex-col">
				<div className="flex items-center justify-between p-4 border-b border-gray-200">
					<h2 className="text-lg font-semibold">Loading diff...</h2>
					<Button onClick={onClose} variant="ghost" size="sm">
						<X className="w-4 h-4" />
					</Button>
				</div>
				<div className="flex-1 flex items-center justify-center">
					<div className="text-gray-500">Loading git diff...</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="w-full h-full flex flex-col">
				<div className="flex items-center justify-between p-4 border-b border-gray-200">
					<h2 className="text-lg font-semibold text-red-600">Error</h2>
					<Button onClick={onClose} variant="ghost" size="sm">
						<X className="w-4 h-4" />
					</Button>
				</div>
				<div className="flex-1 flex items-center justify-center flex-col gap-4">
					<div className="text-red-500">{error}</div>
					<Button onClick={loadDiff} variant="outline" size="sm">
						<RotateCcw className="w-4 h-4 mr-2" />
						Retry
					</Button>
				</div>
			</div>
		);
	}

	if (!diff) {
		return (
			<div className="w-full h-full flex flex-col">
				<div className="flex items-center justify-between p-4 border-b border-gray-200">
					<h2 className="text-lg font-semibold">No changes</h2>
					<Button onClick={onClose} variant="ghost" size="sm">
						<X className="w-4 h-4" />
					</Button>
				</div>
				<div className="flex-1 flex items-center justify-center">
					<div className="text-gray-500">No changes found for this file</div>
				</div>
			</div>
		);
	}

	if (diff.is_binary) {
		return (
			<div className="w-full h-full flex flex-col">
				<div className="flex items-center justify-between p-4 border-b border-gray-200">
					<h2 className="text-lg font-semibold">{diff.file_path}</h2>
					<Button onClick={onClose} variant="ghost" size="sm">
						<X className="w-4 h-4" />
					</Button>
				</div>
				<div className="flex-1 flex items-center justify-center">
					<div className="text-gray-500">Binary file - cannot show diff</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full h-full flex flex-col bg-white">
			<div className="flex items-center justify-between p-4 border-b border-gray-200">
				<div className="flex items-center gap-4">
					<h2 className="text-lg font-semibold">{diff.file_path}</h2>
					{diff.is_new_file && (
						<span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
							New file
						</span>
					)}
					{diff.is_deleted_file && (
						<span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
							Deleted
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					<Button
						onClick={() => setIsDarkMode(!isDarkMode)}
						variant="outline"
						size="sm"
					>
						{isDarkMode ? "Light" : "Dark"}
					</Button>
					<Button onClick={onClose} variant="ghost" size="sm">
						<X className="w-4 h-4" />
					</Button>
				</div>
			</div>

			<div className="flex-1 overflow-auto">
				<div className="min-w-full">
					{diff.lines.map((line, index) => renderDiffLine(line, index))}
				</div>
			</div>
		</div>
	);
}
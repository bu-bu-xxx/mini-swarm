import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../../store';
import { useT } from '../../i18n';
import { opfsService } from '../../core/storage/opfs';
import type { FileEntry } from '../../core/storage/opfs';
import JSZip from 'jszip';

// ── Tree node structure for directory view ──

interface TreeNode {
  name: string;
  path: string;
  kind: 'file' | 'directory';
  size?: number;
  children: TreeNode[];
}

function buildTree(entries: FileEntry[]): TreeNode[] {
  const root: TreeNode[] = [];
  const dirMap = new Map<string, TreeNode>();

  // Sort so directories come before their children
  const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path));

  for (const entry of sorted) {
    const parts = entry.path.split('/');
    const node: TreeNode = {
      name: entry.name,
      path: entry.path,
      kind: entry.kind,
      size: entry.size,
      children: [],
    };

    if (parts.length === 1) {
      root.push(node);
      if (entry.kind === 'directory') {
        dirMap.set(entry.path, node);
      }
    } else {
      // Find parent directory
      const parentPath = parts.slice(0, -1).join('/');
      const parent = dirMap.get(parentPath);
      if (parent) {
        parent.children.push(node);
      } else {
        root.push(node);
      }
      if (entry.kind === 'directory') {
        dirMap.set(entry.path, node);
      }
    }
  }

  return root;
}

// ── Recursive tree item component ──

function FileTreeItem({
  node,
  depth,
  expandedDirs,
  toggleDir,
  onFileClick,
  onDeleteFile,
  onDeleteDir,
}: {
  node: TreeNode;
  depth: number;
  expandedDirs: Set<string>;
  toggleDir: (path: string) => void;
  onFileClick: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onDeleteDir: (path: string) => void;
}) {
  const isExpanded = expandedDirs.has(node.path);

  if (node.kind === 'directory') {
    return (
      <>
        <div
          className="flex items-center gap-1.5 text-xs group cursor-pointer hover:bg-slate-800 rounded px-1 py-0.5"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
          onClick={() => toggleDir(node.path)}
        >
          <span className={`inline-block transition-transform text-[10px] ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
          <span>📁</span>
          <span className="text-slate-300 flex-1 truncate">{node.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteDir(node.path); }}
            className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-[10px]"
            title="Delete directory"
          >
            ✕
          </button>
        </div>
        {isExpanded && node.children.map((child) => (
          <FileTreeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            expandedDirs={expandedDirs}
            toggleDir={toggleDir}
            onFileClick={onFileClick}
            onDeleteFile={onDeleteFile}
            onDeleteDir={onDeleteDir}
          />
        ))}
      </>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 text-xs group cursor-pointer hover:bg-slate-800 rounded px-1 py-0.5"
      style={{ paddingLeft: `${depth * 12 + 4}px` }}
      onClick={() => onFileClick(node.path)}
    >
      <span>📄</span>
      <span className="text-slate-300 flex-1 truncate">{node.name}</span>
      {node.size !== undefined && (
        <span className="text-slate-600 text-[10px]">{formatSize(node.size)}</span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onDeleteFile(node.path); }}
        className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-[10px]"
        title="Delete"
      >
        ✕
      </button>
    </div>
  );
}

// ── Main FileManager component ──

export default function FileManager() {
  const {
    workspaceFiles,
    outputFiles,
    refreshWorkspaceFiles,
    refreshOutputFiles,
    previewFile,
    setPreviewFile,
  } = useAppStore();
  const t = useT();

  const [outputsCollapsed, setOutputsCollapsed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize OPFS and load files on mount
  useEffect(() => {
    const init = async () => {
      await opfsService.init();
      await refreshWorkspaceFiles();
      await refreshOutputFiles();
    };
    init();
  }, [refreshWorkspaceFiles, refreshOutputFiles]);

  const toggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await opfsService.importFile(file);
      }
      await refreshWorkspaceFiles();
    } catch {
      // upload failed
    } finally {
      setUploading(false);
    }
  }, [refreshWorkspaceFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileClick = useCallback(async (path: string, source: 'workspace' | 'outputs') => {
    try {
      const content = source === 'workspace'
        ? await opfsService.readFile(path)
        : await opfsService.readOutput(path);
      const name = path.split('/').pop() || path;
      setPreviewFile({ name, content, source });
    } catch {
      // file read failed
    }
  }, [setPreviewFile]);

  const handleDeleteFile = useCallback(async (path: string) => {
    try {
      await opfsService.deleteFile(path);
      await refreshWorkspaceFiles();
      if (previewFile?.name === path.split('/').pop()) {
        setPreviewFile(null);
      }
    } catch {
      // delete failed
    }
  }, [refreshWorkspaceFiles, previewFile, setPreviewFile]);

  const handleDeleteDir = useCallback(async (path: string) => {
    try {
      await opfsService.deleteDirectory(path);
      await refreshWorkspaceFiles();
    } catch {
      // delete failed
    }
  }, [refreshWorkspaceFiles]);

  const handleClearWorkspace = useCallback(async () => {
    if (!window.confirm(t('files.confirmClearWorkspace'))) return;
    try {
      await opfsService.clearWorkspace();
      await refreshWorkspaceFiles();
      setPreviewFile(null);
    } catch {
      // clear failed
    }
  }, [refreshWorkspaceFiles, setPreviewFile, t]);

  const handleClearOutputs = useCallback(async () => {
    if (!window.confirm(t('files.confirmClearOutputs'))) return;
    try {
      await opfsService.clearOutputs();
      await refreshOutputFiles();
      if (previewFile?.source === 'outputs') {
        setPreviewFile(null);
      }
    } catch {
      // clear failed
    }
  }, [refreshOutputFiles, previewFile, setPreviewFile, t]);

  const handleDownloadZip = useCallback(async (source: 'workspace' | 'outputs') => {
    try {
      const files = source === 'workspace'
        ? await opfsService.getAllWorkspaceFiles()
        : await opfsService.getAllOutputFiles();
      if (files.length === 0) return;

      const zip = new JSZip();
      for (const file of files) {
        zip.file(file.path, file.content);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${source}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // download failed
    }
  }, []);

  const opfsWarning = opfsService.initialized && !opfsService.usingOPFS;

  const workspaceTree = buildTree(workspaceFiles);

  return (
    <div className="p-3">
      {opfsWarning && (
        <div className="mb-2 p-2 bg-yellow-900/30 border border-yellow-700 rounded-lg text-xs text-yellow-300">
          ⚠ {t('files.opfsWarning')}
        </div>
      )}

      {/* Workspace Section */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase">
            📁 {t('files.workspace')} ({workspaceFiles.filter(f => f.kind === 'file').length})
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleDownloadZip('workspace')}
              disabled={workspaceFiles.length === 0}
              className="text-xs text-purple-400 hover:text-purple-300 disabled:text-slate-600 disabled:cursor-not-allowed transition"
              title={t('files.downloadZip')}
            >
              📦
            </button>
            <button
              onClick={handleClearWorkspace}
              disabled={workspaceFiles.length === 0}
              className="text-xs text-red-400 hover:text-red-300 disabled:text-slate-600 disabled:cursor-not-allowed transition"
              title={t('files.clearAll')}
            >
              🗑️
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs text-purple-400 hover:text-purple-300 transition"
            >
              📤 {t('files.upload')}
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />

        <div
          className="min-h-[40px] border border-dashed border-slate-700 rounded-lg p-1"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {workspaceFiles.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-2">
              {t('files.dropHint')}
            </p>
          ) : (
            <div className="space-y-0.5">
              {workspaceTree.map((node) => (
                <FileTreeItem
                  key={node.path}
                  node={node}
                  depth={0}
                  expandedDirs={expandedDirs}
                  toggleDir={toggleDir}
                  onFileClick={(p) => handleFileClick(p, 'workspace')}
                  onDeleteFile={handleDeleteFile}
                  onDeleteDir={handleDeleteDir}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Saved Outputs Section */}
      <div>
        <div
          className="flex items-center justify-between mb-2 cursor-pointer"
          onClick={() => setOutputsCollapsed(!outputsCollapsed)}
        >
          <h3 className="text-xs font-semibold text-slate-400 uppercase">
            <span className={`inline-block transition-transform text-[10px] ${outputsCollapsed ? '' : 'rotate-90'}`}>▶</span>
            {' '}{t('files.savedOutputs')} ({outputFiles.length})
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); handleDownloadZip('outputs'); }}
              disabled={outputFiles.length === 0}
              className="text-xs text-purple-400 hover:text-purple-300 disabled:text-slate-600 disabled:cursor-not-allowed transition"
              title={t('files.downloadZip')}
            >
              📦
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleClearOutputs(); }}
              disabled={outputFiles.length === 0}
              className="text-xs text-red-400 hover:text-red-300 disabled:text-slate-600 disabled:cursor-not-allowed transition"
              title={t('files.clearOutputs')}
            >
              🗑️
            </button>
          </div>
        </div>
        {!outputsCollapsed && (
          <div className="border border-slate-700 rounded-lg p-1">
            {outputFiles.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-2">
                {t('files.outputsEmpty')}
              </p>
            ) : (
              <div className="space-y-0.5">
                {outputFiles.map((f) => (
                  <div
                    key={f.path}
                    className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-slate-800 rounded px-1 py-0.5"
                    onClick={() => handleFileClick(f.path, 'outputs')}
                  >
                    <span>📋</span>
                    <span className="text-slate-300 flex-1 truncate">{f.name}</span>
                    {f.size !== undefined && (
                      <span className="text-slate-600 text-[10px]">{formatSize(f.size)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setPreviewFile(null)}
          />
          <div className="relative bg-slate-800 border border-slate-700 rounded-lg w-[600px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
              <h3 className="text-sm text-white font-medium truncate">
                {previewFile.source === 'outputs' ? '📋' : '📄'} {previewFile.name}
              </h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">
                {previewFile.content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

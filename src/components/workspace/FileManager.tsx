import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../../store';
import { opfsService } from '../../core/storage/opfs';

export default function FileManager() {
  const {
    workspaceFiles,
    outputFiles,
    refreshWorkspaceFiles,
    refreshOutputFiles,
    previewFile,
    setPreviewFile,
  } = useAppStore();

  const [outputsCollapsed, setOutputsCollapsed] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  const opfsWarning = opfsService.initialized && !opfsService.usingOPFS;

  return (
    <div className="p-3">
      {opfsWarning && (
        <div className="mb-2 p-2 bg-yellow-900/30 border border-yellow-700 rounded text-xs text-yellow-300">
          ⚠ OPFS not supported. Files stored in memory only — lost on refresh.
        </div>
      )}

      {/* Workspace Section */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase">
            📁 Workspace ({workspaceFiles.length})
          </h3>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs text-purple-400 hover:text-purple-300 transition"
          >
            📤 Upload
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />

        <div
          className="min-h-[40px] border border-dashed border-slate-700 rounded p-1"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {workspaceFiles.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-2">
              Drop files here or click Upload
            </p>
          ) : (
            <div className="space-y-0.5">
              {workspaceFiles.map((f) => (
                <div
                  key={f.path}
                  className="flex items-center gap-1.5 text-xs group cursor-pointer hover:bg-slate-800 rounded px-1 py-0.5"
                  onClick={() => handleFileClick(f.path, 'workspace')}
                >
                  <span>{f.kind === 'directory' ? '📁' : '📄'}</span>
                  <span className="text-slate-300 flex-1 truncate">{f.path}</span>
                  {f.size !== undefined && (
                    <span className="text-slate-600 text-[10px]">{formatSize(f.size)}</span>
                  )}
                  {f.kind === 'file' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteFile(f.path); }}
                      className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-[10px]"
                      title="Delete"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Agent Outputs Section */}
      <div>
        <div
          className="flex items-center justify-between mb-2 cursor-pointer"
          onClick={() => setOutputsCollapsed(!outputsCollapsed)}
        >
          <h3 className="text-xs font-semibold text-slate-400 uppercase">
            <span className={`inline-block transition-transform ${outputsCollapsed ? '' : 'rotate-90'}`}>▶</span>
            {' '}Agent Outputs ({outputFiles.length})
          </h3>
        </div>
        {!outputsCollapsed && (
          <div className="border border-slate-700 rounded p-1">
            {outputFiles.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-2">
                Execute pipeline to see outputs
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

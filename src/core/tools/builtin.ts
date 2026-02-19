import { opfsService } from '../storage/opfs';

export const BUILTIN_TOOL_NAMES = [
  'file_read',
  'file_write',
  'file_list',
  'file_delete',
  'python_workspace_tool',
  'webpage_build_preview_tool',
] as const;

export type BuiltinToolName = typeof BUILTIN_TOOL_NAMES[number];

export interface ToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string; default?: unknown }>;
      required: string[];
    };
  };
}

export const BUILTIN_TOOL_SCHEMAS: ToolSchema[] = [
  {
    type: 'function',
    function: {
      name: 'file_read',
      description: 'Read the content of a file from the workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path relative to workspace root (e.g., "report.md", "src/index.ts")',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'file_write',
      description: 'Write content to a file in the workspace. Creates parent directories automatically.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path relative to workspace root',
          },
          content: {
            type: 'string',
            description: 'The text content to write',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'file_list',
      description: 'List files and directories in the workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path relative to workspace root. Defaults to root "."',
            default: '.',
          },
          recursive: {
            type: 'boolean',
            description: 'If true, list all files recursively. Default false.',
            default: false,
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'file_delete',
      description: 'Delete a file from the workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path relative to workspace root to delete.',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'python_workspace_tool',
      description: 'Execute Python code in a sandbox limited to /workspace files only.',
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Python code to execute.',
          },
        },
        required: ['code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'webpage_build_preview_tool',
      description: 'Build and generate a local preview URL for an HTML file in /workspace.',
      parameters: {
        type: 'object',
        properties: {
          entryPath: {
            type: 'string',
            description: 'HTML file path relative to workspace root (e.g., "site/index.html").',
          },
          title: {
            type: 'string',
            description: 'Optional page title for UI display.',
          },
        },
        required: ['entryPath'],
      },
    },
  },
];

export async function executeBuiltinTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case 'file_read': {
      const path = String(args.path || '');
      if (!path) return 'Error: path is required';
      try {
        const content = await opfsService.readFile(path);
        return content;
      } catch (err) {
        return `Error reading file "${path}": ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    case 'file_write': {
      const path = String(args.path || '');
      const content = String(args.content ?? '');
      if (!path) return 'Error: path is required';
      try {
        await opfsService.writeFile(path, content);
        return `Successfully wrote ${content.length} characters to "${path}"`;
      } catch (err) {
        return `Error writing file "${path}": ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    case 'file_list': {
      const path = String(args.path || '.');
      const recursive = Boolean(args.recursive);
      try {
        const entries = await opfsService.listDirectory(path, recursive);
        if (entries.length === 0) {
          return 'Directory is empty';
        }
        return JSON.stringify(entries, null, 2);
      } catch (err) {
        return `Error listing directory "${path}": ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    case 'file_delete': {
      const path = String(args.path || '');
      if (!path) return 'Error: path is required';
      try {
        await opfsService.deleteFile(path);
        return `Successfully deleted "${path}"`;
      } catch (err) {
        return `Error deleting file "${path}": ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    case 'python_workspace_tool': {
      const code = String(args.code || '');
      if (!code.trim()) return 'Error: code is required';
      try {
        await pythonWorkspaceRunner.init();
        const result = await pythonWorkspaceRunner.run(code);
        return JSON.stringify(result, null, 2);
      } catch (err) {
        return `Error executing python_workspace_tool: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    case 'webpage_build_preview_tool': {
      const entryPath = String(args.entryPath || '');
      const title = String(args.title || '');
      if (!entryPath) return 'Error: entryPath is required';
      try {
        const preview = await buildWorkspacePagePreview(entryPath, title);
        return JSON.stringify(preview);
      } catch (err) {
        return JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : String(err),
          entryPath,
          timestamp: Date.now(),
        });
      }
    }

    default:
      return `Unknown built-in tool: ${name}`;
  }
}

export function getToolSchemasForAgent(agentTools: string[]): ToolSchema[] {
  return BUILTIN_TOOL_SCHEMAS.filter((schema) =>
    agentTools.includes(schema.function.name),
  );
}

export function isBuiltinTool(name: string): boolean {
  return (BUILTIN_TOOL_NAMES as readonly string[]).includes(name);
}

interface PyodideGlobal {
  loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideInstance>;
}

interface PyodideFSNode {
  mode: number;
}

interface PyodideFS {
  mkdirTree: (path: string) => void;
  analyzePath: (path: string) => { exists: boolean; object?: PyodideFSNode };
  readdir: (path: string) => string[];
  isDir: (mode: number) => boolean;
  readFile: (path: string, opts: { encoding: 'utf8' }) => string;
  writeFile: (path: string, content: string) => void;
  unlink: (path: string) => void;
  rmdir: (path: string) => void;
}

interface PyodideInstance {
  FS: PyodideFS;
  runPythonAsync: (code: string) => Promise<unknown>;
}

class PythonWorkspaceRunner {
  private pyodide: PyodideInstance | null = null;
  private initPromise: Promise<void> | null = null;
  private readonly indexURL = 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/';
  private readonly scriptURL = 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.js';

  async init(): Promise<void> {
    if (this.pyodide) return;
    if (!this.initPromise) {
      this.initPromise = this.load();
    }
    await this.initPromise;
  }

  async run(code: string): Promise<Record<string, unknown>> {
    if (!this.pyodide) {
      throw new Error('Python runtime not initialized');
    }

    await this.syncWorkspaceToPython();
    const escapedCode = JSON.stringify(code);
    const rawResult = await this.pyodide.runPythonAsync(`
import builtins
import io
import json
import os
import traceback

WORKSPACE_ROOT = "/workspace"
os.makedirs(WORKSPACE_ROOT, exist_ok=True)
os.chdir(WORKSPACE_ROOT)

_real_open = builtins.open
_real_remove = os.remove
_real_unlink = os.unlink
_real_mkdir = os.mkdir
_real_makedirs = os.makedirs
_real_rmdir = os.rmdir
_real_rename = os.rename
_real_replace = os.replace
_real_listdir = os.listdir
_real_scandir = os.scandir
_real_stat = os.stat

def _safe_abs(path):
    candidate = path if os.path.isabs(path) else os.path.join(WORKSPACE_ROOT, path)
    resolved = os.path.abspath(candidate)
    if resolved != WORKSPACE_ROOT and not resolved.startswith(WORKSPACE_ROOT + "/"):
        raise PermissionError(f"Path outside workspace is not allowed: {path}")
    return resolved

def _safe_open(path, *args, **kwargs):
    return _real_open(_safe_abs(path), *args, **kwargs)

def _safe_remove(path):
    return _real_remove(_safe_abs(path))

def _safe_unlink(path):
    return _real_unlink(_safe_abs(path))

def _safe_mkdir(path, mode=0o777):
    return _real_mkdir(_safe_abs(path), mode)

def _safe_makedirs(path, mode=0o777, exist_ok=False):
    return _real_makedirs(_safe_abs(path), mode, exist_ok)

def _safe_rmdir(path):
    return _real_rmdir(_safe_abs(path))

def _safe_rename(src, dst):
    return _real_rename(_safe_abs(src), _safe_abs(dst))

def _safe_replace(src, dst):
    return _real_replace(_safe_abs(src), _safe_abs(dst))

def _safe_listdir(path="."):
    return _real_listdir(_safe_abs(path))

def _safe_scandir(path="."):
    return _real_scandir(_safe_abs(path))

def _safe_stat(path, *args, **kwargs):
    return _real_stat(_safe_abs(path), *args, **kwargs)

builtins.open = _safe_open
os.remove = _safe_remove
os.unlink = _safe_unlink
os.mkdir = _safe_mkdir
os.makedirs = _safe_makedirs
os.rmdir = _safe_rmdir
os.rename = _safe_rename
os.replace = _safe_replace
os.listdir = _safe_listdir
os.scandir = _safe_scandir
os.stat = _safe_stat

_code = ${escapedCode}
_stdout = io.StringIO()
_stderr = io.StringIO()
_old_stdout, _old_stderr = __import__('sys').stdout, __import__('sys').stderr
__import__('sys').stdout, __import__('sys').stderr = _stdout, _stderr
_ok = True
_error = ""
try:
    exec(_code, {"__name__": "__main__"})
except Exception:
    _ok = False
    _error = traceback.format_exc()
finally:
    __import__('sys').stdout, __import__('sys').stderr = _old_stdout, _old_stderr

json.dumps({
    "success": _ok,
    "stdout": _stdout.getvalue(),
    "stderr": _stderr.getvalue(),
    "error": _error
})
`);

    await this.syncPythonToWorkspace();

    const parsed = JSON.parse(String(rawResult)) as Record<string, unknown>;
    return {
      ...parsed,
      workspaceRoot: '/workspace',
      timestamp: Date.now(),
    };
  }

  private async load(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('python_workspace_tool only runs in browser');
    }

    if (!(window as PyodideGlobal).loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = this.scriptURL;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Pyodide runtime'));
        document.head.appendChild(script);
      });
    }

    const loadPyodide = (window as PyodideGlobal).loadPyodide;
    if (!loadPyodide) {
      throw new Error('Pyodide loader is unavailable');
    }

    this.pyodide = await loadPyodide({ indexURL: this.indexURL });
  }

  private ensureWorkspaceDir(): void {
    if (!this.pyodide) return;
    const analyzed = this.pyodide.FS.analyzePath('/workspace');
    if (!analyzed.exists) {
      this.pyodide.FS.mkdirTree('/workspace');
    }
  }

  private clearPythonWorkspace(): void {
    if (!this.pyodide) return;
    this.ensureWorkspaceDir();
    this.clearPythonDirectory('/workspace');
  }

  private clearPythonDirectory(dirPath: string): void {
    if (!this.pyodide) return;
    const entries = this.pyodide.FS.readdir(dirPath).filter((name) => name !== '.' && name !== '..');
    for (const name of entries) {
      const childPath = `${dirPath}/${name}`;
      const child = this.pyodide.FS.analyzePath(childPath);
      if (child.exists && child.object && this.pyodide.FS.isDir(child.object.mode)) {
        this.clearPythonDirectory(childPath);
        this.pyodide.FS.rmdir(childPath);
      } else if (child.exists) {
        this.pyodide.FS.unlink(childPath);
      }
    }
  }

  private async syncWorkspaceToPython(): Promise<void> {
    if (!this.pyodide) return;
    this.clearPythonWorkspace();
    const files = await opfsService.getAllWorkspaceFiles();
    for (const file of files) {
      const pyPath = `/workspace/${file.path}`;
      const parent = pyPath.split('/').slice(0, -1).join('/');
      if (parent) {
        this.pyodide.FS.mkdirTree(parent);
      }
      this.pyodide.FS.writeFile(pyPath, file.content);
    }
  }

  private async syncPythonToWorkspace(): Promise<void> {
    if (!this.pyodide) return;
    const files = this.collectPythonWorkspaceFiles('/workspace');
    await opfsService.clearWorkspace();
    for (const file of files) {
      await opfsService.writeFile(file.path, file.content);
    }
  }

  private collectPythonWorkspaceFiles(dirPath: string): { path: string; content: string }[] {
    if (!this.pyodide) return [];
    const results: { path: string; content: string }[] = [];
    const entries = this.pyodide.FS.readdir(dirPath).filter((name) => name !== '.' && name !== '..');
    for (const name of entries) {
      const childPath = `${dirPath}/${name}`;
      const analyzed = this.pyodide.FS.analyzePath(childPath);
      if (!analyzed.exists || !analyzed.object) continue;
      if (this.pyodide.FS.isDir(analyzed.object.mode)) {
        results.push(...this.collectPythonWorkspaceFiles(childPath));
      } else {
        const relative = childPath.replace(/^\/workspace\/?/, '');
        const content = this.pyodide.FS.readFile(childPath, { encoding: 'utf8' });
        results.push({ path: relative, content });
      }
    }
    return results;
  }
}

const pythonWorkspaceRunner = new PythonWorkspaceRunner();

function toWorkspaceRelativePath(path: string): string {
  const normalized = path.replace(/^\/+/, '');
  const withoutWorkspacePrefix = normalized.startsWith('workspace/')
    ? normalized.slice('workspace/'.length)
    : normalized;
  if (!withoutWorkspacePrefix || withoutWorkspacePrefix.includes('..')) {
    throw new Error(`Invalid workspace path: ${path}`);
  }
  return withoutWorkspacePrefix;
}

function resolveRelativePath(basePath: string, relativePath: string): string {
  const baseParts = basePath.split('/').slice(0, -1);
  const relParts = relativePath.split('/');
  const stack = [...baseParts];
  for (const part of relParts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  const resolved = stack.join('/');
  if (!resolved || resolved.includes('..')) {
    throw new Error(`Invalid relative path: ${relativePath}`);
  }
  return resolved;
}

function shouldInlineAsset(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('http://') || url.startsWith('https://')) return false;
  if (url.startsWith('data:') || url.startsWith('blob:')) return false;
  if (url.startsWith('#')) return false;
  return true;
}

async function buildWorkspacePagePreview(entryPathArg: string, titleArg: string): Promise<Record<string, unknown>> {
  if (typeof window === 'undefined') {
    throw new Error('webpage_build_preview_tool only runs in browser');
  }
  const entryPath = toWorkspaceRelativePath(entryPathArg);
  if (!entryPath.endsWith('.html')) {
    throw new Error('entryPath must point to an .html file');
  }

  let html = await opfsService.readFile(entryPath);
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const stylesheetLinks = Array.from(doc.querySelectorAll('link[rel="stylesheet"][href]'));
  for (const link of stylesheetLinks) {
    const href = link.getAttribute('href') || '';
    if (!shouldInlineAsset(href)) continue;
    try {
      const cssPath = resolveRelativePath(entryPath, href);
      const cssContent = await opfsService.readFile(cssPath);
      const styleEl = doc.createElement('style');
      styleEl.setAttribute('data-inline-from', cssPath);
      styleEl.textContent = cssContent;
      link.replaceWith(styleEl);
    } catch {
      // Keep original link if asset cannot be inlined
    }
  }

  const scripts = Array.from(doc.querySelectorAll('script[src]'));
  for (const script of scripts) {
    const src = script.getAttribute('src') || '';
    if (!shouldInlineAsset(src)) continue;
    try {
      const scriptPath = resolveRelativePath(entryPath, src);
      const scriptContent = await opfsService.readFile(scriptPath);
      script.removeAttribute('src');
      script.textContent = scriptContent;
      script.setAttribute('data-inline-from', scriptPath);
    } catch {
      // Keep original script if asset cannot be inlined
    }
  }

  html = '<!doctype html>\n' + doc.documentElement.outerHTML;
  const blob = new Blob([html], { type: 'text/html' });
  const previewUrl = URL.createObjectURL(blob);
  const title = titleArg || doc.title || entryPath;

  return {
    success: true,
    title,
    entryPath,
    previewUrl,
    timestamp: Date.now(),
  };
}

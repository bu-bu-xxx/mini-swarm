export interface FileEntry {
  name: string;
  path: string;
  kind: 'file' | 'directory';
  size?: number;
}

export interface ExecutionMeta {
  designId: string;
  taskDescription: string;
  modelUsed: string;
  startedAt: number;
  completedAt: number;
  agents: { name: string; role: string; status: string }[];
}

function validatePath(path: string): void {
  if (path.includes('..')) {
    throw new Error(`Invalid path: "${path}" — directory traversal is not allowed`);
  }
}

function normalizePath(path: string): string {
  return path.replace(/^\/+/, '').replace(/\/+$/, '');
}

async function ensureParentDirs(
  root: FileSystemDirectoryHandle,
  filePath: string,
): Promise<FileSystemDirectoryHandle> {
  const parts = filePath.split('/');
  parts.pop(); // remove filename
  let current = root;
  for (const part of parts) {
    if (part) {
      current = await current.getDirectoryHandle(part, { create: true });
    }
  }
  return current;
}

function getFileName(filePath: string): string {
  const parts = filePath.split('/');
  return parts[parts.length - 1];
}

// FileSystemDirectoryHandle.entries() is not always in TS typings
function dirEntries(dir: FileSystemDirectoryHandle): AsyncIterable<[string, FileSystemHandle]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (dir as any).entries();
}

async function listRecursive(
  dir: FileSystemDirectoryHandle,
  prefix: string,
): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];
  for await (const [name, handle] of dirEntries(dir)) {
    const entryPath = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === 'file') {
      const file = await (handle as FileSystemFileHandle).getFile();
      entries.push({ name, path: entryPath, kind: 'file', size: file.size });
    } else {
      entries.push({ name, path: entryPath, kind: 'directory' });
      const subEntries = await listRecursive(handle as FileSystemDirectoryHandle, entryPath);
      entries.push(...subEntries);
    }
  }
  return entries;
}

async function removeDirectoryRecursive(
  parent: FileSystemDirectoryHandle,
  name: string,
): Promise<void> {
  try {
    await parent.removeEntry(name, { recursive: true });
  } catch {
    // entry may not exist
  }
}

/**
 * In-memory fallback when OPFS is not supported.
 */
class MemoryFS {
  private files = new Map<string, string>();

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) throw new Error(`File not found: ${path}`);
    return content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async deleteFile(path: string): Promise<void> {
    this.files.delete(path);
  }

  async listDirectory(dirPath: string, recursive: boolean): Promise<FileEntry[]> {
    const prefix = dirPath === '.' || dirPath === '' ? '' : dirPath;
    const entries: FileEntry[] = [];
    const seen = new Set<string>();

    for (const [filePath] of this.files) {
      const rel = prefix ? (filePath.startsWith(prefix + '/') ? filePath.slice(prefix.length + 1) : null) : filePath;
      if (rel === null) continue;

      if (recursive) {
        entries.push({ name: rel.split('/').pop()!, path: filePath, kind: 'file' });
      } else {
        const parts = rel.split('/');
        if (parts.length === 1) {
          entries.push({ name: parts[0], path: filePath, kind: 'file' });
        } else {
          const dirName = parts[0];
          const dirFullPath = prefix ? `${prefix}/${dirName}` : dirName;
          if (!seen.has(dirFullPath)) {
            seen.add(dirFullPath);
            entries.push({ name: dirName, path: dirFullPath, kind: 'directory' });
          }
        }
      }
    }
    return entries;
  }

  async fileExists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  clear(): void {
    this.files.clear();
  }

  clearPrefix(prefix: string): void {
    for (const key of this.files.keys()) {
      if (key.startsWith(prefix)) {
        this.files.delete(key);
      }
    }
  }
}

export class OPFSService {
  private root: FileSystemDirectoryHandle | null = null;
  private workspaceMemory = new MemoryFS();
  private outputsMemory = new MemoryFS();
  private _supported = false;
  private _initialized = false;

  isSupported(): boolean {
    return typeof navigator !== 'undefined' &&
      typeof navigator.storage !== 'undefined' &&
      typeof navigator.storage.getDirectory === 'function';
  }

  async init(): Promise<void> {
    if (this._initialized) return;
    if (this.isSupported()) {
      try {
        this.root = await navigator.storage.getDirectory();
        // Ensure workspace and outputs dirs exist
        await this.root.getDirectoryHandle('workspace', { create: true });
        await this.root.getDirectoryHandle('outputs', { create: true });
        this._supported = true;
      } catch {
        this._supported = false;
      }
    }
    this._initialized = true;
  }

  get initialized(): boolean {
    return this._initialized;
  }

  get usingOPFS(): boolean {
    return this._supported;
  }

  // ── /workspace operations (for Agent tools) ──

  async readFile(path: string): Promise<string> {
    validatePath(path);
    const normalized = normalizePath(path);
    await this.init();

    if (!this._supported) {
      return this.workspaceMemory.readFile(normalized);
    }

    const wsDir = await this.root!.getDirectoryHandle('workspace');
    const parentDir = await this.navigateTo(wsDir, normalized);
    const fileName = getFileName(normalized);
    const fileHandle = await parentDir.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return file.text();
  }

  async writeFile(path: string, content: string): Promise<void> {
    validatePath(path);
    const normalized = normalizePath(path);
    await this.init();

    if (!this._supported) {
      this.workspaceMemory.writeFile(normalized, content);
      return;
    }

    const wsDir = await this.root!.getDirectoryHandle('workspace');
    const parentDir = await ensureParentDirs(wsDir, normalized);
    const fileName = getFileName(normalized);
    const fileHandle = await parentDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async deleteFile(path: string): Promise<void> {
    validatePath(path);
    const normalized = normalizePath(path);
    await this.init();

    if (!this._supported) {
      this.workspaceMemory.deleteFile(normalized);
      return;
    }

    const wsDir = await this.root!.getDirectoryHandle('workspace');
    const parentDir = await this.navigateTo(wsDir, normalized);
    const fileName = getFileName(normalized);
    await parentDir.removeEntry(fileName);
  }

  async listDirectory(path?: string, recursive?: boolean): Promise<FileEntry[]> {
    const normalized = normalizePath(path || '.');
    await this.init();

    if (!this._supported) {
      return this.workspaceMemory.listDirectory(normalized === '.' ? '' : normalized, recursive || false);
    }

    let dir = await this.root!.getDirectoryHandle('workspace');
    if (normalized && normalized !== '.') {
      const parts = normalized.split('/');
      for (const part of parts) {
        dir = await dir.getDirectoryHandle(part);
      }
    }

    if (recursive) {
      return listRecursive(dir, normalized === '.' ? '' : normalized);
    }

    const entries: FileEntry[] = [];
    for await (const [name, handle] of dirEntries(dir)) {
      const entryPath = normalized === '.' || normalized === '' ? name : `${normalized}/${name}`;
      if (handle.kind === 'file') {
        const file = await (handle as FileSystemFileHandle).getFile();
        entries.push({ name, path: entryPath, kind: 'file', size: file.size });
      } else {
        entries.push({ name, path: entryPath, kind: 'directory' });
      }
    }
    return entries;
  }

  async fileExists(path: string): Promise<boolean> {
    validatePath(path);
    const normalized = normalizePath(path);
    await this.init();

    if (!this._supported) {
      return this.workspaceMemory.fileExists(normalized);
    }

    try {
      const wsDir = await this.root!.getDirectoryHandle('workspace');
      const parentDir = await this.navigateTo(wsDir, normalized);
      const fileName = getFileName(normalized);
      await parentDir.getFileHandle(fileName);
      return true;
    } catch {
      return false;
    }
  }

  // ── /outputs operations (for PipelineEngine auto-persistence) ──

  async saveAgentOutput(agentName: string, content: string): Promise<void> {
    const fileName = `${agentName}.md`;
    await this.init();

    if (!this._supported) {
      this.outputsMemory.writeFile(fileName, content);
      return;
    }

    const outDir = await this.root!.getDirectoryHandle('outputs');
    const fileHandle = await outDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async saveExecutionMeta(meta: ExecutionMeta): Promise<void> {
    const content = JSON.stringify(meta, null, 2);
    await this.init();

    if (!this._supported) {
      this.outputsMemory.writeFile('_meta.json', content);
      return;
    }

    const outDir = await this.root!.getDirectoryHandle('outputs');
    const fileHandle = await outDir.getFileHandle('_meta.json', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async clearOutputs(): Promise<void> {
    await this.init();

    if (!this._supported) {
      this.outputsMemory.clear();
      return;
    }

    const outDir = await this.root!.getDirectoryHandle('outputs');
    const names: string[] = [];
    for await (const [name] of dirEntries(outDir)) {
      names.push(name);
    }
    for (const name of names) {
      await removeDirectoryRecursive(outDir, name);
    }
  }

  async listOutputs(): Promise<FileEntry[]> {
    await this.init();

    if (!this._supported) {
      return this.outputsMemory.listDirectory('', false);
    }

    const outDir = await this.root!.getDirectoryHandle('outputs');
    const entries: FileEntry[] = [];
    for await (const [name, handle] of dirEntries(outDir)) {
      if (handle.kind === 'file') {
        const file = await (handle as FileSystemFileHandle).getFile();
        entries.push({ name, path: name, kind: 'file', size: file.size });
      }
    }
    return entries;
  }

  async readOutput(filename: string): Promise<string> {
    validatePath(filename);
    await this.init();

    if (!this._supported) {
      return this.outputsMemory.readFile(filename);
    }

    const outDir = await this.root!.getDirectoryHandle('outputs');
    const fileHandle = await outDir.getFileHandle(filename);
    const file = await fileHandle.getFile();
    return file.text();
  }

  // ── User upload (writes to /workspace) ──

  async importFile(file: File, targetPath?: string): Promise<void> {
    const path = targetPath || file.name;
    const content = await file.text();
    await this.writeFile(path, content);
  }

  async clearWorkspace(): Promise<void> {
    await this.init();

    if (!this._supported) {
      this.workspaceMemory.clear();
      return;
    }

    const wsDir = await this.root!.getDirectoryHandle('workspace');
    const names: string[] = [];
    for await (const [name] of dirEntries(wsDir)) {
      names.push(name);
    }
    for (const name of names) {
      await removeDirectoryRecursive(wsDir, name);
    }
  }

  /** Returns all files (recursively) with their content, for ZIP export. */
  async getAllWorkspaceFiles(): Promise<{ path: string; content: string }[]> {
    await this.init();
    const entries = await this.listDirectory('.', true);
    const files: { path: string; content: string }[] = [];
    for (const entry of entries) {
      if (entry.kind === 'file') {
        try {
          const content = await this.readFile(entry.path);
          files.push({ path: entry.path, content });
        } catch { /* skip unreadable */ }
      }
    }
    return files;
  }

  /** Returns all output files with their content, for ZIP export. */
  async getAllOutputFiles(): Promise<{ path: string; content: string }[]> {
    await this.init();
    const entries = await this.listOutputs();
    const files: { path: string; content: string }[] = [];
    for (const entry of entries) {
      if (entry.kind === 'file') {
        try {
          const content = await this.readOutput(entry.path);
          files.push({ path: entry.path, content });
        } catch { /* skip unreadable */ }
      }
    }
    return files;
  }

  // ── Internal helpers ──

  private async navigateTo(
    root: FileSystemDirectoryHandle,
    filePath: string,
  ): Promise<FileSystemDirectoryHandle> {
    const parts = filePath.split('/');
    parts.pop(); // remove filename
    let current = root;
    for (const part of parts) {
      if (part) {
        current = await current.getDirectoryHandle(part);
      }
    }
    return current;
  }
}

// Singleton
export const opfsService = new OPFSService();

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false });
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export async function exportDesignAsJSON(design: unknown): Promise<void> {
  const json = JSON.stringify(design, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `autoswarm_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importDesignFromJSON(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return reject(new Error('No file selected'));
      try {
        const text = await file.text();
        resolve(JSON.parse(text));
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}

import type { SwarmDesign } from '../types';

interface SwarmDesignLike {
  id: string;
  taskDescription: string;
  topology: {
    nodes: { id: string; name: string }[];
    edges: { id: string; source: string; target: string }[];
    parallelGroups: string[][];
  };
  todos: { id: string; description: string }[];
  [key: string]: unknown;
}

export function isValidSwarmDesign(data: unknown): data is SwarmDesign {
  if (!data || typeof data !== 'object') return false;
  const d = data as SwarmDesignLike;
  if (typeof d.id !== 'string' || typeof d.taskDescription !== 'string') return false;
  if (!d.topology || typeof d.topology !== 'object') return false;
  const topo = d.topology;
  if (!Array.isArray(topo.nodes) || !Array.isArray(topo.edges) || !Array.isArray(topo.parallelGroups)) return false;
  if (!Array.isArray(d.todos)) return false;
  return true;
}

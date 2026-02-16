import { opfsService } from '../storage/opfs';

export const BUILTIN_TOOL_NAMES = ['file_read', 'file_write', 'file_list', 'file_delete'] as const;

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

export interface YosysWorkerRequest {
  id: number;
  args: string[];
  files: Record<string, string>;
}

export type YosysWorkerResponse =
  | { id: number; type: 'load-progress'; done: number; total: number }
  | { id: number; type: 'load-error'; message: string }
  | { id: number; type: 'synthesizing' }
  | { id: number; type: 'result'; outputJson: string | null; stdout: string; stderr: string }
  | { id: number; type: 'error'; message: string; stdout: string; stderr: string };

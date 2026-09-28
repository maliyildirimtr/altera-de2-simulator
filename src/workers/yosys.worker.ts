// ============================================================
// yosys.worker.ts — runs Yosys off the main thread.
//
// @yowasp/yosys executes synchronously on whatever thread calls it. On the
// main thread that froze the whole page for the length of a synthesis run
// (and the progress bar with it). Here it blocks only this worker.
// ============================================================
import { runYosys } from '@yowasp/yosys';
import type { YosysWorkerRequest, YosysWorkerResponse } from './yosys.worker.types';

function textStream(write: (text: string) => void): (bytes: Uint8Array | null) => void {
  const decoder = new TextDecoder();
  return (bytes) => {
    if (bytes === null) {
      const rest = decoder.decode();
      if (rest) write(rest);
      return;
    }
    write(decoder.decode(bytes, { stream: true }));
  };
}

const post = (message: YosysWorkerResponse) => (self as unknown as Worker).postMessage(message);

self.onmessage = async (event: MessageEvent<YosysWorkerRequest>) => {
  const { id, args, files } = event.data;
  let stdout = '';
  let stderr = '';

  try {
    await runYosys(undefined, undefined, {
      fetchProgress: ({ totalLength, doneLength }) => {
        post({ id, type: 'load-progress', done: doneLength, total: totalLength });
      },
    });
  } catch (err) {
    post({ id, type: 'load-error', message: (err as Error)?.message || 'Failed to load Yosys.' });
    return;
  }

  post({ id, type: 'synthesizing' });

  try {
    const result = (await runYosys(args, files, {
      stdout: textStream((text) => { stdout += text; }),
      stderr: textStream((text) => { stderr += text; }),
    })) as Record<string, string | Uint8Array> | undefined;
    const raw = result?.['output.json'];
    const outputJson = raw === undefined ? null : typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
    post({ id, type: 'result', outputJson, stdout, stderr });
  } catch (err) {
    post({ id, type: 'error', message: (err as Error)?.message || 'Yosys synthesis failed.', stdout, stderr });
  }
};

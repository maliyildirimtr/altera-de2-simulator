import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { decodeSharePayload, SHARE_PARAM, type SharePayload } from './shareLink';
import type { TargetTool } from './exampleHandoff';
import { markWorkspaceUser } from './exampleHandoff';

/**
 * Opens a project from a share link (`?p=…`) once, then strips the parameter
 * so a refresh uses the autosaved copy instead of re-importing.
 *
 * @param hasWork     whether the tool already holds a project the link would replace
 * @param apply       loads the shared project into the tool
 * @param onError     reports an unreadable link
 */
export function useSharedProject(
  tool: TargetTool,
  hasWork: () => boolean,
  apply: (payload: SharePayload) => void,
  onError: (message: string) => void,
): void {
  const location = useLocation();
  const navigate = useNavigate();
  // A cancelled run (StrictMode re-mount, route change) never applies or
  // prompts, because decoding is async and checked against `cancelled`.

  useEffect(() => {
    const encoded = new URLSearchParams(location.search).get(SHARE_PARAM);
    if (!encoded) return;
    let cancelled = false;

    decodeSharePayload(encoded)
      .then((payload) => {
        if (cancelled) return;
        if (payload.tool !== tool) throw new Error('This link is for a different tool.');
        if (hasWork() && !window.confirm('Open the shared project? It replaces the project currently open in this tool.')) {
          return;
        }
        apply(payload);
        markWorkspaceUser(tool);
      })
      .catch((err: Error) => {
        if (!cancelled) onError(`Could not open the shared project: ${err.message}`);
      })
      .finally(() => {
        if (!cancelled) navigate(location.pathname, { replace: true });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, tool]);
}

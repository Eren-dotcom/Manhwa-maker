import { useCallback, useState } from 'react';
import { useStudio } from '../store/studio';
import { runAction, type ActionId, type RunResult } from '../ai/engine';

/** One hook for every AI button: runs the action, applies the patch, toasts. */
export function useAction() {
  const { project, update, toast } = useStudio();
  const [busy, setBusy] = useState<ActionId | null>(null);

  const run = useCallback(
    async (action: ActionId, extra?: string): Promise<RunResult> => {
      setBusy(action);
      try {
        const result = await runAction(action, project, project.ai, extra);
        if (result.ok && result.apply) {
          update(result.apply);
          toast(result.message, 'ok');
        } else if (!result.ok) {
          toast(result.message, 'err');
        }
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Something went wrong';
        toast(message, 'err');
        return { ok: false, message };
      } finally {
        setBusy(null);
      }
    },
    [project, update, toast],
  );

  return { run, busy };
}

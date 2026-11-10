import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
export default function useMigrationRunner(jobId, onComplete) {
  const [commitState, setCommitState] = useState(null), [commitError, setCommitError] = useState(null);
  const [running, setRunning] = useState(false), [paused, setPaused] = useState(false);
  const timer = useRef(null), active = useRef(false), inFlight = useRef(false), generation = useRef(0);
  const attempts = useRef(0), streak = useRef(0), complete = useRef(onComplete);
  complete.current = onComplete;
  const stop = useCallback(() => { active.current = false; generation.current++; clearTimeout(timer.current); timer.current = null; setRunning(false); }, []);
  const start = useCallback(() => {
    if (inFlight.current || active.current) return;
    active.current = true; const run = ++generation.current; setRunning(true); setPaused(false); setCommitError(null);
    const next = async () => {
      if (!active.current || run !== generation.current) return;
      inFlight.current = true; let delay = 2000;
      try {
        const { data } = await base44.functions.invoke('migration-approve-and-run', { migrationJobId: jobId, action: 'commit_step' });
        if (!active.current || run !== generation.current) return;
        const result = await base44.functions.invoke('migration-approve-and-run', { migrationJobId: jobId, action: 'get_progress' });
        if (!active.current || run !== generation.current) return;
        setCommitState(result.data.progress);
        if (data.finished || result.data.status === 'completed') { stop(); complete.current?.(result.data.progress); return; }
        if (data.last_error) {
          setCommitError(data.last_error);
          if (data.paused) { stop(); setPaused(true); return; }
          attempts.current++; delay = Math.min(60000, 2000 * 2 ** Math.min(attempts.current, 5));
        } else { attempts.current = 0; setCommitError(null); delay = data.retry_after_ms || 2000; }
        if (++streak.current >= 3) { streak.current = 0; delay = Math.max(delay, 5000); }
      } catch (error) {
        if (!active.current || run !== generation.current) return;
        const status = error?.response?.status, message = error?.response?.data?.error || error.message;
        setCommitError(message);
        if (status && status !== 429 && status !== 408 && status < 500) { stop(); setPaused(true); return; }
        delay = Math.min(60000, 2000 * 2 ** Math.min(++attempts.current, 5));
      } finally { inFlight.current = false; }
      if (active.current && run === generation.current) timer.current = setTimeout(next, delay);
    };
    timer.current = setTimeout(next, 0);
  }, [jobId, stop]);
  useEffect(() => () => { active.current = false; generation.current++; clearTimeout(timer.current); }, [jobId]);
  return { commitState, setCommitState, commitError, running, paused, start, stop };
}
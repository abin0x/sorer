import { useEffect, useRef, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
export default function useCsvRunner(job, enabled, onProgress) {
  const [running, setRunning] = useState(false), [error, setError] = useState(null);
  const generation = useRef(0), timer = useRef(null), flight = useRef(false), update = useRef(onProgress);
  update.current = onProgress;
  const stop = useCallback(() => { generation.current++; clearTimeout(timer.current); setRunning(false); }, []);
  const start = useCallback(() => {
    if (flight.current) return;
    clearTimeout(timer.current); const run = ++generation.current; let retry = 0, burst = 0;
    setRunning(true); setError(null);
    const step = async () => {
      if (run !== generation.current) return;
      flight.current = true; let delay = 2000;
      try {
        const { data } = await base44.functions.invoke('migrationCsv', { migrationJobId: job.id, action: 'chunk' });
        if (run !== generation.current) return;
        if (data.job) update.current?.(data.job);
        if (data.finished) { stop(); return; }
        if (data.last_error) { setError(data.last_error); if (data.paused) { stop(); return; } retry++; delay = Math.max(data.retry_after_ms || 0, Math.min(60000, 2000 * 2 ** Math.min(retry, 5))); }
        else { retry = 0; setError(null); delay = data.retry_after_ms || 2000; }
        if (++burst === 3) { burst = 0; delay = Math.max(delay, 5000); }
      } catch (e) {
        if (run !== generation.current) return;
        const status = e?.response?.status;
        setError(e?.response?.data?.error || e.message);
        if (status && status !== 429 && status !== 408 && status < 500) { stop(); return; }
        delay = Math.min(60000, 2000 * 2 ** Math.min(++retry, 5));
      } finally { flight.current = false; }
      if (run === generation.current) timer.current = setTimeout(step, delay);
    };
    timer.current = setTimeout(step, 0);
  }, [job.id, stop]);
  useEffect(() => {
    if (enabled && !(job.commit_progress?.state === 'error' && !job.commit_progress?.retryable)) start();
    return () => { generation.current++; clearTimeout(timer.current); };
  }, [job.id, enabled, start]);
  return { running, error, start, stop };
}
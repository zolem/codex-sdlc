import { useEffect, useState } from 'react';
import { getMatches } from '@tauri-apps/plugin-cli';
import { RunPicker } from './components/RunPicker';
import { WalkthroughView } from './components/WalkthroughView';
import { discoverRuns } from './hooks/useTauri';
import { RunSummary } from './shared/types';

export default function App() {
  const [repoPath, setRepoPath] = useState<string | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const matches = await getMatches();
        const rp = matches.args['repo-path']?.value as string | undefined;
        if (!rp) {
          setError('No repo path provided. Usage: orchestrate-walkthrough <repo-path> [--run <slug>]');
          setLoading(false);
          return;
        }
        setRepoPath(rp);

        const discovered = await discoverRuns(rp);
        setRuns(discovered);

        const runArg = matches.args['run']?.value as string | undefined;
        if (runArg) {
          setSelectedSlug(runArg);
        } else if (discovered.length === 1) {
          setSelectedSlug(discovered[0].slug);
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!repoPath) {
    return (
      <div className="error-screen">
        <h2>No repository specified</h2>
        <p>Launch with: orchestrate-walkthrough &lt;repo-path&gt;</p>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="error-screen">
        <h2>No orchestrate runs found</h2>
        <p>Looking in <code>{repoPath}/.orchestrate/</code></p>
        <p className="error-hint">
          Start an orchestrate run with <code>/orchestrate</code>, then refresh.
        </p>
      </div>
    );
  }

  if (!selectedSlug) {
    return (
      <RunPicker
        runs={runs}
        onSelect={setSelectedSlug}
      />
    );
  }

  return (
    <WalkthroughView
      repoPath={repoPath}
      runs={runs}
      slug={selectedSlug}
      onSlugChange={setSelectedSlug}
    />
  );
}

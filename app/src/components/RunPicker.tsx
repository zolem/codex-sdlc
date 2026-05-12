import { RunSummary } from '../shared/types';

interface Props {
  runs: RunSummary[];
  onSelect: (slug: string) => void;
}

export function RunPicker({ runs, onSelect }: Props) {
  if (runs.length === 0) {
    return (
      <div className="empty-state">
        <h2>No runs found</h2>
        <p>No .orchestrate directories with stack.json were found in this repository.</p>
      </div>
    );
  }

  return (
    <div className="run-picker">
      <h2>Select a run</h2>
      <div className="run-list">
        {runs.map((run) => (
          <div
            key={run.slug}
            className="run-option"
            onClick={() => onSelect(run.slug)}
          >
            <strong>{run.slug}</strong>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Last modified: {new Date(run.mtime * 1000).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

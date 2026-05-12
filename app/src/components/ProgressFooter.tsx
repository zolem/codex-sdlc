import { WalkthroughDoc } from '../shared/types';
import { RunArtifacts } from '../shared/stages';

interface Props {
  run: RunArtifacts;
  walkthroughs: Map<number, WalkthroughDoc>;
  reviewedByPhase: Map<number, Set<string>>;
}

export function ProgressFooter({ run, walkthroughs, reviewedByPhase }: Props) {
  let totalStops = 0;
  let reviewedStops = 0;
  for (const [phaseN, walk] of walkthroughs) {
    totalStops += walk.stops.length;
    const reviewed = reviewedByPhase.get(phaseN) ?? new Set();
    reviewedStops += walk.stops.filter((s) => reviewed.has(s.commitSha)).length;
  }

  const validatedPhases = run.stack.phases.filter((p) => p.status === 'validated').length;
  const totalPhases = run.stack.phases.length;
  const failedPhases = run.stack.phases.filter((p) => p.status === 'failed').length;

  const stopPct = totalStops > 0 ? Math.round((reviewedStops / totalStops) * 100) : 0;

  return (
    <footer className="progress-footer">
      <div className="progress-bar-section">
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${stopPct}%` }} />
        </div>
        <div className="progress-text">
          {reviewedStops}/{totalStops} stops reviewed
          {totalStops > 0 && <span className="progress-pct"> · {stopPct}%</span>}
        </div>
      </div>

      <div className="progress-stats">
        <Stat color="success" value={validatedPhases} label={`phase${validatedPhases === 1 ? '' : 's'} validated`} />
        {failedPhases > 0 && (
          <Stat color="danger" value={failedPhases} label={`phase${failedPhases === 1 ? '' : 's'} need attention`} />
        )}
        <Stat color="muted" value={totalPhases - validatedPhases - failedPhases} label="pending" />
      </div>
    </footer>
  );
}

function Stat({ color, value, label }: { color: 'success' | 'danger' | 'muted'; value: number; label: string }) {
  return (
    <span className="progress-stat">
      <span className={`progress-stat-dot dot-${color}`} />
      <span className="progress-stat-value">{value}</span>
      <span className="progress-stat-label">{label}</span>
    </span>
  );
}

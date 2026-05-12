import { RunSummary } from '../shared/types';
import { StageId, STAGES, StageStatus } from '../shared/stages';

interface Props {
  runs: RunSummary[];
  selectedSlug: string;
  stageStatuses: Record<StageId, StageStatus>;
  activeStage: StageId;
  onRunChange: (slug: string) => void;
  onStageChange: (stage: StageId) => void;
  onRefresh: () => void;
}

export function TopBar({
  runs,
  selectedSlug,
  stageStatuses,
  activeStage,
  onRunChange,
  onStageChange,
  onRefresh,
}: Props) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="brand">Orchestrate</div>
        {runs.length > 1 ? (
          <select
            className="run-select"
            value={selectedSlug}
            onChange={(e) => onRunChange(e.target.value)}
          >
            {runs.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.slug}
              </option>
            ))}
          </select>
        ) : (
          <div className="run-name">{selectedSlug}</div>
        )}
      </div>

      <nav className="stage-nav">
        {STAGES.map((stage, idx) => {
          const status = stageStatuses[stage.id];
          const isActive = stage.id === activeStage;
          return (
            <div key={stage.id} className="stage-nav-item-wrapper">
              <button
                className={`stage-nav-item ${isActive ? 'active' : ''} status-${status}`}
                onClick={() => onStageChange(stage.id)}
                title={stage.description}
              >
                <span className={`stage-dot status-${status}`} />
                <span className="stage-label">{stage.label}</span>
              </button>
              {idx < STAGES.length - 1 && <span className="stage-divider" />}
            </div>
          );
        })}
      </nav>

      <div className="topbar-right">
        <button className="icon-button" onClick={onRefresh} title="Refresh">
          <RefreshIcon />
        </button>
      </div>
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M2.5 8a5.5 5.5 0 0 1 9.45-3.85L13.5 2.5v4h-4l1.55-1.55A4.5 4.5 0 1 0 12.5 8h1A5.5 5.5 0 1 1 2.5 8z"
        fill="currentColor"
      />
    </svg>
  );
}

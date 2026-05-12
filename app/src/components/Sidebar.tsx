import { Phase, WalkthroughDoc } from '../shared/types';
import {
  RunArtifacts,
  StageId,
  StageStatus,
  designDocs,
  phaseHasArtifact,
  planDocs,
  reviewStatusForPhase,
  testStatusForPhase,
} from '../shared/stages';

const DOC_LABELS: Record<string, string> = {
  'requirements.md': 'Requirements',
  'context.md': 'Context',
  'architecture.md': 'Architecture',
  'test-plan.md': 'Test Plan',
  'task-index.md': 'Task Index',
};

export type ReviewKind = 'code-review' | 'security' | 'manual';

interface Props {
  run: RunArtifacts;
  walkthroughs: Map<number, WalkthroughDoc>;
  reviewedByPhase: Map<number, Set<string>>;
  stage: StageId;
  selectedDoc?: string;
  selectedPhase?: number;
  selectedStopIdx?: number;
  selectedReport?: ReviewKind;
  onSelectDoc: (doc: string) => void;
  onSelectPhase: (phase: number) => void;
  onSelectStop: (phase: number, idx: number) => void;
  onSelectReport: (phase: number, report: ReviewKind) => void;
}

export function Sidebar(props: Props) {
  return (
    <aside className="sidebar-new">
      <SidebarSection title={sectionTitle(props.stage)}>
        {renderStageContent(props)}
      </SidebarSection>
    </aside>
  );
}

function sectionTitle(stage: StageId): string {
  return stage.toUpperCase();
}

function renderStageContent(props: Props) {
  switch (props.stage) {
    case 'plan':
      return <DocList docs={planDocs(props.run)} selected={props.selectedDoc} onSelect={props.onSelectDoc} expectedDocs={['requirements.md']} />;
    case 'design':
      return <DocList docs={designDocs(props.run)} selected={props.selectedDoc} onSelect={props.onSelectDoc} expectedDocs={['context.md', 'architecture.md', 'test-plan.md', 'task-index.md']} />;
    case 'implement':
      return (
        <PhaseList
          run={props.run}
          walkthroughs={props.walkthroughs}
          reviewedByPhase={props.reviewedByPhase}
          selectedPhase={props.selectedPhase}
          selectedStopIdx={props.selectedStopIdx}
          onSelectPhase={props.onSelectPhase}
          onSelectStop={props.onSelectStop}
        />
      );
    case 'test':
      return (
        <ReportList
          run={props.run}
          kind="qa"
          selectedPhase={props.selectedPhase}
          onSelectPhase={props.onSelectPhase}
        />
      );
    case 'review':
      return (
        <ReviewList
          run={props.run}
          selectedPhase={props.selectedPhase}
          selectedReport={props.selectedReport}
          onSelectReport={props.onSelectReport}
        />
      );
    case 'deploy':
      return <div className="sidebar-empty">Deploy stage runs after all phases verified.</div>;
  }
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="sidebar-section">
      <div className="sidebar-section-title">{title}</div>
      <div className="sidebar-section-body">{children}</div>
    </div>
  );
}

function DocList({
  docs,
  expectedDocs,
  selected,
  onSelect,
}: {
  docs: string[];
  expectedDocs: string[];
  selected?: string;
  onSelect: (doc: string) => void;
}) {
  if (expectedDocs.length === 0) return null;
  return (
    <ul className="sidebar-list">
      {expectedDocs.map((doc) => {
        const present = docs.includes(doc);
        const active = selected === doc;
        return (
          <li
            key={doc}
            className={`sidebar-item ${active ? 'active' : ''} ${present ? '' : 'disabled'}`}
            onClick={() => present && onSelect(doc)}
          >
            <StatusDot status={present ? 'complete' : 'pending'} />
            <span className="sidebar-item-label">{DOC_LABELS[doc] ?? doc}</span>
          </li>
        );
      })}
    </ul>
  );
}

function PhaseList({
  run,
  walkthroughs,
  reviewedByPhase,
  selectedPhase,
  selectedStopIdx,
  onSelectPhase,
  onSelectStop,
}: {
  run: RunArtifacts;
  walkthroughs: Map<number, WalkthroughDoc>;
  reviewedByPhase: Map<number, Set<string>>;
  selectedPhase?: number;
  selectedStopIdx?: number;
  onSelectPhase: (phase: number) => void;
  onSelectStop: (phase: number, idx: number) => void;
}) {
  if (run.stack.phases.length === 0) {
    return <div className="sidebar-empty">No phases yet.</div>;
  }

  return (
    <ul className="sidebar-list">
      {run.stack.phases.map((phase) => {
        const walkthrough = walkthroughs.get(phase.n);
        const isExpanded = phase.n === selectedPhase && walkthrough != null;
        const reviewedSet = reviewedByPhase.get(phase.n) ?? new Set();
        const stops = walkthrough?.stops ?? [];
        const reviewedCount = stops.filter((s) => reviewedSet.has(s.commitSha)).length;
        return (
          <li key={phase.n} className="sidebar-phase">
            <div
              className={`sidebar-item ${selectedPhase === phase.n ? 'active' : ''}`}
              onClick={() => onSelectPhase(phase.n)}
            >
              <StatusDot status={mapPhaseStatus(phase)} />
              <div className="sidebar-phase-content">
                <div className="sidebar-phase-title">
                  Phase {phase.n} <span className="sidebar-muted">— {phase.title}</span>
                </div>
                {stops.length > 0 && (
                  <div className="sidebar-phase-meta">
                    {reviewedCount}/{stops.length} stops reviewed
                  </div>
                )}
              </div>
            </div>
            {isExpanded && stops.length > 0 && (
              <ul className="sidebar-stops">
                {stops.map((stop, idx) => {
                  const reviewed = reviewedSet.has(stop.commitSha);
                  const active = idx === selectedStopIdx;
                  return (
                    <li
                      key={stop.commitSha}
                      className={`sidebar-stop ${active ? 'active' : ''} ${reviewed ? 'reviewed' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStop(phase.n, idx);
                      }}
                    >
                      <span className="sidebar-stop-index">{stop.index}</span>
                      <span className="sidebar-stop-title">{stop.title}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ReportList({
  run,
  kind,
  selectedPhase,
  onSelectPhase,
}: {
  run: RunArtifacts;
  kind: 'qa';
  selectedPhase?: number;
  onSelectPhase: (phase: number) => void;
}) {
  if (run.stack.phases.length === 0) {
    return <div className="sidebar-empty">No phases yet.</div>;
  }
  return (
    <ul className="sidebar-list">
      {run.stack.phases.map((phase) => {
        const status = kind === 'qa' ? testStatusForPhase(run, phase) : 'pending';
        const present = status === 'complete';
        return (
          <li
            key={phase.n}
            className={`sidebar-item ${selectedPhase === phase.n ? 'active' : ''} ${present ? '' : 'disabled'}`}
            onClick={() => present && onSelectPhase(phase.n)}
          >
            <StatusDot status={status} />
            <div className="sidebar-phase-content">
              <div className="sidebar-phase-title">Phase {phase.n}</div>
              <div className="sidebar-phase-meta">QA Report</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ReviewList({
  run,
  selectedPhase,
  selectedReport,
  onSelectReport,
}: {
  run: RunArtifacts;
  selectedPhase?: number;
  selectedReport?: ReviewKind;
  onSelectReport: (phase: number, report: ReviewKind) => void;
}) {
  if (run.stack.phases.length === 0) {
    return <div className="sidebar-empty">No phases yet.</div>;
  }

  return (
    <ul className="sidebar-list">
      {run.stack.phases.map((phase) => {
        const codePresent = phaseHasArtifact(run, phase.n, 'code-review');
        const secPresent = phaseHasArtifact(run, phase.n, 'security');
        const status = reviewStatusForPhase(run, phase);
        return (
          <li key={phase.n} className="sidebar-phase">
            <div className="sidebar-phase-header">
              <StatusDot status={status} />
              <span className="sidebar-phase-title">Phase {phase.n}</span>
            </div>
            <ul className="sidebar-sub-list">
              <ReportItem
                label="Code review"
                present={codePresent}
                active={selectedPhase === phase.n && selectedReport === 'code-review'}
                onClick={() => codePresent && onSelectReport(phase.n, 'code-review')}
              />
              <ReportItem
                label="Security"
                present={secPresent}
                active={selectedPhase === phase.n && selectedReport === 'security'}
                onClick={() => secPresent && onSelectReport(phase.n, 'security')}
              />
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

function ReportItem({ label, present, active, onClick }: { label: string; present: boolean; active: boolean; onClick: () => void }) {
  return (
    <li
      className={`sidebar-sub-item ${active ? 'active' : ''} ${present ? '' : 'disabled'}`}
      onClick={onClick}
    >
      <StatusDot status={present ? 'complete' : 'pending'} small />
      <span>{label}</span>
    </li>
  );
}

function StatusDot({ status, small }: { status: StageStatus; small?: boolean }) {
  return <span className={`status-dot status-${status} ${small ? 'small' : ''}`} />;
}

function mapPhaseStatus(phase: Phase): StageStatus {
  switch (phase.status) {
    case 'validated':
      return 'complete';
    case 'in_progress':
      return 'active';
    case 'failed':
      return 'failed';
    case 'pending':
      return 'pending';
  }
}

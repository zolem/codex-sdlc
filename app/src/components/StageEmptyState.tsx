import { ReactElement } from 'react';
import { RunArtifacts, StageId, getAllStageStatuses } from '../shared/stages';

interface Props {
  stage: StageId;
  run: RunArtifacts;
  message?: string;
}

const STAGE_DESCRIPTIONS: Record<StageId, { title: string; waiting: string; description: string }> = {
  plan: {
    title: 'Plan',
    waiting: 'Waiting for requirements.md',
    description: 'The product manager agent is transforming the brief into structured user stories and acceptance criteria.',
  },
  design: {
    title: 'Design',
    waiting: 'Waiting for architecture and test plan',
    description: 'The architect, qa-analyst, and context-curator are producing implementation plan, test cases, and codebase context in parallel.',
  },
  implement: {
    title: 'Implement',
    waiting: 'Waiting for first phase to begin',
    description: 'Engineer agents will implement each phase sequentially, producing atomic commits and a per-phase walkthrough.',
  },
  test: {
    title: 'Test',
    waiting: 'Waiting for QA verification',
    description: 'The qa-verifier runs the test suite and confirms every test case from the plan is implemented.',
  },
  review: {
    title: 'Review',
    waiting: 'Waiting for code review',
    description: 'The code-reviewer and security-reviewer audit each phase for quality, consistency, and OWASP-style vulnerabilities.',
  },
  deploy: {
    title: 'Deploy',
    waiting: 'Run not yet complete',
    description: 'After all phases are verified, the run is ready for handoff and merge.',
  },
};

export function StageEmptyState({ stage, run, message }: Props) {
  const desc = STAGE_DESCRIPTIONS[stage];
  const statuses = getAllStageStatuses(run);
  const isPending = statuses[stage] === 'pending';

  return (
    <div className="empty-stage">
      <div className="empty-stage-icon">
        <StageIcon stage={stage} />
      </div>
      <h2 className="empty-stage-title">{desc.title}</h2>
      <p className="empty-stage-message">
        {message ?? (isPending ? desc.waiting : 'Select an item from the sidebar to view it.')}
      </p>
      <p className="empty-stage-description">{desc.description}</p>
    </div>
  );
}

function StageIcon({ stage }: { stage: StageId }) {
  const icons: Record<StageId, ReactElement> = {
    plan: <PlanGlyph />,
    design: <DesignGlyph />,
    implement: <ImplementGlyph />,
    test: <TestGlyph />,
    review: <ReviewGlyph />,
    deploy: <DeployGlyph />,
  };
  return icons[stage];
}

function PlanGlyph() { return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>; }
function DesignGlyph() { return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>; }
function ImplementGlyph() { return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>; }
function TestGlyph() { return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>; }
function ReviewGlyph() { return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>; }
function DeployGlyph() { return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>; }

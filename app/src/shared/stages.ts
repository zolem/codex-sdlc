import { StackJson, Phase } from './types';

export type StageId = 'plan' | 'design' | 'implement' | 'test' | 'review' | 'deploy';
export type StageStatus = 'pending' | 'active' | 'complete' | 'failed';

export interface StageDef {
  id: StageId;
  label: string;
  description: string;
}

export const STAGES: StageDef[] = [
  { id: 'plan', label: 'Plan', description: 'Requirements and user stories' },
  { id: 'design', label: 'Design', description: 'Architecture and test plan' },
  { id: 'implement', label: 'Implement', description: 'Phase implementations' },
  { id: 'test', label: 'Test', description: 'QA verification per phase' },
  { id: 'review', label: 'Review', description: 'Code review and security audit' },
  { id: 'deploy', label: 'Deploy', description: 'Final handoff' },
];

export interface RunArtifacts {
  stack: StackJson;
  documents: string[];
}

const PLAN_DOCS = ['requirements.md'];
const DESIGN_DOCS = ['context.md', 'architecture.md', 'test-plan.md', 'task-index.md'];

export function planStatus(run: RunArtifacts): StageStatus {
  return run.documents.includes('requirements.md') ? 'complete' : 'pending';
}

export function designStatus(run: RunArtifacts): StageStatus {
  const present = DESIGN_DOCS.filter((d) => run.documents.includes(d));
  if (present.length === 0) return 'pending';
  if (present.length < DESIGN_DOCS.length) return 'active';
  return 'complete';
}

export function implementStatus(run: RunArtifacts): StageStatus {
  const phases = run.stack.phases;
  if (phases.length === 0) return 'pending';
  if (phases.some((p) => p.status === 'failed')) return 'failed';
  if (phases.every((p) => p.status === 'validated')) return 'complete';
  if (phases.some((p) => p.status === 'in_progress' || p.status === 'validated')) return 'active';
  return 'pending';
}

export function testStatusForPhase(run: RunArtifacts, phase: Phase): StageStatus {
  const path = `verification/phase-${phase.n}/qa-report.md`;
  if (!run.documents.includes(path)) {
    return phase.status === 'pending' ? 'pending' : 'pending';
  }
  return 'complete';
}

export function testStatus(run: RunArtifacts): StageStatus {
  const phases = run.stack.phases;
  if (phases.length === 0) return 'pending';
  const statuses = phases.map((p) => testStatusForPhase(run, p));
  if (statuses.every((s) => s === 'complete')) return 'complete';
  if (statuses.some((s) => s === 'complete')) return 'active';
  return 'pending';
}

export function reviewStatusForPhase(run: RunArtifacts, phase: Phase): StageStatus {
  const cr = `verification/phase-${phase.n}/code-review-report.md`;
  const sec = `verification/phase-${phase.n}/security-report.md`;
  const has = (p: string) => run.documents.includes(p);
  if (has(cr) && has(sec)) return 'complete';
  if (has(cr) || has(sec)) return 'active';
  return 'pending';
}

export function reviewStatus(run: RunArtifacts): StageStatus {
  const phases = run.stack.phases;
  if (phases.length === 0) return 'pending';
  const statuses = phases.map((p) => reviewStatusForPhase(run, p));
  if (statuses.every((s) => s === 'complete')) return 'complete';
  if (statuses.some((s) => s !== 'pending')) return 'active';
  return 'pending';
}

export function deployStatus(run: RunArtifacts): StageStatus {
  if (implementStatus(run) === 'complete' && reviewStatus(run) === 'complete') {
    return 'complete';
  }
  return 'pending';
}

export function getAllStageStatuses(run: RunArtifacts): Record<StageId, StageStatus> {
  return {
    plan: planStatus(run),
    design: designStatus(run),
    implement: implementStatus(run),
    test: testStatus(run),
    review: reviewStatus(run),
    deploy: deployStatus(run),
  };
}

export function defaultActiveStage(run: RunArtifacts): StageId {
  const statuses = getAllStageStatuses(run);
  const order: StageId[] = ['plan', 'design', 'implement', 'test', 'review', 'deploy'];

  // The walkthrough review experience is the headline feature. If there's any
  // implementation progress at all (commits exist, walkthroughs written),
  // start there.
  const hasImplementContent =
    run.stack.phases.some((p) => p.commits.length > 0 || p.status !== 'pending');
  if (hasImplementContent) return 'implement';

  // Otherwise, jump to the earliest in-progress / failed stage so the user
  // sees what's actively happening.
  const active = order.find((s) => statuses[s] === 'active' || statuses[s] === 'failed');
  if (active) return active;

  // Fall back to the latest completed stage.
  const lastComplete = [...order].reverse().find((s) => statuses[s] === 'complete');
  return lastComplete ?? 'plan';
}

export function planDocs(run: RunArtifacts): string[] {
  return PLAN_DOCS.filter((d) => run.documents.includes(d));
}

export function designDocs(run: RunArtifacts): string[] {
  return DESIGN_DOCS.filter((d) => run.documents.includes(d));
}

export function phaseHasArtifact(run: RunArtifacts, phaseN: number, kind: 'spec' | 'walkthrough' | 'qa' | 'code-review' | 'security'): boolean {
  switch (kind) {
    case 'spec':
      return run.documents.includes(`phases/phase-${phaseN}.md`);
    case 'walkthrough':
      return run.documents.includes(`walkthroughs/phase-${phaseN}.md`);
    case 'qa':
      return run.documents.includes(`verification/phase-${phaseN}/qa-report.md`);
    case 'code-review':
      return run.documents.includes(`verification/phase-${phaseN}/code-review-report.md`);
    case 'security':
      return run.documents.includes(`verification/phase-${phaseN}/security-report.md`);
  }
}

export function stageStatusLabel(status: StageStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'active':
      return 'In progress';
    case 'complete':
      return 'Complete';
    case 'failed':
      return 'Needs attention';
  }
}

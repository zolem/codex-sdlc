export type PhaseStatus = 'pending' | 'in_progress' | 'validated' | 'failed';
export type CommitKind = 'work_item' | 'fixup';
export type FixReason = 'qa-verifier' | 'code-reviewer' | 'security-reviewer';
export type FileAction = 'create' | 'modify' | 'delete';

export interface CommitFile {
  path: string;
  action: FileAction;
}

export interface Commit {
  sha: string;
  kind: CommitKind;
  work_item_slug?: string;
  work_item_title?: string;
  fixup_for?: string;
  fix_reason?: FixReason;
  message_subject: string;
  files: CommitFile[];
}

export interface PhaseVerification {
  qa: string;
  code_review: string;
  security: string;
  iterations: number;
}

export interface Phase {
  n: number;
  title: string;
  status: PhaseStatus;
  started_at?: string;
  completed_at?: string;
  commits: Commit[];
  verification?: PhaseVerification;
}

export interface StackJson {
  feature_slug: string;
  phases: Phase[];
}

export interface Stop {
  index: number;
  total: number;
  title: string;
  kind: CommitKind;
  commitSha: string;
  focusPath?: string;
  focusRange?: [number, number];
  acs?: string[];
  whatChanged: string;
  whyThisWay?: string;
  triggeredBy?: string;
  whatToVerify: string;
}

export interface WalkthroughDoc {
  phase: number;
  title: string;
  commits: string[];
  acs_covered: string[];
  generatedAt: string;
  intro: string;
  stops: Stop[];
}

export interface RunSummary {
  slug: string;
  path: string;
  mtime: number;
}

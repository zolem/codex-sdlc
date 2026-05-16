import { useEffect, useMemo, useState } from 'react';
import { getRun, getWalkthrough, listDocuments } from '../hooks/useTauri';
import { parseWalkthrough } from '../shared/walkthroughParser';
import { RunSummary, StackJson, WalkthroughDoc } from '../shared/types';
import { RunArtifacts, StageId, defaultActiveStage, getAllStageStatuses } from '../shared/stages';
import { DocumentView } from './DocumentView';
import { ProgressFooter } from './ProgressFooter';
import { ReviewKind, Sidebar } from './Sidebar';
import { StageEmptyState } from './StageEmptyState';
import { StopView } from './StopView';
import { TopBar } from './TopBar';

const DOC_TITLES: Record<string, string> = {
  'requirements.md': 'Requirements',
  'context.md': 'Context',
  'architecture.md': 'Architecture',
  'test-plan.md': 'Test Plan',
  'task-index.md': 'Task Index',
};

interface Props {
  repoPath: string;
  runs: RunSummary[];
  slug: string;
  onSlugChange: (slug: string) => void;
  externalRefreshKey?: number;
}

export function WalkthroughView({ repoPath, runs, slug, onSlugChange, externalRefreshKey = 0 }: Props) {
  const [stack, setStack] = useState<StackJson | null>(null);
  const [documents, setDocuments] = useState<string[]>([]);
  const [walkthroughs, setWalkthroughs] = useState<Map<number, WalkthroughDoc>>(new Map());
  const [reviewedByPhase, setReviewedByPhase] = useState<Map<number, Set<string>>>(new Map());
  const [stage, setStage] = useState<StageId | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<string | undefined>();
  const [selectedPhase, setSelectedPhase] = useState<number | undefined>();
  const [selectedStopIdx, setSelectedStopIdx] = useState<number>(0);
  const [selectedReport, setSelectedReport] = useState<ReviewKind | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setStack(null);
    setDocuments([]);
    setWalkthroughs(new Map());
    setError(null);

    Promise.all([getRun(repoPath, slug), listDocuments(repoPath, slug)])
      .then(async ([s, d]) => {
        setStack(s);
        setDocuments(d);

        const walks = new Map<number, WalkthroughDoc>();
        await Promise.all(
          s.phases.map(async (phase) => {
            if (d.includes(`walkthroughs/phase-${phase.n}.md`)) {
              try {
                const raw = await getWalkthrough(repoPath, slug, phase.n);
                const parsed = parseWalkthrough(raw);
                if (parsed) walks.set(phase.n, parsed);
              } catch {
                // ignore
              }
            }
          }),
        );
        setWalkthroughs(walks);
      })
      .catch((e) => setError(String(e)));
  }, [repoPath, slug, refreshKey, externalRefreshKey]);

  const run: RunArtifacts | null = useMemo(() => {
    if (!stack) return null;
    return { stack, documents };
  }, [stack, documents]);

  useEffect(() => {
    if (!run) return;
    if (stage === null) {
      const initial = defaultActiveStage(run);
      setStage(initial);
      autoSelectForStage(initial, run, walkthroughs, {
        setSelectedDoc,
        setSelectedPhase,
        setSelectedStopIdx,
        setSelectedReport,
      });
    }
  }, [run, walkthroughs, stage]);

  const stageStatuses = useMemo(() => {
    if (!run) return null;
    return getAllStageStatuses(run);
  }, [run]);

  function changeStage(next: StageId) {
    if (!run) return;
    setStage(next);
    autoSelectForStage(next, run, walkthroughs, {
      setSelectedDoc,
      setSelectedPhase,
      setSelectedStopIdx,
      setSelectedReport,
    });
  }

  function markStopReviewed() {
    if (selectedPhase == null) return;
    const walk = walkthroughs.get(selectedPhase);
    if (!walk) return;
    const stop = walk.stops[selectedStopIdx];
    if (!stop) return;

    setReviewedByPhase((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(selectedPhase) ?? []);
      set.add(stop.commitSha);
      next.set(selectedPhase, set);
      return next;
    });

    if (selectedStopIdx < walk.stops.length - 1) {
      setSelectedStopIdx(selectedStopIdx + 1);
    }
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!run || !stageStatuses || !stage) {
    return <div className="loading">Loading run...</div>;
  }

  return (
    <div className="app-shell">
      <TopBar
        runs={runs}
        selectedSlug={slug}
        stageStatuses={stageStatuses}
        activeStage={stage}
        onRunChange={onSlugChange}
        onStageChange={changeStage}
        onRefresh={() => setRefreshKey((k) => k + 1)}
      />

      <div className="app-body">
        <Sidebar
          run={run}
          walkthroughs={walkthroughs}
          reviewedByPhase={reviewedByPhase}
          stage={stage}
          selectedDoc={selectedDoc}
          selectedPhase={selectedPhase}
          selectedStopIdx={selectedStopIdx}
          selectedReport={selectedReport}
          onSelectDoc={(doc) => setSelectedDoc(doc)}
          onSelectPhase={(p) => {
            setSelectedPhase(p);
            setSelectedStopIdx(0);
          }}
          onSelectStop={(p, idx) => {
            setSelectedPhase(p);
            setSelectedStopIdx(idx);
          }}
          onSelectReport={(p, r) => {
            setSelectedPhase(p);
            setSelectedReport(r);
          }}
        />

        <main className="stage-content">
          <StageContent
            repoPath={repoPath}
            slug={slug}
            run={run}
            stage={stage}
            walkthroughs={walkthroughs}
            reviewedByPhase={reviewedByPhase}
            selectedDoc={selectedDoc}
            selectedPhase={selectedPhase}
            selectedStopIdx={selectedStopIdx}
            selectedReport={selectedReport}
            onNext={() => {
              const walk = selectedPhase != null ? walkthroughs.get(selectedPhase) : null;
              if (walk && selectedStopIdx < walk.stops.length - 1) {
                setSelectedStopIdx(selectedStopIdx + 1);
              }
            }}
            onPrev={() => {
              if (selectedStopIdx > 0) setSelectedStopIdx(selectedStopIdx - 1);
            }}
            onMarkReviewed={markStopReviewed}
          />
        </main>
      </div>

      <ProgressFooter
        run={run}
        walkthroughs={walkthroughs}
        reviewedByPhase={reviewedByPhase}
      />
    </div>
  );
}

interface StageContentProps {
  repoPath: string;
  slug: string;
  run: RunArtifacts;
  stage: StageId;
  walkthroughs: Map<number, WalkthroughDoc>;
  reviewedByPhase: Map<number, Set<string>>;
  selectedDoc?: string;
  selectedPhase?: number;
  selectedStopIdx: number;
  selectedReport?: ReviewKind;
  onNext: () => void;
  onPrev: () => void;
  onMarkReviewed: () => void;
}

function StageContent(props: StageContentProps) {
  const { repoPath, slug, run, stage, walkthroughs, reviewedByPhase, selectedDoc, selectedPhase, selectedStopIdx, selectedReport, onNext, onPrev, onMarkReviewed } = props;

  if (stage === 'plan' || stage === 'design') {
    if (!selectedDoc) {
      return <StageEmptyState stage={stage} run={run} />;
    }
    return (
      <DocumentView
        repoPath={repoPath}
        slug={slug}
        docPath={selectedDoc}
        title={DOC_TITLES[selectedDoc] ?? selectedDoc}
      />
    );
  }

  if (stage === 'implement') {
    if (selectedPhase == null) {
      return <StageEmptyState stage={stage} run={run} />;
    }
    const walkthrough = walkthroughs.get(selectedPhase);
    if (!walkthrough) {
      const phase = run.stack.phases.find((p) => p.n === selectedPhase);
      const phaseSpecPath = `phases/phase-${selectedPhase}.md`;
      if (run.documents.includes(phaseSpecPath)) {
        return (
          <DocumentView
            repoPath={repoPath}
            slug={slug}
            docPath={phaseSpecPath}
            title={`Phase ${selectedPhase} Spec — ${phase?.title ?? ''}`}
          />
        );
      }
      return <StageEmptyState stage={stage} run={run} message={`Phase ${selectedPhase} hasn't started yet.`} />;
    }
    const stop = walkthrough.stops[selectedStopIdx];
    if (!stop) {
      return <StageEmptyState stage={stage} run={run} message="No stops in this walkthrough." />;
    }
    return (
      <StopView
        repoPath={repoPath}
        stop={stop}
        walkthrough={walkthrough}
        phaseN={selectedPhase}
        currentIdx={selectedStopIdx}
        reviewed={reviewedByPhase.get(selectedPhase) ?? new Set()}
        onNext={onNext}
        onPrev={onPrev}
        onMarkReviewed={onMarkReviewed}
      />
    );
  }

  if (stage === 'test') {
    if (selectedPhase == null) return <StageEmptyState stage={stage} run={run} />;
    const docPath = `verification/phase-${selectedPhase}/qa-report.md`;
    if (!run.documents.includes(docPath)) {
      return <StageEmptyState stage={stage} run={run} message={`Phase ${selectedPhase} QA report not generated yet.`} />;
    }
    return (
      <DocumentView
        repoPath={repoPath}
        slug={slug}
        docPath={docPath}
        title={`Phase ${selectedPhase} QA Report`}
      />
    );
  }

  if (stage === 'review') {
    if (selectedPhase == null || !selectedReport) return <StageEmptyState stage={stage} run={run} />;
    const docPath = reviewDocPath(selectedPhase, selectedReport);
    if (!run.documents.includes(docPath)) {
      return <StageEmptyState stage={stage} run={run} message={`Phase ${selectedPhase} ${selectedReport} report not generated yet.`} />;
    }
    return (
      <DocumentView
        repoPath={repoPath}
        slug={slug}
        docPath={docPath}
        title={`Phase ${selectedPhase} ${reportLabel(selectedReport)}`}
      />
    );
  }

  return <StageEmptyState stage={stage} run={run} />;
}

function reviewDocPath(phase: number, report: ReviewKind): string {
  switch (report) {
    case 'code-review':
      return `verification/phase-${phase}/code-review-report.md`;
    case 'security':
      return `verification/phase-${phase}/security-report.md`;
    case 'manual':
      return 'verification/manual-test-report.md';
  }
}

function reportLabel(report: ReviewKind): string {
  switch (report) {
    case 'code-review':
      return 'Code Review';
    case 'security':
      return 'Security Report';
    case 'manual':
      return 'Manual Test Report';
  }
}

function autoSelectForStage(
  stage: StageId,
  run: RunArtifacts,
  walkthroughs: Map<number, WalkthroughDoc>,
  setters: {
    setSelectedDoc: (d: string | undefined) => void;
    setSelectedPhase: (p: number | undefined) => void;
    setSelectedStopIdx: (i: number) => void;
    setSelectedReport: (r: ReviewKind | undefined) => void;
  },
) {
  switch (stage) {
    case 'plan':
      if (run.documents.includes('requirements.md')) setters.setSelectedDoc('requirements.md');
      else setters.setSelectedDoc(undefined);
      break;
    case 'design': {
      const order = ['architecture.md', 'context.md', 'test-plan.md', 'task-index.md'];
      const first = order.find((d) => run.documents.includes(d));
      setters.setSelectedDoc(first);
      break;
    }
    case 'implement': {
      // Prefer a phase that has a walkthrough we can review.
      const phaseWithWalkthrough =
        run.stack.phases.find((p) => p.status === 'in_progress' && walkthroughs.has(p.n)) ??
        [...run.stack.phases].reverse().find((p) => walkthroughs.has(p.n)) ??
        run.stack.phases.find((p) => p.status === 'in_progress') ??
        [...run.stack.phases].reverse().find((p) => p.status === 'validated') ??
        run.stack.phases[0];
      if (phaseWithWalkthrough) {
        setters.setSelectedPhase(phaseWithWalkthrough.n);
        setters.setSelectedStopIdx(0);
      } else {
        setters.setSelectedPhase(undefined);
      }
      break;
    }
    case 'test': {
      const phase = run.stack.phases.find((p) => run.documents.includes(`verification/phase-${p.n}/qa-report.md`));
      setters.setSelectedPhase(phase?.n);
      break;
    }
    case 'review': {
      const phase = run.stack.phases.find((p) => run.documents.includes(`verification/phase-${p.n}/code-review-report.md`));
      setters.setSelectedPhase(phase?.n);
      setters.setSelectedReport('code-review');
      break;
    }
    case 'deploy':
      break;
  }
}

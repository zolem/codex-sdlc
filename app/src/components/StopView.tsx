import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getDiff, getCommitFiles } from '../hooks/useTauri';
import { Stop, WalkthroughDoc } from '../shared/types';
import { DiffViewer } from './DiffViewer';

interface Props {
  repoPath: string;
  stop: Stop;
  walkthrough: WalkthroughDoc;
  phaseN: number;
  currentIdx: number;
  reviewed: Set<string>;
  onNext: () => void;
  onPrev: () => void;
  onMarkReviewed: () => void;
}

interface FileDiff {
  path: string;
  diff: string | null;
}

export function StopView({ repoPath, stop, walkthrough, phaseN, currentIdx, reviewed, onNext, onPrev, onMarkReviewed }: Props) {
  const [fileDiffs, setFileDiffs] = useState<FileDiff[]>([]);

  useEffect(() => {
    setFileDiffs([]);

    getCommitFiles(repoPath, stop.commitSha)
      .then(async (files) => {
        const focusFirst = stop.focusPath
          ? [...files].sort((a, b) => {
              const aMatch = a === stop.focusPath || a.endsWith(stop.focusPath!);
              const bMatch = b === stop.focusPath || b.endsWith(stop.focusPath!);
              return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
            })
          : files;

        setFileDiffs(focusFirst.map((path) => ({ path, diff: null })));

        const results = await Promise.allSettled(
          focusFirst.map((path) => getDiff(repoPath, stop.commitSha, path))
        );

        setFileDiffs(
          focusFirst.map((path, i) => ({
            path,
            diff: results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<string>).value : '// Failed to load diff',
          }))
        );
      })
      .catch(() => setFileDiffs([]));
  }, [repoPath, stop.commitSha, stop.focusPath]);

  const isReviewed = reviewed.has(stop.commitSha);
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === walkthrough.stops.length - 1;

  return (
    <div className="stop-layout">
      <div className="stop-narration">
        <div className="stop-toolbar">
          <button onClick={onPrev} disabled={isFirst} className="btn-ghost">← Prev</button>
          <span className="stop-counter">
            Stop {stop.index} of {stop.total}
          </span>
          <button onClick={onNext} disabled={isLast} className="btn-ghost">Next →</button>
          <div className="flex-spacer" />
          <button
            className={`btn-primary ${isReviewed ? 'reviewed' : ''}`}
            onClick={onMarkReviewed}
            disabled={isReviewed}
          >
            {isReviewed ? '✓ Reviewed' : 'Mark Reviewed'}
          </button>
        </div>

        <div className="stop-header">
          <div className="stop-kind-badge">
            {stop.kind === 'fixup' ? 'Fix-up' : 'Work item'}
          </div>
          <h1 className="stop-title">{stop.title}</h1>
          <div className="stop-meta">
            <MetaPill label="Phase" value={`${phaseN}`} />
            <MetaPill label="Commit" value={stop.commitSha.slice(0, 8)} mono />
            {stop.focusPath && <MetaPill label="Focus" value={stop.focusPath} mono />}
          </div>
        </div>

        <NarrationField title="What changed" content={stop.whatChanged} />
        {stop.whyThisWay && <NarrationField title="Why this way" content={stop.whyThisWay} />}
        {stop.whatToVerify && <NarrationField title="What to verify" content={stop.whatToVerify} />}
        {stop.triggeredBy && <NarrationField title="Triggered by" content={stop.triggeredBy} />}

        {stop.acs && stop.acs.length > 0 && (
          <div className="stop-section">
            <h3 className="stop-section-title">Acceptance criteria</h3>
            <div className="ac-list">
              {stop.acs.map((ac) => (
                <span key={ac} className="ac-chip">{ac}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="stop-code">
        {fileDiffs.length === 0 ? (
          <div className="loading">Loading commit files...</div>
        ) : (
          <div className="file-diff-list">
            {fileDiffs.map(({ path, diff }) => (
              <DiffViewer key={path} diff={diff} filePath={path} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NarrationField({ title, content }: { title: string; content: string }) {
  const formatted = formatNarration(content);
  return (
    <div className="stop-section">
      <h3 className="stop-section-title">{title}</h3>
      <div className="stop-section-body markdown-content">
        <Markdown remarkPlugins={[remarkGfm]}>{formatted}</Markdown>
      </div>
    </div>
  );
}

function MetaPill({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <span className="meta-pill">
      <span className="meta-pill-label">{label}</span>
      <span className={`meta-pill-value ${mono ? 'mono' : ''}`}>{value}</span>
    </span>
  );
}

function formatNarration(text: string): string {
  if (text.includes(' - ') && text.split(' - ').length > 2) {
    const parts = text.split(/(?:^|\s)- /);
    if (parts.length > 2) {
      const intro = parts[0].trim();
      const items = parts.slice(1).map((p) => `- ${p.trim()}`).join('\n');
      return intro ? `${intro}\n\n${items}` : items;
    }
  }
  return text;
}

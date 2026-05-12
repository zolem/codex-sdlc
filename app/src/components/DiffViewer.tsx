import { useMemo, Component, ReactNode } from 'react';
import { PatchDiff } from '@pierre/diffs/react';

interface Props {
  diff: string | null;
  filePath: string | null;
}

export function DiffViewer({ diff, filePath }: Props) {
  if (!filePath) {
    return null;
  }

  if (diff === null) {
    return (
      <div className="diff-container">
        <div className="diff-header">{filePath}</div>
        <div className="diff-body">
          <pre style={{ color: 'var(--text-muted)', padding: '12px 16px' }}>Loading diff...</pre>
        </div>
      </div>
    );
  }

  const normalizedPatch = useMemo(() => normalizePatch(diff, filePath), [diff, filePath]);

  if (!normalizedPatch) {
    return (
      <div className="diff-container">
        <div className="diff-header">{filePath}</div>
        <div className="diff-body">
          <pre style={{ color: 'var(--text-muted)', padding: '12px 16px' }}>No diff available for this file.</pre>
        </div>
      </div>
    );
  }

  return (
    <DiffErrorBoundary filePath={filePath} rawDiff={normalizedPatch}>
      <div className="diff-viewer">
        <PatchDiff
          patch={normalizedPatch}
          options={{ theme: 'github-dark' as const, diffStyle: 'split' as const }}
        />
      </div>
    </DiffErrorBoundary>
  );
}

function normalizePatch(raw: string, filePath: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const fileDiffs = trimmed.split(/^(?=diff --git )/m);
  const relevant = fileDiffs.filter((chunk) => chunk.startsWith('diff --git'));

  if (relevant.length === 1) {
    return relevant[0];
  }

  if (relevant.length > 1) {
    const match = relevant.find(
      (chunk) => chunk.includes(`b/${filePath}`) || chunk.includes(`a/${filePath}`)
    );
    return match ?? relevant[0];
  }

  if (trimmed.includes('@@') && !trimmed.startsWith('diff --git')) {
    return `diff --git a/${filePath} b/${filePath}\n--- a/${filePath}\n+++ b/${filePath}\n${trimmed}`;
  }

  return null;
}

interface ErrorBoundaryProps {
  filePath: string;
  rawDiff: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class DiffErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.rawDiff !== this.props.rawDiff) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return <FallbackDiff diff={this.props.rawDiff} filePath={this.props.filePath} />;
    }
    return this.props.children;
  }
}

function FallbackDiff({ diff, filePath }: { diff: string; filePath: string }) {
  const lines = diff.split('\n');
  return (
    <div className="diff-container">
      <div className="diff-header">{filePath}</div>
      <div className="diff-body">
        <pre>
          {lines.map((line, i) => (
            <div key={i} className={`diff-line ${lineClass(line)}`}>
              {line}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

function lineClass(line: string): string {
  if (line.startsWith('@@')) return 'hunk';
  if (line.startsWith('+') && !line.startsWith('+++')) return 'add';
  if (line.startsWith('-') && !line.startsWith('---')) return 'del';
  return '';
}

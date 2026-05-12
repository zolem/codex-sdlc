import { CommitKind, Stop, WalkthroughDoc } from './types';

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
const STOP_HEADER_RE = /^##\s+Stop\s+(\d+)\s+of\s+(\d+)\s*[—\-]\s*(.+?)\s*$/m;

export function parseWalkthrough(content: string): WalkthroughDoc | undefined {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return undefined;

  const meta = parseFrontmatter(match[1]);
  const body = match[2];

  const phase = Number(meta.phase);
  if (!Number.isFinite(phase)) return undefined;

  const sections = splitSections(body);
  const intro = sections.intro.trim();
  const stops = sections.stops.map(parseStop).filter((s): s is Stop => s !== undefined);

  return {
    phase,
    title: typeof meta.title === 'string' ? meta.title : `Phase ${phase}`,
    commits: parseListField(meta.commits),
    acs_covered: parseListField(meta.acs_covered),
    generatedAt: typeof meta.generated_at === 'string' ? meta.generated_at : '',
    intro,
    stops,
  };
}

interface SplitResult {
  intro: string;
  stops: string[];
}

function splitSections(body: string): SplitResult {
  const parts = body.split(/^(?=##\s+Stop\s+\d+\s+of\s+\d+)/m);
  const intro = parts[0] ?? '';
  const stops = parts.slice(1);
  return { intro, stops };
}

interface ParsedFields {
  Commit?: string;
  Kind?: string;
  Focus?: string;
  ACs?: string;
  'What changed'?: string;
  'Why this way'?: string;
  'Triggered by'?: string;
  'What to verify'?: string;
}

function parseStop(section: string): Stop | undefined {
  const headerMatch = section.match(STOP_HEADER_RE);
  if (!headerMatch) return undefined;

  const index = Number(headerMatch[1]);
  const total = Number(headerMatch[2]);
  const titleRaw = headerMatch[3].trim();

  const fields = parseStopFields(section);

  const sha = extractSha(fields.Commit ?? '');
  if (!sha) return undefined;

  const kind: CommitKind =
    /trouble\s*spot|fix-?up|fixup/i.test(titleRaw) || /fix-?up/i.test(fields.Kind ?? '')
      ? 'fixup'
      : 'work_item';

  const focus = parseFocus(fields.Focus);

  return {
    index,
    total,
    title: titleRaw,
    kind,
    commitSha: sha,
    focusPath: focus?.path,
    focusRange: focus?.range,
    acs: parseListField(fields.ACs),
    whatChanged: (fields['What changed'] ?? '').trim(),
    whyThisWay: fields['Why this way']?.trim(),
    triggeredBy: fields['Triggered by']?.trim(),
    whatToVerify: (fields['What to verify'] ?? '').trim(),
  };
}

const FIELD_LINE_RE = /^-\s+\*\*([^*:]+?):?\*\*:?\s*(.*)$/;

function parseStopFields(section: string): ParsedFields {
  const fields: Record<string, string> = {};
  const lines = section.split('\n');
  let currentKey: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) continue;
    const m = line.match(FIELD_LINE_RE);
    if (m) {
      currentKey = m[1].trim();
      fields[currentKey] = m[2].trim();
      continue;
    }
    if (currentKey && line.startsWith('  ') && line.trim() !== '') {
      fields[currentKey] = `${fields[currentKey] ?? ''} ${line.trim()}`.trim();
      continue;
    }
    if (line.trim() === '') {
      currentKey = undefined;
    }
  }

  return fields as ParsedFields;
}

function extractSha(commitField: string): string | undefined {
  const m = commitField.match(/`?([0-9a-f]{6,40})`?/i);
  return m?.[1];
}

interface FocusParts {
  path: string;
  range?: [number, number];
}

function parseFocus(field?: string): FocusParts | undefined {
  if (!field) return undefined;
  const tick = field.match(/`([^`]+)`/);
  const candidate = (tick ? tick[1] : field).trim();
  if (!candidate) return undefined;
  const m = candidate.match(/^([^\s]+?)(?::(\d+)(?:[-–](\d+))?)?$/);
  if (!m) return { path: candidate };
  const path = m[1];
  const start = m[2] ? Number(m[2]) : undefined;
  const end = m[3] ? Number(m[3]) : start;
  if (start && end) return { path, range: [start, end] };
  return { path };
}

function parseFrontmatter(yaml: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const line of yaml.split('\n')) {
    const m = line.match(/^([\w-]+):\s*(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim();
  }
  return out;
}

function parseListField(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

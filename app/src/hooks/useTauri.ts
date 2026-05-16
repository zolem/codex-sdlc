import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { RunSummary, StackJson } from '../shared/types';

export async function startWatch(repoPath: string): Promise<void> {
  return invoke<void>('start_watch', { repoPath });
}

export async function onRunsChanged(handler: () => void): Promise<UnlistenFn> {
  return listen('runs-changed', () => handler());
}

export async function onRunChanged(handler: (slug: string) => void): Promise<UnlistenFn> {
  return listen<{ slug: string }>('run-changed', (e) => handler(e.payload.slug));
}

export async function discoverRuns(repoPath: string): Promise<RunSummary[]> {
  return invoke<RunSummary[]>('discover_runs', { repoPath });
}

export async function getRun(repoPath: string, slug: string): Promise<StackJson> {
  return invoke<StackJson>('get_run', { repoPath, slug });
}

export async function getWalkthrough(repoPath: string, slug: string, phase: number): Promise<string> {
  return invoke<string>('get_walkthrough', { repoPath, slug, phase });
}

export async function getDiff(repoPath: string, sha: string, filePath: string): Promise<string> {
  return invoke<string>('get_diff', { repoPath, sha, filePath });
}

export async function getCommitFiles(repoPath: string, sha: string): Promise<string[]> {
  return invoke<string[]>('get_commit_files', { repoPath, sha });
}

export async function listDocuments(repoPath: string, slug: string): Promise<string[]> {
  return invoke<string[]>('list_documents', { repoPath, slug });
}

export async function getDocument(repoPath: string, slug: string, docPath: string): Promise<string> {
  return invoke<string>('get_document', { repoPath, slug, docPath });
}

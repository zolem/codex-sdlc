import { invoke } from '@tauri-apps/api/core';
import { RunSummary, StackJson } from '../shared/types';

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

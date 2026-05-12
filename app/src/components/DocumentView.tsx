import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getDocument } from '../hooks/useTauri';

interface Props {
  repoPath: string;
  slug: string;
  docPath: string;
  title: string;
}

export function DocumentView({ repoPath, slug, docPath, title }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setContent(null);
    setError(null);
    getDocument(repoPath, slug, docPath)
      .then(setContent)
      .catch((e) => setError(String(e)));
  }, [repoPath, slug, docPath]);

  return (
    <div className="document-view">
      <div className="document-header">
        <h1 className="document-title">{title}</h1>
        <code className="document-path">{docPath}</code>
      </div>
      <div className="document-body">
        {error ? (
          <div className="document-error">{error}</div>
        ) : content === null ? (
          <div className="loading">Loading document...</div>
        ) : (
          <div className="markdown-content">
            <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
          </div>
        )}
      </div>
    </div>
  );
}

// Renders question explanations stored as light markdown.
// Bank format: **HEADING:** lines, single-newline line breaks, and "• " bullet lines.
// Plain markdown treats single newlines as spaces and doesn't know "•", so we
// normalise first: bullets become "- " list items and other single newlines
// become hard breaks.
'use client';
import ReactMarkdown from 'react-markdown';

export function normaliseExplanation(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let prevKind: 'blank' | 'text' | 'list' = 'blank';
  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[•●▪\-*]\s+(.*)$/);
    if (!line.trim()) {
      out.push('');
      prevKind = 'blank';
    } else if (bullet) {
      if (prevKind === 'text') out.push('');
      out.push(`- ${bullet[1]}`);
      prevKind = 'list';
    } else {
      if (prevKind === 'list') out.push('');
      if (prevKind === 'text') out[out.length - 1] += '  '; // markdown hard break
      out.push(line);
      prevKind = 'text';
    }
  }
  return out.join('\n');
}

export default function ExplanationBody({ text, isCorrect }: { text: string; isCorrect: boolean }) {
  const headingColor = isCorrect ? 'text-green-800' : 'text-red-800';
  const bulletColor = isCorrect ? 'text-green-700' : 'text-red-700';
  return (
    <ReactMarkdown
      components={{
        strong: ({ children }) => <strong className={`font-semibold ${headingColor}`}>{children}</strong>,
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="mb-2 mt-1 space-y-0.5">{children}</ul>,
        li: ({ children }) => (
          <li className={`flex items-start gap-1.5 ${bulletColor}`}>
            <span className="mt-2 w-1 h-1 rounded-full bg-current flex-shrink-0" />
            <span>{children}</span>
          </li>
        ),
      }}
    >
      {normaliseExplanation(text)}
    </ReactMarkdown>
  );
}

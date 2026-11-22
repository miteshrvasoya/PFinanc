import React from 'react';

/** Renders the small subset of Markdown the assistant uses: paragraphs, "-" bullets, **bold** and `code`. */
const inline = (text: string, keyBase: string): React.ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={`${keyBase}${i}`} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={`${keyBase}${i}`} className="px-1 py-0.5 rounded bg-slate-800 text-indigo-300 text-[0.85em]">{part.slice(1, -1)}</code>;
    return <React.Fragment key={`${keyBase}${i}`}>{part}</React.Fragment>;
  });

export const RichText: React.FC<{ text: string }> = ({ text }) => {
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (k: number) => {
    if (bullets.length) {
      blocks.push(
        <ul key={`ul${k}`} className="list-disc pl-5 space-y-1">
          {bullets.map((b, i) => <li key={i}>{inline(b, `b${k}-${i}`)}</li>)}
        </ul>
      );
      bullets = [];
    }
  };
  text.split('\n').forEach((raw, i) => {
    const line = raw.trimEnd();
    const m = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (m) { bullets.push(m[1]); return; }
    flush(i);
    if (line.trim()) blocks.push(<p key={`p${i}`}>{inline(line.replace(/^#{1,6}\s+/, ''), `p${i}-`)}</p>);
  });
  flush(text.length);
  return <div className="space-y-2 leading-relaxed">{blocks}</div>;
};

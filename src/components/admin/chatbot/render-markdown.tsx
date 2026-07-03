import { type ReactNode } from "react";

export function renderSimpleMarkdown(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    const match = part.match(/^\*\*([^*]+)\*\*$/);
    if (match) {
      return (
        <strong key={index} className="font-semibold text-slate-950">
          {match[1]}
        </strong>
      );
    }

    return (
      <span key={index} className="whitespace-pre-wrap">
        {part}
      </span>
    );
  });
}
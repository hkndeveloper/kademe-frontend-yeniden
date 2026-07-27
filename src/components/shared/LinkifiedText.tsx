"use client";

import type { HTMLAttributes } from "react";

const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

const trailingPunctuationPattern = /[),.;:!?]+$/;

function normalizeHref(url: string) {
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
}

export function LinkifiedText({ text, className, ...props }: { text?: string | null } & HTMLAttributes<HTMLParagraphElement>) {
  const value = text ?? "";
  const parts = value.split(urlPattern);

  return (
    <p className={className} {...props}>
      {parts.map((part, index) => {
        if (!part.match(urlPattern)) {
          return <span key={`${index}-${part}`}>{part}</span>;
        }

        const punctuation = part.match(trailingPunctuationPattern)?.[0] ?? "";
        const cleanUrl = punctuation ? part.slice(0, -punctuation.length) : part;

        return (
          <span key={`${index}-${part}`}>
            <a
              href={normalizeHref(cleanUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:text-primary/80"
            >
              {cleanUrl}
            </a>
            {punctuation}
          </span>
        );
      })}
    </p>
  );
}

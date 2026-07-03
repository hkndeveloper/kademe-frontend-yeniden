interface ChatSuggestionsProps {
  suggestions: string[];
  disabled: boolean;
  onSelect: (value: string) => void;
}

export function ChatSuggestions({ suggestions, disabled, onSelect }: ChatSuggestionsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onSelect(suggestion)}
          disabled={disabled}
          className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
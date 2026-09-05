import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

export function TagInput({
  id,
  label,
  placeholder,
  suggestions,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  placeholder: string;
  suggestions: string[];
  value: string[];
  onChange: (next: string[]) => void;
  error?: string | undefined;
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const tag = raw.trim().slice(0, 40);
    if (!tag || value.some((v) => v.toLowerCase() === tag.toLowerCase())) return;
    if (value.length >= 12) return;
    onChange([...value, tag]);
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div>
      <label htmlFor={id} className="font-display text-sm font-semibold">
        {label}
      </label>
      <div className="glass mt-2 flex flex-wrap items-center gap-2 rounded-2xl p-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== tag))}
              aria-label={`Remove ${tag}`}
              className="grid h-5 w-5 place-items-center rounded-full hover:bg-primary/30"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="min-h-11 min-w-40 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {suggestions
          .filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()))
          .slice(0, 8)
          .map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              + {s}
            </button>
          ))}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

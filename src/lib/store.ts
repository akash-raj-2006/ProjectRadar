import { useSyncExternalStore } from "react";
import type { Breakdown, GeneratorInput, Idea } from "./mentor-types";

export const logKinds = ["code", "bug", "deploy", "note"] as const;
export type LogKind = (typeof logKinds)[number];

export type BuildLog = {
  id: string;
  ideaId: string;
  kind: LogKind;
  note: string;
  createdAt: string;
};

export type StepTimer = {
  /** Milliseconds accumulated from finished runs. */
  elapsedMs: number;
  /** Epoch ms when the running session began, or null when paused. */
  startedAt: number | null;
};

export type StoreState = {
  input: GeneratorInput | null;
  ideas: Idea[];
  bookmarks: string[];
  breakdowns: Record<string, Breakdown>;
  progress: Record<string, number[]>;
  logs: BuildLog[];
  timers: Record<string, Record<string, StepTimer>>;
  answers: Record<string, Record<string, string>>;
};

const KEY = "promptwars-mentor-v1";

const empty: StoreState = {
  input: null,
  ideas: [],
  bookmarks: [],
  breakdowns: {},
  progress: {},
  logs: [],
  timers: {},
  answers: {},
};


let state: StoreState = empty;
let hydrated = false;
const listeners = new Set<() => void>();


function read(): StoreState {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty;
    return { ...empty, ...(JSON.parse(raw) as Partial<StoreState>) };
  } catch {
    return empty;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — keep in-memory state */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  if (!hydrated) {
    hydrated = true;
    state = read();
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function set(update: (prev: StoreState) => StoreState) {
  state = update(state);
  persist();
  emit();
}

export function useStore(): StoreState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => empty,
  );
}

export const actions = {
  saveRun(input: GeneratorInput, ideas: Idea[]) {
    set((prev) => ({ ...prev, input, ideas }));
  },
  toggleBookmark(id: string) {
    set((prev) => ({
      ...prev,
      bookmarks: prev.bookmarks.includes(id)
        ? prev.bookmarks.filter((b) => b !== id)
        : [...prev.bookmarks, id],
    }));
  },
  setBreakdown(id: string, breakdown: Breakdown) {
    set((prev) => ({
      ...prev,
      breakdowns: { ...prev.breakdowns, [id]: breakdown },
      progress: { ...prev.progress, [id]: prev.progress[id] ?? [] },
    }));
  },
  toggleStep(id: string, index: number) {
    set((prev) => {
      const current = prev.progress[id] ?? [];
      const completing = !current.includes(index);
      const forIdea = { ...(prev.timers[id] ?? {}) };
      const timer = forIdea[String(index)];
      // Completing a step banks its running time so the log reflects reality.
      if (completing && timer?.startedAt) {
        forIdea[String(index)] = {
          elapsedMs: timer.elapsedMs + (Date.now() - timer.startedAt),
          startedAt: null,
        };
      }
      return {
        ...prev,
        timers: { ...prev.timers, [id]: forIdea },
        progress: {
          ...prev.progress,
          [id]: completing ? [...current, index] : current.filter((i) => i !== index),
        },
      };
    });
  },

  addLog(ideaId: string, kind: LogKind, note: string) {
    const entry: BuildLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ideaId,
      kind,
      note,
      createdAt: new Date().toISOString(),
    };
    set((prev) => ({ ...prev, logs: [entry, ...prev.logs] }));
  },
  startStepTimer(id: string, index: number) {
    set((prev) => {
      const forIdea = { ...(prev.timers[id] ?? {}) };
      // Only one step per idea runs at a time — bank any other running step.
      const now = Date.now();
      for (const [key, timer] of Object.entries(forIdea)) {
        if (timer.startedAt !== null) {
          forIdea[key] = { elapsedMs: timer.elapsedMs + (now - timer.startedAt), startedAt: null };
        }
      }
      const current = forIdea[String(index)] ?? { elapsedMs: 0, startedAt: null };
      forIdea[String(index)] = { elapsedMs: current.elapsedMs, startedAt: now };
      return { ...prev, timers: { ...prev.timers, [id]: forIdea } };
    });
  },
  pauseStepTimer(id: string, index: number) {
    set((prev) => {
      const forIdea = { ...(prev.timers[id] ?? {}) };
      const current = forIdea[String(index)];
      if (!current?.startedAt) return prev;
      forIdea[String(index)] = {
        elapsedMs: current.elapsedMs + (Date.now() - current.startedAt),
        startedAt: null,
      };
      return { ...prev, timers: { ...prev.timers, [id]: forIdea } };
    });
  },
  setAnswer(ideaId: string, questionId: string, value: string) {
    set((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [ideaId]: { ...(prev.answers[ideaId] ?? {}), [questionId]: value },
      },
    }));
  },
  resetStepTimer(id: string, index: number) {
    set((prev) => {
      const forIdea = { ...(prev.timers[id] ?? {}) };
      forIdea[String(index)] = { elapsedMs: 0, startedAt: null };
      return { ...prev, timers: { ...prev.timers, [id]: forIdea } };
    });
  },
  removeLog(logId: string) {

    set((prev) => ({ ...prev, logs: prev.logs.filter((l) => l.id !== logId) }));
  },
  clearAll() {
    set(() => empty);
  },
};


export function makeId(title: string, index: number) {
  return `${index}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
}

export function timerElapsed(timer: StepTimer | undefined, now: number): number {
  if (!timer) return 0;
  return timer.elapsedMs + (timer.startedAt ? now - timer.startedAt : 0);
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}


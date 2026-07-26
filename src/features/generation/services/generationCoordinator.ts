export type GenerationPhase = "preparing" | "running" | "cancelling" | "succeeded" | "failed";

export type GenerationJob = {
  chatId: string;
  phase: GenerationPhase;
  startedAt?: number;
  estimatedSeconds?: number;
  error?: string;
};

type GenerationRun = (controls: { setRunning: (estimatedSeconds: number) => void; signal: AbortSignal }) => Promise<void>;
type GenerationOutcome = "succeeded" | "failed" | "cancelled";

type ActiveJob = {
  job: GenerationJob;
  controller: AbortController;
  promise: Promise<GenerationOutcome>;
};

const jobs = new Map<string, ActiveJob>();
const listeners = new Set<() => void>();

export const generationCoordinator = {
  start(chatId: string, run: GenerationRun): Promise<GenerationOutcome> {
    const existing = jobs.get(chatId);
    if (existing?.job.phase === "failed" || existing?.job.phase === "succeeded") jobs.delete(chatId);
    if (jobs.has(chatId)) return Promise.reject(new Error("In diesem Chat läuft bereits eine Generierung."));

    const controller = new AbortController();
    const active: ActiveJob = {
      job: { chatId, phase: "preparing" },
      controller,
      promise: Promise.resolve("failed")
    };
    active.promise = runGeneration(active, run);
    jobs.set(chatId, active);
    notify();
    return active.promise;
  },

  cancel(chatId: string): void {
    const active = jobs.get(chatId);
    if (!active || active.job.phase === "cancelling") return;
    active.job.phase = "cancelling";
    active.controller.abort();
    notify();
  },

  async cancelAndWait(chatId: string): Promise<void> {
    this.cancel(chatId);
    await jobs.get(chatId)?.promise;
  },

  abortAll(): void {
    for (const chatId of jobs.keys()) this.cancel(chatId);
  },

  get(chatId?: string): GenerationJob | undefined {
    return chatId ? jobs.get(chatId)?.job : undefined;
  },

  hasActiveJobs(): boolean {
    return [...jobs.values()].some(({ job }) => job.phase === "preparing" || job.phase === "running" || job.phase === "cancelling");
  },

  dismiss(chatId: string): void {
    const active = jobs.get(chatId);
    if (!active || active.job.phase === "running" || active.job.phase === "preparing" || active.job.phase === "cancelling") return;
    jobs.delete(chatId);
    notify();
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};

async function runGeneration(active: ActiveJob, run: GenerationRun): Promise<GenerationOutcome> {
  try {
    await run({
      signal: active.controller.signal,
      setRunning: (estimatedSeconds) => {
        if (active.controller.signal.aborted) return;
        active.job.phase = "running";
        active.job.startedAt = Date.now();
        active.job.estimatedSeconds = Math.max(estimatedSeconds, 1);
        notify();
      }
    });
    active.job.phase = "succeeded";
    notify();
    return "succeeded";
  } catch (error) {
    if (active.controller.signal.aborted || isAbortError(error)) {
      active.job.phase = "cancelling";
      notify();
      return "cancelled";
    }
    active.job.phase = "failed";
    active.job.error = error instanceof Error ? error.message : "Die Generierung ist fehlgeschlagen.";
    notify();
    return "failed";
  } finally {
    window.setTimeout(() => {
      if (jobs.get(active.job.chatId) === active) {
        jobs.delete(active.job.chatId);
        notify();
      }
    }, active.job.phase === "succeeded" ? 350 : active.job.phase === "failed" ? 5000 : 0);
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function notify() {
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") window.addEventListener("pagehide", () => generationCoordinator.abortAll());

"use client";

import { useEffect } from "react";

export default function TripError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Trip page error:", error);
  }, [error]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center gap-6 bg-[var(--color-background)]">
      <div className="surface-glass rounded-2xl px-8 py-8 max-w-sm text-center shadow-soft-md">
        <h1 className="text-display text-2xl text-stone-900 mb-2">
          <span className="italic">Trip</span>{" "}
          <span className="text-stone-400">not found</span>
        </h1>
        <p className="text-meta text-stone-500 mb-6">
          This surf trip doesn&apos;t exist or may have expired.
        </p>
        <button
          onClick={reset}
          className="surface-pill px-4 py-2 text-sm text-stone-700 hover:bg-white transition-all ease-soft"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

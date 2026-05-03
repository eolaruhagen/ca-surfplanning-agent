"use client";

import type { ReactNode } from "react";

interface CardShellProps {
  cardNumber: number; // 1-indexed display number
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * CardShell — consistent chrome wrapper for each intake card.
 * Renders the card number eyebrow, title, and body slot.
 */
export default function CardShell({
  cardNumber,
  title,
  children,
  className = "",
}: CardShellProps) {
  return (
    <div
      className={`surface-glass flex flex-col gap-6 p-8 w-full max-w-lg mx-auto ${className}`}
    >
      <div className="flex flex-col gap-1">
        <span className="text-eyebrow">Step {cardNumber} of 8</span>
        <h2 className="text-display text-3xl text-stone-900">{title}</h2>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

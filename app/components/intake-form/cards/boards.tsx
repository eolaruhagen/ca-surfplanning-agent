"use client";

import { useRef } from "react";
import type { BoardDraft } from "../hook";
import { useBoards } from "./boards.hook";
import CardShell from "../card-shell";

interface BoardRowProps {
  board: BoardDraft;
  canRemove: boolean;
  onRemove: () => void;
  onLabelChange: (val: string) => void;
  onLengthChange: (val: number) => void;
  onPhotoChange: (file: File) => void;
}

function BoardRow({
  board,
  canRemove,
  onRemove,
  onLabelChange,
  onLengthChange,
  onPhotoChange,
}: BoardRowProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="surface-glass p-4 flex flex-col gap-3 relative">
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-3 right-3 text-stone-400 hover:text-stone-700 text-sm"
          aria-label="Remove board"
        >
          ✕
        </button>
      )}

      {/* Photo upload */}
      <div
        className="w-full h-24 rounded-lg border-2 border-dashed border-stone-200 flex items-center justify-center cursor-pointer hover:border-stone-400 transition-colors duration-150 overflow-hidden"
        onClick={() => fileRef.current?.click()}
      >
        {board.photo_data_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={board.photo_data_url}
            alt="Board photo"
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <span className="text-meta text-stone-400">📷 Add photo</span>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPhotoChange(file);
          }}
        />
      </div>

      {/* Label */}
      <input
        type="text"
        value={board.user_label}
        onChange={(e) => onLabelChange(e.target.value)}
        placeholder={`e.g. "6'2 shortboard"`}
        className="w-full rounded-lg border border-stone-200/60 bg-white/70 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-400 transition-colors duration-150"
      />

      {/* Length slider */}
      <div className="flex items-center gap-3">
        <span className="text-meta text-stone-500 w-16 flex-shrink-0">
          {board.length_inches}&Prime;
        </span>
        <input
          type="range"
          min={48}
          max={132}
          step={1}
          value={board.length_inches}
          onChange={(e) => onLengthChange(Number(e.target.value))}
          className="flex-1 accent-stone-900"
        />
        <span className="text-meta text-stone-400 w-12 text-right flex-shrink-0">
          {(board.length_inches / 12).toFixed(1)}ft
        </span>
      </div>
    </div>
  );
}

interface BoardsCardProps {
  boards: BoardDraft[];
  addBoard: () => void;
  removeBoard: (id: string) => void;
  updateBoard: (id: string, patch: Partial<Omit<BoardDraft, "id">>) => void;
}

export default function BoardsCard({
  boards,
  addBoard,
  removeBoard,
  updateBoard,
}: BoardsCardProps) {
  const { handlePhotoChange, canAddMore } = useBoards(
    boards,
    addBoard,
    removeBoard,
    updateBoard,
  );

  return (
    <CardShell cardNumber={7} title="Your quiver">
      <p className="text-meta text-stone-500">Add 1–4 boards. The agent will match each to ideal conditions.</p>

      <div className="flex flex-col gap-3">
        {boards.map((board) => (
          <BoardRow
            key={board.id}
            board={board}
            canRemove={boards.length > 1}
            onRemove={() => removeBoard(board.id)}
            onLabelChange={(val) => updateBoard(board.id, { user_label: val })}
            onLengthChange={(val) => updateBoard(board.id, { length_inches: val })}
            onPhotoChange={(file) => handlePhotoChange(board.id, file)}
          />
        ))}
      </div>

      {canAddMore && (
        <button
          type="button"
          onClick={addBoard}
          className="w-full rounded-xl border-2 border-dashed border-stone-200 py-3 text-sm text-stone-500 hover:border-stone-400 hover:text-stone-700 transition-all duration-150"
        >
          + Add another board
        </button>
      )}
    </CardShell>
  );
}

"use client";

import { useCallback } from "react";
import type { BoardDraft } from "../hook";
import { downscaleImage } from "../helpers/downscale-image";

export interface UseBoardsReturn {
  boards: BoardDraft[];
  addBoard: () => void;
  removeBoard: (id: string) => void;
  updateBoard: (id: string, patch: Partial<Omit<BoardDraft, "id">>) => void;
  /** Handle a file input change for a board's photo */
  handlePhotoChange: (id: string, file: File) => Promise<void>;
  canAddMore: boolean;
}

/**
 * useBoards — thin wrapper around the intake form's board actions.
 * Adds photo-upload handling (downscale → base64) on top of the core actions.
 */
export function useBoards(
  boards: BoardDraft[],
  addBoard: () => void,
  removeBoard: (id: string) => void,
  updateBoard: (id: string, patch: Partial<Omit<BoardDraft, "id">>) => void,
): UseBoardsReturn {
  const handlePhotoChange = useCallback(
    async (id: string, file: File) => {
      try {
        const dataUrl = await downscaleImage(file);
        updateBoard(id, { photo_data_url: dataUrl });
      } catch {
        // Silently ignore; user can retry
      }
    },
    [updateBoard],
  );

  return {
    boards,
    addBoard,
    removeBoard,
    updateBoard,
    handlePhotoChange,
    canAddMore: boards.length < 4,
  };
}

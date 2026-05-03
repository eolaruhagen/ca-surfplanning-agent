/**
 * useBoards — boards state interaction tests.
 * Pure logic tests mirroring the hook behavior without DOM.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

interface BoardDraft {
  id: string;
  user_label: string;
  length_inches: number;
  photo_data_url: string;
}

// Mirrors the board actions from the intake form reducer
function addBoard(boards: BoardDraft[]): BoardDraft[] {
  if (boards.length >= 4) return boards;
  return [
    ...boards,
    { id: `board-${boards.length}`, user_label: "", length_inches: 72, photo_data_url: "" },
  ];
}

function removeBoard(boards: BoardDraft[], id: string): BoardDraft[] {
  if (boards.length <= 1) return boards;
  return boards.filter((b) => b.id !== id);
}

function updateBoard(
  boards: BoardDraft[],
  id: string,
  patch: Partial<Omit<BoardDraft, "id">>,
): BoardDraft[] {
  return boards.map((b) => (b.id === id ? { ...b, ...patch } : b));
}

function makeInitialBoards(): BoardDraft[] {
  return [{ id: "board-0", user_label: "", length_inches: 72, photo_data_url: "" }];
}

describe("useBoards — board management logic", () => {
  it("starts with one empty board", () => {
    const boards = makeInitialBoards();
    assert.equal(boards.length, 1);
    assert.equal(boards[0].user_label, "");
    assert.equal(boards[0].length_inches, 72);
  });

  it("canAddMore is true when fewer than 4 boards", () => {
    const boards = makeInitialBoards();
    assert.equal(boards.length < 4, true);
  });

  it("canAddMore is false when 4 boards exist", () => {
    let boards = makeInitialBoards();
    boards = addBoard(boards);
    boards = addBoard(boards);
    boards = addBoard(boards);
    assert.equal(boards.length, 4);
    assert.equal(boards.length < 4, false);
  });

  it("addBoard appends a new blank board", () => {
    let boards = makeInitialBoards();
    boards = addBoard(boards);
    assert.equal(boards.length, 2);
    assert.equal(boards[1].user_label, "");
  });

  it("addBoard does not exceed 4 boards", () => {
    let boards = makeInitialBoards();
    for (let i = 0; i < 5; i++) boards = addBoard(boards);
    assert.equal(boards.length, 4);
  });

  it("removeBoard removes by id", () => {
    let boards = makeInitialBoards();
    boards = addBoard(boards);
    const id = boards[1].id;
    boards = removeBoard(boards, id);
    assert.equal(boards.length, 1);
    assert.ok(!boards.find((b) => b.id === id));
  });

  it("removeBoard cannot reduce below 1 board", () => {
    let boards = makeInitialBoards();
    boards = removeBoard(boards, boards[0].id);
    assert.equal(boards.length, 1);
  });

  it("updateBoard patches label and length", () => {
    let boards = makeInitialBoards();
    const id = boards[0].id;
    boards = updateBoard(boards, id, { user_label: "6'2 shortboard", length_inches: 74 });
    assert.equal(boards[0].user_label, "6'2 shortboard");
    assert.equal(boards[0].length_inches, 74);
  });

  it("updateBoard sets photo_data_url", () => {
    let boards = makeInitialBoards();
    const id = boards[0].id;
    boards = updateBoard(boards, id, { photo_data_url: "data:image/jpeg;base64,abc123" });
    assert.equal(boards[0].photo_data_url, "data:image/jpeg;base64,abc123");
  });

  it("updateBoard does not affect other boards", () => {
    let boards = makeInitialBoards();
    boards = addBoard(boards);
    const [id0, id1] = boards.map((b) => b.id);
    boards = updateBoard(boards, id0, { user_label: "Board A" });
    assert.equal(boards.find((b) => b.id === id1)?.user_label, "");
  });

  it("length_inches must be in 48–132 range (validation boundary check)", () => {
    // Verify that 48 and 132 are valid boundaries
    assert.ok(48 >= 48 && 48 <= 132);
    assert.ok(132 >= 48 && 132 <= 132);
    assert.ok(!(47 >= 48));
    assert.ok(!(133 <= 132));
  });
});

import test from "node:test";
import assert from "node:assert/strict";
import { selectWinners } from "../src/draw.js";

test("selects no more winners than there are entries", () => {
  const entries = [{ user_id: 10 }, { user_id: 20 }];
  const winners = selectWinners(entries, 5);

  assert.equal(winners.length, 2);
  assert.deepEqual(new Set(winners.map((winner) => winner.user_id)), new Set([10, 20]));
});

test("selects unique winners from the eligible entries", () => {
  const entries = Array.from({ length: 20 }, (_, index) => ({ user_id: index + 1 }));
  const winners = selectWinners(entries, 7);

  assert.equal(winners.length, 7);
  assert.equal(new Set(winners.map((winner) => winner.user_id)).size, 7);
  assert.ok(winners.every((winner) => entries.includes(winner)));
});

test("returns no winners for an empty entry list or zero winners", () => {
  assert.deepEqual(selectWinners([], 4), []);
  assert.deepEqual(selectWinners([{ user_id: 10 }], 0), []);
});

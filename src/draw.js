import { randomInt } from "node:crypto";

export function selectWinners(entries, winnerCount) {
  const pool = [...entries];
  const winners = [];
  const count = Math.min(Math.max(0, winnerCount), pool.length);

  for (let index = 0; index < count; index += 1) {
    const winnerIndex = randomInt(pool.length);
    winners.push(pool.splice(winnerIndex, 1)[0]);
  }

  return winners;
}

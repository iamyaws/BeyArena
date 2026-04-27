// src/lib/elo.ts
export const K = 16;

export function computeElo(winnerElo: number, loserElo: number, winnerWon = true) {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const actualWinner = winnerWon ? 1 : 0;
  const delta = K * (actualWinner - expectedWinner);
  return {
    winnerNew: Math.round(winnerElo + delta),
    loserNew: Math.round(loserElo - delta),
    delta: Math.round(delta),
  };
}

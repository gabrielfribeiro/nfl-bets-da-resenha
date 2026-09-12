/**
 * Calculates current streak for a team based on chronological resolved bets.
 * Returns { count: number, type: 'win' | 'loss' | 'none' }
 */
export function calculateTeamStreak(bets, teamId) {
  // Filter bets for this team that have a resolved result (win or loss)
  const teamBets = bets
    .filter((b) => b.bettingOnTeamId === teamId && (b.result === "win" || b.result === "loss"))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (teamBets.length === 0) {
    return { count: 0, type: "none" };
  }

  const lastBet = teamBets[teamBets.length - 1];
  const streakType = lastBet.result;
  let count = 0;

  for (let i = teamBets.length - 1; i >= 0; i--) {
    if (teamBets[i].result === streakType) {
      count++;
    } else {
      break;
    }
  }

  return { count, type: streakType };
}

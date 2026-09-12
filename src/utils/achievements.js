/**
 * Achievements definitions and evaluation engine
 */
export const ACHIEVEMENTS = [
  {
    id: "first_blood",
    title: "Primeira Vitória",
    description: "Bateu a sua primeira aposta no bolão.",
    icon: "🎯",
    rarity: "Comum",
    check: (state) => state.bets.some((b) => b.result === "win"),
  },
  {
    id: "sniper_streak",
    title: "Na Mosca (Sniper)",
    description: "Conseguiu 3 vitórias consecutivas em qualquer time.",
    icon: "🎯",
    rarity: "Rara",
    check: (state) => {
      const resolved = state.bets
        .filter((b) => b.result === "win" || b.result === "loss")
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      let currentStreak = 0;
      for (const b of resolved) {
        if (b.result === "win") {
          currentStreak++;
          if (currentStreak >= 3) return true;
        } else {
          currentStreak = 0;
        }
      }
      return false;
    },
  },
  {
    id: "money_machine",
    title: "Rolo Compressor",
    description: "Fez o pote de algum time ultrapassar R$ 15,00.",
    icon: "🚜",
    rarity: "Épica",
    check: (state) => {
      return Object.values(state.teams).some((t) => t.pot >= 15);
    },
  },
  {
    id: "hall_of_famer",
    title: "Lenda da NFL",
    description: "Alcançou a marca de R$ 50,00 no pote de um único time.",
    icon: "👑",
    rarity: "Lendária",
    check: (state) => {
      return Object.values(state.teams).some((t) => t.pot >= 50);
    },
  },
  {
    id: "survivor",
    title: "Ressuscitado",
    description: "Adicionou fundos a um time zerado e depois bateu uma aposta com ele.",
    icon: "🧟",
    rarity: "Rara",
    check: (state) => {
      return Object.entries(state.teams).some(([teamId, t]) => {
        const hadZero = t.potHistory.some((val) => val === 0);
        const hasWin = t.totalWins > 0;
        return hadZero && hasWin && t.pot > 0;
      });
    },
  },
  {
    id: "underdog_king",
    title: "Caçador de Zebra",
    description: "Bateu uma aposta com odd de 1.45 ou maior.",
    icon: "🦓",
    rarity: "Rara",
    check: (state) => {
      return state.bets.some((b) => b.result === "win" && b.odd >= 1.45);
    },
  },
  {
    id: "direct_clash",
    title: "Duelo de Titãs",
    description: "Registrou uma aposta em confronto direto entre 2 times dos seus 16.",
    icon: "⚔️",
    rarity: "Comum",
    check: (state) => {
      return state.bets.some(
        (b) => state.selectedTeamIds.includes(b.teamAId) && state.selectedTeamIds.includes(b.teamBId)
      );
    },
  },
  {
    id: "veteran",
    title: "Temporada a Mil",
    description: "Alcançou a Rodada 5 ou registrou pelo menos 10 apostas.",
    icon: "🏈",
    rarity: "Épica",
    check: (state) => state.currentRound >= 5 || state.bets.length >= 10,
  },
];

export function getUnlockedAchievements(state) {
  return ACHIEVEMENTS.map((ach) => ({
    ...ach,
    unlocked: ach.check(state),
  }));
}

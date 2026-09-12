export const TIERS = [
  { id: "bronze", name: "Bronze", min: 0, badge: "🥉", color: "text-amber-600", border: "border-amber-700/50", bg: "bg-amber-950/20" },
  { id: "silver", name: "Prata", min: 5, badge: "🥈", color: "text-slate-300", border: "border-slate-500/50", bg: "bg-slate-800/20" },
  { id: "gold", name: "Ouro", min: 15, badge: "🥇", color: "text-yellow-400", border: "border-yellow-500/50", bg: "bg-yellow-950/20" },
  { id: "diamond", name: "Diamante", min: 35, badge: "💎", color: "text-cyan-400", border: "border-cyan-500/50", bg: "bg-cyan-950/20" },
  { id: "hof", name: "Hall of Fame", min: 70, badge: "🏆", color: "text-purple-400", border: "border-purple-500/50", bg: "bg-purple-950/30" },
];

export function getTier(pot) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (pot >= TIERS[i].min) {
      return TIERS[i];
    }
  }
  return TIERS[0];
}

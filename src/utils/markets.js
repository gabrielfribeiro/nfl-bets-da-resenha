export const BET_MARKETS = [
  {
    id: "moneyline",
    label: "Vencedor Seco",
    icon: "🏆",
    badge: "Moneyline",
    placeholder: "Ex: Vitória simples do time",
    defaultDetail: "Vitória do Time",
    color: "from-amber-500/20 to-yellow-500/20 text-yellow-400 border-yellow-400/40",
    chips: ["Vitória no tempo normal", "Vitória incluindo prorrogação"],
  },
  {
    id: "handicap",
    label: "Handicap",
    icon: "⚖️",
    badge: "Spread",
    placeholder: "Ex: -3.5 ou +7.0",
    defaultDetail: "Handicap",
    color: "from-blue-500/20 to-sky-500/20 text-sky-400 border-sky-400/40",
    chips: ["-1.5", "-2.5", "-3.5", "-6.5", "-7.5", "+2.5", "+3.5", "+6.5", "+7.5"],
  },
  {
    id: "over",
    label: "Mais de (Over)",
    icon: "📈",
    badge: "Over Pontos",
    placeholder: "Ex: Mais de 44.5 pontos",
    defaultDetail: "Over 44.5 pts",
    color: "from-emerald-500/20 to-green-500/20 text-emerald-400 border-emerald-400/40",
    chips: ["Over 37.5", "Over 40.5", "Over 43.5", "Over 45.5", "Over 48.5", "Over 51.5"],
  },
  {
    id: "under",
    label: "Menos de (Under)",
    icon: "📉",
    badge: "Under Pontos",
    placeholder: "Ex: Menos de 41.5 pontos",
    defaultDetail: "Under 41.5 pts",
    color: "from-rose-500/20 to-red-500/20 text-rose-400 border-rose-400/40",
    chips: ["Under 37.5", "Under 40.5", "Under 43.5", "Under 45.5", "Under 48.5", "Under 51.5"],
  },
  {
    id: "both_score",
    label: "Ambos Marcam",
    icon: "⏱️",
    badge: "Ambos Marcam",
    placeholder: "Ex: Ambos marcam no 1º quarto",
    defaultDetail: "Ambos marcam no 1º quarto",
    color: "from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-400/40",
    chips: [
      "1º Quarto",
      "2º Quarto",
      "3º Quarto",
      "4º Quarto",
      "Todos os Quartos",
      "1º Tempo",
      "2º Tempo",
      "Ambos os Tempos",
    ],
  },
  {
    id: "touchdown",
    label: "Touchdown",
    icon: "🏈",
    badge: "TD / Jogador",
    placeholder: "Ex: TD a qualquer momento",
    defaultDetail: "Touchdown a qualquer momento",
    color: "from-orange-500/20 to-amber-500/20 text-orange-400 border-orange-400/40",
    chips: ["TD a qualquer momento", "2+ TDs no jogo", "1º TD da partida"],
  },
  {
    id: "custom",
    label: "Outro / Especial",
    icon: "✨",
    badge: "Personalizado",
    placeholder: "Descreva seu palpite na resenha...",
    defaultDetail: "",
    color: "from-gray-700/30 to-gray-800/30 text-gray-300 border-gray-600/50",
    chips: ["Margem 1 a 6 pts", "Margem 7 a 12 pts", "Vence por 10+ pts"],
  },
];

export function getMarketDisplay(bet) {
  if (!bet) return "";
  const details = bet.marketDetails?.trim();
  if (details) return details;
  const market = BET_MARKETS.find((m) => m.id === bet.marketType);
  return market ? market.label : "Vencedor (Moneyline)";
}

export function getMarketBadge(bet) {
  if (!bet) return null;
  const market = BET_MARKETS.find((m) => m.id === bet.marketType);
  if (!market) return { icon: "🏆", label: "Moneyline", color: "bg-yellow-400/10 text-yellow-400 border-yellow-400/30" };
  return {
    icon: market.icon,
    label: market.badge,
    color: market.color,
  };
}

export function calculatePotentialReturn(bet, powerUpsList = []) {
  if (!bet) return { profit: 0, total: 0, multiplier: 1 };
  const amount = Number(bet.amount) || 0;
  const odd = Number(bet.odd) || 1;
  const powerObj = powerUpsList?.find((p) => p.id === bet.powerUp);
  const multiplier = powerObj?.multiplier ?? (bet.powerUp === "double" ? 2 : 1);
  const profit = parseFloat((amount * Math.max(0, odd - 1) * multiplier).toFixed(2));
  const total = parseFloat((amount + profit).toFixed(2));
  return { profit, total, multiplier };
}

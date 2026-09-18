export const TIERS = [
  {
    id: "pangare",
    name: "Pangaré",
    min: 0,
    badge: "🥜",
    desc: "Apostando moedinhas e rezando pelo milagre.",
    color: "text-amber-500",
    border: "border-amber-700/50",
    bg: "bg-amber-950/30",
  },
  {
    id: "palpiteiro",
    name: "Palpiteiro",
    min: 1.2,
    badge: "🎲",
    desc: "Já começou a engatar uns palpites e saiu do zero.",
    color: "text-yellow-400",
    border: "border-yellow-500/50",
    bg: "bg-yellow-950/30",
  },
  {
    id: "malandro",
    name: "Malandro",
    min: 1.75,
    badge: "🎩",
    desc: "Sabe a hora certa de arriscar e buscar o lucro.",
    color: "text-emerald-400",
    border: "border-emerald-500/50",
    bg: "bg-emerald-950/30",
  },
  {
    id: "raiz",
    name: "Apostador Raiz",
    min: 2.5,
    badge: "🕶️",
    desc: "Estuda as odds, não cai em armadilha e só aposta na moral.",
    color: "text-sky-400",
    border: "border-sky-500/50",
    bg: "bg-sky-950/30",
  },
  {
    id: "churrasco",
    name: "Dono do Churrasco",
    min: 3.8,
    badge: "🥩",
    desc: "Pote gordinho: já tem saldo pra bancar a picanha e a cerveja.",
    color: "text-rose-400",
    border: "border-rose-500/50",
    bg: "bg-rose-950/30",
  },
  {
    id: "tubarao",
    name: "Tubarão da Banca",
    min: 6.0,
    badge: "🦈",
    desc: "Respeitado na mesa: joga pesado e bota medo nos rivais.",
    color: "text-cyan-400",
    border: "border-cyan-500/50",
    bg: "bg-cyan-950/30",
  },
  {
    id: "iluminado",
    name: "Iluminado",
    min: 10.0,
    badge: "🚀",
    desc: "Foguete não tem ré: parece que tem pacto com a vitória.",
    color: "text-purple-400",
    border: "border-purple-500/50",
    bg: "bg-purple-950/30",
  },
  {
    id: "rei",
    name: "Rei da Resenha",
    min: 18.0,
    badge: "👑",
    desc: "O topo absoluto! Lenda viva que manda e desmanda no bolão.",
    color: "text-amber-300",
    border: "border-yellow-400/60",
    bg: "bg-gradient-to-r from-amber-500/20 to-yellow-500/20",
  },
];

export function getTier(pot) {
  const numericPot = typeof pot === "number" ? pot : parseFloat(pot) || 0;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (numericPot >= TIERS[i].min) {
      return TIERS[i];
    }
  }
  return TIERS[0];
}

export function getNextTier(pot) {
  const numericPot = typeof pot === "number" ? pot : parseFloat(pot) || 0;
  for (let i = 0; i < TIERS.length; i++) {
    if (TIERS[i].min > numericPot) {
      return TIERS[i];
    }
  }
  return null;
}

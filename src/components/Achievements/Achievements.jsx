import { useBet } from "../../context/BetContext";
import { getUnlockedAchievements } from "../../utils/achievements";

const RARITY_STYLES = {
  Comum: "bg-gray-800 text-gray-300 border-gray-700",
  Rara: "bg-blue-950/60 text-blue-300 border-blue-600/40 shadow-sm shadow-blue-500/10",
  Épica: "bg-purple-950/60 text-purple-300 border-purple-600/40 shadow-sm shadow-purple-500/10",
  Lendária: "bg-amber-950/60 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/20 animate-pulse",
};

export default function Achievements() {
  const betState = useBet();
  const achievements = getUnlockedAchievements(betState);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const progressPercent = Math.round((unlockedCount / achievements.length) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border border-gray-800 rounded-3xl p-6 mb-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl">🏅</span>
              <h2 className="text-white font-black text-2xl">Quadro de Conquistas</h2>
            </div>
            <p className="text-gray-400 text-sm">
              Desbloqueie medalhas exclusivas superando marcos no bolão com a galera
            </p>
          </div>
          <div className="text-right flex-shrink-0 bg-gray-950/70 border border-gray-800 rounded-2xl px-5 py-3">
            <span className="text-2xl font-black text-yellow-400">
              {unlockedCount} / {achievements.length}
            </span>
            <span className="text-gray-500 text-xs block font-bold uppercase tracking-wider">Desbloqueadas</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5">
          <div className="flex justify-between text-xs font-semibold mb-1.5 text-gray-400">
            <span>Progresso da Temporada</span>
            <span className="text-yellow-400 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full h-3 bg-gray-950 rounded-full overflow-hidden border border-gray-800">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid of Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {achievements.map((ach) => {
          return (
            <div
              key={ach.id}
              className={`rounded-2xl p-4 border transition-all duration-300 flex items-start gap-4 ${
                ach.unlocked
                  ? "bg-gray-900/90 border-gray-700 shadow-lg"
                  : "bg-gray-950/50 border-gray-800/60 opacity-45 grayscale"
              }`}
            >
              {/* Badge Icon */}
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-inner ${
                  ach.unlocked
                    ? "bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700"
                    : "bg-gray-900/80 border border-gray-800"
                }`}
              >
                {ach.unlocked ? ach.icon : "🔒"}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="text-white font-black text-sm truncate">{ach.title}</h4>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      RARITY_STYLES[ach.rarity]
                    }`}
                  >
                    {ach.rarity}
                  </span>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">{ach.description}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  {ach.unlocked ? (
                    <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                      <span>✓</span> Conquistada
                    </span>
                  ) : (
                    <span className="text-gray-600 text-xs font-medium">Bloqueada</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

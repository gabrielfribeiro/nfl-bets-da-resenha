import { getTeamById, getLogoUrl } from "../../data/nflTeams";
import { getTier } from "../../utils/tiers";

export default function Podium({ topTeams, teams }) {
  if (!topTeams || topTeams.length < 3) return null;

  // topTeams order: 1st, 2nd, 3rd
  const [firstId, secondId, thirdId] = topTeams;
  const first = getTeamById(firstId);
  const second = getTeamById(secondId);
  const third = getTeamById(thirdId);

  const firstPot = teams[firstId]?.pot ?? 0;
  const secondPot = teams[secondId]?.pot ?? 0;
  const thirdPot = teams[thirdId]?.pot ?? 0;

  return (
    <div className="bg-gradient-to-b from-gray-900/80 to-gray-950 border border-gray-800 rounded-3xl p-5 mb-8 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-black text-lg flex items-center gap-2">
            <span>🏆</span>
            <span>Pódio da Temporada</span>
          </h3>
          <p className="text-gray-400 text-xs">Os 3 maiores potes acumulados até o momento</p>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2.5 py-1 rounded-full">
          Top 3 Leaders
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-8 max-w-lg mx-auto">
        {/* 2nd Place (Silver) */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-2 flex justify-center">
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xl sm:text-2xl z-20 filter drop-shadow-md select-none pointer-events-none">
              🥈
            </span>
            <img
              src={getLogoUrl(second, 150)}
              alt={second?.name}
              className="w-11 h-11 sm:w-14 sm:h-14 object-contain drop-shadow-md relative z-10"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-gray-200 line-clamp-1 mb-0.5">{second?.name}</span>
          <span className="text-xs sm:text-sm font-black text-slate-300">R$ {secondPot.toFixed(2)}</span>
          <div className="w-full bg-gradient-to-t from-slate-700/40 to-slate-500/20 border-t-2 border-slate-400 rounded-t-xl h-16 sm:h-20 flex items-center justify-center mt-2">
            <span className="text-lg sm:text-xl font-black text-slate-300">2º</span>
          </div>
        </div>

        {/* 1st Place (Gold) */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-2 flex justify-center">
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-2xl sm:text-3xl animate-bounce z-20 filter drop-shadow-lg select-none pointer-events-none">
              👑
            </span>
            <img
              src={getLogoUrl(first, 150)}
              alt={first?.name}
              className="w-14 h-14 sm:w-20 sm:h-20 object-contain drop-shadow-xl relative z-10"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          </div>
          <span className="text-xs sm:text-sm font-black text-white line-clamp-1 mb-0.5">{first?.name}</span>
          <span className="text-sm sm:text-lg font-black text-yellow-400">R$ {firstPot.toFixed(2)}</span>
          <div className="w-full bg-gradient-to-t from-yellow-600/40 to-yellow-400/20 border-t-4 border-yellow-400 rounded-t-xl h-22 sm:h-28 flex items-center justify-center mt-2 shadow-lg shadow-yellow-500/10">
            <span className="text-2xl sm:text-3xl font-black text-yellow-400">1º</span>
          </div>
        </div>

        {/* 3rd Place (Bronze) */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-2 flex justify-center">
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xl sm:text-2xl z-20 filter drop-shadow-md select-none pointer-events-none">
              🥉
            </span>
            <img
              src={getLogoUrl(third, 150)}
              alt={third?.name}
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-md relative z-10"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-gray-200 line-clamp-1 mb-0.5">{third?.name}</span>
          <span className="text-xs sm:text-sm font-black text-amber-500">R$ {thirdPot.toFixed(2)}</span>
          <div className="w-full bg-gradient-to-t from-amber-800/40 to-amber-600/20 border-t-2 border-amber-600 rounded-t-xl h-12 sm:h-16 flex items-center justify-center mt-2">
            <span className="text-lg sm:text-xl font-black text-amber-500">3º</span>
          </div>
        </div>
      </div>
    </div>
  );
}

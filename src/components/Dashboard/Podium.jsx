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

      <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-4 max-w-lg mx-auto">
        {/* 2nd Place (Silver) */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-1 flex flex-col items-center justify-center w-full">
            <span className="text-xl sm:text-2xl mb-1 filter drop-shadow-md select-none pointer-events-none">
              🥈
            </span>
            <div className="h-12 sm:h-16 w-full flex items-center justify-center px-1">
              <img
                src={getLogoUrl(second, 150)}
                alt={second?.name}
                className="max-h-11 sm:max-h-14 max-w-[85%] object-contain drop-shadow-md"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            </div>
          </div>
          <div className="h-8 sm:h-9 flex items-center justify-center w-full px-1">
            <span className="text-[11px] sm:text-xs font-bold text-gray-200 line-clamp-2 leading-tight">
              {second?.name}
            </span>
          </div>
          <span className="text-xs sm:text-sm font-black text-slate-300 my-0.5">
            R$ {secondPot.toFixed(2)}
          </span>
          <div className="w-full bg-gradient-to-t from-slate-700/40 to-slate-500/20 border-t-2 border-slate-400 rounded-t-2xl h-20 sm:h-24 flex items-center justify-center mt-2 shadow-inner">
            <span className="text-xl sm:text-2xl font-black text-slate-300">2º</span>
          </div>
        </div>

        {/* 1st Place (Gold) */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-1 flex flex-col items-center justify-center w-full">
            <span className="text-2xl sm:text-3xl mb-1 animate-bounce filter drop-shadow-lg select-none pointer-events-none">
              👑
            </span>
            <div className="h-14 sm:h-20 w-full flex items-center justify-center px-1">
              <img
                src={getLogoUrl(first, 150)}
                alt={first?.name}
                className="max-h-14 sm:max-h-18 max-w-[90%] object-contain drop-shadow-xl"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            </div>
          </div>
          <div className="h-8 sm:h-9 flex items-center justify-center w-full px-1">
            <span className="text-xs sm:text-sm font-black text-white line-clamp-2 leading-tight">
              {first?.name}
            </span>
          </div>
          <span className="text-sm sm:text-base font-black text-yellow-400 my-0.5">
            R$ {firstPot.toFixed(2)}
          </span>
          <div className="w-full bg-gradient-to-t from-yellow-600/40 via-yellow-500/20 to-yellow-400/30 border-t-4 border-yellow-400 rounded-t-2xl h-28 sm:h-36 flex items-center justify-center mt-2 shadow-lg shadow-yellow-500/20">
            <span className="text-3xl sm:text-4xl font-black text-yellow-400 drop-shadow">1º</span>
          </div>
        </div>

        {/* 3rd Place (Bronze) */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-1 flex flex-col items-center justify-center w-full">
            <span className="text-xl sm:text-2xl mb-1 filter drop-shadow-md select-none pointer-events-none">
              🥉
            </span>
            <div className="h-12 sm:h-16 w-full flex items-center justify-center px-1">
              <img
                src={getLogoUrl(third, 150)}
                alt={third?.name}
                className="max-h-11 sm:max-h-14 max-w-[85%] object-contain drop-shadow-md"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            </div>
          </div>
          <div className="h-8 sm:h-9 flex items-center justify-center w-full px-1">
            <span className="text-[11px] sm:text-xs font-bold text-gray-200 line-clamp-2 leading-tight">
              {third?.name}
            </span>
          </div>
          <span className="text-xs sm:text-sm font-black text-amber-500 my-0.5">
            R$ {thirdPot.toFixed(2)}
          </span>
          <div className="w-full bg-gradient-to-t from-amber-800/40 to-amber-600/20 border-t-2 border-amber-600 rounded-t-2xl h-14 sm:h-16 flex items-center justify-center mt-2 shadow-inner">
            <span className="text-lg sm:text-xl font-black text-amber-500">3º</span>
          </div>
        </div>
      </div>
    </div>
  );
}

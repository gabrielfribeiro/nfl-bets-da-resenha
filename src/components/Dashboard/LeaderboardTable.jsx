import { useState, useMemo } from "react";
import { getTeamById, getLogoUrl } from "../../data/nflTeams";
import { calculateTeamStreak } from "../../utils/streaks";
import { getTier, getNextTier } from "../../utils/tiers";

export default function LeaderboardTable({ selectedTeamIds, teams, bets, currentRound }) {
  const [sortField, setSortField] = useState("pot"); // 'pot' | 'wins' | 'winRate' | 'streak' | 'addedFunds'
  const [sortDirection, setSortDirection] = useState("desc");
  const [activeFilter, setActiveFilter] = useState("ALL"); // 'ALL' | 'G4' | 'DANGER' | 'HOT'

  // Build ranking data with rank changes
  const fullLeaderboard = useMemo(() => {
    // 1. Current ranking
    const currentList = selectedTeamIds.map((id) => {
      const teamState = teams[id] || { pot: 1, potHistory: [1], totalWins: 0, totalLosses: 0, addedFunds: 0 };
      const team = getTeamById(id);
      const streak = calculateTeamStreak(bets, id);
      const totalGames = teamState.totalWins + teamState.totalLosses;
      const winRate = totalGames > 0 ? (teamState.totalWins / totalGames) * 100 : 0;
      const history = teamState.potHistory || [1];
      const prevPot = history.length >= 2 ? history[history.length - 2] : history[0] ?? teamState.pot;

      return {
        id,
        team,
        pot: teamState.pot,
        prevPot,
        totalWins: teamState.totalWins,
        totalLosses: teamState.totalLosses,
        totalGames,
        winRate,
        addedFunds: teamState.addedFunds || 0,
        streak,
        tier: getTier(teamState.pot),
        nextTier: getNextTier(teamState.pot),
      };
    });

    // Previous rank order
    const previousOrder = [...currentList].sort((a, b) => b.prevPot - a.prevPot);
    const prevRankMap = new Map();
    previousOrder.forEach((item, index) => {
      prevRankMap.set(item.id, index + 1);
    });

    // Current rank order (default sort by pot desc, zeroed pots last)
    const sortedCurrent = [...currentList].sort((a, b) => {
      if (a.pot === 0 && b.pot !== 0) return 1;
      if (b.pot === 0 && a.pot !== 0) return -1;
      return b.pot - a.pot;
    });

    return sortedCurrent.map((item, index) => {
      const currentRank = index + 1;
      const prevRank = prevRankMap.get(item.id) || currentRank;
      const rankDiff = prevRank - currentRank; // positive = went up, negative = dropped

      return {
        ...item,
        currentRank,
        prevRank,
        rankDiff,
      };
    });
  }, [selectedTeamIds, teams, bets]);

  // Filter items
  const filteredList = useMemo(() => {
    let list = [...fullLeaderboard];

    if (activeFilter === "G4") {
      list = list.slice(0, 4);
    } else if (activeFilter === "DANGER") {
      list = list.slice(Math.max(0, list.length - 4));
    } else if (activeFilter === "HOT") {
      list = list.filter((i) => i.streak.type === "win" && i.streak.count >= 1);
    }

    // Custom sorting
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === "streak") {
        valA = a.streak.type === "win" ? a.streak.count : -a.streak.count;
        valB = b.streak.type === "win" ? b.streak.count : -b.streak.count;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [fullLeaderboard, activeFilter, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const leader = fullLeaderboard[0];
  const lastPlace = fullLeaderboard[fullLeaderboard.length - 1];
  const averagePot =
    fullLeaderboard.reduce((acc, i) => acc + i.pot, 0) / (fullLeaderboard.length || 1);

  return (
    <div className="space-y-4">
      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-3 flex items-center gap-3">
          <div className="text-2xl">🥇</div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-gray-500 uppercase block leading-tight">
              Líder Atual
            </span>
            <span className="text-white font-black text-xs truncate block mt-0.5">
              {leader?.team?.name || "Líder"}
            </span>
            <span className="text-yellow-400 font-bold text-xs">
              R$ {leader?.pot.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-3 flex items-center gap-3">
          <div className="text-2xl">📊</div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-gray-500 uppercase block leading-tight">
              Pote Médio
            </span>
            <span className="text-emerald-400 font-black text-sm block mt-0.5">
              R$ {averagePot.toFixed(2)}
            </span>
            <span className="text-[10px] text-gray-400">16 participantes</span>
          </div>
        </div>

        <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-3 flex items-center gap-3">
          <div className="text-2xl">🔥</div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-gray-500 uppercase block leading-tight">
              Melhor Sequência
            </span>
            {fullLeaderboard.some((i) => i.streak.type === "win") ? (
              (() => {
                const best = [...fullLeaderboard]
                  .filter((i) => i.streak.type === "win")
                  .sort((a, b) => b.streak.count - a.streak.count)[0];
                return (
                  <>
                    <span className="text-amber-400 font-black text-xs truncate block mt-0.5">
                      {best?.team?.name}
                    </span>
                    <span className="text-[10px] text-amber-300 font-bold">
                      🔥 {best?.streak?.count} vitórias seguidas
                    </span>
                  </>
                );
              })()
            ) : (
              <span className="text-gray-500 text-xs mt-0.5 block">Sem sequência</span>
            )}
          </div>
        </div>

        <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-3 flex items-center gap-3">
          <div className="text-2xl">🚨</div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-gray-500 uppercase block leading-tight">
              Na Lanterna
            </span>
            <span className="text-red-400 font-black text-xs truncate block mt-0.5">
              {lastPlace?.team?.name || "Lanterna"}
            </span>
            <span className="text-[10px] text-red-300/80 font-bold">
              R$ {lastPlace?.pot.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilter === "ALL"
                ? "bg-yellow-400 text-gray-950 font-black shadow-md"
                : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            Todos ({fullLeaderboard.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("G4")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              activeFilter === "G4"
                ? "bg-emerald-500 text-gray-950 font-black shadow-md"
                : "bg-gray-900 border border-gray-800 text-emerald-400 hover:text-white"
            }`}
          >
            <span>🏆 G4 (Troféu)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("DANGER")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              activeFilter === "DANGER"
                ? "bg-rose-500 text-white font-black shadow-md"
                : "bg-gray-900 border border-gray-800 text-rose-400 hover:text-white"
            }`}
          >
            <span>🚨 Degola / Castigo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("HOT")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              activeFilter === "HOT"
                ? "bg-amber-500 text-gray-950 font-black shadow-md"
                : "bg-gray-900 border border-gray-800 text-amber-400 hover:text-white"
            }`}
          >
            <span>🔥 Em Sequência</span>
          </button>
        </div>

        <span className="text-gray-500 text-[11px] font-bold">
          Rodada #{currentRound} · Clique nos cabeçalhos para ordenar
        </span>
      </div>

      {/* Table Container */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-400 text-[11px] font-bold uppercase tracking-wider select-none">
                <th className="py-3.5 pl-4 pr-2 text-center w-12">Pos</th>
                <th className="py-3.5 px-2 text-center w-12">Var</th>
                <th className="py-3.5 px-3">Equipe</th>
                <th
                  onClick={() => handleSort("pot")}
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-yellow-400 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Pote</span>
                    {sortField === "pot" && (
                      <span className="text-yellow-400">{sortDirection === "asc" ? "▲" : "▼"}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("streak")}
                  className="py-3.5 px-3 text-center cursor-pointer hover:text-yellow-400 transition-colors hidden sm:table-cell"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Sequência</span>
                    {sortField === "streak" && (
                      <span className="text-yellow-400">{sortDirection === "asc" ? "▲" : "▼"}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("wins")}
                  className="py-3.5 px-3 text-center cursor-pointer hover:text-yellow-400 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>V - D</span>
                    {sortField === "wins" && (
                      <span className="text-yellow-400">{sortDirection === "asc" ? "▲" : "▼"}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("winRate")}
                  className="py-3.5 px-3 text-center cursor-pointer hover:text-yellow-400 transition-colors hidden md:table-cell"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Aprov.</span>
                    {sortField === "winRate" && (
                      <span className="text-yellow-400">{sortDirection === "asc" ? "▲" : "▼"}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("addedFunds")}
                  className="py-3.5 pr-4 pl-2 text-right cursor-pointer hover:text-yellow-400 transition-colors hidden lg:table-cell"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Salva-Vidas</span>
                    {sortField === "addedFunds" && (
                      <span className="text-yellow-400">{sortDirection === "asc" ? "▲" : "▼"}</span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {filteredList.map((item) => {
                const isG4 = item.currentRank <= 4;
                const isDanger = item.currentRank >= 13;
                const isPodium = item.currentRank <= 3;

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors hover:bg-gray-800/40 ${
                      isG4
                        ? "bg-emerald-950/10"
                        : isDanger
                        ? "bg-rose-950/10"
                        : ""
                    }`}
                  >
                    {/* Position */}
                    <td className="py-3 pl-4 pr-2 text-center font-black">
                      <div className="flex items-center justify-center">
                        {item.currentRank === 1 ? (
                          <span className="text-base" title="1º Lugar">🥇</span>
                        ) : item.currentRank === 2 ? (
                          <span className="text-base" title="2º Lugar">🥈</span>
                        ) : item.currentRank === 3 ? (
                          <span className="text-base" title="3º Lugar">🥉</span>
                        ) : (
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                              isG4
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : isDanger
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : "text-gray-400 bg-gray-800/80"
                            }`}
                          >
                            {item.currentRank}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Rank Diff */}
                    <td className="py-3 px-2 text-center font-bold">
                      {item.rankDiff > 0 ? (
                        <span className="text-emerald-400 text-[11px] font-black flex items-center justify-center gap-0.5" title={`Subiu ${item.rankDiff} posições`}>
                          <span>▲</span>
                          <span>{item.rankDiff}</span>
                        </span>
                      ) : item.rankDiff < 0 ? (
                        <span className="text-rose-400 text-[11px] font-black flex items-center justify-center gap-0.5" title={`Caiu ${Math.abs(item.rankDiff)} posições`}>
                          <span>▼</span>
                          <span>{Math.abs(item.rankDiff)}</span>
                        </span>
                      ) : (
                        <span className="text-gray-600 text-[10px]" title="Manteve a posição">
                          —
                        </span>
                      )}
                    </td>

                    {/* Team info */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={getLogoUrl(item.team, 100)}
                          alt=""
                          className="w-8 h-8 object-contain flex-shrink-0 drop-shadow"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-white font-black text-sm truncate block">
                              {item.team?.name || item.id}
                            </span>
                            {item.pot <= 0 && (
                              <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                                Zerado
                              </span>
                            )}
                          </div>
                          <span className="text-gray-500 text-[10px] block uppercase font-bold">
                            {item.team?.conference} · {item.team?.division}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Pot & Resenha Tier */}
                    <td className="py-3 px-3 text-right">
                      <span className="text-yellow-400 font-black text-sm block tabular-nums">
                        R$ {item.pot.toFixed(2)}
                      </span>
                      <div className="relative inline-block group/tier">
                        <button
                          type="button"
                          title={`Patente da Resenha: ${item.tier.badge} ${item.tier.name} (R$ ${item.tier.min.toFixed(2)}+)\n"${item.tier.desc}"${
                            item.nextTier
                              ? `\nPróxima: ${item.nextTier.badge} ${item.nextTier.name} (Falta R$ ${Math.max(0, item.nextTier.min - item.pot).toFixed(2)})`
                              : "\nPatente Máxima atingida!"
                          }`}
                          className={`text-[10px] font-extrabold ${item.tier.color} inline-flex items-center gap-1 cursor-help hover:brightness-125 transition-all`}
                        >
                          <span className="text-xs">{item.tier.badge}</span>
                          <span className="underline decoration-dotted decoration-gray-500/60 underline-offset-2">
                            {item.tier.name}
                          </span>
                        </button>

                        {/* Floating Tooltip on Hover */}
                        <div
                          className={`absolute right-0 ${
                            item.currentRank <= 2 ? "top-full mt-2" : "bottom-full mb-2"
                          } hidden group-hover/tier:flex flex-col w-64 p-3 bg-gray-950/95 backdrop-blur-md border border-gray-700/80 rounded-2xl shadow-2xl z-50 text-left pointer-events-none animate-in fade-in zoom-in-95 duration-150`}
                        >
                          {/* Header */}
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-800">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xl">{item.tier.badge}</span>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-white truncate">
                                  {item.tier.name}
                                </p>
                                <p className="text-[10px] font-bold text-yellow-400">
                                  Pote a partir de R$ {item.tier.min.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 px-1.5 py-0.5 rounded-full">
                              Patente
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-[11px] text-gray-300 italic mt-2 leading-relaxed">
                            "{item.tier.desc}"
                          </p>

                          {/* Next Tier Progress */}
                          {item.nextTier ? (
                            <div className="mt-2.5 pt-2 border-t border-gray-800/80">
                              <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 mb-1">
                                <span>Próxima: {item.nextTier.badge} {item.nextTier.name}</span>
                                <span className={item.pot <= 0 ? "text-rose-400 font-black" : "text-emerald-400 tabular-nums font-black"}>
                                  {item.pot <= 0
                                    ? "Ative um Salva-Vidas!"
                                    : `Falta R$ ${Math.max(0, item.nextTier.min - item.pot).toFixed(2)}`}
                                </span>
                              </div>
                              <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    item.pot <= 0
                                      ? "bg-rose-500 w-0"
                                      : "bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400"
                                  }`}
                                  style={{
                                    width: item.pot <= 0 ? "0%" : `${Math.min(
                                      100,
                                      Math.max(
                                        8,
                                        ((item.pot - item.tier.min) /
                                          (item.nextTier.min - item.tier.min)) *
                                          100
                                      )
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2.5 pt-2 border-t border-gray-800/80 text-[10px] text-amber-300 font-black flex items-center gap-1.5">
                              <span>👑</span>
                              <span>Patente Máxima da Resenha conquistada!</span>
                            </div>
                          )}

                          {/* Tip */}
                          <p className="text-[9px] text-gray-500 mt-2">
                            {item.pot <= 0
                              ? "⚠️ Time zerado! Precisa acionar o Salva-Vidas para voltar a pontuar."
                              : "💡 As patentes sobem automaticamente conforme o time ganha apostas e acumula saldo!"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Streak */}
                    <td className="py-3 px-3 text-center hidden sm:table-cell">
                      {item.streak.count >= 1 ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black ${
                            item.streak.type === "win"
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                          }`}
                        >
                          <span>{item.streak.type === "win" ? "🔥" : "❄️"}</span>
                          <span>
                            {item.streak.count}
                            {item.streak.type === "win" ? "W" : "L"}
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>

                    {/* W - L */}
                    <td className="py-3 px-3 text-center">
                      <span className="text-gray-300 font-bold text-xs">
                        <span className="text-emerald-400 font-black">{item.totalWins}</span>
                        <span className="text-gray-600 mx-1">·</span>
                        <span className="text-rose-400 font-black">{item.totalLosses}</span>
                      </span>
                    </td>

                    {/* Win Rate */}
                    <td className="py-3 px-3 text-center hidden md:table-cell">
                      <div className="flex flex-col items-center">
                        <span className="text-white font-bold text-xs">
                          {item.winRate.toFixed(0)}%
                        </span>
                        <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-green-400"
                            style={{ width: `${item.winRate}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Added Funds */}
                    <td className="py-3 pr-4 pl-2 text-right hidden lg:table-cell">
                      {item.addedFunds > 0 ? (
                        <span className="text-rose-400 font-bold text-xs">
                          R$ {item.addedFunds.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Legend */}
        <div className="bg-gray-950/60 border-t border-gray-800 px-4 py-3 flex items-center justify-between flex-wrap gap-3 text-[11px] text-gray-500">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40 border border-emerald-500/60"></span>
              <span>1º ao 4º: Zona de Troféu (G4)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/40 border border-rose-500/60"></span>
              <span>13º ao 16º: Zona do Castigo / Degola</span>
            </span>
          </div>
          <span>Total: 16 Participantes</span>
        </div>
      </div>
    </div>
  );
}

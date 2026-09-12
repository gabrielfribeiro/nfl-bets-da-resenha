import { useState, useEffect } from "react";
import { fetchNflScoreboard } from "../../services/espnApi";
import { useBet } from "../../context/BetContext";
import { useAuth } from "../../context/AuthContext";
import { getLogoUrl } from "../../data/nflTeams";

export default function GamesLive({ onQuickBet, onOpenStats }) {
  const { selectedTeamIds, bets, updateBetResult, powerUpsList, currentRound, registerGames } = useBet();
  const { isAdmin, canManageBets, isAuthenticated, setShowLoginModal } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(currentRound || 1);
  const [activeFilter, setActiveFilter] = useState("LEAGUE"); // 'LEAGUE' (default) | 'ALL' | 'MY_BETS' | 'LIVE' | 'SCHEDULED' | 'FINAL'
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (currentRound && currentRound !== selectedWeek) {
      setSelectedWeek(currentRound);
    }
  }, [currentRound]);

  const loadGames = async (weekNum) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchNflScoreboard(weekNum);
      if (res.success) {
        setGames(res.games);
        registerGames?.(res.games);
        if (res.currentWeek && !weekNum) {
          setSelectedWeek(res.currentWeek);
        }
      } else {
        setError(res.error || "Não foi possível carregar os jogos.");
      }
    } catch (err) {
      setError("Erro ao se conectar à API da ESPN.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadGames(selectedWeek);
  }, [selectedWeek]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadGames(selectedWeek);
  };

  const getBetsForGame = (game) => {
    if (!game?.homeTeam?.id || !game?.awayTeam?.id) return [];
    return bets.filter((b) => {
      const matchTeams =
        (b.teamAId === game.awayTeam.id && b.teamBId === game.homeTeam.id) ||
        (b.teamAId === game.homeTeam.id && b.teamBId === game.awayTeam.id);
      return matchTeams && (Number(b.round) === Number(selectedWeek) || Number(b.round) === Number(game.week));
    });
  };

  // Filter games
  const filteredGames = games.filter((game) => {
    const hasLeagueTeam =
      selectedTeamIds.includes(game.homeTeam?.id) ||
      selectedTeamIds.includes(game.awayTeam?.id);
    const gameBets = getBetsForGame(game);

    if (activeFilter === "MY_BETS") return gameBets.length > 0;
    if (activeFilter === "LEAGUE") return hasLeagueTeam;
    if (activeFilter === "LIVE") return game.isLive;
    if (activeFilter === "SCHEDULED") return game.isScheduled;
    if (activeFilter === "FINAL") return game.isCompleted;
    return true;
  });

  const liveGamesCount = games.filter((g) => g.isLive).length;
  const leagueGamesCount = games.filter(
    (g) => selectedTeamIds.includes(g.homeTeam?.id) || selectedTeamIds.includes(g.awayTeam?.id)
  ).length;
  const myBetsGamesCount = games.filter((g) => getBetsForGame(g).length > 0).length;
  const pendingBetsGamesCount = games.filter((g) =>
    getBetsForGame(g).some((b) => b.result === "pending")
  ).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-white font-black text-2xl tracking-tight flex items-center gap-2">
              <span>🏈</span>
              <span>Jogos e Placares da NFL</span>
            </h2>
          </div>
          <p className="text-gray-400 text-xs mt-1">
            Placares ao vivo da ESPN, transmissões oficiais e resolução rápida de apostas
          </p>
        </div>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={loading || isRefreshing}
          className="self-start sm:self-auto px-3.5 py-2 bg-gray-900 border border-gray-700 hover:border-yellow-400/50 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <span className={loading || isRefreshing ? "animate-spin" : ""}>🔄</span>
          <span>{loading || isRefreshing ? "Atualizando..." : "Atualizar Placares"}</span>
        </button>
      </div>

      {/* Week Selector Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-thin">
        <span className="text-gray-500 text-xs font-bold uppercase mr-1 flex-shrink-0">
          Semana:
        </span>
        {Array.from({ length: 18 }, (_, i) => i + 1).map((wk) => (
          <button
            key={wk}
            onClick={() => setSelectedWeek(wk)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all ${
              selectedWeek === wk
                ? "bg-yellow-400 text-gray-950 font-black shadow-lg shadow-yellow-400/20 scale-105"
                : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
            }`}
          >
            Semana {wk}
          </button>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveFilter("ALL")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeFilter === "ALL"
              ? "bg-yellow-400 text-gray-950 shadow-md"
              : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          Todos ({games.length})
        </button>

        {myBetsGamesCount > 0 && (
          <button
            onClick={() => setActiveFilter("MY_BETS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeFilter === "MY_BETS"
                ? "bg-amber-400 text-gray-950 shadow-md font-extrabold"
                : "bg-gray-900 border border-amber-500/40 text-amber-300 hover:bg-amber-400/10"
            }`}
          >
            <span>🎯 Minhas Apostas</span>
            <span className="bg-amber-400/20 px-1.5 py-0.2 rounded-full text-[10px]">
              {myBetsGamesCount}
            </span>
            {pendingBetsGamesCount > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                {pendingBetsGamesCount} pendente{pendingBetsGamesCount > 1 ? "s" : ""}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveFilter("LEAGUE")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeFilter === "LEAGUE"
              ? "bg-yellow-400 text-gray-950 shadow-md"
              : "bg-gray-900 border border-gray-800 text-yellow-400 hover:bg-yellow-400/10"
          }`}
        >
          <span>★ Nossos 16 Times</span>
          <span className="bg-yellow-400/20 px-1.5 py-0.2 rounded-full text-[10px]">
            {leagueGamesCount}
          </span>
        </button>

        {liveGamesCount > 0 && (
          <button
            onClick={() => setActiveFilter("LIVE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeFilter === "LIVE"
                ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                : "bg-gray-900 border border-red-500/40 text-red-400 hover:bg-red-500/10"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span>Ao Vivo ({liveGamesCount})</span>
          </button>
        )}

        <button
          onClick={() => setActiveFilter("SCHEDULED")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeFilter === "SCHEDULED"
              ? "bg-yellow-400 text-gray-950 shadow-md"
              : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          Agendados
        </button>

        <button
          onClick={() => setActiveFilter("FINAL")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeFilter === "FINAL"
              ? "bg-yellow-400 text-gray-950 shadow-md"
              : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          Encerrados
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-gray-900/60 border border-gray-800 rounded-3xl p-5 animate-pulse space-y-4"
            >
              <div className="h-4 bg-gray-800 rounded w-1/3"></div>
              <div className="flex justify-between items-center py-3">
                <div className="w-16 h-16 bg-gray-800 rounded-full"></div>
                <div className="h-8 bg-gray-800 rounded w-20"></div>
                <div className="w-16 h-16 bg-gray-800 rounded-full"></div>
              </div>
              <div className="h-8 bg-gray-800 rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="bg-red-950/30 border border-red-500/40 rounded-3xl p-8 text-center max-w-md mx-auto">
          <span className="text-4xl block mb-2">⚠️</span>
          <h3 className="text-white font-black text-base mb-1">Falha ao carregar jogos</h3>
          <p className="text-red-300/80 text-xs mb-4">{error}</p>
          <button
            onClick={() => loadGames(selectedWeek)}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-all shadow-md"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Games Grid */}
      {!loading && !error && filteredGames.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 text-center text-gray-400">
          <span className="text-3xl block mb-2">🔍</span>
          <p className="font-bold text-sm">Nenhum confronto encontrado para este filtro.</p>
          <button
            onClick={() => setActiveFilter("ALL")}
            className="mt-3 text-xs text-yellow-400 hover:underline font-semibold"
          >
            Ver todos os jogos da Semana {selectedWeek}
          </button>
        </div>
      )}

      {!loading && !error && filteredGames.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGames.map((game) => {
            const isHomeInLeague = selectedTeamIds.includes(game.homeTeam?.id);
            const isAwayInLeague = selectedTeamIds.includes(game.awayTeam?.id);
            const involvesLeague = isHomeInLeague || isAwayInLeague;
            const gameBets = getBetsForGame(game);

            return (
              <div
                key={game.id}
                className={`relative bg-gradient-to-b from-gray-900 to-gray-950 border rounded-3xl p-5 shadow-xl transition-all hover:border-gray-700 flex flex-col justify-between ${
                  involvesLeague
                    ? "border-yellow-500/40 ring-1 ring-yellow-500/20"
                    : "border-gray-800"
                }`}
              >
                {/* Top Status & League Indicator */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-800/80 mb-3">
                  <div className="flex items-center gap-2">
                    {game.isLive ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                        AO VIVO {game.statusDetail}
                      </span>
                    ) : game.isCompleted ? (
                      <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 text-[10px] font-black uppercase tracking-wider">
                        {game.statusDetail || "Final"}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs font-bold flex items-center gap-1.5">
                        <span>📅</span>
                        <span>{game.formattedTime}</span>
                      </span>
                    )}

                    {game.broadcast && (
                      <span className="text-[10px] text-gray-500 bg-gray-800/60 px-1.5 py-0.5 rounded border border-gray-700/50">
                        📺 {game.broadcast}
                      </span>
                    )}
                  </div>

                  {involvesLeague && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2 py-0.5 rounded-full">
                      ★ Jogo do Bolão
                    </span>
                  )}
                </div>

                {/* Matchup Teams & Scores */}
                <div className="grid grid-cols-7 items-center gap-2 py-2">
                  {/* Away Team (3 cols) */}
                  <div className="col-span-3 flex items-center gap-3">
                    <img
                      src={getLogoUrl(game.awayTeam)}
                      alt={game.awayTeam.name}
                      className="w-12 h-12 object-contain drop-shadow"
                      onError={(e) => {
                        e.target.src = game.awayTeam.logo;
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-white font-black text-sm truncate block">
                          {game.awayTeam.name}
                        </span>
                        {isAwayInLeague && (
                          <span className="text-yellow-400 text-xs" title="Time do seu Bolão">
                            ★
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 font-semibold block">
                        {game.awayTeam.record || "Visitante"}
                      </span>
                    </div>
                  </div>

                  {/* Score or VS (1 col) */}
                  <div className="col-span-1 text-center">
                    {game.isLive || game.isCompleted ? (
                      <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center gap-1.5 text-lg font-black text-white">
                          <span className={game.awayTeam.isWinner ? "text-yellow-400" : ""}>
                            {game.awayTeam.score}
                          </span>
                          <span className="text-gray-600 text-xs">-</span>
                          <span className={game.homeTeam.isWinner ? "text-yellow-400" : ""}>
                            {game.homeTeam.score}
                          </span>
                        </div>
                        {game.isLive && game.clock && (
                          <span className="text-[9px] text-red-400 font-bold">
                            Q{game.period} {game.clock}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-gray-800 text-gray-400 text-xs font-black flex items-center justify-center mx-auto border border-gray-700">
                        VS
                      </span>
                    )}
                  </div>

                  {/* Home Team (3 cols) */}
                  <div className="col-span-3 flex items-center justify-end gap-3 text-right">
                    <div className="min-w-0">
                      <div className="flex items-center justify-end gap-1">
                        {isHomeInLeague && (
                          <span className="text-yellow-400 text-xs" title="Time do seu Bolão">
                            ★
                          </span>
                        )}
                        <span className="text-white font-black text-sm truncate block">
                          {game.homeTeam.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-semibold block">
                        {game.homeTeam.record || "Mandante"}
                      </span>
                    </div>
                    <img
                      src={getLogoUrl(game.homeTeam)}
                      alt={game.homeTeam.name}
                      className="w-12 h-12 object-contain drop-shadow"
                      onError={(e) => {
                        e.target.src = game.homeTeam.logo;
                      }}
                    />
                  </div>
                </div>

                {/* Bets created for this game */}
                {gameBets.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-800/80 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
                        <span>🎯</span>
                        <span>Sua Aposta neste Jogo ({gameBets.length})</span>
                      </span>
                      {game.isCompleted && gameBets.some((b) => b.result === "pending") && (
                        <span className="text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                          <span>⚠️</span>
                          <span>Jogo Finalizado · Aguardando Resolução</span>
                        </span>
                      )}
                    </div>

                    {gameBets.map((bet) => {
                      const bettingTeam =
                        bet.bettingOnTeamId === game.awayTeam?.id ? game.awayTeam : game.homeTeam;
                      const isWin = bet.result === "win";
                      const isLoss = bet.result === "loss";
                      const isPending = bet.result === "pending";
                      const multiplier = bet.powerUp === "double" ? 2 : 1;
                      const amount = Number(bet.amount) || 0;
                      const odd = Number(bet.odd) || 1;
                      const profit = (amount * (odd - 1) * multiplier).toFixed(2);

                      return (
                        <div
                          key={bet.id}
                          className={`p-3 rounded-2xl border transition-all ${
                            isWin
                              ? "bg-emerald-950/20 border-emerald-500/40"
                              : isLoss
                              ? "bg-red-950/20 border-red-500/40"
                              : "bg-gray-950/90 border-yellow-500/40 shadow-lg shadow-yellow-400/5"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={getLogoUrl(bettingTeam)}
                                alt=""
                                className="w-6 h-6 object-contain flex-shrink-0"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                              <span className="text-white font-black text-xs truncate">
                                Apostou no <strong>{bettingTeam?.name || "Time"}</strong>
                              </span>
                              {bet.powerUp && (
                                <span
                                  title={
                                    powerUpsList?.find((p) => p.id === bet.powerUp)?.name ||
                                    "Carta de Poder"
                                  }
                                  className="text-xs"
                                >
                                  {powerUpsList?.find((p) => p.id === bet.powerUp)?.icon ||
                                    (bet.powerUp === "shield" ? "🛡️" : "⚡")}
                                </span>
                              )}
                            </div>
                            <div className="text-right flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-white font-black text-xs">
                                R$ {amount.toFixed(2)}
                              </span>
                              <span className="text-yellow-400 font-bold text-[11px] bg-yellow-400/10 px-1.5 py-0.2 rounded border border-yellow-400/30">
                                @{odd.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Quick result resolution if pending */}
                          {isPending ? (
                            canManageBets ? (
                              <div className="pt-2 border-t border-gray-800 flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex-shrink-0">
                                  Resolver:
                                </span>
                                <div className="flex-1 grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => updateBetResult(bet.id, "win")}
                                    className="py-1.5 px-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-gray-950 font-black text-xs border border-emerald-500/40 transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95"
                                  >
                                    <span>✅</span>
                                    <span>Green (+R$ {profit})</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateBetResult(bet.id, "loss")}
                                    className="py-1.5 px-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white font-black text-xs border border-red-500/40 transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95"
                                  >
                                    <span>❌</span>
                                    <span>Red (-R$ {bet.amount.toFixed(2)})</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-xs">
                                <span className="text-yellow-400/90 font-bold text-[11px] flex items-center gap-1">
                                  <span>⏳</span> Aposta Pendente
                                </span>
                                <span className="text-gray-500 text-[10px] italic">
                                  {isAuthenticated ? "Resolução restrita ao Comissário" : "Faça login como Comissário"}
                                </span>
                              </div>
                            )
                          ) : (
                            <div className="pt-1.5 border-t border-gray-800 flex items-center justify-between text-xs flex-wrap gap-2">
                              <span className="text-[10px] text-gray-500 font-bold uppercase">
                                Resultado:
                              </span>
                              {isWin && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-emerald-400 font-black text-xs flex items-center gap-1 bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                                    ✅ Green Batido (+R$ {profit})
                                  </span>
                                  {bet.resolvedBy && (
                                    <span className="text-[10px] text-gray-400 flex items-center gap-1 bg-gray-900/90 px-2 py-0.5 rounded border border-gray-800">
                                      <span>⚖️</span>
                                      <span>{bet.resolvedBy.name}</span>
                                    </span>
                                  )}
                                </div>
                              )}
                              {isLoss && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-red-400 font-black text-xs flex items-center gap-1 bg-red-500/15 px-2 py-0.5 rounded-lg border border-red-500/30">
                                    ❌ Red (
                                    {bet.powerUp === "shield"
                                      ? "🛡️ Protegido pelo escudo"
                                      : `-R$ ${bet.amount.toFixed(2)}`}
                                    )
                                  </span>
                                  {bet.resolvedBy && (
                                    <span className="text-[10px] text-gray-400 flex items-center gap-1 bg-gray-900/90 px-2 py-0.5 rounded border border-gray-800">
                                      <span>⚖️</span>
                                      <span>{bet.resolvedBy.name}</span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer: Odds & Quick Bet Action */}
                <div className="pt-3 border-t border-gray-800/80 mt-3 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-gray-500 truncate">
                    {game.venue && <span>📍 {game.venue}</span>}
                    {game.oddsDetail && (
                      <span className="ml-2 text-gray-400 font-semibold">
                        ⚖️ {game.oddsDetail} {game.overUnder}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {onOpenStats && game.awayTeam?.id && game.homeTeam?.id && (
                      <button
                        type="button"
                        onClick={() => onOpenStats(game.awayTeam.id, game.homeTeam.id)}
                        title="Comparar estatísticas deste confronto"
                        className="px-2.5 py-1.5 rounded-xl font-black text-xs border transition-all flex items-center gap-1 bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-gray-950 border-sky-500/30 active:scale-95 shadow-sm"
                      >
                        <span>📊</span>
                        <span className="hidden sm:inline">Stats</span>
                      </button>
                    )}

                    {onQuickBet &&
                      gameBets.length === 0 &&
                      (selectedTeamIds?.includes(game.awayTeam?.id) ||
                        selectedTeamIds?.includes(game.homeTeam?.id)) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!isAuthenticated) {
                            setShowLoginModal(true);
                            return;
                          }
                          onQuickBet(game.awayTeam.id, game.homeTeam.id, selectedWeek);
                        }}
                        className="px-3 py-1.5 rounded-xl font-black text-xs border transition-all flex items-center gap-1.5 shadow-sm bg-yellow-400/10 hover:bg-yellow-400 text-yellow-400 hover:text-gray-950 border-yellow-400/30 active:scale-95"
                      >
                        <span>⚡</span>
                        <span>Apostar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

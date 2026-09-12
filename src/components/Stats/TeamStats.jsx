import { useState, useEffect, useMemo } from "react";
import { useBet } from "../../context/BetContext";
import { useAuth } from "../../context/AuthContext";
import { NFL_TEAMS, getTeamById, getLogoUrl } from "../../data/nflTeams";
import {
  fetchNflStandings,
  fetchTeamStats,
  fetchNflScoreboard,
} from "../../services/espnApi";

export default function TeamStats({
  initialTeamA,
  initialTeamB,
  onGoToNewBet,
  onOpenTab,
}) {
  const { teams: leagueTeams, selectedTeamIds, currentRound } = useBet();
  const { userProfile } = useAuth();

  // Mode: 'h2h' (Confronto) | 'single' (Raio-X Individual)
  const [mode, setMode] = useState(initialTeamA && initialTeamB ? "h2h" : "h2h");

  // Selection state
  const [teamAId, setTeamAId] = useState(
    initialTeamA || (selectedTeamIds[0] || "kc")
  );
  const [teamBId, setTeamBId] = useState(
    initialTeamB || (selectedTeamIds[1] || "phi")
  );
  const [singleTeamId, setSingleTeamId] = useState(
    initialTeamA || (selectedTeamIds[0] || "kc")
  );

  // Filter for single team selector: 'league' | 'all' | 'afc' | 'nfc'
  const [singleFilter, setSingleFilter] = useState("league");
  const [singleSearch, setSingleSearch] = useState("");
  const [singleTab, setSingleTab] = useState("overview"); // 'overview' | 'offense' | 'defense' | 'special'

  // Data fetching state
  const [standingsMap, setStandingsMap] = useState({});
  const [statsMap, setStatsMap] = useState({}); // key: teamId, value: statsObj
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [currentWeekGames, setCurrentWeekGames] = useState([]);
  const [isLoadingGames, setIsLoadingGames] = useState(false);

  // Load standings on mount
  useEffect(() => {
    let isMounted = true;
    fetchNflStandings().then((data) => {
      if (isMounted && data) {
        setStandingsMap(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Load current week games for quick matchup loading
  useEffect(() => {
    let isMounted = true;
    setIsLoadingGames(true);
    fetchNflScoreboard(currentRound)
      .then((res) => {
        if (isMounted && res?.success) {
          setCurrentWeekGames(res.games || []);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingGames(false);
      });
    return () => {
      isMounted = false;
    };
  }, [currentRound]);

  // Load team stats whenever teamA, teamB or singleTeam changes
  useEffect(() => {
    let isMounted = true;
    const teamsToFetch =
      mode === "h2h" ? [teamAId, teamBId] : [singleTeamId];

    const missingTeams = teamsToFetch.filter((id) => id && !statsMap[id]);
    if (missingTeams.length === 0) return;

    setIsLoadingStats(true);
    Promise.all(
      missingTeams.map(async (id) => {
        const data = await fetchTeamStats(id);
        return { id, data };
      })
    )
      .then((results) => {
        if (!isMounted) return;
        setStatsMap((prev) => {
          const updated = { ...prev };
          results.forEach(({ id, data }) => {
            if (data) updated[id] = data;
          });
          return updated;
        });
      })
      .finally(() => {
        if (isMounted) setIsLoadingStats(false);
      });

    return () => {
      isMounted = false;
    };
  }, [mode, teamAId, teamBId, singleTeamId, statsMap]);

  // Handler for quick loading of a matchup from current week games
  const handleSelectGame = (game) => {
    if (!game) return;
    const homeId = game.homeTeam?.id?.toLowerCase();
    const awayId = game.awayTeam?.id?.toLowerCase();
    if (homeId && awayId) {
      setTeamAId(awayId);
      setTeamBId(homeId);
    }
  };

  // Switch positions
  const handleSwapTeams = () => {
    const temp = teamAId;
    setTeamAId(teamBId);
    setTeamBId(temp);
  };

  // Filtered teams list for single selector
  const availableSingleTeams = useMemo(() => {
    return NFL_TEAMS.filter((t) => {
      if (singleFilter === "league" && !selectedTeamIds.includes(t.id)) {
        return false;
      }
      if (singleFilter === "afc" && t.conference !== "AFC") return false;
      if (singleFilter === "nfc" && t.conference !== "NFC") return false;

      if (singleSearch.trim()) {
        const q = singleSearch.toLowerCase().trim();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesAbbr = t.id.toLowerCase().includes(q);
        const matchesCity = (t.division || "").toLowerCase().includes(q);
        if (!matchesName && !matchesAbbr && !matchesCity) return false;
      }
      return true;
    });
  }, [singleFilter, singleSearch, selectedTeamIds]);

  const teamAObj = getTeamById(teamAId);
  const teamBObj = getTeamById(teamBId);
  const teamAStandings = standingsMap[teamAId?.toLowerCase()] || null;
  const teamBStandings = standingsMap[teamBId?.toLowerCase()] || null;
  const teamAStats = statsMap[teamAId] || null;
  const teamBStats = statsMap[teamBId] || null;

  const singleTeamObj = getTeamById(singleTeamId);
  const singleStandings = standingsMap[singleTeamId?.toLowerCase()] || null;
  const singleStats = statsMap[singleTeamId] || null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-in fade-in duration-200">
      {/* 1. Header com Título e Seletor de Modos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div>
          <h2 className="text-white font-black text-2xl sm:text-3xl tracking-tight flex items-center gap-2.5">
            <span>📊</span>
            <span>Estatísticas & Confrontos</span>
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Inteligência estatística oficial da ESPN integrada às bancas e potes do nosso bolão.
          </p>
        </div>

        {/* Alternador de Modo (Pills) */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-900 border border-gray-800 rounded-2xl self-start sm:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => setMode("h2h")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              mode === "h2h"
                ? "bg-yellow-400 text-gray-950 shadow-md shadow-yellow-400/20 scale-105"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <span>🥊</span>
            <span>Comparar Confronto</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              mode === "single"
                ? "bg-yellow-400 text-gray-950 shadow-md shadow-yellow-400/20 scale-105"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <span>🔍</span>
            <span>Raio-X Individual</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODO 1: COMPARADOR DE CONFRONTO (HEAD-TO-HEAD) */}
      {/* ========================================================================= */}
      {mode === "h2h" && (
        <div className="space-y-6">
          {/* Card Seletor de Confronto e Atalhos de Jogos da Semana */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚔️</span>
                <div>
                  <h3 className="text-white font-black text-base">
                    Configuração do Confronto
                  </h3>
                  <p className="text-gray-400 text-xs">
                    Escolha dois times para comparar métricas ou selecione um jogo oficial da rodada
                  </p>
                </div>
              </div>

              {/* Seletor rápido de jogos oficiais da ESPN na semana */}
              {currentWeekGames.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs font-bold whitespace-nowrap">
                    Jogos da Semana #{currentRound}:
                  </span>
                  <select
                    onChange={(e) => {
                      const g = currentWeekGames.find((x) => x.id === e.target.value);
                      if (g) handleSelectGame(g);
                    }}
                    defaultValue=""
                    className="bg-gray-950 border border-yellow-500/30 text-yellow-400 font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-yellow-400 max-w-[220px] truncate"
                  >
                    <option value="" disabled>
                      Carregar partida oficial...
                    </option>
                    {currentWeekGames.map((game) => (
                      <option key={game.id} value={game.id}>
                        {game.awayTeam?.name || "Visitante"} @ {game.homeTeam?.name || "Mandante"}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Banner Versus Lado a Lado */}
            <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
              {/* Time A Card (5 cols) */}
              <div
                className="md:col-span-5 p-4 sm:p-5 rounded-2xl bg-gray-950/80 border border-gray-800 flex flex-col justify-between gap-3 relative overflow-hidden group hover:border-yellow-400/40 transition-all"
                style={{ borderLeftColor: teamAObj?.color || "#333", borderLeftWidth: 4 }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={getLogoUrl(teamAObj, 120)}
                      alt={teamAObj?.name}
                      className="w-12 h-12 sm:w-14 sm:h-14 object-contain flex-shrink-0 drop-shadow-md group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-white font-black text-base sm:text-lg truncate block">
                          {teamAObj?.name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-gray-800 text-gray-400 uppercase">
                          {teamAObj?.conference} · {teamAObj?.division}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5">
                        Campanha NFL:{" "}
                        <strong className="text-yellow-400 font-bold">
                          {teamAStandings?.record || "0-0"}
                        </strong>
                        {teamAStandings?.streak && teamAStandings.streak !== "-" && (
                          <span className="text-gray-500 text-[11px] ml-1.5">
                            ({teamAStandings.streak})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dropdown de troca do Time A */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-800/80 text-xs">
                  <span className="text-gray-500 text-[11px] font-semibold">Alterar equipe:</span>
                  <select
                    value={teamAId}
                    onChange={(e) => setTeamAId(e.target.value)}
                    className="bg-gray-900 border border-gray-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-yellow-400 max-w-[180px] truncate"
                  >
                    {NFL_TEAMS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {selectedTeamIds.includes(t.id) ? "🏈 " : ""}
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Badge de Pote no Bolão */}
                <div className="flex items-center justify-between text-[11px] bg-gray-900/90 rounded-xl px-3 py-1.5 border border-gray-800">
                  <span className="text-gray-400">Pote na Resenha:</span>
                  <span className="text-emerald-400 font-black">
                    {leagueTeams[teamAId]
                      ? `R$ ${(leagueTeams[teamAId].pot ?? 0).toFixed(2)}`
                      : "Fora da Liga"}
                  </span>
                </div>
              </div>

              {/* Center VS Controls (1 col) */}
              <div className="md:col-span-1 flex flex-col items-center justify-center gap-2 py-2 md:py-0">
                <div className="w-10 h-10 rounded-full bg-yellow-400 text-gray-950 font-black text-sm flex items-center justify-center shadow-lg shadow-yellow-400/20">
                  VS
                </div>
                <button
                  type="button"
                  onClick={handleSwapTeams}
                  title="Inverter Mandante / Visitante"
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-[10px] font-bold transition-all"
                >
                  ⇄ Inverter
                </button>
              </div>

              {/* Time B Card (5 cols) */}
              <div
                className="md:col-span-5 p-4 sm:p-5 rounded-2xl bg-gray-950/80 border border-gray-800 flex flex-col justify-between gap-3 relative overflow-hidden group hover:border-yellow-400/40 transition-all"
                style={{ borderRightColor: teamBObj?.color || "#333", borderRightWidth: 4 }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={getLogoUrl(teamBObj, 120)}
                      alt={teamBObj?.name}
                      className="w-12 h-12 sm:w-14 sm:h-14 object-contain flex-shrink-0 drop-shadow-md group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-white font-black text-base sm:text-lg truncate block">
                          {teamBObj?.name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-gray-800 text-gray-400 uppercase">
                          {teamBObj?.conference} · {teamBObj?.division}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5">
                        Campanha NFL:{" "}
                        <strong className="text-yellow-400 font-bold">
                          {teamBStandings?.record || "0-0"}
                        </strong>
                        {teamBStandings?.streak && teamBStandings.streak !== "-" && (
                          <span className="text-gray-500 text-[11px] ml-1.5">
                            ({teamBStandings.streak})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dropdown de troca do Time B */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-800/80 text-xs">
                  <span className="text-gray-500 text-[11px] font-semibold">Alterar equipe:</span>
                  <select
                    value={teamBId}
                    onChange={(e) => setTeamBId(e.target.value)}
                    className="bg-gray-900 border border-gray-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-yellow-400 max-w-[180px] truncate"
                  >
                    {NFL_TEAMS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {selectedTeamIds.includes(t.id) ? "🏈 " : ""}
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Badge de Pote no Bolão */}
                <div className="flex items-center justify-between text-[11px] bg-gray-900/90 rounded-xl px-3 py-1.5 border border-gray-800">
                  <span className="text-gray-400">Pote na Resenha:</span>
                  <span className="text-emerald-400 font-black">
                    {leagueTeams[teamBId]
                      ? `R$ ${(leagueTeams[teamBId].pot ?? 0).toFixed(2)}`
                      : "Fora da Liga"}
                  </span>
                </div>
              </div>
            </div>

            {/* Botão de Ação: Apostar neste confronto */}
            {onGoToNewBet && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    onGoToNewBet({ teamA: teamAId, teamB: teamBId, round: currentRound })
                  }
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xs transition-all shadow-md shadow-yellow-400/20 flex items-center justify-center gap-2 active:scale-95"
                >
                  <span>🎯</span>
                  <span>Registrar Palpite neste Confronto</span>
                  <span>➜</span>
                </button>
              </div>
            )}
          </div>

          {/* Comparativo Estatístico com Barras Visuais */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                <h3 className="text-white font-black text-base">
                  Comparativo Estatístico Lado a Lado
                </h3>
              </div>
              {isLoadingStats && (
                <span className="text-yellow-400 text-xs flex items-center gap-1.5 animate-pulse font-semibold">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping"></span>
                  Buscando estatísticas na ESPN...
                </span>
              )}
            </div>

            {/* Cabeçalho das Equipes nas Colunas */}
            <div className="grid grid-cols-11 gap-2 items-center text-xs font-black">
              <div className="col-span-5 flex items-center gap-2 text-left">
                <img
                  src={getLogoUrl(teamAObj, 40)}
                  alt=""
                  className="w-5 h-5 object-contain"
                />
                <span className="truncate text-white">{teamAObj?.name}</span>
              </div>
              <div className="col-span-1 text-center text-gray-500 uppercase text-[10px]">
                Métrica
              </div>
              <div className="col-span-5 flex items-center justify-end gap-2 text-right">
                <span className="truncate text-white">{teamBObj?.name}</span>
                <img
                  src={getLogoUrl(teamBObj, 40)}
                  alt=""
                  className="w-5 h-5 object-contain"
                />
              </div>
            </div>

            {/* Lista de Barras Comparativas */}
            <div className="space-y-4 pt-1">
              <ComparisonBar
                label="Pontos / Jogo (Ataque)"
                valA={teamAStats?.offense?.pointsPerGame || 0}
                valB={teamBStats?.offense?.pointsPerGame || 0}
                colorA={teamAObj?.color || "#eab308"}
                colorB={teamBObj?.color || "#3b82f6"}
                unit="pts"
                isHigherBetter={true}
              />

              <ComparisonBar
                label="Pontos Cedidos / Jogo (Defesa)"
                valA={teamAStats?.defense?.pointsAllowedPerGame || 0}
                valB={teamBStats?.defense?.pointsAllowedPerGame || 0}
                colorA={teamAObj?.color || "#eab308"}
                colorB={teamBObj?.color || "#3b82f6"}
                unit="pts"
                isHigherBetter={false} // menor é melhor!
              />

              <ComparisonBar
                label="Jardas Totais / Jogo"
                valA={teamAStats?.offense?.totalYardsPerGame || 0}
                valB={teamBStats?.offense?.totalYardsPerGame || 0}
                colorA={teamAObj?.color || "#eab308"}
                colorB={teamBObj?.color || "#3b82f6"}
                unit="yds"
                isHigherBetter={true}
              />

              <ComparisonBar
                label="Jardas Aéreas (Passe / Jogo)"
                valA={teamAStats?.offense?.passingYardsPerGame || 0}
                valB={teamBStats?.offense?.passingYardsPerGame || 0}
                colorA={teamAObj?.color || "#eab308"}
                colorB={teamBObj?.color || "#3b82f6"}
                unit="yds"
                isHigherBetter={true}
              />

              <ComparisonBar
                label="Jardas Terrestres (Corrida / Jogo)"
                valA={teamAStats?.offense?.rushingYardsPerGame || 0}
                valB={teamBStats?.offense?.rushingYardsPerGame || 0}
                colorA={teamAObj?.color || "#eab308"}
                colorB={teamBObj?.color || "#3b82f6"}
                unit="yds"
                isHigherBetter={true}
              />

              <ComparisonBar
                label="Sacks da Defesa"
                valA={teamAStats?.defense?.sacks || 0}
                valB={teamBStats?.defense?.sacks || 0}
                colorA={teamAObj?.color || "#eab308"}
                colorB={teamBObj?.color || "#3b82f6"}
                unit="sacks"
                isHigherBetter={true}
              />

              <ComparisonBar
                label="Turnovers Forçados (Defesa)"
                valA={teamAStats?.defense?.totalTakeaways || 0}
                valB={teamBStats?.defense?.totalTakeaways || 0}
                colorA={teamAObj?.color || "#eab308"}
                colorB={teamBObj?.color || "#3b82f6"}
                unit="takeaways"
                isHigherBetter={true}
              />

              <ComparisonBar
                label="Eficiência de 3ª Descida (%)"
                valA={teamAStats?.offense?.thirdDownPct || 0}
                valB={teamBStats?.offense?.thirdDownPct || 0}
                colorA={teamAObj?.color || "#eab308"}
                colorB={teamBObj?.color || "#3b82f6"}
                unit="%"
                isHigherBetter={true}
              />

              <ComparisonBar
                label="Eficiência Red Zone (%)"
                valA={teamAStats?.offense?.redzonePct || 0}
                valB={teamBStats?.offense?.redzonePct || 0}
                colorA={teamAObj?.color || "#eab308"}
                colorB={teamBObj?.color || "#3b82f6"}
                unit="%"
                isHigherBetter={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODO 2: RAIO-X INDIVIDUAL */}
      {/* ========================================================================= */}
      {mode === "single" && (
        <div className="space-y-6">
          {/* Seletor & Filtro do Time */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Filter pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setSingleFilter("league")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    singleFilter === "league"
                      ? "bg-yellow-400 text-gray-950 font-black shadow-md shadow-yellow-400/20"
                      : "bg-gray-950 text-gray-400 hover:text-white border border-gray-800"
                  }`}
                >
                  Times do Bolão ({selectedTeamIds.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSingleFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    singleFilter === "all"
                      ? "bg-yellow-400 text-gray-950 font-black shadow-md shadow-yellow-400/20"
                      : "bg-gray-950 text-gray-400 hover:text-white border border-gray-800"
                  }`}
                >
                  Todos os 32 Times
                </button>
                <button
                  type="button"
                  onClick={() => setSingleFilter("afc")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    singleFilter === "afc"
                      ? "bg-red-500 text-white font-black shadow-md shadow-red-500/20"
                      : "bg-gray-950 text-gray-400 hover:text-white border border-gray-800"
                  }`}
                >
                  AFC (16)
                </button>
                <button
                  type="button"
                  onClick={() => setSingleFilter("nfc")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    singleFilter === "nfc"
                      ? "bg-blue-500 text-white font-black shadow-md shadow-blue-500/20"
                      : "bg-gray-950 text-gray-400 hover:text-white border border-gray-800"
                  }`}
                >
                  NFC (16)
                </button>
              </div>

              {/* Busca por texto */}
              <div className="relative min-w-[200px]">
                <input
                  type="text"
                  value={singleSearch}
                  onChange={(e) => setSingleSearch(e.target.value)}
                  placeholder="Filtrar por nome ou sigla..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                />
                {singleSearch && (
                  <button
                    type="button"
                    onClick={() => setSingleSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Grid horizontal de ícones de times para seleção rápida */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
              {availableSingleTeams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setSingleTeamId(team.id)}
                  className={`flex-shrink-0 p-2 rounded-2xl border transition-all flex flex-col items-center gap-1 min-w-[70px] ${
                    singleTeamId === team.id
                      ? "bg-yellow-400/15 border-yellow-400 shadow-md scale-105"
                      : "bg-gray-950/60 border-gray-800 hover:border-gray-700 opacity-80 hover:opacity-100"
                  }`}
                >
                  <img
                    src={getLogoUrl(team, 60)}
                    alt={team.name}
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                  <span
                    className={`text-[10px] font-bold uppercase truncate max-w-[60px] ${
                      singleTeamId === team.id ? "text-yellow-400 font-black" : "text-gray-400"
                    }`}
                  >
                    {team.id}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Hero Card da Equipe Selecionada */}
          <div
            className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl relative overflow-hidden"
            style={{
              borderTopColor: singleTeamObj?.color || "#eab308",
              borderTopWidth: 6,
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <img
                  src={getLogoUrl(singleTeamObj, 160)}
                  alt={singleTeamObj?.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-xl flex-shrink-0"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-white font-black text-xl sm:text-2xl tracking-tight truncate">
                      {singleTeamObj?.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-gray-800 text-gray-300 border border-gray-700">
                      {singleTeamObj?.conference} · {singleTeamObj?.division}
                    </span>
                    {selectedTeamIds.includes(singleTeamId) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                        🏈 Liga Ativa
                      </span>
                    )}
                  </div>

                  <p className="text-gray-400 text-xs sm:text-sm mt-1 flex items-center gap-2 flex-wrap">
                    <span>
                      Campanha Oficial NFL:{" "}
                      <strong className="text-white font-black">
                        {singleStandings?.record || "0-0"}
                      </strong>
                    </span>
                    {singleStandings?.streak && singleStandings.streak !== "-" && (
                      <span className="px-2 py-0.5 rounded-md bg-gray-800 text-yellow-400 text-xs font-bold">
                        🔥 Sequência: {singleStandings.streak}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Badges Rápidas de Resumo da Franquia */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap self-start sm:self-auto">
                <div className="bg-gray-950/70 border border-gray-800 rounded-2xl px-3.5 py-2 text-center">
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">
                    Saldo Pontos
                  </span>
                  <span
                    className={`text-sm font-black ${
                      (singleStandings?.pointDiff || 0) >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {(singleStandings?.pointDiff || 0) >= 0 ? "+" : ""}
                    {singleStandings?.pointDiff || 0}
                  </span>
                </div>

                <div className="bg-gray-950/70 border border-gray-800 rounded-2xl px-3.5 py-2 text-center">
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">
                    Divisão
                  </span>
                  <span className="text-sm font-black text-white">
                    {singleStandings?.divisionRecord || "0-0"}
                  </span>
                </div>

                <div className="bg-gray-950/70 border border-emerald-500/20 rounded-2xl px-3.5 py-2 text-center">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase block">
                    Pote no Bolão
                  </span>
                  <span className="text-sm font-black text-emerald-400">
                    {leagueTeams[singleTeamId]
                      ? `R$ ${(leagueTeams[singleTeamId].pot ?? 0).toFixed(2)}`
                      : "Fora da Liga"}
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-abas de Estatísticas Detalhadas */}
            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-800/80 overflow-x-auto pb-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSingleTab("overview")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  singleTab === "overview"
                    ? "bg-yellow-400 text-gray-950 font-black shadow-md shadow-yellow-400/20"
                    : "bg-gray-950 text-gray-400 hover:text-white border border-gray-800"
                }`}
              >
                🏈 Visão Geral
              </button>
              <button
                type="button"
                onClick={() => setSingleTab("offense")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  singleTab === "offense"
                    ? "bg-yellow-400 text-gray-950 font-black shadow-md shadow-yellow-400/20"
                    : "bg-gray-950 text-gray-400 hover:text-white border border-gray-800"
                }`}
              >
                🎯 Ataque Completo
              </button>
              <button
                type="button"
                onClick={() => setSingleTab("defense")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  singleTab === "defense"
                    ? "bg-yellow-400 text-gray-950 font-black shadow-md shadow-yellow-400/20"
                    : "bg-gray-950 text-gray-400 hover:text-white border border-gray-800"
                }`}
              >
                🛡️ Defesa & Pressão
              </button>
              <button
                type="button"
                onClick={() => setSingleTab("special")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  singleTab === "special"
                    ? "bg-yellow-400 text-gray-950 font-black shadow-md shadow-yellow-400/20"
                    : "bg-gray-950 text-gray-400 hover:text-white border border-gray-800"
                }`}
              >
                👟 Especialistas & Eficiência
              </button>
            </div>
          </div>

          {/* Conteúdo das Sub-abas */}
          {singleTab === "overview" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                title="Média Pontos / Jogo"
                value={singleStats?.offense?.pointsPerGame || 0}
                unit="pts/g"
                color="text-yellow-400"
                subtitle="Ataque da equipe"
              />
              <StatCard
                title="Pontos Sofridos / Jogo"
                value={singleStats?.defense?.pointsAllowedPerGame || 0}
                unit="pts/g"
                color="text-red-400"
                subtitle="Cedidos pela defesa"
              />
              <StatCard
                title="Jardas Totais / Jogo"
                value={singleStats?.offense?.totalYardsPerGame || 0}
                unit="yds/g"
                color="text-white"
                subtitle="Passe + Corrida"
              />
              <StatCard
                title="Sacks Totais"
                value={singleStats?.defense?.sacks || 0}
                unit="sacks"
                color="text-emerald-400"
                subtitle="Pressão no QB rival"
              />

              <StatCard
                title="Jardas de Passe / Jogo"
                value={singleStats?.offense?.passingYardsPerGame || 0}
                unit="yds/g"
                color="text-sky-400"
                subtitle="Volume aéreo"
              />
              <StatCard
                title="Jardas de Corrida / Jogo"
                value={singleStats?.offense?.rushingYardsPerGame || 0}
                unit="yds/g"
                color="text-amber-400"
                subtitle="Volume terrestre"
              />
              <StatCard
                title="Turnovers Forçados"
                value={singleStats?.defense?.totalTakeaways || 0}
                unit="takeaways"
                color="text-purple-400"
                subtitle="Interceptações + Fumbles"
              />
              <StatCard
                title="Aproveitamento 3ª Descida"
                value={`${singleStats?.offense?.thirdDownPct || 0}%`}
                color="text-emerald-400"
                subtitle="Conversões ofensivas"
              />
            </div>
          )}

          {singleTab === "offense" && (
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <h4 className="text-yellow-400 font-black text-sm uppercase tracking-wider flex items-center gap-2">
                <span>🎯</span>
                <span>Desempenho Ofensivo Detalhado</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  title="Jardas de Passe Totais"
                  value={singleStats?.offense?.totalPassingYards?.toLocaleString("pt-BR") || 0}
                  unit="yds"
                  color="text-white"
                />
                <StatCard
                  title="Touchdowns de Passe"
                  value={singleStats?.offense?.passingTouchdowns || 0}
                  unit="TDs"
                  color="text-emerald-400"
                />
                <StatCard
                  title="% Passes Completos"
                  value={`${singleStats?.offense?.completionPct || 0}%`}
                  color="text-sky-400"
                />
                <StatCard
                  title="Passer Rating"
                  value={singleStats?.offense?.qbRating || 0}
                  color="text-yellow-400"
                />

                <StatCard
                  title="Jardas de Corrida Totais"
                  value={singleStats?.offense?.totalRushingYards?.toLocaleString("pt-BR") || 0}
                  unit="yds"
                  color="text-white"
                />
                <StatCard
                  title="Touchdowns Terrestres"
                  value={singleStats?.offense?.rushingTouchdowns || 0}
                  unit="TDs"
                  color="text-emerald-400"
                />
                <StatCard
                  title="Média Jardas / Corrida"
                  value={singleStats?.offense?.yardsPerRush || 0}
                  unit="yds/carregada"
                  color="text-amber-400"
                />
                <StatCard
                  title="Touchdowns Totais"
                  value={singleStats?.offense?.totalTouchdowns || 0}
                  unit="TDs"
                  color="text-yellow-400"
                />
              </div>
            </div>
          )}

          {singleTab === "defense" && (
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <h4 className="text-red-400 font-black text-sm uppercase tracking-wider flex items-center gap-2">
                <span>🛡️</span>
                <span>Estatísticas Defensivas & Pressão</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  title="Sacks Conquistados"
                  value={singleStats?.defense?.sacks || 0}
                  unit="sacks"
                  color="text-emerald-400"
                />
                <StatCard
                  title="Tackles p/ Perda de Jardas"
                  value={singleStats?.defense?.tacklesForLoss || 0}
                  unit="TFL"
                  color="text-yellow-400"
                />
                <StatCard
                  title="Interceptações Forçadas"
                  value={singleStats?.defense?.interceptionsForced || 0}
                  unit="INTs"
                  color="text-sky-400"
                />
                <StatCard
                  title="Fumbles Forçados"
                  value={singleStats?.defense?.fumblesForced || 0}
                  unit="fumbles"
                  color="text-purple-400"
                />

                <StatCard
                  title="Média Pontos Sofridos"
                  value={singleStats?.defense?.pointsAllowedPerGame || 0}
                  unit="pts/jogo"
                  color="text-red-400"
                />
                <StatCard
                  title="Jardas Cedidas / Jogo"
                  value={singleStats?.defense?.totalYardsAllowedPerGame || 0}
                  unit="yds/jogo"
                  color="text-gray-300"
                />
                <StatCard
                  title="Passe Cedido / Jogo"
                  value={singleStats?.defense?.passingYardsAllowedPerGame || 0}
                  unit="yds/jogo"
                  color="text-gray-300"
                />
                <StatCard
                  title="Corrida Cedida / Jogo"
                  value={singleStats?.defense?.rushingYardsAllowedPerGame || 0}
                  unit="yds/jogo"
                  color="text-gray-300"
                />
              </div>
            </div>
          )}

          {singleTab === "special" && (
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <h4 className="text-emerald-400 font-black text-sm uppercase tracking-wider flex items-center gap-2">
                <span>👟</span>
                <span>Chutes, Especialistas & Eficiência</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  title="Field Goals Convertidos"
                  value={`${singleStats?.specialTeams?.fieldGoalsMade || 0} / ${
                    singleStats?.specialTeams?.fieldGoalAttempts || 0
                  }`}
                  color="text-white"
                />
                <StatCard
                  title="% Field Goals"
                  value={`${singleStats?.specialTeams?.fieldGoalPct || 0}%`}
                  color="text-emerald-400"
                />
                <StatCard
                  title="Média Jardas / Punt"
                  value={singleStats?.specialTeams?.grossAvgPuntYards || 0}
                  unit="yds"
                  color="text-sky-400"
                />
                <StatCard
                  title="Red Zone Efficiency"
                  value={`${singleStats?.offense?.redzonePct || 0}%`}
                  color="text-yellow-400"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ title, value, unit, color = "text-white", subtitle }) {
  return (
    <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
        {title}
      </span>
      <div className="my-1.5 flex items-baseline gap-1.5">
        <span className={`text-xl sm:text-2xl font-black block ${color}`}>
          {value}
        </span>
        {unit && <span className="text-xs text-gray-500 font-semibold">{unit}</span>}
      </div>
      {subtitle && (
        <span className="text-[10px] text-gray-500 block truncate">{subtitle}</span>
      )}
    </div>
  );
}

function ComparisonBar({
  label,
  valA,
  valB,
  colorA,
  colorB,
  unit = "",
  isHigherBetter = true,
}) {
  const numA = Number(valA) || 0;
  const numB = Number(valB) || 0;
  const total = numA + numB || 1;

  const pctA = Math.round((numA / total) * 100);
  const pctB = 100 - pctA;

  const isAWinner = isHigherBetter ? numA > numB : numA < numB;
  const isBWinner = isHigherBetter ? numB > numA : numB < numA;

  return (
    <div className="p-3 rounded-2xl bg-gray-950/50 border border-gray-800/80 space-y-2">
      <div className="flex items-center justify-between text-xs font-bold">
        {/* Value A */}
        <div className="flex items-center gap-1.5">
          <span
            className={`text-sm font-black ${
              isAWinner ? "text-emerald-400" : isBWinner ? "text-gray-400" : "text-white"
            }`}
          >
            {valA} {unit}
          </span>
          {isAWinner && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-black">
              Melhor
            </span>
          )}
        </div>

        {/* Label center */}
        <span className="text-[11px] uppercase tracking-wider text-gray-400 font-black text-center truncate px-2">
          {label}
        </span>

        {/* Value B */}
        <div className="flex items-center gap-1.5 justify-end">
          {isBWinner && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-black">
              Melhor
            </span>
          )}
          <span
            className={`text-sm font-black ${
              isBWinner ? "text-emerald-400" : isAWinner ? "text-gray-400" : "text-white"
            }`}
          >
            {valB} {unit}
          </span>
        </div>
      </div>

      {/* Progress Bar Dual */}
      <div className="w-full bg-gray-900 h-2.5 rounded-full overflow-hidden flex gap-0.5">
        <div
          style={{ width: `${pctA}%`, backgroundColor: isAWinner ? "#eab308" : "#4b5563" }}
          className="h-full rounded-l-full transition-all duration-500"
        />
        <div
          style={{ width: `${pctB}%`, backgroundColor: isBWinner ? "#3b82f6" : "#4b5563" }}
          className="h-full rounded-r-full transition-all duration-500"
        />
      </div>
    </div>
  );
}

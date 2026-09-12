import { useState, useEffect, useMemo } from "react";
import { useBet } from "../../context/BetContext";
import { useAuth } from "../../context/AuthContext";
import { NFL_TEAMS, getTeamById, getLogoUrl } from "../../data/nflTeams";
import {
  fetchNflStandings,
  fetchTeamStats,
  fetchTeamSchedule,
  fetchTeamLeaders,
  fetchNflScoreboard,
} from "../../services/espnApi";

export default function TeamStats({
  initialTeamA,
  initialTeamB,
  onGoToNewBet,
  onOpenTab,
}) {
  const { teams: leagueTeams, selectedTeamIds, currentRound, bets } = useBet();
  const { userProfile } = useAuth();

  const safeSelectedIds = useMemo(
    () => (Array.isArray(selectedTeamIds) ? selectedTeamIds : []),
    [selectedTeamIds]
  );

  // Mode: 'h2h' (Confronto) | 'single' (Raio-X Individual)
  const [mode, setMode] = useState(initialTeamA && initialTeamB ? "h2h" : "h2h");

  // Selection state
  const [teamAId, setTeamAId] = useState(
    initialTeamA || safeSelectedIds[0] || "kc"
  );
  const [teamBId, setTeamBId] = useState(
    initialTeamB || safeSelectedIds[1] || "phi"
  );
  const [singleTeamId, setSingleTeamId] = useState(
    initialTeamA || safeSelectedIds[0] || "kc"
  );

  // Filter for single team selector: 'league' | 'all' | 'afc' | 'nfc'
  const [singleFilter, setSingleFilter] = useState("league");
  const [singleSearch, setSingleSearch] = useState("");
  // Tabs: 'overview' | 'leaders' | 'schedule' | 'offense' | 'defense' | 'situational' | 'bolao'
  const [singleTab, setSingleTab] = useState("overview");

  // Data fetching state
  const [standingsMap, setStandingsMap] = useState({});
  const [statsMap, setStatsMap] = useState({}); // key: teamId, value: statsObj
  const [schedulesMap, setSchedulesMap] = useState({}); // key: teamId, value: scheduleObj
  const [leadersMap, setLeadersMap] = useState({}); // key: teamId, value: leadersArray
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingExtras, setIsLoadingExtras] = useState(false);
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
    fetchNflScoreboard(currentRound || 1)
      .then((res) => {
        if (isMounted && res.success) {
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

  // Load stats for selected teams
  useEffect(() => {
    let isMounted = true;
    const teamsToFetch =
      mode === "h2h" ? [teamAId, teamBId] : [singleTeamId];

    const missing = teamsToFetch.filter((id) => id && !statsMap[id]);
    if (missing.length === 0) return;

    setIsLoadingStats(true);
    Promise.all(
      missing.map((id) =>
        fetchTeamStats(id).then((data) => ({ id, data }))
      )
    )
      .then((results) => {
        if (!isMounted) return;
        setStatsMap((prev) => {
          const next = { ...prev };
          results.forEach(({ id, data }) => {
            if (data) next[id] = data;
          });
          return next;
        });
      })
      .finally(() => {
        if (isMounted) setIsLoadingStats(false);
      });

    return () => {
      isMounted = false;
    };
  }, [mode, teamAId, teamBId, singleTeamId]);

  // Load extra data (Schedule & Leaders) for single team or H2H teams
  useEffect(() => {
    let isMounted = true;
    const teamsToLoad = mode === "h2h" ? [teamAId, teamBId] : [singleTeamId];

    teamsToLoad.forEach((teamId) => {
      if (!teamId) return;

      // Schedule
      if (!schedulesMap[teamId]) {
        fetchTeamSchedule(teamId).then((sched) => {
          if (isMounted && sched) {
            setSchedulesMap((prev) => ({ ...prev, [teamId]: sched }));
          }
        });
      }

      // Leaders
      if (!leadersMap[teamId]) {
        const espnId = standingsMap[teamId]?.espnId;
        fetchTeamLeaders(teamId, espnId).then((leaders) => {
          if (isMounted && leaders) {
            setLeadersMap((prev) => ({ ...prev, [teamId]: leaders }));
          }
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [mode, teamAId, teamBId, singleTeamId, standingsMap]);

  // Update selection if props change
  useEffect(() => {
    if (initialTeamA) setTeamAId(initialTeamA);
    if (initialTeamB) setTeamBId(initialTeamB);
    if (initialTeamA && initialTeamB) setMode("h2h");
  }, [initialTeamA, initialTeamB]);

  // Filtered teams list for Raio-X
  const availableTeams = useMemo(() => {
    let list = NFL_TEAMS;
    if (singleFilter === "league") {
      list = NFL_TEAMS.filter((t) => safeSelectedIds.includes(t.id));
      if (list.length === 0) list = NFL_TEAMS;
    } else if (singleFilter === "afc") {
      list = NFL_TEAMS.filter((t) => t.conference === "AFC");
    } else if (singleFilter === "nfc") {
      list = NFL_TEAMS.filter((t) => t.conference === "NFC");
    }

    if (singleSearch.trim()) {
      const q = singleSearch.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.division.toLowerCase().includes(q)
      );
    }

    return list;
  }, [singleFilter, singleSearch, safeSelectedIds]);

  // Team objects & colors
  const teamA = getTeamById(teamAId) || NFL_TEAMS[0];
  const teamB = getTeamById(teamBId) || NFL_TEAMS[1];
  const singleTeam = getTeamById(singleTeamId) || NFL_TEAMS[0];

  // Dynamic Theme Colors for Single Team
  const themeColor = singleTeam?.color || "#eab308";
  const themeAccent = singleTeam?.accent || "#ca8a04";

  // League owner & pot data (safe for both object and array)
  const getLeagueData = (teamId) => {
    if (!teamId) return { owner: "Livre / Sem Dono", pot: 0, initialPot: 0, isInLeague: false };
    const teamObj =
      Array.isArray(leagueTeams)
        ? leagueTeams.find((t) => t.id === teamId)
        : (leagueTeams && typeof leagueTeams === "object" ? leagueTeams[teamId] : null);

    return {
      owner: teamObj?.owner || "Livre / Sem Dono",
      pot: typeof teamObj?.pot === "number" ? teamObj.pot : 0,
      initialPot: typeof teamObj?.initialPot === "number" ? teamObj.initialPot : 0,
      isInLeague: safeSelectedIds.includes(teamId),
    };
  };

  const leagueDataA = getLeagueData(teamAId);
  const leagueDataB = getLeagueData(teamBId);
  const singleLeagueData = getLeagueData(singleTeamId);

  // Standings
  const standingA = standingsMap[teamAId] || {};
  const standingB = standingsMap[teamBId] || {};
  const singleStanding = standingsMap[singleTeamId] || {};

  // Stats
  const statsA = statsMap[teamAId];
  const statsB = statsMap[teamBId];
  const singleStats = statsMap[singleTeamId];

  // Schedules & Leaders
  const scheduleA = schedulesMap[teamAId];
  const scheduleB = schedulesMap[teamBId];
  const singleSchedule = schedulesMap[singleTeamId];

  const leadersA = leadersMap[teamAId] || [];
  const leadersB = leadersMap[teamBId] || [];
  const singleLeaders = leadersMap[singleTeamId] || [];

  // Bolão H2H Betting History
  const h2hBets = useMemo(() => {
    if (!bets) return [];
    return bets.filter(
      (b) =>
        (b.teamAId === teamAId && b.teamBId === teamBId) ||
        (b.teamAId === teamBId && b.teamBId === teamAId)
    );
  }, [bets, teamAId, teamBId]);

  const singleTeamBets = useMemo(() => {
    if (!bets) return [];
    return bets.filter(
      (b) =>
        b.teamAId === singleTeamId ||
        b.teamBId === singleTeamId ||
        b.bettingOnTeamId === singleTeamId ||
        b.betOnTeamId === singleTeamId
    );
  }, [bets, singleTeamId]);

  // Matchup Advantage Calculator
  const matchupScore = useMemo(() => {
    if (!statsA || !statsB) return { aWins: 0, bWins: 0, total: 0 };
    let a = 0;
    let b = 0;

    // PPG (Offense)
    if (statsA.offense.pointsPerGame > statsB.offense.pointsPerGame) a++;
    else if (statsB.offense.pointsPerGame > statsA.offense.pointsPerGame) b++;

    // PAPG (Defense - lower is better)
    if (statsA.defense.pointsAllowedPerGame < statsB.defense.pointsAllowedPerGame) a++;
    else if (statsB.defense.pointsAllowedPerGame < statsA.defense.pointsAllowedPerGame) b++;

    // Total Yards Offense
    if (statsA.offense.totalYardsPerGame > statsB.offense.totalYardsPerGame) a++;
    else if (statsB.offense.totalYardsPerGame > statsA.offense.totalYardsPerGame) b++;

    // Total Yards Allowed (Defense - lower is better)
    if (statsA.defense.totalYardsAllowedPerGame < statsB.defense.totalYardsAllowedPerGame) a++;
    else if (statsB.defense.totalYardsAllowedPerGame < statsA.defense.totalYardsAllowedPerGame) b++;

    // Sacks
    if (statsA.defense.sacks > statsB.defense.sacks) a++;
    else if (statsB.defense.sacks > statsA.defense.sacks) b++;

    // Takeaways
    if (statsA.defense.totalTakeaways > statsB.defense.totalTakeaways) a++;
    else if (statsB.defense.totalTakeaways > statsA.defense.totalTakeaways) b++;

    // 3rd Down %
    if (statsA.offense.thirdDownPct > statsB.offense.thirdDownPct) a++;
    else if (statsB.offense.thirdDownPct > statsA.offense.thirdDownPct) b++;

    return { aWins: a, bWins: b, total: a + b };
  }, [statsA, statsB]);

  return (
    <div
      className="min-h-screen text-white px-4 sm:px-8 py-6 relative overflow-hidden transition-colors duration-500"
      style={
        mode === "single"
          ? {
              background: `radial-gradient(circle at 50% -10%, ${themeColor}22 0%, #030712 60%), radial-gradient(circle at 95% 20%, ${themeAccent}18 0%, transparent 45%)`,
            }
          : {
              background: `radial-gradient(circle at 20% -10%, ${teamA.color}25 0%, #030712 55%), radial-gradient(circle at 80% -10%, ${teamB.color}25 0%, transparent 55%)`,
            }
      }
    >
      {/* Background ambient decorative shapes */}
      <div
        className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 -z-10 transition-all duration-700"
        style={{ backgroundColor: mode === "single" ? themeColor : teamA.color }}
      />
      <div
        className="absolute top-20 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 -z-10 transition-all duration-700"
        style={{ backgroundColor: mode === "single" ? themeAccent : teamB.color }}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER & MODE SWITCHER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-900/80 backdrop-blur-md border border-white/10 p-4 sm:p-5 rounded-3xl shadow-2xl">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">📊</span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                  Estatísticas & Confrontos
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                    ESPN Oficial
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-400">
                  {mode === "h2h"
                    ? "Comparativo Head-to-Head detalhado entre duas equipes com vantagens e histórico"
                    : `Raio-X aprofundado do ${singleTeam.name} com tema oficial, líderes e estatísticas`}
                </p>
              </div>
            </div>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center bg-gray-950/80 p-1.5 rounded-2xl border border-gray-800 self-start md:self-auto shadow-inner">
            <button
              type="button"
              onClick={() => setMode("h2h")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
                mode === "h2h"
                  ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-950 shadow-md shadow-yellow-500/20 scale-105"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <span>🥊</span>
              <span>Comparador H2H</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("single")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
                mode === "single"
                  ? "text-gray-950 shadow-md scale-105"
                  : "text-gray-400 hover:text-white"
              }`}
              style={
                mode === "single"
                  ? {
                      backgroundColor: themeColor,
                      color: "#030712",
                      boxShadow: `0 4px 15px ${themeColor}50`,
                    }
                  : {}
              }
            >
              <span>🔍</span>
              <span>Raio-X do Time</span>
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* MODE 1: COMPARADOR HEAD-TO-HEAD (H2H) */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {mode === "h2h" && (
          <div className="space-y-6">
            {/* Quick Matchups from Current NFL Week */}
            {currentWeekGames.length > 0 && (
              <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800/80 p-4 rounded-2xl">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>Carregar Jogos da Rodada #{currentRound || 1}</span>
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Clique para comparar o confronto
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {currentWeekGames.map((game) => {
                    const isSelected =
                      (teamAId === game.awayTeam.id && teamBId === game.homeTeam.id) ||
                      (teamAId === game.homeTeam.id && teamBId === game.awayTeam.id);

                    return (
                      <button
                        key={game.id}
                        type="button"
                        onClick={() => {
                          setTeamAId(game.awayTeam.id);
                          setTeamBId(game.homeTeam.id);
                        }}
                        className={`flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all outline-none focus:outline-none ${
                          isSelected
                            ? "bg-yellow-400 text-gray-950 border-yellow-400 font-black shadow-md shadow-yellow-400/20"
                            : "bg-gray-950/60 hover:bg-gray-800/80 border-gray-800 text-gray-300 hover:text-white"
                        }`}
                      >
                        <img
                          src={getLogoUrl(game.awayTeam)}
                          alt=""
                          className="w-5 h-5 object-contain"
                        />
                        <span className="font-extrabold">{game.awayTeam.abbr}</span>
                        <span className="text-gray-500 text-[10px]">@</span>
                        <img
                          src={getLogoUrl(game.homeTeam)}
                          alt=""
                          className="w-5 h-5 object-contain"
                        />
                        <span className="font-extrabold">{game.homeTeam.abbr}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Team Selectors Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Selector Team A */}
              <div
                className="bg-gray-900/80 backdrop-blur-md p-4 rounded-2xl border transition-all"
                style={{ borderColor: `${teamA.color}60` }}
              >
                <label className="text-xs font-black uppercase tracking-wider text-gray-400 block mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: teamA.color }} />
                    Equipe A (Visitante / Lado Esquerdo)
                  </span>
                  {standingA.record && (
                    <span className="text-yellow-400 font-bold">{standingA.record}</span>
                  )}
                </label>
                <select
                  value={teamAId}
                  onChange={(e) => setTeamAId(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm font-black text-white focus:outline-none focus:border-yellow-400 transition-colors"
                >
                  <optgroup label="Times no Bolão">
                    {NFL_TEAMS.filter((t) => safeSelectedIds.includes(t.id)).map((t) => (
                      <option key={t.id} value={t.id}>
                        🏈 {t.name} ({t.conference} {t.division})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Outros Times da NFL">
                    {NFL_TEAMS.filter((t) => !safeSelectedIds.includes(t.id)).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.conference} {t.division})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Selector Team B */}
              <div
                className="bg-gray-900/80 backdrop-blur-md p-4 rounded-2xl border transition-all"
                style={{ borderColor: `${teamB.color}60` }}
              >
                <label className="text-xs font-black uppercase tracking-wider text-gray-400 block mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: teamB.color }} />
                    Equipe B (Mandante / Lado Direito)
                  </span>
                  {standingB.record && (
                    <span className="text-yellow-400 font-bold">{standingB.record}</span>
                  )}
                </label>
                <select
                  value={teamBId}
                  onChange={(e) => setTeamBId(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm font-black text-white focus:outline-none focus:border-yellow-400 transition-colors"
                >
                  <optgroup label="Times no Bolão">
                    {NFL_TEAMS.filter((t) => safeSelectedIds.includes(t.id)).map((t) => (
                      <option key={t.id} value={t.id}>
                        🏈 {t.name} ({t.conference} {t.division})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Outros Times da NFL">
                    {NFL_TEAMS.filter((t) => !safeSelectedIds.includes(t.id)).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.conference} {t.division})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* TALE OF THE TAPE CARD */}
            <div className="bg-gradient-to-b from-gray-900/90 to-gray-950/90 backdrop-blur-md border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Team A Hero */}
                <div
                  className="flex flex-col items-center md:items-start text-center md:text-left p-4 rounded-2xl transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${teamA.color}25 0%, transparent 80%)`,
                    borderLeft: `4px solid ${teamA.color}`,
                  }}
                >
                  <div className="flex items-center gap-3.5 mb-2">
                    <img
                      src={getLogoUrl(teamA)}
                      alt={teamA.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-xl"
                    />
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                        {teamA.name}
                      </h2>
                      <p className="text-xs text-gray-400 font-semibold">
                        {standingA.conference || teamA.conference} {standingA.division || teamA.division}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-2.5 py-1 rounded-lg bg-gray-950/80 border border-gray-800 text-xs font-black text-white">
                      Campanha: <strong className="text-yellow-400">{standingA.record || "-"}</strong>
                    </span>
                    {standingA.streak && (
                      <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black">
                        {standingA.streak}
                      </span>
                    )}
                    {standingA.playoffSeed > 0 && (
                      <span className="px-2 py-1 rounded-lg bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 text-xs font-black">
                        #{standingA.playoffSeed} Seed
                      </span>
                    )}
                  </div>

                  {/* League owner & pot */}
                  <div className="mt-3 w-full bg-gray-950/60 p-2.5 rounded-xl border border-gray-800/80 text-xs flex items-center justify-between">
                    <span className="text-gray-400 truncate">
                      👤 {leagueDataA.owner}
                    </span>
                    <span className="text-yellow-400 font-black">
                      R$ {leagueDataA.pot.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Center VS & Advantage Score */}
                <div className="flex flex-col items-center justify-center text-center space-y-3 py-2">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-500 flex items-center justify-center text-gray-950 font-black text-lg shadow-lg shadow-yellow-500/20">
                    VS
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-gray-400 font-extrabold block">
                      Vantagem Geral das Métricas
                    </span>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <span
                        className="text-lg font-black px-2.5 py-0.5 rounded-lg text-white"
                        style={{ backgroundColor: teamA.color }}
                      >
                        {matchupScore.aWins}
                      </span>
                      <span className="text-gray-500 font-black">x</span>
                      <span
                        className="text-lg font-black px-2.5 py-0.5 rounded-lg text-white"
                        style={{ backgroundColor: teamB.color }}
                      >
                        {matchupScore.bWins}
                      </span>
                    </div>
                  </div>

                  {onGoToNewBet && (
                    <button
                      type="button"
                      onClick={() => onGoToNewBet(teamAId, teamBId, currentRound)}
                      className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xs rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
                    >
                      <span>⚡</span>
                      <span>Apostar Neste Jogo</span>
                    </button>
                  )}
                </div>

                {/* Team B Hero */}
                <div
                  className="flex flex-col items-center md:items-end text-center md:text-right p-4 rounded-2xl transition-all"
                  style={{
                    background: `linear-gradient(225deg, ${teamB.color}25 0%, transparent 80%)`,
                    borderRight: `4px solid ${teamB.color}`,
                  }}
                >
                  <div className="flex items-center gap-3.5 mb-2 flex-row-reverse md:flex-row">
                    <div className="md:text-right">
                      <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                        {teamB.name}
                      </h2>
                      <p className="text-xs text-gray-400 font-semibold">
                        {standingB.conference || teamB.conference} {standingB.division || teamB.division}
                      </p>
                    </div>
                    <img
                      src={getLogoUrl(teamB)}
                      alt={teamB.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-xl"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2 justify-center md:justify-end">
                    <span className="px-2.5 py-1 rounded-lg bg-gray-950/80 border border-gray-800 text-xs font-black text-white">
                      Campanha: <strong className="text-yellow-400">{standingB.record || "-"}</strong>
                    </span>
                    {standingB.streak && (
                      <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black">
                        {standingB.streak}
                      </span>
                    )}
                    {standingB.playoffSeed > 0 && (
                      <span className="px-2 py-1 rounded-lg bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 text-xs font-black">
                        #{standingB.playoffSeed} Seed
                      </span>
                    )}
                  </div>

                  {/* League owner & pot */}
                  <div className="mt-3 w-full bg-gray-950/60 p-2.5 rounded-xl border border-gray-800/80 text-xs flex items-center justify-between">
                    <span className="text-gray-400 truncate">
                      👤 {leagueDataB.owner}
                    </span>
                    <span className="text-yellow-400 font-black">
                      R$ {leagueDataB.pot.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* STATS COMPARISON BARS */}
            {isLoadingStats ? (
              <div className="bg-gray-900/60 p-8 rounded-3xl text-center">
                <span className="animate-spin inline-block text-3xl mb-2">⏳</span>
                <p className="text-gray-400 text-sm font-bold">
                  Carregando estatísticas da ESPN...
                </p>
              </div>
            ) : statsA && statsB ? (
              <div className="space-y-6">
                {/* 1. Ataque & Produção Ofensiva */}
                <div className="bg-gray-900/80 backdrop-blur-md border border-gray-800/80 p-5 rounded-3xl shadow-xl space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-wider text-yellow-400 flex items-center gap-2 border-b border-gray-800 pb-3">
                    <span>⚡</span>
                    <span>Produção Ofensiva & Ataque</span>
                  </h3>

                  <ComparisonBar
                    label="Pontos por Jogo (PPG)"
                    valA={statsA.offense.pointsPerGame}
                    valB={statsB.offense.pointsPerGame}
                    teamA={teamA}
                    teamB={teamB}
                  />

                  <ComparisonBar
                    label="Jardas Totais por Jogo"
                    valA={statsA.offense.totalYardsPerGame}
                    valB={statsB.offense.totalYardsPerGame}
                    teamA={teamA}
                    teamB={teamB}
                  />

                  <ComparisonBar
                    label="Jardas de Passe por Jogo"
                    valA={statsA.offense.passingYardsPerGame}
                    valB={statsB.offense.passingYardsPerGame}
                    teamA={teamA}
                    teamB={teamB}
                  />

                  <ComparisonBar
                    label="Jardas Corridas por Jogo"
                    valA={statsA.offense.rushingYardsPerGame}
                    valB={statsB.offense.rushingYardsPerGame}
                    teamA={teamA}
                    teamB={teamB}
                  />

                  <ComparisonBar
                    label="Passer Rating do QB"
                    valA={statsA.offense.qbRating}
                    valB={statsB.offense.qbRating}
                    teamA={teamA}
                    teamB={teamB}
                  />

                  <ComparisonBar
                    label="Conversão de 3ª Descida (%)"
                    valA={statsA.offense.thirdDownPct}
                    valB={statsB.offense.thirdDownPct}
                    suffix="%"
                    teamA={teamA}
                    teamB={teamB}
                  />

                  <ComparisonBar
                    label="Eficiência na Red Zone (%)"
                    valA={statsA.offense.redzonePct}
                    valB={statsB.offense.redzonePct}
                    suffix="%"
                    teamA={teamA}
                    teamB={teamB}
                  />
                </div>

                {/* 2. Defesa & Pressão */}
                <div className="bg-gray-900/80 backdrop-blur-md border border-gray-800/80 p-5 rounded-3xl shadow-xl space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-wider text-yellow-400 flex items-center gap-2 border-b border-gray-800 pb-3">
                    <span>🛡️</span>
                    <span>Defesa & Pressão</span>
                  </h3>

                  <ComparisonBar
                    label="Pontos Cedidos por Jogo (PAPG)"
                    valA={statsA.defense.pointsAllowedPerGame}
                    valB={statsB.defense.pointsAllowedPerGame}
                    lowerIsBetter={true}
                    teamA={teamA}
                    teamB={teamB}
                  />

                  <ComparisonBar
                    label="Jardas Cedidas por Jogo"
                    valA={statsA.defense.totalYardsAllowedPerGame}
                    valB={statsB.defense.totalYardsAllowedPerGame}
                    lowerIsBetter={true}
                    teamA={teamA}
                    teamB={teamB}
                  />

                  <ComparisonBar
                    label="Sacks da Defesa"
                    valA={statsA.defense.sacks}
                    valB={statsB.defense.sacks}
                    teamA={teamA}
                    teamB={teamB}
                  />

                  <ComparisonBar
                    label="Turnovers Forçados (Takeaways)"
                    valA={statsA.defense.totalTakeaways}
                    valB={statsB.defense.totalTakeaways}
                    teamA={teamA}
                    teamB={teamB}
                  />

                  <ComparisonBar
                    label="Diferencial de Turnovers (Ratio)"
                    valA={statsA.defense.turnoverRatio}
                    valB={statsB.defense.turnoverRatio}
                    teamA={teamA}
                    teamB={teamB}
                  />
                </div>

                {/* 3. Forma Recente Lado a Lado */}
                {(scheduleA?.recentGames?.length > 0 || scheduleB?.recentGames?.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Schedule Team A */}
                    <div
                      className="bg-gray-900/80 backdrop-blur-md p-5 rounded-3xl border shadow-xl space-y-3"
                      style={{ borderColor: `${teamA.color}40` }}
                    >
                      <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
                        <span className="text-xs font-black uppercase tracking-wider flex items-center gap-2" style={{ color: teamA.color }}>
                          <span>📅</span>
                          <span>Últimos 5 Jogos: {teamA.name}</span>
                        </span>
                        <span className="text-[11px] font-bold text-gray-400">
                          {scheduleA?.recentGames?.filter((g) => g.won).length || 0}V - {scheduleA?.recentGames?.filter((g) => !g.won).length || 0}D
                        </span>
                      </div>
                      <div className="space-y-2">
                        {scheduleA?.recentGames?.map((game) => (
                          <div
                            key={game.id}
                            className="bg-gray-950/80 px-3 py-2 rounded-xl border border-gray-800/80 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                  game.won
                                    ? "bg-emerald-500 text-gray-950"
                                    : "bg-red-500 text-white"
                                }`}
                              >
                                {game.won ? "W" : "L"}
                              </span>
                              <span className="text-gray-400 font-semibold">
                                {game.isHome ? "vs" : "@"}
                              </span>
                              <img
                                src={game.opponent.logo}
                                alt=""
                                className="w-5 h-5 object-contain"
                              />
                              <span className="font-extrabold text-white">
                                {game.opponent.abbr}
                              </span>
                            </div>
                            <span className="font-black text-yellow-400">
                              {game.score}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Schedule Team B */}
                    <div
                      className="bg-gray-900/80 backdrop-blur-md p-5 rounded-3xl border shadow-xl space-y-3"
                      style={{ borderColor: `${teamB.color}40` }}
                    >
                      <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
                        <span className="text-xs font-black uppercase tracking-wider flex items-center gap-2" style={{ color: teamB.color }}>
                          <span>📅</span>
                          <span>Últimos 5 Jogos: {teamB.name}</span>
                        </span>
                        <span className="text-[11px] font-bold text-gray-400">
                          {scheduleB?.recentGames?.filter((g) => g.won).length || 0}V - {scheduleB?.recentGames?.filter((g) => !g.won).length || 0}D
                        </span>
                      </div>
                      <div className="space-y-2">
                        {scheduleB?.recentGames?.map((game) => (
                          <div
                            key={game.id}
                            className="bg-gray-950/80 px-3 py-2 rounded-xl border border-gray-800/80 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                  game.won
                                    ? "bg-emerald-500 text-gray-950"
                                    : "bg-red-500 text-white"
                                }`}
                              >
                                {game.won ? "W" : "L"}
                              </span>
                              <span className="text-gray-400 font-semibold">
                                {game.isHome ? "vs" : "@"}
                              </span>
                              <img
                                src={game.opponent.logo}
                                alt=""
                                className="w-5 h-5 object-contain"
                              />
                              <span className="font-extrabold text-white">
                                {game.opponent.abbr}
                              </span>
                            </div>
                            <span className="font-black text-yellow-400">
                              {game.score}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Histórico no Nosso Bolão */}
                <div className="bg-gray-900/80 backdrop-blur-md border border-gray-800/80 p-5 rounded-3xl shadow-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-yellow-400 flex items-center gap-2">
                      <span>📜</span>
                      <span>Histórico do Confronto no Nosso Bolão</span>
                    </h3>
                    <span className="text-xs text-gray-400">
                      {h2hBets.length === 1 ? "1 aposta registrada" : `${h2hBets.length} apostas registradas`}
                    </span>
                  </div>

                  {h2hBets.length === 0 ? (
                    <p className="text-gray-500 text-xs py-2 text-center">
                      Ainda não há apostas registradas entre {teamA.name} e {teamB.name} nesta temporada do Bolão.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                      {h2hBets.map((bet) => {
                        const betOnTeamId = bet.bettingOnTeamId || bet.betOnTeamId || bet.teamAId;
                        const betOn = getTeamById(betOnTeamId);
                        return (
                          <div
                            key={bet.id}
                            className="bg-gray-950/80 border border-gray-800/80 p-3 rounded-xl flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-base flex-shrink-0 shadow-sm">
                                🎟️
                              </div>
                              <div className="min-w-0">
                                <p className="text-white font-bold truncate">
                                  {bet.userName || "Apostador"}
                                  {betOn && (
                                    <span className="text-[11px] text-gray-400 font-semibold ml-1">
                                      ({betOn.name})
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                  Rodada #{bet.round} • R$ {Number(bet.amount || 0).toFixed(2)} @{Number(bet.odd || 1).toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                bet.result === "win"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : bet.result === "loss"
                                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                  : "bg-yellow-400/20 text-yellow-400 border border-yellow-400/30"
                              }`}
                            >
                              {bet.result === "win"
                                ? "Green"
                                : bet.result === "loss"
                                ? "Red"
                                : "Pendente"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* MODE 2: RAIO-X INDIVIDUAL COM TEMA PERSONALIZADO */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {mode === "single" && (
          <div className="space-y-6">
            {/* Team Picker with Filters */}
            <div className="bg-gray-900/80 backdrop-blur-md border border-white/10 p-4 rounded-3xl shadow-xl space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Conference / League Filters */}
                <div className="flex items-center gap-1.5 bg-gray-950 p-1 rounded-xl border border-gray-800 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setSingleFilter("league")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex-1 sm:flex-none ${
                      singleFilter === "league"
                        ? "bg-yellow-400 text-gray-950 shadow"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    🏈 Liga do Bolão (16)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSingleFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex-1 sm:flex-none ${
                      singleFilter === "all"
                        ? "bg-yellow-400 text-gray-950 shadow"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Todos (32)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSingleFilter("afc")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex-1 sm:flex-none ${
                      singleFilter === "afc"
                        ? "bg-red-500 text-white shadow"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    AFC
                  </button>
                  <button
                    type="button"
                    onClick={() => setSingleFilter("nfc")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex-1 sm:flex-none ${
                      singleFilter === "nfc"
                        ? "bg-blue-600 text-white shadow"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    NFC
                  </button>
                </div>

                {/* Search Input */}
                <div className="w-full sm:w-64 relative">
                  <input
                    type="text"
                    placeholder="Buscar time ou divisão..."
                    value={singleSearch}
                    onChange={(e) => setSingleSearch(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                  />
                  {singleSearch && (
                    <button
                      type="button"
                      onClick={() => setSingleSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Team Pill Carousels */}
              <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-thin">
                {availableTeams.map((team) => {
                  const isSelected = team.id === singleTeamId;
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => setSingleTeamId(team.id)}
                      className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all outline-none focus:outline-none ${
                        isSelected
                          ? "text-white font-black shadow-md border-transparent"
                          : "bg-gray-950/70 hover:bg-gray-800/90 border-gray-800 text-gray-400 hover:text-white"
                      }`}
                      style={
                        isSelected
                          ? {
                              backgroundColor: team.color,
                              color: "#ffffff",
                              boxShadow: `0 2px 14px ${team.color}60`,
                            }
                          : {}
                      }
                    >
                      <img
                        src={getLogoUrl(team)}
                        alt=""
                        className="w-5 h-5 object-contain flex-shrink-0"
                      />
                      <span className="truncate">{team.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* HERO CARD DO TIME COM TEMA DINÂMICO */}
            <div
              className="rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden transition-all duration-500 border"
              style={{
                borderColor: `${themeColor}60`,
                background: `linear-gradient(135deg, ${themeColor}35 0%, #030712 60%, ${themeAccent}25 100%)`,
                boxShadow: `0 10px 35px -10px ${themeColor}50`,
              }}
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                  <div
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl p-3 flex items-center justify-center bg-gray-950/70 border backdrop-blur-md shadow-2xl"
                    style={{ borderColor: `${themeColor}50` }}
                  >
                    <img
                      src={getLogoUrl(singleTeam)}
                      alt={singleTeam.name}
                      className="w-full h-full object-contain drop-shadow-2xl"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2.5 justify-center sm:justify-start">
                      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {singleTeam.name}
                      </h2>
                      <span
                        className="px-2.5 py-0.5 rounded-lg text-xs font-black uppercase text-white shadow-sm"
                        style={{ backgroundColor: themeColor }}
                      >
                        {singleStanding.abbr || singleTeam.id.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-300 font-bold mt-1">
                      {singleStanding.conference || singleTeam.conference} • {singleStanding.division || singleTeam.division}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-3 justify-center sm:justify-start">
                      <span className="px-3 py-1 rounded-xl bg-gray-950/80 border border-white/10 text-xs font-black text-white">
                        Recorde: <strong className="text-yellow-400">{singleStanding.record || "0-0"}</strong>
                      </span>
                      {singleStanding.streak && (
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black">
                          🔥 {singleStanding.streak}
                        </span>
                      )}
                      {singleStanding.playoffSeed > 0 && (
                        <span className="px-2.5 py-1 rounded-xl bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 text-xs font-black">
                          🏆 #{singleStanding.playoffSeed} Seed
                        </span>
                      )}
                      {singleStanding.pointDiff !== undefined && (
                        <span
                          className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                            singleStanding.pointDiff >= 0
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-red-500/15 text-red-300 border-red-500/30"
                          }`}
                        >
                          Saldo: {singleStanding.pointDiff > 0 ? `+${singleStanding.pointDiff}` : singleStanding.pointDiff}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bolão league card */}
                <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col gap-3 min-w-[240px]">
                  <div className="bg-gray-950/80 border border-white/10 p-3.5 rounded-2xl flex-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      No Bolão NFL Bets
                    </span>
                    <p className="text-white font-black text-sm truncate mt-0.5">
                      👤 {singleLeagueData.owner}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800">
                      <span className="text-xs text-gray-400">Pote Atual:</span>
                      <span className="text-yellow-400 font-black text-base">
                        R$ {singleLeagueData.pot.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {onGoToNewBet && (
                    <button
                      type="button"
                      onClick={() => onGoToNewBet(singleTeamId, null, currentRound)}
                      className="w-full py-2.5 px-4 rounded-xl font-black text-xs text-gray-950 transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5"
                      style={{
                        backgroundColor: themeAccent || themeColor,
                        boxShadow: `0 4px 15px ${themeColor}40`,
                      }}
                    >
                      <span>⚡</span>
                      <span>Criar Aposta com {singleTeam.name}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Performance Splis (Home, Away, Div, Conf) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6 pt-5 border-t border-white/10 text-xs">
                <div className="bg-gray-950/60 p-2.5 rounded-xl border border-white/5 text-center">
                  <span className="text-gray-400 block text-[10px] font-bold uppercase">Mandante (Casa)</span>
                  <span className="text-white font-black text-sm">{singleStanding.homeRecord || "-"}</span>
                </div>
                <div className="bg-gray-950/60 p-2.5 rounded-xl border border-white/5 text-center">
                  <span className="text-gray-400 block text-[10px] font-bold uppercase">Visitante (Fora)</span>
                  <span className="text-white font-black text-sm">{singleStanding.awayRecord || "-"}</span>
                </div>
                <div className="bg-gray-950/60 p-2.5 rounded-xl border border-white/5 text-center">
                  <span className="text-gray-400 block text-[10px] font-bold uppercase">Divisão</span>
                  <span className="text-white font-black text-sm">{singleStanding.divisionRecord || "-"}</span>
                </div>
                <div className="bg-gray-950/60 p-2.5 rounded-xl border border-white/5 text-center">
                  <span className="text-gray-400 block text-[10px] font-bold uppercase">Conferência</span>
                  <span className="text-white font-black text-sm">{singleStanding.confRecord || "-"}</span>
                </div>
              </div>
            </div>

            {/* SEÇÃO DE LÍDERES DA FRANQUIA (PATRICK MAHOMES, TRAVIS KELCE, ETC) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>🌟</span>
                  <span>Líderes de Estatísticas da Temporada</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 font-bold">
                    ESPN Player Stats
                  </span>
                </h3>
              </div>

              {singleLeaders.length === 0 ? (
                <div className="bg-gray-900/60 p-5 rounded-2xl text-center text-xs text-gray-500">
                  Carregando líderes da equipe...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {singleLeaders.map((leader, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-900/90 backdrop-blur-md p-4 rounded-2xl border transition-all flex items-center gap-3.5 shadow-md"
                      style={{ borderColor: `${themeColor}40` }}
                    >
                      {leader.headshot ? (
                        <img
                          src={leader.headshot}
                          alt={leader.athleteName}
                          className="w-14 h-14 rounded-2xl object-cover bg-gray-950/80 border border-white/10 flex-shrink-0"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-base flex-shrink-0 text-white"
                          style={{ backgroundColor: themeColor }}
                        >
                          {leader.jersey || "NFL"}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                          <span>{leader.categoryIcon}</span>
                          <span className="truncate">{leader.categoryLabel}</span>
                        </span>
                        <p className="text-white font-black text-sm truncate mt-0.5">
                          {leader.athleteName}
                        </p>
                        <p className="text-[11px] text-gray-400 font-semibold">
                          {leader.position} {leader.jersey ? `#${leader.jersey}` : ""}
                        </p>
                        <p className="text-xs font-black text-yellow-400 mt-1 truncate">
                          {leader.stat}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SEÇÃO DE FORMA RECENTE (ÚLTIMOS 5 JOGOS) */}
            {singleSchedule?.recentGames?.length > 0 && (
              <div className="bg-gray-900/80 backdrop-blur-md border border-white/10 p-5 rounded-3xl shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-yellow-400 flex items-center gap-2">
                    <span>📅</span>
                    <span>Forma Recente (Últimos Jogos)</span>
                  </h3>
                  <span className="text-xs text-gray-400">
                    {singleSchedule.recentGames.filter((g) => g.won).length} Vitórias nos últimos {singleSchedule.recentGames.length} jogos
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
                  {singleSchedule.recentGames.map((game) => (
                    <div
                      key={game.id}
                      className="bg-gray-950/80 border border-gray-800/80 p-3 rounded-2xl flex flex-col justify-between space-y-2.5 transition-all hover:border-gray-700"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                            game.won
                              ? "bg-emerald-500 text-gray-950 font-black"
                              : "bg-red-500 text-white font-black"
                          }`}
                        >
                          {game.won ? "Vitória" : "Derrota"}
                        </span>
                        <span className="text-[10px] text-gray-500 font-semibold">
                          {game.isHome ? "Casa" : "Fora"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <img
                          src={game.opponent.logo}
                          alt=""
                          className="w-7 h-7 object-contain flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white truncate">
                            {game.isHome ? "vs" : "@"} {game.opponent.name}
                          </p>
                          <p className="text-[11px] text-yellow-400 font-black">
                            {game.score}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB NAVIGATION: VISÃO GERAL, ATAQUE, DEFESA, SITUACIONAIS, BOLÃO */}
            <div className="flex items-center gap-1.5 overflow-x-auto bg-gray-950/90 p-1.5 rounded-2xl border border-gray-800 scrollbar-thin">
              {[
                { id: "overview", label: "Visão Geral", icon: "📋" },
                { id: "offense", label: "Ataque Completo", icon: "🏈" },
                { id: "defense", label: "Defesa & Pressão", icon: "🛡️" },
                { id: "situational", label: "Métricas Avançadas", icon: "⏱️" },
                { id: "bolao", label: "Histórico no Bolão", icon: "💰" },
              ].map((tab) => {
                const isActive = singleTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSingleTab(tab.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 flex-shrink-0 ${
                      isActive ? "text-white shadow-md" : "text-gray-400 hover:text-white"
                    }`}
                    style={
                      isActive
                        ? {
                            backgroundColor: themeColor,
                            color: "#ffffff",
                            boxShadow: `0 2px 10px ${themeColor}50`,
                          }
                        : {}
                    }
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT */}
            {isLoadingStats ? (
              <div className="bg-gray-900/60 p-8 rounded-3xl text-center">
                <span className="animate-spin inline-block text-3xl mb-2">⏳</span>
                <p className="text-gray-400 text-sm font-bold">
                  Carregando estatísticas detalhadas...
                </p>
              </div>
            ) : singleStats ? (
              <div className="space-y-6">
                {/* 1. VISÃO GERAL */}
                {singleTab === "overview" && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    <StatCard
                      label="Pontos por Jogo"
                      value={singleStats.offense.pointsPerGame}
                      sub="Média Ofensiva (PPG)"
                      themeColor={themeColor}
                      icon="⚡"
                    />
                    <StatCard
                      label="Pontos Cedidos"
                      value={singleStats.defense.pointsAllowedPerGame}
                      sub="Média Defensiva (PAPG)"
                      themeColor={themeColor}
                      icon="🛡️"
                    />
                    <StatCard
                      label="Jardas Totais / Jogo"
                      value={singleStats.offense.totalYardsPerGame}
                      sub="Passe + Corrida"
                      themeColor={themeColor}
                      icon="📈"
                    />
                    <StatCard
                      label="Jardas Cedidas / Jogo"
                      value={singleStats.defense.totalYardsAllowedPerGame}
                      sub="Cedidas pela Defesa"
                      themeColor={themeColor}
                      icon="📉"
                    />
                    <StatCard
                      label="Jardas de Passe / Jogo"
                      value={singleStats.offense.passingYardsPerGame}
                      sub={`${singleStats.offense.passingTouchdowns} TDs passados`}
                      themeColor={themeColor}
                      icon="🎯"
                    />
                    <StatCard
                      label="Jardas Corridas / Jogo"
                      value={singleStats.offense.rushingYardsPerGame}
                      sub={`${singleStats.offense.rushingTouchdowns} TDs terrestres`}
                      themeColor={themeColor}
                      icon="🏃"
                    />
                    <StatCard
                      label="Sacks da Defesa"
                      value={singleStats.defense.sacks}
                      sub="Pressão no QB rival"
                      themeColor={themeColor}
                      icon="💥"
                    />
                    <StatCard
                      label="Diferencial de Turnovers"
                      value={singleStats.defense.turnoverRatio > 0 ? `+${singleStats.defense.turnoverRatio}` : singleStats.defense.turnoverRatio}
                      sub={`${singleStats.defense.totalTakeaways} forçados`}
                      themeColor={themeColor}
                      icon="🔄"
                    />
                  </div>
                )}

                {/* 2. ATAQUE COMPLETO */}
                {singleTab === "offense" && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    <StatCard
                      label="Pontos Totais"
                      value={singleStats.offense.totalPoints}
                      sub={`${singleStats.offense.totalTouchdowns} Touchdowns`}
                      themeColor={themeColor}
                      icon="🏈"
                    />
                    <StatCard
                      label="Passer Rating (QB)"
                      value={singleStats.offense.qbRating}
                      sub={`${singleStats.offense.completionPct}% passes comp.`}
                      themeColor={themeColor}
                      icon="⭐"
                    />
                    <StatCard
                      label="Jardas Aéreas Totais"
                      value={singleStats.offense.totalPassingYards}
                      sub={`${singleStats.offense.passingTouchdowns} TDs / ${singleStats.offense.interceptionsThrown} INTs`}
                      themeColor={themeColor}
                      icon="🎯"
                    />
                    <StatCard
                      label="Jardas Terrestres Totais"
                      value={singleStats.offense.totalRushingYards}
                      sub={`Média de ${singleStats.offense.yardsPerRush} yds/corrida`}
                      themeColor={themeColor}
                      icon="🏃"
                    />
                    <StatCard
                      label="Conversão de 3ª Descida"
                      value={`${singleStats.offense.thirdDownPct}%`}
                      sub={`Eficiência: ${singleStats.offense.thirdDownEff}`}
                      themeColor={themeColor}
                      icon="3️⃣"
                    />
                    <StatCard
                      label="Eficiência Red Zone"
                      value={`${singleStats.offense.redzonePct}%`}
                      sub="Conversão dentro das 20 yds"
                      themeColor={themeColor}
                      icon="🚨"
                    />
                  </div>
                )}

                {/* 3. DEFESA & PRESSÃO */}
                {singleTab === "defense" && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    <StatCard
                      label="Pontos Cedidos / Jogo"
                      value={singleStats.defense.pointsAllowedPerGame}
                      sub="Pontuação dos rivais"
                      themeColor={themeColor}
                      icon="🛡️"
                    />
                    <StatCard
                      label="Jardas Aéreas Cedidas / Jogo"
                      value={singleStats.defense.passingYardsAllowedPerGame}
                      sub="Cedidas pelo ar"
                      themeColor={themeColor}
                      icon="☁️"
                    />
                    <StatCard
                      label="Jardas Terrestres Cedidas"
                      value={singleStats.defense.rushingYardsAllowedPerGame}
                      sub="Cedidas pelo chão"
                      themeColor={themeColor}
                      icon="🛑"
                    />
                    <StatCard
                      label="Sacks Produzidos"
                      value={singleStats.defense.sacks}
                      sub="QBs derrubados"
                      themeColor={themeColor}
                      icon="💥"
                    />
                    <StatCard
                      label="Tackles p/ Perda (TFL)"
                      value={singleStats.defense.tacklesForLoss}
                      sub="Paradas atrás da linha"
                      themeColor={themeColor}
                      icon="🚫"
                    />
                    <StatCard
                      label="Interceptações Forçadas"
                      value={singleStats.defense.interceptionsForced}
                      sub="Passes roubados"
                      themeColor={themeColor}
                      icon="🧲"
                    />
                    <StatCard
                      label="Fumbles Forçados"
                      value={singleStats.defense.fumblesForced}
                      sub="Bolas soltas provocadas"
                      themeColor={themeColor}
                      icon="🏈"
                    />
                    <StatCard
                      label="Turnovers Totais (Takeaways)"
                      value={singleStats.defense.totalTakeaways}
                      sub={`Ratio: ${singleStats.defense.turnoverRatio}`}
                      themeColor={themeColor}
                      icon="🏆"
                    />
                  </div>
                )}

                {/* 4. MÉTRICAS AVANÇADAS & SITUACIONAIS */}
                {singleTab === "situational" && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    <StatCard
                      label="Tempo de Posse / Jogo"
                      value={singleStats.situational?.possessionTime || "30:00"}
                      sub="Média de posse de bola"
                      themeColor={themeColor}
                      icon="⏱️"
                    />
                    <StatCard
                      label="Conversão de 4ª Descida"
                      value={`${singleStats.situational?.fourthDownConvPct || 0}%`}
                      sub={`${singleStats.situational?.fourthDownConvs || 0}/${singleStats.situational?.fourthDownAttempts || 0} convertidas`}
                      themeColor={themeColor}
                      icon="4️⃣"
                    />
                    <StatCard
                      label="Faltas / Jogo"
                      value={singleStats.situational?.penaltiesPerGame || "0"}
                      sub={`Total: ${singleStats.situational?.totalPenalties || 0} faltas`}
                      themeColor={themeColor}
                      icon="🚩"
                    />
                    <StatCard
                      label="Jardas Perdidas em Faltas"
                      value={`${singleStats.situational?.penaltyYardsPerGame || 0} yds/j`}
                      sub={`Total: ${singleStats.situational?.totalPenaltyYards || 0} jardas`}
                      themeColor={themeColor}
                      icon="📏"
                    />
                    <StatCard
                      label="Sacks Sofridos (OL)"
                      value={singleStats.situational?.sacksAllowed || 0}
                      sub={`-${singleStats.situational?.sackYardsLost || 0} yds perdidas`}
                      themeColor={themeColor}
                      icon="🧱"
                    />
                    <StatCard
                      label="Field Goals"
                      value={`${singleStats.specialTeams?.fieldGoalsMade}/${singleStats.specialTeams?.fieldGoalAttempts}`}
                      sub={`${singleStats.specialTeams?.fieldGoalPct}% aproveitamento`}
                      themeColor={themeColor}
                      icon="👟"
                    />
                  </div>
                )}

                {/* 5. HISTÓRICO NO BOLÃO */}
                {singleTab === "bolao" && (
                  <div className="bg-gray-900/80 backdrop-blur-md border border-white/10 p-5 rounded-3xl shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                      <h4 className="text-sm font-black text-white flex items-center gap-2">
                        <span>💰</span>
                        <span>Apostas Realizadas com {singleTeam.name}</span>
                      </h4>
                      <span className="text-xs text-yellow-400 font-bold">
                        {singleTeamBets.length} apostas
                      </span>
                    </div>

                    {singleTeamBets.length === 0 ? (
                      <p className="text-gray-500 text-xs py-4 text-center">
                        Ainda não há apostas registradas envolvendo {singleTeam.name}.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {singleTeamBets.map((bet) => {
                          const betOnTeamId = bet.bettingOnTeamId || bet.betOnTeamId || bet.teamAId;
                          const betOn = getTeamById(betOnTeamId);
                          return (
                            <div
                              key={bet.id}
                              className="bg-gray-950/80 border border-gray-800/80 p-3.5 rounded-2xl flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-base flex-shrink-0 shadow-sm">
                                  🎟️
                                </div>
                                <div className="min-w-0">
                                  <p className="text-white font-bold truncate">
                                    {bet.userName || "Apostador"}
                                    {betOn && (
                                      <span className="text-[11px] text-gray-400 font-semibold ml-1">
                                        ({betOn.name})
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[10px] text-gray-400">
                                    Rodada #{bet.round} • R$ {Number(bet.amount || 0).toFixed(2)} @{Number(bet.odd || 1).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                                  bet.result === "win"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : bet.result === "loss"
                                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                    : "bg-yellow-400/20 text-yellow-400 border border-yellow-400/30"
                                }`}
                              >
                                {bet.result === "win"
                                  ? "Green"
                                  : bet.result === "loss"
                                  ? "Red"
                                  : "Pendente"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, themeColor, icon }) {
  return (
    <div
      className="bg-gray-900/85 backdrop-blur-md p-4 rounded-2xl border transition-all hover:scale-[1.02] shadow-md flex flex-col justify-between"
      style={{ borderColor: `${themeColor}35` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-gray-400 text-xs font-bold truncate">{label}</span>
        <span className="text-base flex-shrink-0">{icon}</span>
      </div>
      <div className="mt-2">
        <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
          {value}
        </span>
        {sub && (
          <p className="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function ComparisonBar({
  label,
  valA,
  valB,
  suffix = "",
  lowerIsBetter = false,
  teamA,
  teamB,
}) {
  const numA = parseFloat(valA) || 0;
  const numB = parseFloat(valB) || 0;
  const total = numA + numB || 1;

  const pctA = Math.max(10, Math.min(90, Math.round((numA / total) * 100)));
  const pctB = 100 - pctA;

  const aIsBetter = lowerIsBetter ? numA < numB : numA > numB;
  const bIsBetter = lowerIsBetter ? numB < numA : numB > numA;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        {/* Team A Value */}
        <div className="flex items-center gap-1.5">
          <span
            className={`font-black text-sm sm:text-base ${
              aIsBetter ? "text-yellow-400" : "text-gray-300"
            }`}
          >
            {valA}
            {suffix}
          </span>
          {aIsBetter && (
            <span className="text-[10px] bg-yellow-400/20 text-yellow-400 px-1.5 py-0.2 rounded font-black">
              ★ Vantagem
            </span>
          )}
        </div>

        {/* Label */}
        <span className="text-[11px] sm:text-xs font-extrabold text-gray-400 uppercase tracking-wider text-center truncate max-w-[200px]">
          {label}
        </span>

        {/* Team B Value */}
        <div className="flex items-center gap-1.5">
          {bIsBetter && (
            <span className="text-[10px] bg-yellow-400/20 text-yellow-400 px-1.5 py-0.2 rounded font-black">
              Vantagem ★
            </span>
          )}
          <span
            className={`font-black text-sm sm:text-base ${
              bIsBetter ? "text-yellow-400" : "text-gray-300"
            }`}
          >
            {valB}
            {suffix}
          </span>
        </div>
      </div>

      {/* Visual Bar */}
      <div className="h-3 w-full bg-gray-950 rounded-full flex overflow-hidden border border-gray-800 shadow-inner">
        <div
          style={{
            width: `${pctA}%`,
            backgroundColor: teamA.color,
          }}
          className="h-full rounded-l-full transition-all duration-500"
        />
        <div
          style={{
            width: `${pctB}%`,
            backgroundColor: teamB.color,
          }}
          className="h-full rounded-r-full transition-all duration-500"
        />
      </div>
    </div>
  );
}

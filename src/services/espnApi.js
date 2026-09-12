import { NFL_TEAMS } from "../data/nflTeams";

const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

/**
 * Maps an ESPN team object to our internal NFL team object
 */
export function mapEspnTeamToAppTeam(espnTeam) {
  if (!espnTeam) return null;
  const espnAbbr = espnTeam.abbreviation?.toLowerCase();
  const espnName = espnTeam.displayName?.toLowerCase() || espnTeam.name?.toLowerCase();

  // Try matching by id/abbreviation
  let matched = NFL_TEAMS.find((t) => t.id === espnAbbr);

  // Handle known abbreviations differences (e.g., WAS vs WSH)
  if (!matched) {
    if (espnAbbr === "wsh") matched = NFL_TEAMS.find((t) => t.id === "was");
    if (espnAbbr === "was") matched = NFL_TEAMS.find((t) => t.id === "was");
  }

  // Try matching by team name or location
  if (!matched && espnName) {
    matched = NFL_TEAMS.find(
      (t) =>
        t.name.toLowerCase() === espnName ||
        espnName.includes(t.name.toLowerCase()) ||
        t.name.toLowerCase().includes(espnTeam.name?.toLowerCase())
    );
  }

  return matched || {
    id: espnAbbr || espnTeam.id,
    name: espnTeam.displayName || espnTeam.name,
    logo: espnTeam.logo || `https://a.espncdn.com/i/teamlogos/nfl/500/${espnAbbr}.png`,
    conference: "NFL",
    division: "",
  };
}

/**
 * Formats a UTC ISO date string into Brazilian time format
 * e.g. "Dom, 13/09 às 14:00"
 */
export function formatToBrasiliaTime(isoDateString) {
  if (!isoDateString) return "";
  try {
    const date = new Date(isoDateString);
    const options = {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    };
    const formatted = new Intl.DateTimeFormat("pt-BR", options).format(date);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1).replace(",", " -").replace(",", " às");
  } catch {
    return isoDateString;
  }
}

/**
 * Fetches the current active NFL week directly from ESPN
 * @returns {Promise<number|null>} current NFL week number (e.g. 1 to 18)
 */
export async function fetchCurrentNflWeek() {
  try {
    const res = await fetch(ESPN_BASE_URL);
    if (!res.ok) return null;
    const data = await res.json();
    const weekNum = data?.week?.number;
    return typeof weekNum === "number" ? weekNum : (parseInt(weekNum) || null);
  } catch (e) {
    console.warn("Não foi possível sincronizar a semana com a ESPN:", e);
    return null;
  }
}

/**
 * Fetches the number of NFL games currently live / in progress
 * @returns {Promise<number>}
 */
export async function fetchLiveGamesCount() {
  try {
    const res = await fetch(ESPN_BASE_URL);
    if (!res.ok) return 0;
    const data = await res.json();
    const events = data?.events || [];
    return events.filter((e) => e.status?.type?.state === "in").length;
  } catch (e) {
    return 0;
  }
}

/**
 * Fetches the NFL scoreboard for a given week and season
 * @param {number|string} [week] - Week number (1-18)
 * @param {number|string} [seasonYear] - Season year (e.g. 2026)
 * @param {number} [seasonType=2] - 1: Preseason, 2: Regular Season, 3: Postseason
 */
export async function fetchNflScoreboard(week, seasonYear, seasonType = 2) {
  try {
    const params = new URLSearchParams();
    if (week) params.append("week", week);
    if (seasonYear) params.append("year", seasonYear);
    if (seasonType) params.append("seasontype", seasonType);

    const url = `${ESPN_BASE_URL}${params.toString() ? `?${params.toString()}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Erro ao buscar dados da ESPN: ${res.statusText}`);
    }

    const data = await res.json();
    const currentWeekNumber = data?.week?.number || (week ? parseInt(week) : 1);
    const currentSeasonYear = data?.season?.year || seasonYear || new Date().getFullYear();

    const events = (data?.events || []).map((event) => {
      const competition = event.competitions?.[0];
      const homeComp = competition?.competitors?.find((c) => c.homeAway === "home");
      const awayComp = competition?.competitors?.find((c) => c.homeAway === "away");

      const homeTeam = mapEspnTeamToAppTeam(homeComp?.team);
      const awayTeam = mapEspnTeamToAppTeam(awayComp?.team);

      const status = event.status?.type?.state; // 'pre' | 'in' | 'post'
      const statusDetail = event.status?.type?.shortDetail || event.status?.type?.detail;
      const isLive = status === "in";
      const isCompleted = status === "post";
      const isScheduled = status === "pre";

      const homeScore = homeComp?.score ?? "";
      const awayScore = awayComp?.score ?? "";

      const broadcast = competition?.broadcasts?.[0]?.names?.[0] || event.broadcast || "";
      const oddsDetail = competition?.odds?.[0]?.details || "";
      const overUnder = competition?.odds?.[0]?.overUnder ? `O/U ${competition.odds[0].overUnder}` : "";

      return {
        id: event.id,
        name: event.name,
        shortName: event.shortName,
        date: event.date,
        formattedTime: formatToBrasiliaTime(event.date),
        week: event.week?.number || currentWeekNumber,
        venue: competition?.venue?.fullName || "",
        broadcast,
        oddsDetail,
        overUnder,
        status,
        statusDetail,
        isLive,
        isCompleted,
        isScheduled,
        clock: event.status?.displayClock,
        period: event.status?.period,
        homeTeam: {
          ...homeTeam,
          score: homeScore,
          isWinner: homeComp?.winner || false,
          record: homeComp?.records?.[0]?.summary || "",
        },
        awayTeam: {
          ...awayTeam,
          score: awayScore,
          isWinner: awayComp?.winner || false,
          record: awayComp?.records?.[0]?.summary || "",
        },
      };
    });

    return {
      success: true,
      currentWeek: currentWeekNumber,
      seasonYear: currentSeasonYear,
      calendar: data?.leagues?.[0]?.calendar || [],
      games: events,
    };
  } catch (error) {
    console.error("Erro na API da ESPN:", error);
    return {
      success: false,
      error: error.message,
      games: [],
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NFL STANDINGS, SCHEDULE, LEADERS & TEAM IN-DEPTH STATISTICS
// ─────────────────────────────────────────────────────────────────────────────
const STANDINGS_CACHE = { data: null, timestamp: 0 };
const TEAM_STATS_CACHE = new Map();
const TEAM_SCHEDULE_CACHE = new Map();
const TEAM_LEADERS_CACHE = new Map();
const ATHLETE_CACHE = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

/**
 * Busca a classificação e campanha de todos os 32 times da NFL
 */
export async function fetchNflStandings() {
  const now = Date.now();
  if (STANDINGS_CACHE.data && now - STANDINGS_CACHE.timestamp < CACHE_TTL_MS) {
    return STANDINGS_CACHE.data;
  }

  try {
    const res = await fetch("https://site.api.espn.com/apis/v2/sports/football/nfl/standings");
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();

    const teamsMap = {};
    (data.children || []).forEach((conf) => {
      const confAbbr =
        conf.abbreviation ||
        (conf.name?.toLowerCase().includes("american") ? "AFC" : "NFC");

      (conf.standings?.entries || []).forEach((entry) => {
        const espnTeam = entry.team;
        if (!espnTeam) return;
        const appTeam = mapEspnTeamToAppTeam(espnTeam);
        const statsList = entry.stats || [];

        const getStatVal = (name, fallback = "-") => {
          const s = statsList.find((x) => x.name === name);
          return s ? (s.displayValue || s.value?.toString() || fallback) : fallback;
        };

        const wins = parseInt(getStatVal("wins", "0")) || 0;
        const losses = parseInt(getStatVal("losses", "0")) || 0;
        const ties = parseInt(getStatVal("ties", "0")) || 0;
        const winPercent = getStatVal("winPercent", ".000");
        const streak = getStatVal("streak", "-");
        const pointsFor = parseFloat(getStatVal("pointsFor", "0")) || 0;
        const pointsAgainst = parseFloat(getStatVal("pointsAgainst", "0")) || 0;
        const pointDiff = parseFloat(getStatVal("pointDifferential", "0")) || 0;
        const playoffSeed = parseInt(getStatVal("playoffSeed", "0")) || 0;
        const divisionRecord = getStatVal("vs. Div.", getStatVal("divisionRecord", "0-0"));
        const confRecord = getStatVal("vs. Conf.", "0-0");
        const homeRecord = getStatVal("Home", getStatVal("homeRecord", "-"));
        const awayRecord = getStatVal("Road", getStatVal("Away", getStatVal("awayRecord", "-")));

        const teamId = appTeam?.id?.toLowerCase();
        if (teamId) {
          teamsMap[teamId] = {
            id: teamId,
            espnId: espnTeam.id || "",
            name: appTeam.name,
            abbr: espnTeam.abbreviation?.toUpperCase() || teamId.toUpperCase(),
            logo: appTeam.logo,
            conference: confAbbr,
            division: appTeam.division || "",
            wins,
            losses,
            ties,
            record: `${wins}-${losses}${ties > 0 ? `-${ties}` : ""}`,
            winPercent,
            streak,
            pointsFor,
            pointsAgainst,
            pointDiff,
            playoffSeed,
            divisionRecord,
            confRecord,
            homeRecord,
            awayRecord,
          };
        }
      });
    });

    STANDINGS_CACHE.data = teamsMap;
    STANDINGS_CACHE.timestamp = now;
    return teamsMap;
  } catch (err) {
    console.error("Erro ao buscar standings da NFL:", err);
    return STANDINGS_CACHE.data || {};
  }
}

/**
 * Busca o calendário e os resultados recentes (últimos 5 jogos W/L) do time
 * @param {string} teamAbbr - sigla do time (ex: 'kc', 'phi')
 */
export async function fetchTeamSchedule(teamAbbr) {
  if (!teamAbbr) return { recentGames: [], upcomingGames: [] };
  const rawId = teamAbbr.toLowerCase();
  const espnSlug = rawId === "was" ? "wsh" : rawId;
  const now = Date.now();

  if (TEAM_SCHEDULE_CACHE.has(espnSlug)) {
    const cached = TEAM_SCHEDULE_CACHE.get(espnSlug);
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  try {
    // Tenta primeiro o calendário atual da ESPN
    let res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${espnSlug}/schedule`);
    let data = res.ok ? await res.json() : null;
    let events = data?.events || [];
    let completed = events.filter((e) => e.competitions?.[0]?.status?.type?.completed);

    // Se a temporada ativa não tem jogos finalizados (ex: entressafra/futuro), usa a temporada de 2024 como fallback
    if (completed.length === 0) {
      const fallbackRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${espnSlug}/schedule?season=2024`);
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (fallbackData.events?.length > 0) {
          events = fallbackData.events;
          completed = events.filter((e) => e.competitions?.[0]?.status?.type?.completed);
        }
      }
    }

    const upcoming = events.filter((e) => !e.competitions?.[0]?.status?.type?.completed);

    const recentGames = completed.slice(-5).map((e) => {
      const comp = e.competitions?.[0];
      const teamComp = comp?.competitors?.find(
        (c) =>
          c.team?.abbreviation?.toLowerCase() === espnSlug ||
          c.team?.abbreviation?.toLowerCase() === rawId
      );
      const oppComp = comp?.competitors?.find((c) => c !== teamComp);
      const won = Boolean(teamComp?.winner);
      const teamScore = teamComp?.score?.displayValue || teamComp?.score?.value || "0";
      const oppScore = oppComp?.score?.displayValue || oppComp?.score?.value || "0";
      const oppAbbr = oppComp?.team?.abbreviation?.toLowerCase() || "";

      return {
        id: e.id,
        name: e.name,
        date: e.date,
        isHome: teamComp?.homeAway === "home",
        won,
        score: `${teamScore}-${oppScore}`,
        teamScore,
        oppScore,
        opponent: {
          id: oppAbbr,
          abbr: oppComp?.team?.abbreviation?.toUpperCase() || "NFL",
          name: oppComp?.team?.displayName || oppComp?.team?.name || "Oponente",
          logo:
            oppComp?.team?.logos?.[0]?.href ||
            `https://a.espncdn.com/i/teamlogos/nfl/500/${oppAbbr || "nfl"}.png`,
        },
      };
    });

    const upcomingGames = upcoming.slice(0, 3).map((e) => {
      const comp = e.competitions?.[0];
      const teamComp = comp?.competitors?.find(
        (c) =>
          c.team?.abbreviation?.toLowerCase() === espnSlug ||
          c.team?.abbreviation?.toLowerCase() === rawId
      );
      const oppComp = comp?.competitors?.find((c) => c !== teamComp);
      const oppAbbr = oppComp?.team?.abbreviation?.toLowerCase() || "";

      return {
        id: e.id,
        name: e.name,
        date: e.date,
        isHome: teamComp?.homeAway === "home",
        opponent: {
          id: oppAbbr,
          abbr: oppComp?.team?.abbreviation?.toUpperCase() || "NFL",
          name: oppComp?.team?.displayName || oppComp?.team?.name || "Oponente",
          logo:
            oppComp?.team?.logos?.[0]?.href ||
            `https://a.espncdn.com/i/teamlogos/nfl/500/${oppAbbr || "nfl"}.png`,
        },
      };
    });

    const result = { recentGames, upcomingGames };
    TEAM_SCHEDULE_CACHE.set(espnSlug, { data: result, timestamp: now });
    return result;
  } catch (err) {
    console.error(`Erro ao buscar calendário do time ${teamAbbr}:`, err);
    return { recentGames: [], upcomingGames: [] };
  }
}

/**
 * Busca os líderes de estatísticas da franquia (QB, RB, WR/TE, Sacks)
 * @param {string} teamAbbr - sigla do time (ex: 'kc')
 * @param {string|number} espnNumericId - ID numérico do time na ESPN (ex: 12)
 */
export async function fetchTeamLeaders(teamAbbr, espnNumericId) {
  if (!teamAbbr) return [];
  const rawId = teamAbbr.toLowerCase();
  const espnSlug = rawId === "was" ? "wsh" : rawId;
  const now = Date.now();

  if (TEAM_LEADERS_CACHE.has(espnSlug)) {
    const cached = TEAM_LEADERS_CACHE.get(espnSlug);
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  try {
    let numericId = espnNumericId;
    if (!numericId && STANDINGS_CACHE.data?.[rawId]?.espnId) {
      numericId = STANDINGS_CACHE.data[rawId].espnId;
    }

    // Se ainda não tiver o ID numérico, busca via endpoint de detalhes do time
    if (!numericId) {
      const teamInfoRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${espnSlug}`);
      if (teamInfoRes.ok) {
        const teamInfo = await teamInfoRes.json();
        numericId = teamInfo.team?.id;
      }
    }

    if (!numericId) return [];

    const leadersUrl = `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2024/types/2/teams/${numericId}/leaders`;
    const res = await fetch(leadersUrl);
    if (!res.ok) return [];
    const data = await res.json();
    const categories = data.categories || [];

    const targetCategories = [
      { key: "passingLeader", label: "Líder de Passe", icon: "🎯", type: "passing" },
      { key: "rushingLeader", label: "Líder de Corrida", icon: "🏃", type: "rushing" },
      { key: "receivingLeader", label: "Líder de Recepção", icon: "🙌", type: "receiving" },
      { key: "sacks", label: "Líder em Sacks", icon: "💥", type: "defense" },
    ];

    const leaders = [];

    for (const target of targetCategories) {
      const cat = categories.find((c) => c.name === target.key);
      if (cat?.leaders?.[0]) {
        const l = cat.leaders[0];
        const refUrl = Object.values(l.athlete || {})[0] || "";
        const match = refUrl.match(/athletes\/(\d+)/);
        const athleteId = match ? match[1] : null;

        let athleteName = "Líder da Equipe";
        let headshot = "";
        let jersey = "";
        let position = "";

        if (athleteId) {
          if (ATHLETE_CACHE.has(athleteId)) {
            const cachedAth = ATHLETE_CACHE.get(athleteId);
            athleteName = cachedAth.athleteName;
            headshot = cachedAth.headshot;
            jersey = cachedAth.jersey;
            position = cachedAth.position;
          } else {
            try {
              const athRes = await fetch(`https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2024/athletes/${athleteId}`);
              if (athRes.ok) {
                const ath = await athRes.json();
                athleteName = ath.displayName || ath.fullName || athleteName;
                headshot = ath.headshot?.href || `https://a.espncdn.com/i/headshots/nfl/players/full/${athleteId}.png`;
                jersey = ath.jersey || "";
                position = ath.position?.abbreviation || "";
                ATHLETE_CACHE.set(athleteId, { athleteName, headshot, jersey, position });
              }
            } catch (e) {
              headshot = `https://a.espncdn.com/i/headshots/nfl/players/full/${athleteId}.png`;
            }
          }
        }

        leaders.push({
          categoryKey: target.key,
          categoryLabel: target.label,
          categoryIcon: target.icon,
          categoryType: target.type,
          athleteName,
          jersey,
          position,
          headshot,
          stat: l.displayValue || `${l.value || 0}`,
        });
      }
    }

    TEAM_LEADERS_CACHE.set(espnSlug, { data: leaders, timestamp: now });
    return leaders;
  } catch (err) {
    console.error(`Erro ao buscar líderes do time ${teamAbbr}:`, err);
    return [];
  }
}

/**
 * Busca estatísticas analíticas detalhadas de um time na ESPN
 * @param {string} teamAbbr - sigla ou ID do time (ex: 'kc', 'buf', 'phi')
 */
export async function fetchTeamStats(teamAbbr) {
  if (!teamAbbr) return null;
  const rawId = teamAbbr.toLowerCase();
  const espnSlug = rawId === "was" ? "wsh" : rawId;
  const now = Date.now();

  if (TEAM_STATS_CACHE.has(espnSlug)) {
    const cached = TEAM_STATS_CACHE.get(espnSlug);
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${espnSlug}/statistics`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const json = await res.json();

    const teamCats = json.results?.stats?.categories || [];
    const oppCats = json.results?.opponent || [];

    const getStat = (cats, catName, statName, fallback = "0") => {
      const cat = cats.find((c) => c.name === catName);
      if (!cat) return fallback;
      const st = cat.stats?.find((s) => s.name === statName);
      return st ? (st.displayValue ?? st.value?.toString() ?? fallback) : fallback;
    };

    const gamesPlayed = parseInt(getStat(teamCats, "general", "gamesPlayed", "17")) || 17;

    // Ataque
    const pointsPerGame = parseFloat(getStat(teamCats, "scoring", "totalPointsPerGame", "0")) || 0;
    const totalPoints = parseInt(getStat(teamCats, "scoring", "totalPoints", "0")) || 0;
    const totalTouchdowns = parseInt(getStat(teamCats, "scoring", "totalTouchdowns", "0")) || 0;
    const passingYardsPerGame = parseFloat(getStat(teamCats, "passing", "passingYardsPerGame", "0")) || 0;
    const totalPassingYards = parseInt(getStat(teamCats, "passing", "passingYards", "0").replace(/,/g, "")) || 0;
    const passingTouchdowns = parseInt(getStat(teamCats, "passing", "passingTouchdowns", "0")) || 0;
    const interceptionsThrown = parseInt(getStat(teamCats, "passing", "interceptions", "0")) || 0;
    const completionPct = parseFloat(getStat(teamCats, "passing", "completionPct", "0")) || 0;
    const qbRating = parseFloat(getStat(teamCats, "passing", "QBRating", "0")) || 0;

    const rushingYardsPerGame = parseFloat(getStat(teamCats, "rushing", "rushingYardsPerGame", "0")) || 0;
    const totalRushingYards = parseInt(getStat(teamCats, "rushing", "rushingYards", "0").replace(/,/g, "")) || 0;
    const rushingTouchdowns = parseInt(getStat(teamCats, "rushing", "rushingTouchdowns", "0")) || 0;
    const yardsPerRush = parseFloat(getStat(teamCats, "rushing", "yardsPerRushAttempt", "0")) || 0;

    const totalYardsPerGame =
      parseFloat(getStat(teamCats, "passing", "yardsPerGame", "0")) ||
      parseFloat((passingYardsPerGame + rushingYardsPerGame).toFixed(1));

    const thirdDownPct = parseFloat(getStat(teamCats, "miscellaneous", "thirdDownConvPct", "0")) || 0;
    const thirdDownEff = getStat(teamCats, "miscellaneous", "thirdDownEff", "0/0");
    const redzonePct = parseFloat(getStat(teamCats, "miscellaneous", "redzoneScoringPct", "0")) || 0;

    // Defesa
    const sacks = parseInt(getStat(teamCats, "defensive", "sacks", "0")) || 0;
    const tacklesForLoss = parseInt(getStat(teamCats, "defensive", "tacklesForLoss", "0")) || 0;
    const interceptionsForced = parseInt(getStat(teamCats, "defensiveInterceptions", "interceptions", "0")) || 0;
    const fumblesForced = parseInt(getStat(teamCats, "general", "fumblesForced", "0")) || 0;
    const totalTakeaways =
      parseInt(getStat(teamCats, "miscellaneous", "totalTakeaways", "0")) ||
      (interceptionsForced + fumblesForced);
    const turnoverRatio = parseInt(getStat(teamCats, "miscellaneous", "turnOverDifferential", "0")) || 0;

    // Oponentes (Cedidos pela Defesa)
    const pointsAllowedPerGame =
      parseFloat(getStat(oppCats, "passing", "totalPointsPerGame", "0")) ||
      parseFloat(getStat(oppCats, "scoring", "totalPointsPerGame", "0")) ||
      0;
    const passingYardsAllowedPerGame = parseFloat(getStat(oppCats, "passing", "passingYardsPerGame", "0")) || 0;
    const rushingYardsAllowedPerGame = parseFloat(getStat(oppCats, "rushing", "rushingYardsPerGame", "0")) || 0;
    const totalYardsAllowedPerGame =
      parseFloat(getStat(oppCats, "passing", "yardsPerGame", "0")) ||
      parseFloat((passingYardsAllowedPerGame + rushingYardsAllowedPerGame).toFixed(1));

    // Especialistas
    const fieldGoalsMade = parseInt(getStat(teamCats, "kicking", "fieldGoalsMade", "0")) || 0;
    const fieldGoalAttempts = parseInt(getStat(teamCats, "kicking", "fieldGoalAttempts", "0")) || 0;
    const fieldGoalPct = parseFloat(getStat(teamCats, "kicking", "fieldGoalPct", "0")) || 0;
    const grossAvgPuntYards = parseFloat(getStat(teamCats, "punting", "grossAvgPuntYards", "0")) || 0;

    // Métricas Situacionais & Avançadas
    const possessionSecondsTotal = parseInt(getStat(teamCats, "miscellaneous", "possessionTimeSeconds", "0")) || 0;
    const avgPossessionSeconds = gamesPlayed > 0 ? Math.round(possessionSecondsTotal / gamesPlayed) : 0;
    const possMins = Math.floor(avgPossessionSeconds / 60);
    const possSecs = avgPossessionSeconds % 60;
    const possessionTime = `${possMins}:${String(possSecs).padStart(2, "0")}`;

    const fourthDownConvPct = parseFloat(getStat(teamCats, "miscellaneous", "fourthDownConvPct", "0")) || 0;
    const fourthDownEff = getStat(teamCats, "miscellaneous", "fourthDownEff", "0/0");
    const fourthDownConvs = parseInt(getStat(teamCats, "miscellaneous", "fourthDownConvs", "0")) || 0;
    const fourthDownAttempts = parseInt(getStat(teamCats, "miscellaneous", "fourthDownAttempts", "0")) || 0;

    const totalPenalties = parseInt(getStat(teamCats, "miscellaneous", "totalPenalties", "0")) || 0;
    const totalPenaltyYards = parseInt(getStat(teamCats, "miscellaneous", "totalPenaltyYards", "0")) || 0;
    const penaltiesPerGame = gamesPlayed > 0 ? (totalPenalties / gamesPlayed).toFixed(1) : "0";
    const penaltyYardsPerGame = gamesPlayed > 0 ? (totalPenaltyYards / gamesPlayed).toFixed(1) : "0";

    const sacksAllowed = parseInt(getStat(teamCats, "passing", "sacks", "0")) || 0;
    const sackYardsLost = parseInt(getStat(teamCats, "passing", "sackYardsLost", "0")) || 0;
    const totalGiveaways = parseInt(getStat(teamCats, "miscellaneous", "totalGiveaways", "0")) || 0;

    const parsedStats = {
      teamId: rawId,
      gamesPlayed,
      offense: {
        pointsPerGame,
        totalPoints,
        totalTouchdowns,
        totalYardsPerGame,
        passingYardsPerGame,
        totalPassingYards,
        passingTouchdowns,
        interceptionsThrown,
        completionPct,
        qbRating,
        rushingYardsPerGame,
        totalRushingYards,
        rushingTouchdowns,
        yardsPerRush,
        thirdDownPct,
        thirdDownEff,
        redzonePct,
      },
      defense: {
        pointsAllowedPerGame,
        totalYardsAllowedPerGame,
        passingYardsAllowedPerGame,
        rushingYardsAllowedPerGame,
        sacks,
        tacklesForLoss,
        interceptionsForced,
        fumblesForced,
        totalTakeaways,
        turnoverRatio,
      },
      specialTeams: {
        fieldGoalsMade,
        fieldGoalAttempts,
        fieldGoalPct,
        grossAvgPuntYards,
      },
      situational: {
        possessionTime,
        fourthDownConvPct,
        fourthDownEff,
        fourthDownConvs,
        fourthDownAttempts,
        totalPenalties,
        totalPenaltyYards,
        penaltiesPerGame,
        penaltyYardsPerGame,
        sacksAllowed,
        sackYardsLost,
        totalGiveaways,
        totalTakeaways,
        turnoverRatio,
      },
    };

    TEAM_STATS_CACHE.set(espnSlug, { data: parsedStats, timestamp: now });
    return parsedStats;
  } catch (err) {
    console.error(`Erro ao buscar estatísticas do time ${teamAbbr}:`, err);
    return null;
  }
}

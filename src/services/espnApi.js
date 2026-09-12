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

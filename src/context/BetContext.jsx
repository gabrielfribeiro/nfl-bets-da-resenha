import { createContext, useContext, useCallback, useState, useEffect, useMemo, useRef } from "react";
import confetti from "canvas-confetti";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { getTeamById } from "../data/nflTeams";
import { sounds } from "../utils/sound";
import { getTier } from "../utils/tiers";
import { fetchCurrentNflWeek, fetchLiveGamesCount } from "../services/espnApi";
import {
  isFirebaseConfigured,
  subscribeToLeague,
  saveLeagueData,
  DEFAULT_LEAGUE_ID,
} from "../services/firebase";
import { AuthContext } from "./AuthContext";

const BetContext = createContext(null);

const INITIAL_POT = 1.0;
const DEFAULT_MAX_ODD = 1.5;
const STORAGE_KEY = "nfl-bet-manager-v1";

export const DEFAULT_POWER_UPS = [
  {
    id: "shield",
    name: "Escudo Anti-Zebra",
    icon: "🛡️",
    description: "Se perder, o pote do time não sofre desconto!",
    type: "shield",
    multiplier: 1,
    color: "cyan",
    quantity: 2,
    enabled: true,
  },
  {
    id: "double",
    name: "Turbo Lucro 2X",
    icon: "⚡",
    description: "Dobra o lucro da aposta se bater!",
    type: "multiplier",
    multiplier: 2,
    color: "purple",
    quantity: 2,
    enabled: true,
  },
];

const initialPowerUps = {
  shield: 2,
  double: 2,
};

const initialState = {
  selectedTeamIds: [],     // 16 team IDs chosen during setup
  teams: {},               // { [teamId]: { pot, potHistory, totalWins, totalLosses } }
  bets: [],                // array of bet objects
  currentRound: 1,
  globalMaxWon: INITIAL_POT,
  maxOdd: DEFAULT_MAX_ODD,  // configurable odd limit
  powerUpsList: DEFAULT_POWER_UPS,
  powerUps: initialPowerUps,
  setupComplete: false,
};

function triggerCelebration() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#fbbf24", "#34d399", "#60a5fa", "#f43f5e"],
  });
}

export function BetProvider({ children }) {
  const [state, setState] = useLocalStorage(STORAGE_KEY, initialState);
  const auth = useContext(AuthContext);

  const getCurrentUserResolver = useCallback(() => {
    if (!auth?.user && !auth?.userProfile) {
      return {
        name: "Comissário",
        email: null,
        role: "admin",
        photoURL: null,
        at: new Date().toISOString(),
      };
    }
    return {
      name:
        auth.userProfile?.displayName ||
        auth.user?.displayName ||
        auth.user?.email?.split("@")[0] ||
        "Comissário",
      email: auth.user?.email || null,
      role: auth.role || (auth.isAdmin ? "admin" : "member"),
      photoURL: auth.userProfile?.photoURL || auth.user?.photoURL || null,
      at: new Date().toISOString(),
    };
  }, [auth]);

  // ── FIREBASE CLOUD SYNC ───────────────────────────────────────────
  const [isCloudEnabled] = useState(() => isFirebaseConfigured());
  const [cloudSyncStatus, setCloudSyncStatus] = useState(
    isFirebaseConfigured() ? "syncing" : "offline"
  );
  const [cloudError, setCloudError] = useState(null);
  const isRemoteUpdateRef = useRef(false);

  // 1. Ouvir atualizações da nuvem em tempo real (onSnapshot)
  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    setCloudSyncStatus("syncing");
    const unsubscribe = subscribeToLeague(
      DEFAULT_LEAGUE_ID,
      (cloudData) => {
        if (cloudData && typeof cloudData === "object") {
          isRemoteUpdateRef.current = true;
          setState((prev) => ({
            ...prev,
            ...cloudData,
          }));
          setCloudSyncStatus("connected");
          setCloudError(null);
        } else {
          // Documento ainda não existe no Firestore
          setCloudSyncStatus("connected");
        }
      },
      (err) => {
        console.warn("[Firebase] Erro ao sincronizar:", err);
        setCloudSyncStatus("error");
        setCloudError(err.message || "Erro ao conectar com Firebase");
      }
    );

    return () => unsubscribe();
  }, [setState]);

  // 2. Salvar na nuvem quando o estado local sofrer alterações
  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    if (state.setupComplete || state.selectedTeamIds.length > 0) {
      setCloudSyncStatus("saving");
      const timer = setTimeout(() => {
        saveLeagueData(DEFAULT_LEAGUE_ID, state)
          .then(() => setCloudSyncStatus("connected"))
          .catch((err) => {
            console.error("[Firebase] Erro ao salvar estado:", err);
            setCloudSyncStatus("error");
          });
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [state]);

  // Fallback for maxOdd and powerUps if old local storage exists without them
  const effectiveMaxOdd = state.maxOdd ?? DEFAULT_MAX_ODD;

  const effectivePowerUpsList = state.powerUpsList ?? DEFAULT_POWER_UPS.map((p) => ({
    ...p,
    quantity: state.powerUps?.[p.id] ?? p.quantity,
  }));

  const effectivePowerUps = effectivePowerUpsList.reduce((acc, p) => {
    acc[p.id] = p.quantity;
    return acc;
  }, { shield: 2, double: 2 });

  const setMaxOdd = useCallback((newMax) => {
    const val = parseFloat(newMax);
    if (!isNaN(val) && val >= 1.01) {
      setState((prev) => ({ ...prev, maxOdd: val }));
    }
  }, [setState]);

  // ── POWER-UPS MANAGEMENT ───────────────────────────────────────────
  const addPowerUp = useCallback((newPower) => {
    const id = (newPower.name || "power")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "_")
      .slice(0, 15) + "_" + Date.now().toString().slice(-4);

    const powerItem = {
      id,
      name: newPower.name || "Novo Poder",
      icon: newPower.icon || "✨",
      description: newPower.description || "",
      type: newPower.type || "multiplier", // 'shield' | 'multiplier'
      multiplier: Number(newPower.multiplier) || 2,
      color: newPower.color || "amber",
      quantity: Number(newPower.quantity) >= 0 ? Number(newPower.quantity) : 2,
      enabled: true,
    };

    setState((prev) => {
      const currentList = prev.powerUpsList ?? effectivePowerUpsList;
      const updatedList = [...currentList, powerItem];
      const updatedPowerUps = updatedList.reduce((acc, p) => {
        acc[p.id] = p.quantity;
        return acc;
      }, {});
      return {
        ...prev,
        powerUpsList: updatedList,
        powerUps: updatedPowerUps,
      };
    });
    sounds.playLevelUp();
  }, [effectivePowerUpsList, setState]);

  const removePowerUp = useCallback((powerId) => {
    setState((prev) => {
      const currentList = prev.powerUpsList ?? effectivePowerUpsList;
      const updatedList = currentList.filter((p) => p.id !== powerId);
      const updatedPowerUps = updatedList.reduce((acc, p) => {
        acc[p.id] = p.quantity;
        return acc;
      }, {});
      return {
        ...prev,
        powerUpsList: updatedList,
        powerUps: updatedPowerUps,
      };
    });
  }, [effectivePowerUpsList, setState]);

  const updatePowerUp = useCallback((powerId, updates) => {
    setState((prev) => {
      const currentList = prev.powerUpsList ?? effectivePowerUpsList;
      const updatedList = currentList.map((p) => (p.id === powerId ? { ...p, ...updates } : p));
      const updatedPowerUps = updatedList.reduce((acc, p) => {
        acc[p.id] = p.quantity;
        return acc;
      }, {});
      return {
        ...prev,
        powerUpsList: updatedList,
        powerUps: updatedPowerUps,
      };
    });
  }, [effectivePowerUpsList, setState]);

  const setPowerUpQuantity = useCallback((powerId, deltaOrVal, isDelta = false) => {
    setState((prev) => {
      const currentList = prev.powerUpsList ?? effectivePowerUpsList;
      const updatedList = currentList.map((p) => {
        if (p.id === powerId) {
          const newQty = isDelta ? Math.max(0, p.quantity + deltaOrVal) : Math.max(0, deltaOrVal);
          return { ...p, quantity: newQty };
        }
        return p;
      });
      const updatedPowerUps = updatedList.reduce((acc, p) => {
        acc[p.id] = p.quantity;
        return acc;
      }, {});
      return {
        ...prev,
        powerUpsList: updatedList,
        powerUps: updatedPowerUps,
      };
    });
  }, [effectivePowerUpsList, setState]);

  // ── SETUP ──────────────────────────────────────────────────────────
  const completeSetup = useCallback((teamIds) => {
    const teams = {};
    teamIds.forEach((id) => {
      teams[id] = {
        pot: INITIAL_POT,
        potHistory: [INITIAL_POT],
        addedFunds: 0,
        totalWins: 0,
        totalLosses: 0,
      };
    });
    setState((prev) => ({
      ...prev,
      selectedTeamIds: teamIds,
      teams,
      powerUpsList: DEFAULT_POWER_UPS,
      powerUps: initialPowerUps,
      setupComplete: true,
    }));
    triggerCelebration();
    sounds.playLevelUp();
  }, [setState]);

  const resetSetup = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Erro ao limpar localStorage:", e);
    }
    setState(initialState);
    if (isFirebaseConfigured()) {
      saveLeagueData(DEFAULT_LEAGUE_ID, initialState).catch(console.error);
    }
  }, [setState]);

  // ── BETS ───────────────────────────────────────────────────────────
  const addBet = useCallback((betData) => {
    // betData: { teamAId, teamBId, bettingOnTeamId, amount, odd, result, round, note, powerUp }
    const id = Date.now().toString();
    const teamId = betData.bettingOnTeamId;
    const usedPowerUp = betData.powerUp; // power ID or null

    setState((prev) => {
      const teamState = prev.teams[teamId];
      if (!teamState) return prev;

      let newPot = teamState.pot;
      let newWins = teamState.totalWins;
      let newLosses = teamState.totalLosses;

      const oldTier = getTier(teamState.pot);

      const currentList = prev.powerUpsList ?? effectivePowerUpsList;
      const powerObj = currentList.find((p) => p.id === usedPowerUp);

      if (betData.result === "win") {
        const multiplier = powerObj?.multiplier ?? (usedPowerUp === "double" ? 2 : 1);
        const profit = betData.amount * (betData.odd - 1) * multiplier;
        newPot = parseFloat((teamState.pot + profit).toFixed(2));
        newWins++;
        const newTier = getTier(newPot);
        if (newTier.min > oldTier.min) {
          sounds.playLevelUp();
        } else {
          sounds.playWin();
        }
        triggerCelebration();
      } else if (betData.result === "loss") {
        if (powerObj?.type === "shield" || usedPowerUp === "shield") {
          // Escudo protege: não perde o pote!
          sounds.playWin();
        } else {
          newPot = parseFloat(Math.max(0, teamState.pot - betData.amount).toFixed(2));
          newLosses++;
          if (newPot <= 0) {
            sounds.playZeroAlert();
          } else {
            sounds.playLoss();
          }
        }
      }

      // Consume power up if used
      let updatedList = currentList;
      if (usedPowerUp && powerObj && powerObj.quantity > 0) {
        updatedList = currentList.map((p) =>
          p.id === usedPowerUp ? { ...p, quantity: p.quantity - 1 } : p
        );
      }
      const updatedPowerUps = updatedList.reduce((acc, p) => {
        acc[p.id] = p.quantity;
        return acc;
      }, {});

      const newGlobalMaxWon =
        betData.result === "win"
          ? Math.max(prev.globalMaxWon, betData.amount * betData.odd)
          : prev.globalMaxWon;

      const isResolved = betData.result === "win" || betData.result === "loss";
      const resolvedByInfo = isResolved
        ? (betData.resolvedBy || getCurrentUserResolver())
        : null;
      const createdByInfo = betData.createdBy || getCurrentUserResolver();

      const newBet = {
        id,
        createdAt: new Date().toISOString(),
        round: betData.round ?? prev.currentRound,
        teamAId: betData.teamAId,
        teamBId: betData.teamBId,
        bettingOnTeamId: teamId,
        amount: betData.amount,
        odd: betData.odd,
        result: betData.result,
        potBefore: teamState.pot,
        potAfter: newPot,
        powerUp: usedPowerUp || null,
        note: betData.note || "",
        createdBy: createdByInfo,
        resolvedBy: resolvedByInfo,
      };

      return {
        ...prev,
        bets: [newBet, ...prev.bets],
        globalMaxWon: parseFloat(newGlobalMaxWon.toFixed(2)),
        powerUpsList: updatedList,
        powerUps: updatedPowerUps,
        teams: {
          ...prev.teams,
          [teamId]: {
            ...teamState,
            pot: newPot,
            potHistory: [...teamState.potHistory, newPot],
            totalWins: newWins,
            totalLosses: newLosses,
          },
        },
      };
    });
  }, [setState, getCurrentUserResolver]);

  const updateBetResult = useCallback((betId, result, customResolver) => {
    setState((prev) => {
      const bet = prev.bets.find((b) => b.id === betId);
      if (!bet || bet.result !== "pending") return prev;

      const teamId = bet.bettingOnTeamId;
      const teamState = prev.teams[teamId];
      if (!teamState) return prev;

      let newPot = teamState.pot;
      let newWins = teamState.totalWins;
      let newLosses = teamState.totalLosses;

      const oldTier = getTier(teamState.pot);

      const usedPowerUp = bet.powerUp;

      const currentList = prev.powerUpsList ?? effectivePowerUpsList;
      const powerObj = currentList.find((p) => p.id === usedPowerUp);

      if (result === "win") {
        const multiplier = powerObj?.multiplier ?? (usedPowerUp === "double" ? 2 : 1);
        const profit = bet.amount * (bet.odd - 1) * multiplier;
        newPot = parseFloat((teamState.pot + profit).toFixed(2));
        newWins++;
        const newTier = getTier(newPot);
        if (newTier.min > oldTier.min) {
          sounds.playLevelUp();
        } else {
          sounds.playWin();
        }
        triggerCelebration();
      } else if (result === "loss") {
        if (powerObj?.type === "shield" || usedPowerUp === "shield") {
          // Escudo protege!
          sounds.playWin();
        } else {
          newPot = parseFloat(Math.max(0, teamState.pot - bet.amount).toFixed(2));
          newLosses++;
          if (newPot <= 0) {
            sounds.playZeroAlert();
          } else {
            sounds.playLoss();
          }
        }
      }

      const newGlobalMaxWon =
        result === "win"
          ? Math.max(prev.globalMaxWon, bet.amount * bet.odd)
          : prev.globalMaxWon;

      const resolver =
        result !== "pending"
          ? (customResolver || getCurrentUserResolver())
          : null;

      const updatedBets = prev.bets.map((b) =>
        b.id === betId
          ? { ...b, result, potAfter: newPot, resolvedBy: resolver }
          : b
      );

      return {
        ...prev,
        bets: updatedBets,
        globalMaxWon: parseFloat(newGlobalMaxWon.toFixed(2)),
        teams: {
          ...prev.teams,
          [teamId]: {
            ...teamState,
            pot: newPot,
            potHistory: [...teamState.potHistory, newPot],
            totalWins: newWins,
            totalLosses: newLosses,
          },
        },
      };
    });
  }, [effectivePowerUpsList, setState, getCurrentUserResolver]);

  const reopenBet = useCallback((betId) => {
    setState((prev) => {
      const bet = prev.bets.find((b) => b.id === betId);
      if (!bet || bet.result === "pending") return prev;

      const teamId = bet.bettingOnTeamId;
      const teamState = prev.teams[teamId];
      if (!teamState) return prev;

      let newPot = teamState.pot;
      let newWins = teamState.totalWins;
      let newLosses = teamState.totalLosses;

      const usedPowerUp = bet.powerUp;
      const currentList = prev.powerUpsList ?? effectivePowerUpsList;
      const powerObj = currentList.find((p) => p.id === usedPowerUp);

      if (bet.result === "win") {
        const multiplier = powerObj?.multiplier ?? (usedPowerUp === "double" ? 2 : 1);
        const profit = bet.amount * (bet.odd - 1) * multiplier;
        newPot = parseFloat(Math.max(0, teamState.pot - profit).toFixed(2));
        newWins = Math.max(0, newWins - 1);
      } else if (bet.result === "loss") {
        if (powerObj?.type === "shield" || usedPowerUp === "shield") {
          // Escudo protegeu o pote, nenhum valor financeiro a restaurar
        } else {
          newPot = parseFloat((teamState.pot + bet.amount).toFixed(2));
          newLosses = Math.max(0, newLosses - 1);
        }
      }

      const updatedBets = prev.bets.map((b) =>
        b.id === betId
          ? { ...b, result: "pending", potAfter: b.potBefore, resolvedBy: null }
          : b
      );

      return {
        ...prev,
        bets: updatedBets,
        teams: {
          ...prev.teams,
          [teamId]: {
            ...teamState,
            pot: newPot,
            potHistory: [...teamState.potHistory, newPot],
            totalWins: newWins,
            totalLosses: newLosses,
          },
        },
      };
    });
  }, [effectivePowerUpsList, setState]);

  const deleteBet = useCallback((betId) => {
    setState((prev) => ({
      ...prev,
      bets: prev.bets.filter((b) => b.id !== betId),
    }));
  }, [setState]);

  // ── POT MANAGEMENT ─────────────────────────────────────────────────
  const addPotFunds = useCallback((teamId, amount) => {
    sounds.playWin();
    setState((prev) => {
      const teamState = prev.teams[teamId];
      if (!teamState) return prev;
      const newPot = parseFloat((teamState.pot + amount).toFixed(2));
      const newAddedFunds = parseFloat(((teamState.addedFunds ?? 0) + amount).toFixed(2));
      return {
        ...prev,
        teams: {
          ...prev.teams,
          [teamId]: {
            ...teamState,
            pot: newPot,
            addedFunds: newAddedFunds,
            potHistory: [...teamState.potHistory, newPot],
          },
        },
      };
    });
  }, [setState]);

  // ── NFL WEEK & ROUNDS ───────────────────────────────────────────────
  const [isSyncingNflWeek, setIsSyncingNflWeek] = useState(false);

  const setCurrentRound = useCallback((round) => {
    const val = parseInt(round);
    if (!isNaN(val) && val >= 1 && val <= 25) {
      setState((prev) => ({ ...prev, currentRound: val }));
    }
  }, [setState]);

  const syncWithNflWeek = useCallback(async () => {
    setIsSyncingNflWeek(true);
    try {
      const nflWeek = await fetchCurrentNflWeek();
      if (nflWeek && typeof nflWeek === "number") {
        setState((prev) => {
          if (prev.currentRound !== nflWeek) {
            return { ...prev, currentRound: nflWeek };
          }
          return prev;
        });
        return nflWeek;
      }
    } catch (err) {
      console.warn("Falha ao sincronizar semana da NFL:", err);
    } finally {
      setIsSyncingNflWeek(false);
    }
    return null;
  }, [setState]);

  // Sincroniza a rodada com a semana da NFL automaticamente na inicialização
  useEffect(() => {
    syncWithNflWeek();
  }, [syncWithNflWeek]);

  // ── LIVE GAMES STATUS & TOTAL POT ────────────────────────────────────
  const [liveGamesCount, setLiveGamesCount] = useState(0);

  const checkLiveGames = useCallback(async () => {
    try {
      const count = await fetchLiveGamesCount();
      setLiveGamesCount(count);
      return count;
    } catch {
      return 0;
    }
  }, []);

  useEffect(() => {
    checkLiveGames();
    const interval = setInterval(checkLiveGames, 45000);
    return () => clearInterval(interval);
  }, [checkLiveGames]);

  const totalPot = useMemo(() => {
    return state.selectedTeamIds.reduce(
      (sum, id) => sum + (state.teams[id]?.pot ?? 0),
      0
    );
  }, [state.selectedTeamIds, state.teams]);

  const nextRound = useCallback(() => {
    setState((prev) => ({ ...prev, currentRound: prev.currentRound + 1 }));
  }, [setState]);

  // ── EXPORT / IMPORT BACKUP ──────────────────────────────────────────
  const exportJSON = useCallback(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      version: "2.0",
      ...state,
      powerUpsList: effectivePowerUpsList,
      powerUps: effectivePowerUps,
      selectedTeams: state.selectedTeamIds.map((id) => getTeamById(id)),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nfl-bets-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state, effectivePowerUpsList, effectivePowerUps]);

  const importJSON = useCallback((jsonData) => {
    try {
      if (!jsonData || typeof jsonData !== "object") {
        throw new Error("Arquivo inválido. O conteúdo deve ser um objeto JSON.");
      }

      if (!Array.isArray(jsonData.selectedTeamIds) && !jsonData.teams) {
        throw new Error("Formato incompatível: dados do bolão não encontrados.");
      }

      const teamIds = Array.isArray(jsonData.selectedTeamIds)
        ? jsonData.selectedTeamIds
        : Object.keys(jsonData.teams || {});

      let importedPowerUpsList = DEFAULT_POWER_UPS;
      if (Array.isArray(jsonData.powerUpsList) && jsonData.powerUpsList.length > 0) {
        importedPowerUpsList = jsonData.powerUpsList;
      } else if (jsonData.powerUps) {
        importedPowerUpsList = DEFAULT_POWER_UPS.map((p) => ({
          ...p,
          quantity: jsonData.powerUps[p.id] ?? p.quantity,
        }));
      }

      const importedPowerUps = importedPowerUpsList.reduce((acc, p) => {
        acc[p.id] = p.quantity;
        return acc;
      }, {});

      const newState = {
        selectedTeamIds: teamIds,
        teams: jsonData.teams || {},
        bets: Array.isArray(jsonData.bets) ? jsonData.bets : [],
        currentRound: Number(jsonData.currentRound) || 1,
        globalMaxWon: Number(jsonData.globalMaxWon) || INITIAL_POT,
        maxOdd: Number(jsonData.maxOdd) || DEFAULT_MAX_ODD,
        powerUpsList: importedPowerUpsList,
        powerUps: importedPowerUps,
        setupComplete: jsonData.setupComplete ?? true,
      };

      setState(newState);
      triggerCelebration();
      sounds.playLevelUp();
      return {
        success: true,
        countBets: newState.bets.length,
        countTeams: teamIds.length,
        round: newState.currentRound,
      };
    } catch (err) {
      console.error("Erro ao importar backup:", err);
      return {
        success: false,
        error: err.message || "Erro desconhecido ao ler o arquivo de backup.",
      };
    }
  }, [setState]);

  // ── HELPERS ────────────────────────────────────────────────────────
  const getMinBet = useCallback(
    (teamId) => {
      if (teamId && state.teams[teamId]) {
        return Math.max(0.01, parseFloat(state.teams[teamId].pot.toFixed(2)));
      }
      return parseFloat(state.globalMaxWon.toFixed(2));
    },
    [state.teams, state.globalMaxWon]
  );

  const isTeamSelected = useCallback(
    (teamId) => state.selectedTeamIds.includes(teamId),
    [state.selectedTeamIds]
  );

  const getTeamBets = useCallback(
    (teamId) => state.bets.filter((b) => b.bettingOnTeamId === teamId),
    [state.bets]
  );

  return (
    <BetContext.Provider
      value={{
        ...state,
        powerUpsList: effectivePowerUpsList,
        powerUps: effectivePowerUps,
        maxOdd: effectiveMaxOdd,
        MAX_ODD: effectiveMaxOdd,
        setMaxOdd,
        addPowerUp,
        removePowerUp,
        updatePowerUp,
        setPowerUpQuantity,
        INITIAL_POT,
        completeSetup,
        resetSetup,
        addBet,
        updateBetResult,
        reopenBet,
        deleteBet,
        addPotFunds,
        nextRound,
        setCurrentRound,
        syncWithNflWeek,
        isSyncingNflWeek,
        totalPot,
        liveGamesCount,
        setLiveGamesCount,
        checkLiveGames,
        exportJSON,
        importJSON,
        getMinBet,
        isTeamSelected,
        getTeamBets,
        isCloudEnabled,
        cloudSyncStatus,
        cloudError,
        leagueId: DEFAULT_LEAGUE_ID,
      }}
    >
      {children}
    </BetContext.Provider>
  );
}

export function useBet() {
  const ctx = useContext(BetContext);
  if (!ctx) throw new Error("useBet must be used inside BetProvider");
  return ctx;
}

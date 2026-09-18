import { useState, useMemo } from "react";
import { useBet } from "../../context/BetContext";
import { useAuth } from "../../context/AuthContext";
import { getTeamById, getLogoUrl } from "../../data/nflTeams";
import { getMarketBadge, getMarketDisplay } from "../../utils/markets";
import EditBetModal from "./EditBetModal";

const RESULT_CONFIG = {
  win: {
    label: "Bateu (Green)",
    shortLabel: "Green",
    icon: "✅",
    textColor: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
  loss: {
    label: "Não Bateu (Red)",
    shortLabel: "Red",
    icon: "❌",
    textColor: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    badgeBg: "bg-red-500/20 text-red-300 border-red-500/40",
  },
  pending: {
    label: "Em Andamento (Pendente)",
    shortLabel: "Pendente",
    icon: "⏳",
    textColor: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
};

export default function BetHistory({ onOpenNewBet }) {
  const { bets, updateBetResult, reopenBet, deleteBet, currentRound } = useBet();
  const { canManageBets, isAdmin } = useAuth();

  // Filters State
  const [filterResult, setFilterResult] = useState("all"); // 'all' | 'win' | 'loss' | 'pending'
  const [filterRound, setFilterRound] = useState("all"); // 'all' | string (round number)
  const [filterTeam, setFilterTeam] = useState("all"); // 'all' | teamId
  const [filterPower, setFilterPower] = useState("all"); // 'all' | 'shield' | 'double' | 'any'
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'oldest' | 'odd_desc' | 'amount_desc' | 'profit_desc'
  const [viewMode, setViewMode] = useState("timeline"); // 'timeline' | 'list'
  const [expandedId, setExpandedId] = useState(null);
  const [editingBet, setEditingBet] = useState(null);

  // Teams with at least one bet
  const uniqueTeams = useMemo(() => {
    return [...new Set(bets.map((b) => b.bettingOnTeamId))].sort((a, b) => {
      const nameA = getTeamById(a)?.name || a;
      const nameB = getTeamById(b)?.name || b;
      return nameA.localeCompare(nameB);
    });
  }, [bets]);

  // Available rounds that have bets
  const availableRounds = useMemo(() => {
    const rounds = [...new Set(bets.map((b) => Number(b.round) || 1))];
    return rounds.sort((a, b) => b - a);
  }, [bets]);

  // Global KPIs from all bets
  const stats = useMemo(() => {
    const total = bets.length;
    const wins = bets.filter((b) => b.result === "win");
    const losses = bets.filter((b) => b.result === "loss");
    const pending = bets.filter((b) => b.result === "pending");

    const resolvedCount = wins.length + losses.length;
    const winRate = resolvedCount > 0 ? Math.round((wins.length / resolvedCount) * 100) : 0;

    let totalVolume = 0;
    let netProfit = 0;

    bets.forEach((b) => {
      const amt = Number(b.amount) || 0;
      totalVolume += amt;
      if (b.result === "win") {
        const mult = b.powerUp === "double" ? 2 : 1;
        netProfit += amt * (Number(b.odd || 1) - 1) * mult;
      } else if (b.result === "loss") {
        if (b.powerUp !== "shield") {
          netProfit -= amt;
        }
      }
    });

    return {
      total,
      winsCount: wins.length,
      lossesCount: losses.length,
      pendingCount: pending.length,
      winRate,
      totalVolume,
      netProfit,
    };
  }, [bets]);

  // Filtered and sorted bets
  const filteredBets = useMemo(() => {
    let result = [...bets];

    // Status filter
    if (filterResult !== "all") {
      result = result.filter((b) => b.result === filterResult);
    }

    // Round filter
    if (filterRound !== "all") {
      result = result.filter((b) => String(b.round) === String(filterRound));
    }

    // Team filter
    if (filterTeam !== "all") {
      result = result.filter(
        (b) => b.bettingOnTeamId === filterTeam || b.teamAId === filterTeam || b.teamBId === filterTeam
      );
    }

    // Power-up filter
    if (filterPower !== "all") {
      if (filterPower === "any") {
        result = result.filter((b) => Boolean(b.powerUp));
      } else {
        result = result.filter((b) => b.powerUp === filterPower);
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((b) => {
        const teamBet = getTeamById(b.bettingOnTeamId)?.name?.toLowerCase() || "";
        const teamA = getTeamById(b.teamAId)?.name?.toLowerCase() || "";
        const teamB = getTeamById(b.teamBId)?.name?.toLowerCase() || "";
        const note = (b.note || "").toLowerCase();
        const createdByName = (b.createdBy?.name || "").toLowerCase();
        const resolvedByName = (b.resolvedBy?.name || "").toLowerCase();

        return (
          teamBet.includes(q) ||
          teamA.includes(q) ||
          teamB.includes(q) ||
          note.includes(q) ||
          createdByName.includes(q) ||
          resolvedByName.includes(q)
        );
      });
    }

    // Sort order
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      if (sortBy === "odd_desc") {
        return Number(b.odd || 0) - Number(a.odd || 0);
      }
      if (sortBy === "amount_desc") {
        return Number(b.amount || 0) - Number(a.amount || 0);
      }
      if (sortBy === "profit_desc") {
        const diffA = (a.potAfter ?? 0) - (a.potBefore ?? 0);
        const diffB = (b.potAfter ?? 0) - (b.potBefore ?? 0);
        return diffB - diffA;
      }
      return 0;
    });

    return result;
  }, [bets, filterResult, filterRound, filterTeam, filterPower, searchQuery, sortBy]);

  // Group bets by round when in timeline view
  const groupedByRound = useMemo(() => {
    const groups = {};
    filteredBets.forEach((b) => {
      const r = Number(b.round) || 1;
      if (!groups[r]) {
        groups[r] = [];
      }
      groups[r].push(b);
    });

    // Return sorted descending by round number
    return Object.keys(groups)
      .map(Number)
      .sort((a, b) => b - a)
      .map((roundNum) => {
        const roundBets = groups[roundNum];
        const roundWins = roundBets.filter((b) => b.result === "win").length;
        const roundLosses = roundBets.filter((b) => b.result === "loss").length;
        const roundPending = roundBets.filter((b) => b.result === "pending").length;

        let roundProfit = 0;
        roundBets.forEach((b) => {
          if (b.result !== "pending") {
            const diff = (b.potAfter ?? 0) - (b.potBefore ?? 0);
            roundProfit += diff;
          }
        });

        return {
          round: roundNum,
          bets: roundBets,
          wins: roundWins,
          losses: roundLosses,
          pending: roundPending,
          profit: roundProfit,
        };
      });
  }, [filteredBets]);

  const hasActiveFilters =
    filterResult !== "all" ||
    filterRound !== "all" ||
    filterTeam !== "all" ||
    filterPower !== "all" ||
    searchQuery.trim() !== "";

  const resetFilters = () => {
    setFilterResult("all");
    setFilterRound("all");
    setFilterTeam("all");
    setFilterPower("all");
    setSearchQuery("");
    setSortBy("newest");
  };

  // When there are no bets at all
  if (bets.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 text-center animate-in fade-in duration-200">
        <div className="max-w-md mx-auto bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">
            📋
          </div>
          <h2 className="text-white font-black text-2xl mb-2">Nenhuma Aposta Registrada</h2>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            O histórico ainda está zerado. Faça o primeiro palpite da temporada na aba de Nova Aposta e acompanhe o crescimento dos potes!
          </p>
          {onOpenNewBet && (
            <button
              type="button"
              onClick={onOpenNewBet}
              className="w-full py-3.5 px-6 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-sm transition-all shadow-lg shadow-yellow-400/20 active:scale-95"
            >
              Criar Primeiro Palpite
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-in fade-in duration-200">
      {/* 1. Header com Título e Estatísticas Gerais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div>
          <h2 className="text-white font-black text-2xl sm:text-3xl tracking-tight flex items-center gap-2.5">
            <span>📋</span>
            <span>Histórico de Apostas</span>
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Auditoria completa de palpites, resoluções e desempenho financeiro de toda a liga.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1.5 bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 rounded-xl text-xs font-black">
            Semana #{currentRound}
          </span>
          <span className="px-3 py-1.5 bg-gray-800 text-gray-300 border border-gray-700 rounded-xl text-xs font-bold">
            {bets.length} palpites registrados
          </span>
        </div>
      </div>

      {/* 2. Mini Painel de Métricas (Top KPI Bar) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Aproveitamento (Win Rate) */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Aproveitamento</span>
            <span className="text-lg">🎯</span>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{stats.winRate}%</span>
            <span className="text-xs text-gray-500 font-semibold">de vitórias</span>
          </div>
          <div className="space-y-1.5">
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${stats.winRate}%` }}
                className="bg-emerald-400 h-full rounded-full transition-all"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span className="text-emerald-400 font-bold">{stats.winsCount} Greens</span>
              <span className="text-red-400 font-bold">{stats.lossesCount} Reds</span>
            </div>
          </div>
        </div>

        {/* Card 2: Balanço Líquido (P&L) */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Saldo Líquido</span>
            <span className="text-lg">📈</span>
          </div>
          <div className="my-2">
            <span
              className={`text-2xl sm:text-3xl font-black block truncate ${
                stats.netProfit >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {stats.netProfit >= 0 ? "+" : ""}R$ {stats.netProfit.toFixed(2)}
            </span>
            <span className="text-xs text-gray-500 font-semibold mt-0.5 block">
              Lucro consolidado vs prejuízos
            </span>
          </div>
          <div className="pt-2 border-t border-gray-800/80 text-[11px] text-gray-400 flex items-center justify-between">
            <span>Lucro Líquido Real</span>
            <span className="font-bold text-gray-300">
              {stats.netProfit >= 0 ? "Em Lucro" : "Em Déficit"}
            </span>
          </div>
        </div>

        {/* Card 3: Volume Apostado */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Volume Apostado</span>
            <span className="text-lg">💰</span>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black text-white block truncate">
              R$ {stats.totalVolume.toFixed(2)}
            </span>
            <span className="text-xs text-gray-500 font-semibold mt-0.5 block">
              Total movimentado na temporada
            </span>
          </div>
          <div className="pt-2 border-t border-gray-800/80 text-[11px] text-gray-400 flex items-center justify-between">
            <span>Total de Jogos</span>
            <span className="font-bold text-yellow-400">{stats.total} palpites</span>
          </div>
        </div>

        {/* Card 4: Apostas Pendentes */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Aguardando Resultado</span>
            <span className="text-lg">⏳</span>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-black ${
                stats.pendingCount > 0 ? "text-amber-400" : "text-gray-400"
              }`}
            >
              {stats.pendingCount}
            </span>
            <span className="text-xs text-gray-500 font-semibold">em aberto</span>
          </div>
          <div className="pt-2 border-t border-gray-800/80 text-[11px] text-gray-400 flex items-center justify-between">
            <span>Status da Rodada</span>
            {stats.pendingCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-amber-400 font-bold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Jogos ao Vivo
              </span>
            ) : (
              <span className="text-emerald-400 font-bold">Tudo Resolvido</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Barra de Filtros, Busca & Ordenação */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-4">
        {/* Linha 1: Pílulas de Status Rápidas & Toggle de Visualização */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-800">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => setFilterResult("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterResult === "all"
                  ? "bg-yellow-400 text-gray-950 font-black shadow-md shadow-yellow-400/20 scale-105"
                  : "bg-gray-950 text-gray-400 hover:text-white border border-gray-800"
              }`}
            >
              Todos ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setFilterResult("win")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                filterResult === "win"
                  ? "bg-emerald-500 text-gray-950 font-black shadow-md shadow-emerald-500/20 scale-105"
                  : "bg-gray-950 text-emerald-400/80 hover:text-emerald-400 border border-gray-800"
              }`}
            >
              <span>✅</span>
              <span>Greens ({stats.winsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterResult("loss")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                filterResult === "loss"
                  ? "bg-red-500 text-white font-black shadow-md shadow-red-500/20 scale-105"
                  : "bg-gray-950 text-red-400/80 hover:text-red-400 border border-gray-800"
              }`}
            >
              <span>❌</span>
              <span>Reds ({stats.lossesCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterResult("pending")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                filterResult === "pending"
                  ? "bg-amber-400 text-gray-950 font-black shadow-md shadow-amber-400/20 scale-105"
                  : "bg-gray-950 text-amber-400/80 hover:text-amber-400 border border-gray-800"
              }`}
            >
              <span>⏳</span>
              <span>Pendentes ({stats.pendingCount})</span>
            </button>
          </div>

          {/* View Mode Toggle (Timeline vs List) */}
          <div className="flex items-center gap-1 bg-gray-950 border border-gray-800 p-1 rounded-2xl self-start md:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "timeline"
                  ? "bg-gray-800 text-white shadow-sm font-black"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Agrupar por Rodadas"
            >
              <span>📅</span>
              <span>Por Rodada</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "list"
                  ? "bg-gray-800 text-white shadow-sm font-black"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Lista contínua"
            >
              <span>📋</span>
              <span>Lista</span>
            </button>
          </div>
        </div>

        {/* Linha 2: Busca Textual e Menus de Filtro */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Campo de Busca (4 cols) */}
          <div className="lg:col-span-4 relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar time, nota, comissário..."
              className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtro por Rodada (2 cols) */}
          <div className="lg:col-span-2">
            <select
              value={filterRound}
              onChange={(e) => setFilterRound(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
            >
              <option value="all">Todas as Rodadas</option>
              {availableRounds.map((r) => (
                <option key={r} value={r}>
                  Semana #{r}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Time (2 cols) */}
          <div className="lg:col-span-2">
            <select
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 truncate"
            >
              <option value="all">Todos os Times</option>
              {uniqueTeams.map((id) => {
                const t = getTeamById(id);
                return (
                  <option key={id} value={id}>
                    {t?.name || id}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Filtro por Poder (2 cols) */}
          <div className="lg:col-span-2">
            <select
              value={filterPower}
              onChange={(e) => setFilterPower(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 truncate"
            >
              <option value="all">Todos os Poderes</option>
              <option value="any">Com Qualquer Poder</option>
              <option value="shield">🛡️ Com Escudo</option>
              <option value="double">⚡ Com Turbo 2X</option>
            </select>
          </div>

          {/* Ordenação (2 cols) */}
          <div className="lg:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 truncate"
            >
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
              <option value="odd_desc">Maior Odd</option>
              <option value="amount_desc">Maior Valor</option>
              <option value="profit_desc">Maior Lucro</option>
            </select>
          </div>
        </div>

        {/* Linha de Feedback de Filtros Ativos */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
          <span>
            Exibindo <strong className="text-white font-black">{filteredBets.length}</strong> de{" "}
            <strong className="text-gray-300 font-bold">{bets.length}</strong> apostas
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-yellow-400 hover:text-yellow-300 font-bold flex items-center gap-1 transition-colors"
            >
              <span>✕</span>
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Lista ou Timeline de Apostas */}
      {filteredBets.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-12 text-center shadow-xl">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-white font-bold text-base mb-1">Nenhuma aposta encontrada</h3>
          <p className="text-gray-400 text-xs mb-4">
            Nenhum palpite corresponde aos filtros e termos de busca selecionados.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xs rounded-xl shadow-md transition-all"
          >
            Limpar Filtros
          </button>
        </div>
      ) : viewMode === "timeline" ? (
        // Modo Linha do Tempo (Agrupado por Rodada)
        <div className="space-y-6">
          {groupedByRound.map((roundGroup) => (
            <div
              key={roundGroup.round}
              className="bg-gray-900/60 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-4"
            >
              {/* Round Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 font-black text-sm flex items-center justify-center shadow-inner">
                    #{roundGroup.round}
                  </span>
                  <div>
                    <h3 className="text-white font-black text-base">
                      Semana #{roundGroup.round}
                    </h3>
                    <p className="text-gray-400 text-xs">
                      {roundGroup.bets.length} palpite{roundGroup.bets.length > 1 ? "s" : ""} •{" "}
                      <span className="text-emerald-400 font-bold">{roundGroup.wins} Greens</span> •{" "}
                      <span className="text-red-400 font-bold">{roundGroup.losses} Reds</span>
                      {roundGroup.pending > 0 && (
                        <span className="text-amber-400 font-bold"> • {roundGroup.pending} Pendentes</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">
                    Saldo da Rodada
                  </span>
                  <span
                    className={`font-black text-sm sm:text-base ${
                      roundGroup.profit >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {roundGroup.profit >= 0 ? "+" : ""}R$ {roundGroup.profit.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Cards Grid in this Round */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roundGroup.bets.map((bet) => (
                  <BetTicketCard
                    key={bet.id}
                    bet={bet}
                    isExpanded={expandedId === bet.id}
                    onToggle={() => setExpandedId(expandedId === bet.id ? null : bet.id)}
                    onUpdateResult={updateBetResult}
                    onReopen={reopenBet}
                    onDelete={deleteBet}
                    onEdit={setEditingBet}
                    canManage={canManageBets}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Modo Lista Corrida (Grid 2 colunas)
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBets.map((bet) => (
            <BetTicketCard
              key={bet.id}
              bet={bet}
              isExpanded={expandedId === bet.id}
              onToggle={() => setExpandedId(expandedId === bet.id ? null : bet.id)}
              onUpdateResult={updateBetResult}
              onReopen={reopenBet}
              onDelete={deleteBet}
              onEdit={setEditingBet}
              canManage={canManageBets}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Modal de Edição (Exclusivo Comissário) */}
      {editingBet && (
        <EditBetModal
          bet={editingBet}
          onClose={() => setEditingBet(null)}
        />
      )}
    </div>
  );
}

function BetTicketCard({
  bet,
  isExpanded,
  onToggle,
  onUpdateResult,
  onReopen,
  onDelete,
  onEdit,
  canManage,
  isAdmin,
}) {
  const teamA = getTeamById(bet.teamAId);
  const teamB = getTeamById(bet.teamBId);
  const bettingOn = getTeamById(bet.bettingOnTeamId);
  const cfg = RESULT_CONFIG[bet.result] ?? RESULT_CONFIG.pending;

  const potDiff = (bet.potAfter ?? 0) - (bet.potBefore ?? 0);
  const potDiffStr =
    potDiff >= 0 ? `+R$ ${potDiff.toFixed(2)}` : `-R$ ${Math.abs(potDiff).toFixed(2)}`;
  const potDiffColor =
    potDiff > 0 ? "text-emerald-400" : potDiff < 0 ? "text-red-400" : "text-gray-400";

  const potentialReturn = (bet.amount * (bet.odd || 1)).toFixed(2);
  const isProtectedByShield = bet.result === "loss" && bet.powerUp === "shield";

  return (
    <div
      className={`bg-gray-900 border rounded-3xl overflow-hidden transition-all shadow-lg flex flex-col justify-between ${
        bet.result === "win"
          ? "border-emerald-500/30 hover:border-emerald-500/50"
          : bet.result === "loss"
          ? "border-red-500/30 hover:border-red-500/50"
          : "border-amber-500/30 hover:border-amber-500/50"
      }`}
    >
      {/* Top Header of the Ticket */}
      <div className="p-4 sm:p-5 pb-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-xl bg-gray-950 text-gray-300 border border-gray-800 text-[11px] font-black">
              Semana #{bet.round}
            </span>

            {/* Power-up badge */}
            {bet.powerUp === "shield" && (
              <span className="px-2.5 py-1 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[11px] font-black flex items-center gap-1 shadow-sm">
                <span>🛡️</span>
                <span>Escudo Anti-Zebra</span>
              </span>
            )}
            {bet.powerUp === "double" && (
              <span className="px-2.5 py-1 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[11px] font-black flex items-center gap-1 shadow-sm">
                <span>⚡</span>
                <span>Turbo 2X</span>
              </span>
            )}
          </div>

          {/* Result Pill */}
          <span
            className={`px-3 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 shadow-sm ${cfg.badgeBg}`}
          >
            <span>{cfg.icon}</span>
            <span>{cfg.shortLabel}</span>
          </span>
        </div>

        {/* Confronto Matchup Display (Time A x Time B) */}
        <div className="bg-gray-950/70 border border-gray-800/80 rounded-2xl p-3 mb-3.5 flex items-center justify-between gap-2">
          {/* Time A */}
          <div className="flex-1 flex items-center gap-2.5 min-w-0">
            <img
              src={getLogoUrl(teamA, 80)}
              alt={teamA?.name}
              className="w-8 h-8 object-contain flex-shrink-0"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <div className="min-w-0">
              <span className="text-white font-bold text-xs truncate block">
                {teamA?.name || bet.teamAId}
              </span>
              <span className="text-[10px] text-gray-500 font-semibold block uppercase">
                {teamA?.abbr || "NFL"}
              </span>
            </div>
          </div>

          <div className="px-2 py-0.5 rounded-lg bg-gray-900 border border-gray-800 text-[10px] font-black text-gray-400 flex-shrink-0">
            VS
          </div>

          {/* Time B */}
          <div className="flex-1 flex items-center justify-end gap-2.5 min-w-0 text-right">
            <div className="min-w-0">
              <span className="text-white font-bold text-xs truncate block">
                {teamB?.name || bet.teamBId}
              </span>
              <span className="text-[10px] text-gray-500 font-semibold block uppercase">
                {teamB?.abbr || "NFL"}
              </span>
            </div>
            <img
              src={getLogoUrl(teamB, 80)}
              alt={teamB?.name}
              className="w-8 h-8 object-contain flex-shrink-0"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
        </div>

        {/* Box do Palpite Vencedor */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-yellow-400/10 via-yellow-400/5 to-transparent border border-yellow-400/30 flex items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={getLogoUrl(bettingOn, 100)}
              alt={bettingOn?.name}
              className="w-9 h-9 object-contain flex-shrink-0 drop-shadow"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black text-yellow-400 uppercase tracking-wider block">
                  🎯 Palpite Selecionado
                </span>
                {getMarketBadge(bet) && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border bg-gray-950/80 ${getMarketBadge(bet).color}`}>
                    {getMarketBadge(bet).icon} {getMarketBadge(bet).label}
                  </span>
                )}
              </div>
              <span className="text-white font-black text-sm truncate block mt-0.5">
                {bettingOn?.name || bet.bettingOnTeamId}
              </span>
              {bet.marketDetails && (
                <span className="text-xs font-semibold text-amber-200/90 block truncate mt-0.5">
                  📌 {bet.marketDetails}
                </span>
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <span className="text-[10px] text-gray-400 font-bold block">Odd</span>
            <span className="text-yellow-400 font-black text-base">@{bet.odd}</span>
          </div>
        </div>

        {/* Informações Financeiras (Grid 4 colunas) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-2.5">
            <span className="text-[10px] text-gray-400 block font-semibold">Valor Apostado</span>
            <span className="text-white font-black text-xs sm:text-sm block mt-0.5 truncate">
              R$ {bet.amount.toFixed(2)}
            </span>
          </div>

          <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-2.5">
            <span className="text-[10px] text-gray-400 block font-semibold">Cotação</span>
            <span className="text-yellow-400 font-black text-xs sm:text-sm block mt-0.5">
              @{bet.odd}
            </span>
          </div>

          <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-2.5">
            <span className="text-[10px] text-gray-400 block font-semibold">Retorno Potencial</span>
            <span className="text-emerald-400 font-black text-xs sm:text-sm block mt-0.5 truncate">
              R$ {potentialReturn}
            </span>
          </div>

          <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-2.5">
            <span className="text-[10px] text-gray-400 block font-semibold">Impacto Pote</span>
            {bet.result === "pending" ? (
              <span className="text-amber-400 font-black text-xs sm:text-sm block mt-0.5">
                Pendente
              </span>
            ) : isProtectedByShield ? (
              <span className="text-cyan-400 font-black text-xs sm:text-sm block mt-0.5 truncate">
                R$ 0,00 🛡️
              </span>
            ) : (
              <span
                className={`font-black text-xs sm:text-sm block mt-0.5 truncate ${potDiffColor}`}
              >
                {potDiffStr}
              </span>
            )}
          </div>
        </div>

        {/* Nota / Observação se existir */}
        {bet.note && (
          <div className="mt-3 p-2.5 rounded-xl bg-gray-950/40 border border-gray-800/60 text-gray-400 text-xs italic flex items-center gap-2">
            <span>💬</span>
            <span className="truncate">"{bet.note}"</span>
          </div>
        )}
      </div>

      {/* Accordion / Rodapé de Auditoria e Ações */}
      <div className="border-t border-gray-800 bg-gray-950/40 p-3 sm:p-4 space-y-3">
        {/* Toggle para ver detalhes de auditoria */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-gray-400 text-[11px] truncate">
            <span>📅</span>
            <span className="truncate">
              {new Date(bet.createdAt).toLocaleDateString("pt-BR")} às{" "}
              {new Date(bet.createdAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {bet.createdBy?.name && ` por ${bet.createdBy.name}`}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="text-[11px] font-bold text-gray-400 hover:text-white flex items-center gap-1 flex-shrink-0 transition-colors"
          >
            <span>{isExpanded ? "Ocultar Detalhes" : "Ver Detalhes"}</span>
            <span>{isExpanded ? "▲" : "▼"}</span>
          </button>
        </div>

        {/* Seção Expandida: Auditoria e Potes Antes/Depois */}
        {isExpanded && (
          <div className="space-y-3 pt-2 border-t border-gray-800 text-xs animate-in fade-in duration-150">
            {/* Variação do Pote */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-900 border border-gray-800 p-2.5 rounded-xl text-center">
                <span className="text-[10px] text-gray-500 font-semibold block">Pote Anterior</span>
                <span className="text-white font-bold text-xs mt-0.5 block">
                  R$ {bet.potBefore.toFixed(2)}
                </span>
              </div>
              <div className="bg-gray-900 border border-gray-800 p-2.5 rounded-xl text-center">
                <span className="text-[10px] text-gray-500 font-semibold block">Pote Consolidado</span>
                <span className={`font-bold text-xs mt-0.5 block ${potDiffColor}`}>
                  R$ {bet.potAfter ? bet.potAfter.toFixed(2) : bet.potBefore.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Auditoria de Resolução */}
            {bet.resolvedBy ? (
              <div className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <span className="text-yellow-400">⚖️</span>
                  <span>Resolvida por:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white flex items-center gap-1">
                    {bet.resolvedBy.photoURL && (
                      <img
                        src={bet.resolvedBy.photoURL}
                        alt=""
                        className="w-3.5 h-3.5 rounded-full object-cover"
                      />
                    )}
                    <span>{bet.resolvedBy.name}</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 text-[10px] font-bold">
                    {bet.resolvedBy.role === "admin"
                      ? "Comissário"
                      : bet.resolvedBy.role === "moderator"
                      ? "Moderador"
                      : bet.resolvedBy.role || "Admin"}
                  </span>
                </div>
              </div>
            ) : bet.result !== "pending" ? (
              <div className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-500 text-[11px] italic text-center">
                Resolução registrada antes do sistema de rastreamento
              </div>
            ) : null}
          </div>
        )}

        {/* Ações: Resolução (Comissários e Moderadores) / Reabertura, Edição e Exclusão (Exclusivo Comissário) */}
        {((bet.result === "pending" && canManage) || isAdmin) && (
          <div className="pt-2 border-t border-gray-800/80 flex items-center gap-2 flex-wrap">
            {bet.result === "pending" ? (
              <>
                <button
                  type="button"
                  onClick={() => onUpdateResult(bet.id, "win")}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-gray-950 border border-emerald-500/40 font-black text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <span>✅</span>
                  <span>Marcar Green</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateResult(bet.id, "loss")}
                  className="flex-1 py-2 px-3 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/40 font-black text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <span>❌</span>
                  <span>Marcar Red</span>
                </button>
              </>
            ) : (
              isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        "Deseja reabrir este palpite? O status voltará para Pendente e o pote será recalculado automaticamente."
                      )
                    ) {
                      onReopen(bet.id);
                    }
                  }}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-yellow-400 border border-yellow-400/30 font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <span>↩️</span>
                  <span>Reabrir Palpite</span>
                </button>
              )
            )}

            {/* Ajuste restrito exclusivamente ao Comissário */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => onEdit(bet)}
                title="Ajustar dados desta aposta (Exclusivo Comissário)"
                className="py-1.5 px-3 rounded-xl bg-yellow-400/15 hover:bg-yellow-400/30 text-yellow-300 border border-yellow-400/40 font-black text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm flex-shrink-0"
              >
                <span>✏️</span>
                <span>Ajustar</span>
              </button>
            )}

            {/* Exclusão restrita exclusivamente ao Comissário */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      "Atenção: Excluir esta aposta removerá o registro permanentemente. Deseja continuar?"
                    )
                  ) {
                    onDelete(bet.id);
                  }
                }}
                title="Excluir aposta do histórico (Exclusivo Comissário)"
                className="p-2 rounded-xl bg-gray-900 hover:bg-red-500/20 text-gray-500 hover:text-red-400 border border-gray-800 hover:border-red-500/30 transition-all flex-shrink-0"
              >
                <span className="text-sm">🗑️</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

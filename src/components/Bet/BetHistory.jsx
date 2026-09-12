import { useState } from "react";
import { useBet } from "../../context/BetContext";
import { useAuth } from "../../context/AuthContext";
import { getTeamById, getLogoUrl } from "../../data/nflTeams";

const RESULT_CONFIG = {
  win:     { label: "Bateu",    icon: "✅", color: "text-green-400",  bg: "bg-green-500/10  border-green-500/30" },
  loss:    { label: "Perdeu",   icon: "❌", color: "text-red-400",    bg: "bg-red-500/10    border-red-500/30" },
  pending: { label: "Pendente", icon: "⏳", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
};

export default function BetHistory() {
  const { bets, updateBetResult, deleteBet } = useBet();
  const { canManageBets } = useAuth();
  const [filterResult, setFilterResult] = useState("all");
  const [filterTeam, setFilterTeam] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  // All teams that appear in bets
  const uniqueTeams = [...new Set(bets.map((b) => b.bettingOnTeamId))];

  const filtered = bets.filter((b) => {
    if (filterResult !== "all" && b.result !== filterResult) return false;
    if (filterTeam !== "all" && b.bettingOnTeamId !== filterTeam) return false;
    return true;
  });

  if (bets.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-white font-black text-2xl mb-6">Histórico</h2>
        <div className="text-center py-16 text-gray-600">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-lg font-semibold">Nenhuma aposta ainda</p>
          <p className="text-sm mt-1">Registre sua primeira aposta!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-black text-2xl">Histórico</h2>
        <span className="text-gray-500 text-sm">{filtered.length} de {bets.length}</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filterResult}
          onChange={(e) => setFilterResult(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-400"
        >
          <option value="all">Todos resultados</option>
          <option value="win">✅ Bateu</option>
          <option value="loss">❌ Perdeu</option>
          <option value="pending">⏳ Pendente</option>
        </select>
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-400"
        >
          <option value="all">Todos times</option>
          {uniqueTeams.map((id) => (
            <option key={id} value={id}>{getTeamById(id)?.name ?? id}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((bet) => (
          <BetRow
            key={bet.id}
            bet={bet}
            expanded={expandedId === bet.id}
            onToggle={() => setExpandedId(expandedId === bet.id ? null : bet.id)}
            onUpdateResult={updateBetResult}
            onDelete={deleteBet}
            isAdmin={canManageBets}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-gray-600 text-sm">Nenhuma aposta para esse filtro.</div>
      )}
    </div>
  );
}

function BetRow({ bet, expanded, onToggle, onUpdateResult, onDelete, isAdmin }) {
  const teamA = getTeamById(bet.teamAId);
  const teamB = getTeamById(bet.teamBId);
  const bettingOn = getTeamById(bet.bettingOnTeamId);
  const cfg = RESULT_CONFIG[bet.result] ?? RESULT_CONFIG.pending;

  const potDiff = bet.potAfter - bet.potBefore;
  const potDiffStr = potDiff >= 0 ? `+R$ ${potDiff.toFixed(2)}` : `-R$ ${Math.abs(potDiff).toFixed(2)}`;
  const potDiffColor = potDiff > 0 ? "text-green-400" : potDiff < 0 ? "text-red-400" : "text-gray-400";

  return (
    <div className={`rounded-xl border ${cfg.bg} overflow-hidden`}>
      {/* Main row */}
      <button
        onClick={onToggle}
        className="w-full p-3 text-left flex items-center gap-3"
      >
        {/* Betting-on logo */}
        <div className="flex-shrink-0 relative">
          <img
            src={getLogoUrl(bettingOn, 100)}
            alt={bettingOn?.name}
            className="w-10 h-10 object-contain"
            onError={(e) => { e.target.replaceWith(Object.assign(document.createElement("span"), { textContent: cfg.icon, className: "text-xl" })); }}
          />
          <span className="absolute -bottom-1 -right-1 text-xs leading-none">{cfg.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold text-sm truncate">{bettingOn?.name ?? bet.bettingOnTeamId}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {/* Mini VS logos */}
            <div className="flex items-center gap-1">
              <img src={getLogoUrl(teamA, 100)} alt={teamA?.name} className="w-4 h-4 object-contain" onError={(e) => { e.target.style.display="none"; }} />
              <span className="text-gray-600 text-xs font-bold">vs</span>
              <img src={getLogoUrl(teamB, 100)} alt={teamB?.name} className="w-4 h-4 object-contain" onError={(e) => { e.target.style.display="none"; }} />
            </div>
            <span className="text-gray-400 text-xs">R$ {bet.amount.toFixed(2)} × {bet.odd}</span>
            <span className="text-xs font-bold text-gray-500">Rd {bet.round}</span>
            {bet.powerUp === "shield" && (
              <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                <span>🛡️</span> <span>Escudo</span>
              </span>
            )}
            {bet.powerUp === "double" && (
              <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-black px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                <span>⚡</span> <span>Turbo 2X</span>
              </span>
            )}
            {bet.note && <span className="text-gray-500 text-xs italic">"{bet.note}"</span>}
            {bet.resolvedBy && (
              <span className="bg-gray-800/90 text-gray-300 border border-gray-700/80 text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <span className="text-yellow-400 text-xs">⚖️</span>
                <span>{bet.resolvedBy.name}</span>
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {bet.result !== "pending" && (
            <span className={`font-bold text-sm ${potDiffColor}`}>{potDiffStr}</span>
          )}
          <span className="text-gray-600 text-xs block">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-white/5">
          <div className="grid grid-cols-3 gap-2 mt-3 mb-3">
            <Detail label="Pote antes" value={`R$ ${bet.potBefore.toFixed(2)}`} />
            <Detail label="Pote depois" value={`R$ ${bet.potAfter.toFixed(2)}`} color={potDiffColor} />
            <Detail label="Retorno total" value={`R$ ${(bet.amount * bet.odd).toFixed(2)}`} color="text-green-400" />
          </div>

          {/* Timeline & Resolution info */}
          <div className="bg-black/30 border border-white/5 rounded-xl p-3 space-y-2 mb-3 text-xs">
            <div className="flex items-center justify-between text-gray-400">
              <span className="flex items-center gap-1.5 text-gray-500">
                <span>📅</span> Registrada:
              </span>
              <span className="font-medium text-gray-300">
                {new Date(bet.createdAt).toLocaleString("pt-BR")}
                {bet.createdBy?.name && ` por ${bet.createdBy.name}`}
              </span>
            </div>

            {bet.resolvedBy ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-2 border-t border-white/5 text-gray-300">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="text-yellow-400">⚖️</span> Resolvida por:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    {bet.resolvedBy.photoURL && (
                      <img
                        src={bet.resolvedBy.photoURL}
                        alt=""
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    )}
                    <span>{bet.resolvedBy.name}</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 font-semibold">
                    {bet.resolvedBy.role === "admin"
                      ? "Comissário"
                      : bet.resolvedBy.role === "moderator"
                      ? "Moderador"
                      : bet.resolvedBy.role || "Admin"}
                  </span>
                  {bet.resolvedBy.at && (
                    <span className="text-gray-500 text-[10px]">
                      em {new Date(bet.resolvedBy.at).toLocaleDateString("pt-BR")} às {new Date(bet.resolvedBy.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              </div>
            ) : bet.result !== "pending" ? (
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-gray-500 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span>⚖️</span> Resolução:
                </span>
                <span className="italic">Registrada antes do rastreamento</span>
              </div>
            ) : null}
          </div>

          {/* Actions */}
          {isAdmin ? (
            <div className="flex gap-2 flex-wrap">
              {bet.result === "pending" && (
                <>
                  <button
                    onClick={() => onUpdateResult(bet.id, "win")}
                    className="flex-1 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-semibold hover:bg-green-500/30"
                  >
                    ✅ Bateu
                  </button>
                  <button
                    onClick={() => onUpdateResult(bet.id, "loss")}
                    className="flex-1 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/30"
                  >
                    ❌ Perdeu
                  </button>
                </>
              )}
              <button
                onClick={() => { if (confirm("Excluir aposta?")) onDelete(bet.id); }}
                className="py-2 px-3 rounded-lg bg-gray-800 border border-gray-700 text-gray-500 text-sm hover:text-red-400 hover:border-red-500/30"
              >
                🗑️
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-gray-800/80 text-right">
              <span className="text-[10px] text-gray-500 italic">
                🔒 Ações restritas ao Comissário
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, color = "text-white" }) {
  return (
    <div className="bg-black/20 rounded-lg p-2 text-center">
      <p className="text-gray-500 text-xs mb-0.5">{label}</p>
      <p className={`font-bold text-sm ${color}`}>{value}</p>
    </div>
  );
}

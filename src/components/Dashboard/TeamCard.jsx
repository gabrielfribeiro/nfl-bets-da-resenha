import { useState } from "react";
import { useBet } from "../../context/BetContext";
import { getTeamById, getLogoUrl } from "../../data/nflTeams";
import { getTier } from "../../utils/tiers";
import { calculateTeamStreak } from "../../utils/streaks";

function AddFundsModal({ teamId, onClose }) {
  const { addPotFunds } = useBet();
  const [amount, setAmount] = useState("");
  const team = getTeamById(teamId);

  const handleAdd = () => {
    const val = parseFloat(amount);
    if (!isNaN(val) && val > 0) {
      addPotFunds(teamId, val);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-white font-bold text-lg mb-1">Adicionar ao pote</h3>
        <p className="text-gray-400 text-sm mb-4">{team?.name}</p>
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-10 pr-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-yellow-400"
            autoFocus
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 font-semibold">Cancelar</button>
          <button
            onClick={handleAdd}
            disabled={!amount || parseFloat(amount) <= 0}
            className="flex-1 py-3 rounded-xl bg-yellow-400 text-gray-950 font-bold hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeamCard({ teamId }) {
  const { teams, bets, getMinBet } = useBet();
  const teamState = teams[teamId];
  const team = getTeamById(teamId);
  const [showAddFunds, setShowAddFunds] = useState(false);

  if (!teamState || !team) return null;

  const teamBets = bets.filter((b) => b.bettingOnTeamId === teamId);
  const pendingBets = teamBets.filter((b) => b.result === "pending").length;
  const minBet = getMinBet(teamId);
  const isPotZero = teamState.pot <= 0;
  const canBetMore = teamState.pot > 0;
  const hasAddedFunds = (teamState.addedFunds ?? 0) > 0;

  // Trend: compare last two history entries
  const history = teamState.potHistory;
  const trend =
    history.length >= 2
      ? history[history.length - 1] > history[history.length - 2]
        ? "up"
        : history[history.length - 1] < history[history.length - 2]
        ? "down"
        : "flat"
      : "flat";

  const trendIcon = trend === "up" ? "📈" : trend === "down" ? "📉" : "➡️";
  const trendColor = trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-gray-400";

  const tier = getTier(teamState.pot);
  const streak = calculateTeamStreak(bets, teamId);

  const isOnFire = streak.type === "win" && streak.count >= 2;
  const isIceCold = streak.type === "loss" && streak.count >= 2;

  return (
    <>
      <div
        className={`relative rounded-2xl border p-4 transition-all duration-300 ${
          isOnFire
            ? "border-amber-500/80 bg-gradient-to-b from-amber-950/30 to-gray-900/90 shadow-lg shadow-orange-500/20 ring-1 ring-amber-400/40"
            : isIceCold
            ? "border-cyan-500/60 bg-gradient-to-b from-cyan-950/25 to-gray-900/90 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/30"
            : isPotZero
            ? "border-red-500/50 bg-red-950/20"
            : canBetMore
            ? "border-gray-700 bg-gray-900/60 hover:border-gray-600"
            : "border-orange-500/40 bg-orange-950/10"
        }`}
      >
        {/* Color bar */}
        <div
          className="absolute top-0 left-3 right-3 h-1 rounded-b-full pointer-events-none"
          style={{ backgroundColor: team.color }}
        />

        {/* Streak floating pill if on fire or ice cold */}
        {isOnFire && (
          <div className="absolute -top-3 right-4 bg-gradient-to-r from-amber-500 to-red-500 text-gray-950 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 animate-pulse">
            <span>🔥</span>
            <span>ON FIRE ({streak.count}W)</span>
          </div>
        )}
        {isIceCold && (
          <div className="absolute -top-3 right-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-gray-950 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
            <span>❄️</span>
            <span>ICE COLD ({streak.count}L)</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mt-1 mb-3">
          <img
            src={getLogoUrl(team, 200)}
            alt={team.name}
            className={`w-12 h-12 object-contain flex-shrink-0 drop-shadow-lg transition-transform duration-300 ${
              isOnFire ? "scale-105" : ""
            }`}
            onError={(e) => { e.target.style.display = "none"; }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                {team.conference} · {team.division}
              </span>
              <span
                title={`Patente da Resenha: ${tier.badge} ${tier.name} (R$ ${tier.min.toFixed(2)}+)\n"${tier.desc}"`}
                className={`text-xs px-1.5 py-0.5 rounded font-bold border ${tier.border} ${tier.bg} ${tier.color} flex items-center gap-1 cursor-help`}
              >
                <span>{tier.badge}</span>
                <span>{tier.name}</span>
              </span>
            </div>
            <h3 className="text-white font-bold text-sm leading-tight mt-0.5 truncate">{team.name}</h3>
          </div>
          <span className="text-xl flex-shrink-0" title={`Tendência: ${trend}`}>{trendIcon}</span>
        </div>

        {/* Pot & Added Funds Cards */}
        {hasAddedFunds ? (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {/* Pote atual */}
            <div className={`p-2.5 rounded-xl border ${
              isPotZero ? "bg-red-950/40 border-red-500/40" : "bg-gray-800/40 border-gray-700/60"
            }`}>
              <p className="text-[11px] text-gray-400 font-semibold mb-0.5">Pote atual</p>
              <p className={`text-xl font-black ${isPotZero ? "text-red-400" : trendColor}`}>
                R$ {teamState.pot.toFixed(2)}
              </p>
              {isPotZero && (
                <p className="text-red-400 text-[10px] mt-0.5 font-bold">⚠️ Zerado</p>
              )}
            </div>

            {/* Salva-Vidas / Injetado */}
            <div className="p-2.5 rounded-xl border bg-rose-950/30 border-rose-500/40 shadow-sm">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-xs">💉</span>
                <p className="text-[11px] text-rose-300 font-semibold truncate">Salva-Vidas</p>
              </div>
              <p className="text-xl font-black text-rose-400">
                R$ {(teamState.addedFunds ?? 0).toFixed(2)}
              </p>
              <p className="text-[10px] text-rose-400/70 mt-0.5 font-medium">Injetado</p>
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-0.5">Pote atual</p>
            <p className={`text-2xl font-black ${isPotZero ? "text-red-400" : trendColor}`}>
              R$ {teamState.pot.toFixed(2)}
            </p>
            {isPotZero && (
              <p className="text-red-400 text-xs mt-1 font-medium">⚠️ Pote zerado</p>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-gray-800/60 rounded-lg p-2 text-center">
            <p className="text-green-400 font-bold text-sm">{teamState.totalWins}</p>
            <p className="text-gray-500 text-xs">vitórias</p>
          </div>
          <div className="flex-1 bg-gray-800/60 rounded-lg p-2 text-center">
            <p className="text-red-400 font-bold text-sm">{teamState.totalLosses}</p>
            <p className="text-gray-500 text-xs">derrotas</p>
          </div>
          <div className="flex-1 bg-gray-800/60 rounded-lg p-2 text-center">
            <p className={`font-bold text-sm ${
              streak.type === "win" ? "text-amber-400" : streak.type === "loss" ? "text-cyan-400" : "text-gray-400"
            }`}>
              {streak.type === "win" ? `+${streak.count}W` : streak.type === "loss" ? `-${streak.count}L` : "-"}
            </p>
            <p className="text-gray-500 text-xs">sequência</p>
          </div>
        </div>

        {/* Mini sparkline */}
        {history.length > 1 && (
          <div className="mb-3">
            <MiniSparkline data={history} color={team.color} />
          </div>
        )}

        {/* Add funds button */}
        {isPotZero && (
          <button
            onClick={() => setShowAddFunds(true)}
            className="w-full py-2 rounded-xl bg-yellow-400 text-gray-950 font-bold text-sm hover:bg-yellow-300 transition-colors"
          >
            + Adicionar ao pote
          </button>
        )}
      </div>

      {showAddFunds && (
        <AddFundsModal teamId={teamId} onClose={() => setShowAddFunds(false)} />
      )}
    </>
  );
}

function MiniSparkline({ data, color }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 32;
  const w = 100;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

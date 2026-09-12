import { useState } from "react";
import { useBet } from "../../context/BetContext";
import TeamCard from "./TeamCard";
import Podium from "./Podium";
import TrophyCase from "./TrophyCase";
import ShareModal from "./ShareModal";
import LeaderboardTable from "./LeaderboardTable";
import PotEvolutionChart from "./PotEvolutionChart";
import { calculateTeamStreak } from "../../utils/streaks";
import { getTeamById } from "../../data/nflTeams";

export default function Dashboard() {
  const { selectedTeamIds, teams, bets, currentRound, globalMaxWon, getMinBet } = useBet();
  const [showShare, setShowShare] = useState(false);
  const [activeView, setActiveView] = useState("TABLE"); // 'TABLE' | 'CHART' | 'CARDS'

  const totalPot = selectedTeamIds.reduce((sum, id) => sum + (teams[id]?.pot ?? 0), 0);
  const totalAddedFunds = selectedTeamIds.reduce((sum, id) => sum + (teams[id]?.addedFunds ?? 0), 0);
  const pendingBets = bets.filter((b) => b.result === "pending").length;
  const totalWins = bets.filter((b) => b.result === "win").length;
  const totalLosses = bets.filter((b) => b.result === "loss").length;
  const minBet = getMinBet();

  // Find streak leaders
  const streaks = selectedTeamIds.map((id) => ({
    id,
    streak: calculateTeamStreak(bets, id),
    team: getTeamById(id),
  }));

  const onFireTeams = streaks.filter((s) => s.streak.type === "win" && s.streak.count >= 2);
  const iceColdTeams = streaks.filter((s) => s.streak.type === "loss" && s.streak.count >= 2);

  // Top 3 by pot (for podium)
  const topTeamsByPot = [...selectedTeamIds]
    .sort((a, b) => (teams[b]?.pot ?? 0) - (teams[a]?.pot ?? 0))
    .slice(0, 3);

  // Sort: zeroed pots last, then by pot desc
  const sortedTeams = [...selectedTeamIds].sort((a, b) => {
    const pa = teams[a]?.pot ?? 0;
    const pb = teams[b]?.pot ?? 0;
    if (pa === 0 && pb !== 0) return 1;
    if (pb === 0 && pa !== 0) return -1;
    return pb - pa;
  });

  // Zeroed teams (RedZone danger)
  const zeroedTeams = selectedTeamIds.filter((id) => (teams[id]?.pot ?? 0) <= 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Top action header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-white font-black text-2xl tracking-tight">Painel Principal</h2>
          <p className="text-gray-500 text-xs">Visão geral do bolão e andamento da temporada</p>
        </div>
        <button
          onClick={() => setShowShare(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-gray-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
        >
          <span>📸</span>
          <span>Card de Resenha</span>
        </button>
      </div>
      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <StatCard label="Rodada" value={`#${currentRound}`} icon="📅" />
        <StatCard
          label="Pote total"
          value={`R$ ${totalPot.toFixed(2)}`}
          icon="💰"
          highlight
        />
        <StatCard
          label="Salva-Vidas (Injetado)"
          value={`R$ ${totalAddedFunds.toFixed(2)}`}
          icon="💉"
          danger={totalAddedFunds > 0}
        />
        <StatCard
          label="Trava de Odd"
          value={`Até ${useBet().maxOdd}`}
          icon="🔒"
        />
        <StatCard
          label="Apostas"
          value={`${totalWins}W · ${totalLosses}L${pendingBets > 0 ? ` · ${pendingBets}P` : ""}`}
          icon="🎯"
        />
      </div>

      {/* REDZONE DANGER ALERT (if any team is zeroed) */}
      {zeroedTeams.length > 0 && (
        <div className="mb-4 p-3.5 bg-red-950/40 border-2 border-red-600/70 rounded-2xl flex items-center justify-between gap-3 shadow-lg shadow-red-900/20 animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="text-white font-black text-sm uppercase tracking-wider flex items-center gap-1.5">
                <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded">REDZONE ALERT</span>
                <span>{zeroedTeams.length} {zeroedTeams.length === 1 ? "time zerado" : "times zerados"}!</span>
              </p>
              <p className="text-red-300/80 text-xs mt-0.5">
                {zeroedTeams.map((id) => getTeamById(id)?.name).join(", ")} precisa(m) de recarga no pote para voltar ao jogo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Streaks Banner (if any team is on fire or ice cold) */}
      {(onFireTeams.length > 0 || iceColdTeams.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-6 p-3 bg-gray-900/70 border border-gray-800 rounded-xl items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mr-1">Destaques:</span>
          {onFireTeams.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-lg text-xs font-bold text-amber-300"
            >
              <span>🔥</span>
              <span>{s.team?.name} ({s.streak.count}W seguidas)</span>
            </span>
          ))}
          {iceColdTeams.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 rounded-lg text-xs font-bold text-cyan-300"
            >
              <span>❄️</span>
              <span>{s.team?.name} ({s.streak.count}L seguidas)</span>
            </span>
          ))}
        </div>
      )}

      {/* Podium: Top 3 Teams */}
      <Podium topTeams={topTeamsByPot} teams={teams} />

      {/* Trophy Case (Records) */}
      <TrophyCase bets={bets} teams={teams} selectedTeamIds={selectedTeamIds} />

      {/* View Switcher Tabs: Table, Chart, Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 mt-6 pt-6 border-t border-gray-800">
        <div>
          <h3 className="text-white font-black text-xl tracking-tight flex items-center gap-2">
            <span>🏆</span>
            <span>Classificação & Desempenho da Liga</span>
          </h3>
          <p className="text-gray-400 text-xs mt-0.5">
            Compare o ranking dos 16 participantes, curvas de crescimento e potes
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-gray-900/90 border border-gray-800 p-1.5 rounded-2xl shadow-inner self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveView("TABLE")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === "TABLE"
                ? "bg-yellow-400 text-gray-950 font-black shadow-md scale-105"
                : "text-gray-400 hover:text-white hover:bg-gray-800/60"
            }`}
          >
            <span>🏆</span>
            <span>Tabela</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView("CHART")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === "CHART"
                ? "bg-yellow-400 text-gray-950 font-black shadow-md scale-105"
                : "text-gray-400 hover:text-white hover:bg-gray-800/60"
            }`}
          >
            <span>📈</span>
            <span>Evolução</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView("CARDS")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === "CARDS"
                ? "bg-yellow-400 text-gray-950 font-black shadow-md scale-105"
                : "text-gray-400 hover:text-white hover:bg-gray-800/60"
            }`}
          >
            <span>📋</span>
            <span>Cards</span>
          </button>
        </div>
      </div>

      {/* Render selected view */}
      {activeView === "TABLE" && (
        <LeaderboardTable
          selectedTeamIds={selectedTeamIds}
          teams={teams}
          bets={bets}
          currentRound={currentRound}
        />
      )}

      {activeView === "CHART" && (
        <PotEvolutionChart
          selectedTeamIds={selectedTeamIds}
          teams={teams}
          bets={bets}
          currentRound={currentRound}
        />
      )}

      {activeView === "CARDS" && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest">
              Todos os Times ({selectedTeamIds.length})
            </h4>
            <span className="text-gray-500 text-[11px]">Ordenados por maior pote</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sortedTeams.map((id) => (
              <TeamCard key={id} teamId={id} />
            ))}
          </div>
        </div>
      )}

      {showShare && <ShareModal onClose={() => setShowShare(false)} />}
    </div>
  );
}

function StatCard({ label, value, icon, highlight, danger }) {
  return (
    <div
      className={`rounded-xl p-4 ${
        highlight
          ? "bg-yellow-400/10 border border-yellow-400/30"
          : danger
          ? "bg-rose-950/25 border border-rose-500/40"
          : "bg-gray-900 border border-gray-800"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{icon}</span>
        <span className="text-gray-500 text-xs uppercase tracking-wide truncate">{label}</span>
      </div>
      <p className={`font-black text-lg ${highlight ? "text-yellow-400" : danger ? "text-rose-400" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { useBet } from "../../context/BetContext";
import { useAuth } from "../../context/AuthContext";
import { getTeamById, getLogoUrl } from "../../data/nflTeams";
import { ROLES_GUIDE } from "../../data/rolesGuide";

const PRESET_ODDS = ["1.30", "1.40", "1.50", "1.75", "2.00"];
const POWER_ICONS = ["⚡", "🛡️", "🔥", "💎", "🎲", "👑", "🚀", "🍀", "🎯", "💣"];

export default function Settings({ onOpenUserManager }) {
  const {
    teams,
    exportJSON,
    importJSON,
    resetSetup,
    selectedTeamIds,
    bets,
    nextRound,
    setCurrentRound,
    syncWithNflWeek,
    isSyncingNflWeek,
    currentRound,
    maxOdd,
    setMaxOdd,
    INITIAL_POT,
    powerUpsList,
    addPowerUp,
    removePowerUp,
    updatePowerUp,
    setPowerUpQuantity,
    isCloudEnabled,
    cloudSyncStatus,
    cloudError,
    leagueId,
  } = useBet();

  const { isAdmin, isAuthenticated, setShowLoginModal } = useAuth();

  const [oddInput, setOddInput] = useState(maxOdd ? maxOdd.toString() : "1.5");
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isAddingPower, setIsAddingPower] = useState(false);
  const [selectedRoleTab, setSelectedRoleTab] = useState("all");
  const fileInputRef = useRef(null);

  // Form for new power
  const [newPowerName, setNewPowerName] = useState("");
  const [newPowerIcon, setNewPowerIcon] = useState("⚡");
  const [newPowerType, setNewPowerType] = useState("multiplier"); // 'multiplier' | 'shield'
  const [newPowerMultiplier, setNewPowerMultiplier] = useState("2");
  const [newPowerQuantity, setNewPowerQuantity] = useState("2");
  const [newPowerDesc, setNewPowerDesc] = useState("");

  const totalPot = selectedTeamIds.reduce((sum, id) => sum + (teams[id]?.pot ?? 0), 0);
  const totalAddedFunds = selectedTeamIds.reduce((sum, id) => sum + (teams[id]?.addedFunds ?? 0), 0);
  const realPot = totalPot - totalAddedFunds;

  // 1. Performance & Yield metrics
  const finishedBets = bets.filter((b) => b.result === "win" || b.result === "loss");
  const winsCount = bets.filter((b) => b.result === "win").length;
  const lossesCount = bets.filter((b) => b.result === "loss").length;
  const winRate = finishedBets.length > 0 ? Math.round((winsCount / finishedBets.length) * 100) : 0;

  const totalInvested = selectedTeamIds.length * INITIAL_POT + totalAddedFunds;
  const roiValue =
    totalInvested > 0 ? (((totalPot - totalInvested) / totalInvested) * 100).toFixed(1) : "0.0";
  const avgPot = selectedTeamIds.length > 0 ? (totalPot / selectedTeamIds.length).toFixed(2) : "0.00";

  // 2. Records & Highlights
  const sortedTeamsByPot = [...selectedTeamIds]
    .map((id) => ({ id, team: getTeamById(id), pot: teams[id]?.pot ?? 0 }))
    .sort((a, b) => b.pot - a.pot);

  const mvpTeam = sortedTeamsByPot.length > 0 ? sortedTeamsByPot[0] : null;
  const lanternTeam = sortedTeamsByPot.length > 1 ? sortedTeamsByPot[sortedTeamsByPot.length - 1] : null;

  const winningBets = bets
    .filter((b) => b.result === "win")
    .map((b) => {
      const mult = b.powerUp === "double" ? 2 : 1;
      const profit = Number(b.amount || 0) * (Number(b.odd || 1) - 1) * mult;
      const team = getTeamById(b.bettingOnTeamId);
      return { ...b, profit, team };
    })
    .sort((a, b) => b.profit - a.profit);

  const biggestWin = winningBets.length > 0 ? winningBets[0] : null;

  useEffect(() => {
    setOddInput(maxOdd ? maxOdd.toString() : "1.5");
  }, [maxOdd]);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const commitOdd = (val) => {
    const parsed = parseFloat(val.replace(",", "."));
    if (!isNaN(parsed) && parsed >= 1.01) {
      setMaxOdd(parsed);
      setOddInput(parsed.toString());
      showFeedback("success", `Odd máxima ajustada para ${parsed.toFixed(2)}.`);
    } else {
      setOddInput(maxOdd ? maxOdd.toString() : "1.5");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result);
        const confirmMsg =
          "⚠️ ATENÇÃO: A importação irá substituir os dados atuais pelos dados deste backup.\n\nDeseja prosseguir?";
        if (window.confirm(confirmMsg)) {
          const res = importJSON(json);
          if (res.success) {
            showFeedback(
              "success",
              `Backup restaurado com sucesso! (${res.countTeams} times, ${res.countBets} apostas, Rodada #${res.round})`
            );
          } else {
            showFeedback("error", res.error || "Falha ao importar o arquivo.");
          }
        }
      } catch (err) {
        showFeedback("error", "Arquivo JSON inválido ou corrompido.");
      }
      // Reset input value so user can re-upload same file if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm("⚠️ Isso vai apagar TODOS os dados do bolão. Tem certeza?")) {
      if (confirm("Deseja fazer o download do backup antes de apagar tudo?")) {
        exportJSON();
      }
      resetSetup();
      showFeedback("success", "Bolão resetado para as configurações iniciais.");
    }
  };

  const handleCreatePower = (e) => {
    e.preventDefault();
    if (!newPowerName.trim()) {
      alert("Informe o nome do poder.");
      return;
    }

    addPowerUp({
      name: newPowerName.trim(),
      icon: newPowerIcon,
      type: newPowerType,
      multiplier: newPowerType === "multiplier" ? parseFloat(newPowerMultiplier) || 2 : 1,
      quantity: parseInt(newPowerQuantity) || 1,
      description:
        newPowerDesc.trim() ||
        (newPowerType === "shield"
          ? "Se perder, o pote do time não sofre desconto!"
          : `Multiplica o lucro por ${newPowerMultiplier}x se a aposta bater!`),
    });

    // Reset form
    setNewPowerName("");
    setNewPowerIcon("⚡");
    setNewPowerType("multiplier");
    setNewPowerMultiplier("2");
    setNewPowerQuantity("2");
    setNewPowerDesc("");
    setIsAddingPower(false);
    showFeedback("success", "Novo poder criado com sucesso!");
  };

  const displayedRoles =
    selectedRoleTab === "all"
      ? ROLES_GUIDE
      : ROLES_GUIDE.filter((r) => r.id === selectedRoleTab);

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 text-3xl flex items-center justify-center mx-auto mb-4 text-red-400">
          🔒
        </div>
        <h2 className="text-white font-black text-2xl mb-2">Acesso Restrito ao Comissário</h2>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          As configurações da liga, limites de odd, cartas de poder e ações de reset são restritas exclusivamente a usuários com papel de <strong>👑 Comissário (Admin)</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-800">
        <div>
          <h2 className="text-white font-black text-2xl sm:text-3xl tracking-tight flex items-center gap-2.5">
            <span>⚙️</span>
            <span>Configurações do Bolão</span>
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Personalize regras, limites de odd, poderes especiais e gerencie os backups do sistema.
          </p>
        </div>

        {/* Quick info badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 rounded-xl text-xs font-black">
            Rodada #{currentRound}
          </span>
          <span className="px-3 py-1 bg-gray-800 text-gray-300 border border-gray-700 rounded-xl text-xs font-bold">
            {bets.length} apostas
          </span>
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold">
            {selectedTeamIds.length} times ativos
          </span>
        </div>
      </div>

      {/* Global Toast / Feedback */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-2xl border flex items-center gap-3 transition-all ${
            feedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-red-950/40 border-red-500/40 text-red-300"
          }`}
        >
          <span className="text-xl">{feedback.type === "success" ? "✅" : "⚠️"}</span>
          <span className="text-sm font-semibold">{feedback.message}</span>
        </div>
      )}

      {/* Card Principal: Resumo da Temporada (Full Width) */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📊</span>
            <div>
              <h3 className="text-white font-black text-base tracking-tight">
                Resumo da Temporada
              </h3>
              <p className="text-gray-500 text-xs mt-0.5">
                Visão consolidada de patrimônio, liquidez, aproveitamento e recordes
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 rounded-xl text-xs font-black">
            Status: Em Andamento
          </span>
        </div>

        {/* 1. Métricas Principais em 6 Colunas Widescreen */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-gray-950/60 border border-gray-800 rounded-2xl p-4">
            <span className="text-xs text-gray-400 block font-semibold">Times</span>
            <span className="text-white font-black text-xl block mt-1">
              {selectedTeamIds.length} <span className="text-gray-500 text-xs font-normal">/ 16</span>
            </span>
          </div>

          <div className="bg-gray-950/60 border border-gray-800 rounded-2xl p-4">
            <span className="text-xs text-gray-400 block font-semibold">Apostas</span>
            <span className="text-white font-black text-xl block mt-1">{bets.length}</span>
          </div>

          <div className="bg-gray-950/60 border border-gray-800 rounded-2xl p-4">
            <span className="text-xs text-gray-400 block font-semibold">Rodada Atual</span>
            <span className="text-yellow-400 font-black text-xl block mt-1">#{currentRound}</span>
          </div>

          <div className="bg-gray-950/60 border border-emerald-500/25 rounded-2xl p-4">
            <span className="text-xs text-emerald-400/90 block font-semibold">Pote Total</span>
            <span className="text-emerald-400 font-black text-xl block mt-1 truncate">
              R$ {totalPot.toFixed(2)}
            </span>
          </div>

          <div className="bg-gray-950/60 border border-blue-500/25 rounded-2xl p-4">
            <span className="text-xs text-blue-400/90 block font-semibold">Injetado Total</span>
            <span className="text-blue-400 font-black text-xl block mt-1 truncate">
              R$ {totalAddedFunds.toFixed(2)}
            </span>
          </div>

          <div className="bg-gray-950/60 border border-amber-500/30 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-300 block font-semibold">Pote Real</span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                (Total - Injet.)
              </span>
            </div>
            <span
              className={`font-black text-xl block mt-1 truncate ${
                realPot >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {realPot >= 0 ? "+" : ""}R$ {realPot.toFixed(2)}
            </span>
          </div>
        </div>

        {/* 2. Rendimento e Performance (3 Colunas Ampliadas) */}
        <div className="mt-5 pt-5 border-t border-gray-800/80">
          <span className="text-xs font-black uppercase tracking-wider text-gray-400 block mb-3">
            📈 Rendimento & Eficiência
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-950/60 border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 font-semibold block">Taxa de Acerto</span>
                <span className="text-white font-black text-xl mt-1 block">{winRate}%</span>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                {winsCount}V - {lossesCount}D
              </span>
            </div>

            <div className="bg-gray-950/60 border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 font-semibold block">ROI da Temporada</span>
                <span
                  className={`font-black text-xl mt-1 block ${
                    Number(roiValue) >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {Number(roiValue) >= 0 ? "+" : ""}{roiValue}%
                </span>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-xl bg-gray-800/90 text-gray-400 border border-gray-700/60 whitespace-nowrap">
                Lucro s/ Aportes
              </span>
            </div>

            <div className="bg-gray-950/60 border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 font-semibold block">Média por Time</span>
                <span className="text-yellow-400 font-black text-xl mt-1 block">
                  R$ {avgPot}
                </span>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 whitespace-nowrap">
                16 Times na Liga
              </span>
            </div>
          </div>
        </div>

        {/* 3. Destaques e Recordes da Liga (3 Colunas Ampliadas) */}
        <div className="mt-5 pt-5 border-t border-gray-800/80">
          <span className="text-xs font-black uppercase tracking-wider text-gray-400 block mb-3">
            👑 Recordes & Destaques da Liga
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* MVP Leader */}
            <div className="bg-gray-950/60 border border-yellow-500/30 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                  <span className="text-sm">👑</span>
                  <span>Líder da Temporada (MVP)</span>
                </span>
                <span className="text-sm font-black text-white">
                  R$ {mvpTeam ? mvpTeam.pot.toFixed(2) : "0.00"}
                </span>
              </div>
              <div className="flex items-center gap-3 min-w-0">
                {mvpTeam?.team && (
                  <img
                    src={getLogoUrl(mvpTeam.team)}
                    alt=""
                    className="w-7 h-7 object-contain flex-shrink-0"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                )}
                <span className="text-white font-bold text-sm truncate">
                  {mvpTeam?.team?.name || "N/A"}
                </span>
              </div>
            </div>

            {/* Biggest Win */}
            <div className="bg-gray-950/60 border border-emerald-500/30 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="text-sm">🚀</span>
                  <span>Maior Forrada</span>
                </span>
                <span className="text-sm font-black text-emerald-400">
                  {biggestWin ? `+R$ ${biggestWin.profit.toFixed(2)}` : "-"}
                </span>
              </div>
              <div className="flex items-center gap-3 min-w-0">
                {biggestWin?.team ? (
                  <>
                    <img
                      src={getLogoUrl(biggestWin.team)}
                      alt=""
                      className="w-7 h-7 object-contain flex-shrink-0"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-white font-bold text-sm truncate">
                        {biggestWin.team.name}
                      </span>
                      <span className="text-xs text-gray-500 font-semibold flex-shrink-0">
                        (@{biggestWin.odd.toFixed(2)})
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="text-gray-500 text-xs italic">Nenhum green registrado</span>
                )}
              </div>
            </div>

            {/* Lanterna */}
            <div className="bg-gray-950/60 border border-red-500/30 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                  <span className="text-sm">🥶</span>
                  <span>Lanterna do Bolão</span>
                </span>
                <span className="text-sm font-black text-white">
                  R$ {lanternTeam ? lanternTeam.pot.toFixed(2) : "0.00"}
                </span>
              </div>
              <div className="flex items-center gap-3 min-w-0">
                {lanternTeam?.team && (
                  <img
                    src={getLogoUrl(lanternTeam.team)}
                    alt=""
                    className="w-7 h-7 object-contain flex-shrink-0"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                )}
                <span className="text-white font-bold text-sm truncate">
                  {lanternTeam?.team?.name || "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Responsive Layout for Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Odd Lock & Rules (6 cols) */}
        <div className="lg:col-span-6 space-y-6">

          {/* Card: Trava de Odd Máxima */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-xl">
                  🔒
                </div>
                <div>
                  <p className="text-white font-black text-base">Trava de Odd Máxima</p>
                  <p className="text-gray-500 text-xs">Limite teto permitido no registro de apostas</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs font-bold">Odd:</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={oddInput}
                  onChange={(e) => {
                    setOddInput(e.target.value);
                    const parsed = parseFloat(e.target.value.replace(",", "."));
                    if (!isNaN(parsed) && parsed >= 1.01) {
                      setMaxOdd(parsed);
                    }
                  }}
                  onBlur={() => commitOdd(oddInput)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      commitOdd(oddInput);
                      e.target.blur();
                    }
                  }}
                  placeholder="1.50"
                  className="w-24 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-center text-yellow-400 font-black text-lg focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            {/* Quick preset buttons */}
            <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] text-gray-500 font-semibold">Atalhos rápidos:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRESET_ODDS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setOddInput(preset);
                      commitOdd(preset);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      oddInput === preset
                        ? "bg-yellow-400 text-gray-950 font-black shadow-md shadow-yellow-400/20 scale-105"
                        : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                    }`}
                  >
                    @{preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card: Regras Oficiais */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl">
            <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <span>📜</span>
              <span>Regras Oficiais do Bolão</span>
            </h3>
            <div className="space-y-2.5 text-xs text-gray-400">
              <div className="p-2.5 rounded-2xl bg-gray-950/50 border border-gray-800/80 flex items-start gap-2.5">
                <span className="text-base">🏈</span>
                <div>
                  <strong className="text-white block font-bold">16 Times Selecionados</strong>
                  <span>Cada participante compete gerenciando o pote de seus times escolhidos.</span>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-gray-950/50 border border-gray-800/80 flex items-start gap-2.5">
                <span className="text-base">📈</span>
                <div>
                  <strong className="text-emerald-400 block font-bold">Green (Vitória)</strong>
                  <span>O pote cresce com o lucro líquido da aposta: valor × (odd - 1).</span>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-gray-950/50 border border-gray-800/80 flex items-start gap-2.5">
                <span className="text-base">📉</span>
                <div>
                  <strong className="text-red-400 block font-bold">Red (Derrota)</strong>
                  <span>O valor apostado é descontado do pote (a menos que tenha escudo protetor).</span>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-gray-950/50 border border-gray-800/80 flex items-start gap-2.5">
                <span className="text-base">📏</span>
                <div>
                  <strong className="text-yellow-400 block font-bold">Regra da Aposta Mínima</strong>
                  <span>A aposta mínima de cada rodada é sempre o valor total do pote do time.</span>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-gray-950/50 border border-gray-800/80 flex items-start gap-2.5">
                <span className="text-base">🔒</span>
                <div>
                  <strong className="text-white block font-bold">1 Aposta por Confronto</strong>
                  <span>Cada confronto da rodada aceita no máximo uma aposta única.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Power-ups Config, Backup/Restore, Danger Zone (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Card: Gestão de Usuários & Permissões (Admin Only) */}
          {isAdmin && (
            <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-yellow-500/30 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-xl">
                    👥
                  </div>
                  <div>
                    <h3 className="text-white font-black text-base">Gestão de Usuários & Acessos</h3>
                    <p className="text-gray-400 text-xs">Exclusivo para Comissários</p>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                  Admin
                </span>
              </div>

              <p className="text-gray-300 text-xs leading-relaxed mb-4">
                Gerencie quem pode apostar, promova outros participantes a <strong>Comissários</strong> ou <strong>revogue acessos</strong> instantaneamente.
              </p>

              {onOpenUserManager && (
                <button
                  type="button"
                  onClick={onOpenUserManager}
                  className="w-full py-2.5 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xs transition-all shadow-md shadow-yellow-400/10 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95"
                >
                  <span>Gerenciar Usuários & Permissões</span>
                  <span>➜</span>
                </button>
              )}
            </div>
          )}

          {/* Card: Guia Explicativo de Papéis & Permissões */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-xl">
                  🛡️
                </div>
                <div>
                  <h3 className="text-white font-black text-sm sm:text-base flex items-center gap-2">
                    <span>Níveis de Acesso & Permissões</span>
                  </h3>
                  <p className="text-gray-400 text-xs">
                    Entenda o que cada papel pode visualizar, palpitar e administrar no bolão
                  </p>
                </div>
              </div>

              {onOpenUserManager && (
                <button
                  type="button"
                  onClick={onOpenUserManager}
                  className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 self-start sm:self-auto bg-yellow-400/10 hover:bg-yellow-400/20 px-3 py-1.5 rounded-xl border border-yellow-400/20 transition-all"
                >
                  <span>Atribuir Papéis</span>
                  <span>➜</span>
                </button>
              )}
            </div>

            {/* Quick Filter Pill Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedRoleTab("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedRoleTab === "all"
                    ? "bg-yellow-400 text-gray-950 shadow-md shadow-yellow-400/20 font-black"
                    : "bg-gray-950 text-gray-400 hover:text-white border border-gray-800"
                }`}
              >
                Todos ({ROLES_GUIDE.length})
              </button>
              {ROLES_GUIDE.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRoleTab(r.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedRoleTab === r.id
                      ? "bg-gray-800 text-white border border-gray-600 shadow-md"
                      : "bg-gray-950 text-gray-400 hover:text-white border border-gray-800"
                  }`}
                >
                  <span>{r.icon}</span>
                  <span>{r.shortName}</span>
                </button>
              ))}
            </div>

            {/* Roles List */}
            <div className="space-y-3 pt-1">
              {displayedRoles.map((role) => (
                <div
                  key={role.id}
                  className={`p-4 rounded-2xl border transition-all ${role.containerBg} ${role.borderColor}`}
                >
                  {/* Top Bar: Icon, Name, Badge, Description */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/5">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${role.iconBg}`}
                      >
                        {role.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-black text-sm">
                            {role.name}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${role.badgeColor}`}
                          >
                            {role.badge}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                          {role.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Telas Acessíveis */}
                  <div className="mt-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">
                      🖥️ Telas & Módulos Acessíveis:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {role.screens.map((scr, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg bg-black/40 border border-white/5 text-[11px] text-gray-300 font-medium"
                        >
                          {scr}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* O que pode fazer */}
                  <div className="mt-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block mb-1.5">
                      ✅ O que pode fazer (Ações Permitidas):
                    </span>
                    <ul className="space-y-1.5 text-xs text-gray-300">
                      {role.canDo.map((action, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-400 text-xs font-bold flex-shrink-0 mt-0.5">
                            ✓
                          </span>
                          <span className="leading-snug">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* O que NÃO pode fazer (Restrições) */}
                  {role.cannotDo && role.cannotDo.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-white/5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-red-400 block mb-1.5">
                        ❌ O que NÃO pode fazer (Restrições):
                      </span>
                      <ul className="space-y-1.5 text-xs text-gray-400">
                        {role.cannotDo.map((rest, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-red-400 text-xs font-bold flex-shrink-0 mt-0.5">
                              ✕
                            </span>
                            <span className="leading-snug">{rest}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Card: Configuração de Poderes */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <span>⚡</span>
                  <span>Cartas e Poderes Especiais</span>
                </h3>
                <p className="text-gray-500 text-xs mt-0.5">
                  Gerencie cartas ativas, quantidades disponíveis ou crie novos poderes
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingPower(!isAddingPower)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-sm ${
                  isAddingPower
                    ? "bg-gray-800 text-gray-300 border-gray-700"
                    : "bg-yellow-400 text-gray-950 font-black border-yellow-400 hover:bg-yellow-300"
                }`}
              >
                <span>{isAddingPower ? "✕ Fechar" : "＋ Novo Poder"}</span>
              </button>
            </div>

            {/* Form to Add New Power */}
            {isAddingPower && (
              <form
                onSubmit={handleCreatePower}
                className="mb-4 p-4 rounded-2xl bg-gray-950 border border-yellow-500/40 space-y-3 animate-in fade-in duration-200"
              >
                <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                  <span className="text-xs font-black text-yellow-400 uppercase tracking-wide">
                    Cadastrar Novo Poder
                  </span>
                  <span className="text-[10px] text-gray-500">Adicione ao inventário do bolão</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-[11px] text-gray-400 font-semibold block mb-1">
                      Nome do Poder
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Triple Turbo 3X"
                      value={newPowerName}
                      onChange={(e) => setNewPowerName(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-400 font-semibold block mb-1">
                      Qtd. Usos
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newPowerQuantity}
                      onChange={(e) => setNewPowerQuantity(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2 py-1.5 text-xs text-white text-center font-bold focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                </div>

                {/* Icon Picker */}
                <div>
                  <label className="text-[11px] text-gray-400 font-semibold block mb-1">
                    Ícone Emoji:
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {POWER_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setNewPowerIcon(icon)}
                        className={`w-8 h-8 rounded-xl text-sm flex items-center justify-center transition-all ${
                          newPowerIcon === icon
                            ? "bg-yellow-400 border border-yellow-400 scale-110 shadow-sm"
                            : "bg-gray-900 border border-gray-700 hover:bg-gray-800"
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type selector */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-400 font-semibold block mb-1">
                      Efeito / Tipo
                    </label>
                    <select
                      value={newPowerType}
                      onChange={(e) => setNewPowerType(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="multiplier">Multiplicador de Lucro</option>
                      <option value="shield">Escudo Protetor (Anti-Red)</option>
                    </select>
                  </div>

                  {newPowerType === "multiplier" ? (
                    <div>
                      <label className="text-[11px] text-gray-400 font-semibold block mb-1">
                        Fator Multiplicador
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="1.5"
                        value={newPowerMultiplier}
                        onChange={(e) => setNewPowerMultiplier(e.target.value)}
                        placeholder="2"
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2.5 py-1.5 text-xs text-white text-center font-bold focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-[11px] text-gray-400 font-semibold block mb-1">
                        Proteção
                      </label>
                      <div className="w-full bg-gray-900/60 border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-cyan-400 font-bold">
                        100% do Pote
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] text-gray-400 font-semibold block mb-1">
                    Descrição do Poder (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Triplica o lucro se bater a aposta!"
                    value={newPowerDesc}
                    onChange={(e) => setNewPowerDesc(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingPower(false)}
                    className="px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-yellow-400 text-gray-950 font-black text-xs hover:bg-yellow-300 transition-all shadow-md"
                  >
                    Salvar Poder
                  </button>
                </div>
              </form>
            )}

            {/* List of Power-ups */}
            <div className="space-y-3">
              {powerUpsList && powerUpsList.length > 0 ? (
                powerUpsList.map((power) => (
                  <div
                    key={power.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      power.enabled
                        ? "bg-gray-950/80 border-gray-800 hover:border-gray-700"
                        : "bg-gray-950/30 border-gray-900 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl sm:text-3xl flex-shrink-0">{power.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-black text-sm truncate">{power.name}</p>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.2 rounded-full border ${
                              power.type === "shield"
                                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                                : "bg-purple-500/10 text-purple-400 border-purple-500/30"
                            }`}
                          >
                            {power.type === "shield" ? "Escudo" : `${power.multiplier}X Lucro`}
                          </span>
                        </div>
                        <p className="text-gray-500 text-xs mt-0.5 truncate">{power.description}</p>
                      </div>
                    </div>

                    {/* Actions / Quantity control */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-800">
                      {/* Quantity buttons */}
                      <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-xl px-2 py-1">
                        <button
                          type="button"
                          onClick={() => setPowerUpQuantity(power.id, -1, true)}
                          disabled={power.quantity <= 0}
                          title="Diminuir usos"
                          className="w-6 h-6 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          -
                        </button>
                        <span className="text-white font-black text-xs min-w-[28px] text-center">
                          {power.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPowerUpQuantity(power.id, 1, true)}
                          title="Aumentar usos"
                          className="w-6 h-6 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>

                      {/* Enable/Disable Toggle */}
                      <button
                        type="button"
                        onClick={() => updatePowerUp(power.id, { enabled: !power.enabled })}
                        title={power.enabled ? "Desativar este poder" : "Ativar este poder"}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border ${
                          power.enabled
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                            : "bg-gray-800 text-gray-400 border-gray-700 hover:text-white"
                        }`}
                      >
                        {power.enabled ? "Ativo" : "Inativo"}
                      </button>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Tem certeza que deseja remover o poder "${power.name}"?`)) {
                            removePowerUp(power.id);
                            showFeedback("success", `Poder "${power.name}" removido.`);
                          }
                        }}
                        title="Remover poder"
                        className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <span className="text-sm">🗑️</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-gray-500 text-xs">
                  Nenhum poder cadastrado. Clique em "+ Novo Poder" para adicionar.
                </div>
              )}
            </div>
          </div>

          {/* Card: Backup e Restauração de Dados */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl">
            <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
              <span>💾</span>
              <span>Backup e Dados do Bolão</span>
            </h3>
            <p className="text-gray-500 text-xs mb-4">
              Salve ou transfira seus dados em arquivo JSON para outro dispositivo ou navegador.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Export JSON */}
              <div className="p-4 rounded-2xl bg-gray-950/70 border border-gray-800 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 text-blue-400 font-bold text-sm">
                    <span>📤</span>
                    <span>Exportar Backup</span>
                  </div>
                  <p className="text-gray-500 text-xs">
                    Gera um arquivo .json completo com todos os times, potes e apostas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exportJSON}
                  className="w-full py-2 px-3 rounded-xl bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Baixar Arquivo JSON</span>
                </button>
              </div>

              {/* Import JSON */}
              <div className="p-4 rounded-2xl bg-gray-950/70 border border-gray-800 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 text-emerald-400 font-bold text-sm">
                    <span>📥</span>
                    <span>Importar Backup</span>
                  </div>
                  <p className="text-gray-500 text-xs">
                    Restaura times, histórico de apostas e potes a partir de um backup salvo.
                  </p>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json,application/json"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-gray-950 border border-emerald-500/30 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Carregar Arquivo JSON</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card: Banco de Dados & Nuvem (Firebase) */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl">
            <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
              <span>☁️</span>
              <span>Banco de Dados & Nuvem (Firebase)</span>
            </h3>

            <div className="p-4 rounded-2xl bg-gray-950/70 border border-gray-800 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔥</span>
                  <span className="text-white font-bold text-sm">Status da Conexão</span>
                </div>
                {isCloudEnabled ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    {cloudSyncStatus === "saving"
                      ? "Salvando..."
                      : cloudSyncStatus === "syncing"
                      ? "Sincronizando..."
                      : cloudSyncStatus === "error"
                      ? "Erro na Nuvem"
                      : "Nuvem Conectada"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                    <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                    Modo Local (Offline)
                  </span>
                )}
              </div>

              {isCloudEnabled ? (
                <div className="space-y-2 text-xs text-gray-300 leading-relaxed">
                  <p>
                    O aplicativo está conectado ao <strong className="text-white font-bold">Firebase Firestore</strong> na liga <code className="px-2 py-0.5 rounded bg-gray-800 text-yellow-400 font-mono font-bold">{leagueId}</code>.
                  </p>
                  <p className="text-gray-400">
                    Qualquer aposta, green/red ou mudança de rodada feita por você ou seus amigos é atualizada instantaneamente em todos os celulares e computadores!
                  </p>
                  {cloudError && (
                    <p className="text-red-400 font-semibold mt-1">
                      ⚠️ {cloudError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-xs text-gray-400 leading-relaxed">
                  <p>
                    Seus dados estão sendo salvos apenas no armazenamento local deste navegador (<strong className="text-gray-200">localStorage</strong>).
                  </p>
                  <p>
                    Para que você e seus amigos acessem o <strong className="text-yellow-400">mesmo bolão compartilhado em tempo real</strong> pelo link da Vercel, basta adicionar as credenciais do seu projeto Firebase nas variáveis de ambiente da Vercel (<code className="text-gray-300 font-mono">VITE_FIREBASE_API_KEY</code>, etc.) ou no arquivo <code className="text-gray-300 font-mono">.env.local</code> localmente.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card: Ações do Sistema */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl">
            <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
              <span>⚡</span>
              <span>Ações do Sistema</span>
            </h3>

            <div className="space-y-3">
              {/* NFL Round Sync & Controls */}
              <div className="p-4 rounded-2xl bg-gray-950/70 border border-gray-800 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏈</span>
                    <span className="text-white font-bold text-sm whitespace-nowrap">
                      Semana da NFL & Rodada
                    </span>
                  </div>
                  <span className="bg-yellow-400 text-gray-950 text-xs font-black px-2.5 py-1 rounded-xl whitespace-nowrap shadow-sm">
                    Rodada #{currentRound}
                  </span>
                </div>

                <p className="text-gray-400 text-xs leading-relaxed">
                  A rodada segue o calendário oficial da NFL obtido automaticamente via ESPN.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      const week = await syncWithNflWeek();
                      if (week) {
                        showFeedback("success", `Sincronizado com a Semana #${week} da NFL!`);
                      } else {
                        showFeedback("error", "Não foi possível sincronizar com a ESPN agora.");
                      }
                    }}
                    disabled={isSyncingNflWeek}
                    className="flex-1 py-2 px-3 rounded-xl bg-yellow-400/20 hover:bg-yellow-400 text-yellow-400 hover:text-gray-950 border border-yellow-400/40 font-bold text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
                  >
                    <span className={isSyncingNflWeek ? "animate-spin" : ""}>🔄</span>
                    <span>{isSyncingNflWeek ? "Sincronizando..." : "Sincronizar c/ ESPN"}</span>
                  </button>
                  <select
                    value={currentRound}
                    onChange={(e) => {
                      const r = Number(e.target.value);
                      setCurrentRound(r);
                      showFeedback("success", `Rodada alterada para a Semana #${r}!`);
                    }}
                    className="py-2 px-3 rounded-xl bg-gray-800 border border-gray-700 text-white font-bold text-xs focus:outline-none focus:border-yellow-400 whitespace-nowrap flex-shrink-0"
                  >
                    {Array.from({ length: 18 }, (_, i) => i + 1).map((r) => (
                      <option key={r} value={r}>
                        Semana #{r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reset Everything */}
              <div className="p-4 rounded-2xl bg-red-950/10 border border-red-500/20 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-red-400 font-bold text-sm flex items-center gap-2 whitespace-nowrap">
                    <span>🔄</span>
                    <span>Resetar Todo o Bolão</span>
                  </p>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 font-bold text-xs transition-all whitespace-nowrap shadow-sm active:scale-95"
                    >
                      Resetar Dados
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-500 italic bg-gray-950 px-2.5 py-1 rounded-lg border border-gray-800">
                      🔒 Somente Comissário
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs">
                  Apaga todos os dados e volta para a tela de escolha dos 16 times.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-red-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-2xl flex-shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="text-white font-black text-lg">Resetar Bolão Completo?</h3>
                <p className="text-red-400 text-xs font-semibold">Esta ação não pode ser desfeita!</p>
              </div>
            </div>

            <p className="text-gray-300 text-sm leading-relaxed">
              Você está prestes a apagar <strong className="text-white font-bold">todas as apostas</strong>, históricos de bancas, power-ups e configurações da temporada. Você retornará à tela inicial para selecionar novamente os 16 times.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  resetSetup();
                }}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition-all shadow-lg shadow-red-600/30 active:scale-95"
              >
                Sim, Resetar Tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

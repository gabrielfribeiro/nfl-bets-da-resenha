import { useState, useEffect } from "react";
import { useBet } from "../../context/BetContext";
import { NFL_TEAMS, getTeamById, getLogoUrl } from "../../data/nflTeams";
import { sounds } from "../../utils/sound";
import MatchupModal from "./MatchupModal";

export default function NewBet({ initialMatchup, onClearInitialMatchup }) {
  const { selectedTeamIds, teams, bets, addBet, currentRound, getMinBet, MAX_ODD, powerUps, powerUpsList } = useBet();

  const [teamAId, setTeamAId] = useState(initialMatchup?.teamA || "");
  const [teamBId, setTeamBId] = useState(initialMatchup?.teamB || "");
  const [bettingOnTeamId, setBettingOnTeamId] = useState("");
  const [amount, setAmount] = useState("");
  const [odd, setOdd] = useState("1.5");
  const [result, setResult] = useState("pending");
  const [selectedPowerUp, setSelectedPowerUp] = useState(null); // 'shield' | 'double' | null
  const [isFlipping, setIsFlipping] = useState(false);
  const [coinWinner, setCoinWinner] = useState(null);
  const [coinLocked, setCoinLocked] = useState(false);
  const [round, setRound] = useState(initialMatchup?.round ? initialMatchup.round.toString() : currentRound.toString());
  const [note, setNote] = useState("");
  const [success, setSuccess] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (initialMatchup?.teamA && initialMatchup?.teamB) {
      setTeamAId(initialMatchup.teamA);
      setTeamBId(initialMatchup.teamB);
      if (initialMatchup.round) {
        setRound(initialMatchup.round.toString());
      }
      setCoinWinner(null);
      setCoinLocked(false);

      // If only one team belongs to the user league, select it automatically
      const leagueTeams = [initialMatchup.teamA, initialMatchup.teamB].filter((id) =>
        selectedTeamIds.includes(id)
      );
      if (leagueTeams.length === 1) {
        setBettingOnTeamId(leagueTeams[0]);
      } else {
        setBettingOnTeamId("");
      }

      if (onClearInitialMatchup) {
        onClearInitialMatchup();
      }
    }
  }, [initialMatchup]);

  const teamBet = bettingOnTeamId ? teams[bettingOnTeamId] : null;
  const minBet = bettingOnTeamId ? getMinBet(bettingOnTeamId) : 1.0;

  // Teams that can be bet on: must be selected AND in the matchup
  const teamsInMatchup = [teamAId, teamBId].filter((id) => selectedTeamIds.includes(id));

  // Validation
  const amountVal = parseFloat(amount);
  const oddVal = parseFloat(odd);
  const isAmountValid = !isNaN(amountVal) && amountVal >= minBet;
  const isOddValid = !isNaN(oddVal) && oddVal >= 1.01 && oddVal <= MAX_ODD;
  const isBettingTeamValid = bettingOnTeamId && selectedTeamIds.includes(bettingOnTeamId);
  const hasSufficientPot = teamBet ? teamBet.pot >= amountVal : false;

  const roundNum = parseInt(round) || currentRound;
  const existingBet = bets?.find(
    (b) =>
      Number(b.round) === roundNum &&
      ((b.teamAId === teamAId && b.teamBId === teamBId) ||
       (b.teamAId === teamBId && b.teamBId === teamAId))
  );

  const isValid =
    teamAId &&
    teamBId &&
    teamAId !== teamBId &&
    isBettingTeamValid &&
    isAmountValid &&
    isOddValid &&
    hasSufficientPot &&
    !existingBet;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    addBet({
      teamAId,
      teamBId,
      bettingOnTeamId,
      amount: amountVal,
      odd: oddVal,
      result,
      round: parseInt(round) || currentRound,
      powerUp: selectedPowerUp,
      note,
    });
    // Reset form
    setTeamAId("");
    setTeamBId("");
    setBettingOnTeamId("");
    setAmount("");
    setOdd("1.5");
    setResult("pending");
    setSelectedPowerUp(null);
    setCoinLocked(false);
    setCoinWinner(null);
    setNote("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleSelectMatchup = (a, b) => {
    setTeamAId(a);
    setTeamBId(b);
    setCoinWinner(null);
    setCoinLocked(false);
    // If current betting team is not in new matchup, reset it
    if (bettingOnTeamId !== a && bettingOnTeamId !== b) {
      setBettingOnTeamId("");
    }
  };

  const handleCoinFlip = () => {
    if (teamsInMatchup.length < 2 || isFlipping || coinLocked) return;
    setIsFlipping(true);
    setCoinWinner(null);

    // Play spinning coin sound
    sounds.playCoinFlip();

    let flips = 0;
    const totalFlips = 10;
    let idx = 0;

    const interval = setInterval(() => {
      idx = (idx + 1) % teamsInMatchup.length;
      setBettingOnTeamId(teamsInMatchup[idx]);
      flips++;

      if (flips >= totalFlips) {
        clearInterval(interval);
        // Randomly pick one of the matchup teams
        const finalChoice = teamsInMatchup[Math.floor(Math.random() * teamsInMatchup.length)];
        setBettingOnTeamId(finalChoice);
        setIsFlipping(false);
        setCoinLocked(true); // <--- ESCOLHA TRAVADA! Não pode mais alterar
        const chosenTeam = getTeamById(finalChoice);
        setCoinWinner(chosenTeam?.name || "Time escolhido");
        sounds.playCash();
      }
    }, 110);
  };

  const teamAObj = getTeamById(teamAId);
  const teamBObj = getTeamById(teamBId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      {/* Top Banner */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-white font-black text-2xl tracking-tight flex items-center gap-2">
            <span>➕</span>
            <span>Registrar Nova Aposta</span>
          </h2>
          <p className="text-gray-400 text-xs">
            Escolha o confronto, monte os parâmetros e acompanhe o crescimento do pote
          </p>
        </div>

        {success && (
          <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 font-bold text-xs flex items-center gap-2 animate-bounce">
            ✅ Aposta registrada com sucesso!
          </div>
        )}
      </div>

      {/* Main 2-Column Responsive Board Layout */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Matchup & Team Selection (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Matchup Card */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                <span>⚔️</span>
                <span>Confronto da Partida</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-3.5 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xs rounded-xl shadow-md shadow-yellow-400/20 transition-all flex items-center gap-1.5"
              >
                <span>🔍</span>
                <span>{teamAId && teamBId ? "Alterar Times" : "Selecionar Times"}</span>
              </button>
            </div>

            {/* Matchup Display Bar */}
            <div
              onClick={() => setIsModalOpen(true)}
              className="bg-gray-950/80 border-2 border-dashed border-gray-800 hover:border-yellow-400/50 rounded-2xl p-4 cursor-pointer transition-all flex items-center justify-between gap-4 group"
            >
              {/* Team A */}
              <div className="flex-1 flex flex-col items-center text-center">
                {teamAObj ? (
                  <>
                    <img
                      src={getLogoUrl(teamAObj, 200)}
                      alt={teamAObj.name}
                      className="w-16 h-16 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                    <span className="text-white font-black text-sm mt-1.5 line-clamp-1">{teamAObj.name}</span>
                    <span className="text-[10px] text-gray-500">{teamAObj.conference} · {teamAObj.division}</span>
                  </>
                ) : (
                  <div className="py-2 text-gray-600 group-hover:text-gray-400">
                    <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-gray-700 flex items-center justify-center mx-auto mb-1 text-base font-bold">
                      ?
                    </div>
                    <span className="text-xs">Clique para escolher</span>
                  </div>
                )}
              </div>

              {/* Center VS */}
              <div className="flex flex-col items-center flex-shrink-0 px-2">
                <div className="w-10 h-10 rounded-full bg-yellow-400 text-gray-950 font-black text-sm flex items-center justify-center shadow-lg shadow-yellow-400/20">
                  VS
                </div>
                <span className="text-[10px] text-gray-500 font-bold uppercase mt-1">Confronto</span>
              </div>

              {/* Team B */}
              <div className="flex-1 flex flex-col items-center text-center">
                {teamBObj ? (
                  <>
                    <img
                      src={getLogoUrl(teamBObj, 200)}
                      alt={teamBObj.name}
                      className="w-16 h-16 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                    <span className="text-white font-black text-sm mt-1.5 line-clamp-1">{teamBObj.name}</span>
                    <span className="text-[10px] text-gray-500">{teamBObj.conference} · {teamBObj.division}</span>
                  </>
                ) : (
                  <div className="py-2 text-gray-600 group-hover:text-gray-400">
                    <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-gray-700 flex items-center justify-center mx-auto mb-1 text-base font-bold">
                      ?
                    </div>
                    <span className="text-xs">Clique para escolher</span>
                  </div>
                )}
              </div>
            </div>

            {/* Betting on team selector */}
            {teamAId && teamBId && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                    Apostando no time:
                  </label>
                  {teamsInMatchup.length >= 2 && (
                    <button
                      type="button"
                      disabled={isFlipping || coinLocked}
                      onClick={handleCoinFlip}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                        coinLocked
                          ? "bg-amber-500/20 border border-amber-500/40 text-amber-300 cursor-not-allowed"
                          : isFlipping
                          ? "bg-yellow-400 text-gray-950 shadow-md shadow-yellow-400/30 cursor-wait"
                          : "bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400 hover:text-gray-950"
                      }`}
                    >
                      <span className={`text-sm ${isFlipping ? "animate-coin-flip inline-block" : ""}`}>🪙</span>
                      <span>
                        {coinLocked
                          ? "🔒 Escolha Selada pela Moeda"
                          : isFlipping
                          ? "Girando a moeda..."
                          : "Cara ou Coroa da Sorte"}
                      </span>
                    </button>
                  )}
                </div>

                {/* Coin Winner Announcement Banner */}
                {coinWinner && (
                  <div className="mb-3 p-3 bg-amber-950/40 border-2 border-amber-400/50 rounded-2xl flex items-center justify-between gap-2 text-amber-300 text-xs font-bold animate-in fade-in zoom-in duration-200 shadow-lg shadow-amber-950/30">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">🪙</span>
                      <div>
                        <p className="text-white font-black text-xs">
                          A moeda da sorte escolheu: <span className="text-yellow-400 underline font-black">{coinWinner}</span>!
                        </p>
                        <p className="text-amber-300/80 text-[11px] mt-0.5">
                          🔒 Destino selado! Por regra do Cara ou Coroa, a escolha não pode ser alterada.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {teamsInMatchup.length === 0 ? (
                  <p className="text-amber-400 text-xs bg-amber-950/20 border border-amber-500/30 p-2.5 rounded-xl">
                    ⚠️ Nenhum dos dois times está entre os seus 16 selecionados do bolão.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {teamsInMatchup.map((id) => {
                      const t = getTeamById(id);
                      const ts = teams[id];
                      const isChosen = bettingOnTeamId === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          disabled={isFlipping || coinLocked}
                          onClick={() => !coinLocked && setBettingOnTeamId(id)}
                          className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-3 text-left relative overflow-hidden ${
                            isFlipping ? "opacity-60 pointer-events-none" : ""
                          } ${
                            coinLocked
                              ? isChosen
                                ? "border-yellow-400 bg-yellow-400/15 shadow-lg shadow-yellow-400/20 cursor-default"
                                : "border-gray-800/80 bg-gray-950/30 opacity-40 cursor-not-allowed grayscale"
                              : isChosen
                              ? "border-yellow-400 bg-yellow-400/10 shadow-lg shadow-yellow-400/10"
                              : "border-gray-800 bg-gray-950/60 hover:border-gray-700"
                          }`}
                        >
                          <img
                            src={getLogoUrl(t, 100)}
                            alt={t?.name}
                            className="w-10 h-10 object-contain flex-shrink-0"
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="block font-black text-sm text-white truncate">{t?.name}</span>
                            <span className="text-xs text-yellow-400 font-bold block">
                              Pote: R$ {ts?.pot.toFixed(2)}
                            </span>
                          </div>
                          {isChosen && (
                            <span className="text-yellow-400 font-black text-sm">
                              {coinLocked ? "🔒" : "✓"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Power-ups Section */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                Cartas de Poder (Opcional)
              </h3>
              <span className="text-[11px] text-yellow-400 font-semibold">Uso limitado</span>
            </div>

            {(!powerUpsList || powerUpsList.filter((p) => p.enabled).length === 0) ? (
              <p className="text-gray-500 text-xs italic">Nenhuma carta de poder ativa no momento.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {powerUpsList
                  .filter((power) => power.enabled)
                  .map((power) => {
                    const isSelected = selectedPowerUp === power.id;
                    const canUse = power.quantity > 0;

                    return (
                      <button
                        key={power.id}
                        type="button"
                        disabled={!canUse}
                        onClick={() => setSelectedPowerUp(isSelected ? null : power.id)}
                        className={`p-3 rounded-2xl border-2 text-left transition-all ${
                          isSelected
                            ? power.type === "shield"
                              ? "border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-500/20"
                              : "border-purple-400 bg-purple-950/40 shadow-lg shadow-purple-500/20"
                            : canUse
                            ? "border-gray-800 bg-gray-950/60 hover:border-gray-700"
                            : "border-gray-800 bg-gray-950/30 opacity-40 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-2xl">{power.icon}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              canUse
                                ? power.type === "shield"
                                  ? "bg-cyan-500/20 text-cyan-300"
                                  : "bg-purple-500/20 text-purple-300"
                                : "bg-gray-800 text-gray-500"
                            }`}
                          >
                            {power.quantity} rest.
                          </span>
                        </div>
                        <p className="text-white font-black text-sm">{power.name}</p>
                        <p className="text-gray-400 text-[11px] mt-0.5">{power.description}</p>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Bet Values, Result & Submit (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Values Card */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-4">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">
              Valores e Odd
            </h3>

            <div className="grid grid-cols-2 gap-3 items-start">
              {/* Amount */}
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5 min-h-[22px]">
                  <label className="text-gray-400 text-xs font-semibold">Valor apostado</label>
                  {bettingOnTeamId ? (
                    <span className="text-yellow-400 text-[10px] font-bold whitespace-nowrap">
                      (mín. R$ {minBet.toFixed(2)})
                    </span>
                  ) : (
                    <span className="text-gray-600 text-[10px] whitespace-nowrap">(escolha o time)</span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">R$</span>
                  <input
                    type="number"
                    min={minBet}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={minBet.toFixed(2)}
                    className={`w-full h-11 bg-gray-800 border rounded-xl pl-9 pr-2 py-2.5 text-white font-bold text-sm focus:outline-none transition-colors ${
                      amount && !isAmountValid ? "border-red-500" : "border-gray-700 focus:border-yellow-400"
                    }`}
                  />
                </div>
                {amount && !isAmountValid && (
                  <p className="text-red-400 text-[11px] mt-1">Mínimo: R$ {minBet.toFixed(2)}</p>
                )}
                {amount && isAmountValid && !hasSufficientPot && teamBet && (
                  <p className="text-red-400 text-[11px] mt-1">Pote insuficiente (R$ {teamBet.pot.toFixed(2)})</p>
                )}
              </div>

              {/* Odd */}
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5 min-h-[22px]">
                  <label className="text-gray-400 text-xs font-semibold">Odd</label>
                  <span className="text-gray-500 text-[10px] whitespace-nowrap">(máx. {MAX_ODD})</span>
                </div>
                <input
                  type="number"
                  min="1.01"
                  max={MAX_ODD}
                  step="0.01"
                  value={odd}
                  onChange={(e) => setOdd(e.target.value)}
                  className={`w-full h-11 bg-gray-800 border rounded-xl px-3 py-2.5 text-white font-bold text-sm focus:outline-none transition-colors ${
                    odd && !isOddValid ? "border-red-500" : "border-gray-700 focus:border-yellow-400"
                  }`}
                />
                {odd && !isOddValid && (
                  <p className="text-red-400 text-[11px] mt-1">Odd até {MAX_ODD}</p>
                )}
              </div>
            </div>

            {/* Potential return banner */}
            {isAmountValid && isOddValid && (
              <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="text-gray-400 text-xs block">Retorno potencial</span>
                  {selectedPowerUp === "double" && (
                    <span className="text-purple-400 font-bold text-[11px]">TURBO 2X APLICADO!</span>
                  )}
                </div>
                <span className="text-emerald-400 font-black text-xl">
                  R$ {(amountVal + amountVal * (oddVal - 1) * (selectedPowerUp === "double" ? 2 : 1)).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Result Card */}
          <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-xl">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">Resultado</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "pending", label: "⏳ Pendente", active: "border-yellow-400 text-yellow-400 bg-yellow-400/10" },
                { value: "win", label: "✅ Bateu", active: "border-emerald-500 text-emerald-400 bg-emerald-500/10" },
                { value: "loss", label: "❌ Perdeu", active: "border-red-500 text-red-400 bg-red-500/10" },
              ].map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setResult(r.value)}
                  className={`py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                    result === r.value ? r.active : "border-gray-800 text-gray-500 hover:border-gray-700"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Round & Note */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-800 items-start">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5 min-h-[18px]">
                  <label className="text-gray-500 text-[11px] font-semibold">Rodada</label>
                </div>
                <input
                  type="number"
                  min="1"
                  value={round}
                  onChange={(e) => setRound(e.target.value)}
                  className="w-full h-9 bg-gray-800 border border-gray-700 rounded-xl px-2.5 py-1.5 text-white font-bold text-xs focus:outline-none focus:border-yellow-400 text-center"
                />
              </div>
              <div className="col-span-2">
                <div className="flex items-center justify-between gap-1 mb-1.5 min-h-[18px]">
                  <label className="text-gray-500 text-[11px] font-semibold">Nota</label>
                  <span className="text-gray-600 text-[10px]">(opcional)</span>
                </div>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex: Semana 5"
                  className="w-full h-9 bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>
          </div>

          {/* Existing Bet Alert */}
          {existingBet && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
              <span className="text-base">⚠️</span>
              <span>
                Já existe uma aposta registrada para este confronto na <strong>Semana {roundNum}</strong>. Cada partida só permite 1 única aposta por rodada.
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isValid}
            className={`w-full py-4 rounded-2xl font-black text-base tracking-wide transition-all shadow-xl ${
              isValid
                ? "bg-yellow-400 text-gray-950 hover:bg-yellow-300 hover:scale-[1.01] shadow-yellow-400/20 cursor-pointer"
                : "bg-gray-800 text-gray-600 border border-gray-700/50 cursor-not-allowed opacity-60"
            }`}
          >
            Registrar Aposta
          </button>
        </div>
      </form>

      {/* Matchup Selection Modal */}
      <MatchupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        teamAId={teamAId}
        teamBId={teamBId}
        selectedTeamIds={selectedTeamIds}
        onSelectMatchup={handleSelectMatchup}
      />
    </div>
  );
}

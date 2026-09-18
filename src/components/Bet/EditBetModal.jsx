import { useState } from "react";
import { useBet } from "../../context/BetContext";
import { getTeamById, getLogoUrl } from "../../data/nflTeams";
import { BET_MARKETS } from "../../utils/markets";
import { sounds } from "../../utils/sound";

export default function EditBetModal({ bet, onClose }) {
  const { editBet, teams, powerUpsList, MAX_ODD } = useBet();

  const [teamAId, setTeamAId] = useState(bet.teamAId);
  const [teamBId, setTeamBId] = useState(bet.teamBId);
  const [bettingOnTeamId, setBettingOnTeamId] = useState(bet.bettingOnTeamId);
  const [amount, setAmount] = useState(bet.amount.toString());
  const [odd, setOdd] = useState(bet.odd.toString());
  const [round, setRound] = useState(bet.round.toString());
  const [powerUp, setPowerUp] = useState(bet.powerUp || "");
  const [marketType, setMarketType] = useState(bet.marketType || "moneyline");
  const [marketDetails, setMarketDetails] = useState(bet.marketDetails || "");
  const [note, setNote] = useState(bet.note || "");
  const [saving, setSaving] = useState(false);

  const teamA = getTeamById(teamAId);
  const teamB = getTeamById(teamBId);

  const activeMarket = BET_MARKETS.find((m) => m.id === marketType);

  const handleMarketChange = (newMarketId) => {
    setMarketType(newMarketId);
    const m = BET_MARKETS.find((item) => item.id === newMarketId);
    if (m && newMarketId !== "custom") {
      setMarketDetails(m.defaultDetail || "");
    } else if (newMarketId === "custom") {
      setMarketDetails("");
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    const oddNum = parseFloat(odd);
    const roundNum = parseInt(round, 10);

    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Por favor, informe um valor de aposta válido.");
      return;
    }

    if (isNaN(oddNum) || oddNum < 1.01) {
      alert("Por favor, informe uma cotação (odd) válida maior que 1.00.");
      return;
    }

    setSaving(true);
    try {
      editBet(bet.id, {
        teamAId,
        teamBId,
        bettingOnTeamId,
        amount: amountNum,
        odd: oddNum,
        round: roundNum || bet.round,
        powerUp: powerUp || null,
        marketType,
        marketDetails: marketDetails.trim(),
        note: note.trim(),
      });
      try {
        sounds.playCash?.();
      } catch {
        // Audio safe fallback
      }
      onClose();
    } catch (err) {
      console.error("Erro ao editar aposta:", err);
      alert("Ocorreu um erro ao salvar as alterações da aposta: " + (err?.message || ""));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-yellow-500/30 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-yellow-500/10 via-transparent to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center text-lg">
              ✏️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">Ajustar Aposta</h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-yellow-400/20 text-yellow-300 border border-yellow-400/40">
                  Comissário
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Modifique os detalhes da aposta registrada na Semana #{bet.round}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {bet.result !== "pending" && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
              <span className="text-base leading-none">💡</span>
              <div>
                <strong className="block font-bold">Aposta já consolidada ({bet.result === "win" ? "Green" : "Red"})</strong>
                <span>Ao alterar o valor ou a odd, o pote do time será recalculado automaticamente para manter a integridade dos saldos.</span>
              </div>
            </div>
          )}

          {/* Rodada */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">
              📅 Rodada / Semana:
            </label>
            <input
              type="number"
              min="1"
              max="22"
              value={round}
              onChange={(e) => setRound(e.target.value)}
              className="w-full h-11 bg-gray-950 border border-gray-800 focus:border-yellow-400 rounded-xl px-3 text-white font-bold text-sm focus:outline-none transition-colors"
            />
          </div>

          {/* Confronto / Time Apostado */}
          <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-4 space-y-3">
            <label className="block text-xs font-bold text-gray-300">
              🏈 Time do Palpite:
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Option Team A */}
              <button
                type="button"
                onClick={() => setBettingOnTeamId(teamAId)}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all ${
                  bettingOnTeamId === teamAId
                    ? "bg-yellow-400/15 border-yellow-400 text-white font-black ring-1 ring-yellow-400/50"
                    : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                <img
                  src={getLogoUrl(teamA, 60)}
                  alt=""
                  className="w-7 h-7 object-contain flex-shrink-0"
                />
                <span className="text-xs truncate text-left">{teamA?.name || teamAId}</span>
              </button>

              {/* Option Team B */}
              <button
                type="button"
                onClick={() => setBettingOnTeamId(teamBId)}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all ${
                  bettingOnTeamId === teamBId
                    ? "bg-yellow-400/15 border-yellow-400 text-white font-black ring-1 ring-yellow-400/50"
                    : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                <img
                  src={getLogoUrl(teamB, 60)}
                  alt=""
                  className="w-7 h-7 object-contain flex-shrink-0"
                />
                <span className="text-xs truncate text-left">{teamB?.name || teamBId}</span>
              </button>
            </div>
          </div>

          {/* Mercados e Palpites */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-300">
              🎯 Mercado & Palpite:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BET_MARKETS.map((market) => (
                <button
                  key={market.id}
                  type="button"
                  onClick={() => handleMarketChange(market.id)}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all active:scale-95 ${
                    marketType === market.id
                      ? "bg-yellow-400/15 border-yellow-400 text-yellow-300 ring-1 ring-yellow-400/50 shadow-md"
                      : "bg-gray-950/60 border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white"
                  }`}
                >
                  <span className="text-lg">{market.icon}</span>
                  <span className="text-xs font-black leading-tight block">{market.label}</span>
                  <span className="text-[10px] text-gray-500 font-medium block">{market.badge}</span>
                </button>
              ))}
            </div>

            {/* Detalhe do Palpite */}
            <div className="p-3 bg-gray-950/70 border border-gray-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-gray-300 flex items-center gap-1.5">
                  <span>{activeMarket?.icon}</span>
                  <span>Detalhe da Linha / Palpite:</span>
                </span>
                <span className="text-[10px] text-gray-500">Exibido no Card</span>
              </div>
              <input
                type="text"
                value={marketDetails}
                onChange={(e) => setMarketDetails(e.target.value)}
                placeholder={activeMarket?.placeholder}
                className="w-full h-10 bg-gray-900 border border-gray-700 focus:border-yellow-400 rounded-xl px-3 text-white text-xs font-bold focus:outline-none transition-colors"
              />

              {/* Chips rápidos */}
              {activeMarket?.chips?.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-gray-500 font-semibold">Sugestões:</span>
                  {activeMarket.chips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setMarketDetails(chip)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                        marketDetails === chip
                          ? "bg-yellow-400 text-gray-950 border-yellow-400 shadow-sm"
                          : "bg-gray-900 hover:bg-gray-850 text-gray-300 border-gray-800 hover:border-gray-700"
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Valores: Valor e Odd */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                💰 Valor Apostado (R$):
              </label>
              <input
                type="number"
                step="0.50"
                min="0.50"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-11 bg-gray-950 border border-gray-800 focus:border-yellow-400 rounded-xl px-3 text-white font-bold text-sm focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                📈 Cotação (Odd):
              </label>
              <input
                type="number"
                step="0.01"
                min="1.01"
                max={MAX_ODD}
                value={odd}
                onChange={(e) => setOdd(e.target.value)}
                className="w-full h-11 bg-gray-950 border border-gray-800 focus:border-yellow-400 rounded-xl px-3 text-yellow-400 font-black text-sm focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Carta de Poder */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">
              ⚡ Carta de Poder Aplicada:
            </label>
            <select
              value={powerUp}
              onChange={(e) => setPowerUp(e.target.value)}
              className="w-full h-11 bg-gray-950 border border-gray-800 focus:border-yellow-400 rounded-xl px-3 text-white font-bold text-xs focus:outline-none transition-colors"
            >
              <option value="">Nenhuma Carta de Poder</option>
              {powerUpsList?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">
              💬 Observação / Resenha (Opcional):
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Aposta arriscada de fechamento de rodada"
              className="w-full h-10 bg-gray-950 border border-gray-800 focus:border-yellow-400 rounded-xl px-3 text-gray-300 text-xs focus:outline-none transition-colors"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-gray-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xs transition-all shadow-lg hover:shadow-yellow-400/20 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>💾</span>
              <span>{saving ? "Salvando..." : "Salvar Ajustes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

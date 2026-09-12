import { useState, useRef } from "react";
import { toBlob, toPng } from "html-to-image";
import { useBet } from "../../context/BetContext";
import { getTeamById, getLogoUrl } from "../../data/nflTeams";
import { sounds } from "../../utils/sound";

export default function ShareModal({ onClose }) {
  const { currentRound, selectedTeamIds, teams, bets, maxOdd } = useBet();
  const [copied, setCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [selectedRound, setSelectedRound] = useState(currentRound);
  const cardRef = useRef(null);

  // Available rounds
  const availableRounds = Array.from(
    new Set([currentRound, ...bets.map((b) => b.round)])
  ).sort((a, b) => b - a);

  // Filter bets for selected round
  const roundBets = bets.filter((b) => b.round === selectedRound);
  const wonBets = roundBets.filter((b) => b.result === "win");
  const lossBets = roundBets.filter((b) => b.result === "loss");

  // Total Pot
  const totalPot = selectedTeamIds.reduce((sum, id) => sum + (teams[id]?.pot ?? 0), 0);

  // Text format for WhatsApp
  const generateWhatsAppText = () => {
    const betsText =
      roundBets.length > 0
        ? roundBets
            .map((b) => {
              const team = getTeamById(b.bettingOnTeamId);
              const rival = getTeamById(b.teamAId === b.bettingOnTeamId ? b.teamBId : b.teamAId);
              const status =
                b.result === "win"
                  ? "✅ Green"
                  : b.result === "loss"
                  ? "❌ Red"
                  : "⏳ Pendente";
              const powerUpTag =
                b.powerUp === "shield"
                  ? " [🛡️ Escudo]"
                  : b.powerUp === "double"
                  ? " [⚡ Turbo 2X]"
                  : "";
              const vsText = rival ? ` (vs ${rival.name})` : "";
              return `👉 *${team?.name || "Time"}*${vsText}\n   💰 R$ ${b.amount.toFixed(2)} | Odd: ${b.odd.toFixed(2)}${powerUpTag} -> ${status}`;
            })
            .join("\n")
        : "_Nenhuma aposta registrada nesta rodada._";

    return (
`🏈 *NFL BETS DA RESENHA* 🏈
━━━━━━━━━━━━━━━━━━━━
📅 *Rodada #${selectedRound}*
💰 *Pote Geral Acumulado:* R$ ${totalPot.toFixed(2)}
📊 *Resultado:* ${wonBets.length} Green ✅ | ${lossBets.length} Red ❌
━━━━━━━━━━━━━━━━━━━━
🎯 *APOSTAS DA RODADA #${selectedRound}:*

${betsText}

━━━━━━━━━━━━━━━━━━━━
🔒 Trava de Odd: até ${maxOdd}
Acompanhe os resultados no painel do bolão!`
    );
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateWhatsAppText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyImage = async () => {
    if (!cardRef.current || isCopyingImage) return;
    setIsCopyingImage(true);

    try {
      const renderOptions = {
        pixelRatio: 2,
        backgroundColor: "#030712",
        cacheBust: true,
        style: {
          overflow: "hidden",
          height: "auto",
        },
      };

      // Generate PNG blob
      const blob = await toBlob(cardRef.current, renderOptions);

      if (!blob) throw new Error("Não foi possível gerar a imagem");

      // Try copying directly to OS clipboard as image
      if (navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          sounds.playCash();
          setImageCopied(true);
          setTimeout(() => setImageCopied(false), 3000);
          return;
        } catch (clipErr) {
          console.warn("Clipboard write de imagem restrito, disparando download...", clipErr);
        }
      }

      // Fallback: Download the PNG
      const dataUrl = await toPng(cardRef.current, renderOptions);
      const link = document.createElement("a");
      link.download = `nfl-resenha-rodada-${selectedRound}.png`;
      link.href = dataUrl;
      link.click();
      sounds.playCash();
      setImageCopied(true);
      setTimeout(() => setImageCopied(false), 3000);
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
      alert("Não foi possível gerar a imagem automaticamente no navegador.");
    } finally {
      setIsCopyingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h3 className="text-white font-black text-lg flex items-center gap-2">
              <span>📸</span>
              <span>Card de Resenha da Rodada</span>
            </h3>
            <p className="text-gray-400 text-xs">Resumo das apostas e resultados para compartilhar</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl p-1 font-bold">
            ✕
          </button>
        </div>

        {/* Round Filter Tabs */}
        {availableRounds.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-1 flex-shrink-0">
            <span className="text-gray-500 text-xs font-bold uppercase mr-1">Rodada:</span>
            {availableRounds.map((rnd) => (
              <button
                key={rnd}
                type="button"
                onClick={() => setSelectedRound(rnd)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  selectedRound === rnd
                    ? "bg-yellow-400 text-gray-950 font-black shadow-md"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                #{rnd}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable Container for Preview */}
        <div className="overflow-y-auto flex-1 my-2 pr-1">
          <div
            ref={cardRef}
            className="bg-gradient-to-br from-gray-950 via-gray-900 to-red-950/40 border-2 border-yellow-400/40 rounded-3xl p-5 shadow-2xl relative overflow-hidden w-full"
          >
            {/* Top header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🏈</span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-500 block">
                  NFL BETS DA RESENHA
                </span>
                <span className="text-white font-black text-base">Rodada #{selectedRound}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 block uppercase font-bold">Pote Geral</span>
              <span className="text-yellow-400 font-black text-lg">R$ {totalPot.toFixed(2)}</span>
            </div>
          </div>

          {/* Round Bets List */}
          <div className="space-y-2.5 mb-4">
            <div className="flex items-center justify-between">
              <h4 className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">
                Apostas Registradas ({roundBets.length})
              </h4>
            </div>

            {roundBets.length === 0 ? (
              <div className="py-6 text-center text-gray-500 bg-gray-900/60 rounded-2xl border border-gray-800/80">
                <p className="text-xs">Nenhuma aposta registrada na Rodada #{selectedRound}.</p>
              </div>
            ) : (
              roundBets.map((bet) => {
                const team = getTeamById(bet.bettingOnTeamId);
                const rival = getTeamById(
                  bet.teamAId === bet.bettingOnTeamId ? bet.teamBId : bet.teamAId
                );

                const isWin = bet.result === "win";
                const isLoss = bet.result === "loss";
                const isPending = bet.result === "pending";

                return (
                  <div
                    key={bet.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isWin
                        ? "bg-emerald-950/20 border-emerald-500/40"
                        : isLoss
                        ? "bg-red-950/20 border-red-500/40"
                        : "bg-gray-900/80 border-gray-800"
                    }`}
                  >
                    {/* Team Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={getLogoUrl(team, 100)}
                        alt=""
                        crossOrigin="anonymous"
                        className="w-10 h-10 object-contain drop-shadow flex-shrink-0"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white font-black text-sm truncate block">
                            {team?.name || "Time"}
                          </span>
                          {bet.powerUp === "shield" && (
                            <span title="Escudo Anti-Zebra" className="text-xs">
                              🛡️
                            </span>
                          )}
                          {bet.powerUp === "double" && (
                            <span title="Turbo Lucro 2X" className="text-xs">
                              ⚡
                            </span>
                          )}
                        </div>
                        {rival && (
                          <span className="text-[10px] text-gray-400 block truncate">
                            vs {rival.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Values & Result */}
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-white font-black text-xs">
                          R$ {bet.amount.toFixed(2)}
                        </span>
                        <span className="text-yellow-400 font-bold text-[11px] bg-yellow-400/10 px-1.5 py-0.2 rounded border border-yellow-400/30">
                          @{bet.odd.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-1">
                        {isWin && (
                          <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                            ✅ Green
                          </span>
                        )}
                        {isLoss && (
                          <span className="text-[10px] font-black uppercase text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded">
                            ❌ Red
                          </span>
                        )}
                        {isPending && (
                          <span className="text-[10px] font-black uppercase text-yellow-400 bg-yellow-400/15 border border-yellow-400/30 px-1.5 py-0.5 rounded">
                            ⏳ Pendente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Stats row: Green & Red preserved */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-2.5 text-center">
              <span className="text-emerald-400 font-black text-xl block">{wonBets.length}</span>
              <span className="text-gray-400 text-[10px] uppercase font-bold">Greens Batidos</span>
            </div>
            <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-2.5 text-center">
              <span className="text-red-400 font-black text-xl block">{lossBets.length}</span>
              <span className="text-gray-400 text-[10px] uppercase font-bold">Reds da Tristeza</span>
            </div>
          </div>
        </div>
      </div>

        {/* Action buttons: 2 main buttons + close */}
        <div className="space-y-2 flex-shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Button 1: Copy Image to Clipboard */}
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={isCopyingImage}
              className={`py-3 px-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
                imageCopied
                  ? "bg-emerald-500 text-gray-950 shadow-emerald-500/20"
                  : "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-gray-950 shadow-yellow-500/20 hover:scale-[1.02]"
              } disabled:opacity-50`}
            >
              <span className={isCopyingImage ? "animate-spin text-sm" : "text-sm"}>
                {isCopyingImage ? "⏳" : imageCopied ? "✅" : "🖼️"}
              </span>
              <span>
                {isCopyingImage
                  ? "Gerando Imagem..."
                  : imageCopied
                  ? "Imagem Copiada!"
                  : "Copiar Imagem do Card"}
              </span>
            </button>

            {/* Button 2: Copy Formatted Text */}
            <button
              type="button"
              onClick={copyToClipboard}
              className={`py-3 px-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                copied
                  ? "bg-emerald-500 text-gray-950"
                  : "bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 hover:scale-[1.02]"
              }`}
            >
              <span className="text-sm">{copied ? "✅" : "📋"}</span>
              <span>{copied ? "Texto Copiado!" : "Copiar Texto p/ WhatsApp"}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-transparent hover:bg-gray-800 text-gray-500 hover:text-gray-300 font-bold text-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

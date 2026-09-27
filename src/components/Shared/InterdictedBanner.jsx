import { useState } from "react";

export default function InterdictedBanner() {
  const [showLaudo, setShowLaudo] = useState(false);
  const [minimized, setMinimized] = useState(false);

  return (
    <>
      {/* FAIXAS DE INTERDITADO (AMARELO E PRETO) */}
      {!minimized && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {/* Faixa 1 (Superior diagonal esquerda para direita) */}
          <div
            className="absolute -top-3 -left-20 -right-20 py-2 sm:py-2.5 bg-yellow-400 text-black font-black text-xs sm:text-sm uppercase tracking-widest shadow-2xl border-y-4 border-black rotate-[-3deg] select-none flex items-center justify-around drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(0,0,0,0.12) 20px, rgba(0,0,0,0.12) 40px)",
            }}
          >
            <span className="whitespace-nowrap flex items-center gap-3">
              <span>🚧</span>
              <span>INTERDITADO PELA FISCALIZAÇÃO</span>
              <span>⚠️</span>
              <span>BETS BLOQUEADAS</span>
              <span>🚫</span>
              <span>FALÊNCIA COLETIVA</span>
              <span>🚨</span>
              <span>COMISSÁRIO FORAGIDO</span>
              <span>🚧</span>
              <span>PROIBIDO APOSTAR</span>
              <span>⚠️</span>
              <span>INTERDITADO</span>
              <span>🚧</span>
            </span>
            <span className="hidden md:inline-flex whitespace-nowrap items-center gap-3">
              <span>🚧</span>
              <span>PIX SUSPENSO</span>
              <span>⚠️</span>
              <span>SALVE-SE QUEM PUDER</span>
              <span>🚫</span>
              <span>OPERAÇÃO ANTI-ZICA</span>
              <span>🚧</span>
            </span>
          </div>

          {/* Faixa 2 (Cruzada no canto inferior) */}
          <div
            className="absolute -bottom-4 -left-20 -right-20 py-2 sm:py-2.5 bg-yellow-400 text-black font-black text-xs sm:text-sm uppercase tracking-widest shadow-2xl border-y-4 border-black rotate-[2.5deg] select-none flex items-center justify-around drop-shadow-[0_-10px_10px_rgba(0,0,0,0.8)]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(0,0,0,0.12) 20px, rgba(0,0,0,0.12) 40px)",
            }}
          >
            <span className="whitespace-nowrap flex items-center gap-3">
              <span>⚠️</span>
              <span>LOCAL PERICIADO PELA RESENHA</span>
              <span>🚧</span>
              <span>GREEN FOI PROIBIDO</span>
              <span>🚫</span>
              <span>POTE ZERADO</span>
              <span>⚠️</span>
              <span>INTERDITADO</span>
              <span>🚨</span>
              <span>NÃO INSISTA</span>
              <span>🚧</span>
            </span>
            <span className="hidden md:inline-flex whitespace-nowrap items-center gap-3">
              <span>⚠️</span>
              <span>CADÊ O MEU DINHEIRO?</span>
              <span>🚫</span>
              <span>CULPA DO JUIZ</span>
              <span>🚧</span>
            </span>
          </div>
        </div>
      )}

      {/* BOTÃO FLUTUANTE DE ALERTA CÔMICO */}
      <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setShowLaudo(true)}
          className="group bg-yellow-400 hover:bg-yellow-300 text-black font-black px-3.5 py-2 rounded-2xl border-2 border-black shadow-[0_4px_20px_rgba(234,179,8,0.5)] flex items-center gap-2 transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm cursor-pointer"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #facc15, #facc15 10px, #eab308 10px, #eab308 20px)",
          }}
          title="Ver Laudo de Interdição"
        >
          <span className="text-base animate-bounce">🚨</span>
          <span className="bg-black text-yellow-400 px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider">
            SITE INTERDITADO
          </span>
          <span className="text-xs text-black font-extrabold group-hover:underline">Ver Laudo</span>
        </button>

        <button
          type="button"
          onClick={() => setMinimized(!minimized)}
          className="text-[10px] text-gray-400 hover:text-white bg-gray-900/90 hover:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-700 transition-colors backdrop-blur-sm cursor-pointer"
        >
          {minimized ? "Exibir Faixas 🚧" : "Ocultar Faixas 🙈"}
        </button>
      </div>

      {/* MODAL CÔMICO: LAUDO DE INTERDIÇÃO */}
      {showLaudo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-gray-950 border-4 border-yellow-400 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            {/* Faixa Zebrada no topo do modal */}
            <div
              className="h-4 w-full absolute top-0 left-0 border-b-2 border-black"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #000, #000 12px, #facc15 12px, #facc15 24px)",
              }}
            />

            {/* Cabeçalho do Laudo */}
            <div className="text-center mt-2 mb-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-yellow-400 text-black text-3xl mb-2 shadow-lg border-2 border-black rotate-[-4deg]">
                🚫
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-yellow-400 block">
                MINISTÉRIO DA RESENHA & PERDIÇÃO
              </span>
              <h3 className="text-white font-black text-xl leading-tight mt-1">
                AUTO DE INTERDIÇÃO Nº 001/2026
              </h3>
            </div>

            {/* Texto Humorístico */}
            <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-4 text-xs space-y-2.5 text-gray-300 leading-relaxed font-mono">
              <p>
                <strong className="text-yellow-400">CERTIFICA-SE</strong> que, por motivo de bloqueio nacional das bets e sucessivos Reds na última rodada, as atividades financeiras deste recinto encontram-se{" "}
                <span className="text-red-400 font-bold uppercase underline">
                  interditadas por tempo indeterminado
                </span>
                .
              </p>
              <div className="border-t border-gray-800 pt-2 space-y-1 text-[11px]">
                <p>
                  📌 <strong>Motivo oficial:</strong> Bloqueio das bets & falência coletiva dos membros.
                </p>
                <p>
                  🕵️‍♂️ <strong>Comissário:</strong> Visto pela última vez no aeroporto com o pote acumulado.
                </p>
                <p>
                  💸 <strong>Saldo em caixa:</strong> R$ 0,00 e 2 latinhas quentes na geladeira.
                </p>
                <p>
                  🛡️ <strong>Escudos restantes:</strong> Ineficazes contra a Receita Federal.
                </p>
              </div>
              <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-2.5 text-yellow-300 text-[11px]">
                ⚠️ <em>O site, a resenha e o histórico continuam funcionando normalmente para fins de memória afetiva, choro e zoação entre os amigos.</em>
              </div>
            </div>

            {/* Botão de Fechar */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowLaudo(false)}
                className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 border-2 border-black shadow-md cursor-pointer"
              >
                Entendido, vou só olhar a resenha 🍻
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

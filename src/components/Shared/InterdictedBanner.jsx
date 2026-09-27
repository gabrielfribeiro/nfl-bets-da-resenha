import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function InterdictedBanner() {
  const { isAdmin, setShowLoginModal, user } = useAuth();
  // O modal começa fixo na tela
  const [modalDismissed, setModalDismissed] = useState(false);
  const [tapesRemoved, setTapesRemoved] = useState(false);

  return (
    <>
      {/* FAIXAS DE INTERDITADO (AMARELO E PRETO - POSICIONADAS MAIS PARA BAIXO) */}
      {!tapesRemoved && (
        <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
          {/* Faixa 1 (Passando mais abaixo do cabeçalho, cruzando a tela) */}
          <div
            className="absolute top-28 sm:top-36 -left-20 -right-20 py-2.5 sm:py-3.5 bg-yellow-400 text-black font-black text-xs sm:text-sm uppercase tracking-widest shadow-2xl border-y-4 border-black rotate-[-3.5deg] select-none flex items-center justify-around drop-shadow-[0_12px_15px_rgba(0,0,0,0.85)]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(0,0,0,0.14) 20px, rgba(0,0,0,0.14) 40px)",
            }}
          >
            <span className="whitespace-nowrap flex items-center gap-3">
              <span>🚧</span>
              <span>INTERDITADO PELA FISCALIZAÇÃO</span>
              <span>⚠️</span>
              <span>FAZ O L DO LOSS</span>
              <span>🚩</span>
              <span>BETS BLOQUEADAS</span>
              <span>💸</span>
              <span>TAXAÇÃO DE 92% NO GREEN</span>
              <span>🚨</span>
              <span>POTE ESTATIZADO</span>
              <span>🚧</span>
              <span>COMISSÁRIO EM FUGA</span>
              <span>⚠️</span>
              <span>INTERDITADO</span>
              <span>🚧</span>
            </span>
            <span className="hidden md:inline-flex whitespace-nowrap items-center gap-3">
              <span>🚩</span>
              <span>FEZ O L E O KICKER ZICOU</span>
              <span>⚠️</span>
              <span>SALVE-SE QUEM PUDER</span>
              <span>🚫</span>
              <span>AUDITORIA DA RESENHA</span>
              <span>🚧</span>
            </span>
          </div>

          {/* Faixa 2 (Passando mais abaixo, perto da base) */}
          <div
            className="absolute bottom-24 sm:bottom-32 -left-20 -right-20 py-2.5 sm:py-3.5 bg-yellow-400 text-black font-black text-xs sm:text-sm uppercase tracking-widest shadow-2xl border-y-4 border-black rotate-[3deg] select-none flex items-center justify-around drop-shadow-[0_-12px_15px_rgba(0,0,0,0.85)]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(0,0,0,0.14) 20px, rgba(0,0,0,0.14) 40px)",
            }}
          >
            <span className="whitespace-nowrap flex items-center gap-3">
              <span>⚠️</span>
              <span>LOCAL PERICIADO PELA RESENHA</span>
              <span>🚧</span>
              <span>O GREEN FOI PROIBIDO</span>
              <span>🚩</span>
              <span>FAZ O L QUE PASSA</span>
              <span>🚫</span>
              <span>POTE RETIDO PELO HADDAD</span>
              <span>⚠️</span>
              <span>INTERDITADO</span>
              <span>🚨</span>
              <span>NÃO INSISTA</span>
              <span>🚧</span>
            </span>
            <span className="hidden md:inline-flex whitespace-nowrap items-center gap-3">
              <span>🚩</span>
              <span>IMPOSTO DO AMOR SOBRE AS ODDS</span>
              <span>🚫</span>
              <span>PAGUE O COMISSÁRIO</span>
              <span>🚧</span>
            </span>
          </div>
        </div>
      )}

      {/* BOTÃO FLUTUANTE CASO O COMISSÁRIO JÁ TENHA FECHADO O MODAL */}
      {modalDismissed && (
        <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => setModalDismissed(false)}
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
            <span className="text-xs text-black font-extrabold group-hover:underline">Reabrir Laudo</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setTapesRemoved(!tapesRemoved)}
              className="text-[10px] text-yellow-300 hover:text-yellow-200 bg-gray-950/90 px-2.5 py-1 rounded-lg border border-yellow-500/40 transition-colors backdrop-blur-sm cursor-pointer"
            >
              {tapesRemoved ? "Colocar Faixas 🚧" : "Tirar Faixas Definitivo 👑"}
            </button>
          )}
        </div>
      )}

      {/* MODAL FIXO DE INTERDIÇÃO (BLOQUEADO: SOMENTE O COMISSÁRIO PODE FECHAR) */}
      {!modalDismissed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-gray-950 border-4 border-yellow-400 text-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-[0_0_50px_rgba(234,179,8,0.35)] relative overflow-hidden my-auto">
            {/* Faixa Zebrada no topo do modal */}
            <div
              className="h-5 w-full absolute top-0 left-0 border-b-2 border-black"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #000, #000 14px, #facc15 14px, #facc15 28px)",
              }}
            />

            {/* Cabeçalho do Laudo */}
            <div className="text-center mt-3 mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-400 text-black text-4xl mb-2.5 shadow-xl border-3 border-black rotate-[-4deg]">
                🚫
              </div>
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-yellow-400 block">
                MINISTÉRIO DA RESENHA & ARRECADAÇÃO
              </span>
              <h2 className="text-white font-black text-xl sm:text-2xl leading-tight mt-1">
                AUTO DE INTERDIÇÃO Nº 013/2026
              </h2>
              <span className="inline-block mt-1 px-3 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-black uppercase tracking-wide">
                ⚖️ Operação "Faz o L do Loss"
              </span>
            </div>

            {/* Texto Humorístico com Piadas do L e das Bets Bloqueadas */}
            <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-4 text-xs space-y-3 text-gray-300 leading-relaxed font-mono">
              <p>
                <strong className="text-yellow-400">CERTIFICA-SE</strong> que, por determinação superior após o bloqueio nacional das bets e aplicação imediata da <span className="text-red-400 font-bold uppercase underline">Taxação do Amor</span>, todas as atividades deste bolão estão <strong>INTERDITADAS</strong>.
              </p>

              <div className="border-t border-gray-800 pt-2.5 space-y-2 text-[11px]">
                <div className="flex items-start gap-2">
                  <span className="text-base flex-shrink-0">🚩</span>
                  <div>
                    <strong className="text-white">Fizeram o L:</strong> Foi constatado que um membro fez o L antes do quarto período. O kicker adversário zicou imediatamente e a Receita Federal confiscou o retorno potencial.
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-base flex-shrink-0">💸</span>
                  <div>
                    <strong className="text-white">Taxa do Haddad (92%):</strong> Cada Green agora sofre retenção na fonte para financiar o programa <em>"Minha Bet Minha Vida"</em>. Lucro líquido restante: R$ 0,14 e um pastel de vento.
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-base flex-shrink-0">🕵️‍♂️</span>
                  <div>
                    <strong className="text-white">O Comissário:</strong> Foi visto fugindo com o pote da liga em direção a Cancún num voo de madrugada.
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-base flex-shrink-0">🛡️</span>
                  <div>
                    <strong className="text-white">Escudo Anti-Zebra:</strong> Declarado ineficaz contra portarias ministeriais e bloqueios de DNS da Anatel.
                  </div>
                </div>
              </div>

              <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-2.5 text-yellow-300 text-[11px]">
                ⚠️ <em>Status do Pote: Estatizado. Qualquer reclamação deve ser enviada com comprovante de pix e certidão negativa de Red.</em>
              </div>
            </div>

            {/* SEÇÃO DE CONTROLE: APENAS O COMISSÁRIO PODE FECHAR */}
            <div className="mt-5 pt-3 border-t border-gray-800/80">
              {isAdmin ? (
                <div className="space-y-2">
                  <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-2.5 text-center">
                    <span className="text-xs text-emerald-400 font-black block">
                      👑 Bem-vindo, Comissário ({user?.displayName || user?.email || "Admin"})!
                    </span>
                    <span className="text-[10px] text-emerald-500/80 font-medium">
                      Você possui autoridade suprema para quebrar o lacre e desinterditar o site.
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setModalDismissed(true)}
                      className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-emerald-500/20 cursor-pointer"
                    >
                      🔓 Desinterditar o Recinto (Liberar Painel)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalDismissed(true);
                        setTapesRemoved(true);
                      }}
                      className="py-3 px-3.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 border-2 border-black cursor-pointer"
                      title="Fechar Laudo e Tirar Todas as Faixas"
                    >
                      🧹 Limpar Tudo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 text-center">
                  <div className="p-2.5 bg-red-950/30 border border-red-500/30 rounded-xl text-center">
                    <span className="text-xs text-red-400 font-black block flex items-center justify-center gap-1.5">
                      <span>🔒</span>
                      <span>LOCAL LACRADO POR DECISÃO DA DIRETORIA</span>
                    </span>
                    <span className="text-[11px] text-gray-400 mt-0.5 block">
                      Apenas o <strong>Comissário oficial</strong> possui a chave deste cadeado para retirar a interdição.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (setShowLoginModal) setShowLoginModal(true);
                    }}
                    className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 border-2 border-black shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>🔑</span>
                    <span>É o Comissário? Entrar com a Chave do Pote</span>
                  </button>

                  <p className="text-[10px] text-gray-500 italic">
                    Participantes comuns: favor fazer o L e aguardar o julgamento do recurso.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

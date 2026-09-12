import { useState } from "react";
import { useBet } from "../../context/BetContext";
import { useAuth } from "../../context/AuthContext";
import { ROLES_GUIDE } from "../../data/rolesGuide";

export default function Rules({ onOpenTab }) {
  const { maxOdd, INITIAL_POT, powerUpsList, currentRound } = useBet();
  const { isAdmin, isModerator } = useAuth();
  const [activeSection, setActiveSection] = useState("rules"); // 'rules' | 'roles' | 'powers' | 'faq'
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");

  const displayedRoles =
    selectedRoleFilter === "all"
      ? ROLES_GUIDE
      : ROLES_GUIDE.filter((r) => r.id === selectedRoleFilter);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-2xl shadow-sm">
              📜
            </div>
            <div>
              <h2 className="text-white font-black text-2xl sm:text-3xl tracking-tight">
                Regras & Governança da Liga
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
                Regulamento oficial, funcionamento dos potes, cartas especiais e permissões
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenTab && (
            <button
              type="button"
              onClick={() => onOpenTab("dashboard")}
              className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 font-bold text-xs border border-gray-800 transition-all flex items-center gap-1.5"
            >
              <span>🏠</span>
              <span>Dashboard</span>
            </button>
          )}
          {onOpenTab && (
            <button
              type="button"
              onClick={() => onOpenTab("new-bet")}
              className="px-3.5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xs transition-all shadow-md shadow-yellow-400/10 flex items-center gap-1.5"
            >
              <span>➕</span>
              <span>Nova Aposta</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Section Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-900 p-1.5 rounded-2xl border border-gray-800 shadow-xl">
        {[
          { id: "rules", label: "Regras Oficiais", icon: "📜" },
          { id: "roles", label: "Papéis & Permissões", icon: "🛡️" },
          { id: "powers", label: "Cartas & Poderes", icon: "⚡" },
          { id: "faq", label: "Dúvidas Frequentes", icon: "❓" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSection(tab.id)}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all ${
              activeSection === tab.id
                ? "bg-yellow-400 text-gray-950 shadow-md shadow-yellow-400/20"
                : "text-gray-400 hover:text-white hover:bg-gray-800/60"
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO 1: REGRAS OFICIAIS DO BOLÃO */}
      {/* ========================================================================= */}
      {activeSection === "rules" && (
        <div className="space-y-6">
          {/* Card: Como Funciona o Bolão */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-800">
              <span className="text-2xl">🏈</span>
              <div>
                <h3 className="text-white font-black text-base sm:text-lg">
                  Como Funciona o NFL Bets da Resenha?
                </h3>
                <p className="text-gray-400 text-xs">
                  Competição estratégica entre participantes com gestão de pote e progressão de patrimônio
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-gray-950/60 border border-gray-800 space-y-2">
                <span className="text-sm font-black text-yellow-400 flex items-center gap-1.5">
                  <span>💰</span> 1. O Pote Inicial
                </span>
                <p className="text-gray-300 leading-relaxed">
                  Cada um dos <strong>16 times participantes</strong> começa a temporada com um pote inicial de{" "}
                  <strong className="text-white">R$ {INITIAL_POT?.toFixed(2) || "1,00"}</strong>. O objetivo de cada apostador é gerenciar o saldo de seus times, acumular lucros rodada a rodada e alcançar o maior patrimônio até o Super Bowl!
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-950/60 border border-gray-800 space-y-2">
                <span className="text-sm font-black text-yellow-400 flex items-center gap-1.5">
                  <span>📏</span> 2. Regra da Aposta Mínima
                </span>
                <p className="text-gray-300 leading-relaxed">
                  A aposta mínima de cada rodada é sempre o <strong>valor total do pote do time</strong>. Isso garante que o jogo seja progressivo, dinâmico e que todo o saldo acumulado esteja em risco a cada palpite.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-950/60 border border-gray-800 space-y-2">
                <span className="text-sm font-black text-emerald-400 flex items-center gap-1.5">
                  <span>📈</span> 3. Bateu o Palpite (Green)
                </span>
                <p className="text-gray-300 leading-relaxed">
                  Quando a aposta bate, o pote do time recebe o <strong>lucro líquido da aposta</strong>:
                  <code className="block mt-1 p-2 rounded-lg bg-black/50 text-emerald-300 font-mono text-[11px]">
                    Lucro = Valor Apostado × (Odd - 1) [× Multiplicador se houver]
                  </code>
                  O patrimônio do time sobe e o ranking da Dashboard é recalculado automaticamente!
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-950/60 border border-gray-800 space-y-2">
                <span className="text-sm font-black text-red-400 flex items-center gap-1.5">
                  <span>📉</span> 4. Deu Zebra (Red)
                </span>
                <p className="text-gray-300 leading-relaxed">
                  Se a aposta não bater, o valor apostado é <strong>descontado do pote</strong>. Caso o participante tenha ativado a carta{" "}
                  <strong className="text-cyan-400">🛡️ Escudo Anti-Zebra</strong>, o pote fica totalmente protegido e não sofre desconto!
                </p>
              </div>
            </div>
          </div>

          {/* Diretrizes de Apostas e Limites */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-800">
              <span className="text-2xl">⚖️</span>
              <div>
                <h3 className="text-white font-black text-base sm:text-lg">
                  Limites, Odds e Resoluções
                </h3>
                <p className="text-gray-400 text-xs">
                  Parâmetros de integridade e justiça da liga
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-gray-950/80 border border-yellow-500/20 space-y-1 text-center">
                <span className="text-xs text-gray-400 font-bold block uppercase">Odd Máxima Permitida</span>
                <span className="text-yellow-400 font-black text-2xl block">
                  @{maxOdd ? maxOdd.toFixed(2) : "1.50"}
                </span>
                <span className="text-[11px] text-gray-500 block">
                  Evita apostas aleatórias de risco irreal
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-950/80 border border-gray-800 space-y-1 text-center">
                <span className="text-xs text-gray-400 font-bold block uppercase">Confrontos por Rodada</span>
                <span className="text-white font-black text-2xl block">1 Aposta</span>
                <span className="text-[11px] text-gray-500 block">
                  No máximo uma única aposta por partida da NFL
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-950/80 border border-purple-500/20 space-y-1 text-center">
                <span className="text-xs text-purple-300 font-bold block uppercase">Quem Resolve?</span>
                <span className="text-purple-300 font-black text-2xl block">Comissários</span>
                <span className="text-[11px] text-gray-500 block">
                  Apenas Comissários e Moderadores marcam Greens/Reds
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO 2: MATRIZ DE PAPÉIS & PERMISSÕES */}
      {/* ========================================================================= */}
      {activeSection === "roles" && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-xl">
                  🛡️
                </div>
                <div>
                  <h3 className="text-white font-black text-base sm:text-lg">
                    Matriz de Papéis & Níveis de Acesso
                  </h3>
                  <p className="text-gray-400 text-xs">
                    Entenda detalhadamente o que cada perfil pode acessar e executar no sistema
                  </p>
                </div>
              </div>

              {/* Botão para Comissários gerenciarem */}
              {isAdmin && onOpenTab && (
                <button
                  type="button"
                  onClick={() => onOpenTab("users")}
                  className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xs transition-all shadow-md shadow-yellow-400/20 flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <span>👥 Painel de Usuários</span>
                  <span>➜</span>
                </button>
              )}
            </div>

            {/* Role Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedRoleFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedRoleFilter === "all"
                    ? "bg-yellow-400 text-gray-950 font-black shadow-md shadow-yellow-400/10"
                    : "bg-gray-950 text-gray-400 hover:text-white border border-gray-800"
                }`}
              >
                Todos ({ROLES_GUIDE.length})
              </button>
              {ROLES_GUIDE.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleFilter(role.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedRoleFilter === role.id
                      ? "bg-gray-800 text-white border border-gray-600 shadow-md"
                      : "bg-gray-950 text-gray-400 hover:text-white border border-gray-800"
                  }`}
                >
                  <span>{role.icon}</span>
                  <span>{role.shortName}</span>
                </button>
              ))}
            </div>

            {/* List of Detailed Role Cards */}
            <div className="space-y-3 pt-2">
              {displayedRoles.map((role) => (
                <div
                  key={role.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${role.containerBg} ${role.borderColor} space-y-3`}
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${role.iconBg}`}
                      >
                        {role.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-black text-sm sm:text-base">
                            {role.name}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${role.badgeColor}`}
                          >
                            {role.badge}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">
                          {role.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Telas Acessíveis */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">
                      🖥️ Telas & Módulos Acessíveis:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {role.screens.map((scr, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-black/50 border border-white/5 text-[11px] text-gray-300 font-medium"
                        >
                          {scr}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* O que pode fazer */}
                  <div>
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

                  {/* O que NÃO pode fazer */}
                  {role.cannotDo && role.cannotDo.length > 0 && (
                    <div className="pt-2 border-t border-white/5">
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO 3: CARTAS E PODERES ESPECIAIS */}
      {/* ========================================================================= */}
      {activeSection === "powers" && (
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-800">
              <span className="text-2xl">⚡</span>
              <div>
                <h3 className="text-white font-black text-base sm:text-lg">
                  Cartas de Poder & Efeitos Especiais
                </h3>
                <p className="text-gray-400 text-xs">
                  Recursos táticos para maximizar lucros e se proteger de zebras da rodada
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {powerUpsList && powerUpsList.length > 0 ? (
                powerUpsList.map((power) => (
                  <div
                    key={power.id}
                    className="p-5 rounded-2xl bg-gray-950/80 border border-gray-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-2xl">
                          {power.icon}
                        </div>
                        <div>
                          <h4 className="text-white font-black text-sm">{power.name}</h4>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">
                            Tipo: {power.type === "multiplier" ? "Multiplicador de Lucro" : "Proteção de Saldo"}
                          </span>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-yellow-400/10 text-yellow-400 border border-yellow-400/30">
                        {power.quantity}x disponíveis
                      </span>
                    </div>

                    <p className="text-gray-300 text-xs leading-relaxed">
                      {power.description}
                    </p>

                    <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400">
                      <span>Como usar:</span>
                      <span className="text-white font-semibold">
                        Selecione na tela de Nova Aposta
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-8 text-gray-500 text-xs">
                  Nenhum poder ativo cadastrado no momento.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO 4: DÚVIDAS FREQUENTES (FAQ) */}
      {/* ========================================================================= */}
      {activeSection === "faq" && (
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-800">
            <span className="text-2xl">❓</span>
            <div>
              <h3 className="text-white font-black text-base sm:text-lg">
                Perguntas Frequentes (FAQ)
              </h3>
              <p className="text-gray-400 text-xs">
                Tire suas dúvidas sobre o funcionamento das apostas e da plataforma
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-2xl bg-gray-950/60 border border-gray-800 space-y-1.5">
              <strong className="text-yellow-400 font-bold text-sm block">
                Quem pode marcar o resultado (Green ou Red) de uma aposta?
              </strong>
              <p className="text-gray-300 leading-relaxed">
                Apenas usuários com papel de <strong>👑 Comissário</strong> ou <strong>⭐ Moderador</strong> possuem permissão para consolidar o resultado de uma aposta. O sistema registra automaticamente quem foi o autor da resolução para total transparência no Histórico.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-950/60 border border-gray-800 space-y-1.5">
              <strong className="text-yellow-400 font-bold text-sm block">
                Como os placares dos jogos são atualizados?
              </strong>
              <p className="text-gray-300 leading-relaxed">
                Os placares, quartos de jogo, tempo restante e canais de transmissão são sincronizados em tempo real diretamente com a API oficial da <strong>ESPN</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-950/60 border border-gray-800 space-y-1.5">
              <strong className="text-yellow-400 font-bold text-sm block">
                Posso apostar mais de uma vez no mesmo jogo da NFL?
              </strong>
              <p className="text-gray-300 leading-relaxed">
                Não. Para manter a integridade da rodada, o sistema bloqueia apostas duplicadas no mesmo confronto. Cada jogo da NFL aceita apenas um único palpite.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-950/60 border border-gray-800 space-y-1.5">
              <strong className="text-yellow-400 font-bold text-sm block">
                Como solicito a alteração do meu time vinculado ou meu papel?
              </strong>
              <p className="text-gray-300 leading-relaxed">
                Basta falar com um dos <strong>👑 Comissários</strong> da liga. Eles podem atribuir qualquer um dos 16 times da liga ao seu perfil ou promover seu usuário através da tela de Gestão de Usuários.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

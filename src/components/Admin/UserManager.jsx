import { useState, useEffect } from "react";
import { useAuth, ADMIN_EMAILS } from "../../context/AuthContext";
import { useBet } from "../../context/BetContext";
import {
  subscribeToUsers,
  updateUserRole,
  updateUserTeam,
} from "../../services/firebase";
import { getTeamById, getLogoUrl } from "../../data/nflTeams";
import { ROLES_GUIDE } from "../../data/rolesGuide";

export default function UserManager({ onBack }) {
  const { user: currentUser, isAdmin } = useAuth();
  const { selectedTeamIds } = useBet();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all"); // 'all' | 'admin' | 'member' | 'blocked'
  const [actionLoading, setActionLoading] = useState({});
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const [showRolesGuide, setShowRolesGuide] = useState(false);

  // Subscribe in real-time to users collection
  useEffect(() => {
    const unsubscribe = subscribeToUsers(
      (userList) => {
        setUsers(userList);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar usuários:", err);
        setFeedback({
          type: "error",
          message: "Erro ao sincronizar lista de usuários com o Firestore.",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const showToast = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleRoleChange = async (targetUser, newRole) => {
    const isMaster = ADMIN_EMAILS.includes(targetUser.email?.toLowerCase());
    if (isMaster && newRole !== "admin") {
      showToast("error", "O Comissário Master não pode ser rebaixado nem bloqueado.");
      return;
    }

    if (targetUser.uid === currentUser?.uid && newRole === "blocked") {
      if (!confirm("Atenção: você está prestes a bloquear sua própria conta. Deseja continuar?")) {
        return;
      }
    }

    setActionLoading((prev) => ({ ...prev, [targetUser.uid]: true }));
    try {
      await updateUserRole(targetUser.uid, newRole);
      const roleLabels = {
        admin: "👑 Comissário",
        moderator: "⭐ Moderador",
        member: "🏈 Apostador",
        viewer: "👀 Convidado",
        blocked: "🚫 Bloqueado",
      };
      showToast(
        "success",
        `Papel de "${targetUser.displayName || targetUser.email}" atualizado para ${
          roleLabels[newRole] || newRole
        }!`
      );
    } catch (err) {
      console.error(err);
      showToast("error", "Falha ao atualizar papel do usuário.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUser.uid]: false }));
    }
  };

  const handleTeamChange = async (targetUser, teamId) => {
    setActionLoading((prev) => ({ ...prev, [`team_${targetUser.uid}`]: true }));
    try {
      await updateUserTeam(targetUser.uid, teamId || null);
      showToast(
        "success",
        `Time de "${targetUser.displayName || targetUser.email}" atualizado!`
      );
    } catch (err) {
      console.error(err);
      showToast("error", "Falha ao vincular time.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [`team_${targetUser.uid}`]: false }));
    }
  };

  // Guard: Se não for admin, bloqueia visualização
  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 text-3xl flex items-center justify-center mx-auto mb-4 text-red-400">
          🔒
        </div>
        <h2 className="text-white font-black text-2xl mb-2">Acesso Restrito ao Comissário</h2>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          Esta tela de gerenciamento de permissões e usuários é exclusiva para quem possui papel de <strong>👑 Comissário (Admin)</strong>.
        </p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl bg-yellow-400 text-gray-950 font-black text-xs hover:bg-yellow-300 transition-all shadow-md"
          >
            ← Voltar ao Dashboard
          </button>
        )}
      </div>
    );
  }

  // Filtragem de Usuários
  const filteredUsers = users.filter((u) => {
    const isMaster = ADMIN_EMAILS.includes(u.email?.toLowerCase());
    const effectiveRole = isMaster ? "admin" : u.role || "viewer";

    const matchesRole =
      roleFilter === "all" ||
      (roleFilter === "admin" && effectiveRole === "admin") ||
      (roleFilter === "moderator" && effectiveRole === "moderator") ||
      (roleFilter === "member" && effectiveRole === "member") ||
      (roleFilter === "viewer" && effectiveRole === "viewer") ||
      (roleFilter === "blocked" && effectiveRole === "blocked");

    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      (u.displayName && u.displayName.toLowerCase().includes(searchLower)) ||
      (u.email && u.email.toLowerCase().includes(searchLower));

    return matchesRole && matchesSearch;
  });

  // Estatísticas
  const totalCount = users.length;
  const adminCount = users.filter(
    (u) => ADMIN_EMAILS.includes(u.email?.toLowerCase()) || u.role === "admin"
  ).length;
  const moderatorCount = users.filter(
    (u) => !ADMIN_EMAILS.includes(u.email?.toLowerCase()) && u.role === "moderator"
  ).length;
  const blockedCount = users.filter(
    (u) => !ADMIN_EMAILS.includes(u.email?.toLowerCase()) && u.role === "blocked"
  ).length;
  const viewerCount = users.filter(
    (u) => !ADMIN_EMAILS.includes(u.email?.toLowerCase()) && u.role === "viewer"
  ).length;
  const memberCount = Math.max(0, totalCount - adminCount - moderatorCount - viewerCount - blockedCount);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-9 h-9 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white flex items-center justify-center text-sm font-bold transition-colors"
                title="Voltar"
              >
                ←
              </button>
            )}
            <h2 className="text-white font-black text-2xl sm:text-3xl tracking-tight flex items-center gap-2.5">
              <span>👥</span>
              <span>Gestão de Usuários & Acessos</span>
            </h2>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm mt-1.5">
            Visualize todos os participantes, promova comissários e revogue ou restaure permissões de aposta.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 rounded-xl text-xs font-black">
            👑 Painel do Comissário
          </span>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-2xl border flex items-center gap-3 transition-all animate-in fade-in duration-150 ${
            feedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-red-950/40 border-red-500/40 text-red-300"
          }`}
        >
          <span className="text-xl">{feedback.type === "success" ? "✅" : "⚠️"}</span>
          <span className="text-xs sm:text-sm font-semibold">{feedback.message}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3.5 shadow-sm">
          <span className="text-[11px] text-gray-400 font-semibold block">Total Usuários</span>
          <span className="text-white font-black text-2xl block mt-1">{totalCount}</span>
        </div>

        <div className="bg-gray-900 border border-yellow-500/30 rounded-2xl p-3.5 shadow-sm">
          <span className="text-[11px] text-yellow-400 font-semibold block">👑 Comissários</span>
          <span className="text-yellow-400 font-black text-2xl block mt-1">{adminCount}</span>
        </div>

        <div className="bg-gray-900 border border-purple-500/30 rounded-2xl p-3.5 shadow-sm">
          <span className="text-[11px] text-purple-300 font-semibold block">⭐ Moderadores</span>
          <span className="text-purple-300 font-black text-2xl block mt-1">{moderatorCount}</span>
        </div>

        <div className="bg-gray-900 border border-emerald-500/30 rounded-2xl p-3.5 shadow-sm">
          <span className="text-[11px] text-emerald-400 font-semibold block">🏈 Apostadores</span>
          <span className="text-emerald-400 font-black text-2xl block mt-1">{memberCount}</span>
        </div>

        <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-3.5 shadow-sm">
          <span className="text-[11px] text-red-400 font-semibold block">🚫 Bloqueados</span>
          <span className="text-red-400 font-black text-2xl block mt-1">{blockedCount}</span>
        </div>
      </div>

      {/* Collapsible Roles Cheat-sheet */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setShowRolesGuide(!showRolesGuide)}
          className="w-full p-3.5 rounded-2xl bg-gray-900 border border-gray-800 hover:border-yellow-500/30 flex items-center justify-between text-xs font-bold transition-all shadow-sm group"
        >
          <div className="flex items-center gap-2 text-gray-300 group-hover:text-white">
            <span className="text-base">🛡️</span>
            <span>Dúvida sobre permissões? Clique para ver o que cada papel pode fazer e acessar</span>
          </div>
          <span className="text-yellow-400 font-bold flex items-center gap-1">
            <span>{showRolesGuide ? "Ocultar Guia ▲" : "Ver Guia de Permissões ▼"}</span>
          </span>
        </button>

        {showRolesGuide && (
          <div className="mt-3 p-4 rounded-3xl bg-gray-900/90 border border-gray-800 space-y-3 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ROLES_GUIDE.map((role) => (
                <div
                  key={role.id}
                  className={`p-3.5 rounded-2xl border ${role.containerBg} ${role.borderColor} space-y-2 text-xs`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{role.icon}</span>
                      <span className="font-bold text-white text-sm">{role.name}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${role.badgeColor}`}>
                      {role.shortName}
                    </span>
                  </div>
                  <p className="text-gray-400 text-[11px] leading-relaxed">{role.description}</p>

                  <div className="pt-2 border-t border-white/5 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-400 block uppercase">Pode:</span>
                    <ul className="text-gray-300 text-[11px] space-y-0.5">
                      {role.canDo.slice(0, 3).map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-400">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {role.cannotDo && role.cannotDo.length > 0 && (
                    <div className="pt-1.5 border-t border-white/5 space-y-0.5">
                      <span className="text-[10px] font-bold text-red-400 block uppercase">Não pode:</span>
                      <ul className="text-gray-400 text-[11px] space-y-0.5">
                        {role.cannotDo.slice(0, 2).map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-red-400">✕</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-4 sm:p-5 shadow-xl mb-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-yellow-400 placeholder:text-gray-600 transition-colors"
            />
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-gray-950 p-1 rounded-xl border border-gray-800 overflow-x-auto">
            {[
              { id: "all", label: `Todos (${totalCount})` },
              { id: "admin", label: `Comissários (${adminCount})` },
              { id: "moderator", label: `Moderadores (${moderatorCount})` },
              { id: "member", label: `Apostadores (${memberCount})` },
              { id: "viewer", label: `Convidados (${viewerCount})` },
              { id: "blocked", label: `Bloqueados (${blockedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  roleFilter === tab.id
                    ? "bg-yellow-400 text-gray-950 font-black shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            <span className="animate-spin inline-block text-2xl mb-2">⏳</span>
            <p>Carregando usuários do Firestore...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            <span className="text-3xl block mb-2">👥</span>
            <p className="text-white font-bold mb-1">Nenhum usuário encontrado</p>
            <p className="text-xs">Tente ajustar o termo da busca ou os filtros de papel.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/80">
            {filteredUsers.map((u) => {
              const isMaster = ADMIN_EMAILS.includes(u.email?.toLowerCase());
              const effectiveRole = isMaster ? "admin" : u.role || "viewer";
              const isBlocked = effectiveRole === "blocked";
              const isCurrentUser = u.uid === currentUser?.uid;
              const isBusy = actionLoading[u.uid];
              const assignedTeam = u.teamId ? getTeamById(u.teamId) : null;

              return (
                <div
                  key={u.uid}
                  className={`p-4 sm:p-5 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    isBlocked
                      ? "bg-red-950/10 hover:bg-red-950/20"
                      : "hover:bg-gray-950/40"
                  }`}
                >
                  {/* User Profile info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Avatar */}
                    {u.photoURL ? (
                      <img
                        src={u.photoURL}
                        alt=""
                        className="w-11 h-11 rounded-2xl object-cover border border-white/10 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-yellow-500 text-gray-950 font-black text-base flex items-center justify-center shadow-md shadow-amber-500/10 flex-shrink-0">
                        {(u.displayName || u.email || "U")[0].toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-black text-sm sm:text-base truncate">
                          {u.displayName || u.email?.split("@")[0]}
                        </span>

                        {isCurrentUser && (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Você
                          </span>
                        )}

                        {/* Role Badge */}
                        {isMaster ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-yellow-400 text-gray-950 shadow-sm">
                            👑 Comissário Master
                          </span>
                        ) : effectiveRole === "admin" ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                            👑 Comissário
                          </span>
                        ) : effectiveRole === "moderator" ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            ⭐ Moderador
                          </span>
                        ) : effectiveRole === "viewer" ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gray-800 text-gray-300 border border-gray-700">
                            👀 Convidado
                          </span>
                        ) : isBlocked ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30">
                            🚫 Acesso Revogado
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            🏈 Apostador
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                        <span className="text-gray-400">{u.email}</span>
                        {u.createdAt && (
                          <>
                            <span className="text-gray-600">•</span>
                            <span className="text-gray-500 text-[11px]">
                              Desde {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Team link & Role controls */}
                  <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap justify-between lg:justify-end pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-800">
                    {/* Team Selector (Vincular Time) */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400 font-semibold hidden sm:inline">
                        Time:
                      </span>
                      <div className="flex items-center gap-1.5 bg-gray-950 border border-gray-800 rounded-xl px-2.5 py-1.5">
                        {assignedTeam && (
                          <img
                            src={getLogoUrl(assignedTeam)}
                            alt=""
                            className="w-5 h-5 object-contain flex-shrink-0"
                          />
                        )}
                        <select
                          value={u.teamId || ""}
                          disabled={actionLoading[`team_${u.uid}`]}
                          onChange={(e) => handleTeamChange(u, e.target.value)}
                          className="bg-transparent text-xs text-white font-bold focus:outline-none cursor-pointer max-w-[130px] truncate"
                        >
                          <option value="" className="bg-gray-900 text-gray-400">
                            Sem time
                          </option>
                          {selectedTeamIds.map((tid) => {
                            const team = getTeamById(tid);
                            return (
                              <option key={tid} value={tid} className="bg-gray-900 text-white">
                                {team?.name || tid.toUpperCase()}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    {/* Role Dropdown */}
                    <div className="flex items-center gap-2">
                      {isMaster ? (
                        <span className="text-[11px] text-yellow-400 font-bold px-3 py-1.5 rounded-xl bg-yellow-400/10 border border-yellow-400/20">
                          🔒 Imutável
                        </span>
                      ) : (
                        <select
                          value={effectiveRole}
                          disabled={isBusy}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          className={`text-xs font-bold rounded-xl px-3 py-1.5 border focus:outline-none transition-all cursor-pointer ${
                            effectiveRole === "admin"
                              ? "bg-yellow-400/20 text-yellow-300 border-yellow-400/40"
                              : effectiveRole === "moderator"
                              ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                              : isBlocked
                              ? "bg-red-500/20 text-red-300 border-red-500/40"
                              : effectiveRole === "viewer"
                              ? "bg-gray-900 text-gray-300 border-gray-700"
                              : "bg-gray-950 text-emerald-400 border-gray-800"
                          }`}
                        >
                          <option value="member" className="bg-gray-900 text-white">
                            🏈 Apostador (Membro)
                          </option>
                          <option value="moderator" className="bg-gray-900 text-purple-300">
                            ⭐ Moderador (Mod)
                          </option>
                          <option value="admin" className="bg-gray-900 text-yellow-400">
                            👑 Comissário (Admin)
                          </option>
                          <option value="viewer" className="bg-gray-900 text-gray-300">
                            👀 Convidado (Leitura)
                          </option>
                          <option value="blocked" className="bg-gray-900 text-red-400">
                            🚫 Revogado (Bloqueado)
                          </option>
                        </select>
                      )}

                      {/* Quick Revoke / Restore Button */}
                      {!isMaster && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            handleRoleChange(u, isBlocked ? "member" : "blocked")
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border whitespace-nowrap shadow-sm active:scale-95 disabled:opacity-50 ${
                            isBlocked
                              ? "bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-gray-950 border-emerald-500/30"
                              : "bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border-red-500/30"
                          }`}
                        >
                          {isBusy ? (
                            "..."
                          ) : isBlocked ? (
                            "Restaurar 🟢"
                          ) : (
                            "Revogar 🚫"
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

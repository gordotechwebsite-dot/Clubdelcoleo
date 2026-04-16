import { useEffect, useState } from "react";
import { api, getUser, setUser } from "../lib/api";
import { User, Mail, Phone, Lock, BarChart3, Trophy, AlertTriangle, Shield } from "lucide-react";

interface ProfileStats {
  total_bets: number;
  won_bets: number;
  lost_bets: number;
  pending_bets: number;
  total_wagered: number;
  total_won: number;
  net_result: number;
}

export default function ProfilePage() {
  const user = getUser();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "stats" | "responsible">("profile");
  const [excludeDays, setExcludeDays] = useState(7);
  const [excluding, setExcluding] = useState(false);

  useEffect(() => {
    api.getProfileStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const showMsg = (m: string) => { setMsg(m); setError(""); setTimeout(() => setMsg(""), 4000); };
  const showErr = (m: string) => { setError(m); setMsg(""); };

  const handleUpdateProfile = async () => {
    try {
      await api.updateProfile({ full_name: fullName, phone, email });
      const me = await api.getMe();
      setUser(me);
      showMsg("Perfil actualizado exitosamente");
    } catch (err) {
      showErr(err instanceof Error ? err.message : "Error al actualizar");
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) { showErr("Completa todos los campos"); return; }
    if (newPassword.length < 6) { showErr("La nueva contrasena debe tener al menos 6 caracteres"); return; }
    if (newPassword !== confirmPassword) { showErr("Las contrasenas no coinciden"); return; }
    try {
      await api.changePassword({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      showMsg("Contrasena cambiada exitosamente");
    } catch (err) {
      showErr(err instanceof Error ? err.message : "Error al cambiar contrasena");
    }
  };

  const handleSelfExclude = async () => {
    if (!confirm(`Estas seguro? No podras apostar por ${excludeDays} dias.`)) return;
    setExcluding(true);
    try {
      await api.selfExclude(excludeDays);
      showMsg(`Auto-exclusion activada por ${excludeDays} dias`);
    } catch (err) {
      showErr(err instanceof Error ? err.message : "Error");
    } finally { setExcluding(false); }
  };

  const formatCOP = (n: number) => n.toLocaleString("es-CO");

  const inputClass = "w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:border-[#b8860b] focus:outline-none";

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
      <h1 className="text-2xl font-bold text-white">Mi Perfil</h1>

      {msg && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg p-3 text-center">{msg}</div>}
      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 text-center">{error}</div>}

      {/* User Card */}
      <div className="card-dark rounded-2xl overflow-hidden">
        <div className="h-1.5 gold-gradient" />
        <div className="p-6 text-center">
          <div className="w-16 h-16 rounded-full gold-gradient mx-auto flex items-center justify-center text-black text-2xl font-black">
            {(user?.full_name || user?.username || "U").charAt(0).toUpperCase()}
          </div>
          <p className="text-lg font-bold text-white mt-3">{user?.full_name || user?.username}</p>
          <p className="text-sm text-gray-500">@{user?.username}</p>
          {user?.is_admin && (
            <span className="inline-block mt-2 text-xs bg-[#b8860b]/20 text-[#ffd700] px-3 py-1 rounded-full font-medium">Administrador</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111] rounded-xl p-1">
        {([
          { key: "profile" as const, label: "Datos", icon: User },
          { key: "password" as const, label: "Contrasena", icon: Lock },
          { key: "stats" as const, label: "Estadisticas", icon: BarChart3 },
          { key: "responsible" as const, label: "Juego Responsable", icon: Shield },
        ]).map((tab) => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setError(""); setMsg(""); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition ${
              activeTab === tab.key ? "bg-[#b8860b]/20 text-[#ffd700]" : "text-gray-500 hover:text-gray-300"
            }`}>
            <tab.icon size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.slice(0, 5)}</span>
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="card-dark rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-white">Datos Personales</h3>
          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><User size={12} /> Nombre Completo</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="Tu nombre completo" />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><Mail size={12} /> Correo Electronico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="tu@email.com" />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><Phone size={12} /> Telefono</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+57 300 123 4567" />
            </div>
          </div>
          <button onClick={handleUpdateProfile}
            className="w-full gold-gradient text-black font-bold py-3 rounded-lg hover:opacity-90 transition text-sm">
            Guardar Cambios
          </button>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === "password" && (
        <div className="card-dark rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-white">Cambiar Contrasena</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Contrasena Actual</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass} placeholder="Ingresa tu contrasena actual" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nueva Contrasena</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass} placeholder="Minimo 6 caracteres" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Confirmar Nueva Contrasena</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass} placeholder="Repite la nueva contrasena" />
            </div>
          </div>
          <button onClick={handleChangePassword}
            className="w-full gold-gradient text-black font-bold py-3 rounded-lg hover:opacity-90 transition text-sm">
            Cambiar Contrasena
          </button>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === "stats" && (
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="card-dark rounded-xl h-20 animate-pulse" />)}
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="card-dark rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-[#ffd700]">{stats.total_bets}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Apuestas</p>
                </div>
                <div className="card-dark rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-green-400">{stats.won_bets}</p>
                  <p className="text-xs text-gray-500 mt-1">Ganadas</p>
                </div>
                <div className="card-dark rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-red-400">{stats.lost_bets}</p>
                  <p className="text-xs text-gray-500 mt-1">Perdidas</p>
                </div>
                <div className="card-dark rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-yellow-400">{stats.pending_bets}</p>
                  <p className="text-xs text-gray-500 mt-1">Pendientes</p>
                </div>
              </div>
              <div className="card-dark rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Apostado</span>
                  <span className="text-white font-bold">${formatCOP(stats.total_wagered)} COP</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Ganado</span>
                  <span className="text-green-400 font-bold">${formatCOP(stats.total_won)} COP</span>
                </div>
                <div className="border-t border-gray-800 my-1" />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Resultado Neto</span>
                  <span className={`font-bold ${stats.net_result >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {stats.net_result >= 0 ? "+" : ""}${formatCOP(stats.net_result)} COP
                  </span>
                </div>
              </div>
              {stats.total_bets > 0 && (
                <div className="card-dark rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-2">Tasa de Acierto</p>
                  <div className="w-full bg-gray-800 rounded-full h-3">
                    <div className="gold-gradient h-3 rounded-full transition-all" style={{ width: `${((stats.won_bets / (stats.won_bets + stats.lost_bets)) * 100) || 0}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {((stats.won_bets / (stats.won_bets + stats.lost_bets)) * 100 || 0).toFixed(1)}%
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="card-dark rounded-xl p-8 text-center text-gray-500 text-sm">No hay estadisticas disponibles</div>
          )}
        </div>
      )}

      {/* Responsible Gaming Tab */}
      {activeTab === "responsible" && (
        <div className="space-y-4">
          <div className="card-dark rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-yellow-400" />
              <h3 className="font-bold text-white">Auto-Exclusion</h3>
            </div>
            <p className="text-sm text-gray-400">
              Si sientes que necesitas un descanso, puedes auto-excluirte temporalmente. 
              Durante el periodo de exclusion, no podras realizar apuestas.
            </p>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Periodo de exclusion</label>
              <select value={excludeDays} onChange={(e) => setExcludeDays(Number(e.target.value))}
                className={inputClass}>
                <option value={1}>1 dia</option>
                <option value={3}>3 dias</option>
                <option value={7}>7 dias</option>
                <option value={14}>14 dias</option>
                <option value={30}>30 dias</option>
                <option value={90}>90 dias</option>
              </select>
            </div>
            <button onClick={handleSelfExclude} disabled={excluding}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50 text-sm">
              {excluding ? "Procesando..." : "Activar Auto-Exclusion"}
            </button>
          </div>

          <div className="card-dark rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-[#ffd700]" />
              <h3 className="font-bold text-white">Juego Responsable</h3>
            </div>
            <ul className="text-sm text-gray-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-[#ffd700] mt-0.5">-</span>
                <span>Establece un presupuesto antes de apostar y no lo excedas.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#ffd700] mt-0.5">-</span>
                <span>No apuestes mas de lo que puedes permitirte perder.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#ffd700] mt-0.5">-</span>
                <span>No intentes recuperar tus perdidas apostando mas.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#ffd700] mt-0.5">-</span>
                <span>Toma descansos regulares y no apuestes bajo presion.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#ffd700] mt-0.5">-</span>
                <span>Si necesitas ayuda, usa la opcion de auto-exclusion.</span>
              </li>
            </ul>
          </div>

          <div className="card-dark rounded-xl p-4 text-center">
            <Trophy size={20} className="text-[#b8860b] mx-auto mb-2" />
            <p className="text-xs text-gray-500">Apuesta maxima por evento: <span className="text-[#ffd700] font-bold">$500,000 COP</span></p>
            <p className="text-xs text-gray-500 mt-1">Solo mayores de 18 anos</p>
          </div>
        </div>
      )}
    </div>
  );
}

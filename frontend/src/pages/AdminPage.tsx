import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "../lib/api";
import BetTicket from "../components/BetTicket";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
  Shield, Users, Calendar, Trophy, BarChart3, Ticket, Plus, Trash2, Save,
  X, ChevronDown, ChevronUp, Radio, RefreshCw, ArrowUpCircle, ArrowDownCircle, CheckCircle2, XCircle, Crown, Megaphone, Send, Database, Key, Download, Upload,
} from "lucide-react";

interface Event {
  id: number; name: string; description: string; location: string; country: string;
  date: string; time: string; status: string; stream_url: string | null;
  players?: EventPlayer[];
}
interface Player {
  id: number; name: string; nickname: string; team: string; rating: number;
  stats_wins: number; stats_losses: number;
}
interface EventPlayer {
  id: number; name: string; nickname: string; team: string; position: number;
  odds: number; rating: number; stats_wins: number; stats_losses: number; day: number;
}
interface UserData {
  id: number; username: string; email: string; full_name: string; phone: string;
  balance: number; is_active: boolean; is_admin: boolean; created_at: string;
}
interface BetData {
  id: number; user_id: number; event_id: number; player_id: number; amount: number;
  odds: number; potential_win: number; status: string; ticket_code: string;
  created_at: string; username: string; event_name: string; player_name: string;
  event_date: string; event_time: string; event_location: string;
}
interface InviteCode {
  id: number; code: string; is_used: number; used_by: number | null;
  used_by_username: string | null; used_at: string | null; created_at: string;
}
interface Stats {
  total_users: number; total_events: number; total_bets: number;
  total_bet_amount: number; pending_bets: number; active_events: number;
  pending_deposits: number; pending_withdrawals: number;
  total_deposit_amount: number; total_withdrawal_amount: number;
  pending_deposit_amount: number; pending_withdrawal_amount: number;
  total_balance: number;
  daily: { date: string; bets: number; deposits: number; withdrawals: number }[];
}
interface DepositReq {
  id: number; user_id: number; username: string; amount: number; method: string;
  reference: string; status: string; created_at: string;
}
interface WithdrawalReq {
  id: number; user_id: number; username: string; amount: number; method: string;
  account_number: string; status: string; created_at: string;
}

type Tab = "stats" | "events" | "players" | "users" | "bets" | "invites" | "deposits" | "withdrawals" | "promotions" | "backups";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("stats");
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [bets, setBets] = useState<BetData[]>([]);
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [adminDeposits, setAdminDeposits] = useState<DepositReq[]>([]);
  const [adminWithdrawals, setAdminWithdrawals] = useState<WithdrawalReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const loadTab = useCallback(async (t: Tab, silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (t === "stats") { const s = await api.getStats(); setStats(s); }
      else if (t === "events") {
        const evts = await api.getEvents();
        const detailed = await Promise.all(evts.map((e: Event) => api.getEvent(e.id)));
        setEvents(detailed);
      }
      else if (t === "players") { const p = await api.getPlayers(); setPlayers(p); }
      else if (t === "users") { const u = await api.getUsers(); setUsers(u); }
      else if (t === "bets") { const b = await api.getAllBets(); setBets(b); }
      else if (t === "invites") { const i = await api.getInviteCodes(); setInvites(i); }
      else if (t === "deposits") { const d = await api.getAdminDeposits(); setAdminDeposits(d); }
      else if (t === "withdrawals") { const w = await api.getAdminWithdrawals(); setAdminWithdrawals(w); }
    } catch (err) { console.error(err); }
    if (!silent) setLoading(false);
  }, []);

  // Load on tab change
  useEffect(() => { loadTab(tab); }, [tab, loadTab]);

  // Auto-refresh every 10 seconds
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => { loadTab(tab, true); }, 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [tab, loadTab]);

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const tabs: { key: Tab; label: string; icon: typeof Shield }[] = [
    { key: "stats", label: "Estadisticas", icon: BarChart3 },
    { key: "events", label: "Eventos", icon: Calendar },
    { key: "players", label: "Jugadores", icon: Trophy },
    { key: "deposits", label: "Depositos", icon: ArrowUpCircle },
    { key: "withdrawals", label: "Retiros", icon: ArrowDownCircle },
    { key: "users", label: "Usuarios", icon: Users },
    { key: "bets", label: "Apuestas", icon: Ticket },
    { key: "invites", label: "Invitaciones", icon: Shield },
    { key: "promotions", label: "Promociones", icon: Megaphone },
    { key: "backups", label: "Backups", icon: Database },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center gap-3">
        <Shield size={24} className="text-[#ffd700]" />
        <h1 className="text-2xl font-bold text-white">Panel de Administrador</h1>
      </div>

      {msg && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg p-3 text-center">{msg}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              tab === t.key
                ? "bg-[#b8860b]/20 text-[#ffd700] border border-[#b8860b]/50"
                : "bg-[#1a1a1a] text-gray-400 border border-gray-700 hover:border-[#b8860b]/30"
            }`}>
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Cargando...</div>
      ) : (
        <>
          {tab === "stats" && stats && <StatsPanel stats={stats} />}
          {tab === "events" && <EventsPanel events={events} players={players} reload={() => loadTab("events")} showMsg={showMsg} loadPlayers={() => api.getPlayers().then(setPlayers)} />}
          {tab === "players" && <PlayersPanel players={players} reload={() => loadTab("players")} showMsg={showMsg} />}
          {tab === "users" && <UsersPanel users={users} reload={() => loadTab("users")} showMsg={showMsg} />}
          {tab === "bets" && <BetsPanel bets={bets} />}
          {tab === "deposits" && <DepositsPanel deposits={adminDeposits} reload={() => loadTab("deposits")} showMsg={showMsg} />}
          {tab === "withdrawals" && <WithdrawalsPanel withdrawals={adminWithdrawals} reload={() => loadTab("withdrawals")} showMsg={showMsg} />}
          {tab === "invites" && <InvitesPanel invites={invites} reload={() => loadTab("invites")} showMsg={showMsg} />}
          {tab === "promotions" && <PromotionsPanel showMsg={showMsg} />}
          {tab === "backups" && <BackupsPanel showMsg={showMsg} />}
        </>
      )}
    </div>
  );
}

/* === STATS === */
function StatsPanel({ stats }: { stats: Stats }) {
  const formatCOP = (n: number) => (n ?? 0).toLocaleString("es-CO");
  const items = [
    { label: "Usuarios", value: stats.total_users ?? 0, color: "text-blue-400" },
    { label: "Eventos", value: stats.total_events ?? 0, color: "text-[#ffd700]" },
    { label: "Apuestas Totales", value: stats.total_bets ?? 0, color: "text-purple-400" },
    { label: "Apuestas Pendientes", value: stats.pending_bets ?? 0, color: "text-yellow-400" },
    { label: "Total Apostado", value: `$${formatCOP(stats.total_bet_amount)} COP`, color: "text-green-400" },
    { label: "Eventos Activos", value: stats.active_events ?? 0, color: "text-cyan-400" },
    { label: "Depositos Aprobados", value: `$${formatCOP(stats.total_deposit_amount)}`, color: "text-green-400" },
    { label: "Retiros Pagados", value: `$${formatCOP(stats.total_withdrawal_amount)}`, color: "text-red-400" },
    { label: "Saldo en Cuentas", value: `$${formatCOP(stats.total_balance)}`, color: "text-[#ffd700]" },
    { label: "Depositos Pendientes", value: `${stats.pending_deposits ?? 0} | $${formatCOP(stats.pending_deposit_amount)}`, color: "text-yellow-400" },
    { label: "Retiros Pendientes", value: `${stats.pending_withdrawals ?? 0} | $${formatCOP(stats.pending_withdrawal_amount)}`, color: "text-orange-400" },
    { label: "Balance Neto", value: `$${formatCOP((stats.total_deposit_amount ?? 0) - (stats.total_withdrawal_amount ?? 0))}`, color: "text-blue-400" },
  ];
  const chartData = (stats.daily ?? []).map((d) => ({
    dia: new Date(d.date + "T00:00:00-05:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short", timeZone: "America/Bogota" }),
    Depositos: d.deposits,
    Retiros: d.withdrawals,
    Apostado: d.bets,
  }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item, i) => (
          <div key={i} className="card-dark rounded-xl p-4 text-center">
            <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-gray-500 mt-1">{item.label}</p>
          </div>
        ))}
      </div>
      {chartData.length > 0 && (
        <div className="card-dark rounded-xl p-4">
          <p className="text-sm font-semibold text-white mb-3">Actividad de los ultimos 7 dias</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="dia" stroke="#666" fontSize={11} />
                <YAxis stroke="#666" fontSize={11} tickFormatter={(v: number) => v >= 1000 ? `${v / 1000}k` : `${v}`} />
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => `$${formatCOP(v)}`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Depositos" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Retiros" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Apostado" fill="#ffd700" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

/* === EVENTS === */
function EventsPanel({ events, players, reload, showMsg, loadPlayers }: {
  events: Event[]; players: Player[]; reload: () => void; showMsg: (m: string) => void;
  loadPlayers: () => Promise<void>;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", location: "", country: "colombia", date: "", time: "", stream_url: "" });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [addPlayer, setAddPlayer] = useState<{ eventId: number; playerId: string; odds: string; day: string } | null>(null);
  const [editEvent, setEditEvent] = useState<{ id: number; name: string; date: string; time: string; location: string; description: string } | null>(null);
  const [savingOdds, setSavingOdds] = useState<number | null>(null);
  const oddsRefs = {} as Record<number, HTMLInputElement | null>;

  useEffect(() => { loadPlayers(); }, []);

  const handleCreate = async () => {
    try {
      await api.createEvent({
        ...form,
        stream_url: form.stream_url || null,
      });
      showMsg("Evento creado exitosamente");
      setShowCreate(false);
      setForm({ name: "", description: "", location: "", country: "colombia", date: "", time: "", stream_url: "" });
      reload();
    } catch (err) { showMsg("Error al crear evento"); }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await api.updateEvent(id, { status });
      showMsg(`Estado actualizado a: ${status}`);
      reload();
    } catch { showMsg("Error al actualizar"); }
  };

  const handleStreamUrl = async (id: number, stream_url: string) => {
    try {
      await api.updateEvent(id, { stream_url: stream_url || null });
      showMsg("URL de transmision actualizada");
      reload();
    } catch { showMsg("Error al actualizar URL"); }
  };

  const handleUpdateOdds = async (eventId: number, playerId: number) => {
    const input = oddsRefs[playerId];
    if (!input) { showMsg("Error: campo no encontrado"); return; }
    const oddsNum = parseFloat(input.value);
    if (isNaN(oddsNum) || oddsNum <= 1) { showMsg("Cuota debe ser mayor a 1.00"); return; }
    setSavingOdds(playerId);
    try {
      await api.updatePlayerOdds(eventId, playerId, oddsNum);
      showMsg(`Cuota actualizada: ${oddsNum.toFixed(2)}x`);
      reload();
    } catch (err) { showMsg("Error al actualizar cuota: " + (err instanceof Error ? err.message : "desconocido")); }
    setSavingOdds(null);
  };

  const handleAddPlayer = async () => {
    if (!addPlayer) return;
    const playerId = parseInt(addPlayer.playerId);
    const odds = parseFloat(addPlayer.odds);
    const day = parseInt(addPlayer.day) || 1;
    if (isNaN(playerId) || isNaN(odds) || odds <= 1) { showMsg("Datos invalidos"); return; }
    try {
      await api.addPlayerToEvent(addPlayer.eventId, { player_id: playerId, odds, day });
      showMsg("Jugador agregado al evento");
      setAddPlayer(null);
      reload();
    } catch (err) { showMsg(err instanceof Error ? err.message : "Error"); }
  };

  const handleRemovePlayer = async (eventId: number, playerId: number) => {
    try {
      await api.removePlayerFromEvent(eventId, playerId);
      showMsg("Jugador removido del evento");
      reload();
    } catch { showMsg("Error al remover jugador"); }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteEvent(id);
      showMsg("Evento eliminado");
      reload();
    } catch { showMsg("Error al eliminar"); }
  };

  const inputClass = "w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-[#b8860b] focus:outline-none";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-white">Eventos ({events.length})</h2>
        <div className="flex gap-2">
          <button onClick={() => { api.seedData().then(() => { showMsg("Datos de ejemplo creados"); reload(); }).catch(() => showMsg("Ya existen datos")); }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#1a1a1a] border border-gray-700 text-gray-400 rounded-lg hover:border-[#b8860b]/50">
            <RefreshCw size={12} /> Datos Demo
          </button>
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs gold-gradient text-black rounded-lg font-medium">
            <Plus size={14} /> Nuevo Evento
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="card-dark rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-white text-sm">Crear Evento</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Nombre del evento" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
            <input placeholder="Ubicacion" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputClass} />
            <input type="hidden" value="colombia" />
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
            <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className={inputClass} />
            <input placeholder="URL de transmision (opcional)" value={form.stream_url} onChange={(e) => setForm({ ...form, stream_url: e.target.value })} className={inputClass} />
          </div>
          <textarea placeholder="Descripcion" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={`${inputClass} h-20 resize-none`} />
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-xs text-gray-400 border border-gray-700 rounded-lg">Cancelar</button>
            <button onClick={handleCreate} className="px-4 py-2 text-xs gold-gradient text-black rounded-lg font-medium">Crear Evento</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="card-dark rounded-xl overflow-hidden">
            <button onClick={() => setExpanded(expanded === event.id ? null : event.id)} className="w-full text-left p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div>
                    <p className="font-bold text-white text-sm">{event.name}</p>
                    <p className="text-xs text-gray-500">{event.date} {(() => { const [h, m] = event.time.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; })()} - {event.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    event.status === "upcoming" ? "bg-green-500/20 text-green-400" :
                    event.status === "live" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"
                  }`}>{event.status.toUpperCase()}</span>
                  {expanded === event.id ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                </div>
              </div>
            </button>

            {expanded === event.id && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-800 pt-3">
                {/* Status & stream controls */}
                <div className="flex flex-wrap gap-2">
                  <label className="text-xs text-gray-400">Estado:</label>
                  {["upcoming", "live", "finished"].map((s) => (
                    <button key={s} onClick={() => handleStatusChange(event.id, s)}
                      className={`px-3 py-1 text-xs rounded-full ${event.status === s ? "gold-gradient text-black" : "bg-[#1a1a1a] text-gray-400 border border-gray-700"}`}>
                      {s === "upcoming" ? "Proximo" : s === "live" ? "En Vivo" : "Finalizado"}
                    </button>
                  ))}
                </div>

                {/* Edit Event Details */}
                {editEvent && editEvent.id === event.id ? (
                  <div className="bg-[#0a0a0a] rounded-lg p-3 space-y-2">
                    <p className="text-xs text-gray-400 font-medium">Editar Evento</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input value={editEvent.name} onChange={(e) => setEditEvent({ ...editEvent, name: e.target.value })}
                        placeholder="Nombre" className={inputClass} />
                      <input value={editEvent.location} onChange={(e) => setEditEvent({ ...editEvent, location: e.target.value })}
                        placeholder="Ubicacion" className={inputClass} />
                      <input type="date" value={editEvent.date} onChange={(e) => setEditEvent({ ...editEvent, date: e.target.value })}
                        className={inputClass} />
                      <input type="time" value={editEvent.time} onChange={(e) => setEditEvent({ ...editEvent, time: e.target.value })}
                        className={inputClass} />
                    </div>
                    <textarea value={editEvent.description} onChange={(e) => setEditEvent({ ...editEvent, description: e.target.value })}
                      placeholder="Descripcion" className={`${inputClass} h-16 resize-none`} />
                    <div className="flex gap-2">
                      <button type="button" onClick={async (e) => {
                        e.preventDefault(); e.stopPropagation();
                        try {
                          await api.updateEvent(event.id, { name: editEvent.name, date: editEvent.date, time: editEvent.time, location: editEvent.location, description: editEvent.description });
                          showMsg("Evento actualizado exitosamente");
                          setEditEvent(null);
                          reload();
                        } catch (err) { showMsg("Error al actualizar: " + (err instanceof Error ? err.message : "desconocido")); }
                      }} className="px-4 py-2 text-sm gold-gradient text-black rounded-lg font-medium flex items-center gap-1"><Save size={14} /> Guardar Cambios</button>
                      <button type="button" onClick={() => setEditEvent(null)} className="px-4 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:border-gray-500 transition">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setEditEvent({ id: event.id, name: event.name, date: event.date, time: event.time, location: event.location, description: event.description || "" })}
                    className="flex items-center gap-1 text-xs text-[#ffd700] hover:text-[#b8860b]">
                    <Save size={12} /> Editar Datos del Evento
                  </button>
                )}

                <div className="flex items-center gap-2">
                  <Radio size={14} className="text-red-400" />
                  <input
                    placeholder="URL de transmision en vivo"
                    defaultValue={event.stream_url || ""}
                    onBlur={(e) => handleStreamUrl(event.id, e.target.value)}
                    className="flex-1 bg-[#0a0a0a] border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs focus:border-[#b8860b] focus:outline-none"
                  />
                </div>

                {/* Players with editable odds */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 font-medium">Jugadores y Cuotas</p>
                    <button onClick={() => setAddPlayer({ eventId: event.id, playerId: "", odds: "2.0", day: "1" })}
                      className="flex items-center gap-1 text-xs text-[#ffd700] hover:text-[#b8860b]">
                      <Plus size={12} /> Agregar
                    </button>
                  </div>

                  {addPlayer && addPlayer.eventId === event.id && (
                    <div className="flex items-center gap-2 bg-[#0a0a0a] rounded-lg p-2">
                      <select value={addPlayer.playerId} onChange={(e) => setAddPlayer({ ...addPlayer, playerId: e.target.value })}
                        className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded text-xs text-white p-1.5">
                        <option value="">Seleccionar jugador</option>
                        {players.map((p) => <option key={p.id} value={p.id}>{p.name}{p.nickname ? ` (${p.nickname})` : ""}</option>)}
                      </select>
                      <input placeholder="Cuota" value={addPlayer.odds} onChange={(e) => setAddPlayer({ ...addPlayer, odds: e.target.value })}
                        className="w-20 bg-[#1a1a1a] border border-gray-700 rounded text-xs text-white p-1.5" />
                      <input placeholder="Dia" value={addPlayer.day} onChange={(e) => setAddPlayer({ ...addPlayer, day: e.target.value })}
                        className="w-14 bg-[#1a1a1a] border border-gray-700 rounded text-xs text-white p-1.5" />
                      <button onClick={handleAddPlayer} className="text-green-400 hover:text-green-300"><Save size={14} /></button>
                      <button onClick={() => setAddPlayer(null)} className="text-red-400 hover:text-red-300"><X size={14} /></button>
                    </div>
                  )}

                  {event.players && event.players.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-[#0a0a0a] rounded-lg p-2 gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xs text-gray-400 shrink-0">#{p.position}</span>
                        <span className="text-sm text-white truncate">{p.name}</span>
                        <span className="text-[10px] text-[#b8860b] shrink-0">D{p.day || 1}</span>
                        {p.nickname && <span className="text-xs text-gray-500 shrink-0">"{p.nickname}"</span>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          ref={(el) => { oddsRefs[p.id] = el; }}
                          defaultValue={p.odds.toFixed(2)}
                          className="w-16 bg-[#1a1a1a] border border-gray-700 rounded text-xs text-[#ffd700] text-center p-1.5 font-bold"
                        />
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUpdateOdds(event.id, p.id); }}
                          disabled={savingOdds === p.id}
                          className="px-2 py-1.5 text-xs bg-[#b8860b]/20 text-[#ffd700] border border-[#b8860b]/50 rounded hover:bg-[#b8860b]/40 transition disabled:opacity-50"
                        >{savingOdds === p.id ? "..." : "Guardar"}</button>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemovePlayer(event.id, p.id); }}
                          className="px-1.5 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                  {(!event.players || event.players.length === 0) && (
                    <p className="text-xs text-gray-600 text-center py-2">Sin jugadores asignados</p>
                  )}
                </div>

                {/* Winner Declaration */}
                {event.status === "upcoming" || event.status === "live" ? (
                  event.players && event.players.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400 font-medium flex items-center gap-1"><Crown size={12} className="text-[#ffd700]" /> Declarar Ganador</p>
                      <div className="flex flex-wrap gap-2">
                        {event.players.map((p) => (
                          <button key={p.id} onClick={async () => {
                            if (!confirm(`Declarar a ${p.name} como ganador de ${event.name}?`)) return;
                            try {
                              await api.declareWinner(event.id, p.id);
                              showMsg(`${p.name} declarado como ganador!`);
                              reload();
                            } catch (err) { showMsg(err instanceof Error ? err.message : "Error"); }
                          }}
                            className="px-3 py-1.5 text-xs bg-[#b8860b]/10 text-[#ffd700] border border-[#b8860b]/30 rounded-lg hover:bg-[#b8860b]/20 transition">
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null
                ) : null}

                <button onClick={() => handleDelete(event.id)}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                  <Trash2 size={12} /> Eliminar Evento
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* === PLAYERS === */
function PlayersPanel({ players, reload, showMsg }: {
  players: Player[]; reload: () => void; showMsg: (m: string) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", nickname: "", team: "" });

  const handleCreate = async () => {
    try {
      await api.createPlayer(form);
      showMsg("Jugador creado");
      setShowCreate(false);
      setForm({ name: "", nickname: "", team: "" });
      reload();
    } catch { showMsg("Error al crear jugador"); }
  };

  const handleDelete = async (id: number) => {
    try { await api.deletePlayer(id); showMsg("Jugador eliminado"); reload(); }
    catch { showMsg("Error al eliminar"); }
  };

  const inputClass = "w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-[#b8860b] focus:outline-none";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-white">Jugadores ({players.length})</h2>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs gold-gradient text-black rounded-lg font-medium">
          <Plus size={14} /> Nuevo Jugador
        </button>
      </div>

      {showCreate && (
        <div className="card-dark rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input placeholder="Nombre completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
            <input placeholder="Apodo" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} className={inputClass} />
            <input placeholder="Equipo" value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} className={inputClass} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-xs text-gray-400 border border-gray-700 rounded-lg">Cancelar</button>
            <button onClick={handleCreate} className="px-4 py-2 text-xs gold-gradient text-black rounded-lg font-medium">Crear Jugador</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {players.map((p) => (
          <div key={p.id} className="card-dark rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#b8860b]/20 flex items-center justify-center text-[#ffd700] font-bold text-sm">
                {p.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{p.name}</p>
                {p.nickname ? <p className="text-xs text-gray-500">"{p.nickname}"</p> : null}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-xs">
                <span className="text-green-400">{p.stats_wins}G</span>
                <span className="text-gray-600 mx-1">/</span>
                <span className="text-red-400">{p.stats_losses}P</span>
                <span className="text-gray-600 mx-1">|</span>
                <span className="text-[#ffd700]">{p.rating.toFixed(1)}</span>
              </div>
              <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* === USERS === */
interface UserBet {
  id: number; event_id: number; player_id: number; amount: number;
  odds: number; potential_win: number; status: string; ticket_code: string;
  created_at: string; event_name: string; player_name: string;
}
interface UserDeposit {
  id: number; user_id: number; amount: number; method: string;
  reference: string; status: string; created_at: string;
}
interface UserWithdrawal {
  id: number; user_id: number; amount: number; method: string;
  account_number: string; status: string; created_at: string;
}

function UsersPanel({ users, reload, showMsg }: {
  users: UserData[]; reload: () => void; showMsg: (m: string) => void;
}) {
  const formatCOP = (n: number) => n.toLocaleString("es-CO");
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "bets" | "deposits" | "withdrawals">("info");
  const [userBets, setUserBets] = useState<UserBet[]>([]);
  const [userDeposits, setUserDeposits] = useState<UserDeposit[]>([]);
  const [userWithdrawals, setUserWithdrawals] = useState<UserWithdrawal[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [resetUser, setResetUser] = useState<number | null>(null);
  const [newPw, setNewPw] = useState("");

  const toggleActive = async (id: number, is_active: boolean) => {
    try {
      await api.updateUser(id, { is_active: !is_active });
      showMsg(`Usuario ${!is_active ? "activado" : "desactivado"}`);
      reload();
    } catch { showMsg("Error al actualizar"); }
  };

  const handleExpand = async (userId: number) => {
    if (expandedUser === userId) { setExpandedUser(null); return; }
    setExpandedUser(userId);
    setActiveTab("info");
    setLoadingData(true);
    try {
      const [bets, deposits, withdrawals] = await Promise.all([
        api.getUserBets(userId),
        api.getUserDeposits(userId),
        api.getUserWithdrawals(userId),
      ]);
      setUserBets(bets);
      setUserDeposits(deposits);
      setUserWithdrawals(withdrawals);
    } catch { showMsg("Error al cargar datos del usuario"); }
    setLoadingData(false);
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Bogota" }); }
    catch { return d; }
  };

  const statusLabel = (s: string) => {
    if (s === "pending") return <span className="text-yellow-400">Pendiente</span>;
    if (s === "won") return <span className="text-green-400">Ganada</span>;
    if (s === "lost") return <span className="text-red-400">Perdida</span>;
    if (s === "approved") return <span className="text-green-400">Aprobado</span>;
    if (s === "rejected") return <span className="text-red-400">Rechazado</span>;
    return <span className="text-gray-400">{s}</span>;
  };

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-white">Usuarios ({users.length})</h2>
      <p className="text-xs text-gray-500">Toca en un usuario para ver su informacion completa, depositos, retiros y apuestas</p>
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id}>
            <div
              onClick={() => handleExpand(u.id)}
              className={`card-dark rounded-xl p-3 cursor-pointer transition ${
                expandedUser === u.id ? "!border-[#ffd700] bg-[#ffd700]/5" : "hover:border-gray-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    u.is_admin ? "gold-gradient text-black" : "bg-[#1a1a1a] text-gray-400"
                  }`}>
                    {(u.full_name || u.username).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white text-sm">{u.full_name || u.username}</p>
                      {Boolean(u.is_admin) && <span className="text-xs bg-[#b8860b]/20 text-[#ffd700] px-1.5 py-0.5 rounded">ADMIN</span>}
                    </div>
                    <p className="text-xs text-gray-500">@{u.username} - {u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2 hidden sm:block">
                    <p className="text-sm font-bold text-[#ffd700]">${formatCOP(u.balance)}</p>
                    <p className="text-xs text-gray-500">COP</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setResetUser(resetUser === u.id ? null : u.id); }}
                    className="px-2 py-1 text-xs rounded-full bg-[#b8860b]/20 text-[#ffd700] hover:bg-[#b8860b]/30" title="Restablecer contrasena">
                    <Key size={12} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); toggleActive(u.id, u.is_active); }}
                    className={`px-3 py-1 text-xs rounded-full ${u.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {u.is_active ? "Activo" : "Inactivo"}
                  </button>
                  {expandedUser === u.id ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                </div>
              </div>
            </div>
            {resetUser === u.id && (
              <div className="px-4 py-2 flex items-center gap-2">
                <input type="password" placeholder="Nueva contrasena (min 6 caracteres)" value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="flex-1 bg-[#0a0a0a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-[#b8860b] focus:outline-none" />
                <button onClick={async () => {
                  if (newPw.length < 6) { showMsg("La contrasena debe tener al menos 6 caracteres"); return; }
                  try { await api.adminResetPassword(u.id, newPw); showMsg(`Contrasena de ${u.username} restablecida`); setResetUser(null); setNewPw(""); }
                  catch (err) { showMsg(err instanceof Error ? err.message : "Error"); }
                }} className="px-3 py-2 text-xs gold-gradient text-black rounded-lg font-medium">Restablecer</button>
                <button onClick={() => { setResetUser(null); setNewPw(""); }} className="px-3 py-2 text-xs text-gray-400 border border-gray-700 rounded-lg">Cancelar</button>
              </div>
            )}
            {expandedUser === u.id && (
              <div className="border border-gray-800 border-t-0 rounded-b-xl bg-[#0d0d0d] p-4 space-y-3">
                {loadingData ? (
                  <p className="text-xs text-gray-500 text-center py-4">Cargando datos del usuario...</p>
                ) : (
                  <>
                    <div className="flex gap-1 bg-[#1a1a1a] rounded-lg p-1">
                      {([
                        { key: "info" as const, label: "Info", icon: Users },
                        { key: "deposits" as const, label: `Depositos (${userDeposits.length})`, icon: ArrowUpCircle },
                        { key: "withdrawals" as const, label: `Retiros (${userWithdrawals.length})`, icon: ArrowDownCircle },
                        { key: "bets" as const, label: `Apuestas (${userBets.length})`, icon: Ticket },
                      ]).map((t) => (
                        <button key={t.key} onClick={() => setActiveTab(t.key)}
                          className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-md transition ${
                            activeTab === t.key ? "gold-gradient text-black font-medium" : "text-gray-400 hover:text-white"
                          }`}>
                          <t.icon size={12} />
                          <span className="hidden sm:inline">{t.label}</span>
                          <span className="sm:hidden">{t.key === "info" ? "Info" : t.key === "deposits" ? `Dep` : t.key === "withdrawals" ? `Ret` : `Ap`}</span>
                        </button>
                      ))}
                    </div>

                    {activeTab === "info" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#111] border border-gray-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500">Nombre completo</p>
                          <p className="text-sm text-white font-medium">{u.full_name || "Sin nombre"}</p>
                        </div>
                        <div className="bg-[#111] border border-gray-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500">Usuario</p>
                          <p className="text-sm text-white font-medium">@{u.username}</p>
                        </div>
                        <div className="bg-[#111] border border-gray-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500">Email</p>
                          <p className="text-sm text-white font-medium truncate">{u.email}</p>
                        </div>
                        <div className="bg-[#111] border border-gray-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500">Telefono</p>
                          <p className="text-sm text-white font-medium">{u.phone || "Sin telefono"}</p>
                        </div>
                        <div className="bg-[#111] border border-gray-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500">Saldo actual</p>
                          <p className="text-sm text-[#ffd700] font-bold">${formatCOP(u.balance)} COP</p>
                        </div>
                        <div className="bg-[#111] border border-gray-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500">Registro</p>
                          <p className="text-sm text-white font-medium">{formatDate(u.created_at)}</p>
                        </div>
                      </div>
                    )}

                    {activeTab === "deposits" && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {userDeposits.length === 0 ? (
                          <p className="text-xs text-gray-500 text-center py-4">Sin depositos registrados</p>
                        ) : userDeposits.map((dep) => (
                          <div key={dep.id} className="bg-[#111] border border-gray-800 rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm text-white font-medium">${formatCOP(dep.amount)} COP</p>
                              <p className="text-xs text-gray-500">{dep.method} - {formatDate(dep.created_at)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs">{statusLabel(dep.status)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === "withdrawals" && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {userWithdrawals.length === 0 ? (
                          <p className="text-xs text-gray-500 text-center py-4">Sin retiros registrados</p>
                        ) : userWithdrawals.map((w) => (
                          <div key={w.id} className="bg-[#111] border border-gray-800 rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm text-white font-medium">${formatCOP(w.amount)} COP</p>
                              <p className="text-xs text-gray-500">{w.method} - {w.account_number} - {formatDate(w.created_at)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs">{statusLabel(w.status)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === "bets" && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {userBets.length === 0 ? (
                          <p className="text-xs text-gray-500 text-center py-4">Sin apuestas registradas</p>
                        ) : userBets.map((bet) => (
                          <div key={bet.id} className="bg-[#111] border border-gray-800 rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm text-white font-medium">{bet.event_name}</p>
                              <p className="text-xs text-gray-500">
                                {bet.player_name} - Cuota: {bet.odds.toFixed(2)}x - {formatDate(bet.created_at)}
                              </p>
                              <p className="text-xs text-gray-600 font-mono">{bet.ticket_code}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-white font-bold">${formatCOP(bet.amount)} COP</p>
                              <p className="text-xs text-gray-500">Gan: ${formatCOP(bet.potential_win)} COP</p>
                              <p className="text-xs">{statusLabel(bet.status)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* === BETS === */
function BetsPanel({ bets }: { bets: BetData[] }) {
  const formatCOP = (n: number) => n.toLocaleString("es-CO");
  const [selectedBet, setSelectedBet] = useState<BetData | null>(null);
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-white">Todas las Apuestas ({bets.length})</h2>
      {selectedBet && (
        <div className="fixed inset-0 z-50 bg-black/80 overflow-y-auto p-4" onClick={() => setSelectedBet(null)}>
          <div className="min-h-full flex items-start justify-center py-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-full max-w-md space-y-3">
              <div className="flex justify-end">
                <button onClick={() => setSelectedBet(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              <BetTicket bet={selectedBet} />
              <p className="text-center text-xs text-gray-500">Apostador: @{selectedBet.username}</p>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {bets.map((bet) => (
          <div key={bet.id} onClick={() => setSelectedBet(bet)}
            className="card-dark rounded-xl p-3 flex items-center justify-between cursor-pointer hover:border-[#b8860b]/50 transition">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white text-sm">{bet.player_name}</p>
                <span className="text-xs text-gray-500">por @{bet.username}</span>
              </div>
              <p className="text-xs text-gray-500">{bet.event_name} - {bet.ticket_code}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-white text-sm">${formatCOP(bet.amount)}</p>
              <p className="text-xs">
                <span className="text-[#ffd700]">{bet.odds.toFixed(2)}x</span>
                <span className="mx-1 text-gray-600">|</span>
                <span className={
                  bet.status === "pending" ? "text-yellow-400" :
                  bet.status === "won" ? "text-green-400" : "text-red-400"
                }>{bet.status === "pending" ? "Pendiente" : bet.status === "won" ? "Ganada" : "Perdida"}</span>
              </p>
            </div>
          </div>
        ))}
        {bets.length === 0 && <p className="text-center text-gray-500 text-sm py-8">No hay apuestas registradas</p>}
      </div>
    </div>
  );
}

/* === DEPOSITS === */
function DepositsPanel({ deposits, reload, showMsg }: {
  deposits: DepositReq[]; reload: () => void; showMsg: (m: string) => void;
}) {
  const formatCOP = (n: number) => n.toLocaleString("es-CO");
  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Bogota" }); }
    catch { return d; }
  };
  const handleReview = async (id: number, status: string) => {
    try {
      await api.reviewDeposit(id, status);
      showMsg(`Deposito ${status === "approved" ? "aprobado" : "rechazado"}`);
      reload();
    } catch (err) { showMsg(err instanceof Error ? err.message : "Error"); }
  };
  const pending = deposits.filter(d => d.status === "pending");
  const processed = deposits.filter(d => d.status !== "pending");

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-white">Solicitudes de Deposito ({deposits.length})</h2>
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-yellow-400 font-medium">Pendientes ({pending.length})</p>
          {pending.map((dep) => (
            <div key={dep.id} className="card-dark rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-bold">${formatCOP(dep.amount)} COP</p>
                  <p className="text-xs text-gray-500">@{dep.username} - {dep.method} - {dep.reference?.startsWith("/comprobantes/") ? <a href={`${import.meta.env.VITE_API_URL || ""}${dep.reference}`} target="_blank" rel="noopener noreferrer" className="text-[#ffd700] underline">Ver comprobante</a> : `Ref: ${dep.reference}`}</p>
                  <p className="text-xs text-gray-600">{formatDate(dep.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleReview(dep.id, "approved")}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30">
                    <CheckCircle2 size={14} /> Aprobar
                  </button>
                  <button onClick={() => handleReview(dep.id, "rejected")}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">
                    <XCircle size={14} /> Rechazar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {processed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-medium">Procesados ({processed.length})</p>
          {processed.map((dep) => (
            <div key={dep.id} className="card-dark rounded-lg p-3 flex items-center justify-between opacity-70">
              <div>
                <p className="text-sm text-white">${formatCOP(dep.amount)} COP - @{dep.username}</p>
                <p className="text-xs text-gray-500">{dep.method} - {formatDate(dep.created_at)}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${dep.status === "approved" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                {dep.status === "approved" ? "Aprobado" : "Rechazado"}
              </span>
            </div>
          ))}
        </div>
      )}
      {deposits.length === 0 && <p className="text-center text-gray-500 text-sm py-8">No hay solicitudes de deposito</p>}
    </div>
  );
}

/* === WITHDRAWALS === */
function WithdrawalsPanel({ withdrawals, reload, showMsg }: {
  withdrawals: WithdrawalReq[]; reload: () => void; showMsg: (m: string) => void;
}) {
  const formatCOP = (n: number) => n.toLocaleString("es-CO");
  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Bogota" }); }
    catch { return d; }
  };
  const handleReview = async (id: number, status: string) => {
    try {
      await api.reviewWithdrawal(id, status);
      showMsg(`Retiro ${status === "approved" ? "aprobado" : "rechazado"}`);
      reload();
    } catch (err) { showMsg(err instanceof Error ? err.message : "Error"); }
  };
  const pending = withdrawals.filter(w => w.status === "pending");
  const processed = withdrawals.filter(w => w.status !== "pending");

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-white">Solicitudes de Retiro ({withdrawals.length})</h2>
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-yellow-400 font-medium">Pendientes ({pending.length})</p>
          {pending.map((wd) => (
            <div key={wd.id} className="card-dark rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-bold">${formatCOP(wd.amount)} COP</p>
                  <p className="text-xs text-gray-500">@{wd.username} - {wd.method} - Cuenta: {wd.account_number}</p>
                  <p className="text-xs text-gray-600">{formatDate(wd.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleReview(wd.id, "approved")}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30">
                    <CheckCircle2 size={14} /> Aprobar
                  </button>
                  <button onClick={() => handleReview(wd.id, "rejected")}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">
                    <XCircle size={14} /> Rechazar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {processed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-medium">Procesados ({processed.length})</p>
          {processed.map((wd) => (
            <div key={wd.id} className="card-dark rounded-lg p-3 flex items-center justify-between opacity-70">
              <div>
                <p className="text-sm text-white">${formatCOP(wd.amount)} COP - @{wd.username}</p>
                <p className="text-xs text-gray-500">{wd.method} - {wd.account_number} - {formatDate(wd.created_at)}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${wd.status === "approved" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                {wd.status === "approved" ? "Aprobado" : "Rechazado"}
              </span>
            </div>
          ))}
        </div>
      )}
      {withdrawals.length === 0 && <p className="text-center text-gray-500 text-sm py-8">No hay solicitudes de retiro</p>}
    </div>
  );
}

/* === INVITES === */
function InvitesPanel({ invites, reload, showMsg }: {
  invites: InviteCode[]; reload: () => void; showMsg: (m: string) => void;
}) {
  const [count, setCount] = useState(5);

  const handleGenerate = async () => {
    try {
      const res = await api.generateInviteCodes(count);
      showMsg(`${res.codes.length} codigos generados`);
      reload();
    } catch { showMsg("Error al generar codigos"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-white">Codigos de Invitacion ({invites.length})</h2>
        <div className="flex items-center gap-2">
          <input type="number" value={count} onChange={(e) => setCount(parseInt(e.target.value) || 1)} min="1" max="50"
            className="w-16 bg-[#0a0a0a] border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs text-center" />
          <button onClick={handleGenerate}
            className="flex items-center gap-1 px-3 py-1.5 text-xs gold-gradient text-black rounded-lg font-medium">
            <Plus size={14} /> Generar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {invites.map((inv) => (
          <div key={inv.id} className={`card-dark rounded-lg p-3 flex items-center justify-between ${inv.is_used ? "opacity-50" : ""}`}>
            <div>
              <p className={`font-mono font-bold text-sm tracking-wider ${inv.is_used ? "text-gray-500 line-through" : "text-[#ffd700]"}`}>{inv.code}</p>
              <p className="text-xs text-gray-600 mt-0.5">
                {new Date(inv.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: "America/Bogota" })}
                {inv.is_used && inv.used_by_username ? ` | ${inv.used_by_username}` : ""}
              </p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${inv.is_used ? "bg-gray-500/20 text-gray-400" : "bg-green-500/20 text-green-400"}`}>
              {inv.is_used ? "Usado" : "Disponible"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* === PROMOTIONS === */
function PromotionsPanel({ showMsg }: { showMsg: (m: string) => void }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const inputClass = "w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-[#b8860b] focus:outline-none";

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) { showMsg("Titulo y mensaje son requeridos"); return; }
    setSending(true);
    try {
      const res = await api.sendPromotion({ title: title.trim(), message: message.trim() });
      showMsg(res.message || "Promocion enviada");
      setTitle("");
      setMessage("");
    } catch { showMsg("Error al enviar promocion"); }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Megaphone size={18} className="text-[#ffd700]" />
        <h2 className="font-bold text-white">Enviar Promocion</h2>
      </div>
      <p className="text-xs text-gray-400">Envia un mensaje promocional a todos los usuarios activos. Aparecera como notificacion en tiempo real.</p>

      <div className="card-dark rounded-xl p-5 space-y-4">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Titulo</label>
          <input
            placeholder="Ej: Bono de bienvenida"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            maxLength={100}
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Mensaje</label>
          <textarea
            placeholder="Escribe el mensaje de la promocion..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`${inputClass} h-28 resize-none`}
            maxLength={500}
          />
          <p className="text-[10px] text-gray-600 mt-1 text-right">{message.length}/500</p>
        </div>
        <button
          onClick={handleSend}
          disabled={sending || !title.trim() || !message.trim()}
          className="flex items-center justify-center gap-2 w-full py-3 text-sm gold-gradient text-black rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={16} />
          {sending ? "Enviando..." : "Enviar Promocion a Todos los Usuarios"}
        </button>
      </div>
    </div>
  );
}

/* === BACKUPS === */
interface BackupInfo {
  name: string; path: string; size_kb: number;
}

function BackupsPanel({ showMsg }: { showMsg: (m: string) => void }) {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  const loadBackups = async () => {
    try {
      const res = await api.getBackups();
      setBackups(res.backups || []);
    } catch { showMsg("Error al cargar backups"); }
    setLoading(false);
  };

  useEffect(() => { loadBackups(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.createBackup();
      showMsg("Backup creado exitosamente");
      loadBackups();
    } catch { showMsg("Error al crear backup"); }
    setCreating(false);
  };

  const handleRestore = async (name: string) => {
    if (!confirm(`Restaurar base de datos desde ${name}? Se creara un backup del estado actual antes de restaurar.`)) return;
    setRestoring(name);
    try {
      await api.restoreBackup(name);
      showMsg(`Base de datos restaurada desde ${name}`);
      loadBackups();
    } catch { showMsg("Error al restaurar backup"); }
    setRestoring(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-[#ffd700]" />
          <h2 className="font-bold text-white">Backups de Base de Datos</h2>
        </div>
        <button onClick={handleCreate} disabled={creating}
          className="flex items-center gap-1 px-3 py-1.5 text-xs gold-gradient text-black rounded-lg font-medium disabled:opacity-50">
          <Download size={14} />
          {creating ? "Creando..." : "Crear Backup"}
        </button>
      </div>
      <p className="text-xs text-gray-400">
        Los backups se crean automaticamente al iniciar el servidor. Se mantienen los ultimos 20 backups.
        Puedes crear backups manuales y restaurar desde cualquier backup disponible.
      </p>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Cargando backups...</div>
      ) : backups.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No hay backups disponibles</div>
      ) : (
        <div className="space-y-2">
          {backups.map((b) => (
            <div key={b.name} className="card-dark rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-white font-medium">{b.name}</p>
                <p className="text-xs text-gray-500">{b.size_kb} KB</p>
              </div>
              <button onClick={() => handleRestore(b.name)} disabled={restoring === b.name}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#1a1a1a] border border-gray-700 text-gray-300 rounded-lg hover:border-[#b8860b]/50 hover:text-[#ffd700] transition disabled:opacity-50">
                <Upload size={12} />
                {restoring === b.name ? "Restaurando..." : "Restaurar"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

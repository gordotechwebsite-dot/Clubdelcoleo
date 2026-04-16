import { useEffect, useState } from "react";
import { api } from "../lib/api";
import {
  Shield, Users, Calendar, Trophy, BarChart3, Ticket, Plus, Trash2, Save,
  X, ChevronDown, ChevronUp, Radio, RefreshCw,
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
  player_id: number; name: string; nickname: string; team: string; position: number;
  odds: number; rating: number; stats_wins: number; stats_losses: number;
}
interface UserData {
  id: number; username: string; email: string; full_name: string; phone: string;
  balance: number; is_active: boolean; is_admin: boolean; created_at: string;
}
interface BetData {
  id: number; user_id: number; event_id: number; player_id: number; amount: number;
  odds: number; potential_win: number; status: string; ticket_code: string;
  created_at: string; username: string; event_name: string; player_name: string;
}
interface InviteCode {
  id: number; code: string; used: boolean; used_by: number | null; created_at: string;
}
interface Stats {
  total_users: number; total_events: number; total_bets: number;
  total_bet_amount: number; pending_bets: number; active_events: number;
}

type Tab = "stats" | "events" | "players" | "users" | "bets" | "invites";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("stats");
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [bets, setBets] = useState<BetData[]>([]);
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const loadTab = async (t: Tab) => {
    setLoading(true);
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
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { loadTab(tab); }, [tab]);

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const tabs: { key: Tab; label: string; icon: typeof Shield }[] = [
    { key: "stats", label: "Estadisticas", icon: BarChart3 },
    { key: "events", label: "Eventos", icon: Calendar },
    { key: "players", label: "Jugadores", icon: Trophy },
    { key: "users", label: "Usuarios", icon: Users },
    { key: "bets", label: "Apuestas", icon: Ticket },
    { key: "invites", label: "Invitaciones", icon: Shield },
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
          {tab === "invites" && <InvitesPanel invites={invites} reload={() => loadTab("invites")} showMsg={showMsg} />}
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
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((item, i) => (
        <div key={i} className="card-dark rounded-xl p-4 text-center">
          <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
          <p className="text-xs text-gray-500 mt-1">{item.label}</p>
        </div>
      ))}
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
  const [editOdds, setEditOdds] = useState<Record<number, string>>({});
  const [addPlayer, setAddPlayer] = useState<{ eventId: number; playerId: string; odds: string } | null>(null);

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

  const handleUpdateOdds = async (eventId: number, playerId: number, odds: string) => {
    const oddsNum = parseFloat(odds);
    if (isNaN(oddsNum) || oddsNum <= 1) { showMsg("Cuota debe ser mayor a 1.00"); return; }
    try {
      await api.addPlayerToEvent(eventId, { player_id: playerId, odds: oddsNum });
      showMsg(`Cuota actualizada: ${oddsNum.toFixed(2)}x`);
      reload();
    } catch { showMsg("Error al actualizar cuota"); }
  };

  const handleAddPlayer = async () => {
    if (!addPlayer) return;
    const playerId = parseInt(addPlayer.playerId);
    const odds = parseFloat(addPlayer.odds);
    if (isNaN(playerId) || isNaN(odds) || odds <= 1) { showMsg("Datos invalidos"); return; }
    try {
      await api.addPlayerToEvent(addPlayer.eventId, { player_id: playerId, odds });
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
            <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputClass}>
              <option value="colombia">Colombia</option>
              <option value="venezuela">Venezuela</option>
            </select>
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
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-[#b8860b]/20 text-[#ffd700]">{event.country === "venezuela" ? "VEN" : "COL"}</span>
                  <div>
                    <p className="font-bold text-white text-sm">{event.name}</p>
                    <p className="text-xs text-gray-500">{event.date} {event.time} - {event.location}</p>
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
                    <button onClick={() => setAddPlayer({ eventId: event.id, playerId: "", odds: "2.0" })}
                      className="flex items-center gap-1 text-xs text-[#ffd700] hover:text-[#b8860b]">
                      <Plus size={12} /> Agregar
                    </button>
                  </div>

                  {addPlayer && addPlayer.eventId === event.id && (
                    <div className="flex items-center gap-2 bg-[#0a0a0a] rounded-lg p-2">
                      <select value={addPlayer.playerId} onChange={(e) => setAddPlayer({ ...addPlayer, playerId: e.target.value })}
                        className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded text-xs text-white p-1.5">
                        <option value="">Seleccionar jugador</option>
                        {players.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.nickname})</option>)}
                      </select>
                      <input placeholder="Cuota" value={addPlayer.odds} onChange={(e) => setAddPlayer({ ...addPlayer, odds: e.target.value })}
                        className="w-20 bg-[#1a1a1a] border border-gray-700 rounded text-xs text-white p-1.5" />
                      <button onClick={handleAddPlayer} className="text-green-400 hover:text-green-300"><Save size={14} /></button>
                      <button onClick={() => setAddPlayer(null)} className="text-red-400 hover:text-red-300"><X size={14} /></button>
                    </div>
                  )}

                  {event.players && event.players.map((p) => (
                    <div key={p.player_id} className="flex items-center justify-between bg-[#0a0a0a] rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">#{p.position}</span>
                        <span className="text-sm text-white">{p.name}</span>
                        <span className="text-xs text-gray-500">&quot;{p.nickname}&quot;</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          defaultValue={editOdds[p.player_id] ?? p.odds.toFixed(2)}
                          onChange={(e) => setEditOdds({ ...editOdds, [p.player_id]: e.target.value })}
                          className="w-16 bg-[#1a1a1a] border border-gray-700 rounded text-xs text-[#ffd700] text-center p-1 font-bold"
                        />
                        <button onClick={() => handleUpdateOdds(event.id, p.player_id, editOdds[p.player_id] ?? p.odds.toFixed(2))}
                          className="text-[#ffd700] hover:text-[#b8860b]"><Save size={12} /></button>
                        <button onClick={() => handleRemovePlayer(event.id, p.player_id)}
                          className="text-red-400 hover:text-red-300"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                  {(!event.players || event.players.length === 0) && (
                    <p className="text-xs text-gray-600 text-center py-2">Sin jugadores asignados</p>
                  )}
                </div>

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
                <p className="text-xs text-gray-500">&quot;{p.nickname}&quot; - {p.team}</p>
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
function UsersPanel({ users, reload, showMsg }: {
  users: UserData[]; reload: () => void; showMsg: (m: string) => void;
}) {
  const formatCOP = (n: number) => n.toLocaleString("es-CO");

  const toggleActive = async (id: number, is_active: boolean) => {
    try {
      await api.updateUser(id, { is_active: !is_active });
      showMsg(`Usuario ${!is_active ? "activado" : "desactivado"}`);
      reload();
    } catch { showMsg("Error al actualizar"); }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-white">Usuarios ({users.length})</h2>
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="card-dark rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                u.is_admin ? "gold-gradient text-black" : "bg-[#1a1a1a] text-gray-400"
              }`}>
                {u.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white text-sm">{u.full_name || u.username}</p>
                  {u.is_admin && <span className="text-xs bg-[#b8860b]/20 text-[#ffd700] px-1.5 py-0.5 rounded">ADMIN</span>}
                </div>
                <p className="text-xs text-gray-500">{u.email} - Saldo: ${formatCOP(u.balance)} COP</p>
              </div>
            </div>
            <button onClick={() => toggleActive(u.id, u.is_active)}
              className={`px-3 py-1 text-xs rounded-full ${u.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
              {u.is_active ? "Activo" : "Inactivo"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* === BETS === */
function BetsPanel({ bets }: { bets: BetData[] }) {
  const formatCOP = (n: number) => n.toLocaleString("es-CO");
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-white">Todas las Apuestas ({bets.length})</h2>
      <div className="space-y-2">
        {bets.map((bet) => (
          <div key={bet.id} className="card-dark rounded-xl p-3 flex items-center justify-between">
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
          <div key={inv.id} className={`card-dark rounded-lg p-3 flex items-center justify-between ${inv.used ? "opacity-50" : ""}`}>
            <div>
              <p className="font-mono text-[#ffd700] font-bold text-sm tracking-wider">{inv.code}</p>
              <p className="text-xs text-gray-600 mt-0.5">
                {new Date(inv.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
              </p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${inv.used ? "bg-gray-500/20 text-gray-400" : "bg-green-500/20 text-green-400"}`}>
              {inv.used ? "Usado" : "Disponible"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

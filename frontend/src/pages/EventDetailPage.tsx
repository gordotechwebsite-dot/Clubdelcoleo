import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, getUser, setUser } from "../lib/api";
import { formatMoneyInput, parseMoneyInput } from "../lib/utils";
import { Trophy, Star, TrendingUp, ArrowLeft, CheckCircle2, X, Search, ArrowUpDown, Crown } from "lucide-react";

interface Player {
  id: number; name: string; nickname: string; team: string; odds: number;
  position: number; stats_wins: number; stats_losses: number; rating: number;
  day: number;
}
interface EventData {
  id: number; name: string; description: string; location: string;
  country: string; date: string; time: string; status: string; stream_url: string | null;
  winner_player_id: number | null;
  players: Player[];
}
interface BetResult {
  bet_id: number; ticket_code: string; event_name: string; event_date: string;
  event_time: string; event_location: string; player_name: string; amount: number;
  odds: number; potential_win: number; status: string; new_balance: number; created_at: string;
}

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [betError, setBetError] = useState("");
  const [betting, setBetting] = useState(false);
  const [betResult, setBetResult] = useState<BetResult | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"position" | "odds_asc" | "odds_desc" | "name" | "rating">("position");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [user, setUserState] = useState(getUser());

  useEffect(() => {
    if (id) api.getEvent(Number(id)).then(setEvent).catch(console.error).finally(() => setLoading(false));
    // Fetch fresh balance from server
    api.getMe().then((me) => { setUser(me); setUserState(me); }).catch(() => {});
  }, [id]);

  const days = useMemo(() => {
    if (!event) return [];
    return [...new Set(event.players.map(p => p.day || 1))].sort((a, b) => a - b);
  }, [event]);

  const filteredPlayers = useMemo(() => {
    if (!event) return [];
    let players = [...event.players];
    if (selectedDay !== null) {
      players = players.filter(p => (p.day || 1) === selectedDay);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      players = players.filter(p =>
        (p.name || "").toLowerCase().includes(q) || (p.nickname || "").toLowerCase().includes(q) || (p.team || "").toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case "odds_asc": players.sort((a, b) => a.odds - b.odds); break;
      case "odds_desc": players.sort((a, b) => b.odds - a.odds); break;
      case "name": players.sort((a, b) => (a.name || "").localeCompare(b.name || "")); break;
      case "rating": players.sort((a, b) => b.rating - a.rating); break;
      default: players.sort((a, b) => a.position - b.position);
    }
    return players;
  }, [event, searchQuery, sortBy, selectedDay]);

  const winnerPlayer = useMemo(() => {
    if (!event || !event.winner_player_id) return null;
    return event.players.find(p => p.id === event.winner_player_id) || null;
  }, [event]);

  const formatDate = (d: string) => {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" });
  };

  const formatCOP = (n: number) => n.toLocaleString("es-CO");

  const handleBet = async () => {
    if (!selectedPlayer || !betAmount) return;
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount < 1000) {
      setBetError("Apuesta minima: $1.000 COP");
      return;
    }
    if (amount > (user?.balance || 0)) {
      setBetError("Saldo insuficiente. Redirigiendo a recargar...");
      setTimeout(() => navigate("/wallet"), 1500);
      return;
    }
    setBetError("");
    setBetting(true);
    try {
      const result = await api.placeBet({
        event_id: Number(id),
        player_id: selectedPlayer.id,
        amount,
      });
      setBetResult(result);
      setShowConfirmation(true);
      const me = await api.getMe();
      setUser(me);
      setUserState(me);
    } catch (err) {
      setBetError(err instanceof Error ? err.message : "Error al apostar");
    } finally {
      setBetting(false);
    }
  };

  if (loading) return <div className="text-center py-16 text-gray-500">Cargando evento...</div>;
  if (!event) return <div className="text-center py-16 text-gray-500">Evento no encontrado</div>;

  /* Cloudbet-style confirmation overlay */
  if (showConfirmation && betResult) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="w-full sm:max-w-md bg-[#111] sm:rounded-2xl rounded-t-2xl overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="bg-green-500/10 p-5 text-center relative">
            <button onClick={() => setShowConfirmation(false)} className="absolute top-3 right-3 text-gray-500 hover:text-white">
              <X size={20} />
            </button>
            <img src="/logo-gold.png" alt="Club del Coleo" className="h-12 mx-auto mb-2" />
            <CheckCircle2 size={32} className="text-green-400 mx-auto mb-1" />
            <h2 className="text-lg font-black text-green-400">APUESTA REALIZADA</h2>
            <p className="text-xs text-gray-400 mt-1">Tu apuesta ha sido registrada exitosamente</p>
          </div>

          {/* Bet details */}
          <div className="p-5 space-y-3">
            <div className="bg-[#1a1a1a] rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Evento</span>
                <span className="text-xs text-gray-400">{betResult.event_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Seleccion</span>
                <span className="text-sm font-bold text-[#ffd700]">{betResult.player_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Cuota</span>
                <span className="text-sm font-bold text-white">{betResult.odds.toFixed(2)}x</span>
              </div>
              <div className="border-t border-gray-700 my-1" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Monto apostado</span>
                <span className="text-sm font-bold text-white">${formatCOP(betResult.amount)} COP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Ganancia potencial</span>
                <span className="text-sm font-bold text-green-400">${formatCOP(betResult.potential_win)} COP</span>
              </div>
            </div>

            <div className="bg-[#1a1a1a] rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">Codigo de ticket</span>
              <span className="font-mono text-[#ffd700] font-bold tracking-wider text-sm">{betResult.ticket_code}</span>
            </div>

            <div className="bg-[#1a1a1a] rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">Nuevo saldo</span>
              <span className="text-sm font-bold text-[#ffd700]">${formatCOP(betResult.new_balance)} COP</span>
            </div>
          </div>

          {/* Action buttons - Cloudbet style */}
          <div className="p-5 pt-0 space-y-2">
            <button
              onClick={() => { setShowConfirmation(false); setBetResult(null); setSelectedPlayer(null); setBetAmount(""); }}
              className="w-full border border-[#b8860b] text-[#ffd700] font-bold py-3 rounded-xl hover:bg-[#b8860b]/10 transition text-sm"
            >
              Nueva Apuesta
            </button>
            <button
              onClick={() => navigate("/my-bets")}
              className="w-full gold-gradient text-black font-bold py-3 rounded-xl hover:opacity-90 transition text-sm"
            >
              Ver Mis Apuestas
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-[#ffd700] transition text-sm">
        <ArrowLeft size={16} /> Volver
      </button>

      {/* Live stream bar */}
      {event.stream_url && (event.status === "live" || event.status === "upcoming") && (
        <a
          href={event.stream_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-gradient-to-r from-[#0a1628] to-[#0d1f3c] border border-cyan-500/30 rounded-xl p-3 text-center hover:border-cyan-400/60 transition-all group"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="text-white font-bold text-sm tracking-wide group-hover:text-cyan-300 transition">
              TRANSMISION EN VIVO
            </span>
          </div>
        </a>
      )}

      {/* Event Header */}
      <div className="card-dark rounded-2xl overflow-hidden">
        <div className="h-2 gold-gradient" />
        <div className="p-5 sm:p-6 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white">{event.name}</h1>
            </div>
            <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full ${
              event.status === "upcoming" ? "bg-green-500/20 text-green-400" :
              event.status === "live" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"
            }`}>
              {event.status === "upcoming" ? "ABIERTO" : event.status === "live" ? "EN VIVO" : "FINALIZADO"}
            </span>
          </div>
          <p className="text-gray-400 text-sm">{event.description}</p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            <span className="capitalize">{formatDate(event.date)}</span>
            <span>{event.location}</span>
          </div>
        </div>
      </div>

      {/* Winner Banner */}
      {event.status === "finished" && winnerPlayer && (
        <div className="card-dark rounded-2xl overflow-hidden border-[#ffd700]/40">
          <div className="gold-gradient p-4 text-center">
            <Crown size={28} className="text-black mx-auto mb-1" />
            <p className="text-black font-black text-lg">GANADOR DEL EVENTO</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-black text-[#ffd700]">{winnerPlayer.name}</p>
            <p className="text-sm text-gray-400">"{winnerPlayer.nickname}" - Cuota: {winnerPlayer.odds.toFixed(2)}x</p>
          </div>
        </div>
      )}

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar coleador por nombre o apodo..."
            autoComplete="off"
            className="w-full bg-[#111] border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-base sm:text-sm focus:border-[#b8860b] focus:outline-none"
          />
        </div>
        <div className="relative">
          <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="w-full sm:w-auto bg-[#111] border border-gray-700 rounded-lg pl-8 pr-4 py-2.5 text-white text-base sm:text-sm focus:border-[#b8860b] focus:outline-none appearance-none cursor-pointer"
          >
            <option value="position">Posicion</option>
            <option value="odds_asc">Cuota: Menor a Mayor</option>
            <option value="odds_desc">Cuota: Mayor a Menor</option>
            <option value="name">Nombre A-Z</option>
            <option value="rating">Mejor Rating</option>
          </select>
        </div>
      </div>

      {/* Players List - full width */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Trophy size={18} className="text-[#ffd700]" /> Coleadores Participantes
        </h2>
        {days.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedDay(null)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedDay === null ? "bg-[#b8860b]/20 text-[#ffd700]" : "bg-[#111] text-gray-400 hover:text-gray-200"
              }`}
            >
              Todos
            </button>
            {days.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedDay === d ? "bg-[#b8860b]/20 text-[#ffd700]" : "bg-[#111] text-gray-400 hover:text-gray-200"
                }`}
              >
                Dia {d}
              </button>
            ))}
          </div>
        )}
        <div className="space-y-2">
          {filteredPlayers.length === 0 && (
            <div className="card-dark rounded-xl p-6 text-center text-gray-500 text-sm">
              No se encontraron coleadores con esa busqueda.
            </div>
          )}
          {filteredPlayers.map((player) => (
            <button
              key={player.id}
              onClick={() => {
                if (event.status === "upcoming") {
                  setSelectedPlayer(selectedPlayer?.id === player.id ? null : player);
                  setBetAmount("");
                  setBetError("");
                }
              }}
              disabled={event.status !== "upcoming"}
              className={`w-full text-left card-dark rounded-xl p-4 transition-all ${
                selectedPlayer?.id === player.id
                  ? "!border-[#ffd700] bg-[#ffd700]/5"
                  : event.status === "upcoming" ? "hover:border-[#b8860b]/50 cursor-pointer" : "opacity-60"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    selectedPlayer?.id === player.id ? "gold-gradient text-black" : "bg-[#b8860b]/20 text-[#ffd700]"
                  }`}>
                    #{player.position}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{player.name}</p>
                    {(player.nickname && player.nickname !== "None") && (
                      <p className="text-xs text-gray-500">
                        &quot;{player.nickname}&quot;
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-[#ffd700] font-bold text-lg">
                    <TrendingUp size={14} />
                    {player.odds.toFixed(2)}x
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Star size={10} className="text-[#b8860b]" /> {player.rating.toFixed(1)}
                    <span className="text-green-400">{player.stats_wins}G</span>
                    <span className="text-red-400">{player.stats_losses}P</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bet Bottom Sheet - slides up when player selected */}
      {event.status === "upcoming" && selectedPlayer && (
        <div className="fixed inset-0 z-40" onClick={() => { setSelectedPlayer(null); setBetAmount(""); setBetError(""); }}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute bottom-0 left-0 right-0 animate-slide-up max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#111] border-t border-[#b8860b]/40 rounded-t-2xl p-5 pb-24 sm:pb-5 space-y-4 max-w-2xl mx-auto">
              {/* Handle bar */}
              <div className="flex justify-center">
                <div className="w-10 h-1 bg-gray-600 rounded-full" />
              </div>

              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Trophy size={16} className="text-[#ffd700]" /> Realizar Apuesta
                </h3>
                <button onClick={() => { setSelectedPlayer(null); setBetAmount(""); setBetError(""); }} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="bg-[#b8860b]/10 rounded-lg p-3">
                <p className="text-xs text-gray-400">Jugador seleccionado</p>
                <p className="font-bold text-[#ffd700]">{selectedPlayer.name}</p>
                <p className="text-xs text-gray-500">{selectedPlayer.nickname && selectedPlayer.nickname !== "None" ? `"${selectedPlayer.nickname}" - ` : ""}Cuota: {selectedPlayer.odds.toFixed(2)}x</p>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Monto de apuesta (COP)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatMoneyInput(betAmount)}
                  onChange={(e) => setBetAmount(parseMoneyInput(e.target.value))}
                  className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-[#b8860b] focus:outline-none text-lg font-bold"
                  placeholder="10.000"
                />
                <div className="flex gap-2 mt-2">
                  {[5000, 10000, 20000, 50000, 100000].map((amt) => (
                    <button key={amt} onClick={() => setBetAmount(String(amt))}
                      className={`flex-1 border rounded-md py-1.5 text-xs font-medium transition ${
                        betAmount === String(amt)
                          ? "bg-[#b8860b]/20 border-[#b8860b] text-[#ffd700]"
                          : "bg-[#1a1a1a] border-gray-700 text-gray-400 hover:border-[#b8860b] hover:text-[#ffd700]"
                      }`}>
                      {amt >= 1000 ? `${amt / 1000}K` : amt}
                    </button>
                  ))}
                </div>
              </div>

              {betAmount && parseFloat(betAmount) >= 1000 && (
                <div className="bg-[#0a0a0a] rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Monto:</span>
                    <span className="text-white">${formatCOP(parseFloat(betAmount))} COP</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Cuota:</span>
                    <span className="text-[#ffd700]">{selectedPlayer.odds.toFixed(2)}x</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-gray-800 pt-1 mt-1">
                    <span className="text-gray-300">Ganancia potencial:</span>
                    <span className="text-green-400">${formatCOP(parseFloat(betAmount) * selectedPlayer.odds)} COP</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Saldo: <span className="text-[#ffd700]">${formatCOP(user?.balance || 0)} COP</span>
                </div>
                {betError && (
                  <span className="text-red-400 text-xs">{betError}</span>
                )}
              </div>

              <button
                onClick={handleBet}
                disabled={betting || !betAmount || parseFloat(betAmount) < 1000}
                className="w-full gold-gradient text-black font-bold py-3.5 rounded-xl hover:opacity-90 transition disabled:opacity-50 text-base"
              >
                {betting ? "Procesando..." : "Confirmar Apuesta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

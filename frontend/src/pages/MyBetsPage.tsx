import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Trophy, ChevronDown, ChevronUp } from "lucide-react";
import BetTicket from "../components/BetTicket";

interface Bet {
  id: number; event_id: number; player_id: number; amount: number; odds: number;
  potential_win: number; status: string; ticket_code: string; created_at: string;
  event_name: string; event_date: string; event_time: string; event_location: string;
  player_name: string; resolved_at?: string;
}

export default function MyBetsPage() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBet, setExpandedBet] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    api.getMyBets().then(setBets).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? bets : bets.filter((b) => b.status === filter);

  const totalBet = bets.reduce((s, b) => s + b.amount, 0);
  const totalWon = bets.filter((b) => b.status === "won").reduce((s, b) => s + b.potential_win, 0);
  const totalLost = bets.filter((b) => b.status === "lost").reduce((s, b) => s + b.amount, 0);
  const netResult = totalWon - totalLost;

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
      <div className="skeleton h-8 w-48" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="card-dark rounded-xl p-3"><div className="skeleton h-4 w-20 mx-auto mb-1" /><div className="skeleton h-5 w-16 mx-auto" /></div>)}
      </div>
      <div className="space-y-3">
        {[1,2,3].map(i => <div key={i} className="card-dark rounded-xl p-4 flex items-center gap-3"><div className="skeleton w-10 h-10 rounded-full" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-32" /><div className="skeleton h-3 w-48" /></div><div className="skeleton h-5 w-20 ml-auto" /></div>)}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
      <h1 className="text-2xl font-bold text-white">Mis Apuestas</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-dark rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">Total Apostado</p>
          <p className="font-bold text-white text-sm">${totalBet.toLocaleString("es-CO")}</p>
        </div>
        <div className="card-dark rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">Ganado</p>
          <p className="font-bold text-green-400 text-sm">${totalWon.toLocaleString("es-CO")}</p>
        </div>
        <div className="card-dark rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">Perdido</p>
          <p className="font-bold text-red-400 text-sm">${totalLost.toLocaleString("es-CO")}</p>
        </div>
        <div className="card-dark rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">Resultado Neto</p>
          <p className={`font-bold text-sm ${netResult >= 0 ? "text-green-400" : "text-red-400"}`}>
            {netResult >= 0 ? "+" : "-"}${Math.abs(netResult).toLocaleString("es-CO")}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { key: "all", label: "Todas" },
          { key: "pending", label: "Activas" },
          { key: "won", label: "Ganadas" },
          { key: "lost", label: "Perdidas" },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
              filter === f.key ? "gold-gradient text-black" : "bg-[#1a1a1a] text-gray-400 border border-gray-700 hover:border-[#b8860b]/50"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Bets List */}
      {filtered.length === 0 ? (
        <div className="card-dark rounded-xl p-12 text-center text-gray-500">
          {filter === "all" ? "No has realizado apuestas aun" : "No hay apuestas en esta categoria"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((bet) => (
            <div key={bet.id} className="card-dark rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedBet(expandedBet === bet.id ? null : bet.id)}
                className="w-full text-left p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    bet.status === "pending" ? "bg-yellow-500/20" : bet.status === "won" ? "bg-green-500/20" : "bg-red-500/20"
                  }`}>
                    <Trophy size={18} className={
                      bet.status === "pending" ? "text-yellow-400" : bet.status === "won" ? "text-green-400" : "text-red-400"
                    } />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{bet.player_name}</p>
                    <p className="text-xs text-gray-500">{bet.event_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-white text-sm">${bet.amount.toLocaleString("es-CO")}</p>
                    <p className="text-xs text-[#ffd700]">{bet.odds.toFixed(2)}x</p>
                    {bet.status === "won" && <p className="text-xs text-green-400 font-bold">+${bet.potential_win.toLocaleString("es-CO")}</p>}
                    {bet.status === "lost" && <p className="text-xs text-red-400">Perdida</p>}
                  </div>
                  {expandedBet === bet.id ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                </div>
              </button>

              {expandedBet === bet.id && (
                <div className="px-4 pb-4">
                  <BetTicket bet={bet} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

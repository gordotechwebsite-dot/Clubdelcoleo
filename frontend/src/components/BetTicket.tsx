import { Calendar, MapPin, Clock, Trophy, Shield, Hash } from "lucide-react";

interface BetData {
  ticket_code: string; event_name: string; event_date: string; event_time: string;
  event_location: string; player_name: string; amount: number; odds: number;
  potential_win: number; status: string; created_at: string;
}

export default function BetTicket({ bet }: { bet: BetData }) {
  const formatDate = (d: string) => {
    try {
      const date = new Date(d.includes("T") ? d : d + "T00:00:00");
      return date.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      return d;
    }
  };

  const formatTime = (d: string) => {
    try {
      const date = new Date(d);
      return date.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true });
    } catch {
      return "";
    }
  };

  const formatTime12 = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Ticket */}
      <div className="bg-gradient-to-b from-[#1a1708] to-[#0f0f0f] border border-[#b8860b]/40 rounded-2xl overflow-hidden shadow-2xl shadow-[#b8860b]/10">
        {/* Header */}
        <div className="gold-gradient p-4 text-center relative">
          <div className="absolute top-2 left-3 text-black/30 text-xs font-mono">CDC</div>
          <div className="absolute top-2 right-3 text-black/30 text-xs font-mono">CDC</div>
          <img src="/logo-gold.png" alt="Club del Coleo" className="h-14 mx-auto mb-1" />
          <p className="text-black/60 text-xs font-medium">TALON DE APUESTA OFICIAL</p>
        </div>

        {/* Dashed separator */}
        <div className="relative">
          <div className="absolute -left-3 top-0 w-6 h-6 bg-[#0a0a0a] rounded-full" />
          <div className="absolute -right-3 top-0 w-6 h-6 bg-[#0a0a0a] rounded-full" />
          <div className="border-t-2 border-dashed border-[#b8860b]/30 mx-6" />
        </div>

        {/* Ticket Code */}
        <div className="px-5 pt-4 pb-2 text-center">
          <div className="flex items-center justify-center gap-2">
            <Hash size={14} className="text-[#b8860b]" />
            <span className="font-mono text-[#ffd700] text-lg font-bold tracking-[0.3em]">{bet.ticket_code}</span>
          </div>
          <p className="text-gray-600 text-xs mt-1">Codigo de verificacion</p>
        </div>

        {/* Event Info */}
        <div className="px-5 py-3 space-y-2">
          <div className="bg-[#b8860b]/10 rounded-lg p-3 space-y-1.5">
            <p className="font-bold text-[#ffd700] text-sm">{bet.event_name}</p>
            <div className="flex flex-wrap gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Calendar size={11} className="text-[#b8860b]" /> {formatDate(bet.event_date)}</span>
              <span className="flex items-center gap-1"><Clock size={11} className="text-[#b8860b]" /> {formatTime12(bet.event_time)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <MapPin size={11} className="text-[#b8860b]" /> {bet.event_location}
            </div>
          </div>
        </div>

        {/* Bet Details */}
        <div className="px-5 py-2 space-y-2">
          <div className="flex items-center gap-2 bg-[#ffd700]/5 rounded-lg p-3 border border-[#b8860b]/20">
            <Trophy size={18} className="text-[#ffd700]" />
            <div>
              <p className="text-xs text-gray-400">Apuesta a</p>
              <p className="font-bold text-white">{bet.player_name}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-[#1a1a1a] rounded-lg p-2">
              <p className="text-xs text-gray-500">Monto</p>
              <p className="font-bold text-white text-sm">${bet.amount.toLocaleString("es-CO")}</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-2">
              <p className="text-xs text-gray-500">Cuota</p>
              <p className="font-bold text-[#ffd700] text-sm">{bet.odds.toFixed(2)}x</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-2">
              <p className="text-xs text-gray-500">Ganancia</p>
              <p className="font-bold text-green-400 text-sm">${bet.potential_win.toLocaleString("es-CO")}</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="px-5 py-2">
          <div className={`text-center py-2 rounded-lg font-bold text-sm ${
            bet.status === "pending" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
            bet.status === "won" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
            "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}>
            {bet.status === "pending" ? "APUESTA ACTIVA" : bet.status === "won" ? "GANADORA!" : "PERDIDA"}
          </div>
        </div>

        {/* Dashed separator */}
        <div className="relative my-2">
          <div className="absolute -left-3 top-0 w-6 h-6 bg-[#0a0a0a] rounded-full" />
          <div className="absolute -right-3 top-0 w-6 h-6 bg-[#0a0a0a] rounded-full" />
          <div className="border-t-2 border-dashed border-[#b8860b]/30 mx-6" />
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 pt-1 text-center space-y-2">
          <div className="flex items-center justify-center gap-3 text-xs text-gray-600">
            <Shield size={12} className="text-[#b8860b]" />
            <span>Plataforma Certificada</span>
            <span>|</span>
            <span>Juego Responsable</span>
          </div>
          {bet.created_at && (
            <p className="text-xs text-gray-700 font-mono">
              Emitido: {formatDate(bet.created_at)} {formatTime(bet.created_at)}
            </p>
          )}
          <p className="text-xs text-gray-700">clubdelcoleo.com | +18</p>
        </div>
      </div>
    </div>
  );
}

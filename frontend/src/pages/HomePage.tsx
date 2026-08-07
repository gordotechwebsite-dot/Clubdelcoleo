import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getUser } from "../lib/api";
import { ChevronRight, Trophy, Users, Shield, Star } from "lucide-react";

interface Event {
  id: number; name: string; description: string; location: string;
  country: string; date: string; time: string; status: string; image_url: string | null;
}

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    api.getEvents("upcoming").then(setEvents).catch(console.error).finally(() => setLoading(false));
  }, []);

  const formatDate = (d: string) => {
    const date = new Date(d + "T00:00:00-05:00");
    return date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" });
  };

  const imageSrc = (url: string) =>
    url.startsWith("http") ? url : `${import.meta.env.VITE_API_URL || ""}${url}`;

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden card-dark p-6 sm:p-8">
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-4xl font-black gold-text mb-2">Bienvenido, {user?.full_name || user?.username}!</h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-lg">
            La mejor plataforma de apuestas de coleo. Eventos en vivo, cuotas competitivas y pagos seguros.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link to="/events"
              className="gold-gradient text-black font-bold px-5 py-2.5 rounded-lg text-sm hover:opacity-90 transition inline-flex items-center gap-2">
              <Trophy size={16} /> Ver Eventos
            </Link>
            <Link to="/wallet"
              className="border border-[#b8860b] text-[#ffd700] font-bold px-5 py-2.5 rounded-lg text-sm hover:bg-[#b8860b]/10 transition inline-flex items-center gap-2">
              Cargar Saldo
            </Link>
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Proximos Eventos</h2>
          <Link to="/events" className="text-[#daa520] text-sm hover:text-[#ffd700] flex items-center gap-1">
            Ver todos <ChevronRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="card-dark rounded-2xl overflow-hidden">
                <div className="aspect-[16/9] skeleton" />
                <div className="px-4 py-3">
                  <div className="skeleton h-3.5 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="card-dark rounded-xl p-8 text-center text-gray-500">
            No hay eventos proximos programados
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <Link key={event.id} to={`/events/${event.id}`}
                className="card-dark rounded-2xl overflow-hidden border border-gray-800 hover:border-[#b8860b] hover:shadow-[0_0_25px_rgba(184,134,11,0.15)] transition-all group">
                <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-black">
                  {event.image_url ? (
                    <img src={imageSrc(event.image_url)} alt={event.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-5xl font-black text-[#b8860b]/20 tracking-tighter">COLEO</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                  <span className="absolute top-3 right-3 bg-green-500/25 text-green-300 border border-green-500/40 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                    ABIERTO
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-black text-white group-hover:text-[#ffd700] transition text-lg leading-tight uppercase drop-shadow">{event.name}</h3>
                    <p className="text-[#daa520] text-xs font-semibold mt-1 uppercase tracking-wide">{event.location}</p>
                  </div>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-2 border-t border-gray-800">
                  <p className="text-xs text-gray-400 capitalize">{formatDate(event.date)}</p>
                  <span className="text-[#daa520] text-xs font-semibold flex items-center gap-0.5 shrink-0">
                    Apostar <ChevronRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Shield, label: "Certificada", value: "100% Segura", color: "text-green-400" },
          { icon: Trophy, label: "Eventos Activos", value: `${events.length}`, color: "text-[#ffd700]" },
          { icon: Users, label: "Comunidad", value: "Exclusiva", color: "text-blue-400" },
          { icon: Star, label: "Cuotas", value: "Competitivas", color: "text-purple-400" },
        ].map((s, i) => (
          <div key={i} className="card-dark rounded-xl p-4 text-center">
            <s.icon size={20} className={`${s.color} mx-auto mb-1`} />
            <p className={`font-bold text-sm ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Responsible Gaming */}
      <div className="card-dark rounded-xl p-5 hidden sm:flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Shield size={32} className="text-[#b8860b] shrink-0" />
        <div>
          <h3 className="font-bold text-white text-sm">Juego Responsable</h3>
          <p className="text-gray-500 text-xs mt-1">
            Club del Coleo promueve el juego responsable. Apuesta solo lo que puedas permitirte perder.
            Debes ser mayor de 18 anos para usar esta plataforma. Si necesitas ayuda, contacta nuestro soporte.
          </p>
        </div>
      </div>
    </div>
  );
}

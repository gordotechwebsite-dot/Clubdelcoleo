import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getUser } from "../lib/api";
import { Calendar, MapPin, Clock, ChevronRight, Trophy, Users, Shield, Star } from "lucide-react";

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
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const formatTime12 = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
  };

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

      {/* Upcoming Events */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Proximos Eventos</h2>
          <Link to="/events" className="text-[#daa520] text-sm hover:text-[#ffd700] flex items-center gap-1">
            Ver todos <ChevronRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando eventos...</div>
        ) : events.length === 0 ? (
          <div className="card-dark rounded-xl p-8 text-center text-gray-500">
            No hay eventos proximos programados
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <Link key={event.id} to={`/events/${event.id}`}
                className="card-dark rounded-xl overflow-hidden hover:border-[#b8860b]/50 transition-all group">
                <div className="h-2 gold-gradient" />
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#b8860b]/20 text-[#ffd700]">{event.country === "venezuela" ? "VEN" : "COL"}</span>
                      <h3 className="font-bold text-white group-hover:text-[#ffd700] transition text-sm sm:text-base leading-tight">
                        {event.name}
                      </h3>
                    </div>
                    <span className="shrink-0 bg-green-500/20 text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">
                      ABIERTO
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs line-clamp-2">{event.description}</p>
                  <div className="space-y-1.5 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-[#b8860b]" />
                      <span className="capitalize">{formatDate(event.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-[#b8860b]" />
                      <span>{formatTime12(event.time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-[#b8860b]" />
                      <span>{event.location}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-800">
                    <span className="text-[#daa520] text-xs font-medium flex items-center gap-1">
                      Apostar ahora <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Responsible Gaming */}
      <div className="card-dark rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
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

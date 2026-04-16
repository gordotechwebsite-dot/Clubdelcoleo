import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Calendar, MapPin, Clock, ChevronRight, Search } from "lucide-react";

interface Event {
  id: number; name: string; description: string; location: string;
  country: string; date: string; time: string; status: string; stream_url: string | null;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [country, setCountry] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    const status = filter === "all" ? undefined : filter;
    const ctry = country === "all" ? undefined : country;
    api.getEvents(status, ctry).then(setEvents).catch(console.error).finally(() => setLoading(false));
  }, [filter, country]);

  const filtered = events.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.location.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d: string) => {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" });
  };

  const formatTime12 = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Eventos de Coleo</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text" placeholder="Buscar evento..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 bg-[#1a1a1a] border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-[#b8860b] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Country filters */}
      <div className="flex gap-2">
        {[
          { key: "all", label: "Todos los Paises", flag: "" },
          { key: "colombia", label: "Colombia", flag: "COL" },
          { key: "venezuela", label: "Venezuela", flag: "VEN" },
        ].map((c) => (
          <button key={c.key} onClick={() => setCountry(c.key)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              country === c.key
                ? "bg-[#b8860b]/20 text-[#ffd700] border border-[#b8860b]/50"
                : "bg-[#1a1a1a] text-gray-400 border border-gray-700 hover:border-[#b8860b]/30"
            }`}>
            {c.flag && <span className="text-base">{c.flag}</span>}
            {c.label}
          </button>
        ))}
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "Todos" },
          { key: "upcoming", label: "Proximos" },
          { key: "live", label: "En Vivo" },
          { key: "finished", label: "Finalizados" },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
              filter === f.key
                ? "gold-gradient text-black"
                : "bg-[#1a1a1a] text-gray-400 border border-gray-700 hover:border-[#b8860b]/50"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Cargando eventos...</div>
      ) : filtered.length === 0 ? (
        <div className="card-dark rounded-xl p-12 text-center text-gray-500">
          No se encontraron eventos
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((event) => (
            <Link key={event.id} to={`/events/${event.id}`}
              className="card-dark rounded-xl overflow-hidden hover:border-[#b8860b]/50 transition-all group">
              <div className={`h-1.5 ${event.status === "upcoming" ? "gold-gradient" : event.status === "live" ? "bg-green-500" : "bg-gray-600"}`} />
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#b8860b]/20 text-[#ffd700]">{event.country === "venezuela" ? "VEN" : "COL"}</span>
                    <h3 className="font-bold text-white group-hover:text-[#ffd700] transition text-sm leading-tight">{event.name}</h3>
                  </div>
                  <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                    event.status === "upcoming" ? "bg-green-500/20 text-green-400" :
                    event.status === "live" ? "bg-red-500/20 text-red-400 animate-pulse" :
                    "bg-gray-500/20 text-gray-400"
                  }`}>
                    {event.status === "upcoming" ? "ABIERTO" : event.status === "live" ? "EN VIVO" : "FINALIZADO"}
                  </span>
                </div>
                <p className="text-gray-500 text-xs line-clamp-2">{event.description}</p>
                <div className="space-y-1 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar size={13} className="text-[#b8860b]" />
                    <span className="capitalize">{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-[#b8860b]" />
                    <span>{formatTime12(event.time)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-[#b8860b]" />
                    <span>{event.location}</span>
                  </div>
                </div>
                {event.status === "upcoming" && (
                  <div className="pt-2 border-t border-gray-800">
                    <span className="text-[#daa520] text-xs font-medium flex items-center gap-1">
                      Apostar ahora <ChevronRight size={14} />
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

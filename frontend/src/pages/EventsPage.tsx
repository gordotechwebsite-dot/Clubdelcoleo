import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { ChevronRight, Search } from "lucide-react";

interface Event {
  id: number; name: string; description: string; location: string;
  country: string; date: string; time: string; status: string; stream_url: string | null;
  image_url: string | null;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    const status = filter === "all" ? undefined : filter;
    api.getEvents(status).then(setEvents).catch(console.error).finally(() => setLoading(false));
  }, [filter]);

  const filtered = events.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.location.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d: string) => {
    const date = new Date(d + "T00:00:00-05:00");
    return date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" });
  };

  const imageSrc = (url: string) =>
    url.startsWith("http") ? url : `${import.meta.env.VITE_API_URL || ""}${url}`;

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card-dark rounded-2xl overflow-hidden">
              <div className="aspect-[16/9] skeleton" />
              <div className="px-4 py-3">
                <div className="skeleton h-3.5 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-dark rounded-xl p-12 text-center text-gray-500">
          No se encontraron eventos
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((event) => (
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
                <span className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm ${
                  event.status === "upcoming" ? "bg-green-500/25 text-green-300 border border-green-500/40" :
                  event.status === "live" ? "bg-red-500/25 text-red-300 border border-red-500/40 animate-pulse" :
                  "bg-gray-700/50 text-gray-300 border border-gray-600"
                }`}>
                  {event.status === "upcoming" ? "ABIERTO" : event.status === "live" ? "EN VIVO" : "FINALIZADO"}
                </span>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-black text-white group-hover:text-[#ffd700] transition text-lg leading-tight uppercase drop-shadow">{event.name}</h3>
                  <p className="text-[#daa520] text-xs font-semibold mt-1 uppercase tracking-wide">{event.location}</p>
                </div>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-2 border-t border-gray-800">
                <p className="text-xs text-gray-400 capitalize">{formatDate(event.date)}</p>
                {event.status !== "finished" && (
                  <span className="text-[#daa520] text-xs font-semibold flex items-center gap-0.5 shrink-0">
                    Apostar <ChevronRight size={14} />
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

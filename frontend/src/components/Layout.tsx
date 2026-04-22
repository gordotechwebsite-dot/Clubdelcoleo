import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getUser, clearToken, api, setUser } from "../lib/api";
import {
  Home, Calendar, Wallet, Trophy, Shield, Menu, X, LogOut, User, Bell,
  CheckCircle, XCircle, DollarSign, Megaphone, AlertTriangle,
} from "lucide-react";

interface Notification {
  id: number; title: string; message: string; type: string; is_read: number; created_at: string;
}

interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: "success" | "error" | "info" | "win" | "promo";
  timestamp: number;
}

type SoundType = "success" | "win" | "error" | "info" | "promo";

function playNotificationSound(type: SoundType) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.15;
    if (type === "win") {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
      osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.45);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.7);
    } else if (type === "success") {
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === "promo") {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // Audio not available
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const sseRef = useRef<EventSource | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();

  const addToast = useCallback((title: string, message: string, type: ToastNotification["type"]) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, title, message, type, timestamp: Date.now() }]);
    playNotificationSound(type);
    setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, 6000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const refreshNotifs = useCallback(() => {
    api.getNotifications().then((d) => {
      setNotifications(d.notifications || []);
      setUnreadCount(d.unread_count || 0);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    refreshNotifs();
    const interval = setInterval(refreshNotifs, 30000);
    return () => clearInterval(interval);
  }, [refreshNotifs]);

  // SSE connection for real-time notifications
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    const connectSSE = () => {
      const url = api.getSSEUrl();
      const es = new EventSource(url);
      sseRef.current = es;
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const et = data.type;
          if (et === "connected") return;
          if (et === "deposit_approved") {
            addToast(data.title, data.message, "success");
            if (data.new_balance !== undefined) {
              const u = getUser(); if (u) { u.balance = data.new_balance; setUser(u); }
            }
            refreshNotifs();
          } else if (et === "deposit_rejected") {
            addToast(data.title, data.message, "error"); refreshNotifs();
          } else if (et === "bet_won") {
            addToast(data.title, data.message, "win");
            api.getMe().then((me) => { const u = getUser(); if (u) { u.balance = me.balance; setUser(u); } }).catch(() => {});
            refreshNotifs();
          } else if (et === "bet_lost") {
            addToast(data.title, data.message, "error"); refreshNotifs();
          } else if (et === "withdrawal_approved") {
            addToast(data.title, data.message, "success");
            api.getMe().then((me) => { const u = getUser(); if (u) { u.balance = me.balance; setUser(u); } }).catch(() => {});
            refreshNotifs();
          } else if (et === "withdrawal_rejected") {
            addToast(data.title, data.message, "error"); refreshNotifs();
          } else if (et === "promotion") {
            addToast(data.title, data.message, "promo"); refreshNotifs();
          } else if (et === "new_bet" || et === "new_deposit") {
            addToast(data.title, data.message, "info"); refreshNotifs();
          }
        } catch { /* ignore */ }
      };
      es.onerror = () => { es.close(); sseRef.current = null; reconnectTimeout = setTimeout(connectSSE, 5000); };
    };
    connectSSE();
    return () => { clearTimeout(reconnectTimeout); if (sseRef.current) { sseRef.current.close(); sseRef.current = null; } };
  }, [addToast, refreshNotifs]);

  const handleMarkRead = async () => {
    await api.markNotificationsRead().catch(() => {});
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
  };

  const handleLogout = () => {
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    clearToken();
    navigate("/login");
  };

  const navItems = [
    { path: "/home", label: "Inicio", icon: Home },
    { path: "/events", label: "Eventos", icon: Calendar },
    { path: "/my-bets", label: "Mis Apuestas", icon: Trophy },
    { path: "/wallet", label: "Billetera", icon: Wallet },
  ];

  if (user?.is_admin) {
    navItems.push({ path: "/admin", label: "Admin", icon: Shield });
  }

  const isActive = (path: string) => location.pathname === path;

  const formatNotifDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Bogota" }); }
    catch { return d; }
  };

  const getToastIcon = (type: ToastNotification["type"]) => {
    switch (type) {
      case "success": return <CheckCircle size={20} className="text-green-400 flex-shrink-0" />;
      case "win": return <DollarSign size={20} className="text-[#ffd700] flex-shrink-0" />;
      case "error": return <XCircle size={20} className="text-red-400 flex-shrink-0" />;
      case "promo": return <Megaphone size={20} className="text-[#ffd700] flex-shrink-0" />;
      case "info": return <AlertTriangle size={20} className="text-blue-400 flex-shrink-0" />;
    }
  };
  const getToastBorder = (type: ToastNotification["type"]) => {
    const map = { success: "border-green-500/50", win: "border-[#ffd700]/50", error: "border-red-500/50", promo: "border-[#ffd700]/50", info: "border-blue-500/50" };
    return map[type];
  };
  const getToastGlow = (type: ToastNotification["type"]) => {
    const map = { success: "shadow-green-500/20", win: "shadow-[#ffd700]/30", error: "shadow-red-500/20", promo: "shadow-[#ffd700]/20", info: "shadow-blue-500/20" };
    return map[type];
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Toast Notifications */}
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-3 pointer-events-none" style={{ maxWidth: "380px" }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-[#1a1a1a] border ${getToastBorder(toast.type)} rounded-xl p-4 shadow-xl ${getToastGlow(toast.type)} animate-slide-in-right flex items-start gap-3 cursor-pointer`}
            onClick={() => removeToast(toast.id)}
          >
            {getToastIcon(toast.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{toast.title}</p>
              <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button className="text-gray-500 hover:text-white flex-shrink-0" onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0d0d0d] border-b border-[#b8860b]/30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/home" className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Club del Coleo" className="h-10 w-10 rounded-full object-cover" />
            <span className="text-lg font-bold gold-text hidden sm:block">Club del Coleo</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(item.path)
                    ? "bg-[#b8860b]/20 text-[#ffd700]"
                    : "text-gray-400 hover:text-[#daa520] hover:bg-white/5"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <div className="bg-[#b8860b]/20 rounded-full px-3 py-1 flex items-center gap-2">
                  <Wallet size={14} className="text-[#ffd700]" />
                  <span className="text-[#ffd700] font-semibold">
                    ${user.balance?.toLocaleString("es-CO")} COP
                  </span>
                </div>
                <Link to="/profile" className="flex items-center gap-1 text-gray-400 hover:text-[#ffd700] transition">
                  <User size={14} />
                  <span>{user.full_name || user.username}</span>
                </Link>
              </div>
            )}
            {/* Notification Bell */}
            <div className="relative">
              <button onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs && unreadCount > 0) handleMarkRead(); }}
                className="relative text-gray-400 hover:text-[#ffd700] transition p-1">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-[#111] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-gray-800 flex items-center justify-between">
                    <span className="text-sm font-bold text-white">Notificaciones</span>
                    <button onClick={() => setShowNotifs(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center text-gray-500 text-xs py-6">Sin notificaciones</p>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div key={n.id} className={`p-3 border-b border-gray-800/50 ${n.is_read ? "" : "bg-[#b8860b]/5"}`}>
                          <p className="text-sm text-white font-medium">{n.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-gray-600 mt-1">{formatNotifDate(n.created_at)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors text-sm"
            >
              <LogOut size={16} />
            </button>
            <button
              className="md:hidden text-gray-400"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-[#111] border-t border-[#b8860b]/20 px-4 py-3 space-y-1">
            {user && (
              <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-[#b8860b]/10 rounded-lg">
                <Wallet size={16} className="text-[#ffd700]" />
                <span className="text-[#ffd700] font-semibold text-sm">
                  ${user.balance?.toLocaleString("es-CO")} COP
                </span>
                <span className="text-gray-500 text-xs ml-auto">{user.username}</span>
              </div>
            )}
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${
                  isActive(item.path)
                    ? "bg-[#b8860b]/20 text-[#ffd700]"
                    : "text-gray-400 hover:text-[#daa520]"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-red-400 w-full"
            >
              <LogOut size={18} />
              Cerrar Sesion
            </button>
          </div>
        )}
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>

      {/* Footer */}
      <footer className="border-t border-[#b8860b]/20 bg-[#0d0d0d] mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="Club del Coleo" className="h-8 w-8 rounded-full" />
              <span className="text-sm gold-text font-bold">Club del Coleo</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Shield size={12} className="text-[#b8860b]" />
                Plataforma Certificada
              </span>
              <span>|</span>
              <span>Juego Responsable</span>
              <span>|</span>
              <span>Datos Protegidos con SSL</span>
              <span>|</span>
              <span>+18 Solo Mayores de Edad</span>
            </div>
          </div>
          <p className="text-center text-xs text-gray-600 mt-4">
            &copy; 2026 Club del Coleo. Todos los derechos reservados. Apuesta con responsabilidad.
          </p>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0d0d0d] border-t border-[#b8860b]/30 z-50">
        <div className="flex justify-around py-2">
          {navItems.slice(0, 4).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-1 text-xs ${
                isActive(item.path) ? "text-[#ffd700]" : "text-gray-500"
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

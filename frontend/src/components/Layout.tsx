import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getUser, clearToken } from "../lib/api";
import {
  Home, Calendar, Wallet, Trophy, Shield, Menu, X, LogOut, User,
} from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
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

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
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
                <div className="flex items-center gap-1 text-gray-400">
                  <User size={14} />
                  <span>{user.full_name || user.username}</span>
                </div>
              </div>
            )}
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

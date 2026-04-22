import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, setToken, setUser } from "../lib/api";
import { Eye, EyeOff, Shield } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login({ username, password });
      setToken(res.access_token);
      const me = await api.getMe();
      setUser(me);
      navigate("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo-gold.png" alt="Club del Coleo" className="h-24 mx-auto mb-4" />
          <p className="text-gray-500 text-sm mt-1">Plataforma de Apuestas de Coleo</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="card-dark rounded-2xl p-6 space-y-5"
        >
          <h2 className="text-xl font-bold text-center text-white">Iniciar Sesion</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-[#b8860b] focus:outline-none focus:ring-1 focus:ring-[#b8860b]/50 transition"
              placeholder="Tu nombre de usuario"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Contrasena</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-[#b8860b] focus:outline-none focus:ring-1 focus:ring-[#b8860b]/50 transition pr-12"
                placeholder="Tu contrasena"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full gold-gradient text-black font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          <p className="text-center text-sm text-gray-500">
            No tienes cuenta?{" "}
            <Link to="/register" className="text-[#daa520] hover:text-[#ffd700] font-medium">
              Registrate con invitacion
            </Link>
          </p>

          <p className="text-center text-sm text-gray-500">
            <Link to="/forgot-password" className="text-gray-400 hover:text-[#daa520] transition">
              Olvidaste tu contrasena?
            </Link>
          </p>
        </form>

        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <Shield size={12} className="text-[#b8860b]" />
            Plataforma Certificada
          </span>
          <span>|</span>
          <span>SSL Seguro</span>
          <span>|</span>
          <span>+18</span>
        </div>
      </div>
    </div>
  );
}

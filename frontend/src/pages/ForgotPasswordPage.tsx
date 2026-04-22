import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Shield } from "lucide-react";

export default function ForgotPasswordPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.requestPasswordReset(input);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo-gold.png" alt="Club del Coleo" className="h-24 mx-auto mb-4" />
          <p className="text-gray-500 text-sm mt-1">Recuperacion de Contrasena</p>
        </div>

        {sent ? (
          <div className="card-dark rounded-2xl p-6 space-y-5">
            <h2 className="text-xl font-bold text-center text-white">Solicitud Enviada</h2>
            <p className="text-gray-400 text-sm text-center">
              Si tu cuenta existe, el administrador recibira tu solicitud y te contactara para restablecer tu contrasena.
            </p>
            <Link
              to="/login"
              className="block w-full gold-gradient text-black font-bold py-3 rounded-lg hover:opacity-90 transition text-center"
            >
              Volver al Inicio de Sesion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card-dark rounded-2xl p-6 space-y-5">
            <h2 className="text-xl font-bold text-center text-white">Recuperar Contrasena</h2>
            <p className="text-gray-400 text-sm text-center">
              Ingresa tu nombre de usuario o correo electronico y el administrador recibira tu solicitud.
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-1">Usuario o correo electronico</label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-[#b8860b] focus:outline-none focus:ring-1 focus:ring-[#b8860b]/50 transition"
                placeholder="Tu usuario o email"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full gold-gradient text-black font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Solicitar Recuperacion"}
            </button>

            <p className="text-center text-sm text-gray-500">
              <Link to="/login" className="text-[#daa520] hover:text-[#ffd700] font-medium">
                Volver al inicio de sesion
              </Link>
            </p>
          </form>
        )}

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

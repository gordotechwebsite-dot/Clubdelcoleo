import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, setToken, setUser } from "../lib/api";
import { Eye, EyeOff, Shield, Ticket, ArrowRight, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const [step, setStep] = useState<"invite" | "register">("invite");
  const [inviteCode, setInviteCode] = useState("");
  const [form, setForm] = useState({
    username: "", email: "", password: "", full_name: "", phone: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleValidateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) { setError("Ingresa un codigo de invitacion"); return; }
    setError("");
    setLoading(true);
    try {
      await api.validateInvite(inviteCode.trim().toUpperCase());
      setStep("register");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Codigo invalido");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.register({ ...form, invite_code: inviteCode.trim().toUpperCase() });
      setToken(res.access_token);
      const me = await api.getMe();
      setUser(me);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src="/logo-gold.png" alt="Club del Coleo" className="h-20 mx-auto mb-3" />
          <p className="text-gray-500 text-xs mt-1">Acceso Solo por Invitacion</p>
        </div>

        {/* Step 1: Validate Invite Code */}
        {step === "invite" && (
          <form onSubmit={handleValidateInvite} className="card-dark rounded-2xl p-6 space-y-5">
            <h2 className="text-xl font-bold text-center text-white">Codigo de Invitacion</h2>
            <p className="text-center text-sm text-gray-400">
              Para registrarte necesitas un codigo de invitacion valido
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 text-center">
                {error}
              </div>
            )}

            <div className="bg-[#b8860b]/10 border border-[#b8860b]/30 rounded-xl p-5 text-center">
              <Ticket size={32} className="text-[#ffd700] mx-auto mb-3" />
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full bg-[#0a0a0a] border border-[#b8860b]/50 rounded-lg px-4 py-3 text-white text-center text-lg font-mono tracking-widest focus:outline-none focus:border-[#ffd700] uppercase"
                placeholder="CDC-XXXXXX"
                maxLength={20}
              />
            </div>

            <button type="submit" disabled={loading}
              className="w-full gold-gradient text-black font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? "Validando..." : <><span>Validar Codigo</span> <ArrowRight size={18} /></>}
            </button>

            <p className="text-center text-sm text-gray-500">
              Ya tienes cuenta?{" "}
              <Link to="/login" className="text-[#daa520] hover:text-[#ffd700] font-medium">Inicia Sesion</Link>
            </p>
          </form>
        )}

        {/* Step 2: Registration Form */}
        {step === "register" && (
          <form onSubmit={handleRegister} className="card-dark rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle2 size={18} className="text-green-400" />
              <span className="text-green-400 text-sm font-medium">Codigo validado: {inviteCode}</span>
            </div>

            <h2 className="text-xl font-bold text-center text-white">Crear tu Cuenta</h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1">Nombre Completo</label>
              <input type="text" name="full_name" value={form.full_name} onChange={handleChange}
                className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#b8860b] focus:outline-none transition" required />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Correo Electronico</label>
              <input type="email" name="email" value={form.email} onChange={handleChange}
                className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#b8860b] focus:outline-none transition" required />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Numero de Telefono</label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange}
                className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#b8860b] focus:outline-none transition" placeholder="+57 300 000 0000" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Nombre de Usuario</label>
              <input type="text" name="username" value={form.username} onChange={handleChange}
                className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#b8860b] focus:outline-none transition" required />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Contrasena</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} name="password" value={form.password} onChange={handleChange}
                  className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#b8860b] focus:outline-none transition pr-10" required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full gold-gradient text-black font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50">
              {loading ? "Registrando..." : "Crear Cuenta"}
            </button>

            <button type="button" onClick={() => { setStep("invite"); setError(""); }}
              className="w-full text-gray-500 text-sm hover:text-gray-300 transition">
              Usar otro codigo
            </button>
          </form>
        )}

        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-600">
          <Shield size={12} className="text-[#b8860b]" />
          <span>Plataforma Segura y Certificada</span>
        </div>
      </div>
    </div>
  );
}

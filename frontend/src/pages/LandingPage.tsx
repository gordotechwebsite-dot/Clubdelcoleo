import { Link } from "react-router-dom";
import { Shield, Trophy, Smartphone, Users, Zap, Lock, Star, ChevronRight } from "lucide-react";
import { useEffect, useRef } from "react";

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("scroll-visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function RevealSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`scroll-hidden ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[#b8860b]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Club del Coleo" className="h-10 w-10 rounded-full object-cover" />
            <span className="text-lg font-bold gold-text hidden sm:block">Club del Coleo</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-gray-400 hover:text-white text-sm font-medium px-4 py-2 transition">
              Iniciar Sesion
            </Link>
            <Link to="/register" className="gold-gradient text-black text-sm font-bold px-5 py-2 rounded-lg hover:opacity-90 transition">
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#b8860b]/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-80 h-80 bg-[#daa520]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-32 text-center">
          <RevealSection>
            <img src="/logo-gold.png" alt="Club del Coleo" className="h-64 sm:h-96 mx-auto mb-8 drop-shadow-2xl" />
          </RevealSection>

          <RevealSection delay={150}>
            <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black mb-4 leading-tight">
              <span className="gold-text">La Casa de Apuestas</span>
              <br />
              <span className="text-white">del Coleo Colombiano</span>
            </h1>
          </RevealSection>

          <RevealSection delay={300}>
            <p className="text-gray-400 text-base sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
              La primera y unica plataforma digital de apuestas dedicada exclusivamente al deporte del coleo.
              Campeonatos en <span className="text-white font-semibold">Colombia</span> y <span className="text-white font-semibold">Venezuela</span>.
            </p>
          </RevealSection>

          <RevealSection delay={450}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link to="/register"
                className="gold-gradient text-black font-black px-8 py-4 rounded-xl text-lg hover:opacity-90 transition shadow-lg shadow-[#b8860b]/20 flex items-center gap-2 w-full sm:w-auto justify-center">
                <Zap size={20} /> Unirse al Club
              </Link>
              <Link to="/login"
                className="border-2 border-[#b8860b]/50 text-[#ffd700] font-bold px-8 py-4 rounded-xl text-lg hover:bg-[#b8860b]/10 transition flex items-center gap-2 w-full sm:w-auto justify-center">
                Ya tengo cuenta <ChevronRight size={18} />
              </Link>
            </div>
          </RevealSection>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { value: "100%", label: "Segura", icon: Shield, color: "text-green-400" },
              { value: "VIP", label: "Solo Invitados", icon: Lock, color: "text-purple-400" },
              { value: "24/7", label: "Disponible", icon: Zap, color: "text-[#ffd700]" },
            ].map((stat, i) => (
              <RevealSection key={i} delay={500 + i * 100}>
                <div className="card-dark rounded-xl p-4 text-center hover:border-[#b8860b]/50 transition">
                  <stat.icon size={22} className={`${stat.color} mx-auto mb-2`} />
                  <p className={`font-black text-xl ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* What is Coleo section */}
      <section className="relative py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <RevealSection>
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-4xl font-black text-white mb-3">
                El Deporte del <span className="gold-text">Coleo</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                El coleo es un deporte ecuestre tradicional de los llanos colombo-venezolanos donde el jinete debe derribar al toro
                tomandolo por la cola. Una tradicion centenaria convertida en espectaculo deportivo.
              </p>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Trophy,
                title: "Campeonatos Oficiales",
                desc: "Cubrimos los mejores campeonatos de coleo en Colombia y Venezuela con los coleadores mas destacados del llano.",
                color: "from-[#b8860b]/20 to-transparent",
              },
              {
                icon: Star,
                title: "Cuotas Competitivas",
                desc: "Las mejores cuotas del mercado calculadas por expertos. Edicion en tiempo real para ofrecerte las mejores oportunidades.",
                color: "from-blue-500/10 to-transparent",
              },
              {
                icon: Smartphone,
                title: "Desde tu Celular",
                desc: "Apuesta desde cualquier lugar. Plataforma optimizada para movil y computadora con transmision en vivo.",
                color: "from-purple-500/10 to-transparent",
              },
            ].map((item, i) => (
              <RevealSection key={i} delay={i * 150}>
                <div className="relative group h-full">
                  <div className={`absolute inset-0 bg-gradient-to-b ${item.color} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="relative card-dark rounded-2xl p-6 sm:p-8 hover:border-[#b8860b]/50 transition-all duration-300 h-full">
                    <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center mb-5">
                      <item.icon size={24} className="text-black" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative py-16 sm:py-24 bg-gradient-to-b from-[#0d0d0d] to-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <RevealSection>
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-4xl font-black text-white mb-3">
                Como <span className="gold-text">Funciona</span>
              </h2>
              <p className="text-gray-400">En solo 4 pasos empieza a apostar</p>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Recibe tu Invitacion", desc: "Obtiene un codigo de invitacion exclusivo de un miembro del club.", icon: Lock },
              { step: "02", title: "Crea tu Cuenta", desc: "Registrate con tu codigo, email, telefono y elige tu usuario.", icon: Users },
              { step: "03", title: "Carga tu Saldo", desc: "Deposita con Nequi, Daviplata o Bancolombia de forma segura.", icon: Smartphone },
              { step: "04", title: "Apuesta y Gana", desc: "Elige tu coleador favorito, coloca tu apuesta y disfruta del evento.", icon: Trophy },
            ].map((item, i) => (
              <RevealSection key={i} delay={i * 120}>
                <div className="relative h-full">
                  <div className="card-dark rounded-2xl p-6 text-center hover:border-[#b8860b]/50 transition-all h-full">
                    <div className="text-4xl font-black gold-text opacity-30 mb-3">{item.step}</div>
                    <div className="w-14 h-14 rounded-full bg-[#b8860b]/10 border border-[#b8860b]/30 flex items-center justify-center mx-auto mb-4">
                      <item.icon size={24} className="text-[#ffd700]" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-gray-400 text-sm">{item.desc}</p>
                  </div>
                  {i < 3 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                      <ChevronRight size={20} className="text-[#b8860b]/40" />
                    </div>
                  )}
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Methods */}
      <section className="relative py-16 sm:py-24 bg-gradient-to-b from-[#0d0d0d] to-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <RevealSection>
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-4xl font-black text-white mb-3">
                Metodos de <span className="gold-text">Pago</span>
              </h2>
              <p className="text-gray-400">Recarga tu saldo de forma rapida y segura</p>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { name: "Nequi", logo: "/nequi-logo.png", color: "from-purple-600/20 to-purple-900/10", border: "border-purple-500/30", text: "text-purple-400" },
              { name: "Daviplata", logo: "/daviplata-logo.png", color: "from-red-600/20 to-red-900/10", border: "border-red-500/30", text: "text-red-400" },
              { name: "Bancolombia", logo: "/bancolombia-logo.png", color: "from-yellow-600/20 to-yellow-900/10", border: "border-yellow-500/30", text: "text-yellow-400" },
            ].map((m, i) => (
              <RevealSection key={i} delay={i * 150}>
                <div className={`bg-gradient-to-b ${m.color} border ${m.border} rounded-2xl p-6 text-center hover:scale-105 transition-transform`}>
                  <img src={m.logo} alt={m.name} className="h-16 mx-auto mb-3 object-contain" />
                  <h3 className={`text-lg font-bold ${m.text}`}>{m.name}</h3>
                  <p className="text-gray-500 text-xs mt-1">Deposito instantaneo</p>
                </div>
              </RevealSection>
            ))}
          </div>

          <RevealSection delay={400}>
            <p className="text-center text-gray-400 mt-8 max-w-xl mx-auto text-sm leading-relaxed">
              Retira tus ganancias instantaneamente en mas de <span className="text-white font-semibold">500 puntos autorizados</span> por todo el pais
            </p>
          </RevealSection>
        </div>
      </section>

      {/* Trust & Security */}
      <section className="relative py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <RevealSection>
            <div className="card-dark rounded-2xl p-8 sm:p-12">
              <div className="text-center mb-10">
                <Shield size={40} className="text-[#ffd700] mx-auto mb-4" />
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
                  Seguridad y <span className="gold-text">Confianza</span>
                </h2>
                <p className="text-gray-400 max-w-xl mx-auto text-sm">
                  Tu seguridad es nuestra prioridad. Operamos con los mas altos estandares de la industria.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: Lock, title: "Acceso Privado", desc: "Solo por invitacion, comunidad exclusiva y verificada" },
                  { icon: Shield, title: "Datos Protegidos", desc: "Encriptacion SSL y proteccion de datos personales" },
                  { icon: Trophy, title: "Pagos Garantizados", desc: "Tus ganancias se acreditan automaticamente" },
                  { icon: Users, title: "Juego Responsable", desc: "Limites de apuesta y herramientas de control" },
                ].map((item, i) => (
                  <div key={i} className="bg-[#0a0a0a] rounded-xl p-5 text-center">
                    <item.icon size={24} className="text-[#b8860b] mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-16 sm:py-24">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-[#b8860b]/10 rounded-full blur-3xl" />
        </div>
        <RevealSection className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <img src="/logo-gold.png" alt="Club del Coleo" className="h-20 mx-auto mb-6 opacity-80" />
          <h2 className="text-2xl sm:text-4xl font-black text-white mb-4">
            Entra al <span className="gold-text">Club</span>
          </h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Unete a la comunidad exclusiva de apostadores de coleo mas grande de Colombia.
            Solicita tu codigo de invitacion y empieza a vivir la emocion del llano.
          </p>
          <Link to="/register"
            className="inline-flex items-center gap-2 gold-gradient text-black font-black px-10 py-4 rounded-xl text-lg hover:opacity-90 transition shadow-lg shadow-[#b8860b]/20">
            <Zap size={20} /> Registrarse Ahora
          </Link>
        </RevealSection>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#b8860b]/20 bg-[#0d0d0d] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
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
              <span>+18 Solo Mayores de Edad</span>
            </div>
          </div>
          <p className="text-center text-xs text-gray-600 mt-4">
            &copy; 2026 Club del Coleo. Todos los derechos reservados. Apuesta con responsabilidad.
          </p>
        </div>
      </footer>
    </div>
  );
}

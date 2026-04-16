import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "14809958464";
const WHATSAPP_MESSAGE = "Hola, me interesa Club del Coleo";

export default function WhatsAppBubble() {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-20 right-5 z-40 md:bottom-8 md:right-8 group"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20" />
        <div className="relative w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg shadow-green-900/30 hover:scale-110 transition-transform duration-200">
          <MessageCircle size={28} className="text-white" fill="white" />
        </div>
      </div>
    </a>
  );
}

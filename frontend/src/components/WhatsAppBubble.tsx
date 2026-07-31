const WHATSAPP_NUMBER = "16693779494";
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
          <svg viewBox="0 0 32 32" width="30" height="30" fill="white">
            <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.128 6.744 3.046 9.378L1.054 31.29l6.118-1.958A15.9 15.9 0 0 0 16.004 32C24.826 32 32 24.822 32 16S24.826 0 16.004 0zm9.312 22.594c-.39 1.1-1.932 2.014-3.178 2.28-.854.182-1.97.326-5.726-1.23-4.806-1.99-7.9-6.87-8.14-7.19-.228-.32-1.924-2.562-1.924-4.888 0-2.326 1.218-3.468 1.65-3.942.39-.428 1.026-.642 1.636-.642.198 0 .376.01.536.018.432.018.648.042.934.72.356.852 1.222 2.978 1.33 3.196.11.218.218.508.068.808-.138.308-.258.498-.478.766-.218.268-.448.476-.668.768-.198.258-.42.534-.178.966.242.432 1.076 1.776 2.312 2.878 1.59 1.416 2.93 1.854 3.342 2.06.41.206.648.172.888-.104.25-.286 1.058-1.232 1.34-1.656.276-.424.558-.35.938-.21.386.138 2.446 1.154 2.864 1.364.418.21.696.31.798.486.1.174.1 1.012-.29 2.112z"/>
          </svg>
        </div>
      </div>
    </a>
  );
}

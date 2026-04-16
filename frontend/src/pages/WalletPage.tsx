import { useEffect, useState } from "react";
import { api, setUser } from "../lib/api";
import { Wallet, ArrowUpCircle, ArrowDownCircle, Clock, CreditCard, Smartphone, Building2 } from "lucide-react";

interface Transaction {
  id: number; type: string; amount: number; method: string; reference: string;
  description: string; status: string; created_at: string;
}

const METHODS = [
  { key: "nequi", label: "Nequi", icon: Smartphone, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", number: "Nequi: 300-000-0000" },
  { key: "daviplata", label: "Daviplata", icon: CreditCard, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", number: "Daviplata: 311-000-0000" },
  { key: "bancolombia", label: "Bancolombia", icon: Building2, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", number: "Cuenta: 000-000000-00" },
];

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [method, setMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadWallet = () => {
    api.getWallet().then((data) => {
      setBalance(data.balance);
      setTransactions(data.transactions);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadWallet(); }, []);

  const handleDeposit = async () => {
    const amt = parseFloat(amount);
    if (!method) { setError("Selecciona un metodo de pago"); return; }
    if (isNaN(amt) || amt < 5000) { setError("Deposito minimo: $5,000 COP"); return; }
    if (!reference.trim()) { setError("Ingresa el numero de referencia"); return; }
    setError("");
    setDepositing(true);
    try {
      const res = await api.deposit({ amount: amt, method, reference: reference.trim() });
      setBalance(res.new_balance);
      setSuccess(`Recarga de $${amt.toLocaleString("es-CO")} COP exitosa!`);
      setAmount("");
      setReference("");
      setMethod("");
      setShowDeposit(false);
      const me = await api.getMe();
      setUser(me);
      loadWallet();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error en la recarga");
    } finally {
      setDepositing(false);
    }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }); }
    catch { return d; }
  };

  if (loading) return <div className="text-center py-16 text-gray-500">Cargando billetera...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
      <h1 className="text-2xl font-bold text-white">Mi Billetera</h1>

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg p-3 text-center">{success}</div>
      )}

      {/* Balance Card */}
      <div className="card-dark rounded-2xl overflow-hidden">
        <div className="h-1.5 gold-gradient" />
        <div className="p-6 text-center">
          <Wallet size={32} className="text-[#b8860b] mx-auto mb-2" />
          <p className="text-sm text-gray-400">Saldo Disponible</p>
          <p className="text-3xl sm:text-4xl font-black gold-text mt-1">
            ${balance.toLocaleString("es-CO")} <span className="text-lg">COP</span>
          </p>
          <button onClick={() => setShowDeposit(!showDeposit)}
            className="mt-4 gold-gradient text-black font-bold px-8 py-3 rounded-lg hover:opacity-90 transition inline-flex items-center gap-2 text-sm">
            <ArrowUpCircle size={18} /> Cargar Saldo
          </button>
        </div>
      </div>

      {/* Deposit Form */}
      {showDeposit && (
        <div className="card-dark rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-white">Cargar Saldo</h3>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Metodo de Pago</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {METHODS.map((m) => (
                <button key={m.key} onClick={() => setMethod(m.key)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition ${
                    method === m.key ? `${m.bg} ${m.border} ${m.color}` : "bg-[#0a0a0a] border-gray-700 text-gray-400 hover:border-gray-600"
                  }`}>
                  <m.icon size={18} />
                  <div className="text-left">
                    <p className="font-medium">{m.label}</p>
                    <p className="text-xs opacity-60">{m.number}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Monto (COP)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-[#b8860b] focus:outline-none text-lg font-bold"
              placeholder="50,000" min="5000" step="5000" />
            <div className="flex gap-2 mt-2">
              {[10000, 20000, 50000, 100000].map((amt) => (
                <button key={amt} onClick={() => setAmount(String(amt))}
                  className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-md py-1.5 text-xs text-gray-400 hover:border-[#b8860b] hover:text-[#ffd700] transition">
                  ${(amt / 1000)}K
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Numero de Referencia / Comprobante</label>
            <input type="text" value={reference} onChange={(e) => setReference(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:border-[#b8860b] focus:outline-none"
              placeholder="Ej: 123456789" />
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg p-2 text-center">{error}</div>}

          <div className="flex gap-3">
            <button onClick={() => setShowDeposit(false)}
              className="flex-1 border border-gray-700 text-gray-400 py-2.5 rounded-lg hover:bg-white/5 transition text-sm">
              Cancelar
            </button>
            <button onClick={handleDeposit} disabled={depositing}
              className="flex-1 gold-gradient text-black font-bold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50 text-sm">
              {depositing ? "Procesando..." : "Confirmar Recarga"}
            </button>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div>
        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
          <Clock size={16} className="text-[#b8860b]" /> Historial de Transacciones
        </h3>
        {transactions.length === 0 ? (
          <div className="card-dark rounded-xl p-8 text-center text-gray-500 text-sm">
            No hay transacciones aun
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="card-dark rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {tx.type === "deposit" ? (
                    <ArrowUpCircle size={20} className="text-green-400" />
                  ) : (
                    <ArrowDownCircle size={20} className="text-red-400" />
                  )}
                  <div>
                    <p className="text-sm text-white">{tx.description}</p>
                    <p className="text-xs text-gray-500">{formatDate(tx.created_at)}{tx.method ? ` - ${tx.method}` : ""}</p>
                  </div>
                </div>
                <span className={`font-bold text-sm ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                  {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toLocaleString("es-CO")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatMoneyInput, parseMoneyInput } from "../lib/utils";
import { Wallet, ArrowUpCircle, ArrowDownCircle, Clock, CreditCard, Smartphone, Building2, CheckCircle2, XCircle, AlertCircle, Upload, ImageIcon } from "lucide-react";

interface Transaction {
  id: number; type: string; amount: number; method: string; reference: string;
  description: string; status: string; created_at: string;
}
interface DepositRequest {
  id: number; amount: number; method: string; reference: string; status: string; created_at: string;
}
interface WithdrawalRequest {
  id: number; amount: number; method: string; account_number: string; status: string; created_at: string;
}

const METHODS = [
  {
    key: "nequi", label: "Nequi", icon: Smartphone, color: "text-purple-400",
    bg: "bg-purple-500/10", border: "border-purple-500/30", number: "Nequi: 324 625 0383",
    details: [
      { label: "Numero Nequi", value: "3246250383" },
    ],
  },
  {
    key: "breb", label: "Bre-B", icon: CreditCard, color: "text-emerald-400",
    bg: "bg-emerald-500/10", border: "border-emerald-500/30", number: "Llave: 324 625 0383",
    details: [
      { label: "Llave Bre-B", value: "3246250383" },
    ],
  },
  {
    key: "bancolombia", label: "Bancolombia", icon: Building2, color: "text-yellow-400",
    bg: "bg-yellow-500/10", border: "border-yellow-500/30", number: "Ahorros: 617 0000 1377",
    details: [
      { label: "Cuenta de ahorros", value: "61700001377" },
    ],
  },
];

type WalletTab = "depositar" | "retirar" | "solicitudes" | "historial";
type DepositStep = "metodo" | "monto" | "pago";

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<WalletTab>("depositar");
  const [method, setMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [depositStep, setDepositStep] = useState<DepositStep>("metodo");
  const [depositing, setDepositing] = useState(false);
  const [wMethod, setWMethod] = useState("");
  const [wAmount, setWAmount] = useState("");
  const [wAccount, setWAccount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadWallet = async () => {
    try {
      const [walletData, depData, wdData] = await Promise.all([
        api.getWallet(), api.getMyDeposits(), api.getMyWithdrawals(),
      ]);
      setBalance(walletData.balance);
      setTransactions(walletData.transactions);
      setDeposits(depData);
      setWithdrawals(wdData);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { loadWallet(); }, []);

  const selectedMethod = METHODS.find((m) => m.key === method);

  const goToPayment = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 5000) { setError("Deposito minimo: $5.000 COP"); return; }
    setError(""); setDepositStep("pago");
  };

  const handleDeposit = async () => {
    const amt = parseFloat(amount);
    if (!method) { setError("Selecciona un metodo de pago"); return; }
    if (isNaN(amt) || amt < 5000) { setError("Deposito minimo: $5,000 COP"); return; }
    if (!comprobante) { setError("Sube el comprobante de pago"); return; }
    setError(""); setDepositing(true);
    try {
      await api.deposit({ amount: amt, method, comprobante });
      setSuccess("Solicitud de recarga enviada. Pendiente de aprobacion.");
      setAmount(""); setComprobante(null); setMethod(""); setDepositStep("metodo"); setActiveTab("solicitudes");
      loadWallet();
      setTimeout(() => setSuccess(""), 6000);
    } catch (err) { setError(err instanceof Error ? err.message : "Error en la recarga"); } finally { setDepositing(false); }
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(wAmount);
    if (!wMethod) { setError("Selecciona un metodo de retiro"); return; }
    if (isNaN(amt) || amt < 10000) { setError("Retiro minimo: $10,000 COP"); return; }
    if (!wAccount.trim()) { setError("Ingresa tu numero de cuenta"); return; }
    if (amt > balance) { setError("Saldo insuficiente"); return; }
    setError(""); setWithdrawing(true);
    try {
      await api.withdraw({ amount: amt, method: wMethod, account_number: wAccount.trim() });
      setSuccess("Solicitud de retiro enviada. Pendiente de aprobacion.");
      setWAmount(""); setWAccount(""); setWMethod(""); setActiveTab("solicitudes");
      loadWallet();
      setTimeout(() => setSuccess(""), 6000);
    } catch (err) { setError(err instanceof Error ? err.message : "Error en el retiro"); } finally { setWithdrawing(false); }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Bogota" }); }
    catch { return d; }
  };

  const statusBadge = (status: string) => {
    if (status === "pending") return <span className="flex items-center gap-1 text-xs text-yellow-400"><AlertCircle size={12} /> Pendiente</span>;
    if (status === "approved") return <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 size={12} /> Aprobado</span>;
    if (status === "rejected") return <span className="flex items-center gap-1 text-xs text-red-400"><XCircle size={12} /> Rechazado</span>;
    return <span className="text-xs text-gray-400">{status}</span>;
  };

  const methodLabel = (m: string) => METHODS.find(x => x.key === m)?.label || m;

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20 md:pb-0">
      <div className="h-8 bg-gray-800/50 rounded w-48 animate-pulse" />
      <div className="card-dark rounded-2xl overflow-hidden">
        <div className="h-1.5 bg-gray-700" />
        <div className="p-6 space-y-3">
          <div className="h-8 bg-gray-800/50 rounded w-8 mx-auto animate-pulse" />
          <div className="h-4 bg-gray-800/50 rounded w-32 mx-auto animate-pulse" />
          <div className="h-10 bg-gray-800/50 rounded w-48 mx-auto animate-pulse" />
        </div>
      </div>
      {[1,2,3].map(i => <div key={i} className="card-dark rounded-lg h-16 animate-pulse" />)}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
      <h1 className="text-2xl font-bold text-white">Mi Billetera</h1>
      {success && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg p-3 text-center">{success}</div>}

      {/* Balance */}
      <div className="card-dark rounded-2xl overflow-hidden">
        <div className="h-1.5 gold-gradient" />
        <div className="p-6 text-center">
          <Wallet size={32} className="text-[#b8860b] mx-auto mb-2" />
          <p className="text-sm text-gray-400">Saldo Disponible</p>
          <p className="text-3xl sm:text-4xl font-black gold-text mt-1">
            ${balance.toLocaleString("es-CO")} <span className="text-lg">COP</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111] rounded-xl p-1">
        {([
          { key: "depositar" as WalletTab, label: "Depositar", icon: ArrowUpCircle },
          { key: "retirar" as WalletTab, label: "Retirar", icon: ArrowDownCircle },
          { key: "solicitudes" as WalletTab, label: "Solicitudes", icon: AlertCircle },
          { key: "historial" as WalletTab, label: "Historial", icon: Clock },
        ]).map((tab) => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setError(""); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition ${
              activeTab === tab.key ? "bg-[#b8860b]/20 text-[#ffd700]" : "text-gray-500 hover:text-gray-300"
            }`}>
            <tab.icon size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.slice(0, 4)}</span>
          </button>
        ))}
      </div>

      {/* Deposit Form */}
      {activeTab === "depositar" && (
        <div className="card-dark rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-white">Cargar Saldo</h3>

          {depositStep === "metodo" && (
            <>
              <p className="text-xs text-gray-500">Paso 1 de 3 - Elige como vas a pagar.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {METHODS.map((m) => (
                  <button key={m.key} onClick={() => { setMethod(m.key); setError(""); setDepositStep("monto"); }}
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
            </>
          )}

          {depositStep === "monto" && selectedMethod && (
            <>
              <p className="text-xs text-gray-500">Paso 2 de 3 - Digita cuanto vas a recargar por {selectedMethod.label}.</p>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Monto (COP)</label>
                <input type="text" inputMode="numeric" autoFocus value={formatMoneyInput(amount)}
                  onChange={(e) => setAmount(parseMoneyInput(e.target.value))}
                  className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-[#b8860b] focus:outline-none text-lg font-bold"
                  placeholder="50.000" />
                <div className="flex gap-2 mt-2">
                  {[10000, 20000, 50000, 100000].map((amt) => (
                    <button key={amt} onClick={() => setAmount(String(amt))}
                      className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-md py-1.5 text-xs text-gray-400 hover:border-[#b8860b] hover:text-[#ffd700] transition">
                      ${(amt / 1000)}K
                    </button>
                  ))}
                </div>
              </div>
              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg p-2 text-center">{error}</div>}
              <div className="flex gap-2">
                <button onClick={() => { setError(""); setDepositStep("metodo"); }}
                  className="px-4 py-3 rounded-lg border border-gray-700 text-gray-400 text-sm hover:border-gray-600">
                  Atras
                </button>
                <button onClick={goToPayment}
                  className="flex-1 gold-gradient text-black font-bold py-3 rounded-lg hover:opacity-90 transition text-sm">
                  Proceder con el pago
                </button>
              </div>
            </>
          )}

          {depositStep === "pago" && selectedMethod && (
            <>
              <p className="text-xs text-gray-500">Paso 3 de 3 - Transfiere el monto exacto y confirma.</p>
              <div className={`rounded-lg border p-4 space-y-2 ${selectedMethod.bg} ${selectedMethod.border}`}>
                <div className={`flex items-center gap-2 ${selectedMethod.color}`}>
                  <selectedMethod.icon size={18} />
                  <p className="font-bold">{selectedMethod.label}</p>
                </div>
                {selectedMethod.details.map((d) => (
                  <div key={d.label} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400">{d.label}</span>
                    <span className="text-sm text-white font-bold">{d.value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-2 border-t border-gray-700/60 pt-2">
                  <span className="text-xs text-gray-400">Monto a pagar</span>
                  <span className="text-lg gold-text font-black">${formatMoneyInput(amount)} COP</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Comprobante de Pago</label>
                <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed rounded-lg px-4 py-4 cursor-pointer transition ${
                  comprobante ? "border-[#b8860b] bg-[#b8860b]/10" : "border-gray-700 bg-[#0a0a0a] hover:border-gray-500"
                }`}>
                  <input type="file" accept="image/*,.pdf" className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) setComprobante(e.target.files[0]); }} />
                  {comprobante ? (
                    <>
                      <ImageIcon size={18} className="text-[#ffd700]" />
                      <span className="text-sm text-[#ffd700] font-medium truncate">{comprobante.name}</span>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setComprobante(null); }}
                        className="text-red-400 hover:text-red-300 ml-2"><XCircle size={16} /></button>
                    </>
                  ) : (
                    <>
                      <Upload size={20} className="text-gray-500" />
                      <span className="text-sm text-gray-500">Toca para subir foto o captura del pago</span>
                    </>
                  )}
                </label>
                <p className="text-xs text-gray-600 mt-1">JPG, PNG, WebP o PDF</p>
              </div>
              <p className="text-xs text-gray-500">Tu solicitud sera revisada y aprobada por un administrador.</p>
              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg p-2 text-center">{error}</div>}
              <div className="flex gap-2">
                <button onClick={() => { setError(""); setDepositStep("monto"); }}
                  className="px-4 py-3 rounded-lg border border-gray-700 text-gray-400 text-sm hover:border-gray-600">
                  Atras
                </button>
                <button onClick={handleDeposit} disabled={depositing}
                  className="flex-1 gold-gradient text-black font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50 text-sm">
                  {depositing ? "Enviando..." : "Ya he pagado"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Withdraw Form */}
      {activeTab === "retirar" && (
        <div className="card-dark rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-white">Retirar Fondos</h3>
          <p className="text-xs text-gray-500">Tu solicitud sera procesada y aprobada por un administrador.</p>
          <div>
            <label className="block text-xs text-gray-400 mb-2">Metodo de Retiro</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {METHODS.map((m) => (
                <button key={m.key} onClick={() => setWMethod(m.key)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition ${
                    wMethod === m.key ? `${m.bg} ${m.border} ${m.color}` : "bg-[#0a0a0a] border-gray-700 text-gray-400 hover:border-gray-600"
                  }`}>
                  <m.icon size={18} />
                  <div className="text-left"><p className="font-medium">{m.label}</p></div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Numero de Cuenta / Celular</label>
            <input type="text" value={wAccount} onChange={(e) => setWAccount(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:border-[#b8860b] focus:outline-none"
              placeholder="Ej: 300-123-4567" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Monto a Retirar (COP)</label>
            <input type="text" inputMode="numeric" value={formatMoneyInput(wAmount)}
              onChange={(e) => setWAmount(parseMoneyInput(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-[#b8860b] focus:outline-none text-lg font-bold"
              placeholder="50.000" />
            <p className="text-xs text-gray-500 mt-1">
              Retiro minimo: $10,000 COP. Saldo: <span className="text-[#ffd700]">${balance.toLocaleString("es-CO")} COP</span>
            </p>
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg p-2 text-center">{error}</div>}
          <button onClick={handleWithdraw} disabled={withdrawing}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50 text-sm">
            {withdrawing ? "Enviando..." : "Solicitar Retiro"}
          </button>
        </div>
      )}

      {/* Solicitudes */}
      {activeTab === "solicitudes" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <ArrowUpCircle size={16} className="text-green-400" /> Solicitudes de Deposito
            </h3>
            {deposits.length === 0 ? (
              <div className="card-dark rounded-xl p-6 text-center text-gray-500 text-sm">No hay solicitudes</div>
            ) : (
              <div className="space-y-2">
                {deposits.map((dep) => (
                  <div key={dep.id} className="card-dark rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ArrowUpCircle size={18} className="text-green-400" />
                      <div>
                        <p className="text-sm text-white font-medium">${dep.amount.toLocaleString("es-CO")} COP</p>
                        <p className="text-xs text-gray-500">{methodLabel(dep.method)} - {dep.reference?.startsWith("/comprobantes/") ? <a href={`${import.meta.env.VITE_API_URL || ""}${dep.reference}`} target="_blank" rel="noopener noreferrer" className="text-[#ffd700] underline">Ver comprobante</a> : dep.reference} - {formatDate(dep.created_at)}</p>
                      </div>
                    </div>
                    {statusBadge(dep.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <ArrowDownCircle size={16} className="text-red-400" /> Solicitudes de Retiro
            </h3>
            {withdrawals.length === 0 ? (
              <div className="card-dark rounded-xl p-6 text-center text-gray-500 text-sm">No hay solicitudes</div>
            ) : (
              <div className="space-y-2">
                {withdrawals.map((wd) => (
                  <div key={wd.id} className="card-dark rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ArrowDownCircle size={18} className="text-red-400" />
                      <div>
                        <p className="text-sm text-white font-medium">${wd.amount.toLocaleString("es-CO")} COP</p>
                        <p className="text-xs text-gray-500">{methodLabel(wd.method)} - {wd.account_number} - {formatDate(wd.created_at)}</p>
                      </div>
                    </div>
                    {statusBadge(wd.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historial */}
      {activeTab === "historial" && (
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
                    {tx.type === "deposit" || tx.type === "winning" ? (
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
      )}
    </div>
  );
}

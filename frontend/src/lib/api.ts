const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken(): string | null {
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getUser() {
  const u = localStorage.getItem("user");
  return u ? JSON.parse(u) : null;
}

export function setUser(user: Record<string, unknown>) {
  localStorage.setItem("user", JSON.stringify(user));
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && !path.includes("/auth/login")) {
      clearToken();
      window.location.href = "/login";
      throw new Error("Sesion expirada. Inicia sesion de nuevo.");
    }
    throw new Error(data.detail || `Error ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  validateInvite: (code: string) =>
    request("/api/auth/validate-invite", { method: "POST", body: JSON.stringify({ code }) }),
  login: (data: { username: string; password: string }) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
  register: (data: {
    username: string;
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    invite_code: string;
  }) => request("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
  getMe: () => request("/api/auth/me"),

  // Profile
  updateProfile: (data: { full_name?: string; phone?: string; email?: string }) =>
    request("/api/auth/profile", { method: "PUT", body: JSON.stringify(data) }),
  changePassword: (data: { current_password: string; new_password: string }) =>
    request("/api/auth/password", { method: "PUT", body: JSON.stringify(data) }),
  getProfileStats: () => request("/api/auth/profile/stats"),
  selfExclude: (days: number) =>
    request("/api/auth/self-exclude", { method: "POST", body: JSON.stringify({ days }) }),

  // Events
  getEvents: (status?: string, country?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status_filter", status);
    if (country) params.set("country", country);
    const qs = params.toString();
    return request(`/api/events${qs ? `?${qs}` : ""}`);
  },
  getEvent: (id: number) => request(`/api/events/${id}`),
  createEvent: (data: Record<string, unknown>) =>
    request("/api/events", { method: "POST", body: JSON.stringify(data) }),
  updateEvent: (id: number, data: Record<string, unknown>) =>
    request(`/api/events/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteEvent: (id: number) =>
    request(`/api/events/${id}`, { method: "DELETE" }),
  declareWinner: (eventId: number, playerId: number) =>
    request(`/api/events/${eventId}/winner`, { method: "POST", body: JSON.stringify({ player_id: playerId }) }),

  // Players
  getPlayers: () => request("/api/players"),
  getPlayer: (id: number) => request(`/api/players/${id}`),
  createPlayer: (data: Record<string, unknown>) =>
    request("/api/players", { method: "POST", body: JSON.stringify(data) }),
  updatePlayer: (id: number, data: Record<string, unknown>) =>
    request(`/api/players/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePlayer: (id: number) =>
    request(`/api/players/${id}`, { method: "DELETE" }),

  // Event Players
  addPlayerToEvent: (eventId: number, data: { player_id: number; position?: number; odds: number }) =>
    request(`/api/events/${eventId}/players`, { method: "POST", body: JSON.stringify(data) }),
  updatePlayerOdds: (eventId: number, playerId: number, odds: number) =>
    request(`/api/events/${eventId}/players/${playerId}`, { method: "PUT", body: JSON.stringify({ odds }) }),
  removePlayerFromEvent: (eventId: number, playerId: number) =>
    request(`/api/events/${eventId}/players/${playerId}`, { method: "DELETE" }),

  // Bets
  placeBet: (data: { event_id: number; player_id: number; amount: number }) =>
    request("/api/bets", { method: "POST", body: JSON.stringify(data) }),
  getMyBets: () => request("/api/bets"),
  getBet: (id: number) => request(`/api/bets/${id}`),

  // Wallet
  getWallet: () => request("/api/wallet"),
  deposit: (data: { amount: number; method: string; comprobante: File }) => {
    const formData = new FormData();
    formData.append("amount", String(data.amount));
    formData.append("method", data.method);
    formData.append("comprobante", data.comprobante);
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(`${API_URL}/api/wallet/deposit`, { method: "POST", body: formData, headers }).then(async (res) => {
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (res.status === 401) { localStorage.removeItem("token"); localStorage.removeItem("user"); window.location.href = "/login"; }
        throw new Error(d.detail || `Error ${res.status}`);
      }
      return res.json();
    });
  },
  getMyDeposits: () => request("/api/wallet/deposits"),
  withdraw: (data: { amount: number; method: string; account_number: string }) =>
    request("/api/wallet/withdraw", { method: "POST", body: JSON.stringify(data) }),
  getMyWithdrawals: () => request("/api/wallet/withdrawals"),

  // Notifications
  getNotifications: () => request("/api/notifications"),
  markNotificationsRead: () => request("/api/notifications/read", { method: "PUT" }),
  markOneRead: (id: number) => request(`/api/notifications/${id}/read`, { method: "PUT" }),
  getSSEUrl: () => {
    const token = getToken();
    return `${API_URL}/api/notifications/stream?token=${encodeURIComponent(token || "")}`;
  },

  // Admin
  getStats: () => request("/api/admin/stats"),
  getUsers: () => request("/api/admin/users"),
  updateUser: (id: number, data: Record<string, unknown>) =>
    request(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  getAllBets: () => request("/api/admin/bets"),
  getUserBets: (userId: number) => request(`/api/admin/users/${userId}/bets`),
  generateInviteCodes: (count: number) =>
    request("/api/admin/invite-codes", { method: "POST", body: JSON.stringify({ count }) }),
  getInviteCodes: () => request("/api/admin/invite-codes"),
  seedData: () => request("/api/admin/seed", { method: "POST" }),
  sendPromotion: (data: { title: string; message: string }) =>
    request("/api/admin/promotions", { method: "POST", body: JSON.stringify(data) }),

  // Admin - Deposits & Withdrawals
  getAdminDeposits: () => request("/api/admin/deposits"),
  reviewDeposit: (id: number, status: string) =>
    request(`/api/admin/deposits/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
  getAdminWithdrawals: () => request("/api/admin/withdrawals"),
  reviewWithdrawal: (id: number, status: string) =>
    request(`/api/admin/withdrawals/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),

  // Admin - User History
  getUserDeposits: (userId: number) => request(`/api/admin/users/${userId}/deposits`),
  getUserWithdrawals: (userId: number) => request(`/api/admin/users/${userId}/withdrawals`),

  // Password Recovery
  requestPasswordReset: (username_or_email: string) =>
    request("/api/auth/password-reset-request", { method: "POST", body: JSON.stringify({ username_or_email }) }),
  adminResetPassword: (userId: number, new_password: string) =>
    request(`/api/admin/users/${userId}/reset-password`, { method: "PUT", body: JSON.stringify({ new_password }) }),

  // Admin - Backups
  getBackups: () => request("/api/admin/backups"),
  createBackup: () => request("/api/admin/backups", { method: "POST" }),
  restoreBackup: (name: string) =>
    request("/api/admin/backups/restore", { method: "POST", body: JSON.stringify({ name }) }),
};

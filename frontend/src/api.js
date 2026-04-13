const API_BASE = import.meta.env.VITE_API_BASE || '';

async function call(path, options = {}) {
  const mergedHeaders = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${path}`, {
    headers: mergedHeaders,
    credentials: 'include',
    ...options
  });

  if (!response.ok) {
    let message = `API hata: ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.message) {
        message = payload.message;
      }
    } catch {
      message = `API hata: ${response.status}`;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  login: (username, password) => call('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => call('/api/auth/me'),
  logout: () => call('/api/auth/logout', { method: 'POST' }),
  rooms: () => call('/api/rooms'),
  createRoom: (payload) => call('/api/rooms', { method: 'POST', body: JSON.stringify(payload) }),
  updateRoom: (id, payload) => call(`/api/rooms/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteRoom: (id) => call(`/api/rooms/${id}`, { method: 'DELETE' }),
  roomStatus: (roomNumber, status) => call(`/api/rooms/${roomNumber}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  reservations: (from, to) => call(`/api/reservations?from=${from}&to=${to}`),
  createReservation: (payload) => call('/api/reservations', { method: 'POST', body: JSON.stringify(payload) }),
  updateReservation: (id, payload) => call(`/api/reservations/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  updateReservationCheckin: (id, checkin_done) => call(`/api/reservations/${id}/checkin`, { method: 'PATCH', body: JSON.stringify({ checkin_done }) }),
  updateReservationCheckout: (id, checkout_done) => call(`/api/reservations/${id}/checkout`, { method: 'PATCH', body: JSON.stringify({ checkout_done }) }),
  deleteReservation: (id) => call(`/api/reservations/${id}`, { method: 'DELETE' }),
  dashboard: (date) => call(`/api/dashboard?date=${date}`),
  cashDaily: (date) => call(`/api/cash/daily?date=${date}`),
  createCashTransaction: (payload) => call('/api/cash/transactions', { method: 'POST', body: JSON.stringify(payload) }),
  updateCashTransaction: (id, payload) => call(`/api/cash/transactions/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCashTransaction: (id) => call(`/api/cash/transactions/${id}`, { method: 'DELETE' }),
  cashGeneral: (start, end) => call(`/api/cash/general?start=${start}&end=${end}`),
  profitLoss: (start, end) => call(`/api/profit-loss?start=${start}&end=${end}`),
  forecast: (month) => call(`/api/forecast?month=${month}`),
  roomRack: (start, days = 10) => call(`/api/room-rack?start=${start}&days=${days}`),
  settings: () => call('/api/settings'),
  saveSettings: (payload) => call('/api/settings', { method: 'PUT', body: JSON.stringify(payload) })
};

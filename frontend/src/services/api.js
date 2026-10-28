const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

// Token Storage Keys
const ACCESS_TOKEN_KEY = 'darkhold_access_token'
const REFRESH_TOKEN_KEY = 'darkhold_refresh_token'
const USER_KEY = 'darkhold_user'

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  getUser: () => {
    try {
      const u = localStorage.getItem(USER_KEY)
      return u ? JSON.parse(u) : null
    } catch {
      return null
    }
  },
  setAuth: (accessToken, refreshToken, user) => {
    if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    if (user) {
      try {
        const userToStore = { ...user }
        if (userToStore.kyc && userToStore.kyc.document_url) {
          userToStore.kyc = { ...userToStore.kyc, document_url: undefined }
        }
        localStorage.setItem(USER_KEY, JSON.stringify(userToStore))
      } catch (err) {
        console.warn('LocalStorage save warning:', err)
      }
    }
  },
  setAccessToken: (accessToken) => {
    if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  },
  clearAuth: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },
}

// Low-level fetch wrapper with automatic JWT refresh
export async function apiRequest(endpoint, options = {}, isRetry = false) {
  const url = `${API_BASE_URL}${endpoint}`
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  const token = tokenStorage.getAccessToken()
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    // Handle 401 Unauthorized for token refresh
    if (response.status === 401 && !isRetry && !endpoint.includes('/login') && !endpoint.includes('/refresh')) {
      const refreshToken = tokenStorage.getRefreshToken()
      if (refreshToken) {
        try {
          const refreshResp = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          })

          if (refreshResp.ok) {
            const data = await refreshResp.json()
            tokenStorage.setAccessToken(data.access_token)
            // Retry original request with fresh token
            headers['Authorization'] = `Bearer ${data.access_token}`
            return apiRequest(endpoint, { ...options, headers }, true)
          } else {
            // Refresh token revoked or expired
            tokenStorage.clearAuth()
            window.dispatchEvent(new Event('auth:expired'))
          }
        } catch (err) {
          tokenStorage.clearAuth()
          window.dispatchEvent(new Event('auth:expired'))
        }
      } else {
        tokenStorage.clearAuth()
      }
    }

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const error = new Error(data.error || 'Request failed')
      error.status = response.status
      error.code = data.code
      error.email = data.email
      error.data = data
      throw error
    }

    return data
  } catch (err) {
    throw err
  }
}

// Auth API Methods
export const authApi = {
  signup: (email, username, password) =>
    apiRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    }),

  verifyOTP: (email, otp) =>
    apiRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),

  resendOTP: (email) =>
    apiRequest('/api/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  login: (identifier, password) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),

  logout: () =>
    apiRequest('/api/auth/logout', {
      method: 'POST',
    }),

  getMe: () => apiRequest('/api/auth/me'),

  getSessions: () => apiRequest('/api/auth/sessions'),

  revokeSession: (sessionId) =>
    apiRequest(`/api/auth/sessions/${sessionId}`, {
      method: 'DELETE',
    }),

  revokeAllSessions: () =>
    apiRequest('/api/auth/logout-all', {
      method: 'POST',
    }),

  // Identity Verification (KYC)
  submitKYC: (idType, idNumber, documentUrl) =>
    apiRequest('/api/user/kyc/submit', {
      method: 'POST',
      body: JSON.stringify({
        id_type: idType,
        id_number: idNumber,
        document_url: documentUrl,
      }),
    }),

  // Admin Verification Methods
  adminListKYC: (status = '') =>
    apiRequest(`/api/admin/verifications${status ? `?status=${status}` : ''}`),

  adminReviewKYC: (userId, status, rejectionReason = '') =>
    apiRequest(`/api/admin/verifications/${userId}/review`, {
      method: 'POST',
      body: JSON.stringify({
        status,
        rejection_reason: rejectionReason,
      }),
    }),
}

// Relic Inventory & Ticket Ingestion Methods
export const ticketsApi = {
  getEvents: () => apiRequest('/api/events'),

  importTicket: (ticketId, eventSymbol) =>
    apiRequest('/api/tickets/import', {
      method: 'POST',
      body: JSON.stringify({
        ticket_id: ticketId,
        event_symbol: eventSymbol,
      }),
    }),

  getMyRelics: () => apiRequest('/api/tickets/mine'),
}

// Fiat On-Ramp & Treasury Methods
export const walletApi = {
  simulateDeposit: (amount, currency, paymentId) =>
    apiRequest('/api/wallet/deposit/simulate', {
      method: 'POST',
      body: JSON.stringify({
        amount: Number(amount),
        currency,
        payment_id: paymentId,
      }),
    }),

  getBalances: () => apiRequest('/api/wallet/balances'),
}

// In-Memory Matching Engine & Secondary Market Methods
export const ordersApi = {
  placeOrder: ({ eventSymbol, side, orderType, price, quantity, quoteCurrency = 'INR' }) =>
    apiRequest('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        event_symbol: eventSymbol,
        side,
        order_type: orderType,
        price: Number(price),
        quantity: Number(quantity),
        quote_currency: quoteCurrency,
      }),
    }),

  cancelOrder: (orderId) =>
    apiRequest(`/api/orders/${orderId}`, {
      method: 'DELETE',
    }),

  getMyOrders: () => apiRequest('/api/orders/mine'),

  getOrderBook: (symbol) => apiRequest(`/api/markets/${symbol}/orderbook`),

  getTrades: (symbol) => apiRequest(`/api/markets/${symbol}/trades`),

  getTelemetry: () => apiRequest('/api/engine/telemetry'),
}



// Dutch Auction Price-Decay Subsystem Methods
export const auctionsApi = {
  createAuction: ({ relicId, eventSymbol, startPrice, reservePrice, durationSeconds }) =>
    apiRequest('/api/auctions', {
      method: 'POST',
      body: JSON.stringify({
        relic_id: relicId,
        event_symbol: eventSymbol,
        start_price: Number(startPrice),
        reserve_price: Number(reservePrice),
        duration_seconds: Number(durationSeconds),
      }),
    }),

  getAuctions: (symbol = '') =>
    apiRequest(`/api/auctions${symbol ? `?symbol=${symbol}` : ''}`),

  snipeAuction: (auctionId) =>
    apiRequest(`/api/auctions/${auctionId}/buy`, {
      method: 'POST',
    }),
}

import React, { createContext, useContext, useState, useEffect } from 'react'
import { authApi, tokenStorage } from '../services/api'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(tokenStorage.getUser())
  const [pendingEmail, setPendingEmail] = useState(
    localStorage.getItem('darkhold_pending_email') || ''
  )
  const [isLoading, setIsLoading] = useState(true)

  const savePendingEmail = (email) => {
    setPendingEmail(email)
    if (email) {
      localStorage.setItem('darkhold_pending_email', email)
    } else {
      localStorage.removeItem('darkhold_pending_email')
    }
  }

  // Check auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = tokenStorage.getAccessToken()
      if (token) {
        try {
          const userData = await authApi.getMe()
          setUser(userData)
          tokenStorage.setAuth(token, tokenStorage.getRefreshToken(), userData)
        } catch (err) {
          // Token invalid or expired
          tokenStorage.clearAuth()
          setUser(null)
        }
      }
      setIsLoading(false)
    }

    initAuth()

    const handleAuthExpired = () => {
      tokenStorage.clearAuth()
      setUser(null)
      toast.error('Session expired. Please sign in again.')
    }

    window.addEventListener('auth:expired', handleAuthExpired)
    return () => window.removeEventListener('auth:expired', handleAuthExpired)
  }, [])

  // Login handler
  const login = async (identifier, password) => {
    try {
      const data = await authApi.login(identifier, password)
      tokenStorage.setAuth(data.access_token, data.refresh_token, data.user)
      setUser(data.user)
      savePendingEmail('')
      toast.success(`Welcome back, ${data.user.username}!`, {
        icon: '⚡',
      })
      return data
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED' || err.status === 403) {
        savePendingEmail(err.email || identifier)
      }
      throw err
    }
  }

  // Signup handler
  const signup = async (email, username, password) => {
    const data = await authApi.signup(email, username, password)
    savePendingEmail(email)
    toast.success('Verification code dispatched to your email!', {
      icon: '📧',
    })
    return data
  }

  // Verify OTP handler
  const verifyEmail = async (email, otp) => {
    const data = await authApi.verifyOTP(email, otp)
    tokenStorage.setAuth(data.access_token, data.refresh_token, data.user)
    setUser(data.user)
    savePendingEmail('')
    toast.success('Email verified! Please submit your government ID to complete verification.', {
      icon: '🛡️',
      duration: 5000,
    })
    return data
  }

  // Resend OTP handler
  const resendOTP = async (email) => {
    const data = await authApi.resendOTP(email)
    toast.success('A new 6-digit code has been sent.', {
      icon: '📨',
    })
    return data
  }

  // Identity Verification (KYC) handler
  const submitKYC = async (idType, idNumber, documentUrl) => {
    const res = await authApi.submitKYC(idType, idNumber, documentUrl)
    if (res.user) {
      tokenStorage.setAuth(null, null, res.user)
      setUser(res.user)
    }
    toast.success('Government ID submitted! Your verification is now pending admin review.', {
      icon: '⏳',
      duration: 5000,
    })
    return res
  }

  // Refresh user data from server
  const refreshUser = async () => {
    try {
      const fresh = await authApi.getMe()
      tokenStorage.setAuth(null, null, fresh)
      setUser(fresh)
      return fresh
    } catch {
      return null
    }
  }

  // Logout handler
  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore network errors on logout
    } finally {
      tokenStorage.clearAuth()
      setUser(null)
      toast.success('Signed out successfully.', {
        icon: '🔒',
      })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        pendingEmail,
        setPendingEmail: savePendingEmail,
        login,
        signup,
        verifyEmail,
        resendOTP,
        submitKYC,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

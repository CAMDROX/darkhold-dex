import React, { createContext, useContext, useState, useEffect } from 'react'
import { authApi, tokenStorage } from '../services/api'
import { notify } from '../utils/notification'

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
        } catch {
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
      notify.error('Session Expired', 'Your authentication session has expired. Please sign in again.')
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
      notify.success('Session Authenticated', `Welcome back, ${data.user.username}! You are now signed in.`)
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
    notify.info('Verification Dispatched', 'A 6-digit confirmation code has been dispatched to your email address.')
    return data
  }

  // Verify OTP handler
  const verifyEmail = async (email, otp) => {
    const data = await authApi.verifyOTP(email, otp)
    tokenStorage.setAuth(data.access_token, data.refresh_token, data.user)
    setUser(data.user)
    savePendingEmail('')
    notify.success('Email Verified', 'Email address confirmed. Please submit your government proof document to unlock trading.')
    return data
  }

  // Resend OTP handler
  const resendOTP = async (email) => {
    const data = await authApi.resendOTP(email)
    notify.info('OTP Re-sent', 'A new 6-digit verification code has been dispatched to your inbox.')
    return data
  }

  // Identity Verification (KYC) handler
  const submitKYC = async (idType, idNumber, documentUrl) => {
    const res = await authApi.submitKYC(idType, idNumber, documentUrl)
    if (res.user) {
      tokenStorage.setAuth(null, null, res.user)
      setUser(res.user)
    }
    notify.info('Verification Pending', 'Government ID submitted. Your proof document is now pending compliance review.')
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
      notify.info('Signed Out', 'Your session has been terminated safely.')
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

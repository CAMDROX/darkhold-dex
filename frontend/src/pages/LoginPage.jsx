import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Lock, User, ArrowRight, ShieldAlert, Eye, EyeOff, Sparkles, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState(null)
  const [dispatchingOtp, setDispatchingOtp] = useState(false)

  const { login, resendOTP, setPendingEmail } = useAuth()
  const navigate = useNavigate()

  const handleProceedToVerify = async () => {
    const targetEmail = unverifiedEmail || identifier
    if (!targetEmail) {
      navigate('/verify-email')
      return
    }

    setDispatchingOtp(true)
    try {
      setPendingEmail(targetEmail)
      await resendOTP(targetEmail)
    } catch (err) {
      console.warn('Auto-dispatch OTP error:', err)
    } finally {
      setDispatchingOtp(false)
      navigate('/verify-email', { state: { email: targetEmail } })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!identifier.trim() || !password) {
      toast.error('Please enter your email/username and password')
      return
    }

    setLoading(true)
    setUnverifiedEmail(null)

    try {
      await login(identifier, password)
      navigate('/dashboard')
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED' || err.status === 403) {
        setUnverifiedEmail(err.email || identifier)
        toast.error('Email verification required before logging in', {
          icon: '⏳',
        })
      } else {
        toast.error(err.message || 'Invalid credentials')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
      <div className="w-full max-w-md relative">
        
        {/* Glow behind card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37]/20 via-[#EF4444]/20 to-[#D4AF37]/20 rounded-3xl blur-xl opacity-50" />

        <div className="relative rounded-2xl gloss-panel p-8 sm:p-10 border border-[#D4AF37]/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#181310] border border-[#D4AF37]/40 shadow-[0_0_20px_rgba(212,175,55,0.2)] mb-4">
              <svg viewBox="0 0 100 100" className="w-8 h-8">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#D4AF37" strokeWidth="6" />
                <polygon points="50,16 80,72 20,72" fill="none" stroke="#D4AF37" strokeWidth="6" />
                <polygon points="50,84 20,28 80,28" fill="none" stroke="#EF4444" strokeWidth="5" />
                <circle cx="50" cy="50" r="14" fill="#EF4444" />
              </svg>
            </div>
            <h1 className="font-cinzel font-black text-2xl sm:text-3xl tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#FFF] via-[#F5D061] to-[#D4AF37]">
              ENTER CITADEL
            </h1>
            <p className="text-xs sm:text-sm font-mono text-[#9B9487] mt-1.5">
              Access the high-frequency secondary order book
            </p>
          </div>

          {/* Unverified Email Warning Banner */}
          {unverifiedEmail && (
            <div className="mb-6 p-4 rounded-xl bg-[#291010] border border-[#EF4444]/50 text-xs font-mono">
              <div className="flex items-start gap-2.5 text-[#FCA5A5] mb-2 font-bold">
                <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                <span>EMAIL VERIFICATION REQUIRED</span>
              </div>
              <p className="text-[#E0DBD2] text-[11px] leading-relaxed mb-3">
                Your email <strong className="text-white">{unverifiedEmail}</strong> has not been verified with the 6-digit arcane code.
              </p>
              <button
                type="button"
                onClick={handleProceedToVerify}
                disabled={dispatchingOtp}
                className="w-full py-2.5 rounded-lg bg-[#EF4444]/20 border border-[#EF4444]/60 text-white hover:bg-[#EF4444]/30 font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {dispatchingOtp ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Dispatching Security Code...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Verify Email</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-mono text-[#D4AF37] mb-2 uppercase tracking-wider">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#736B5E]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="sorcerer_99 or you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0D0B0A] border border-[#2D2520] focus:border-[#D4AF37] focus:outline-none text-sm text-white placeholder-[#5A5247] font-mono transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-mono text-[#D4AF37] uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#736B5E]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-[#0D0B0A] border border-[#2D2520] focus:border-[#D4AF37] focus:outline-none text-sm text-white placeholder-[#5A5247] font-mono transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#736B5E] hover:text-[#D4AF37] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 rounded-xl font-mono text-xs uppercase tracking-widest font-bold text-[#0B0908] bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#E5C378] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer link */}
          <div className="mt-8 pt-6 border-t border-[#241E19] text-center text-xs font-mono text-[#8E867A]">
            <span>Don't have an initiated identity? </span>
            <Link
              to="/signup"
              className="text-[#F5D061] hover:text-white underline decoration-[#D4AF37]/50 underline-offset-4 font-semibold"
            >
              Create Account
            </Link>
          </div>

        </div>

      </div>
    </div>
  )
}

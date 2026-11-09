import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, User, Lock, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (username.trim().length < 3) {
      toast.error('Username must be at least 3 characters')
      return
    }

    if (!email.includes('@') || !email.includes('.')) {
      toast.error('Please enter a valid email address')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      await signup(email.trim(), username.trim(), password)
      navigate('/verify-email')
    } catch (err) {
      toast.error(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 relative">
      <div className="w-full max-w-md relative">
        
        {/* Ambient atmospheric depth lighting behind card */}
        <div className="absolute -inset-1.5 bg-gradient-to-r from-[#D4AF37]/25 via-emerald-500/15 to-[#D4AF37]/25 rounded-3xl blur-2xl opacity-40 pointer-events-none" />

        {/* Elevated Spatial Glass Card */}
        <div className="relative rounded-3xl spatial-glass p-8 sm:p-10 border border-white/[0.08] shadow-[0_25px_70px_rgba(0,0,0,0.95)] backdrop-blur-2xl transition-all duration-300">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-black/60 border border-white/[0.1] shadow-[0_0_25px_rgba(212,175,55,0.25)] mb-4 hover:scale-105 transition-transform duration-300">
              <svg viewBox="0 0 100 100" className="w-8 h-8">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#D4AF37" strokeWidth="6" />
                <polygon points="50,16 80,72 20,72" fill="none" stroke="#D4AF37" strokeWidth="6" />
                <polygon points="50,84 20,28 80,28" fill="none" stroke="#EF4444" strokeWidth="5" />
                <circle cx="50" cy="50" r="14" fill="#EF4444" />
              </svg>
            </div>
            <h1 className="font-cinzel font-black text-2xl sm:text-3xl tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F5D061] to-[#D4AF37]">
              FORGE IDENTITY
            </h1>
            <p className="text-xs sm:text-sm font-mono text-white/60 mt-1.5">
              Initiate your account on the Darkhold Protocol
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-white/70 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="vanguard_trader"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/30 focus:outline-none text-sm text-white placeholder-white/20 font-mono transition-all duration-300 shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-white/70 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/30 focus:outline-none text-sm text-white placeholder-white/20 font-mono transition-all duration-300 shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-white/70 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/30 focus:outline-none text-sm text-white placeholder-white/20 font-mono transition-all duration-300 shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/40 hover:text-[#D4AF37] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-white/70 mb-1.5 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/30 focus:outline-none text-sm text-white placeholder-white/20 font-mono transition-all duration-300 shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 rounded-xl font-mono text-xs uppercase tracking-widest font-bold text-[#0B0908] bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#E5C378] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] hover:-translate-y-0.5 active:scale-95 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Dispatching Arcane Code...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Send OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer link */}
          <div className="mt-8 pt-6 border-t border-white/[0.06] text-center text-xs font-mono text-white/50">
            <span>Already have an initiated identity? </span>
            <Link
              to="/login"
              className="text-[#F5D061] hover:text-white underline decoration-[#D4AF37]/50 underline-offset-4 font-semibold transition-colors"
            >
              Sign In
            </Link>
          </div>

        </div>

      </div>
    </div>
  )
}

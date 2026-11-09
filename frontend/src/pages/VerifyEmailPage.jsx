import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ShieldCheck, Mail, RotateCcw, Edit2 } from 'lucide-react'
import { notify } from '../utils/notification'

export default function VerifyEmailPage() {
  const location = useLocation()
  const { pendingEmail, setPendingEmail, verifyEmail, resendOTP } = useAuth()
  const initialEmail = location.state?.email || pendingEmail || ''
  const [emailInput, setEmailInput] = useState(initialEmail)
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(60)
  const [resending, setResending] = useState(false)

  const inputRefs = useRef([])
  const navigate = useNavigate()

  useEffect(() => {
    const targetEmail = location.state?.email || pendingEmail
    if (targetEmail && targetEmail !== emailInput) {
      setEmailInput(targetEmail)
      setIsEditingEmail(false)
    }
  }, [location.state?.email, pendingEmail])

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Focus first input box on load
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  const handleDigitChange = (index, value) => {
    // Only accept numeric characters
    if (value && !/^\d+$/.test(value)) return

    const newDigits = [...otpDigits]

    // Handle paste of full 6-digit code
    if (value.length > 1) {
      const pasted = value.slice(0, 6).split('')
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || ''
      }
      setOtpDigits(newDigits)
      const nextIdx = Math.min(pasted.length, 5)
      inputRefs.current[nextIdx]?.focus()
      return
    }

    newDigits[index] = value
    setOtpDigits(newDigits)

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    const targetEmail = emailInput.trim()
    const otp = otpDigits.join('')

    if (!targetEmail) {
      notify.warning('Email Required', 'Please provide a valid email address.')
      return
    }

    if (otp.length !== 6) {
      notify.warning('Incomplete Code', 'Please enter all 6 digits of the confirmation code.')
      return
    }

    setLoading(true)
    try {
      const data = await verifyEmail(targetEmail, otp)
      if (data?.user?.role === 'admin') {
        navigate('/admin/verifications')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      notify.error('Verification Failed', err.message || 'Verification failed. Code may be invalid or expired.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    const targetEmail = emailInput.trim()
    if (!targetEmail) {
      notify.warning('Email Required', 'Please enter your email to receive a new code.')
      return
    }

    setResending(true)
    try {
      await resendOTP(targetEmail)
      setResendCooldown(60)
    } catch (err) {
      notify.error('Resend Failed', err.message || 'Failed to resend confirmation code.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 relative">
      <div className="w-full max-w-md relative">
        
        {/* Ambient atmospheric depth lighting behind card */}
        <div className="absolute -inset-1.5 bg-gradient-to-r from-[#D4AF37]/25 via-emerald-500/15 to-[#D4AF37]/25 rounded-3xl blur-2xl opacity-40 pointer-events-none" />

        {/* Elevated Spatial Glass Card */}
        <div className="relative rounded-3xl spatial-glass p-8 sm:p-10 border border-white/20 shadow-2xl shadow-black/45 backdrop-blur-2xl transition-all duration-300">
          
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1B1F29] border border-emerald-500/30 shadow-[0_0_25px_rgba(34,197,94,0.25)] mb-4 transition-transform duration-300">
              <Mail className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="font-sans font-black text-2xl sm:text-3xl tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F5D061] to-[#D4AF37]">
              VERIFY EMAIL
            </h1>
            <p className="text-xs sm:text-sm font-mono text-white/75 mt-1.5">
              Enter the 6-digit verification code sent to your email
            </p>
          </div>

          {/* Recipient Email Display / Edit */}
          <div className="mb-6 p-3.5 rounded-xl bg-[#181B24] border border-white/20 flex items-center justify-between text-xs font-mono shadow-inner">
            {isEditingEmail ? (
              <input
                type="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value)
                  setPendingEmail(e.target.value)
                }}
                placeholder="Enter email address"
                className="bg-transparent border-b border-[#D4AF37] text-white focus:outline-none w-full mr-2 py-0.5 font-mono"
              />
            ) : (
              <span className="text-[#F5D061] truncate font-medium">
                {emailInput || 'No email provided'}
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsEditingEmail(!isEditingEmail)}
              className="text-white/75 hover:text-[#D4AF37] shrink-0 p-1.5 transition-colors rounded-lg hover:bg-white/[0.05]"
              title="Edit email"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 6-Digit OTP Boxes */}
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex justify-between gap-2 sm:gap-3">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-11 sm:w-12 h-14 rounded-xl text-center font-mono font-bold text-xl text-[#F5D061] bg-[#171A23] border border-white/20 focus:border-[#D4AF37]/70 focus:ring-2 focus:ring-[#D4AF37]/30 focus:outline-none transition-all duration-300 shadow-inner"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || otpDigits.join('').length !== 6}
              className="w-full py-3.5 rounded-xl font-mono text-xs uppercase tracking-widest font-bold text-[#111318] bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#E5C378] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Validating Code...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-[#111318]" />
                  <span>Confirm Code & Enter Exchange</span>
                </>
              )}
            </button>
          </form>

          {/* Resend Cooldown */}
          <div className="mt-6 pt-6 border-t border-white/20 flex items-center justify-between text-xs font-mono text-white/75">
            <span>Didn't receive code?</span>
            {resendCooldown > 0 ? (
              <span className="text-white/75">
                Resend in {resendCooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-[#D4AF37] hover:text-white flex items-center gap-1.5 cursor-pointer font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resend Code</span>
              </button>
            )}
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/login"
              className="text-[11px] font-mono text-white/75 hover:text-white transition-colors"
            >
              ← Back to Sign In
            </Link>
          </div>

        </div>

      </div>
    </div>
  )
}

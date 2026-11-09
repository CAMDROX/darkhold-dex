import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../services/api'
import { 
  ShieldCheck, ShieldAlert, Mail, Laptop, Smartphone, Globe, 
  Trash2, LogOut, Clock, MapPin, RefreshCw, Crown 
} from 'lucide-react'
import IdentityVerificationCard from '../components/IdentityVerificationCard'
import { notify } from '../utils/notification'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [revokingId, setRevokingId] = useState(null)
  const [revokingAll, setRevokingAll] = useState(false)

  const navigate = useNavigate()

  const fetchSessions = async () => {
    setLoadingSessions(true)
    try {
      const data = await authApi.getSessions()
      setSessions(data.sessions || [])
    } catch {
      notify.error('Sessions Unavailable', 'Failed to load active device sessions')
    } finally {
      setLoadingSessions(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  // Revoke a specific device session
  const handleRevokeSession = async (sessionId, isCurrent) => {
    setRevokingId(sessionId)
    try {
      await authApi.revokeSession(sessionId)
      if (isCurrent) {
        notify.info('Session Terminated', 'Current session terminated. Signing out...')
        logout()
        navigate('/login')
      } else {
        notify.success('Session Revoked', 'Selected device session has been revoked.')
        setSessions(prev => prev.filter(s => s.id !== sessionId))
      }
    } catch (err) {
      notify.error('Revocation Failed', err.message || 'Failed to revoke session')
    } finally {
      setRevokingId(null)
    }
  }

  // Revoke all sessions (Global Logout)
  const handleRevokeAllSessions = async () => {
    if (!window.confirm('Are you sure you want to sign out from ALL devices? This will invalidate all active sessions.')) {
      return
    }

    setRevokingAll(true)
    try {
      await authApi.revokeAllSessions()
      notify.success('Global Logout', 'All active sessions on all devices have been revoked.')
      logout()
      navigate('/login')
    } catch (err) {
      notify.error('Global Logout Failed', err.message || 'Failed to revoke all sessions')
    } finally {
      setRevokingAll(false)
    }
  }

  const getDeviceIcon = (deviceName = '', os = '') => {
    const lower = (deviceName + ' ' + os).toLowerCase()
    if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) {
      return <Smartphone className="w-5 h-5 text-[#F5D061]" />
    }
    if (lower.includes('desktop') || lower.includes('mac') || lower.includes('windows') || lower.includes('linux')) {
      return <Laptop className="w-5 h-5 text-[#D4AF37]" />
    }
    return <Globe className="w-5 h-5 text-white/75" />
  }

  return (
    <div className="min-h-[85vh] py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-7 animate-fade-in">
      
      {/* 1. Spatial User Identity Details Card */}
      <div className="relative rounded-3xl spatial-glass p-6 sm:p-8 border border-white/20 shadow-lg shadow-black/40 overflow-hidden transition-all duration-300">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#D4AF37]/10 via-[#D4AF37]/5 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-white/20">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2A2E3B] to-[#212530] border border-[#D4AF37]/50 flex items-center justify-center text-2xl font-sans font-bold text-[#F5D061] shadow-[0_0_20px_rgba(212,175,55,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] shrink-0">
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-sans font-bold text-2xl text-white tracking-wide">
                  {user?.username}
                </h1>

                {/* Role Badge */}
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                  user?.role === 'admin' 
                    ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F5D061] shadow-[0_0_10px_rgba(212,175,55,0.2)]' 
                    : 'bg-white/[0.05] border border-white/20 text-white/70'
                }`}>
                  {user?.role === 'admin' && <Crown className="w-3 h-3 text-[#F5D061]" />}
                  <span>{user?.role === 'admin' ? 'Admin' : 'Trader'}</span>
                </span>

                {/* KYC Status Badge */}
                {user?.kyc_status === 'verified' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#86EFAC] flex items-center gap-1 font-semibold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                ) : user?.kyc_status === 'pending' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#FCD34D] flex items-center gap-1 font-semibold">
                    <Clock className="w-3 h-3" />
                    <span>Pending Review</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#EA580C]/15 border border-[#EA580C]/40 text-[#FB923C] flex items-center gap-1 font-semibold">
                    <ShieldAlert className="w-3 h-3" />
                    <span>Unverified</span>
                  </span>
                )}
              </div>
              
              <p className="text-xs font-mono text-white/75 mt-1.5 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{user?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.role === 'admin' && (
              <Link
                to="/admin/verifications"
                className="px-4 py-2.5 rounded-2xl font-mono text-xs uppercase tracking-wider font-bold text-black bg-gradient-to-r from-[#D4AF37] to-[#F5D061] hover:shadow-[0_0_20px_rgba(212,175,55,0.45)] transition-all duration-300 flex items-center gap-2 shadow-md"
              >
                <Crown className="w-4 h-4 text-black" />
                <span>Compliance Portal</span>
              </Link>
            )}

            <button
              onClick={logout}
              className="px-4 py-2.5 rounded-2xl text-xs font-mono font-medium text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 hover:bg-[#EF4444]/20 transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out Current Device</span>
            </button>
          </div>
        </div>

        {/* Identity Metadata Grid (4 Floating Bento Cells) */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-6 text-xs font-mono">
          <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <span className="text-white/75 block mb-1 uppercase tracking-wider text-[10px]">ACCOUNT ID (UUID)</span>
            <span className="text-white/80 font-mono truncate block" title={user?.id}>
              {user?.id}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <span className="text-white/75 block mb-1 uppercase tracking-wider text-[10px]">EMAIL VERIFICATION</span>
            <span className="text-[#22C55E] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Confirmed (OTP)
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <span className="text-white/75 block mb-1 uppercase tracking-wider text-[10px]">IDENTITY / KYC STATUS</span>
            <span className={`font-semibold uppercase ${
              user?.kyc_status === 'verified' 
                ? 'text-[#22C55E]' 
                : user?.kyc_status === 'pending' 
                ? 'text-[#F5D061]' 
                : 'text-[#FB923C]'
            }`}>
              {user?.kyc_status || 'UNVERIFIED'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <span className="text-white/75 block mb-1 uppercase tracking-wider text-[10px]">USER ROLE</span>
            <span className={`font-semibold uppercase ${user?.role === 'admin' ? 'text-[#F5D061]' : 'text-white'}`}>
              {user?.role || 'user'}
            </span>
          </div>
        </div>
      </div>

      {/* Identity Verification Submission & Status */}
      <IdentityVerificationCard />

      {/* 2. Spatial Active Sessions Management Card */}
      <div className="rounded-3xl spatial-glass p-6 sm:p-8 shadow-lg shadow-black/40 transition-all duration-300">
        
        {/* Header with Global Revoke Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/20">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-sans font-bold text-xl text-white tracking-wide">
                Active Device Sessions
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#F5D061] font-semibold">
                {sessions.length} Active
              </span>
            </div>
            <p className="text-xs font-mono text-white/75 mt-1">
              Devices currently authorized to access your Darkhold Exchange account
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchSessions}
              disabled={loadingSessions}
              className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.08] border border-white/20 text-white/75 hover:text-white transition-all duration-200 cursor-pointer"
              title="Refresh sessions"
            >
              <RefreshCw className={`w-4 h-4 ${loadingSessions ? 'animate-spin text-[#D4AF37]' : ''}`} />
            </button>

            {sessions.length > 1 && (
              <button
                onClick={handleRevokeAllSessions}
                disabled={revokingAll}
                className="px-4 py-2.5 rounded-2xl text-xs font-mono font-medium text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/35 hover:bg-[#EF4444]/20 transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Revoke All Sessions</span>
              </button>
            )}
          </div>
        </div>

        {/* Sessions List (Spatial Device Cards) */}
        <div className="pt-6 space-y-3.5">
          {loadingSessions ? (
            <div className="py-12 text-center text-xs font-mono text-white/75 space-y-2">
              <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Scanning active sessions across the network...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-white/75">
              No active sessions found.
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  session.is_current
                    ? 'bg-gradient-to-r from-[#272A36] to-[#21242E] border-[#D4AF37]/45 shadow-[0_0_25px_rgba(212,175,55,0.1),inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'bg-white/[0.05] border-white/20 hover:border-white/25 hover:bg-white/[0.07]'
                }`}
              >
                {/* Left: Device & Browser info */}
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                    {getDeviceIcon(session.device_name, session.os)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">
                        {session.browser || 'Web Browser'}
                      </span>
                      <span className="text-white/75 text-xs">on</span>
                      <span className="text-xs font-mono text-white/80">
                        {session.os || session.device_name}
                      </span>
                      {session.is_current && (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#86EFAC]">
                          CURRENT DEVICE
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-white/75 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-white/75" />
                        <span>IP: {session.ip_address}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-white/75" />
                        <span>
                          Active: {new Date(session.last_used_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                          {new Date(session.last_used_at).toLocaleDateString()}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Revoke Action */}
                <button
                  onClick={() => handleRevokeSession(session.id, session.is_current)}
                  disabled={revokingId === session.id}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    session.is_current
                      ? 'text-white/75 hover:text-[#EF4444] hover:bg-[#EF4444]/15 border border-transparent hover:border-[#EF4444]/30'
                      : 'text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 hover:bg-[#EF4444]/20 shadow-sm'
                  }`}
                  title={session.is_current ? 'Sign out this browser' : 'Revoke remote device access'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{session.is_current ? 'Sign Out Here' : 'Revoke Access'}</span>
                </button>
              </div>
            ))
          )}
        </div>

      </div>

    </div>
  )
}

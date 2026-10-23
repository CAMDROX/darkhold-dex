import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../services/api'
import { 
  User, ShieldCheck, ShieldAlert, Mail, Laptop, Smartphone, Globe, Monitor, 
  Trash2, LogOut, Clock, MapPin, RefreshCw, AlertTriangle, Crown 
} from 'lucide-react'
import IdentityVerificationCard from '../components/IdentityVerificationCard'
import toast from 'react-hot-toast'

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
    } catch (err) {
      toast.error('Failed to load active sessions')
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
        toast.success('Current session terminated. Signing out...')
        logout()
        navigate('/login')
      } else {
        toast.success('Device session revoked successfully')
        setSessions(prev => prev.filter(s => s.id !== sessionId))
      }
    } catch (err) {
      toast.error(err.message || 'Failed to revoke session')
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
      toast.success('All sessions have been revoked')
      logout()
      navigate('/login')
    } catch (err) {
      toast.error(err.message || 'Failed to revoke all sessions')
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
    return <Globe className="w-5 h-5 text-[#C2BCB0]" />
  }

  return (
    <div className="min-h-[85vh] py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      
      {/* 1. User Identity Details Card */}
      <div className="rounded-2xl gloss-panel p-6 sm:p-8 border border-[#D4AF37]/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-[#241E19]">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#241C15] to-[#0E0C0B] border border-[#D4AF37]/50 flex items-center justify-center text-2xl font-cinzel font-bold text-[#F5D061] shadow-[0_0_20px_rgba(212,175,55,0.25)]">
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-cinzel font-bold text-2xl text-white">
                  {user?.username}
                </h1>

                {/* Role Badge */}
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                  user?.role === 'admin' 
                    ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F5D061]' 
                    : 'bg-[#221B17] border border-[#3E2F26] text-[#A8A195]'
                }`}>
                  {user?.role === 'admin' && <Crown className="w-3 h-3 text-[#F5D061]" />}
                  <span>{user?.role === 'admin' ? 'Admin' : 'Trader'}</span>
                </span>

                {/* Three Statuses: verified, pending, unverified */}
                {user?.kyc_status === 'verified' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#86EFAC] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                ) : user?.kyc_status === 'pending' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#FCD34D] flex items-center gap-1 animate-pulse">
                    <Clock className="w-3 h-3" />
                    <span>Pending Review</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#EA580C]/15 border border-[#EA580C]/40 text-[#FB923C] flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    <span>Unverified</span>
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-[#9E9689] mt-1 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{user?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.role === 'admin' && (
              <Link
                to="/admin/verifications"
                className="px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider font-bold text-[#0B0908] bg-gradient-to-r from-[#D4AF37] to-[#F5D061] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all flex items-center gap-2"
              >
                <Crown className="w-4 h-4" />
                <span>Compliance Portal</span>
              </Link>
            )}

            <button
              onClick={logout}
              className="px-4 py-2.5 rounded-xl text-xs font-mono font-medium text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 hover:bg-[#EF4444]/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out Current Device</span>
            </button>
          </div>
        </div>

        {/* Identity Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-6 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-[#0D0B0A] border border-[#221B17]">
            <span className="text-[#8E867A] block mb-1">ACCOUNT ID (UUID)</span>
            <span className="text-[#D1C9BE] truncate block" title={user?.id}>
              {user?.id}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0D0B0A] border border-[#221B17]">
            <span className="text-[#8E867A] block mb-1">EMAIL VERIFICATION</span>
            <span className="text-[#22C55E] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Confirmed (OTP)
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0D0B0A] border border-[#221B17]">
            <span className="text-[#8E867A] block mb-1">IDENTITY / KYC STATUS</span>
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

          <div className="p-3.5 rounded-xl bg-[#0D0B0A] border border-[#221B17]">
            <span className="text-[#8E867A] block mb-1">USER ROLE</span>
            <span className={`font-semibold uppercase ${user?.role === 'admin' ? 'text-[#F5D061]' : 'text-white'}`}>
              {user?.role || 'user'}
            </span>
          </div>
        </div>
      </div>

      {/* Identity Verification Submission & Status */}
      <IdentityVerificationCard />

      {/* 2. Active Sessions Management Card */}
      <div className="rounded-2xl gloss-panel p-6 sm:p-8 border border-[#2A231F]">
        
        {/* Header with Global Revoke Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#241E19]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-cinzel font-bold text-xl text-white">
                Active Device Sessions
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#F5D061]">
                {sessions.length} Active
              </span>
            </div>
            <p className="text-xs font-mono text-[#9E9689] mt-1">
              Devices currently authorized to access your Darkhold Exchange account
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSessions}
              disabled={loadingSessions}
              className="p-2.5 rounded-xl bg-[#14100E] border border-[#2D2520] text-[#9E9689] hover:text-white transition-colors"
              title="Refresh sessions"
            >
              <RefreshCw className={`w-4 h-4 ${loadingSessions ? 'animate-spin' : ''}`} />
            </button>

            {sessions.length > 1 && (
              <button
                onClick={handleRevokeAllSessions}
                disabled={revokingAll}
                className="px-4 py-2.5 rounded-xl text-xs font-mono font-medium text-[#EF4444] bg-[#291010] border border-[#EF4444]/40 hover:bg-[#3D1414] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Revoke All Sessions</span>
              </button>
            )}
          </div>
        </div>

        {/* Sessions List */}
        <div className="pt-6 space-y-3">
          {loadingSessions ? (
            <div className="py-12 text-center text-xs font-mono text-[#8E867A] space-y-2">
              <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Scanning active sessions across the network...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-[#8E867A]">
              No active sessions found.
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  session.is_current
                    ? 'bg-[#181412] border-[#D4AF37]/40 shadow-[0_0_20px_rgba(212,175,55,0.08)]'
                    : 'bg-[#0E0C0A] border-[#221B17] hover:border-[#2E241F]'
                }`}
              >
                {/* Left: Device & Browser info */}
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#14100E] border border-[#2D2520] flex items-center justify-center shrink-0">
                    {getDeviceIcon(session.device_name, session.os)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">
                        {session.browser || 'Web Browser'}
                      </span>
                      <span className="text-[#6E665A] text-xs">on</span>
                      <span className="text-xs font-mono text-[#D1C9BE]">
                        {session.os || session.device_name}
                      </span>
                      {session.is_current && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#86EFAC]">
                          CURRENT DEVICE
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#8E867A] mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#736B5E]" />
                        <span>IP: {session.ip_address}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#736B5E]" />
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    session.is_current
                      ? 'text-[#8E867A] hover:text-[#EF4444] hover:bg-[#EF4444]/10 border border-transparent hover:border-[#EF4444]/30'
                      : 'text-[#EF4444] bg-[#291010]/80 border border-[#EF4444]/30 hover:bg-[#3D1414]'
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

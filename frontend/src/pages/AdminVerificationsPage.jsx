import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Search,
  Eye,
  FileText,
  UserCheck,
  Crown,
} from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../context/WebSocketContext'
import { authApi } from '../services/api'
import toast from 'react-hot-toast'

export default function AdminVerificationsPage() {
  const { user } = useAuth()
  const { subscribe, isConnected } = useWebSocket()
  const [verifications, setVerifications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('pending') // 'all', 'pending', 'verified', 'unverified'
  const [search, setSearch] = useState('')
  const [previewDoc, setPreviewDoc] = useState(null)
  const [rejectingUser, setRejectingUser] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchVerifications = async () => {
    setIsLoading(true)
    try {
      const res = await authApi.adminListKYC(filter === 'all' ? '' : filter)
      setVerifications(res.verifications || [])
    } catch (err) {
      toast.error(err.message || 'Failed to load verification list')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchVerifications()
    }
  }, [filter, user?.role])

  // Real-time WebSocket subscriber for zero-reload verification queue updates
  useEffect(() => {
    // 1. Listen for incoming KYC submissions from users
    const unsubSubmitted = subscribe('KYC_SUBMITTED', (data) => {
      if (!data || !data.user) return
      toast.success(`🔔 New KYC Submitted: @${data.user.username}`, {
        icon: '🛡️',
        duration: 6000,
      })
      setVerifications((prev) => [
        data,
        ...prev.filter((item) => item.user.id !== data.user.id),
      ])
    })

    // 2. Listen for status updates across admins
    const unsubUpdated = subscribe('KYC_STATUS_UPDATED', (data) => {
      if (!data || !data.user_id) return
      setVerifications((prev) =>
        prev.map((item) => {
          if (item.user.id === data.user_id) {
            return {
              ...item,
              user: {
                ...item.user,
                kyc_status: data.kyc_status,
                kyc: item.user.kyc
                  ? {
                      ...item.user.kyc,
                      status: data.kyc_status === 'verified' ? 'approved' : 'rejected',
                      rejection_reason: data.rejection_reason,
                      reviewed_at: data.reviewed_at,
                      reviewed_by: data.reviewed_by,
                    }
                  : null,
              },
            }
          }
          return item
        })
      )
    })

    return () => {
      unsubSubmitted()
      unsubUpdated()
    }
  }, [subscribe])

  // Admin access guard (executed after all React hooks are registered)
  if (user && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const handleApprove = async (userId, username) => {
    setIsProcessing(true)
    try {
      await authApi.adminReviewKYC(userId, 'approved')
      toast.success(`User @${username} has been verified successfully!`, {
        icon: '✅',
      })
      fetchVerifications()
    } catch (err) {
      toast.error(err.message || 'Failed to approve verification')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async (e) => {
    e.preventDefault()
    if (!rejectingUser) return

    setIsProcessing(true)
    try {
      await authApi.adminReviewKYC(
        rejectingUser.id,
        'rejected',
        rejectionReason.trim() || 'Government ID proof could not be verified. Please submit a valid document.'
      )
      toast.success(`Verification rejected for @${rejectingUser.username}.`, {
        icon: '⚠️',
      })
      setRejectingUser(null)
      setRejectionReason('')
      fetchVerifications()
    } catch (err) {
      toast.error(err.message || 'Failed to reject verification')
    } finally {
      setIsProcessing(false)
    }
  }

  // Filter by search
  const filteredList = verifications.filter((item) => {
    const u = item.user
    const query = search.toLowerCase()
    return (
      u.email.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query) ||
      (u.kyc?.id_number && u.kyc.id_number.toLowerCase().includes(query)) ||
      (u.kyc?.id_type && u.kyc.id_type.toLowerCase().includes(query))
    )
  })

  // Summary counts
  const pendingCount = verifications.filter(
    (item) => (item.user.kyc_status || '').toLowerCase() === 'pending'
  ).length

  return (
    <div className="min-h-[85vh] py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-7 animate-fade-in">
      {/* Spatial Header Card */}
      <div className="relative rounded-3xl spatial-glass p-6 sm:p-8 border border-white/[0.08] overflow-hidden shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85),0_0_35px_rgba(212,175,55,0.06),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-300">
        <div className="absolute right-0 top-0 w-80 h-40 bg-gradient-to-l from-[#D4AF37]/10 via-[#D4AF37]/5 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#2A211B] to-[#120E0C] border border-[#D4AF37]/50 text-[#F5D061] shadow-[0_0_15px_rgba(212,175,55,0.25)]">
                <ShieldCheck className="w-5 h-5 text-[#F5D061]" />
              </div>
              <h1 className="font-cinzel font-bold text-2xl sm:text-3xl text-white flex items-center gap-2.5 tracking-wide">
                <span>Compliance & KYC Review</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#F5D061] flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" /> Admin
                </span>
              </h1>
            </div>
            <p className="text-xs font-mono text-white/50 mt-2 max-w-2xl">
              Inspect submitted government ID proofs and approve or reject accounts for secondary ticket marketplace access.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono shadow-sm">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#22C55E] animate-pulse' : 'bg-[#EF4444]'}`} />
              <span className={isConnected ? 'text-[#86EFAC] font-bold' : 'text-[#EF4444]'}>
                {isConnected ? 'LIVE WS STREAM' : 'WS OFFLINE'}
              </span>
            </div>

            <button
              onClick={fetchVerifications}
              disabled={isLoading}
              className="px-4 py-2 rounded-2xl text-xs font-mono bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-[#D4AF37]/50 text-white transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:-translate-y-0.5 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#D4AF37]' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filter Pills with Tactile Depth */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
          {[
            { id: 'pending', label: 'Pending Review', color: 'text-[#F5D061] border-[#F5D061]/50 bg-[#F5D061]/10' },
            { id: 'unverified', label: 'Unverified', color: 'text-[#FB923C] border-[#FB923C]/50 bg-[#FB923C]/10' },
            { id: 'verified', label: 'Verified', color: 'text-[#86EFAC] border-[#22C55E]/50 bg-[#22C55E]/10' },
            { id: 'all', label: 'All Users', color: 'text-white border-white/[0.15] bg-white/[0.05]' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-2xl border transition-all duration-200 whitespace-nowrap cursor-pointer hover:-translate-y-0.5 ${
                filter === tab.id
                  ? `${tab.color} shadow-[0_0_15px_rgba(212,175,55,0.15)] font-bold scale-[1.02]`
                  : 'bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white'
              }`}
            >
              {tab.label}
              {tab.id === 'pending' && pendingCount > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-[#F59E0B]/25 text-[#FCD34D] font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search email, username, ID ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-black/40 border border-white/[0.08] text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/20 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
          />
        </div>
      </div>

      {/* Verification List Cards */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-white/40">Fetching verifications queue...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="rounded-3xl spatial-glass p-12 text-center shadow-[0_10px_35px_rgba(0,0,0,0.7)] space-y-3">
          <UserCheck className="w-12 h-12 text-white/30 mx-auto" />
          <h3 className="font-cinzel text-lg font-bold text-white">No Users Found</h3>
          <p className="text-xs font-mono text-white/40 max-w-sm mx-auto">
            There are currently no users matching the selected filter criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((item) => {
            const u = item.user
            const kyc = u.kyc
            const status = (u.kyc_status || 'unverified').toLowerCase()

            return (
              <div
                key={u.id}
                className={`rounded-3xl p-5 sm:p-6 border transition-all duration-300 shadow-[0_8px_25px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] hover:-translate-y-0.5 ${
                  status === 'pending'
                    ? 'bg-gradient-to-r from-[#17120B]/90 via-[#1E170E]/90 to-[#120E08]/90 border-[#F59E0B]/40 shadow-[0_0_25px_rgba(245,158,11,0.1)]'
                    : status === 'verified'
                    ? 'bg-white/[0.02] border-white/[0.08]'
                    : 'bg-white/[0.01] border-white/[0.06]'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  {/* Left: User Identity Details */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-cinzel font-bold text-base shrink-0 shadow-inner ${
                        status === 'verified'
                          ? 'bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#86EFAC]'
                          : status === 'pending'
                          ? 'bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#FCD34D]'
                          : 'bg-white/[0.04] border border-white/[0.08] text-white/60'
                      }`}
                    >
                      {u.username ? u.username.charAt(0).toUpperCase() : 'U'}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-cinzel font-bold text-base text-white tracking-wide">
                          {u.username}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                            status === 'verified'
                              ? 'bg-[#22C55E]/20 text-[#86EFAC] border border-[#22C55E]/40'
                              : status === 'pending'
                              ? 'bg-[#F59E0B]/20 text-[#FCD34D] border border-[#F59E0B]/40 animate-pulse'
                              : 'bg-[#EA580C]/20 text-[#FB923C] border border-[#EA580C]/40'
                          }`}
                        >
                          {status === 'verified' ? (
                            <>
                              <ShieldCheck className="w-3 h-3" />
                              <span>Verified</span>
                            </>
                          ) : status === 'pending' ? (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>Pending Review</span>
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-3 h-3" />
                              <span>Unverified</span>
                            </>
                          )}
                        </span>

                        {/* Role Badge */}
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-mono uppercase bg-white/[0.03] border border-white/[0.08] text-white/50">
                          Role: {u.role || 'user'}
                        </span>
                      </div>

                      <p className="text-xs font-mono text-white/60">{u.email}</p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-white/40 pt-1">
                        <span>User ID: <code className="text-white/60">{u.id}</code></span>
                        <span>•</span>
                        <span>
                          Joined: {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Submitted Proof Document Details */}
                  <div className="w-full lg:w-auto p-4 rounded-2xl bg-black/40 border border-white/[0.06] text-xs font-mono space-y-1.5 shrink-0 shadow-inner">
                    <span className="text-[10px] text-white/40 block font-bold tracking-wider">
                      GOVERNMENT PROOF DETAILS
                    </span>
                    {kyc?.id_type ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-white/50">ID Type:</span>
                          <span className="text-white font-bold">{kyc.id_type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-white/50">ID Number:</span>
                          <span className="text-[#F5D061] font-bold">{kyc.id_number}</span>
                        </div>
                        {kyc.submitted_at && (
                          <div className="text-[10px] text-white/40">
                            Submitted: {new Date(kyc.submitted_at).toLocaleString()}
                          </div>
                        )}
                        {kyc.document_url && (
                          <button
                            onClick={() =>
                              setPreviewDoc({
                                url: kyc.document_url,
                                username: u.username,
                                idType: kyc.id_type,
                              })
                            }
                            className="mt-1 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#FB923C] text-[10px] flex items-center gap-1.5 transition-all cursor-pointer hover:-translate-y-0.5"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Attached Document</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-white/30 italic">
                        No ID documents submitted yet
                      </span>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
                    {status !== 'verified' && (
                      <button
                        onClick={() => handleApprove(u.id, u.username)}
                        disabled={isProcessing}
                        className="px-4 py-2.5 rounded-2xl font-mono text-xs font-bold text-black bg-gradient-to-r from-[#22C55E] to-[#4ADE80] hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all duration-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 hover:-translate-y-0.5 active:scale-95 shadow-md"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve & Verify</span>
                      </button>
                    )}

                    {status !== 'unverified' && (
                      <button
                        onClick={() => setRejectingUser(u)}
                        disabled={isProcessing}
                        className="px-4 py-2.5 rounded-2xl font-mono text-xs font-medium text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 hover:bg-[#EF4444]/20 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Reject Reason Modal (Spatial Popover) */}
      {rejectingUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-[#0E0B09]/95 backdrop-blur-2xl border border-[#EF4444]/40 p-6 space-y-4 shadow-[0_30px_90px_rgba(239,68,68,0.25)] animate-spatial-pop">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h4 className="font-cinzel font-bold text-white text-base flex items-center gap-2 tracking-wide">
                <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
                <span>Reject Identity Verification</span>
              </h4>
              <button
                onClick={() => setRejectingUser(null)}
                className="text-white/50 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/[0.08]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-mono text-white/70">
              You are rejecting verification for <strong className="text-white">@{rejectingUser.username}</strong> ({rejectingUser.email}). Please provide a reason to guide the user on what to correct.
            </p>

            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-white/50 mb-1.5">
                  REJECTION REASON (VISIBLE TO USER)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. ID photo is blurry, document expired, or name does not match account."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/[0.08] text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-[#EF4444] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-white/50 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 rounded-2xl text-xs font-mono font-bold text-white bg-[#EF4444] hover:bg-[#DC2626] transition-all duration-200 cursor-pointer disabled:opacity-50 hover:-translate-y-0.5 shadow-md"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document View Modal (Spatial Popover) */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full rounded-3xl bg-[#0E0B09]/95 backdrop-blur-2xl border border-white/[0.12] p-6 space-y-4 shadow-[0_30px_90px_rgba(0,0,0,0.98),0_0_50px_rgba(212,175,55,0.08)] animate-spatial-pop">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h4 className="font-cinzel font-bold text-white text-base tracking-wide">
                  Submitted Government Proof: {previewDoc.idType}
                </h4>
                <p className="text-xs font-mono text-white/50 mt-0.5">Trader: @{previewDoc.username}</p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-white/50 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/[0.08]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto rounded-2xl bg-black/60 p-4 flex items-center justify-center border border-white/[0.06]">
              {previewDoc.url.startsWith('data:image') ? (
                <img
                  src={previewDoc.url}
                  alt="Document Full Preview"
                  className="max-h-[60vh] object-contain rounded-xl"
                />
              ) : (
                <div className="p-8 text-center text-xs font-mono text-[#D4AF37]">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-[#D4AF37]" />
                  <span>Document Attachment</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono bg-white/[0.04] text-white hover:bg-white/[0.08] transition-all cursor-pointer border border-white/[0.08]"
              >
                Close Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

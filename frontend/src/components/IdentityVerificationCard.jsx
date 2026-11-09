import React, { useState } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  UploadCloud,
  FileText,
  AlertTriangle,
  ArrowRight,
  Eye,
  X,
  FileCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function IdentityVerificationCard({ _compact = false }) {
  const { user, submitKYC } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [idType, setIdType] = useState('PASSPORT')
  const [idNumber, setIdNumber] = useState('')
  const [documentUrl, setDocumentUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const kycStatus = (user?.kyc_status || 'unverified').toLowerCase()
  const kycData = user?.kyc

  // Handle local file upload with client-side image compression
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)

    // For images, optimize and resize to ~1200px to ensure instant upload and avoid network timeouts
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          const maxDim = 1200

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            } else {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.82)
          setDocumentUrl(optimizedDataUrl)
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    } else {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be under 2MB')
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        setDocumentUrl(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!idNumber.trim()) {
      toast.error('Please enter your government ID / document number')
      return
    }

    setIsSubmitting(true)
    try {
      await submitKYC(idType, idNumber.trim(), documentUrl)
      setIsOpen(false)
      setIdNumber('')
      setDocumentUrl('')
      setFileName('')
    } catch (err) {
      toast.error(err.message || 'Failed to submit identity verification')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 1. Status: VERIFIED
  if (kycStatus === 'verified' || kycData?.status === 'approved') {
    return (
      <div className="rounded-3xl p-6 sm:p-7 spatial-glass border border-[#22C55E]/40 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85),0_0_35px_rgba(34,197,94,0.12),inset_0_1px_0_rgba(255,255,255,0.1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#22C55E]/15 border border-[#22C55E]/50 flex items-center justify-center text-[#86EFAC] shadow-[0_0_18px_rgba(34,197,94,0.3)] shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-cinzel font-bold text-base text-white tracking-wide">
                Government Identity Verified
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#22C55E]/20 text-[#86EFAC] border border-[#22C55E]/40 uppercase tracking-wider">
                Status: Verified
              </span>
            </div>
            <p className="text-xs font-mono text-white/60 mt-1">
              Your identity has been verified and reviewed by Darkhold Compliance. All secondary marketplace trading features, atomic escrow, and orderbook limits are fully unlocked.
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right font-mono text-[11px] text-[#86EFAC]/80">
          <span className="block font-bold">APPROVED TIER</span>
          <span className="text-white/50">Full Escrow Privileges</span>
        </div>
      </div>
    )
  }

  // 2. Status: PENDING
  if (kycStatus === 'pending' || kycData?.status === 'pending') {
    return (
      <div className="rounded-3xl p-6 sm:p-7 spatial-glass border border-[#F5D061]/40 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85),0_0_35px_rgba(245,158,11,0.12),inset_0_1px_0_rgba(255,255,255,0.1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F5D061]/15 border border-[#F5D061]/50 flex items-center justify-center text-[#FCD34D] shadow-[0_0_18px_rgba(245,158,11,0.25)] shrink-0 animate-pulse">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-cinzel font-bold text-base text-white tracking-wide">
                Identity Verification Under Review
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F59E0B]/20 text-[#FCD34D] border border-[#F59E0B]/40 uppercase tracking-wider">
                Status: Pending
              </span>
            </div>
            <p className="text-xs font-mono text-white/60 mt-1">
              Your government ID/proof has been submitted and is currently being reviewed by Darkhold Compliance Admins. You will be notified immediately upon approval.
            </p>
            {kycData?.id_type && (
              <div className="mt-2 text-[11px] font-mono text-[#D4AF37] flex items-center gap-3">
                <span>Document: <strong className="text-white">{kycData.id_type}</strong></span>
                <span>•</span>
                <span>ID Ref: <strong className="text-white">{kycData.id_number || 'Confidential'}</strong></span>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 font-mono text-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-[#F59E0B]/40 text-[#FCD34D]">
            <Clock className="w-3.5 h-3.5" />
            <span>Admin Review Queue</span>
          </span>
        </div>
      </div>
    )
  }

  // 3. Status: UNVERIFIED (Prompt to submit government ID)
  return (
    <div className="rounded-3xl p-6 sm:p-7 spatial-glass border border-[#EA580C]/40 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85),0_0_35px_rgba(234,88,12,0.12),inset_0_1px_0_rgba(255,255,255,0.1)] space-y-5 transition-all duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EA580C]/15 border border-[#EA580C]/50 flex items-center justify-center text-[#FB923C] shadow-[0_0_18px_rgba(234,88,12,0.3)] shrink-0 mt-0.5">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-cinzel font-bold text-base text-white tracking-wide">
                Government Identity Proof Required
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#EA580C]/20 text-[#FB923C] border border-[#EA580C]/40 uppercase tracking-wider">
                Status: Unverified
              </span>
            </div>
            <p className="text-xs font-mono text-white/60 mt-1 leading-relaxed">
              Your email is verified, but you are not yet authorized to trade on the secondary exchange. Please submit a valid government-issued ID proof (Passport, National ID, or Driving License). A compliance admin will review and verify your account.
            </p>
            {kycData?.rejection_reason && (
              <div className="mt-2.5 p-3 rounded-xl bg-[#381414]/80 border border-[#EF4444]/40 text-xs font-mono text-[#FCA5A5] flex items-start gap-2 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                <span>
                  <strong>Previous Submission Rejected:</strong> {kycData.rejection_reason} Please submit a clearer or alternate proof document.
                </span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="shrink-0 px-5 py-2.5 rounded-2xl font-mono text-xs uppercase tracking-wider font-bold text-black bg-gradient-to-r from-[#FB923C] to-[#F59E0B] hover:shadow-[0_0_20px_rgba(251,146,60,0.5)] transition-all duration-300 flex items-center gap-2 cursor-pointer hover:-translate-y-0.5 active:scale-95 shadow-md"
        >
          <span>{isOpen ? 'Close Form' : 'Verify Identity Now'}</span>
          <ArrowRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Expandable Submission Form */}
      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="pt-5 border-t border-white/[0.08] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono animate-spatial-pop"
        >
          {/* Document Type */}
          <div>
            <label className="block text-white/70 mb-1.5 uppercase font-medium">
              1. Government ID Type <span className="text-[#FB923C]">*</span>
            </label>
            <select
              value={idType}
              onChange={(e) => setIdType(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/[0.08] text-white focus:outline-none focus:border-[#FB923C] transition-all cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
            >
              <option value="PASSPORT" className="bg-[#14100E] text-white">Passport (International)</option>
              <option value="NATIONAL_ID" className="bg-[#14100E] text-white">National ID / Aadhaar Card</option>
              <option value="DRIVING_LICENSE" className="bg-[#14100E] text-white">Driver's License</option>
              <option value="VOTER_ID" className="bg-[#14100E] text-white">Voter Identity Card</option>
              <option value="OTHER_GOVT_PROOF" className="bg-[#14100E] text-white">Other Government-Issued Certificate</option>
            </select>
          </div>

          {/* Document Number */}
          <div>
            <label className="block text-white/70 mb-1.5 uppercase font-medium">
              2. ID / Document Number <span className="text-[#FB923C]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Z8923482 or 4829-1923-0192"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/[0.08] text-white placeholder-white/30 focus:outline-none focus:border-[#FB923C] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
            />
          </div>

          {/* Document Upload / Attachment */}
          <div className="md:col-span-2">
            <label className="block text-white/70 mb-1.5 uppercase font-medium">
              3. Upload Government ID Document / Photo <span className="text-white/40">(JPG, PNG, PDF up to 5MB)</span>
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <label className="flex-1 w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl border border-dashed border-white/[0.15] hover:border-[#FB923C] bg-white/[0.02] cursor-pointer transition-colors text-center shadow-inner">
                <UploadCloud className="w-5 h-5 text-[#FB923C]" />
                <span className="text-white/70">
                  {fileName ? (
                    <strong className="text-white">{fileName}</strong>
                  ) : (
                    'Click to select ID photo or document'
                  )}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {documentUrl && (
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-[#FB923C] hover:bg-white/[0.08] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm hover:-translate-y-0.5"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview ID</span>
                </button>
              )}
            </div>
          </div>

          {/* Submit Action */}
          <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2.5 rounded-xl text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl font-bold text-black bg-gradient-to-r from-[#FB923C] to-[#F5D061] hover:shadow-[0_0_20px_rgba(251,146,60,0.5)] transition-all duration-300 flex items-center gap-2 cursor-pointer hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 shadow-md"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Submitting to Admin...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Submit for Admin Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Preview Modal (Spatial Popover) */}
      {showPreviewModal && documentUrl && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-3xl bg-[#0E0B09]/95 backdrop-blur-2xl border border-white/[0.12] p-5 space-y-4 shadow-[0_30px_90px_rgba(0,0,0,0.98),0_0_50px_rgba(212,175,55,0.08)] animate-spatial-pop">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h4 className="font-cinzel font-bold text-white text-sm tracking-wide">Attached ID Proof Preview</h4>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-white/50 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/[0.08]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto rounded-2xl bg-black/60 flex items-center justify-center p-2 border border-white/[0.06]">
              {documentUrl.startsWith('data:image') ? (
                <img src={documentUrl} alt="ID Document Preview" className="max-h-[50vh] object-contain rounded-xl" />
              ) : (
                <div className="p-8 text-center text-xs font-mono text-[#D4AF37]">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-80" />
                  <span>{fileName || 'Document attached'}</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono bg-white/[0.04] text-white hover:bg-white/[0.08] transition-all cursor-pointer border border-white/[0.08]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Cpu,
  Coins,
  ArrowRight,
  Activity,
  Layers,
  Zap,
} from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const kycStatus = (user?.kyc_status || 'unverified').toLowerCase()

  return (
    <div className="min-h-[85vh] py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Welcome Banner (Clean, without the clutter of action buttons) */}
      <div className="relative rounded-2xl gloss-panel p-6 sm:p-8 border border-[#D4AF37]/30 overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.7)]">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#D4AF37]/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181412] border border-[#22C55E]/30 text-xs font-mono text-[#22C55E] mb-3">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              <span>AUTHENTICATED TRADER // SESSION ACTIVE</span>
            </div>
            <h1 className="font-cinzel font-black text-3xl sm:text-4xl text-white">
              Welcome,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F5D061]">
                {user?.username}
              </span>
            </h1>
            <p className="text-sm font-mono text-[#9E9689] mt-1">
              {user?.email} · Account ID:{' '}
              <span className="text-[#E0DBD2]">{user?.id?.slice(0, 8)}...</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/assets"
              className="px-4 py-2 rounded-xl font-mono text-xs uppercase tracking-wider font-semibold text-[#D4AF37] bg-[#14100E] border border-[#D4AF37]/40 hover:bg-[#1C1613] hover:border-[#D4AF37] transition-all flex items-center gap-2"
            >
              <Coins className="w-3.5 h-3.5 text-[#F5D061]" />
              <span>Go to Assets Vault</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Workspace Terminal & Engine Telemetry */}
      <div className="rounded-2xl gloss-panel p-8 sm:p-12 border border-[#2A231F] text-center space-y-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#14100E] border border-[#D4AF37]/40 mx-auto flex items-center justify-center text-[#F5D061] shadow-[0_0_25px_rgba(212,175,55,0.2)]">
            <Cpu className="w-8 h-8" />
          </div>

          <h2 className="font-cinzel font-bold text-2xl text-white">
            Matching Terminal & Infrastructure
          </h2>

          <p className="text-sm font-mono text-[#A8A195] leading-relaxed">
            Darkhold Exchange combines lock-free Go FIFO matching, Asynq background ticket ingestion, and Supabase double-entry balance accounting with sub-10ms latency SLAs.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-6 text-left font-mono text-xs">
            <div className="p-4 rounded-xl bg-[#0D0B0A] border border-[#241E19]">
              <span className="text-[#8E867A] block mb-1">EMAIL STATUS</span>
              <span className="text-[#22C55E] font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0D0B0A] border border-[#241E19]">
              <span className="text-[#8E867A] block mb-1">IDENTITY STATUS</span>
              {kycStatus === 'verified' ? (
                <span className="text-[#22C55E] font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              ) : kycStatus === 'pending' ? (
                <span className="text-[#F5D061] font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Pending Review
                </span>
              ) : (
                <span className="text-[#FB923C] font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> Unverified
                </span>
              )}
            </div>

            <div className="p-4 rounded-xl bg-[#0D0B0A] border border-[#241E19]">
              <span className="text-[#8E867A] block mb-1">TASK QUEUE</span>
              <span className="text-[#22C55E] font-bold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> Redis Asynq
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0D0B0A] border border-[#241E19]">
              <span className="text-[#8E867A] block mb-1">ENGINE ACCESS</span>
              <span className="text-white font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#F5D061]" /> Sub-10ms FIFO
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

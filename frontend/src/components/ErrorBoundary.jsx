import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Captured by Spatial ErrorBoundary:', error, errorInfo)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6">
          <div className="relative max-w-md w-full rounded-3xl spatial-glass p-8 border border-rose-500/30 shadow-[0_20px_45px_-12px_rgba(0,0,0,0.45),0_0_32px_rgba(239,68,68,0.16)] text-center space-y-5 animate-spatial-pop">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="font-sans font-bold text-xl text-white tracking-wide">
                Terminal Sync Anomaly
              </h2>
              <p className="text-xs font-mono text-white/75">
                A telemetry render interrupted the spatial deck. Escrow funds and order positions remain secure on the matching engine.
              </p>
              {this.state.error?.message && (
                <div className="p-3 rounded-xl bg-[#171A23] border border-white/20 text-[11px] font-mono text-rose-300 break-words text-left">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider font-semibold text-black bg-gradient-to-r from-[#D4AF37] to-[#F5D061] hover:opacity-90 transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Terminal</span>
              </button>

              <a
                href="/"
                className="px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider font-semibold text-white/70 hover:text-white bg-white/[0.07] border border-white/20 hover:bg-white/[0.08] transition-all duration-200 flex items-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

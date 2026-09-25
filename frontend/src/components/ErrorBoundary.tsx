import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React ErrorBoundary caught an error:', error, errorInfo)
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('tripwallet_current_screen')
    } catch (e) {}
    this.setState({ hasError: false, error: undefined })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center text-3xl font-extrabold mb-4 border border-teal-500/30 shadow-lg">
            🛡️
          </div>
          <h1 className="text-xl font-black mb-2">TripWallet Application Recovered</h1>
          <p className="text-xs text-slate-400 max-w-sm mb-6">
            A temporary render error occurred during update. Your data is safely stored in Supabase and offline storage.
          </p>
          <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-left text-[11px] font-mono text-rose-400 max-w-md w-full mb-6 overflow-auto max-h-32">
            {this.state.error?.message || 'Unknown render exception'}
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-5 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition"
          >
            🔄 Return to Dashboard
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

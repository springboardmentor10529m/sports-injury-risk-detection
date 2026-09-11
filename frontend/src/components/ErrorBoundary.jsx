import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="w-full max-w-xl bg-slate-900 border border-rose-800/80 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-white">Application Error</h2>
                <p className="text-xs text-rose-300">Something went wrong while rendering the application.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">Error Message:</span>
              <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap break-all">
                {this.state.error?.message || String(this.state.error)}
              </pre>
            </div>

            {this.state.errorInfo?.componentStack && (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Component Stack:</span>
                <pre className="font-mono text-[11px] text-slate-500 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

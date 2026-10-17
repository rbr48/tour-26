import { Component } from 'react';

/** Shows a friendly recovery screen and captures diagnostic crash info. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      failed: false,
      error: null,
      info: null,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { failed: true, error };
  }

  componentDidCatch(error, info) {
    console.error('The app failed to render:', error, info);
    this.setState({ info });

    try {
      const crashReport = {
        message: error?.message || 'Unknown error',
        stack: error?.stack || null,
        componentStack: info?.componentStack || null,
        url: window.location.href,
        userAgent: navigator.userAgent,
        time: new Date().toISOString(),
      };
      localStorage.setItem('tour_last_crash', JSON.stringify(crashReport));

      // Invoke optional parent error reporter if passed
      this.props.onError?.(crashReport);
    } catch {
      // Storage or reporting failures should never break the boundary screen
    }
  }

  handleCopyDetails = () => {
    const { error, info } = this.state;
    const text = `Tour 2026 Crash Report\nTime: ${new Date().toISOString()}\nError: ${error?.message}\nStack: ${error?.stack}\nComponent: ${info?.componentStack}`;
    navigator.clipboard?.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    }).catch(() => {});
  };

  render() {
    if (!this.state.failed) {
      return this.props.children;
    }

    const { error, showDetails, copied } = this.state;

    return (
      <div role="alert" className="min-h-screen flex flex-col items-center justify-center gap-4 bg-teal-950 p-6 text-center text-white">
        <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center text-2xl font-bold mb-1">
          ⚠️
        </div>
        <h1 className="text-xl font-bold">কিছু একটা সমস্যা হয়েছে</h1>
        <p className="text-sm text-teal-100 max-w-md">
          আপনার সংরক্ষিত তথ্য মুছে যায়নি। পেজটি পুনরায় লোড করে আবার চেষ্টা করুন।
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-amber-400 px-5 py-2.5 font-bold text-teal-950 shadow-md hover:bg-amber-300 transition-colors"
          >
            আবার চালু করুন
          </button>

          <button
            type="button"
            onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
            className="rounded-xl border border-teal-700 bg-teal-900/60 px-4 py-2.5 text-xs font-semibold text-teal-200 hover:bg-teal-900 transition-colors"
          >
            {showDetails ? 'বিবরণ লুকান' : 'ত্রুটির বিবরণ দেখুন'}
          </button>
        </div>

        {showDetails && (
          <div className="w-full max-w-lg mt-4 bg-slate-900/90 border border-teal-800/80 rounded-2xl p-4 text-left font-mono text-xs text-rose-200 overflow-x-auto space-y-2">
            <div className="flex items-center justify-between gap-2 border-b border-teal-900 pb-2">
              <span className="font-sans text-[11px] text-teal-400 font-bold uppercase tracking-wider">ত্রুটির লগ</span>
              <button
                type="button"
                onClick={this.handleCopyDetails}
                className="px-2 py-1 rounded bg-teal-800 text-teal-100 text-[11px] font-sans hover:bg-teal-700"
              >
                {copied ? 'কপি হয়েছে ✓' : 'কপি করুন'}
              </button>
            </div>
            <p className="font-bold text-rose-300 break-words">{error?.message || 'অজানা ত্রুটি'}</p>
            {error?.stack && (
              <pre className="text-[10px] text-slate-400 max-h-40 overflow-y-auto whitespace-pre-wrap">
                {error.stack}
              </pre>
            )}
          </div>
        )}
      </div>
    );
  }
}
